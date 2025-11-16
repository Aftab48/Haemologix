"""Data loaders for loading training data from JSON files"""

from typing import List, Dict, Any, Optional
import json
from pathlib import Path
from datetime import datetime


def load_training_examples_from_json(
    json_path: str, task_type: Optional[str] = None
) -> List[Dict[str, Any]]:
    """
    Load training examples from JSON file exported by TypeScript.
    
    Args:
        json_path: Path to JSON file (e.g., "ml/data/donor_selection_train.json")
        task_type: Optional task type filter (if None, uses filename)
    
    Returns:
        List of training examples
    """
    json_path = Path(json_path)
    
    if not json_path.exists():
        raise FileNotFoundError(f"Training data file not found: {json_path}")
    
    with open(json_path, "r") as f:
        examples = json.load(f)
    
    # Filter by task type if specified
    if task_type:
        examples = [ex for ex in examples if ex.get("taskType") == task_type]
    
    return examples


def load_training_examples_from_db(
    db_connection, task_type: str, limit: Optional[int] = None
) -> List[Dict[str, Any]]:
    """
    Load training examples from database.
    This is a placeholder - in production, you'd query the TrainingExample table.
    """
    # Placeholder implementation
    # In production, this would query:
    # SELECT * FROM "TrainingExample" WHERE "taskType" = task_type AND "usedForTraining" = false
    # ORDER BY "createdAt" DESC LIMIT limit

    examples = []
    return examples


def convert_agent_decision_to_training_example(
    agent_decision: Dict[str, Any], task_type: str
) -> Dict[str, Any]:
    """
    Convert an AgentDecision record to a training example format.
    """
    decision_data = agent_decision.get("decision", {})

    # Extract input features based on task type
    input_features = {
        "task_type": task_type,
        "decision_data": decision_data,
    }

    # Extract output label (this would need to be determined from outcomes)
    output_label = {
        "decision": decision_data,
    }

    return {
        "taskType": task_type,
        "inputFeatures": input_features,
        "outputLabel": output_label,
        "agentDecisionId": agent_decision.get("id"),
        "requestId": agent_decision.get("requestId"),
        "createdAt": agent_decision.get("createdAt"),
    }

