"""Training entry point"""

import torch
from torch.utils.data import DataLoader
from torch.optim import AdamW
import yaml
from pathlib import Path
from typing import Dict, Any

from models.haemologix_decision_network import HaemologixDecisionNetwork
from data.dataset import HaemologixDataset
from data.preprocessing import DataPreprocessor
from data.loaders import load_training_examples_from_json
from training.trainer import Trainer
from training.losses import MultiTaskLoss


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
    # Get config directory (relative to this file)
    config_dir = Path(__file__).parent.parent / "config"
    
    # Load configs
    model_config = load_config(str(config_dir / "model_config.yaml"))
    training_config = load_config(str(config_dir / "training_config.yaml"))

    # Get task type
    task_type = training_config.get("task_type", "donor_selection")
    
    # Get data paths (relative to ml directory)
    data_dir = training_config.get("data_dir", "data")
    data_path = Path(__file__).parent.parent / data_dir
    train_path = data_path / f"{task_type}_train.json"
    val_path = data_path / f"{task_type}_val.json"

    # Load data from JSON files
    print(f"Loading training data from {train_path}...")
    try:
        train_examples = load_training_examples_from_json(str(train_path), task_type)
        print(f"Loaded {len(train_examples)} training examples")
    except FileNotFoundError:
        print(f"Warning: Training file not found: {train_path}")
        print("Please run: npm run export:data")
        return

    print(f"Loading validation data from {val_path}...")
    try:
        val_examples = load_training_examples_from_json(str(val_path), task_type)
        print(f"Loaded {len(val_examples)} validation examples")
    except FileNotFoundError:
        print(f"Warning: Validation file not found: {val_path}")
        print("Using empty validation set")
        val_examples = []

    if len(train_examples) == 0:
        print("No training examples found. Please export data first:")
        print("  npm run export:data")
        return

    # Initialize preprocessor
    preprocessor = DataPreprocessor()

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
    
    # Initialize model weights properly
    def init_weights(m):
        if isinstance(m, torch.nn.Linear):
            torch.nn.init.xavier_uniform_(m.weight)
            if m.bias is not None:
                torch.nn.init.zeros_(m.bias)
        elif isinstance(m, torch.nn.Embedding):
            torch.nn.init.normal_(m.weight, mean=0, std=0.02)
    
    model.apply(init_weights)
    print("Model initialized with Xavier uniform weights")

    # Create loss function
    loss_fn = MultiTaskLoss(
        task_weights=training_config.get("task_weights", {})
    )

    # Get checkpoint directory (relative to ml directory)
    checkpoint_dir = training_config.get("checkpoint_dir", "checkpoints")
    checkpoint_path = Path(__file__).parent.parent / checkpoint_dir
    checkpoint_path.mkdir(parents=True, exist_ok=True)
    
    # Get optimizer config
    optimizer_config = training_config.get("optimizer", {})
    learning_rate = optimizer_config.get("lr", 0.001)
    
    # Create trainer
    trainer = Trainer(
        model=model,
        task_type=task_type,
        loss_fn=loss_fn,
        checkpoint_dir=str(checkpoint_path),
    )
    # Set learning rate
    trainer.learning_rate = learning_rate
    trainer.optimizer = AdamW(
        model.parameters(), lr=learning_rate, weight_decay=optimizer_config.get("weight_decay", 1e-5)
    )

    # Get training config
    training_params = training_config.get("training", {})
    
    # Train
    trainer.train(
        train_loader=train_loader,
        val_loader=val_loader,
        num_epochs=training_params.get("num_epochs", 50),
        early_stopping_patience=training_params.get("early_stopping_patience", 20),
        save_every=training_params.get("save_every", 5),
    )

    print("Training completed!")


if __name__ == "__main__":
    main()

