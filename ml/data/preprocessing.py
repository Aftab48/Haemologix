"""Data preprocessing for training examples"""

import numpy as np
import pandas as pd
from typing import Dict, List, Optional, Tuple, Any
from sklearn.preprocessing import StandardScaler, LabelEncoder
from datetime import datetime
import json


class DataPreprocessor:
    """
    Preprocesses training data from AgentDecision records
    - Feature extraction from AgentDecision database records
    - Normalization/scaling for numerical features
    - Categorical encoding (one-hot + embeddings)
    - Sequence padding for variable-length candidate lists
    - Train/validation/test split with temporal awareness
    """

    def __init__(self):
        # Scalers for numerical features
        self.numerical_scaler = StandardScaler()

        # Label encoders for categorical features
        self.blood_type_encoder = LabelEncoder()
        self.urgency_encoder = LabelEncoder()
        self.transport_method_encoder = LabelEncoder()

        # Blood type mapping (8 types)
        self.blood_types = ["O-", "O+", "A-", "A+", "B-", "B+", "AB-", "AB+"]
        self.urgency_levels = ["LOW", "MEDIUM", "HIGH", "CRITICAL"]
        self.transport_methods = ["ambulance", "courier", "scheduled"]

        # Fit encoders
        self.blood_type_encoder.fit(self.blood_types)
        self.urgency_encoder.fit(self.urgency_levels)
        self.transport_method_encoder.fit(self.transport_methods)

    def extract_numerical_features(
        self, example: Dict[str, Any], task_type: str
    ) -> np.ndarray:
        """Extract numerical features based on task type"""
        features = []

        if task_type == "donor_selection":
            # Extract from candidates and alert context
            alert = example.get("alert", {})
            features.extend([
                float(alert.get("unitsNeeded", 1)),
                float(alert.get("searchRadius", 10)),
            ])

        elif task_type == "urgency_assessment":
            features.extend([
                float(example.get("currentUnits", 0)),
                float(example.get("daysRemaining", 0)),
                float(example.get("dailyUsage", 0)),
            ])

        elif task_type == "inventory_selection":
            request = example.get("request", {})
            features.extend([
                float(request.get("unitsNeeded", 1)),
            ])

        elif task_type == "transport_planning":
            features.extend([
                float(example.get("distanceKm", 0)),
                float(example.get("units", 1)),
            ])

        elif task_type == "eligibility_analysis":
            donor = example.get("donor", {})
            features.extend([
                float(donor.get("age", 30)),
                float(donor.get("weight", 70)),
                float(donor.get("bmi", 22)),
                float(donor.get("hemoglobin", 14)),
                float(donor.get("lastDonationDays", 365) if donor.get("lastDonationDays") else 365),
            ])

        # Add time features (common to all)
        now = datetime.now()
        features.extend([
            now.hour,
            now.weekday(),
            now.month,
        ])

        return np.array(features, dtype=np.float32)

    def encode_categorical(
        self, example: Dict[str, Any], task_type: str
    ) -> Tuple[int, int, Optional[int]]:
        """Encode categorical features"""
        blood_type = example.get("bloodType", "O+")
        urgency = example.get("urgency", "MEDIUM")
        transport_method = example.get("transportMethod")

        blood_type_idx = self.blood_type_encoder.transform([blood_type])[0]
        urgency_idx = self.urgency_encoder.transform([urgency])[0]
        transport_idx = (
            self.transport_method_encoder.transform([transport_method])[0]
            if transport_method
            else None
        )

        return blood_type_idx, urgency_idx, transport_idx

    def extract_time_features(self, example: Dict[str, Any]) -> Dict[str, float]:
        """Extract time features"""
        time_str = example.get("timeOfDay")
        if time_str:
            # Parse time string if provided
            try:
                dt = datetime.fromisoformat(time_str)
            except:
                dt = datetime.now()
        else:
            dt = datetime.now()

        return {
            "hour": float(dt.hour),
            "day_of_week": float(dt.weekday()),
            "month": float(dt.month),
        }

    def pad_sequence(
        self, sequence: List[Dict], max_length: int, pad_value: Dict = None
    ) -> Tuple[List[Dict], int]:
        """Pad variable-length sequences"""
        actual_length = len(sequence)
        if pad_value is None:
            pad_value = {}

        if len(sequence) < max_length:
            sequence = sequence + [pad_value] * (max_length - len(sequence))
        elif len(sequence) > max_length:
            sequence = sequence[:max_length]

        return sequence, min(actual_length, max_length)

    def preprocess_example(
        self, example: Dict[str, Any], task_type: str
    ) -> Dict[str, Any]:
        """Preprocess a single training example"""
        # Extract features
        numerical_features = self.extract_numerical_features(example, task_type)
        blood_type_idx, urgency_idx, transport_idx = self.encode_categorical(
            example, task_type
        )
        time_features = self.extract_time_features(example)

        # Handle candidate/source lists for selection tasks
        candidate_features = None
        source_features = None

        if task_type == "donor_selection":
            candidates = example.get("candidates", [])
            if candidates:
                # Extract features for each candidate
                candidate_features = []
                for candidate in candidates:
                    cand_features = [
                        float(candidate.get("distance", 0)),
                        float(candidate.get("eta", 0)),
                        float(candidate.get("score", 0)),
                        float(candidate.get("reliability", 0.5)),
                        float(candidate.get("health", 0)),
                    ]
                    candidate_features.append(cand_features)

        elif task_type == "inventory_selection":
            ranked_units = example.get("rankedUnits", [])
            if ranked_units:
                source_features = []
                for unit in ranked_units:
                    unit_features = [
                        float(unit.get("distance", 0)),
                        float(unit.get("expiryDays", 30)),
                        float(unit.get("quantity", 0)),
                        float(unit.get("scores", {}).get("final", 0)),
                    ]
                    source_features.append(unit_features)

        return {
            "numerical_features": numerical_features,
            "blood_type_idx": blood_type_idx,
            "urgency_idx": urgency_idx,
            "transport_idx": transport_idx,
            "time_features": time_features,
            "candidate_features": candidate_features,
            "source_features": source_features,
            "label": example.get("outputLabel", {}),
        }

    def split_temporal(
        self,
        examples: List[Dict[str, Any]],
        train_ratio: float = 0.7,
        val_ratio: float = 0.15,
    ) -> Tuple[List[Dict], List[Dict], List[Dict]]:
        """
        Split data temporally (by creation date)
        """
        # Sort by creation date
        sorted_examples = sorted(
            examples, key=lambda x: x.get("createdAt", datetime.now())
        )

        n = len(sorted_examples)
        train_end = int(n * train_ratio)
        val_end = train_end + int(n * val_ratio)

        train = sorted_examples[:train_end]
        val = sorted_examples[train_end:val_end]
        test = sorted_examples[val_end:]

        return train, val, test

    def fit_scalers(self, examples: List[Dict[str, Any]], task_type: str):
        """Fit scalers on training data"""
        numerical_features_list = [
            self.extract_numerical_features(ex, task_type) for ex in examples
        ]
        numerical_features_array = np.array(numerical_features_list)
        self.numerical_scaler.fit(numerical_features_array)

    def transform_numerical(self, features: np.ndarray) -> np.ndarray:
        """Transform numerical features using fitted scaler"""
        return self.numerical_scaler.transform(features.reshape(1, -1))[0]

