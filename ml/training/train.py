"""Training entry point"""

import torch
from torch.utils.data import DataLoader
import yaml
from pathlib import Path
from typing import Dict, Any

from ..models.haemologix_decision_network import HaemologixDecisionNetwork
from ..data.dataset import HaemologixDataset
from ..data.preprocessing import DataPreprocessor
from .trainer import Trainer
from .losses import MultiTaskLoss


def load_config(config_path: str) -> Dict[str, Any]:
    """Load configuration from YAML file"""
    with open(config_path, "r") as f:
        config = yaml.safe_load(f)
    return config


def create_model(config: Dict[str, Any]) -> HaemologixDecisionNetwork:
    """Create model from config"""
    model_config = config.get("model", {})
    return HaemologixDecisionNetwork(
        num_blood_types=model_config.get("num_blood_types", 8),
        num_urgency_levels=model_config.get("num_urgency_levels", 4),
        num_transport_methods=model_config.get("num_transport_methods", 3),
        embedding_dim=model_config.get("embedding_dim", 32),
        numerical_dim=model_config.get("numerical_dim", 64),
        hidden_dim=model_config.get("hidden_dim", 256),
        num_factors=model_config.get("num_factors", 4),
        dropout=model_config.get("dropout", 0.1),
    )


def main():
    """Main training function"""
    # Load configs
    model_config = load_config("ml/config/model_config.yaml")
    training_config = load_config("ml/config/training_config.yaml")

    # Get task type
    task_type = training_config.get("task_type", "donor_selection")

    # Load data (placeholder - in production, load from database)
    # For now, we'll create empty datasets as placeholders
    preprocessor = DataPreprocessor()

    # Create datasets (in production, load from database)
    train_examples = []  # Load from database
    val_examples = []  # Load from database

    if len(train_examples) == 0:
        print("No training examples found. Please collect data first.")
        return

    # Fit preprocessor
    preprocessor.fit_scalers(train_examples, task_type)

    # Create datasets
    train_dataset = HaemologixDataset(train_examples, task_type, preprocessor)
    val_dataset = HaemologixDataset(val_examples, task_type, preprocessor)

    # Create data loaders
    train_loader = DataLoader(
        train_dataset,
        batch_size=training_config.get("batch_size", 32),
        shuffle=True,
    )
    val_loader = DataLoader(
        val_dataset, batch_size=training_config.get("batch_size", 32), shuffle=False
    )

    # Create model
    model = create_model(model_config)

    # Create loss function
    loss_fn = MultiTaskLoss(
        task_weights=training_config.get("task_weights", {})
    )

    # Create trainer
    trainer = Trainer(
        model=model,
        task_type=task_type,
        loss_fn=loss_fn,
        checkpoint_dir=training_config.get("checkpoint_dir", "ml/checkpoints"),
    )

    # Train
    trainer.train(
        train_loader=train_loader,
        val_loader=val_loader,
        num_epochs=training_config.get("num_epochs", 50),
        early_stopping_patience=training_config.get("early_stopping_patience", 10),
    )

    print("Training completed!")


if __name__ == "__main__":
    main()

