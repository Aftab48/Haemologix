"""Metrics computation for model evaluation"""

import torch
import numpy as np
from typing import Dict, Any


def compute_metrics(
    predictions: Dict[str, torch.Tensor],
    labels: torch.Tensor | Dict[str, torch.Tensor],
    task_type: str,
) -> Dict[str, float]:
    """
    Compute evaluation metrics for a specific task type.
    """
    metrics = {}

    if task_type == "donor_selection":
        # Accuracy: correct selection
        selected_idx = predictions["selected_idx"]
        correct = (selected_idx == labels).float()
        metrics["accuracy"] = correct.mean().item()

        # Top-k accuracy
        scores = predictions["scores"]
        top_k = torch.topk(scores, k=min(3, scores.size(-1)), dim=-1).indices
        top_k_correct = (top_k == labels.unsqueeze(-1)).any(dim=-1).float()
        metrics["top_3_accuracy"] = top_k_correct.mean().item()

    elif task_type == "urgency_assessment":
        # Classification accuracy
        urgency_class = predictions["urgency_class"]
        metrics["accuracy"] = (
            (urgency_class == labels["urgency_class"]).float().mean().item()
        )

        # Priority score MAE
        priority_score = predictions["priority_score"]
        mae = torch.abs(priority_score - labels["priority_score"]).mean().item()
        metrics["priority_mae"] = mae

    elif task_type == "inventory_selection":
        selected_idx = predictions["selected_idx"]
        correct = (selected_idx == labels).float()
        metrics["accuracy"] = correct.mean().item()

    elif task_type == "transport_planning":
        # Method accuracy
        method = predictions["method"]
        metrics["method_accuracy"] = (
            (method == labels["method"]).float().mean().item()
        )

        # ETA MAE
        eta_minutes = predictions["eta_minutes"]
        mae = torch.abs(eta_minutes - labels["eta_minutes"]).mean().item()
        metrics["eta_mae"] = mae

    elif task_type == "eligibility_analysis":
        # Binary classification metrics
        eligible = predictions["eligible"]
        eligible_prob = predictions["eligible_prob"]

        true_positive = ((eligible == 1) & (labels["eligible"] == 1)).float().sum()
        true_negative = ((eligible == 0) & (labels["eligible"] == 0)).float().sum()
        false_positive = ((eligible == 1) & (labels["eligible"] == 0)).float().sum()
        false_negative = ((eligible == 0) & (labels["eligible"] == 1)).float().sum()

        accuracy = (true_positive + true_negative) / (
            true_positive + true_negative + false_positive + false_negative + 1e-8
        )
        precision = true_positive / (true_positive + false_positive + 1e-8)
        recall = true_positive / (true_positive + false_negative + 1e-8)
        f1 = 2 * precision * recall / (precision + recall + 1e-8)

        metrics["accuracy"] = accuracy.item()
        metrics["precision"] = precision.item()
        metrics["recall"] = recall.item()
        metrics["f1"] = f1.item()

    # Confidence metrics (common to all)
    if "confidence" in predictions:
        metrics["avg_confidence"] = predictions["confidence"].mean().item()

    return metrics

