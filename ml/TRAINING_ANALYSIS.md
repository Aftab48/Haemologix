# Training Analysis & Next Steps

## Current Status

### Training Results
- ✅ Training completed 50 epochs successfully
- ✅ Model checkpoints saved
- ⚠️ Validation loss constant at 2.0820 (not improving)
- ⚠️ Model accuracy: 15% (top-1), 30% (top-3)

### Key Findings

1. **Model Not Differentiating Candidates**
   - All candidates receive nearly identical scores
   - Example: All 10 candidates scored -0.4896
   - Model is essentially making uniform predictions

2. **Validation Loss Constant**
   - Small validation set (40 examples)
   - Model predictions are too similar across epochs
   - Loss averaging to same value

3. **Low Accuracy**
   - 15% accuracy means model is mostly guessing
   - Top-3 accuracy (30%) shows some learning but limited

## Root Causes

### 1. Model Architecture Issues
- Candidate encoder might not be learning meaningful features
- Attention mechanism may not be working effectively
- Feature fusion might be losing important information

### 2. Loss Function
- Cross-entropy loss might not be encouraging enough differentiation
- Need to ensure model learns to rank candidates properly

### 3. Training Data
- 100 examples might be too small
- Data might not have enough variation
- Labels might not be optimal

### 4. Training Configuration
- Learning rate might need adjustment
- Batch size (25) might be too large for 100 examples
- Need more epochs or better scheduling

## Recommended Improvements

### Immediate Actions

1. **Increase Training Data**
   ```bash
   # Generate more synthetic data
   npm run generate:data
   # Export more examples
   npm run export:data
   ```

2. **Adjust Learning Rate**
   - Try higher learning rate (0.01) initially
   - Use learning rate finder or warmup

3. **Improve Loss Function**
   - Add ranking loss (contrastive or margin-based)
   - Weight loss to encourage differentiation

4. **Model Architecture Tweaks**
   - Increase model capacity if needed
   - Add batch normalization
   - Improve candidate feature encoding

### Next Training Run

1. **Generate More Data**
   - Target: 500-1000 training examples
   - Ensure good distribution of scenarios

2. **Hyperparameter Tuning**
   - Learning rate: Try 0.001, 0.01, 0.0001
   - Batch size: Try 8, 16, 32
   - Dropout: Adjust between 0.1-0.3

3. **Add Ranking Loss**
   - Implement margin-based ranking loss
   - Encourage larger score differences between candidates

4. **Monitor Training**
   - Watch for score differentiation
   - Track accuracy improvement
   - Monitor gradient norms

## Evaluation Tools

### Run Evaluation
```bash
cd ml
python scripts/evaluate.py --checkpoint checkpoints/best_model.pt --data data/donor_selection_val.json --task-type donor_selection
```

### Inspect Predictions
```bash
cd ml
python scripts/inspect_predictions.py --checkpoint checkpoints/best_model.pt --data data/donor_selection_val.json --task-type donor_selection --num-samples 10
```

## Success Metrics

Model is learning when:
- ✅ Candidate scores show clear differentiation (>0.1 difference)
- ✅ Validation loss decreases over epochs
- ✅ Accuracy improves above 30-40%
- ✅ Top-3 accuracy improves above 50-60%

## Next Steps

1. Generate more training data (500+ examples)
2. Implement ranking loss for better differentiation
3. Adjust hyperparameters (learning rate, batch size)
4. Re-train with improved configuration
5. Monitor score differentiation during training

