# Haemologix ML Model

Custom neural network model for Haemologix agent decision-making.

## Overview

This directory contains a production-ready custom neural network implementation using PyTorch, optimized for 5 agent decision types:
- Donor Selection
- Urgency Assessment
- Inventory Selection
- Transport Planning
- Eligibility Analysis

## Setup

### Quick Setup (Recommended)

**Windows (Command Prompt):**
```cmd
cd ml
setup.bat
```

**Windows (PowerShell):**
```powershell
cd ml
.\setup.bat
```

**Linux/Mac:**
```bash
cd ml
chmod +x setup.sh
./setup.sh
```

This will:
- Create a virtual environment (`.venv`)
- Install all Python dependencies
- Set up the environment for development

### Manual Setup

1. **Create virtual environment:**
   ```bash
   cd ml
   python -m venv .venv
   ```

2. **Activate virtual environment:**
   - Windows: `.venv\Scripts\activate.bat`
   - Linux/Mac: `source .venv/bin/activate`

3. **Install Python dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

4. **Set up environment variables:**
   Copy `env.ml.example` to `.env.ml` and update with your values:
   ```cmd
   copy env.ml.example .env.ml
   ```

5. **Run database migrations:**
   ```bash
   npx prisma migrate dev
   ```

## Directory Structure

```
ml/
├── models/              # Model architecture
│   ├── haemologix_decision_network.py
│   └── components/      # Feature encoder, reasoning layer, task heads
├── data/               # Data processing
│   ├── dataset.py      # PyTorch Dataset
│   ├── preprocessing.py
│   └── loaders.py
├── training/           # Training pipeline
│   ├── train.py
│   ├── trainer.py
│   └── losses.py
├── api/                # FastAPI server
│   ├── server.py
│   └── schemas.py
├── config/             # Configuration files
│   ├── model_config.yaml
│   └── training_config.yaml
├── scripts/            # Utility scripts
│   ├── train.py
│   ├── export_data.py
│   ├── evaluate.py
│   ├── eda.py          # Exploratory Data Analysis
│   └── export_model.py
└── utils/             # Utilities
    ├── metrics.py
    └── logging.py
```

## Usage

### Training

1. **Collect training data:**
   The system automatically collects training examples from agent decisions via `lib/ml/dataCollection.ts`.

2. **Export training data:**
   ```bash
   python ml/scripts/export_data.py --task-type donor_selection --output ml/data/train_data.json
   ```

3. **Train model:**
   ```bash
   python ml/scripts/train.py
   ```

### Exploratory Data Analysis (EDA)

Before training, it's recommended to analyze your training data to understand distributions, identify issues, and ensure data quality.

1. **Run EDA on all task types:**
   ```bash
   cd ml
   python scripts/eda.py
   ```

2. **Run EDA on a specific task type:**
   ```bash
   python scripts/eda.py --task-type donor_selection
   ```

3. **Customize output locations:**
   ```bash
   python scripts/eda.py --data-dir ml/data --output-dir ml/eda_output --report ml/EDA_REPORT.md
   ```

The EDA script will:
- Analyze data size and train/val splits
- Examine feature distributions (numerical and categorical)
- Analyze label distributions
- Check for class imbalances
- Generate visualization plots
- Create a summary report

Outputs:
- Visualizations saved to `ml/eda_output/` (default)
- Summary report saved to `ml/EDA_REPORT.md` (default)

### Inference

1. **Start the API server:**
   ```bash
   cd ml
   uvicorn api.server:app --host 0.0.0.0 --port 8000
   ```

2. **Use from TypeScript:**
   ```typescript
   import { predictDonorSelection, isMLModelAvailable } from '@/lib/ml/modelClient';
   
   if (await isMLModelAvailable()) {
     const result = await predictDonorSelection({
       candidates: [...],
       alert: {...},
       context: {...}
     });
   }
   ```

## Model Architecture

- **FeatureEncoder**: Encodes structured inputs (numerical + categorical)
- **MultiFactorReasoningLayer**: Attention-based reasoning for multi-factor decisions
- **Task-Specific Heads**: Specialized heads for each decision type
- **ConfidenceEstimator**: Predicts confidence scores

## Configuration

Edit `ml/config/model_config.yaml` for model architecture hyperparameters.
Edit `ml/config/training_config.yaml` for training hyperparameters.

## Integration

The model integrates with the existing agent system:
- Replaces LLM calls in `lib/agents/llmReasoning.ts` with model API calls
- Automatically collects training data from agent decisions
- Falls back to external LLM if model unavailable

## Next Steps

1. Collect at least 1,000 examples per task type (5,000 total minimum)
2. Train initial models for each task type
3. Deploy model API server
4. Update agent code to use model client
5. Monitor performance and collect feedback for continuous improvement

