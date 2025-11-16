#!/usr/bin/env python3
"""Inspect model predictions to understand what it's learning"""

import sys
from pathlib import Path
import torch
import yaml
import json
from torch.utils.data import DataLoader

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from models.haemologix_decision_network import HaemologixDecisionNetwork
from data.dataset import HaemologixDataset
from data.preprocessing import DataPreprocessor
from data.loaders import load_training_examples_from_json


def load_model(checkpoint_path: str, device: str = "cpu"):
    """Load model from checkpoint"""
    checkpoint = torch.load(checkpoint_path, map_location=device)
    
    # Load config to get model architecture
    config_dir = Path(__file__).parent.parent / "config"
    with open(config_dir / "model_config.yaml", "r") as f:
        model_config = yaml.safe_load(f)
    
    # Create model
    model_config_data = model_config.get("model", {})
    model = HaemologixDecisionNetwork(
        num_blood_types=model_config_data.get("num_blood_types", 8),
        num_urgency_levels=model_config_data.get("num_urgency_levels", 4),
        num_transport_methods=model_config_data.get("num_transport_methods", 3),
        embedding_dim=model_config_data.get("embedding_dim", 32),
        numerical_dim=model_config_data.get("numerical_dim", 64),
        hidden_dim=model_config_data.get("hidden_dim", 256),
        num_factors=model_config_data.get("num_factors", 4),
        dropout=model_config_data.get("dropout", 0.1),
    )
    
    # Load weights
    model.load_state_dict(checkpoint["model_state_dict"])
    model.to(device)
    model.eval()
    
    return model


def inspect_predictions(model, dataset, examples, task_type: str, device: str = "cpu", num_samples: int = 5):
    """Inspect individual predictions"""
    loader = DataLoader(dataset, batch_size=1, shuffle=False)
    
    print("\n" + "=" * 80)
    print(f"Inspecting {min(num_samples, len(examples))} predictions")
    print("=" * 80)
    
    with torch.no_grad():
        for idx, (batch, example) in enumerate(zip(loader, examples[:num_samples])):
            # Move to device
            batch = {k: v.to(device) if isinstance(v, torch.Tensor) else v 
                    for k, v in batch.items()}
            if isinstance(batch["time_features"], dict):
                batch["time_features"] = {
                    k: v.to(device) if isinstance(v, torch.Tensor) else v
                    for k, v in batch["time_features"].items()
                }
            
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
            
            # Get ground truth
            label = batch["label"].item() if isinstance(batch["label"], torch.Tensor) else batch["label"]
            predicted_idx = predictions["selected_idx"].item()
            
            # Get scores for all candidates
            scores = predictions["scores"].squeeze().cpu().numpy()
            probabilities = predictions["probabilities"].squeeze().cpu().numpy()
            
            # Get top 3 predictions
            top_3_indices = torch.topk(predictions["scores"].squeeze(), k=min(3, len(scores))).indices.cpu().numpy()
            
            print(f"\n--- Example {idx + 1} ---")
            print(f"Ground Truth: Selected candidate index {label}")
            print(f"Model Prediction: Candidate index {predicted_idx}")
            print(f"Correct: {'YES' if predicted_idx == label else 'NO'}")
            
            # Show input features
            input_features = example.get("inputFeatures", {})
            alert = input_features.get("alert", {})
            print(f"\nInput Context:")
            print(f"  Blood Type: {alert.get('bloodType', 'N/A')}")
            print(f"  Urgency: {alert.get('urgency', 'N/A')}")
            print(f"  Units Needed: {alert.get('unitsNeeded', 'N/A')}")
            
            # Show candidates info
            candidates = input_features.get("candidates", [])
            print(f"\nCandidates ({len(candidates)} total):")
            print(f"  Top 3 Model Predictions:")
            for rank, cand_idx in enumerate(top_3_indices, 1):
                if cand_idx < len(candidates):
                    cand = candidates[cand_idx]
                    is_correct = cand_idx == label
                    marker = " <-- CORRECT" if is_correct else ""
                    print(f"    {rank}. Candidate {cand_idx}: score={scores[cand_idx]:.4f}, prob={probabilities[cand_idx]:.4f}{marker}")
                    print(f"       Distance: {cand.get('distance', 'N/A')} km, ETA: {cand.get('eta', 'N/A')} min")
            
            print(f"\n  All Candidate Scores (top 5):")
            top_5_scores = sorted(enumerate(scores), key=lambda x: x[1], reverse=True)[:5]
            for cand_idx, score in top_5_scores:
                is_correct = cand_idx == label
                marker = " <-- CORRECT" if is_correct else ""
                print(f"    Candidate {cand_idx}: {score:.4f} (prob: {probabilities[cand_idx]:.4f}){marker}")


def main():
    import argparse
    
    parser = argparse.ArgumentParser(description="Inspect model predictions")
    parser.add_argument("--checkpoint", default="ml/checkpoints/best_model.pt", help="Path to model checkpoint")
    parser.add_argument("--data", default="ml/data/donor_selection_val.json", help="Path to evaluation data")
    parser.add_argument("--task-type", default="donor_selection", help="Task type")
    parser.add_argument("--device", default="cpu", help="Device to use (cpu/cuda)")
    parser.add_argument("--num-samples", type=int, default=5, help="Number of samples to inspect")
    
    args = parser.parse_args()
    
    device = args.device if torch.cuda.is_available() and args.device == "cuda" else "cpu"
    
    print("=" * 80)
    print("Model Prediction Inspection")
    print("=" * 80)
    print(f"Checkpoint: {args.checkpoint}")
    print(f"Data: {args.data}")
    print(f"Task Type: {args.task_type}")
    print(f"Device: {device}")
    
    # Load model
    print("\nLoading model...")
    model = load_model(args.checkpoint, device)
    print("[OK] Model loaded")
    
    # Load data
    print("\nLoading data...")
    examples = load_training_examples_from_json(args.data, args.task_type)
    print(f"[OK] Loaded {len(examples)} examples")
    
    # Preprocess
    preprocessor = DataPreprocessor()
    preprocessor.fit_scalers(examples, args.task_type)
    dataset = HaemologixDataset(examples, args.task_type, preprocessor)
    
    # Inspect
    inspect_predictions(model, dataset, examples, args.task_type, device, args.num_samples)
    
    print("\n" + "=" * 80)


if __name__ == "__main__":
    main()

