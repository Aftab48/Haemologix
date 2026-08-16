"""FastAPI model service.

    POST /predict/batch   {modelVersion?, requests:[{task, features, ref?}]}
                          → {modelVersion, results:[{task, ref, prediction, confidence, featureImportance?, backend}], latencyMs}
    GET  /health          {status, model_loaded, activeVersion, tasks:{task: backend}}
    GET  /models          registry listing
    POST /reload          re-read the active pointer (after activateModel)

Auth: if ML_API_SECRET is set, requests must carry `X-ML-Secret: <secret>`
(health is open so load balancers can probe it).

Run:  uvicorn haemologix.api:app --host 0.0.0.0 --port 8000   (from ml/)
"""

from __future__ import annotations

import os
import time
from pathlib import Path
from typing import Any

import numpy as np
from fastapi import Depends, FastAPI, Header, HTTPException
from pydantic import BaseModel, Field

from .data import inverse_label
from .registry import LoadedModel, get_active_version, list_versions, load_active, resolve_model_dir
from .tasks import TASKS, get_task

try:  # optional: ml/.env
    from dotenv import load_dotenv

    load_dotenv(Path(__file__).resolve().parents[1] / ".env")
except Exception:  # pragma: no cover
    pass

app = FastAPI(title="Haemologix ML API", version="2.0.0")

_state: dict[str, Any] = {"model": None, "loaded_at": None, "error": None}


def _load() -> None:
    try:
        _state["model"] = load_active()
        _state["loaded_at"] = time.time()
        _state["error"] = None if _state["model"] else "no active version"
    except Exception as e:  # pragma: no cover
        _state["model"] = None
        _state["error"] = repr(e)


@app.on_event("startup")
async def _startup() -> None:
    _load()
    m: LoadedModel | None = _state["model"]
    print(f"[ml-api] model_dir={resolve_model_dir()} active={get_active_version()} loaded={m.version if m else None} tasks={sorted(m.tasks) if m else []}")


def require_secret(x_ml_secret: str | None = Header(default=None)) -> None:
    secret = os.environ.get("ML_API_SECRET", "").strip()
    if secret and x_ml_secret != secret:
        raise HTTPException(status_code=401, detail="invalid or missing X-ML-Secret")


# ---------------------------------------------------------------------------
# Schemas (mirror lib/ml/types.ts)
# ---------------------------------------------------------------------------

class PredictRequest(BaseModel):
    task: str
    features: dict[str, Any]
    ref: str | None = None


class PredictBatchRequest(BaseModel):
    modelVersion: str | None = None
    requests: list[PredictRequest] = Field(default_factory=list)


class PredictResult(BaseModel):
    task: str
    ref: str | None = None
    prediction: float | list[float]
    confidence: float
    featureImportance: dict[str, float] | None = None
    backend: str | None = None


class PredictBatchResponse(BaseModel):
    modelVersion: str
    results: list[PredictResult]
    latencyMs: int


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------

@app.get("/health")
async def health() -> dict[str, Any]:
    m: LoadedModel | None = _state["model"]
    return {
        "status": "healthy" if m else "degraded",
        "model_loaded": m is not None,
        "activeVersion": m.version if m else get_active_version(),
        "tasks": {t: lt.backend for t, lt in m.tasks.items()} if m else {},
        "error": _state["error"],
    }


@app.get("/models", dependencies=[Depends(require_secret)])
async def models() -> dict[str, Any]:
    return {"active": get_active_version(), "versions": list_versions()}


@app.post("/reload", dependencies=[Depends(require_secret)])
async def reload() -> dict[str, Any]:
    _load()
    return await health()


def _confidence(spec_kind: str, pred: np.ndarray, task_metrics: dict[str, Any]) -> np.ndarray:
    if spec_kind == "binary":
        return np.clip(np.abs(pred - 0.5) * 2, 0, 1)
    if spec_kind == "multiclass":
        return np.clip(pred.max(axis=1), 0, 1)
    # regression: shrink with the model's own p90 error relative to its prediction
    p90 = float(task_metrics.get("metrics", {}).get("p90_abs_err", 0) or 0)
    return np.clip(1 - p90 / np.clip(np.abs(pred) + 1e-6, 1, None), 0.05, 0.99)


@app.post("/predict/batch", response_model=PredictBatchResponse, dependencies=[Depends(require_secret)])
async def predict_batch(body: PredictBatchRequest) -> PredictBatchResponse:
    t0 = time.perf_counter()
    m: LoadedModel | None = _state["model"]
    if m is None:
        raise HTTPException(status_code=503, detail=f"model not loaded ({_state['error']})")
    if body.modelVersion and body.modelVersion != m.version:
        raise HTTPException(status_code=409, detail=f"active version is {m.version}, not {body.modelVersion}")

    # group by task so each preprocessor/predictor runs once per batch
    by_task: dict[str, list[int]] = {}
    for i, r in enumerate(body.requests):
        if r.task not in TASKS:
            raise HTTPException(status_code=400, detail=f"unknown task {r.task}")
        by_task.setdefault(r.task, []).append(i)

    results: list[PredictResult | None] = [None] * len(body.requests)
    for task, idxs in by_task.items():
        lt = m.tasks.get(task)
        if lt is None:
            raise HTTPException(status_code=422, detail=f"active model {m.version} has no head for task {task}")
        spec = get_task(task)
        X = lt.pre.transform_features([body.requests[i].features for i in idxs])
        raw = lt.predictor.predict(X)
        conf = _confidence(spec.kind, raw, lt.metrics)
        nat = inverse_label(raw, spec) if spec.kind == "regression" else raw
        importance = lt.predictor.feature_importance(lt.pre.feature_names)
        for j, i in enumerate(idxs):
            if spec.kind == "multiclass":
                pred: float | list[float] = [float(v) for v in nat[j]]
            else:
                pred = float(nat[j])
            results[i] = PredictResult(
                task=task, ref=body.requests[i].ref, prediction=pred, confidence=float(conf[j]),
                featureImportance=importance if j == 0 else None, backend=lt.backend,
            )
    return PredictBatchResponse(
        modelVersion=m.version,
        results=[r for r in results if r is not None],
        latencyMs=int((time.perf_counter() - t0) * 1000),
    )
