"""Controlled retraining pipeline.

    python -m haemologix.retrain --version haemologix-model-1.1 \
        --sim ml/data/sim/v1 [--real ml/data/real/v1] [--min-real-rows 200] [--max-rows 400000]

Steps (plan §11): validated data → training → offline evaluation vs rules baseline
AND vs the currently active version → model card. It never activates anything;
that is a human step (scripts/ml/approveModel.ts + activateModel.ts).
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

from .data import load_manifest
from .metrics import is_better
from .registry import ModelCard, get_active_version, resolve_model_dir
from .tasks import get_task
from .train import train_version


def compare_to_active(card: ModelCard, model_dir: Path | None = None) -> dict:
    active = get_active_version(model_dir)
    out = {"activeVersion": active, "perTask": {}, "regressions": []}
    if not active:
        return out
    ad = resolve_model_dir(model_dir) / active
    if not (ad / "model_card.json").exists():
        return out
    active_card = ModelCard.load(ad)
    for task, res in card.get("tasks", {}).items():
        if not res.get("metrics"):
            continue
        spec = get_task(task)
        inc = active_card.get("tasks", {}).get(task, {}).get("metrics")
        better = is_better(spec, res["metrics"], inc, min_delta=0.0) if inc else True
        out["perTask"][task] = {"candidate": res["metrics"].get(spec.primary_metric), "active": (inc or {}).get(spec.primary_metric), "betterOrEqual": better}
        if inc and not better:
            out["regressions"].append(task)
    return out


def main(argv: list[str] | None = None) -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--version", required=True)
    ap.add_argument("--sim", action="append", default=[], help="simulator dataset dir(s)")
    ap.add_argument("--real", action="append", default=[], help="harvested real dataset dir(s)")
    ap.add_argument("--min-real-rows", type=int, default=0, help="refuse to retrain unless real data has at least this many rows (guardrail)")
    ap.add_argument("--max-rows", type=int, default=400_000)
    ap.add_argument("--epochs", type=int, default=30)
    ap.add_argument("--backend", default="auto")
    ap.add_argument("--tasks", default=None)
    ap.add_argument("--model-dir", default=None)
    ap.add_argument("--quick", action="store_true")
    a = ap.parse_args(argv)

    real_rows = sum(int(sum(load_manifest(Path(d)).get("rows", {}).values())) for d in a.real)
    if a.min_real_rows and real_rows < a.min_real_rows:
        print(f"[retrain] refusing: only {real_rows} real rows (< {a.min_real_rows}). Collect more outcomes first.")
        return 3
    data_dirs = [Path(d) for d in a.sim + a.real]
    if not data_dirs:
        print("[retrain] no data dirs given")
        return 2
    card = train_version(
        a.version, data_dirs, a.tasks.split(",") if a.tasks else None, a.backend, a.max_rows, a.epochs,
        Path(a.model_dir) if a.model_dir else None, notes=f"retrain: sim={a.sim} real={a.real} realRows={real_rows}", quick=a.quick,
    )
    cmp = compare_to_active(card, Path(a.model_dir) if a.model_dir else None)
    card["comparedToActive"] = cmp
    card.save(resolve_model_dir(Path(a.model_dir) if a.model_dir else None) / a.version)
    print(json.dumps({"version": a.version, "allBeatBaseline": card.get("allBeatBaseline"), "comparedToActive": cmp}, indent=2))
    print("[retrain] done. Next: npm run ml:register -- --version", a.version, " -> ml:approve -> ml:activate")
    return 0


if __name__ == "__main__":
    sys.exit(main())
