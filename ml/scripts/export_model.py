#!/usr/bin/env python3
"""Export trained model for serving"""

import sys
import torch
from pathlib import Path
import json

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from models.haemologix_decision_network import HaemologixDecisionNetwork

def export_model(checkpoint_path: str, output_path: str, version: str = "v1.0.0"):
    """Export model for serving"""
    print(f"Exporting model from {checkpoint_path}...")
    
    # Load checkpoint
    checkpoint = torch.load(checkpoint_path, map_location="cpu")
    config = checkpoint.get("config", {})
    
    # Create model and load weights
    model = HaemologixDecisionNetwork(**config)
    model.load_state_dict(checkpoint["model_state_dict"])
    model.eval()
    
    # Save model
    output_dir = Path(output_path)
    output_dir.mkdir(parents=True, exist_ok=True)
    
    model_file = output_dir / "model.pt"
    torch.save({
        "model_state_dict": model.state_dict(),
        "config": config,
        "version": version,
        "epoch": checkpoint.get("epoch", 0),
        "val_loss": checkpoint.get("val_loss", 0),
    }, model_file)
    
    # Save metadata
    metadata = {
        "version": version,
        "task_type": checkpoint.get("task_type", "multi_task"),
        "epoch": checkpoint.get("epoch", 0),
        "val_loss": checkpoint.get("val_loss", 0),
        "config": config,
    }
    
    with open(output_dir / "metadata.json", "w") as f:
        json.dump(metadata, f, indent=2)
    
    print(f"Model exported to {output_path}")
    print(f"  Model file: {model_file}")
    print(f"  Metadata: {output_dir / 'metadata.json'}")

if __name__ == "__main__":
    import argparse
    
    parser = argparse.ArgumentParser(description="Export trained model for serving")
    parser.add_argument("--checkpoint", required=True, help="Path to checkpoint")
    parser.add_argument("--output", required=True, help="Output directory")
    parser.add_argument("--version", default="v1.0.0", help="Model version")
    
    args = parser.parse_args()
    export_model(args.checkpoint, args.output, args.version)

