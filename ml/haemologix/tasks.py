"""Task registry — must stay in sync with lib/ml/types.ts PREDICTION_TASKS."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Literal

TaskKind = Literal["binary", "regression", "multiclass"]

URGENCY_CLASSES = ["low", "medium", "high", "critical"]


@dataclass(frozen=True)
class TaskSpec:
    name: str
    kind: TaskKind
    #: metric used for the approval gate (higher is better unless `lower_is_better`)
    primary_metric: str
    lower_is_better: bool = False
    #: for regression: model log1p(label) and expm1 on the way out
    log_target: bool = False
    num_classes: int = 1
    description: str = ""


TASKS: dict[str, TaskSpec] = {
    "donor_accept": TaskSpec("donor_accept", "binary", "auroc", description="P(donor accepts the notification)"),
    "donor_show": TaskSpec("donor_show", "binary", "auroc", description="P(donor arrives | accepted)"),
    "donor_response_time": TaskSpec(
        "donor_response_time", "regression", "mae", lower_is_better=True, log_target=True,
        description="Minutes from notification to response",
    ),
    "donor_eta": TaskSpec(
        "donor_eta", "regression", "mae", lower_is_better=True, log_target=True,
        description="Minutes from acceptance to arrival",
    ),
    "inventory_delivery_ok": TaskSpec(
        "inventory_delivery_ok", "binary", "auroc", description="P(reserved unit delivered usable, in time)",
    ),
    "delivery_time": TaskSpec(
        "delivery_time", "regression", "mae", lower_is_better=True, log_target=True,
        description="Minutes from reservation to delivery",
    ),
    "urgency_priority": TaskSpec(
        "urgency_priority", "multiclass", "macro_f1", num_classes=4, description="Urgency class (oracle)",
    ),
    "alert_resolves_in_window": TaskSpec(
        "alert_resolves_in_window", "binary", "auroc", description="P(alert fully resolved before deadline)",
    ),
    "eligibility_needs_review": TaskSpec(
        "eligibility_needs_review", "binary", "auroc", description="P(reviewer would flag this eligibility result)",
    ),
    # sim-v3: escalation ladder — asked before widening the donor search radius
    "expansion_yield": TaskSpec(
        "expansion_yield", "binary", "auroc",
        description="P(widening the donor radius to the next tier finds >=1 new eligible donor)",
    ),
}

TASK_NAMES = list(TASKS.keys())


def get_task(name: str) -> TaskSpec:
    if name not in TASKS:
        raise KeyError(f"unknown task '{name}'. Known: {TASK_NAMES}")
    return TASKS[name]
