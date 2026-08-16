"""Evaluation metrics per task kind, plus calibration (ECE) and permutation importance."""

from __future__ import annotations

from typing import Any

import numpy as np
from sklearn.metrics import (
    average_precision_score,
    brier_score_loss,
    f1_score,
    log_loss,
    mean_absolute_error,
    roc_auc_score,
)

from .tasks import TaskSpec


def expected_calibration_error(p: np.ndarray, y: np.ndarray, bins: int = 10) -> float:
    edges = np.linspace(0, 1, bins + 1)
    ece = 0.0
    n = len(p)
    for lo, hi in zip(edges[:-1], edges[1:]):
        m = (p >= lo) & (p < hi) if hi < 1 else (p >= lo) & (p <= hi)
        if m.any():
            ece += (m.sum() / n) * abs(p[m].mean() - y[m].mean())
    return float(ece)


def compute_metrics(spec: TaskSpec, y_true_model_space: np.ndarray, pred: np.ndarray, y_true_natural: np.ndarray | None = None) -> dict[str, Any]:
    """`pred` is in model space (probabilities / log-minutes / class probs)."""
    out: dict[str, Any] = {"n": int(len(y_true_model_space))}
    if len(y_true_model_space) == 0:
        return out
    if spec.kind == "binary":
        y = y_true_model_space.astype(int)
        p = np.clip(pred, 1e-6, 1 - 1e-6)
        out["positive_rate"] = float(y.mean())
        if len(np.unique(y)) > 1:
            out["auroc"] = float(roc_auc_score(y, p))
            out["auprc"] = float(average_precision_score(y, p))
        else:
            out["auroc"] = 0.5
            out["auprc"] = float(y.mean())
        out["brier"] = float(brier_score_loss(y, p))
        out["log_loss"] = float(log_loss(y, p, labels=[0, 1]))
        out["ece"] = expected_calibration_error(p, y)
        out["accuracy@0.5"] = float(((p >= 0.5).astype(int) == y).mean())
    elif spec.kind == "regression":
        # report in natural units (minutes)
        yt = y_true_natural if y_true_natural is not None else (np.expm1(y_true_model_space) if spec.log_target else y_true_model_space)
        pn = np.expm1(pred) if spec.log_target else pred
        err = np.abs(pn - yt)
        out["mae"] = float(mean_absolute_error(yt, pn))
        out["p50_abs_err"] = float(np.percentile(err, 50))
        out["p90_abs_err"] = float(np.percentile(err, 90))
        out["mape"] = float(np.mean(err / np.clip(np.abs(yt), 1, None)))
        out["label_mean"] = float(np.mean(yt))
        out["pred_mean"] = float(np.mean(pn))
    else:
        y = y_true_model_space.astype(int)
        yhat = pred.argmax(axis=1)
        out["accuracy"] = float((yhat == y).mean())
        out["macro_f1"] = float(f1_score(y, yhat, average="macro", labels=list(range(spec.num_classes)), zero_division=0))
        # within-one-level accuracy matters operationally
        out["within_one"] = float((np.abs(yhat - y) <= 1).mean())
        try:
            out["log_loss"] = float(log_loss(y, np.clip(pred, 1e-6, 1), labels=list(range(spec.num_classes))))
        except ValueError:
            pass
    return out


def primary(spec: TaskSpec, m: dict[str, Any]) -> float | None:
    v = m.get(spec.primary_metric)
    return None if v is None else float(v)


def is_better(spec: TaskSpec, candidate: dict[str, Any], incumbent: dict[str, Any] | None, min_delta: float = 0.0) -> bool:
    c = primary(spec, candidate)
    if c is None:
        return False
    if incumbent is None:
        return True
    i = primary(spec, incumbent)
    if i is None:
        return True
    return (c < i - min_delta) if spec.lower_is_better else (c > i + min_delta)


def permutation_importance(predict_fn, X: np.ndarray, y_model: np.ndarray, spec: TaskSpec, n_repeats: int = 2, seed: int = 0, max_rows: int = 5000) -> np.ndarray:
    """Cheap permutation importance on the primary metric (drop in metric when a column is shuffled)."""
    rng = np.random.default_rng(seed)
    if len(X) > max_rows:
        idx = rng.choice(len(X), max_rows, replace=False)
        X, y_model = X[idx], y_model[idx]
    base = primary(spec, compute_metrics(spec, y_model, predict_fn(X)))
    if base is None:
        return np.zeros(X.shape[1])
    imp = np.zeros(X.shape[1])
    for j in range(X.shape[1]):
        drops = []
        for _ in range(n_repeats):
            Xp = X.copy()
            Xp[:, j] = rng.permutation(Xp[:, j])
            m = primary(spec, compute_metrics(spec, y_model, predict_fn(Xp)))
            drop = (m - base) if spec.lower_is_better else (base - m)
            drops.append(drop if m is not None else 0.0)
        imp[j] = max(0.0, float(np.mean(drops)))
    return imp
