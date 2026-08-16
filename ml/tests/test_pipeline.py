import json
import os
from pathlib import Path

import numpy as np
import pytest
from fastapi.testclient import TestClient

from haemologix import api as api_module
from haemologix.data import TabularPreprocessor, group_split, labels_for
from haemologix.metrics import compute_metrics, expected_calibration_error
from haemologix.models import GbdtPredictor, MlpPredictor, RulesPredictor
from haemologix.registry import LoadedModel, ModelCard, get_active_version, list_versions, set_active_version
from haemologix.tasks import TASKS, get_task
from haemologix.train import train_version


def test_preprocessor_roundtrip(tmp_path: Path):
    rows = [
        {"features": {"a": 1.0, "b": True, "c": "x", "d": 3}},
        {"features": {"a": 2.0, "b": False, "c": "y", "d": 5}},
        {"features": {"a": 3.0, "b": True, "c": "x"}},
    ]
    p = TabularPreprocessor("t").fit(rows)
    X = p.transform(rows)
    assert X.shape == (3, p.dim)
    assert p.dim == 2 + 1 + 2  # a,d numeric; b bool; c one-hot(x,y)
    p.save(tmp_path / "pre.json")
    q = TabularPreprocessor.load(tmp_path / "pre.json")
    assert np.allclose(q.transform(rows), X)
    # unknown category → all zeros; missing numeric → mean (standardised 0)
    z = q.transform_one({"a": 2.0, "b": True, "c": "zzz"})
    assert z[q.feature_names.index("c=x")] == 0 and z[q.feature_names.index("c=y")] == 0
    assert abs(z[q.numeric_cols.index("d")]) < 1e-6


def test_group_split_no_leak():
    rows = [{"features": {}, "label": 0, "groupId": f"g{i % 10}"} for i in range(200)]
    tr, va, te = group_split(rows, 0.2, 0.2, seed=1)
    g = lambda rs: {r["groupId"] for r in rs}
    assert not (g(tr) & g(va)) and not (g(tr) & g(te)) and not (g(va) & g(te))
    assert len(tr) + len(va) + len(te) == 200


def test_metrics_shapes():
    spec = get_task("donor_accept")
    y = np.array([0, 1, 1, 0, 1], dtype=np.float32)
    p = np.array([0.1, 0.8, 0.7, 0.3, 0.9], dtype=np.float32)
    m = compute_metrics(spec, y, p)
    assert m["auroc"] == 1.0 and 0 <= m["ece"] <= 1 and m["n"] == 5
    assert expected_calibration_error(p, y) >= 0
    r = get_task("donor_eta")
    m2 = compute_metrics(r, np.log1p(np.array([30.0, 60.0])), np.log1p(np.array([33.0, 54.0])), np.array([30.0, 60.0]))
    assert abs(m2["mae"] - 4.5) < 1e-6


def test_predictors_learn_and_persist(tmp_path: Path):
    rng = np.random.default_rng(0)
    X = rng.normal(size=(2000, 4)).astype(np.float32)
    y = (X[:, 0] + 0.5 * X[:, 1] > 0).astype(np.float32)
    spec = get_task("donor_accept")
    for cls in (GbdtPredictor, MlpPredictor):
        kw = {"epochs": 10} if cls is MlpPredictor else {}
        m = cls(spec, **kw).fit(X[:1500], y[:1500], X[1500:], y[1500:])
        auc = compute_metrics(spec, y[1500:], m.predict(X[1500:]))["auroc"]
        assert auc > 0.85, f"{cls.__name__} auc {auc}"
        m.save(tmp_path / cls.__name__)
        m2 = cls.load(tmp_path / cls.__name__, spec)
        assert np.allclose(m.predict(X[:5]), m2.predict(X[:5]), atol=1e-5)
    r = RulesPredictor(spec).fit(X, y)
    assert abs(float(r.predict(X[:3])[0]) - y.mean()) < 1e-6


def test_train_version_and_serve(synth_dataset: Path, model_dir: Path, monkeypatch: pytest.MonkeyPatch):
    card = train_version("test-model-0.1", [synth_dataset], tasks=["donor_accept", "donor_eta", "urgency_priority"], model_dir=model_dir, quick=True)
    assert card["status"] == "evaluated"
    for t in ("donor_accept", "donor_eta", "urgency_priority"):
        res = card["tasks"][t]
        assert res.get("backend") in ("mlp", "gbdt"), res
        assert (model_dir / "test-model-0.1" / t / "backend.txt").exists()
    assert card["tasks"]["donor_accept"]["beats_baseline"] is True
    assert card["tasks"]["donor_eta"]["metrics"]["mae"] > 0

    # registry
    assert [v["version"] for v in list_versions(model_dir)] == ["test-model-0.1"]
    set_active_version("test-model-0.1", model_dir)
    monkeypatch.delenv("ML_ACTIVE_VERSION", raising=False)
    assert get_active_version(model_dir) == "test-model-0.1"
    lm = LoadedModel.load(model_dir / "test-model-0.1")
    assert set(lm.tasks) == {"donor_accept", "donor_eta", "urgency_priority"}

    # API
    monkeypatch.setenv("ML_MODEL_DIR", str(model_dir))
    monkeypatch.setenv("ML_API_SECRET", "s3cret")
    api_module._load()
    client = TestClient(api_module.app)
    h = client.get("/health").json()
    assert h["model_loaded"] is True and h["activeVersion"] == "test-model-0.1"
    body = {"requests": [
        {"task": "donor_accept", "ref": "d1", "features": {"distanceKm": 2.0, "urgency": "critical", "isNight": False, "scoreFinal": 90, "hour": 10}},
        {"task": "donor_accept", "ref": "d2", "features": {"distanceKm": 28.0, "urgency": "low", "isNight": True, "scoreFinal": 30, "hour": 2}},
        {"task": "donor_eta", "ref": "e1", "features": {"distanceKm": 10.0, "urgency": "high", "isNight": False, "scoreFinal": 50, "hour": 12, "etaMinutes": 40}},
        {"task": "urgency_priority", "ref": "u1", "features": {"distanceKm": 1.0, "urgency": "critical", "isNight": False, "scoreFinal": 50, "hour": 12}},
    ]}
    assert client.post("/predict/batch", json=body).status_code == 401  # secret required
    r = client.post("/predict/batch", json=body, headers={"X-ML-Secret": "s3cret"})
    assert r.status_code == 200, r.text
    out = r.json()
    assert out["modelVersion"] == "test-model-0.1" and len(out["results"]) == 4
    res = {x["ref"]: x for x in out["results"]}
    assert res["d1"]["prediction"] > res["d2"]["prediction"]  # near+critical+day beats far+low+night
    assert 0 <= res["d1"]["confidence"] <= 1
    assert res["e1"]["prediction"] > 5  # minutes, natural units
    assert isinstance(res["u1"]["prediction"], list) and len(res["u1"]["prediction"]) == 4
    assert abs(sum(res["u1"]["prediction"]) - 1) < 1e-4
    # unknown task / missing head
    assert client.post("/predict/batch", json={"requests": [{"task": "nope", "features": {}}]}, headers={"X-ML-Secret": "s3cret"}).status_code == 400
    assert client.post("/predict/batch", json={"requests": [{"task": "delivery_time", "features": {}}]}, headers={"X-ML-Secret": "s3cret"}).status_code == 422


def test_task_registry_matches_ts_contract():
    ts = Path(__file__).resolve().parents[2] / "lib" / "ml" / "types.ts"
    text = ts.read_text(encoding="utf-8")
    for t in TASKS:
        assert f'"{t}"' in text, f"{t} missing from lib/ml/types.ts"
