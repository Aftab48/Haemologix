"""Model registry on disk.

    ml/checkpoints/
      <version>/                       e.g. haemologix-model-1.0
        model_card.json                version, tasks, dataset lineage, metrics, limitations
        <task>/
          preprocessor.json
          backend.txt                  mlp | gbdt | rules
          mlp.pt + mlp.json  |  gbdt.joblib  |  rules.json
          metrics.json
      active                           text file containing the active version name

The DB (CustomModel) mirrors model_card.json for the app; the disk is the source
of truth for what the API serves. `ML_ACTIVE_VERSION` env overrides the pointer.
"""

from __future__ import annotations

import json
import os
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from .data import TabularPreprocessor
from .models import Predictor, load_predictor
from .tasks import TASKS, TaskSpec, get_task

def default_model_dir() -> Path:
    return Path(os.environ.get("ML_MODEL_DIR", "ml/checkpoints"))


def resolve_model_dir(model_dir: Path | str | None = None) -> Path:
    p = Path(model_dir) if model_dir else default_model_dir()
    if not p.is_absolute():
        # allow running from repo root or from ml/
        for base in (Path.cwd(), Path(__file__).resolve().parents[2]):
            cand = base / p
            if cand.exists():
                return cand
        return Path.cwd() / p
    return p


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


class ModelCard(dict):
    """A dict with helpers; persisted as model_card.json."""

    @classmethod
    def new(cls, version: str, dataset_version: str, dataset_mix: dict[str, int], notes: str = "") -> "ModelCard":
        return cls(
            version=version,
            createdAt=now_iso(),
            datasetVersion=dataset_version,
            datasetMix=dataset_mix,
            tasks={},  # task → {backend, features, metrics, baseline_metrics, beats_baseline}
            limitations=[],
            notes=notes,
            status="training",
        )

    def save(self, version_dir: Path) -> None:
        version_dir.mkdir(parents=True, exist_ok=True)
        (version_dir / "model_card.json").write_text(json.dumps(self, indent=2), encoding="utf-8")

    @classmethod
    def load(cls, version_dir: Path) -> "ModelCard":
        return cls(json.loads((Path(version_dir) / "model_card.json").read_text(encoding="utf-8")))


class LoadedTask:
    def __init__(self, spec: TaskSpec, pre: TabularPreprocessor, predictor: Predictor, backend: str, metrics: dict[str, Any]):
        self.spec = spec
        self.pre = pre
        self.predictor = predictor
        self.backend = backend
        self.metrics = metrics


class LoadedModel:
    """All tasks of one version, ready to serve."""

    def __init__(self, version: str, version_dir: Path, card: ModelCard, tasks: dict[str, LoadedTask]):
        self.version = version
        self.version_dir = version_dir
        self.card = card
        self.tasks = tasks

    @classmethod
    def load(cls, version_dir: Path) -> "LoadedModel":
        version_dir = Path(version_dir)
        card = ModelCard.load(version_dir)
        tasks: dict[str, LoadedTask] = {}
        for name in TASKS:
            td = version_dir / name
            if not (td / "backend.txt").exists():
                continue
            spec = get_task(name)
            backend = (td / "backend.txt").read_text(encoding="utf-8").strip()
            pre = TabularPreprocessor.load(td / "preprocessor.json")
            predictor = load_predictor(backend, td, spec)
            metrics = json.loads((td / "metrics.json").read_text(encoding="utf-8")) if (td / "metrics.json").exists() else {}
            tasks[name] = LoadedTask(spec, pre, predictor, backend, metrics)
        return cls(card.get("version", version_dir.name), version_dir, card, tasks)


def list_versions(model_dir: Path | None = None) -> list[dict[str, Any]]:
    root = resolve_model_dir(model_dir)
    out = []
    if not root.exists():
        return out
    for d in sorted(root.iterdir()):
        if d.is_dir() and (d / "model_card.json").exists():
            card = ModelCard.load(d)
            out.append({"version": card.get("version", d.name), "status": card.get("status"), "createdAt": card.get("createdAt"),
                        "tasks": sorted(card.get("tasks", {}).keys()), "datasetVersion": card.get("datasetVersion")})
    return out


def get_active_version(model_dir: Path | None = None) -> str | None:
    env = os.environ.get("ML_ACTIVE_VERSION", "").strip()
    if env:
        return env
    p = resolve_model_dir(model_dir) / "active"
    if p.exists():
        v = p.read_text(encoding="utf-8").strip()
        return v or None
    return None


def set_active_version(version: str, model_dir: Path | None = None) -> None:
    root = resolve_model_dir(model_dir)
    if not (root / version / "model_card.json").exists():
        raise FileNotFoundError(f"version {version} not found under {root}")
    (root / "active").write_text(version, encoding="utf-8")
    card = ModelCard.load(root / version)
    card["status"] = "active"
    card["activatedAt"] = now_iso()
    card.save(root / version)


def load_active(model_dir: Path | None = None) -> LoadedModel | None:
    v = get_active_version(model_dir)
    if not v:
        return None
    d = resolve_model_dir(model_dir) / v
    return LoadedModel.load(d) if (d / "model_card.json").exists() else None
