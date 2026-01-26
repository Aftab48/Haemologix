# Data Export and Training Guide

## Quick Start

### 1. Export Data from Database to JSON

Export all task types (recommended):
```bash
npm run export:data
```

Export specific task type:
```bash
npm run export:data -- --task-type donor_selection
```

Export without train/val split:
```bash
npm run export:data -- --no-split
```

Custom output directory:
```bash
npm run export:data -- --output ml/data/custom
```

### 2. Verify Exported Files

After exporting, you should see JSON files in `ml/data/`:
- `donor_selection_train.json` (160 examples)
- `donor_selection_val.json` (40 examples)
- `urgency_assessment_train.json`
- `urgency_assessment_val.json`
- `inventory_selection_train.json`
- `inventory_selection_val.json`
- `transport_planning_train.json`
- `transport_planning_val.json`
- `eligibility_analysis_train.json`
- `eligibility_analysis_val.json`

### 3. Start Training

Make sure Python environment is set up:
```bash
cd ml
# Windows
.\setup.bat

# Linux/Mac
./setup.sh
```

Train a model:
```bash
python ml/scripts/train.py
```

The training script will:
- Load data from `ml/data/{task_type}_train.json` and `ml/data/{task_type}_val.json`
- Use the task type specified in `ml/config/training_config.yaml`
- Save checkpoints to `ml/checkpoints/`

### 4. Change Task Type

Edit `ml/config/training_config.yaml`:
```yaml
task_type: "donor_selection"  # Change to: urgency_assessment, inventory_selection, etc.
```

## Export Script Options

```bash
npm run export:data [options]

Options:
  --task-type <type>     Export specific task type only
  --output <dir>         Custom output directory (default: ml/data)
  --no-split             Don't split into train/val sets
  --train-ratio <ratio>  Train split ratio (default: 0.8)
```

## Data Format

The exported JSON files contain training examples in this format:

```json
[
  {
    "id": "uuid",
    "taskType": "donor_selection",
    "inputFeatures": {
      "candidates": [...],
      "alert": {...},
      "context": {...}
    },
    "outputLabel": {
      "selected_index": 0,
      "selected_donor": {...}
    },
    "outcome": {
      "success": true,
      "donorArrived": true,
      "timeToArrival": 45
    },
    "agentDecisionId": "uuid",
    "requestId": "uuid",
    "createdAt": "2024-01-01T00:00:00.000Z"
  }
]
```

## Notes

- Exported examples are automatically marked as `usedForTraining: true` in the database
- To regenerate data, run `npm run generate:data` again
- The export script creates train/val split with 80/20 ratio by default
- Training examples are sorted by `createdAt` for consistent splits

