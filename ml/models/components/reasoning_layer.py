"""Multi-Factor Reasoning Layer with attention mechanism"""

import torch
import torch.nn as nn
import torch.nn.functional as F
from typing import Optional


class MultiFactorReasoningLayer(nn.Module):
    """
    Attention-based reasoning for multi-factor decisions
    - Separate reasoning paths for: urgency, reliability, distance, health
    - Factor fusion layer to combine reasoning
    """

    def __init__(
        self,
        input_dim: int = 128,
        hidden_dim: int = 256,
        num_factors: int = 4,  # urgency, reliability, distance, health
        num_heads: int = 8,
        dropout: float = 0.1,
    ):
        super().__init__()

        self.num_factors = num_factors
        self.hidden_dim = hidden_dim

        # Separate reasoning paths for each factor
        self.factor_projections = nn.ModuleList(
            [
                nn.Sequential(
                    nn.Linear(input_dim, hidden_dim),
                    nn.ReLU(),
                    nn.Dropout(dropout),
                    nn.Linear(hidden_dim, hidden_dim),
                )
                for _ in range(num_factors)
            ]
        )

        # Multi-head attention for factor interaction
        self.attention = nn.MultiheadAttention(
            embed_dim=hidden_dim, num_heads=num_heads, dropout=dropout, batch_first=True
        )

        # Factor fusion layer
        self.fusion = nn.Sequential(
            nn.Linear(hidden_dim * num_factors, hidden_dim * 2),
            nn.ReLU(),
            nn.Dropout(dropout),
            nn.Linear(hidden_dim * 2, hidden_dim),
        )

        # Layer normalization
        self.layer_norm = nn.LayerNorm(hidden_dim)

    def forward(self, encoded_features: torch.Tensor) -> torch.Tensor:
        """
        Args:
            encoded_features: [batch_size, input_dim]

        Returns:
            reasoned_features: [batch_size, hidden_dim]
        """
        batch_size = encoded_features.size(0)

        # Process each factor separately
        factor_outputs = []
        for projection in self.factor_projections:
            factor_output = projection(encoded_features)
            factor_outputs.append(factor_output)

        # Stack factors: [batch_size, num_factors, hidden_dim]
        factor_tensor = torch.stack(factor_outputs, dim=1)

        # Apply attention to allow factors to interact
        attended_factors, attention_weights = self.attention(
            factor_tensor, factor_tensor, factor_tensor
        )

        # Flatten factors: [batch_size, num_factors * hidden_dim]
        flattened = attended_factors.view(batch_size, -1)

        # Fusion
        fused = self.fusion(flattened)

        # Layer normalization
        output = self.layer_norm(fused)

        return output, attention_weights

