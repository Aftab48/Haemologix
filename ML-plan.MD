# Custom Model Architecture for Haemologix

## Overview

Build a production-ready custom neural network model from scratch using PyTorch, optimized for the 5 agent decision types: donor selection, urgency assessment, inventory selection, transport planning, and eligibility analysis.

## Architecture Components

### 1. Model Architecture (`ml/models/haemologix_decision_network.py`)

- **FeatureEncoder**: Encodes structured inputs (numerical + categorical features)
  - Numerical features: distances, scores, units, times, etc.
  - Categorical embeddings: blood types (8), urgency levels (4), transport methods (3)
  - Time encoding: hour, day of week, month features
- **MultiFactorReasoningLayer**: Attention-based reasoning for multi-factor decisions
  - Separate reasoning paths for: urgency, reliability, distance, health
  - Factor fusion layer to combine reasoning
- **Task-Specific Heads**: 
  - `DonorSelectionHead`: Candidate ranking with cross-attention
  - `UrgencyAssessmentHead`: Classification (low/medium/high/critical) + priority score
  - `InventorySelectionHead`: Source ranking with expiry/distance optimization
  - `TransportPlanningHead`: Method selection + ETA prediction
  - `EligibilityAnalysisHead`: Binary classification + edge case detection
- **ConfidenceEstimator**: Predicts confidence scores for all decisions

### 2. Data Preprocessing (`ml/data/preprocessing.py`)

- Feature extraction from AgentDecision database records
- Normalization/scaling for numerical features
- Categorical encoding (one-hot + embeddings)
- Sequence padding for variable-length candidate lists
- Train/validation/test split with temporal awareness
- Data augmentation for rare cases

### 3. Training Pipeline (`ml/training/train.py`)

- Multi-task loss function (weighted combination per task)
- Optimizer: AdamW with learning rate scheduling
- Early stopping based on validation metrics
- Model checkpointing and versioning
- Training metrics logging (TensorBoard)
- Hyperparameter configuration via YAML

### 4. Dataset Classes (`ml/data/dataset.py`)

- `HaemologixDataset`: PyTorch Dataset for loading training examples
- Supports all 5 task types with dynamic batching
- Handles variable-length candidate lists
- Includes outcome labels for supervised learning

### 5. Model Serving API (`ml/api/server.py`)

- FastAPI service for model inference
- Endpoints:
  - `/predict/donor-selection`: Takes candidates + context, returns selected donor
  - `/predict/urgency-assessment`: Takes stock data, returns urgency + priority
  - `/predict/inventory-selection`: Takes ranked units, returns selected source
  - `/predict/transport-planning`: Takes route data, returns method + ETA
  - `/predict/eligibility-analysis`: Takes donor profile, returns decision
- Model loading and caching
- Request/response validation with Pydantic
- Health check endpoint

### 6. Integration Layer (`lib/ml/modelClient.ts`)

- TypeScript client for calling Python model API
- Replaces OpenRouter calls in `lib/agents/llmReasoning.ts`
- Fallback to external LLM if model unavailable
- Error handling and retry logic
- Type-safe request/response interfaces

### 7. Data Collection (`lib/ml/dataCollection.ts`)

- Collects training examples from agent decisions
- Extracts input features and outcomes
- Stores in format ready for training
- Links to AgentDecision records for traceability

### 8. Configuration Files

- `ml/config/model_config.yaml`: Model architecture hyperparameters
- `ml/config/training_config.yaml`: Training hyperparameters
- `ml/requirements.txt`: Python dependencies
- `.env.ml`: Model server configuration

### 9. Training Scripts

- `ml/scripts/train.py`: Main training entry point
- `ml/scripts/export_data.py`: Export training data from database
- `ml/scripts/evaluate.py`: Model evaluation on test set
- `ml/scripts/export_model.py`: Export trained model for serving

### 10. Database Schema Updates (`prisma/schema.prisma`)

- `TrainingExample` model: Stores training data
- `CustomModel` model: Tracks model versions and metadata
- `ModelPrediction` model: Logs all predictions for feedback loop

## File Structure

```
ml/
├── models/
│   ├── __init__.py
│   ├── haemologix_decision_network.py
│   └── components/
│       ├── feature_encoder.py
│       ├── reasoning_layer.py
│       └── task_heads.py
├── data/
│   ├── __init__.py
│   ├── dataset.py
│   ├── preprocessing.py
│   └── loaders.py
├── training/
│   ├── __init__.py
│   ├── train.py
│   ├── trainer.py
│   └── losses.py
├── api/
│   ├── __init__.py
│   ├── server.py
│   └── schemas.py
├── config/
│   ├── model_config.yaml
│   └── training_config.yaml
├── scripts/
│   ├── train.py
│   ├── export_data.py
│   ├── evaluate.py
│   └── export_model.py
├── utils/
│   ├── __init__.py
│   ├── metrics.py
│   └── logging.py
└── requirements.txt
```

## Implementation Details

### Model Input Format

- Donor Selection: `{candidates: Array<{distance, eta, score, reliability, health}>, alert: {bloodType, urgency, unitsNeeded, location}, context: {timeOfDay, trafficConditions}}`
- Urgency Assessment: `{bloodType, currentUnits, daysRemaining, dailyUsage, hospitalContext, timeOfDay}`
- Inventory Selection: `{rankedUnits: Array<{distance, expiry, quantity, scores}>, request: {bloodType, unitsNeeded, urgency}}`
- Transport Planning: `{fromHospital, toHospital, distanceKm, urgency, bloodType, units, timeOfDay, trafficConditions}`
- Eligibility Analysis: `{donor: {age, weight, bmi, hemoglobin, gender, lastDonation}, eligibilityResult: {passed, failedCriteria, allCriteria}}`

### Model Output Format

- All tasks return: `{decision: <task_specific>, reasoning: string, confidence: float, alternatives?: Array}`
- Reasoning is generated via learned attention weights, not LLM

### Training Data Requirements

- Minimum: 1,000 examples per task type (5,000 total)
- Optimal: 10,000+ examples per task type
- Data from AgentDecision table with outcome tracking
- Labeled with success/failure outcomes

## Integration Points

1. Replace LLM calls in `lib/agents/llmReasoning.ts` with model API calls
2. Add data collection hooks to existing agent decision points
3. Create admin UI for model management (training status, performance metrics)
4. Add model version selection in admin panel

## Dependencies

- Python 3.9+
- PyTorch 2.0+
- FastAPI, Uvicorn
- NumPy, Pandas
- scikit-learn (for preprocessing)
- Pydantic (for validation)