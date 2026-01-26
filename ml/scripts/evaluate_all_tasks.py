#!/usr/bin/env python3
"""Evaluate model on all 5 task types and calculate average accuracy"""

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


def load_model(checkpoint_path: str, device: str = "cpu", use_old_architecture: bool = False):
    """Load model from checkpoint"""
    checkpoint = torch.load(checkpoint_path, map_location=device)
    
    # Load config to get model architecture
    config_dir = Path(__file__).parent.parent / "config"
    with open(config_dir / "model_config.yaml", "r") as f:
        model_config = yaml.safe_load(f)
    
    # Create model
    model_config_data = model_config.get("model", {})
    
    # Check if we need to use old architecture (for compatibility with old checkpoints)
    if use_old_architecture:
        # Temporarily modify the DonorSelectionHead to use old architecture
        from models.components.task_heads import DonorSelectionHead
        original_init = DonorSelectionHead.__init__
        
        def old_init(self, input_dim: int = 256, hidden_dim: int = 128, max_candidates: int = 50):
            super(DonorSelectionHead, self).__init__()
            self.max_candidates = max_candidates
            self.candidate_encoder = torch.nn.Sequential(
                torch.nn.Linear(5, hidden_dim),
                torch.nn.ReLU(),
                torch.nn.Linear(hidden_dim, hidden_dim),
            )
            self.context_encoder = torch.nn.Sequential(
                torch.nn.Linear(input_dim, hidden_dim),
                torch.nn.ReLU(),
                torch.nn.Linear(hidden_dim, hidden_dim),
            )
            self.attention = torch.nn.MultiheadAttention(
                embed_dim=hidden_dim, num_heads=4, batch_first=True
            )
            self.ranking_head = torch.nn.Sequential(
                torch.nn.Linear(hidden_dim, hidden_dim // 2),
                torch.nn.ReLU(),
                torch.nn.Dropout(0.2),
                torch.nn.Linear(hidden_dim // 2, 1),
            )
        
        DonorSelectionHead.__init__ = old_init
    
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
    
    try:
        # Try loading with new architecture first
        model.load_state_dict(checkpoint["model_state_dict"], strict=False)
    except RuntimeError as e:
        if "size mismatch" in str(e) and "ranking_head" in str(e):
            print("Warning: Checkpoint uses old architecture. Loading with compatibility mode...")
            # Reload model with old architecture
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
            # Manually load compatible layers
            state_dict = checkpoint["model_state_dict"]
            model_state = model.state_dict()
            for key in list(state_dict.keys()):
                if "ranking_head" in key and "0.weight" in key:
                    # Skip the incompatible ranking head layer
                    continue
                if key in model_state and state_dict[key].shape == model_state[key].shape:
                    model_state[key] = state_dict[key]
            model.load_state_dict(model_state, strict=False)
            print("Loaded with partial compatibility (ranking head may not work correctly)")
        else:
            raise
    
    model.to(device)
    model.eval()
    
    return model, checkpoint


def evaluate_task(model, task_type: str, data_path: str, device: str = "cpu"):
    """Evaluate model on a specific task"""
    print(f"\n{'='*60}")
    print(f"Evaluating: {task_type}")
    print(f"{'='*60}")
    
    # Load data
    try:
        examples = load_training_examples_from_json(data_path, task_type)
        print(f"Loaded {len(examples)} examples")
    except FileNotFoundError:
        print(f"Data file not found: {data_path}")
        return None
    
    if len(examples) == 0:
        print("No examples found")
        return None
    
    # Preprocess
    preprocessor = DataPreprocessor()
    preprocessor.fit_scalers(examples, task_type)
    dataset = HaemologixDataset(examples, task_type, preprocessor)
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
            
            try:
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
            except Exception as e:
                print(f"Error during evaluation: {e}")
                return None
    
    avg_loss = total_loss / num_batches if num_batches > 0 else 0.0
    
    # Compute metrics using utils.metrics
    metrics = {}
    if len(all_predictions) > 0:
        # Concatenate predictions and labels
        if task_type == "donor_selection":
            all_pred_scores = torch.cat([p["scores"] for p in all_predictions], dim=0)
            all_pred_idx = torch.cat([p["selected_idx"] for p in all_predictions], dim=0)
            all_labels_tensor = torch.cat(all_labels, dim=0)
            accuracy = (all_pred_idx == all_labels_tensor).float().mean().item()
            top_3 = torch.topk(all_pred_scores, k=min(3, all_pred_scores.size(-1)), dim=-1).indices
            top_3_correct = (top_3 == all_labels_tensor.unsqueeze(-1)).any(dim=-1).float()
            top_3_accuracy = top_3_correct.mean().item()
            metrics = {"loss": avg_loss, "accuracy": accuracy, "top_3_accuracy": top_3_accuracy}
        
        elif task_type == "urgency_assessment":
            all_pred_class = torch.cat([p["urgency_class"] for p in all_predictions], dim=0)
            all_pred_score = torch.cat([p["priority_score"] for p in all_predictions], dim=0)
            # Labels are dicts, extract tensors properly
            label_classes = []
            label_scores = []
            for l in all_labels:
                if isinstance(l, dict):
                    label_classes.append(l["urgency_class"] if l["urgency_class"].dim() > 0 else l["urgency_class"].unsqueeze(0))
                    label_scores.append(l["priority_score"] if l["priority_score"].dim() > 0 else l["priority_score"].unsqueeze(0))
                else:
                    label_classes.append(l)
                    label_scores.append(torch.tensor(0.5))
            all_labels_class = torch.cat(label_classes, dim=0)
            all_labels_score = torch.cat(label_scores, dim=0)
            accuracy = (all_pred_class == all_labels_class).float().mean().item()
            mae = torch.abs(all_pred_score - all_labels_score).mean().item()
            metrics = {"loss": avg_loss, "accuracy": accuracy, "priority_mae": mae}
        
        elif task_type == "inventory_selection":
            all_pred_idx = torch.cat([p["selected_idx"] for p in all_predictions], dim=0)
            all_labels_tensor = torch.cat(all_labels, dim=0)
            accuracy = (all_pred_idx == all_labels_tensor).float().mean().item()
            metrics = {"loss": avg_loss, "accuracy": accuracy}
        
        elif task_type == "transport_planning":
            all_pred_method = torch.cat([p["method"] for p in all_predictions], dim=0)
            all_pred_eta = torch.cat([p["eta_minutes"] for p in all_predictions], dim=0)
            # Labels are dicts, extract tensors properly
            label_methods = []
            label_etas = []
            for l in all_labels:
                if isinstance(l, dict):
                    label_methods.append(l["method"] if l["method"].dim() > 0 else l["method"].unsqueeze(0))
                    label_etas.append(l["eta_minutes"] if l["eta_minutes"].dim() > 0 else l["eta_minutes"].unsqueeze(0))
                else:
                    label_methods.append(torch.tensor(1))
                    label_etas.append(torch.tensor(60.0))
            all_labels_method = torch.cat(label_methods, dim=0)
            all_labels_eta = torch.cat(label_etas, dim=0)
            method_accuracy = (all_pred_method == all_labels_method).float().mean().item()
            eta_mae = torch.abs(all_pred_eta - all_labels_eta).mean().item()
            metrics = {"loss": avg_loss, "method_accuracy": method_accuracy, "eta_mae": eta_mae}
        
        elif task_type == "eligibility_analysis":
            all_pred_eligible = torch.cat([p["eligible"] for p in all_predictions], dim=0)
            all_labels_eligible = torch.cat([l["eligible"] for l in all_labels], dim=0)
            correct = (all_pred_eligible == all_labels_eligible).float()
            accuracy = correct.mean().item()
            metrics = {"loss": avg_loss, "accuracy": accuracy}
    
    return metrics


def main():
    import argparse
    
    parser = argparse.ArgumentParser(description="Evaluate model on all task types")
    parser.add_argument("--checkpoint", default="ml/checkpoints/best_model.pt", help="Path to model checkpoint")
    parser.add_argument("--data-dir", default="ml/data", help="Directory containing validation data")
    parser.add_argument("--device", default="cpu", help="Device to use (cpu/cuda)")
    
    args = parser.parse_args()
    
    device = args.device if torch.cuda.is_available() and args.device == "cuda" else "cpu"
    data_dir = Path(args.data_dir)
    
    print("="*80)
    print("Comprehensive Model Evaluation - All Task Types")
    print("="*80)
    print(f"Checkpoint: {args.checkpoint}")
    print(f"Data Directory: {data_dir}")
    print(f"Device: {device}")
    print()
    
    # Load model
    print("Loading model...")
    try:
        model, checkpoint = load_model(args.checkpoint, device)
        print(f"[OK] Model loaded from epoch {checkpoint.get('epoch', 'unknown')}")
    except Exception as e:
        print(f"[ERROR] Failed to load model: {e}")
        print("\nNote: The checkpoint may be from an old architecture.")
        print("Please retrain the model with the updated architecture first.")
        return
    
    # Task configurations
    tasks = [
        ("donor_selection", "donor_selection_val.json", "accuracy"),
        ("urgency_assessment", "urgency_assessment_val.json", "accuracy"),
        ("inventory_selection", "inventory_selection_val.json", "accuracy"),
        ("transport_planning", "transport_planning_val.json", "method_accuracy"),
        ("eligibility_analysis", "eligibility_analysis_val.json", "accuracy"),
    ]
    
    results = {}
    accuracies = []
    
    # Evaluate each task
    for task_type, data_file, accuracy_key in tasks:
        data_path = data_dir / data_file
        metrics = evaluate_task(model, task_type, str(data_path), device)
        
        if metrics:
            results[task_type] = metrics
            # Extract accuracy (or method_accuracy for transport_planning)
            acc = metrics.get(accuracy_key, metrics.get("accuracy", 0.0))
            accuracies.append(acc)
            print(f"\nResults for {task_type}:")
            for key, value in metrics.items():
                if isinstance(value, float):
                    print(f"  {key}: {value:.4f}")
                else:
                    print(f"  {key}: {value}")
        else:
            print(f"\n[SKIPPED] {task_type} - Could not evaluate")
    
    # Calculate average
    print("\n" + "="*80)
    print("SUMMARY")
    print("="*80)
    
    if accuracies:
        avg_accuracy = sum(accuracies) / len(accuracies)
        print(f"\nAverage Accuracy: {avg_accuracy:.4f} ({avg_accuracy*100:.2f}%)")
        print(f"\nIndividual Task Accuracies:")
        for task_type, _, accuracy_key in tasks:
            if task_type in results:
                acc = results[task_type].get(accuracy_key, results[task_type].get("accuracy", 0.0))
                print(f"  {task_type}: {acc:.4f} ({acc*100:.2f}%)")
    else:
        print("\n[ERROR] No tasks could be evaluated successfully")
    
    print()


if __name__ == "__main__":
    main()

