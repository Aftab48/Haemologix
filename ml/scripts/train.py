#!/usr/bin/env python3
"""Main training entry point"""

import sys
from pathlib import Path

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from training.train import main

if __name__ == "__main__":
    main()

