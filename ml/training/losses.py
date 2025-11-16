"""Loss functions for multi-task learning"""

import torch
import torch.nn as nn
import torch.nn.functional as F
from typing import Dict, Literal


class MultiTaskLoss(nn.Module):
    """
    Multi-task loss function (weighted combination per task)
    """

    def __init__(
        self,
        task_weights: Dict[str, float] = None,
    ):
        super().__init__()

        # Default task weights
        if task_weights is None:
            task_weights = {
                "donor_selection": 1.0,
                "urgency_assessment": 1.0,
                "inventory_selection": 1.0,
                "transport_planning": 1.0,
                "eligibility_analysis": 1.0,
            }

        self.task_weights = task_weights

        # Loss functions
        self.ce_loss = nn.CrossEntropyLoss()
        self.mse_loss = nn.MSELoss()
        self.bce_loss = nn.BCELoss()

    def compute_donor_selection_loss(
        self, predictions: Dict[str, torch.Tensor], labels: torch.Tensor
    ) -> torch.Tensor:
        """Loss for donor selection (ranking)"""
        scores = predictions["scores"]  # [batch_size, num_candidates]
        selected_idx = predictions["selected_idx"]  # [batch_size]

        # Ensure labels are within valid range
        num_candidates = scores.size(1)
        labels_clamped = torch.clamp(labels, 0, num_candidates - 1)
        
        # Cross-entropy loss on selected candidate
        # scores are logits, labels are class indices
        ce_loss = self.ce_loss(scores, labels_clamped)
        
        # Ranking loss: encourage selected candidate to have higher score than others
        # Get score of selected candidate
        batch_size = scores.size(0)
        selected_scores = scores.gather(1, labels_clamped.unsqueeze(1)).squeeze(1)  # [batch_size]
        
        # Create mask to exclude selected candidate
        mask = torch.ones_like(scores, dtype=torch.bool)
        mask.scatter_(1, labels_clamped.unsqueeze(1), False)
        
        # Get max score among non-selected candidates
        other_scores = scores.masked_fill(~mask, float('-inf'))
        max_other_scores = other_scores.max(dim=1)[0]  # [batch_size]
        
        # Margin-based ranking loss: selected should be at least margin higher
        margin = 1.0
        ranking_loss = torch.clamp(margin - (selected_scores - max_other_scores), min=0.0).mean()
        
        # Combined loss - increased ranking weight to force differentiation
        total_loss = ce_loss + 2.0 * ranking_loss

        return total_loss

    def compute_urgency_assessment_loss(
        self, predictions: Dict[str, torch.Tensor], labels: Dict[str, torch.Tensor]
    ) -> torch.Tensor:
        """Loss for urgency assessment (classification + regression)"""
        urgency_class = predictions["urgency_class"]
        priority_score = predictions["priority_score"]

        # Classification loss
        class_loss = self.ce_loss(urgency_class, labels["urgency_class"])

        # Regression loss for priority score
        priority_loss = self.mse_loss(priority_score, labels["priority_score"])

        # Combined loss
        total_loss = class_loss + 0.5 * priority_loss

        return total_loss

    def compute_inventory_selection_loss(
        self, predictions: Dict[str, torch.Tensor], labels: torch.Tensor
    ) -> torch.Tensor:
        """Loss for inventory selection (ranking)"""
        scores = predictions["scores"]
        selected_idx = predictions["selected_idx"]

        # Cross-entropy loss
        loss = self.ce_loss(scores, labels)

        return loss

    def compute_transport_planning_loss(
        self, predictions: Dict[str, torch.Tensor], labels: Dict[str, torch.Tensor]
    ) -> torch.Tensor:
        """Loss for transport planning (classification + regression)"""
        method = predictions["method"]
        eta_minutes = predictions["eta_minutes"]

        # Method classification loss
        method_loss = self.ce_loss(method, labels["method"])

        # ETA regression loss
        eta_loss = self.mse_loss(eta_minutes, labels["eta_minutes"])

        # Combined loss
        total_loss = method_loss + 0.5 * eta_loss

        return total_loss

    def compute_eligibility_analysis_loss(
        self, predictions: Dict[str, torch.Tensor], labels: Dict[str, torch.Tensor]
    ) -> torch.Tensor:
        """Loss for eligibility analysis (binary classification + multi-label)"""
        eligible_prob = predictions["eligible_prob"]
        failed_criteria_probs = predictions["failed_criteria_probs"]

        # Binary classification loss
        eligible_loss = self.bce_loss(eligible_prob, labels["eligible"])

        # Multi-label loss for failed criteria
        criteria_loss = self.bce_loss(failed_criteria_probs, labels["failed_criteria"])

        # Combined loss
        total_loss = eligible_loss + 0.5 * criteria_loss

        return total_loss

    def forward(
        self,
        task_type: Literal[
            "donor_selection",
            "urgency_assessment",
            "inventory_selection",
            "transport_planning",
            "eligibility_analysis",
        ],
        predictions: Dict[str, torch.Tensor],
        labels: torch.Tensor | Dict[str, torch.Tensor],
    ) -> torch.Tensor:
        """
        Compute loss for a specific task type.

        Args:
            task_type: Type of task
            predictions: Model predictions
            labels: Ground truth labels

        Returns:
            loss: Scalar loss value
        """
        if task_type == "donor_selection":
            loss = self.compute_donor_selection_loss(predictions, labels)
        elif task_type == "urgency_assessment":
            loss = self.compute_urgency_assessment_loss(predictions, labels)
        elif task_type == "inventory_selection":
            loss = self.compute_inventory_selection_loss(predictions, labels)
        elif task_type == "transport_planning":
            loss = self.compute_transport_planning_loss(predictions, labels)
        elif task_type == "eligibility_analysis":
            loss = self.compute_eligibility_analysis_loss(predictions, labels)
        else:
            raise ValueError(f"Unknown task_type: {task_type}")

        # Apply task weight
        weighted_loss = loss * self.task_weights.get(task_type, 1.0)

        return weighted_loss

