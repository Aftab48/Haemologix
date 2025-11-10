"""Logging utilities"""

import logging
from pathlib import Path


def setup_logging(log_dir: str = "ml/logs", level: int = logging.INFO):
    """Setup logging configuration"""
    log_path = Path(log_dir)
    log_path.mkdir(parents=True, exist_ok=True)

    logging.basicConfig(
        level=level,
        format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
        handlers=[
            logging.FileHandler(log_path / "training.log"),
            logging.StreamHandler(),
        ],
    )

    return logging.getLogger(__name__)

