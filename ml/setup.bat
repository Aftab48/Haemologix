@echo off
REM Setup script for Haemologix ML environment (Windows)

echo ========================================
echo Haemologix ML Environment Setup
echo ========================================
echo.

REM Check if Python is installed
python --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: Python is not installed or not in PATH
    echo Please install Python 3.9+ from https://www.python.org/
    pause
    exit /b 1
)

echo [1/3] Checking Python version...
python --version
echo.

REM Create virtual environment if it doesn't exist
if not exist ".venv" (
    echo [2/3] Creating virtual environment...
    python -m venv .venv
    if errorlevel 1 (
        echo ERROR: Failed to create virtual environment
        pause
        exit /b 1
    )
    echo Virtual environment created successfully!
) else (
    echo [2/3] Virtual environment already exists, skipping...
)

echo.
echo [3/3] Installing Python packages...
call .venv\Scripts\activate.bat
pip install --upgrade pip
pip install -r requirements.txt

if errorlevel 1 (
    echo ERROR: Failed to install packages
    pause
    exit /b 1
)

echo.
echo ========================================
echo Setup completed successfully!
echo ========================================
echo.
echo To activate the virtual environment in the future, run:
echo   .venv\Scripts\activate.bat
echo.
echo To start the ML API server, run:
echo   .venv\Scripts\activate.bat
echo   uvicorn api.server:app --host 0.0.0.0 --port 8000
echo.
pause

