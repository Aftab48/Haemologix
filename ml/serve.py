"""Entrypoint: `python serve.py` (from ml/) or via Docker CMD."""

import os
from pathlib import Path

import uvicorn

try:
    from dotenv import load_dotenv

    load_dotenv(Path(__file__).resolve().parent / ".env")
except Exception:  # pragma: no cover
    pass

if __name__ == "__main__":
    uvicorn.run(
        "haemologix.api:app",
        host=os.environ.get("API_HOST", "0.0.0.0"),
        port=int(os.environ.get("API_PORT", "8000")),
        workers=int(os.environ.get("API_WORKERS", "1")),
        log_level=os.environ.get("API_LOG_LEVEL", "info"),
    )
