"""Main Haemologix Decision Network Model"""

import torch
import torch.nn as nn
from typing import Dict, Optional, Literal

from .components.feature_encoder import FeatureEncoder
from .components.reasoning_layer import MultiFactorReasoningLayer
from .components.task_heads import (
    DonorSelectionHead,
    UrgencyAssessmentHead,
    InventorySelectionHead,
    TransportPlanningHead,
    EligibilityAnalysisHead,
    ConfidenceEstimator,
)


class HaemologixDecisionNetwork(nn.Module):
    """
    Custom neural network for Haemologix agent decisions.
    Supports 5 task types: donor selection, urgency assessment, inventory selection,
    transport planning, and eligibility analysis.
    """

    def __init__(
        self,
        num_blood_types: int = 8,
        num_urgency_levels: int = 4,
        num_transport_methods: int = 3,
        embedding_dim: int = 32,
        numerical_dim: int = 64,
        hidden_dim: int = 256,
        num_factors: int = 4,
        dropout: float = 0.1,
    ):
        super().__init__()

        # Feature encoder
        self.feature_encoder = FeatureEncoder(
            num_blood_types=num_blood_types,
            num_urgency_levels=num_urgency_levels,
            num_transport_methods=num_transport_methods,
            embedding_dim=embedding_dim,
            numerical_dim=numerical_dim,
            hidden_dim=hidden_dim,
        )

        # Multi-factor reasoning layer
        self.reasoning_layer = MultiFactorReasoningLayer(
            input_dim=hidden_dim,
            hidden_dim=hidden_dim,
            num_factors=num_factors,
            dropout=dropout,
        )

        # Task-specific heads
        self.donor_selection_head = DonorSelectionHead(
            input_dim=hidden_dim, hidden_dim=hidden_dim // 2
        )
        self.urgency_assessment_head = UrgencyAssessmentHead(
            input_dim=hidden_dim, hidden_dim=hidden_dim // 2
        )
        self.inventory_selection_head = InventorySelectionHead(
            input_dim=hidden_dim, hidden_dim=hidden_dim // 2
        )
        self.transport_planning_head = TransportPlanningHead(
            input_dim=hidden_dim, hidden_dim=hidden_dim // 2
        )
        self.eligibility_analysis_head = EligibilityAnalysisHead(
            input_dim=hidden_dim, hidden_dim=hidden_dim // 2
        )

        # Confidence estimator
        self.confidence_estimator = ConfidenceEstimator(
            input_dim=hidden_dim, hidden_dim=hidden_dim // 4
        )

    def forward(
        self,
        task_type: Literal[
            "donor_selection",
            "urgency_assessment",
            "inventory_selection",
            "transport_planning",
            "eligibility_analysis",
        ],
        numerical_features: torch.Tensor,
        blood_type_idx: torch.Tensor,
        urgency_idx: torch.Tensor,
        transport_method_idx: Optional[torch.Tensor] = None,
        time_features: Optional[Dict[str, torch.Tensor]] = None,
        candidate_features: Optional[torch.Tensor] = None,  # For donor/inventory selection
        source_features: Optional[torch.Tensor] = None,  # For inventory selection
    ) -> Dict[str, torch.Tensor]:
        """
        Forward pass for different task types.

        Args:
            task_type: Type of task to perform
            numerical_features: [batch_size, num_numerical_features]
            blood_type_idx: [batch_size] - blood type indices
            urgency_idx: [batch_size] - urgency level indices
            transport_method_idx: [batch_size] - optional transport method indices
            time_features: Optional dict with time features
            candidate_features: [batch_size, num_candidates, input_dim] - for donor selection
            source_features: [batch_size, num_sources, input_dim] - for inventory selection

        Returns:
            Dict with task-specific outputs and confidence
        """
        # Encode features
        encoded = self.feature_encoder(
            numerical_features=numerical_features,
            blood_type_idx=blood_type_idx,
            urgency_idx=urgency_idx,
            transport_method_idx=transport_method_idx,
            time_features=time_features,
        )

        # Multi-factor reasoning
        reasoned, attention_weights = self.reasoning_layer(encoded)

        # Task-specific head
        if task_type == "donor_selection":
            if candidate_features is None:
                raise ValueError("candidate_features required for donor_selection")
            task_output = self.donor_selection_head(reasoned, candidate_features)

        elif task_type == "urgency_assessment":
            task_output = self.urgency_assessment_head(reasoned)

        elif task_type == "inventory_selection":
            if source_features is None:
                raise ValueError("source_features required for inventory_selection")
            task_output = self.inventory_selection_head(reasoned, source_features)

        elif task_type == "transport_planning":
            task_output = self.transport_planning_head(reasoned)

        elif task_type == "eligibility_analysis":
            task_output = self.eligibility_analysis_head(reasoned)

        else:
            raise ValueError(f"Unknown task_type: {task_type}")

        # Estimate confidence
        confidence = self.confidence_estimator(reasoned)

        # Combine outputs
        output = {
            **task_output,
            "confidence": confidence,
            "attention_weights": attention_weights,
        }

        return output

    def generate_reasoning(
        self, attention_weights: torch.Tensor, task_type: str
    ) -> str:
        """
        Generate human-readable reasoning from attention weights.
        This is a simplified version - in production, you might use more sophisticated methods.
        """
        # Get factor names
        factor_names = ["urgency", "reliability", "distance", "health"]

        # Get top attended factors
        factor_attention = attention_weights.mean(dim=1).mean(dim=0)  # Average over heads and batch
        top_factors = torch.topk(factor_attention, k=2)

        reasoning_parts = []
        for idx in top_factors.indices:
            factor_name = factor_names[idx.item()]
            weight = factor_attention[idx].item()
            reasoning_parts.append(f"{factor_name} (weight: {weight:.2f})")

        return f"Decision based on: {', '.join(reasoning_parts)}"

