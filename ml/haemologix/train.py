"""Train + evaluate one or all tasks into a versioned checkpoint directory.

    python -m haemologix.train --version haemologix-model-1.0 --data ml/data/sim/v1 [--data ml/data/real/v1 ...]
                               [--tasks donor_accept,donor_show] [--backend auto|mlp|gbdt]
                               [--max-rows 300000] [--epochs 40]

For each task:
  1. load rows from all --data dirs (sim + real mixed), group-split by scenario/request
  2. fit preprocessor on train, fit RULES baseline, GBDT and MLP
  3. evaluate all on the held-out test split; pick the winner per --backend policy
     (auto = best primary metric among {mlp, gbdt} that beats rules; ties → mlp)
  4. save preprocessor + winner + metrics.json; update model_card.json

The model card records whether each task beat the rules baseline; the approval
gate (scripts/ml/approveModel.ts) refuses versions where any task does not.
"""

from __future__ import annotations

import argparse
import json
import sys
import time
from pathlib import Path
from typing import Any

import numpy as np

from .data import TabularPreprocessor, describe, group_split, inverse_label, labels_for, load_manifest, load_task_rows
from .metrics import compute_metrics, is_better, permutation_importance, primary
from .models import GbdtPredictor, MlpPredictor, RulesPredictor
from .registry import ModelCard, now_iso, resolve_model_dir
from .tasks import TASK_NAMES, get_task


def _log(msg: str) -> None:
    try:
        print(f"[train] {msg}", flush=True)
    except UnicodeEncodeError:  # Windows consoles without UTF-8
        print(f"[train] {msg}".encode("ascii", "replace").decode(), flush=True)


def train_task(
    task: str,
    data_dirs: list[Path],
    version_dir: Path,
    backend: str = "auto",
    max_rows: int | None = None,
    epochs: int = 40,
    seed: int = 7,
    quick: bool = False,
) -> dict[str, Any]:
    spec = get_task(task)
    t0 = time.time()
    rows = load_task_rows(data_dirs, task)
    if not rows:
        _log(f"{task}: no rows found in {[str(d) for d in data_dirs]} — skipping")
        return {"task": task, "skipped": True}
    if max_rows and len(rows) > max_rows:
        rng = np.random.default_rng(seed)
        idx = rng.choice(len(rows), max_rows, replace=False)
        rows = [rows[i] for i in sorted(idx)]
    train, val, test = group_split(rows, seed=seed)
    _log(f"{task}: rows={len(rows)} train={len(train)} val={len(val)} test={len(test)}  {describe(rows, task)}")

    pre = TabularPreprocessor(task).fit(train)
    Xtr, Xva, Xte = pre.transform(train), pre.transform(val), pre.transform(test)
    ytr, yva, yte = labels_for(train, spec), labels_for(val, spec), labels_for(test, spec)
    yte_nat = np.asarray([float(r["label"]) for r in test], dtype=np.float32)

    # --- rules baseline -------------------------------------------------------
    rules = RulesPredictor(spec).fit(Xtr, ytr)
    if spec.kind == "regression" and "etaMinutes" in pre.numeric_cols:
        j = pre.numeric_cols.index("etaMinutes")
        rules.with_eta_feature(j, pre.num_mean["etaMinutes"], pre.num_std["etaMinutes"])
    m_rules = compute_metrics(spec, yte, rules.predict(Xte), yte_nat)
    _log(f"{task}: rules   {spec.primary_metric}={primary(spec, m_rules)}")

    candidates: dict[str, tuple[Any, dict[str, Any]]] = {}
    if backend in ("auto", "gbdt"):
        g = GbdtPredictor(spec, seed=seed, max_iter=120 if quick else 300).fit(Xtr, ytr, Xva, yva)
        m_g = compute_metrics(spec, yte, g.predict(Xte), yte_nat)
        candidates["gbdt"] = (g, m_g)
        _log(f"{task}: gbdt    {spec.primary_metric}={primary(spec, m_g)}  ({time.time() - t0:.0f}s)")
    if backend in ("auto", "mlp"):
        mlp = MlpPredictor(spec, epochs=8 if quick else epochs, seed=seed).fit(Xtr, ytr, Xva, yva)
        m_m = compute_metrics(spec, yte, mlp.predict(Xte), yte_nat)
        candidates["mlp"] = (mlp, m_m)
        _log(f"{task}: mlp     {spec.primary_metric}={primary(spec, m_m)}  ({time.time() - t0:.0f}s)")

    # --- pick winner ----------------------------------------------------------
    winner_name, (winner, winner_metrics) = None, (None, {})
    for name, (pred, m) in candidates.items():
        if winner is None or is_better(spec, m, winner_metrics):
            winner_name, winner, winner_metrics = name, pred, m
    # ties within 0.5% of the metric → prefer mlp (the custom model)
    if "mlp" in candidates and winner_name == "gbdt":
        pm, pg = primary(spec, candidates["mlp"][1]), primary(spec, candidates["gbdt"][1])
        if pm is not None and pg is not None and abs(pm - pg) <= 0.005 * max(abs(pg), 1e-9):
            winner_name, (winner, winner_metrics) = "mlp", candidates["mlp"]
    beats_rules = is_better(spec, winner_metrics, m_rules)
    _log(f"{task}: winner={winner_name} beats_rules={beats_rules}")

    # --- importance -----------------------------------------------------------
    names = pre.feature_names
    importance: dict[str, float] | None = None
    if isinstance(winner, GbdtPredictor):
        winner._importance = permutation_importance(winner.predict, Xte, yte, spec, n_repeats=1, seed=seed, max_rows=1500 if quick else 4000)
        importance = winner.feature_importance(names)
    elif winner is not None:
        importance = winner.feature_importance(names)

    # --- save -----------------------------------------------------------------
    td = version_dir / task
    td.mkdir(parents=True, exist_ok=True)
    pre.save(td / "preprocessor.json")
    assert winner is not None and winner_name is not None
    winner.save(td)
    (td / "backend.txt").write_text(winner_name, encoding="utf-8")
    rules.save(td / "rules_baseline")
    result = {
        "task": task,
        "kind": spec.kind,
        "backend": winner_name,
        "rows": {"total": len(rows), "train": len(train), "val": len(val), "test": len(test)},
        "features": names,
        "n_features": len(names),
        "metrics": winner_metrics,
        "candidates": {k: v[1] for k, v in candidates.items()},
        "baseline_metrics": m_rules,
        "primary_metric": spec.primary_metric,
        "beats_baseline": bool(beats_rules),
        "feature_importance": importance,
        "trained_at": now_iso(),
        "seconds": round(time.time() - t0, 1),
    }
    (td / "metrics.json").write_text(json.dumps(result, indent=2), encoding="utf-8")
    return result


def train_version(
    version: str,
    data_dirs: list[Path],
    tasks: list[str] | None = None,
    backend: str = "auto",
    max_rows: int | None = None,
    epochs: int = 40,
    model_dir: Path | None = None,
    notes: str = "",
    seed: int = 7,
    quick: bool = False,
) -> ModelCard:
    root = resolve_model_dir(model_dir)
    version_dir = root / version
    version_dir.mkdir(parents=True, exist_ok=True)
    manifests = [load_manifest(d) for d in data_dirs]
    mix: dict[str, int] = {}
    for m in manifests:
        src = m.get("source", "unknown")
        mix[src] = mix.get(src, 0) + int(sum(m.get("rows", {}).values()))
    dataset_version = "+".join(str(m.get("datasetVersion", Path(d).name)) for m, d in zip(manifests, data_dirs))
    card = ModelCard.load(version_dir) if (version_dir / "model_card.json").exists() else ModelCard.new(version, dataset_version, mix, notes)
    card["datasetVersion"] = dataset_version
    card["datasetMix"] = mix
    card["dataDirs"] = [str(d) for d in data_dirs]
    card["priorsHash"] = [m.get("priorsHash") for m in manifests]
    card["seed"] = seed
    card.save(version_dir)

    for task in tasks or TASK_NAMES:
        try:
            res = train_task(task, data_dirs, version_dir, backend=backend, max_rows=max_rows, epochs=epochs, seed=seed, quick=quick)
        except Exception as e:  # keep going; the card records the failure
            _log(f"{task}: FAILED {e!r}")
            res = {"task": task, "error": repr(e)}
        card.setdefault("tasks", {})[task] = {k: v for k, v in res.items() if k not in ("candidates",)} | {"candidates": res.get("candidates")}
        card.save(version_dir)

    trained = [t for t, r in card["tasks"].items() if not r.get("skipped") and not r.get("error")]
    failing = [t for t in trained if not card["tasks"][t].get("beats_baseline")]
    card["status"] = "evaluated"
    card["evaluatedAt"] = now_iso()
    card["allBeatBaseline"] = len(failing) == 0
    card["tasksNotBeatingBaseline"] = failing
    lim = list(card.get("limitations") or [])
    lim.append("Trained on simulator data (priors " + ",".join(str(p) for p in card["priorsHash"]) + "); calibrate against real outcomes before authority mode.")
    if failing:
        lim.append(f"Tasks not beating rules baseline: {failing}")
    card["limitations"] = sorted(set(lim))
    card.save(version_dir)
    _log(f"version {version} evaluated -> {version_dir}  allBeatBaseline={card['allBeatBaseline']}")
    return card


def main(argv: list[str] | None = None) -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--version", required=True)
    ap.add_argument("--data", action="append", required=True, help="dataset dir (repeatable)")
    ap.add_argument("--tasks", default=None, help="comma list; default all")
    ap.add_argument("--backend", default="auto", choices=["auto", "mlp", "gbdt"])
    ap.add_argument("--max-rows", type=int, default=None)
    ap.add_argument("--epochs", type=int, default=40)
    ap.add_argument("--model-dir", default=None)
    ap.add_argument("--notes", default="")
    ap.add_argument("--seed", type=int, default=7)
    ap.add_argument("--quick", action="store_true", help="tiny epochs/iters for smoke tests")
    a = ap.parse_args(argv)
    card = train_version(
        a.version, [Path(d) for d in a.data], a.tasks.split(",") if a.tasks else None, a.backend, a.max_rows,
        a.epochs, Path(a.model_dir) if a.model_dir else None, a.notes, a.seed, a.quick,
    )
    print(json.dumps({t: {"backend": r.get("backend"), r.get("primary_metric", "metric"): primary(get_task(t), r.get("metrics", {})) if r.get("metrics") else None,
                          "beats_baseline": r.get("beats_baseline")} for t, r in card["tasks"].items()}, indent=2))
    return 0


if __name__ == "__main__":
    sys.exit(main())
