#!/usr/bin/env python3
"""Model evaluation on test set"""

import sys
import torch
from pathlib import Path
from torch.utils.data import DataLoader

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from models.haemologix_decision_network import HaemologixDecisionNetwork
from data.dataset import HaemologixDataset
from data.preprocessing import DataPreprocessor
from utils.metrics import compute_metrics

def evaluate_model(model_path: str, test_loader: DataLoader, task_type: str, device: str = "cuda"):
    """Evaluate model on test set"""
    # Load model
    checkpoint = torch.load(model_path, map_location=device)
    config = checkpoint.get("config", {})
    
    model = HaemologixDecisionNetwork(**config)
    model.load_state_dict(checkpoint["model_state_dict"])
    model.to(device)
    model.eval()
    
    all_metrics = []
    
    with torch.no_grad():
        for batch in test_loader:
            # Move to device
            batch = {k: v.to(device) if isinstance(v, torch.Tensor) else v for k, v in batch.items()}
            
            # Predict
            predictions = model(
                task_type=task_type,
                numerical_features=batch["numerical_features"],
                blood_type_idx=batch["blood_type_idx"],
                urgency_idx=batch["urgency_idx"],
                transport_method_idx=batch.get("transport_idx"),
                time_features=batch["time_features"],
                candidate_features=batch.get("candidate_features"),
                source_features=batch.get("source_features"),
            )
            
            # Compute metrics
            metrics = compute_metrics(predictions, batch["label"], task_type)
            all_metrics.append(metrics)
    
    # Aggregate metrics
    avg_metrics = {}
    for key in all_metrics[0].keys():
        avg_metrics[key] = sum(m[key] for m in all_metrics) / len(all_metrics)
    
    print("Evaluation Metrics:")
    for key, value in avg_metrics.items():
        print(f"  {key}: {value:.4f}")
    
    return avg_metrics

if __name__ == "__main__":
    import argparse
    
    parser = argparse.ArgumentParser(description="Evaluate model on test set")
    parser.add_argument("--model-path", required=True, help="Path to model checkpoint")
    parser.add_argument("--task-type", required=True, help="Task type")
    parser.add_argument("--test-data", required=True, help="Path to test data")
    
    args = parser.parse_args()
    
    # Load test data (placeholder)
    # In production, load from database or file
    test_examples = []
    
    if len(test_examples) == 0:
        print("No test examples found.")
        sys.exit(1)
    
    preprocessor = DataPreprocessor()
    test_dataset = HaemologixDataset(test_examples, args.task_type, preprocessor)
    test_loader = DataLoader(test_dataset, batch_size=32, shuffle=False)
    
    evaluate_model(args.model_path, test_loader, args.task_type)

