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
        input_features = example.get("inputFeatures", {})

        if task_type == "donor_selection":
            # Extract from alert context
            alert = input_features.get("alert", {})
            features.extend([
                float(alert.get("unitsNeeded", 1)),
                float(alert.get("searchRadius", 10)),
            ])

        elif task_type == "urgency_assessment":
            features.extend([
                float(input_features.get("currentUnits", 0)),
                float(input_features.get("daysRemaining", 0)),
                float(input_features.get("dailyUsage", 0)),
            ])

        elif task_type == "inventory_selection":
            request = input_features.get("request", {})
            features.extend([
                float(request.get("unitsNeeded", 1)),
            ])

        elif task_type == "transport_planning":
            features.extend([
                float(input_features.get("distanceKm", 0)),
                float(input_features.get("units", 1)),
            ])

        elif task_type == "eligibility_analysis":
            donor = input_features.get("donor", {})
            last_donation = donor.get("lastDonation", 365)
            if isinstance(last_donation, (int, float)):
                last_donation_days = last_donation
            else:
                last_donation_days = 365
            features.extend([
                float(donor.get("age", 30)),
                float(donor.get("weight", 70)),
                float(donor.get("bmi", 22)),
                float(donor.get("hemoglobin", 14)),
                float(last_donation_days),
            ])

        # Add time features (common to all)
        now = datetime.now()
        features.extend([
            now.hour,
            now.weekday(),
            now.month,
        ])

        features_array = np.array(features, dtype=np.float32)
        
        # Pad to expected numerical_dim (64) if needed
        # This ensures compatibility with the model's numerical_encoder
        expected_dim = 64
        if len(features_array) < expected_dim:
            # Pad with zeros
            padding = np.zeros(expected_dim - len(features_array), dtype=np.float32)
            features_array = np.concatenate([features_array, padding])
        elif len(features_array) > expected_dim:
            # Truncate if somehow larger
            features_array = features_array[:expected_dim]
        
        return features_array

    def encode_categorical(
        self, example: Dict[str, Any], task_type: str
    ) -> Tuple[int, int, Optional[int]]:
        """Encode categorical features"""
        input_features = example.get("inputFeatures", {})
        
        # Extract blood type and urgency from appropriate location
        if task_type == "donor_selection":
            alert = input_features.get("alert", {})
            blood_type = alert.get("bloodType", "O+")
            urgency = alert.get("urgency", "MEDIUM")
        elif task_type == "urgency_assessment":
            blood_type = input_features.get("bloodType", "O+")
            urgency = "MEDIUM"  # Will be determined by model
        elif task_type == "inventory_selection":
            request = input_features.get("request", {})
            blood_type = request.get("bloodType", "O+")
            urgency = request.get("urgency", "MEDIUM")
        elif task_type == "transport_planning":
            blood_type = input_features.get("bloodType", "O+")
            urgency = input_features.get("urgency", "MEDIUM")
        else:
            blood_type = input_features.get("bloodType", "O+")
            urgency = input_features.get("urgency", "MEDIUM")
        
        transport_method = input_features.get("transportMethod")

        try:
            blood_type_idx = self.blood_type_encoder.transform([blood_type])[0]
        except:
            blood_type_idx = 1  # Default to O+
        
        try:
            urgency_idx = self.urgency_encoder.transform([urgency])[0]
        except:
            urgency_idx = 1  # Default to MEDIUM
        
        transport_idx = (
            self.transport_method_encoder.transform([transport_method])[0]
            if transport_method
            else None
        )

        return blood_type_idx, urgency_idx, transport_idx

    def extract_time_features(self, example: Dict[str, Any]) -> Dict[str, float]:
        """Extract time features"""
        input_features = example.get("inputFeatures", {})
        context = input_features.get("context", {})
        time_str = context.get("timeOfDay") or input_features.get("timeOfDay")
        
        if time_str:
            # Parse time string if provided
            try:
                # Handle ISO format with or without timezone
                if isinstance(time_str, str):
                    if 'T' in time_str:
                        dt = datetime.fromisoformat(time_str.replace('Z', '+00:00'))
                    else:
                        dt = datetime.fromisoformat(time_str)
                else:
                    dt = datetime.now()
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
        numerical_features_raw = self.extract_numerical_features(example, task_type)
        # Transform using fitted scaler (if fitted)
        if hasattr(self.numerical_scaler, 'mean_') and self.numerical_scaler.mean_ is not None:
            numerical_features = self.transform_numerical(numerical_features_raw)
        else:
            # If scaler not fitted yet, use raw features (will be normalized during fit)
            numerical_features = numerical_features_raw
        blood_type_idx, urgency_idx, transport_idx = self.encode_categorical(
            example, task_type
        )
        time_features = self.extract_time_features(example)

        # Handle candidate/source lists for selection tasks
        candidate_features = None
        source_features = None

        input_features = example.get("inputFeatures", {})
        
        if task_type == "donor_selection":
            candidates = input_features.get("candidates", [])
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
            ranked_units = input_features.get("rankedUnits", [])
            if ranked_units:
                source_features = []
                for unit in ranked_units:
                    scores = unit.get("scores", {})
                    unit_features = [
                        float(unit.get("distance", 0)),
                        float(unit.get("expiry", 30)),
                        float(unit.get("quantity", 0)),
                        float(scores.get("final", 0) if isinstance(scores, dict) else 0),
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

