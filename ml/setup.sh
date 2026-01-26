#!/bin/bash
# Setup script for Haemologix ML environment (Linux/Mac)

set -e  # Exit on error

echo "========================================"
echo "Haemologix ML Environment Setup"
echo "========================================"
echo ""

# Check if Python is installed
if ! command -v python3 &> /dev/null; then
    echo "ERROR: Python 3 is not installed"
    echo "Please install Python 3.9+ from https://www.python.org/"
    exit 1
fi

echo "[1/3] Checking Python version..."
python3 --version
echo ""

# Create virtual environment if it doesn't exist
if [ ! -d ".venv" ]; then
    echo "[2/3] Creating virtual environment..."
    python3 -m venv .venv
    if [ $? -ne 0 ]; then
        echo "ERROR: Failed to create virtual environment"
        exit 1
    fi
    echo "Virtual environment created successfully!"
else
    echo "[2/3] Virtual environment already exists, skipping..."
fi

echo ""
echo "[3/3] Installing Python packages..."
source .venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt

if [ $? -ne 0 ]; then
    echo "ERROR: Failed to install packages"
    exit 1
fi

echo ""
echo "========================================"
echo "Setup completed successfully!"
echo "========================================"
echo ""
echo "To activate the virtual environment in the future, run:"
echo "  source .venv/bin/activate"
echo ""
echo "To start the ML API server, run:"
echo "  source .venv/bin/activate"
echo "  uvicorn api.server:app --host 0.0.0.0 --port 8000"
echo ""

