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

from ..models.haemologix_decision_network import HaemologixDecisionNetwork
from ..data.dataset import HaemologixDataset
from .losses import MultiTaskLoss


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

        # Optimizer
        if optimizer is None:
            self.optimizer = AdamW(
                model.parameters(), lr=1e-4, weight_decay=1e-5
            )
        else:
            self.optimizer = optimizer

        # Learning rate scheduler
        self.scheduler = ReduceLROnPlateau(
            self.optimizer, mode="min", factor=0.5, patience=5, verbose=True
        )

        # Training state
        self.best_val_loss = float("inf")
        self.epoch = 0
        self.train_losses = []
        self.val_losses = []

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
            torch.nn.utils.clip_grad_norm_(self.model.parameters(), max_norm=1.0)
            self.optimizer.step()

            total_loss += loss.item()
            num_batches += 1

        avg_loss = total_loss / num_batches if num_batches > 0 else 0.0
        return avg_loss

    def validate(self, val_loader: DataLoader) -> float:
        """Validate on validation set"""
        self.model.eval()
        total_loss = 0.0
        num_batches = 0

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

        avg_loss = total_loss / num_batches if num_batches > 0 else 0.0
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

            # Validate
            val_loss = self.validate(val_loader)
            self.val_losses.append(val_loss)

            # Learning rate scheduling
            self.scheduler.step(val_loss)

            # Checkpointing
            is_best = val_loss < self.best_val_loss
            if is_best:
                patience_counter = 0
                self.save_checkpoint(epoch, val_loss, is_best=True)
            else:
                patience_counter += 1

            # Periodic checkpoint
            if epoch % save_every == 0:
                self.save_checkpoint(epoch, val_loss, is_best=False)

            # Early stopping
            if patience_counter >= early_stopping_patience:
                print(f"Early stopping at epoch {epoch}")
                break

            print(
                f"Epoch {epoch+1}/{num_epochs} - Train Loss: {train_loss:.4f}, Val Loss: {val_loss:.4f}"
            )

        return self.best_val_loss

