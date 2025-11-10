"""PyTorch Dataset for Haemologix training data"""

import torch
from torch.utils.data import Dataset
from typing import Dict, List, Any, Optional
import numpy as np

from .preprocessing import DataPreprocessor


class HaemologixDataset(Dataset):
    """
    PyTorch Dataset for loading training examples
    - Supports all 5 task types with dynamic batching
    - Handles variable-length candidate lists
    - Includes outcome labels for supervised learning
    """

    def __init__(
        self,
        examples: List[Dict[str, Any]],
        task_type: str,
        preprocessor: DataPreprocessor,
        max_candidates: int = 50,
        max_sources: int = 20,
    ):
        """
        Args:
            examples: List of training examples
            task_type: Type of task ("donor_selection", "urgency_assessment", etc.)
            preprocessor: DataPreprocessor instance
            max_candidates: Maximum number of candidates to pad to
            max_sources: Maximum number of sources to pad to
        """
        self.examples = examples
        self.task_type = task_type
        self.preprocessor = preprocessor
        self.max_candidates = max_candidates
        self.max_sources = max_sources

    def __len__(self) -> int:
        return len(self.examples)

    def __getitem__(self, idx: int) -> Dict[str, torch.Tensor]:
        """Get a single training example"""
        example = self.examples[idx]

        # Preprocess
        processed = self.preprocessor.preprocess_example(example, self.task_type)

        # Convert to tensors
        numerical_features = torch.tensor(
            processed["numerical_features"], dtype=torch.float32
        )

        blood_type_idx = torch.tensor(processed["blood_type_idx"], dtype=torch.long)
        urgency_idx = torch.tensor(processed["urgency_idx"], dtype=torch.long)

        transport_idx = (
            torch.tensor(processed["transport_idx"], dtype=torch.long)
            if processed["transport_idx"] is not None
            else None
        )

        time_features = {
            k: torch.tensor(v, dtype=torch.float32)
            for k, v in processed["time_features"].items()
        }

        # Handle candidate/source features
        candidate_features = None
        source_features = None

        if self.task_type == "donor_selection" and processed["candidate_features"]:
            candidates = processed["candidate_features"]
            # Pad to max_candidates
            if len(candidates) < self.max_candidates:
                candidates = candidates + [[0.0] * 5] * (
                    self.max_candidates - len(candidates)
                )
            elif len(candidates) > self.max_candidates:
                candidates = candidates[: self.max_candidates]

            candidate_features = torch.tensor(candidates, dtype=torch.float32)

        elif self.task_type == "inventory_selection" and processed["source_features"]:
            sources = processed["source_features"]
            # Pad to max_sources
            if len(sources) < self.max_sources:
                sources = sources + [[0.0] * 4] * (self.max_sources - len(sources))
            elif len(sources) > self.max_sources:
                sources = sources[: self.max_sources]

            source_features = torch.tensor(sources, dtype=torch.float32)

        # Get label
        label = processed["label"]

        # Convert label to tensor based on task type
        if self.task_type == "donor_selection":
            # Label is selected candidate index
            label_tensor = torch.tensor(
                label.get("selected_index", 0), dtype=torch.long
            )
        elif self.task_type == "urgency_assessment":
            # Label is urgency class and priority score
            label_tensor = {
                "urgency_class": torch.tensor(
                    label.get("urgency_class", 1), dtype=torch.long
                ),
                "priority_score": torch.tensor(
                    label.get("priority_score", 0.5), dtype=torch.float32
                ),
            }
        elif self.task_type == "inventory_selection":
            # Label is selected source index
            label_tensor = torch.tensor(
                label.get("selected_index", 0), dtype=torch.long
            )
        elif self.task_type == "transport_planning":
            # Label is method and ETA
            label_tensor = {
                "method": torch.tensor(label.get("method", 1), dtype=torch.long),
                "eta_minutes": torch.tensor(
                    label.get("eta_minutes", 60), dtype=torch.float32
                ),
            }
        elif self.task_type == "eligibility_analysis":
            # Label is eligibility and failed criteria
            label_tensor = {
                "eligible": torch.tensor(
                    label.get("eligible", 0), dtype=torch.float32
                ),
                "failed_criteria": torch.tensor(
                    label.get("failed_criteria", [0] * 6), dtype=torch.float32
                ),
            }
        else:
            label_tensor = torch.tensor(0)

        return {
            "numerical_features": numerical_features,
            "blood_type_idx": blood_type_idx,
            "urgency_idx": urgency_idx,
            "transport_idx": transport_idx,
            "time_features": time_features,
            "candidate_features": candidate_features,
            "source_features": source_features,
            "label": label_tensor,
        }

