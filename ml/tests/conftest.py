import json
import sys
from pathlib import Path

import numpy as np
import pytest

ML_ROOT = Path(__file__).resolve().parents[1]
if str(ML_ROOT) not in sys.path:
    sys.path.insert(0, str(ML_ROOT))


def _synthetic_rows(task: str, n: int, seed: int = 0) -> list[dict]:
    """Small self-contained dataset with learnable structure (no simulator needed)."""
    rng = np.random.default_rng(seed)
    rows = []
    for i in range(n):
        dist = float(rng.uniform(0, 30))
        urgency = str(rng.choice(["low", "medium", "high", "critical"]))
        night = bool(rng.random() < 0.2)
        score = float(rng.uniform(20, 100))
        f = {"distanceKm": round(dist, 2), "urgency": urgency, "isNight": night, "scoreFinal": round(score, 1), "hour": int(rng.integers(0, 24))}
        logit = 0.8 - 0.08 * dist + (0.6 if urgency == "critical" else 0) - (0.7 if night else 0) + 0.01 * score
        p = 1 / (1 + np.exp(-logit))
        if task == "donor_accept":
            label = int(rng.random() < p)
        elif task == "donor_eta":
            f["etaMinutes"] = int(25 + dist * 1.5)
            label = float(max(10, f["etaMinutes"] * rng.lognormal(0, 0.25)))
        elif task == "urgency_priority":
            label = int(min(3, max(0, round(3 - dist / 10 + rng.normal(0, 0.5)))))
        else:
            label = int(rng.random() < p)
        rows.append({"task": task, "features": f, "label": label, "source": "sim", "groupId": f"g{i // 5}", "eventTime": "2026-08-01T10:00:00Z"})
    return rows


@pytest.fixture
def synth_dataset(tmp_path: Path) -> Path:
    d = tmp_path / "sim" / "vtest"
    d.mkdir(parents=True)
    counts = {}
    for task, n in [("donor_accept", 1500), ("donor_eta", 800), ("urgency_priority", 900), ("donor_show", 600)]:
        rows = _synthetic_rows(task, n)
        with (d / f"{task}.jsonl").open("w", encoding="utf-8") as fh:
            for r in rows:
                fh.write(json.dumps(r) + "\n")
        counts[task] = n
    (d / "manifest.json").write_text(json.dumps({"datasetVersion": "vtest", "source": "sim", "rows": counts, "priorsHash": "test"}), encoding="utf-8")
    return d


@pytest.fixture
def model_dir(tmp_path: Path) -> Path:
    d = tmp_path / "checkpoints"
    d.mkdir()
    return d
