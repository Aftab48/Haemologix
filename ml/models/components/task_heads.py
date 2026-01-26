"""Task-specific output heads for different decision types"""

import torch
import torch.nn as nn
import torch.nn.functional as F
from typing import Dict, Optional, Tuple


class DonorSelectionHead(nn.Module):
    """Candidate ranking with cross-attention"""

    def __init__(self, input_dim: int = 256, hidden_dim: int = 128, max_candidates: int = 50):
        super().__init__()
        self.max_candidates = max_candidates

        # Cross-attention for candidate comparison
        # Candidate features: [distance, eta, score, reliability, health] = 5 features
        self.candidate_encoder = nn.Sequential(
            nn.Linear(5, hidden_dim),  # 5 candidate features
            nn.ReLU(),
            nn.Linear(hidden_dim, hidden_dim),
        )
        
        # Context encoder for reasoned features (input_dim = 256)
        self.context_encoder = nn.Sequential(
            nn.Linear(input_dim, hidden_dim),
            nn.ReLU(),
            nn.Linear(hidden_dim, hidden_dim),
        )

        self.attention = nn.MultiheadAttention(
            embed_dim=hidden_dim, num_heads=4, batch_first=True
        )

        # Ranking head - outputs logits for each candidate
        # Input: hidden_dim (from attention) + 5 (raw candidate features) = hidden_dim + 5
        self.ranking_head = nn.Sequential(
            nn.Linear(hidden_dim + 5, hidden_dim // 2),  # Include raw candidate features
            nn.ReLU(),
            nn.Dropout(0.2),  # Increased dropout for regularization
            nn.Linear(hidden_dim // 2, 1),  # Logit score for each candidate
        )

    def forward(
        self, reasoned_features: torch.Tensor, candidate_features: torch.Tensor
    ) -> Dict[str, torch.Tensor]:
        """
        Args:
            reasoned_features: [batch_size, input_dim] - context features
            candidate_features: [batch_size, num_candidates, input_dim] - candidate features

        Returns:
            Dict with 'scores' and 'selected_idx'
        """
        batch_size, num_candidates, _ = candidate_features.size()

        # Encode candidates
        encoded_candidates = self.candidate_encoder(candidate_features)

        # Expand context for attention
        context = reasoned_features.unsqueeze(1).expand(-1, num_candidates, -1)
        context_encoded = self.context_encoder(context)

        # Cross-attention: candidates attend to context
        attended, _ = self.attention(encoded_candidates, context_encoded, context_encoded)

        # Combine attended features with raw candidate features for better differentiation
        # attended: [batch_size, num_candidates, hidden_dim]
        # candidate_features: [batch_size, num_candidates, 5]
        attended_with_raw = torch.cat([attended, candidate_features], dim=-1)  # [batch_size, num_candidates, hidden_dim + 5]

        # Compute ranking scores
        scores = self.ranking_head(attended_with_raw).squeeze(-1)  # [batch_size, num_candidates]

        # Mask out padded candidates (those with all-zero features)
        # A candidate is padded if its distance, eta, score, reliability, and health are all 0
        candidate_mask = (candidate_features.abs().sum(dim=-1) > 1e-6)  # [batch_size, num_candidates]
        
        # Apply mask: set scores of padded candidates to very negative value
        scores_masked = scores.masked_fill(~candidate_mask, float('-inf'))

        # Get selected candidate index (only from real candidates)
        selected_idx = torch.argmax(scores_masked, dim=-1)

        return {
            "scores": scores_masked,
            "selected_idx": selected_idx,
            "probabilities": F.softmax(scores_masked, dim=-1),
        }


class UrgencyAssessmentHead(nn.Module):
    """Classification (low/medium/high/critical) + priority score"""

    def __init__(self, input_dim: int = 256, hidden_dim: int = 128, num_classes: int = 4):
        super().__init__()
        self.num_classes = num_classes

        self.classifier = nn.Sequential(
            nn.Linear(input_dim, hidden_dim),
            nn.ReLU(),
            nn.Dropout(0.1),
            nn.Linear(hidden_dim, num_classes),
        )

        self.priority_regressor = nn.Sequential(
            nn.Linear(input_dim, hidden_dim),
            nn.ReLU(),
            nn.Linear(hidden_dim, 1),
            nn.Sigmoid(),  # Priority score 0-1
        )

    def forward(self, reasoned_features: torch.Tensor) -> Dict[str, torch.Tensor]:
        """
        Args:
            reasoned_features: [batch_size, input_dim]

        Returns:
            Dict with 'urgency_class' and 'priority_score'
        """
        # Classify urgency level
        logits = self.classifier(reasoned_features)
        urgency_probs = F.softmax(logits, dim=-1)
        urgency_class = torch.argmax(urgency_probs, dim=-1)

        # Predict priority score
        priority_score = self.priority_regressor(reasoned_features).squeeze(-1)

        return {
            "urgency_class": urgency_class,
            "urgency_probs": urgency_probs,
            "priority_score": priority_score,
        }


class InventorySelectionHead(nn.Module):
    """Source ranking with expiry/distance optimization"""

    def __init__(self, input_dim: int = 256, hidden_dim: int = 128, max_sources: int = 20):
        super().__init__()
        self.max_sources = max_sources

        # Source features: [distance, expiry, quantity, final_score] = 4 features
        # Multi-factor scoring
        self.proximity_scorer = nn.Sequential(
            nn.Linear(4, hidden_dim // 2),  # 4 source features
            nn.ReLU(),
            nn.Linear(hidden_dim // 2, 1),
        )

        self.expiry_scorer = nn.Sequential(
            nn.Linear(4, hidden_dim // 2),  # 4 source features
            nn.ReLU(),
            nn.Linear(hidden_dim // 2, 1),
        )

        self.quantity_scorer = nn.Sequential(
            nn.Linear(4, hidden_dim // 2),  # 4 source features
            nn.ReLU(),
            nn.Linear(hidden_dim // 2, 1),
        )

        # Final fusion
        self.fusion = nn.Sequential(
            nn.Linear(3, hidden_dim),
            nn.ReLU(),
            nn.Linear(hidden_dim, 1),
        )

    def forward(
        self, reasoned_features: torch.Tensor, source_features: torch.Tensor
    ) -> Dict[str, torch.Tensor]:
        """
        Args:
            reasoned_features: [batch_size, input_dim]
            source_features: [batch_size, num_sources, input_dim]

        Returns:
            Dict with 'scores' and 'selected_idx'
        """
        batch_size, num_sources, _ = source_features.size()

        # Encode source features (4 features) and context (input_dim features) separately
        # Project context to match source feature dimension for combination
        context = reasoned_features.unsqueeze(1).expand(-1, num_sources, -1)
        # Use source features directly (they're already 4D)
        combined = source_features  # [batch, num_sources, 4]

        # Score each factor
        proximity_scores = self.proximity_scorer(combined).squeeze(-1)
        expiry_scores = self.expiry_scorer(combined).squeeze(-1)
        quantity_scores = self.quantity_scorer(combined).squeeze(-1)

        # Combine scores
        factor_scores = torch.stack(
            [proximity_scores, expiry_scores, quantity_scores], dim=-1
        )  # [batch_size, num_sources, 3]
        final_scores = self.fusion(factor_scores).squeeze(-1)  # [batch_size, num_sources]

        selected_idx = torch.argmax(final_scores, dim=-1)

        return {
            "scores": final_scores,
            "selected_idx": selected_idx,
            "factor_scores": {
                "proximity": proximity_scores,
                "expiry": expiry_scores,
                "quantity": quantity_scores,
            },
        }


class TransportPlanningHead(nn.Module):
    """Method selection + ETA prediction"""

    def __init__(self, input_dim: int = 256, hidden_dim: int = 128, num_methods: int = 3):
        super().__init__()
        self.num_methods = num_methods

        # Method classifier
        self.method_classifier = nn.Sequential(
            nn.Linear(input_dim, hidden_dim),
            nn.ReLU(),
            nn.Dropout(0.1),
            nn.Linear(hidden_dim, num_methods),
        )

        # ETA regressor (in minutes)
        self.eta_regressor = nn.Sequential(
            nn.Linear(input_dim, hidden_dim),
            nn.ReLU(),
            nn.Linear(hidden_dim, 1),
            nn.ReLU(),  # ETA should be positive
        )

        # Cold chain compliance predictor
        self.cold_chain_predictor = nn.Sequential(
            nn.Linear(input_dim, hidden_dim // 2),
            nn.ReLU(),
            nn.Linear(hidden_dim // 2, 1),
            nn.Sigmoid(),
        )

    def forward(self, reasoned_features: torch.Tensor) -> Dict[str, torch.Tensor]:
        """
        Args:
            reasoned_features: [batch_size, input_dim]

        Returns:
            Dict with 'method', 'eta_minutes', and 'cold_chain_compliant'
        """
        # Classify transport method
        method_logits = self.method_classifier(reasoned_features)
        method_probs = F.softmax(method_logits, dim=-1)
        method = torch.argmax(method_probs, dim=-1)

        # Predict ETA
        eta_minutes = self.eta_regressor(reasoned_features).squeeze(-1)

        # Predict cold chain compliance
        cold_chain_compliant = (self.cold_chain_predictor(reasoned_features).squeeze(-1) > 0.5).float()

        return {
            "method": method,
            "method_probs": method_probs,
            "eta_minutes": eta_minutes,
            "cold_chain_compliant": cold_chain_compliant,
        }


class EligibilityAnalysisHead(nn.Module):
    """Binary classification + edge case detection"""

    def __init__(self, input_dim: int = 256, hidden_dim: int = 128):
        super().__init__()

        # Eligibility binary classifier
        self.eligibility_classifier = nn.Sequential(
            nn.Linear(input_dim, hidden_dim),
            nn.ReLU(),
            nn.Dropout(0.1),
            nn.Linear(hidden_dim, 1),
            nn.Sigmoid(),
        )

        # Edge case detector
        self.edge_case_detector = nn.Sequential(
            nn.Linear(input_dim, hidden_dim),
            nn.ReLU(),
            nn.Linear(hidden_dim, 1),
            nn.Sigmoid(),
        )

        # Failed criteria predictor (multi-label)
        self.criteria_predictor = nn.Sequential(
            nn.Linear(input_dim, hidden_dim),
            nn.ReLU(),
            nn.Linear(hidden_dim, 6),  # 6 common criteria
            nn.Sigmoid(),
        )

    def forward(self, reasoned_features: torch.Tensor) -> Dict[str, torch.Tensor]:
        """
        Args:
            reasoned_features: [batch_size, input_dim]

        Returns:
            Dict with 'eligible', 'edge_case_prob', and 'failed_criteria'
        """
        # Predict eligibility
        eligible_prob = self.eligibility_classifier(reasoned_features).squeeze(-1)
        eligible = (eligible_prob > 0.5).float()

        # Detect edge cases
        edge_case_prob = self.edge_case_detector(reasoned_features).squeeze(-1)

        # Predict failed criteria
        failed_criteria_probs = self.criteria_predictor(reasoned_features)

        return {
            "eligible": eligible,
            "eligible_prob": eligible_prob,
            "edge_case_prob": edge_case_prob,
            "failed_criteria_probs": failed_criteria_probs,
        }


class ConfidenceEstimator(nn.Module):
    """Predicts confidence scores for all decisions"""

    def __init__(self, input_dim: int = 256, hidden_dim: int = 64):
        super().__init__()

        self.confidence_predictor = nn.Sequential(
            nn.Linear(input_dim, hidden_dim),
            nn.ReLU(),
            nn.Dropout(0.1),
            nn.Linear(hidden_dim, 1),
            nn.Sigmoid(),  # Confidence 0-1
        )

    def forward(self, reasoned_features: torch.Tensor) -> torch.Tensor:
        """
        Args:
            reasoned_features: [batch_size, input_dim]

        Returns:
            confidence: [batch_size] - confidence scores
        """
        return self.confidence_predictor(reasoned_features).squeeze(-1)

