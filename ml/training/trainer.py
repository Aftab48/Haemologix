"""Training pipeline with optimizer, scheduler, and checkpointing"""

import torch
import torch.nn as nn
from torch.utils.data import DataLoader
from torch.optim import AdamW
from torch.optim.lr_scheduler import ReduceLROnPlateau
from typing import Dict, Optional, Literal
import os
from pathlib import Path
import json
from datetime import datetime

from models.haemologix_decision_network import HaemologixDecisionNetwork
from data.dataset import HaemologixDataset
from training.losses import MultiTaskLoss
from utils.metrics import compute_metrics


class Trainer:
    """
    Training pipeline with:
    - Multi-task loss function (weighted combination per task)
    - Optimizer: AdamW with learning rate scheduling
    - Early stopping based on validation metrics
    - Model checkpointing and versioning
    - Training metrics logging (TensorBoard)
    """

    def __init__(
        self,
        model: HaemologixDecisionNetwork,
        task_type: str,
        loss_fn: MultiTaskLoss,
        optimizer: Optional[torch.optim.Optimizer] = None,
        device: str = "cuda" if torch.cuda.is_available() else "cpu",
        checkpoint_dir: str = "ml/checkpoints",
    ):
        self.model = model.to(device)
        self.task_type = task_type
        self.loss_fn = loss_fn
        self.device = device
        self.checkpoint_dir = Path(checkpoint_dir)
        self.checkpoint_dir.mkdir(parents=True, exist_ok=True)

        # Optimizer - use config if available, otherwise default
        if optimizer is None:
            # Try to get LR from config, default to 0.001
            lr = getattr(self, 'learning_rate', 0.001)
            self.optimizer = AdamW(
                model.parameters(), lr=lr, weight_decay=1e-5
            )
        else:
            self.optimizer = optimizer

        # Learning rate scheduler
        self.scheduler = ReduceLROnPlateau(
            self.optimizer, mode="min", factor=0.5, patience=5
        )

        # Training state
        self.best_val_loss = float("inf")
        self.epoch = 0
        self.train_losses = []
        self.val_losses = []
        self.val_metrics_history = []  # Store validation metrics over time

    def train_epoch(
        self, train_loader: DataLoader
    ) -> float:
        """Train for one epoch"""
        self.model.train()
        total_loss = 0.0
        num_batches = 0

        for batch in train_loader:
            # Move batch to device
            batch = self._move_batch_to_device(batch)

            # Forward pass
            predictions = self.model(
                task_type=self.task_type,
                numerical_features=batch["numerical_features"],
                blood_type_idx=batch["blood_type_idx"],
                urgency_idx=batch["urgency_idx"],
                transport_method_idx=batch.get("transport_idx"),
                time_features=batch["time_features"],
                candidate_features=batch.get("candidate_features"),
                source_features=batch.get("source_features"),
            )

            # Compute loss
            loss = self.loss_fn(self.task_type, predictions, batch["label"])

            # Backward pass
            self.optimizer.zero_grad()
            loss.backward()
            
            # Check for gradient issues
            total_norm = torch.nn.utils.clip_grad_norm_(self.model.parameters(), max_norm=1.0)
            
            # Only step if gradients are valid
            if torch.isfinite(loss) and torch.isfinite(total_norm):
                self.optimizer.step()
            else:
                print(f"Warning: Invalid loss ({loss.item()}) or gradient norm ({total_norm}), skipping step")

            total_loss += loss.item()
            num_batches += 1

        avg_loss = total_loss / num_batches if num_batches > 0 else 0.0
        # Round to 6 decimal places to avoid floating point precision issues
        return round(avg_loss, 6)

    def validate(self, val_loader: DataLoader, compute_metrics_flag: bool = False) -> tuple:
        """Validate on validation set"""
        self.model.eval()
        total_loss = 0.0
        num_batches = 0
        all_predictions = []
        all_labels = []

        with torch.no_grad():
            for batch in val_loader:
                batch = self._move_batch_to_device(batch)

                predictions = self.model(
                    task_type=self.task_type,
                    numerical_features=batch["numerical_features"],
                    blood_type_idx=batch["blood_type_idx"],
                    urgency_idx=batch["urgency_idx"],
                    transport_method_idx=batch.get("transport_idx"),
                    time_features=batch["time_features"],
                    candidate_features=batch.get("candidate_features"),
                    source_features=batch.get("source_features"),
                )

                loss = self.loss_fn(self.task_type, predictions, batch["label"])

                total_loss += loss.item()
                num_batches += 1
                
                # Collect predictions and labels for metrics
                if compute_metrics_flag:
                    all_predictions.append(predictions)
                    all_labels.append(batch["label"])

        avg_loss = total_loss / num_batches if num_batches > 0 else 0.0
        # Don't round too aggressively - keep more precision for debugging
        avg_loss = round(avg_loss, 8)
        
        # Compute metrics if requested
        metrics = {}
        if compute_metrics_flag and len(all_predictions) > 0:
            # Concatenate all predictions and labels
            if self.task_type == "donor_selection":
                # For donor selection, labels are tensors
                all_pred_scores = torch.cat([p["scores"] for p in all_predictions], dim=0)
                all_pred_idx = torch.cat([p["selected_idx"] for p in all_predictions], dim=0)
                all_labels_tensor = torch.cat(all_labels, dim=0)
                
                # Compute accuracy
                correct = (all_pred_idx == all_labels_tensor).float()
                metrics["accuracy"] = correct.mean().item()
                
                # Top-3 accuracy
                top_3 = torch.topk(all_pred_scores, k=min(3, all_pred_scores.size(-1)), dim=-1).indices
                top_3_correct = (top_3 == all_labels_tensor.unsqueeze(-1)).any(dim=-1).float()
                metrics["top_3_accuracy"] = top_3_correct.mean().item()
        
        if compute_metrics_flag:
            return (avg_loss, metrics)
        return avg_loss

    def _move_batch_to_device(self, batch: Dict) -> Dict:
        """Move batch tensors to device"""
        device_batch = {}
        for key, value in batch.items():
            if isinstance(value, torch.Tensor):
                device_batch[key] = value.to(self.device)
            elif isinstance(value, dict):
                device_batch[key] = {
                    k: v.to(self.device) if isinstance(v, torch.Tensor) else v
                    for k, v in value.items()
                }
            else:
                device_batch[key] = value
        return device_batch

    def save_checkpoint(
        self, epoch: int, val_loss: float, is_best: bool = False
    ) -> str:
        """Save model checkpoint"""
        checkpoint = {
            "epoch": epoch,
            "model_state_dict": self.model.state_dict(),
            "optimizer_state_dict": self.optimizer.state_dict(),
            "scheduler_state_dict": self.scheduler.state_dict(),
            "val_loss": val_loss,
            "task_type": self.task_type,
        }

        # Save checkpoint
        checkpoint_path = self.checkpoint_dir / f"checkpoint_epoch_{epoch}.pt"
        torch.save(checkpoint, checkpoint_path)

        # Save best model
        if is_best:
            best_path = self.checkpoint_dir / "best_model.pt"
            torch.save(checkpoint, best_path)
            self.best_val_loss = val_loss

        return str(checkpoint_path)

    def train(
        self,
        train_loader: DataLoader,
        val_loader: DataLoader,
        num_epochs: int = 50,
        early_stopping_patience: int = 10,
        save_every: int = 5,
    ):
        """Main training loop"""
        patience_counter = 0

        for epoch in range(num_epochs):
            self.epoch = epoch

            # Train
            train_loss = self.train_epoch(train_loader)
            self.train_losses.append(train_loss)

            # Validate (compute metrics every 5 epochs or on last epoch)
            compute_metrics_this_epoch = (epoch % 5 == 0) or (epoch == num_epochs - 1)
            if compute_metrics_this_epoch:
                result = self.validate(val_loader, compute_metrics_flag=True)
                if isinstance(result, tuple):
                    val_loss, val_metrics = result
                    if val_metrics:
                        self.val_metrics_history.append(val_metrics)
                        print(f"  Val Metrics: {', '.join([f'{k}={v:.4f}' for k, v in val_metrics.items()])}")
                else:
                    val_loss = result
            else:
                val_loss = self.validate(val_loader, compute_metrics_flag=False)
            self.val_losses.append(val_loss)

            # Learning rate scheduling
            self.scheduler.step(val_loss)

            # Checkpointing
            is_best = val_loss < self.best_val_loss
            if is_best:
                patience_counter = 0
                self.save_checkpoint(epoch, val_loss, is_best=True)
                print(f"✓ New best validation loss: {val_loss:.4f} (improved from {self.best_val_loss:.4f})")
            else:
                patience_counter += 1
                if patience_counter > 0:
                    print(f"  No improvement for {patience_counter}/{early_stopping_patience} epochs")

            # Periodic checkpoint
            if epoch % save_every == 0:
                self.save_checkpoint(epoch, val_loss, is_best=False)

            # Early stopping
            if patience_counter >= early_stopping_patience:
                print(f"\nEarly stopping at epoch {epoch+1} (no improvement for {early_stopping_patience} epochs)")
                print(f"Best validation loss: {self.best_val_loss:.4f}")
                break

            print(
                f"Epoch {epoch+1}/{num_epochs} - Train Loss: {train_loss:.4f}, Val Loss: {val_loss:.4f}, Best Val: {self.best_val_loss:.4f}, LR: {self.optimizer.param_groups[0]['lr']:.6f}"
            )

        return self.best_val_loss

