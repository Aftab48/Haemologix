"""Dataset loading + tabular preprocessing.

Rows are the TrainingRow JSONL produced by the simulator (lib/sim/dataset.ts) or
the harvester (scripts/ml/harvestTrainingData.ts):

    {"task": "...", "features": {...}, "label": 0|1|float, "source": "sim|real",
     "groupId": "...", "eventTime": "...", "meta": {...}}

The preprocessor is fitted per task, persisted as JSON, and applied identically at
training and serving time. It only knows about the flat feature dict, so the
TypeScript feature builders remain the single source of truth for *what* a
feature is.
"""

from __future__ import annotations

import json
import math
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Iterable, Iterator

import numpy as np

from .tasks import TaskSpec, get_task

Row = dict[str, Any]


# ---------------------------------------------------------------------------
# Loading
# ---------------------------------------------------------------------------

def iter_jsonl(path: Path) -> Iterator[Row]:
    with path.open("r", encoding="utf-8") as fh:
        for line in fh:
            line = line.strip()
            if line:
                yield json.loads(line)


def load_task_rows(data_dirs: Iterable[Path], task: str, limit: int | None = None) -> list[Row]:
    """Load rows for one task from one or more dataset directories (sim + real)."""
    rows: list[Row] = []
    for d in data_dirs:
        p = Path(d) / f"{task}.jsonl"
        if not p.exists():
            continue
        for r in iter_jsonl(p):
            rows.append(r)
            if limit and len(rows) >= limit:
                return rows
    return rows


def load_manifest(data_dir: Path) -> dict[str, Any]:
    p = Path(data_dir) / "manifest.json"
    return json.loads(p.read_text(encoding="utf-8")) if p.exists() else {}


def group_split(rows: list[Row], val_frac: float = 0.15, test_frac: float = 0.15, seed: int = 7):
    """Split by groupId (scenario / request) so correlated rows never leak across splits."""
    groups = sorted({r.get("groupId", str(i)) for i, r in enumerate(rows)})
    rng = np.random.default_rng(seed)
    rng.shuffle(groups)
    n = len(groups)
    n_test = int(n * test_frac)
    n_val = int(n * val_frac)
    test_g = set(groups[:n_test])
    val_g = set(groups[n_test:n_test + n_val])
    train, val, test = [], [], []
    for i, r in enumerate(rows):
        g = r.get("groupId", str(i))
        (test if g in test_g else val if g in val_g else train).append(r)
    return train, val, test


# ---------------------------------------------------------------------------
# Preprocessing
# ---------------------------------------------------------------------------

@dataclass
class TabularPreprocessor:
    """Flat feature dict → float32 vector. Persisted as JSON so serving == training."""

    task: str
    numeric_cols: list[str] = field(default_factory=list)
    bool_cols: list[str] = field(default_factory=list)
    cat_cols: list[str] = field(default_factory=list)
    cat_vocab: dict[str, list[str]] = field(default_factory=dict)  # col → categories (one-hot, unknown → all zeros)
    num_mean: dict[str, float] = field(default_factory=dict)
    num_std: dict[str, float] = field(default_factory=dict)
    fitted: bool = False

    # -- fitting ---------------------------------------------------------------

    def fit(self, rows: list[Row]) -> "TabularPreprocessor":
        numeric: dict[str, list[float]] = {}
        bools: set[str] = set()
        cats: dict[str, set[str]] = {}
        for r in rows:
            for k, v in r["features"].items():
                if isinstance(v, bool):
                    bools.add(k)
                elif isinstance(v, (int, float)) and not (isinstance(v, float) and math.isnan(v)):
                    numeric.setdefault(k, []).append(float(v))
                elif isinstance(v, str):
                    cats.setdefault(k, set()).add(v)
        # a column that appears both as bool and numeric is treated as numeric
        for b in list(bools):
            if b in numeric:
                bools.discard(b)
        self.bool_cols = sorted(bools)
        self.numeric_cols = sorted(numeric.keys())
        self.cat_cols = sorted(cats.keys())
        self.cat_vocab = {c: sorted(vs) for c, vs in cats.items()}
        for c in self.numeric_cols:
            arr = np.asarray(numeric[c], dtype=np.float64)
            mean = float(arr.mean())
            std = float(arr.std())
            self.num_mean[c] = mean
            self.num_std[c] = std if std > 1e-9 else 1.0
        self.fitted = True
        return self

    # -- transform -------------------------------------------------------------

    @property
    def feature_names(self) -> list[str]:
        names = list(self.numeric_cols) + [f"{b}" for b in self.bool_cols]
        for c in self.cat_cols:
            names += [f"{c}={v}" for v in self.cat_vocab[c]]
        return names

    @property
    def dim(self) -> int:
        return len(self.feature_names)

    def transform_one(self, features: dict[str, Any]) -> np.ndarray:
        out = np.zeros(self.dim, dtype=np.float32)
        i = 0
        for c in self.numeric_cols:
            v = features.get(c)
            if isinstance(v, bool):
                v = float(v)
            if v is None or not isinstance(v, (int, float)) or (isinstance(v, float) and math.isnan(v)):
                v = self.num_mean[c]
            out[i] = (float(v) - self.num_mean[c]) / self.num_std[c]
            i += 1
        for b in self.bool_cols:
            v = features.get(b)
            out[i] = 1.0 if v is True or v == 1 or v == "true" else 0.0
            i += 1
        for c in self.cat_cols:
            vocab = self.cat_vocab[c]
            v = features.get(c)
            if isinstance(v, str) and v in vocab:
                out[i + vocab.index(v)] = 1.0
            i += len(vocab)
        return out

    def transform(self, rows: list[Row]) -> np.ndarray:
        if not rows:
            return np.zeros((0, self.dim), dtype=np.float32)
        return np.stack([self.transform_one(r["features"]) for r in rows])

    def transform_features(self, features_list: list[dict[str, Any]]) -> np.ndarray:
        if not features_list:
            return np.zeros((0, self.dim), dtype=np.float32)
        return np.stack([self.transform_one(f) for f in features_list])

    # -- persistence -----------------------------------------------------------

    def to_dict(self) -> dict[str, Any]:
        return {
            "task": self.task,
            "numeric_cols": self.numeric_cols,
            "bool_cols": self.bool_cols,
            "cat_cols": self.cat_cols,
            "cat_vocab": self.cat_vocab,
            "num_mean": self.num_mean,
            "num_std": self.num_std,
        }

    def save(self, path: Path) -> None:
        Path(path).write_text(json.dumps(self.to_dict(), indent=2), encoding="utf-8")

    @classmethod
    def load(cls, path: Path) -> "TabularPreprocessor":
        d = json.loads(Path(path).read_text(encoding="utf-8"))
        p = cls(task=d["task"])
        p.numeric_cols = d["numeric_cols"]
        p.bool_cols = d["bool_cols"]
        p.cat_cols = d["cat_cols"]
        p.cat_vocab = d["cat_vocab"]
        p.num_mean = d["num_mean"]
        p.num_std = d["num_std"]
        p.fitted = True
        return p


# ---------------------------------------------------------------------------
# Labels
# ---------------------------------------------------------------------------

def labels_for(rows: list[Row], spec: TaskSpec) -> np.ndarray:
    y = np.asarray([float(r["label"]) for r in rows], dtype=np.float32)
    if spec.kind == "multiclass":
        return y.astype(np.int64)
    if spec.kind == "regression" and spec.log_target:
        return np.log1p(np.clip(y, 0, None)).astype(np.float32)
    return y


def inverse_label(values: np.ndarray, spec: TaskSpec) -> np.ndarray:
    if spec.kind == "regression" and spec.log_target:
        return np.expm1(values)
    return values


def describe(rows: list[Row], task: str) -> dict[str, Any]:
    spec = get_task(task)
    y = np.asarray([float(r["label"]) for r in rows]) if rows else np.zeros(0)
    d: dict[str, Any] = {"task": task, "rows": len(rows)}
    if len(rows):
        if spec.kind == "binary":
            d["positive_rate"] = float(y.mean())
        elif spec.kind == "regression":
            d["label_mean"] = float(y.mean())
            d["label_p50"] = float(np.median(y))
            d["label_p90"] = float(np.percentile(y, 90))
        else:
            d["class_counts"] = {int(k): int(v) for k, v in zip(*np.unique(y, return_counts=True))}
        d["sources"] = {s: int(n) for s, n in zip(*np.unique([r.get("source", "?") for r in rows], return_counts=True))}
    return d
