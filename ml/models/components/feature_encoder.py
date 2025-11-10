"""Feature Encoder for structured inputs"""

import torch
import torch.nn as nn
import torch.nn.functional as F
from typing import Dict, List, Optional


class FeatureEncoder(nn.Module):
    """
    Encodes structured inputs (numerical + categorical features)
    - Numerical features: distances, scores, units, times, etc.
    - Categorical embeddings: blood types (8), urgency levels (4), transport methods (3)
    - Time encoding: hour, day of week, month features
    """

    def __init__(
        self,
        num_blood_types: int = 8,
        num_urgency_levels: int = 4,
        num_transport_methods: int = 3,
        embedding_dim: int = 32,
        numerical_dim: int = 64,
        time_encoding_dim: int = 16,
        hidden_dim: int = 128,
    ):
        super().__init__()

        # Categorical embeddings
        self.blood_type_embedding = nn.Embedding(num_blood_types, embedding_dim)
        self.urgency_embedding = nn.Embedding(num_urgency_levels, embedding_dim)
        self.transport_method_embedding = nn.Embedding(
            num_transport_methods, embedding_dim
        )

        # Time encoding (cyclical encoding for hour, day, month)
        self.time_encoder = nn.Sequential(
            nn.Linear(3, time_encoding_dim),  # hour, day_of_week, month
            nn.ReLU(),
            nn.Linear(time_encoding_dim, time_encoding_dim),
        )

        # Numerical feature processing
        self.numerical_encoder = nn.Sequential(
            nn.Linear(numerical_dim, hidden_dim),
            nn.ReLU(),
            nn.Dropout(0.1),
            nn.Linear(hidden_dim, hidden_dim),
        )

        # Combine all features
        total_embedding_dim = (
            embedding_dim * 3 + time_encoding_dim + hidden_dim
        )  # 3 categorical + time + numerical
        self.feature_fusion = nn.Sequential(
            nn.Linear(total_embedding_dim, hidden_dim),
            nn.ReLU(),
            nn.Dropout(0.1),
            nn.Linear(hidden_dim, hidden_dim),
        )

        self.output_dim = hidden_dim

    def encode_time(self, hour: torch.Tensor, day_of_week: torch.Tensor, month: torch.Tensor) -> torch.Tensor:
        """Encode time features with cyclical encoding"""
        # Cyclical encoding: sin/cos for periodic features
        hour_sin = torch.sin(2 * torch.pi * hour / 24)
        hour_cos = torch.cos(2 * torch.pi * hour / 24)
        day_sin = torch.sin(2 * torch.pi * day_of_week / 7)
        day_cos = torch.cos(2 * torch.pi * day_of_week / 7)
        month_sin = torch.sin(2 * torch.pi * month / 12)
        month_cos = torch.cos(2 * torch.pi * month / 12)

        # Stack and use first 3 features for the linear layer (which expects 3 inputs)
        time_features = torch.stack([hour_sin, hour_cos, day_sin], dim=-1)
        return self.time_encoder(time_features)

    def forward(
        self,
        numerical_features: torch.Tensor,
        blood_type_idx: torch.Tensor,
        urgency_idx: torch.Tensor,
        transport_method_idx: Optional[torch.Tensor] = None,
        time_features: Optional[Dict[str, torch.Tensor]] = None,
    ) -> torch.Tensor:
        """
        Args:
            numerical_features: [batch_size, num_numerical_features]
            blood_type_idx: [batch_size] - indices for blood type (0-7)
            urgency_idx: [batch_size] - indices for urgency (0-3)
            transport_method_idx: [batch_size] - optional transport method indices
            time_features: Dict with 'hour', 'day_of_week', 'month' tensors

        Returns:
            encoded_features: [batch_size, hidden_dim]
        """
        batch_size = numerical_features.size(0)

        # Embed categorical features
        blood_emb = self.blood_type_embedding(blood_type_idx)
        urgency_emb = self.urgency_embedding(urgency_idx)

        if transport_method_idx is not None:
            transport_emb = self.transport_method_embedding(transport_method_idx)
        else:
            transport_emb = torch.zeros(
                batch_size, self.transport_method_embedding.embedding_dim, device=numerical_features.device
            )

        # Encode time features
        if time_features is not None:
            time_emb = self.encode_time(
                time_features["hour"],
                time_features["day_of_week"],
                time_features["month"],
            )
        else:
            time_emb = torch.zeros(
                batch_size, self.time_encoder[0].out_features, device=numerical_features.device
            )

        # Encode numerical features
        numerical_emb = self.numerical_encoder(numerical_features)

        # Concatenate all features
        combined = torch.cat([blood_emb, urgency_emb, transport_emb, time_emb, numerical_emb], dim=-1)

        # Final fusion
        output = self.feature_fusion(combined)

        return output

