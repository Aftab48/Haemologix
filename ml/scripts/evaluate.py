#!/usr/bin/env python3
"""Evaluate trained model on validation/test data"""

import sys
from pathlib import Path
import torch
import yaml
from torch.utils.data import DataLoader

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from models.haemologix_decision_network import HaemologixDecisionNetwork
from data.dataset import HaemologixDataset
from data.preprocessing import DataPreprocessor
from data.loaders import load_training_examples_from_json
from utils.metrics import compute_metrics


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
    
    return model, checkpoint


def evaluate_model(model, dataset, task_type: str, device: str = "cpu"):
    """Evaluate model on dataset"""
    loader = DataLoader(dataset, batch_size=32, shuffle=False)
    
    all_predictions = []
    all_labels = []
    total_loss = 0.0
    num_batches = 0
    
    from training.losses import MultiTaskLoss
    loss_fn = MultiTaskLoss()
    
    with torch.no_grad():
        for batch in loader:
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
            
            loss = loss_fn(task_type, predictions, batch["label"])
            total_loss += loss.item()
            num_batches += 1
            
            all_predictions.append(predictions)
            all_labels.append(batch["label"])
    
    avg_loss = total_loss / num_batches if num_batches > 0 else 0.0
    
    # Compute metrics
    if task_type == "donor_selection":
        all_pred_scores = torch.cat([p["scores"] for p in all_predictions], dim=0)
        all_pred_idx = torch.cat([p["selected_idx"] for p in all_predictions], dim=0)
        all_labels_tensor = torch.cat(all_labels, dim=0)
        
        accuracy = (all_pred_idx == all_labels_tensor).float().mean().item()
        
        # Top-3 accuracy
        top_3 = torch.topk(all_pred_scores, k=min(3, all_pred_scores.size(-1)), dim=-1).indices
        top_3_correct = (top_3 == all_labels_tensor.unsqueeze(-1)).any(dim=-1).float()
        top_3_accuracy = top_3_correct.mean().item()
        
        return {
            "loss": avg_loss,
            "accuracy": accuracy,
            "top_3_accuracy": top_3_accuracy,
        }
    
    return {"loss": avg_loss}


def main():
    import argparse
    
    parser = argparse.ArgumentParser(description="Evaluate trained model")
    parser.add_argument("--checkpoint", default="ml/checkpoints/best_model.pt", help="Path to model checkpoint")
    parser.add_argument("--data", default="ml/data/donor_selection_val.json", help="Path to evaluation data")
    parser.add_argument("--task-type", default="donor_selection", help="Task type")
    parser.add_argument("--device", default="cpu", help="Device to use (cpu/cuda)")
    
    args = parser.parse_args()
    
    device = args.device if torch.cuda.is_available() and args.device == "cuda" else "cpu"
    
    print("=" * 60)
    print("Model Evaluation")
    print("=" * 60)
    print(f"Checkpoint: {args.checkpoint}")
    print(f"Data: {args.data}")
    print(f"Task Type: {args.task_type}")
    print(f"Device: {device}")
    print()
    
    # Load model
    print("Loading model...")
    model, checkpoint = load_model(args.checkpoint, device)
    print(f"[OK] Loaded model from epoch {checkpoint.get('epoch', 'unknown')}")
    print(f"  Validation loss: {checkpoint.get('val_loss', 'unknown')}")
    print()
    
    # Load data
    print("Loading data...")
    examples = load_training_examples_from_json(args.data, args.task_type)
    print(f"[OK] Loaded {len(examples)} examples")
    print()
    
    # Preprocess
    preprocessor = DataPreprocessor()
    preprocessor.fit_scalers(examples, args.task_type)
    dataset = HaemologixDataset(examples, args.task_type, preprocessor)
    
    # Evaluate
    print("Evaluating model...")
    metrics = evaluate_model(model, dataset, args.task_type, device)
    
    print()
    print("=" * 60)
    print("Evaluation Results")
    print("=" * 60)
    for key, value in metrics.items():
        if isinstance(value, float):
            print(f"{key}: {value:.4f}")
        else:
            print(f"{key}: {value}")
    print()


if __name__ == "__main__":
    main()
