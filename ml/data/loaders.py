"""Data loaders for exporting from database"""

from typing import List, Dict, Any
import json
from datetime import datetime


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

