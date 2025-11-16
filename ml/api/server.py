"""FastAPI service for model inference"""

import torch
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from typing import Dict, Any, Optional
import numpy as np
from pathlib import Path
import json
from datetime import datetime

from .schemas import (
    DonorSelectionRequest,
    UrgencyAssessmentRequest,
    InventorySelectionRequest,
    TransportPlanningRequest,
    EligibilityAnalysisRequest,
    PredictionResponse,
)

from models.haemologix_decision_network import HaemologixDecisionNetwork
from data.preprocessing import DataPreprocessor

app = FastAPI(title="Haemologix ML API", version="1.0.0")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify allowed origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global model and preprocessor
model: Optional[HaemologixDecisionNetwork] = None
preprocessor: Optional[DataPreprocessor] = None
device = "cuda" if torch.cuda.is_available() else "cpu"


def load_model(model_path: str):
    """Load trained model from checkpoint"""
    global model, preprocessor

    checkpoint = torch.load(model_path, map_location=device)
    config = checkpoint.get("config", {})

    model = HaemologixDecisionNetwork(**config)
    model.load_state_dict(checkpoint["model_state_dict"])
    model.to(device)
    model.eval()

    preprocessor = DataPreprocessor()
    print(f"Model loaded from {model_path}")


@app.on_event("startup")
async def startup_event():
    """Load model on startup"""
    # In production, load from config or environment variable
    model_path = Path("ml/checkpoints/best_model.pt")
    if model_path.exists():
        load_model(str(model_path))
    else:
        print("Warning: No model checkpoint found. Please train a model first.")


@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "model_loaded": model is not None,
        "device": device,
    }


@app.post("/predict/donor-selection", response_model=PredictionResponse)
async def predict_donor_selection(request: DonorSelectionRequest):
    """Takes candidates + context, returns selected donor"""
    if model is None:
        raise HTTPException(status_code=503, detail="Model not loaded")

    try:
        # Prepare input features
        numerical_features = np.array([
            float(request.alert.get("unitsNeeded", 1)),
            float(request.alert.get("searchRadius", 10)),
            datetime.now().hour,
            datetime.now().weekday(),
            datetime.now().month,
        ], dtype=np.float32)

        # Encode categorical
        blood_type = request.alert.get("bloodType", "O+")
        urgency = request.alert.get("urgency", "MEDIUM")
        blood_type_idx = preprocessor.blood_type_encoder.transform([blood_type])[0]
        urgency_idx = preprocessor.urgency_encoder.transform([urgency])[0]

        # Prepare candidate features
        candidate_features = np.array([
            [c.distance, c.eta, c.score, c.reliability, c.health]
            for c in request.candidates
        ], dtype=np.float32)

        # Convert to tensors
        numerical_tensor = torch.tensor(numerical_features, dtype=torch.float32).unsqueeze(0).to(device)
        blood_type_tensor = torch.tensor([blood_type_idx], dtype=torch.long).to(device)
        urgency_tensor = torch.tensor([urgency_idx], dtype=torch.long).to(device)
        candidate_tensor = torch.tensor(candidate_features, dtype=torch.float32).unsqueeze(0).to(device)

        time_features = {
            "hour": torch.tensor([datetime.now().hour], dtype=torch.float32).to(device),
            "day_of_week": torch.tensor([datetime.now().weekday()], dtype=torch.float32).to(device),
            "month": torch.tensor([datetime.now().month], dtype=torch.float32).to(device),
        }

        # Predict
        with torch.no_grad():
            output = model(
                task_type="donor_selection",
                numerical_features=numerical_tensor,
                blood_type_idx=blood_type_tensor,
                urgency_idx=urgency_tensor,
                time_features=time_features,
                candidate_features=candidate_tensor,
            )

        selected_idx = output["selected_idx"].item()
        confidence = output["confidence"].item()
        reasoning = model.generate_reasoning(output["attention_weights"], "donor_selection")

        return PredictionResponse(
            decision={
                "selected_index": selected_idx,
                "selected_donor": request.candidates[selected_idx].dict(),
            },
            reasoning=reasoning,
            confidence=confidence,
        )

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/predict/urgency-assessment", response_model=PredictionResponse)
async def predict_urgency_assessment(request: UrgencyAssessmentRequest):
    """Takes stock data, returns urgency + priority"""
    if model is None:
        raise HTTPException(status_code=503, detail="Model not loaded")

    try:
        # Prepare features
        numerical_features = np.array([
            request.currentUnits,
            request.daysRemaining,
            request.dailyUsage,
            datetime.now().hour,
            datetime.now().weekday(),
            datetime.now().month,
        ], dtype=np.float32)

        blood_type_idx = preprocessor.blood_type_encoder.transform([request.bloodType])[0]
        urgency_idx = preprocessor.urgency_encoder.transform(["MEDIUM"])[0]  # Default

        numerical_tensor = torch.tensor(numerical_features, dtype=torch.float32).unsqueeze(0).to(device)
        blood_type_tensor = torch.tensor([blood_type_idx], dtype=torch.long).to(device)
        urgency_tensor = torch.tensor([urgency_idx], dtype=torch.long).to(device)

        time_features = {
            "hour": torch.tensor([datetime.now().hour], dtype=torch.float32).to(device),
            "day_of_week": torch.tensor([datetime.now().weekday()], dtype=torch.float32).to(device),
            "month": torch.tensor([datetime.now().month], dtype=torch.float32).to(device),
        }

        with torch.no_grad():
            output = model(
                task_type="urgency_assessment",
                numerical_features=numerical_tensor,
                blood_type_idx=blood_type_tensor,
                urgency_idx=urgency_tensor,
                time_features=time_features,
            )

        urgency_class = output["urgency_class"].item()
        urgency_levels = ["LOW", "MEDIUM", "HIGH", "CRITICAL"]
        urgency = urgency_levels[urgency_class]
        priority_score = output["priority_score"].item()
        confidence = output["confidence"].item()
        reasoning = model.generate_reasoning(output["attention_weights"], "urgency_assessment")

        return PredictionResponse(
            decision={
                "urgency": urgency,
                "priority_score": priority_score,
            },
            reasoning=reasoning,
            confidence=confidence,
        )

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/predict/inventory-selection", response_model=PredictionResponse)
async def predict_inventory_selection(request: InventorySelectionRequest):
    """Takes ranked units, returns selected source"""
    if model is None:
        raise HTTPException(status_code=503, detail="Model not loaded")

    try:
        # Prepare features
        numerical_features = np.array([
            request.request.get("unitsNeeded", 1),
            datetime.now().hour,
            datetime.now().weekday(),
            datetime.now().month,
        ], dtype=np.float32)

        blood_type = request.request.get("bloodType", "O+")
        urgency = request.request.get("urgency", "MEDIUM")
        blood_type_idx = preprocessor.blood_type_encoder.transform([blood_type])[0]
        urgency_idx = preprocessor.urgency_encoder.transform([urgency])[0]

        source_features = np.array([
            [u.distance, u.expiry, u.quantity, u.scores.get("final", 0)]
            for u in request.rankedUnits
        ], dtype=np.float32)

        numerical_tensor = torch.tensor(numerical_features, dtype=torch.float32).unsqueeze(0).to(device)
        blood_type_tensor = torch.tensor([blood_type_idx], dtype=torch.long).to(device)
        urgency_tensor = torch.tensor([urgency_idx], dtype=torch.long).to(device)
        source_tensor = torch.tensor(source_features, dtype=torch.float32).unsqueeze(0).to(device)

        time_features = {
            "hour": torch.tensor([datetime.now().hour], dtype=torch.float32).to(device),
            "day_of_week": torch.tensor([datetime.now().weekday()], dtype=torch.float32).to(device),
            "month": torch.tensor([datetime.now().month], dtype=torch.float32).to(device),
        }

        with torch.no_grad():
            output = model(
                task_type="inventory_selection",
                numerical_features=numerical_tensor,
                blood_type_idx=blood_type_tensor,
                urgency_idx=urgency_tensor,
                time_features=time_features,
                source_features=source_tensor,
            )

        selected_idx = output["selected_idx"].item()
        confidence = output["confidence"].item()
        reasoning = model.generate_reasoning(output["attention_weights"], "inventory_selection")

        return PredictionResponse(
            decision={
                "selected_index": selected_idx,
                "selected_source": request.rankedUnits[selected_idx].dict(),
            },
            reasoning=reasoning,
            confidence=confidence,
        )

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/predict/transport-planning", response_model=PredictionResponse)
async def predict_transport_planning(request: TransportPlanningRequest):
    """Takes route data, returns method + ETA"""
    if model is None:
        raise HTTPException(status_code=503, detail="Model not loaded")

    try:
        numerical_features = np.array([
            request.distanceKm,
            request.units,
            datetime.now().hour,
            datetime.now().weekday(),
            datetime.now().month,
        ], dtype=np.float32)

        blood_type_idx = preprocessor.blood_type_encoder.transform([request.bloodType])[0]
        urgency_idx = preprocessor.urgency_encoder.transform([request.urgency])[0]

        numerical_tensor = torch.tensor(numerical_features, dtype=torch.float32).unsqueeze(0).to(device)
        blood_type_tensor = torch.tensor([blood_type_idx], dtype=torch.long).to(device)
        urgency_tensor = torch.tensor([urgency_idx], dtype=torch.long).to(device)

        time_features = {
            "hour": torch.tensor([datetime.now().hour], dtype=torch.float32).to(device),
            "day_of_week": torch.tensor([datetime.now().weekday()], dtype=torch.float32).to(device),
            "month": torch.tensor([datetime.now().month], dtype=torch.float32).to(device),
        }

        with torch.no_grad():
            output = model(
                task_type="transport_planning",
                numerical_features=numerical_tensor,
                blood_type_idx=blood_type_tensor,
                urgency_idx=urgency_tensor,
                time_features=time_features,
            )

        method_idx = output["method"].item()
        methods = ["ambulance", "courier", "scheduled"]
        method = methods[method_idx]
        eta_minutes = output["eta_minutes"].item()
        cold_chain_compliant = bool(output["cold_chain_compliant"].item())
        confidence = output["confidence"].item()
        reasoning = model.generate_reasoning(output["attention_weights"], "transport_planning")

        return PredictionResponse(
            decision={
                "method": method,
                "eta_minutes": eta_minutes,
                "cold_chain_compliant": cold_chain_compliant,
            },
            reasoning=reasoning,
            confidence=confidence,
        )

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/predict/eligibility-analysis", response_model=PredictionResponse)
async def predict_eligibility_analysis(request: EligibilityAnalysisRequest):
    """Takes donor profile, returns decision"""
    if model is None:
        raise HTTPException(status_code=503, detail="Model not loaded")

    try:
        numerical_features = np.array([
            request.donor.age,
            request.donor.weight,
            request.donor.bmi,
            request.donor.hemoglobin,
            request.donor.lastDonation or 365,
            datetime.now().hour,
            datetime.now().weekday(),
            datetime.now().month,
        ], dtype=np.float32)

        # Default blood type and urgency for eligibility
        blood_type_idx = preprocessor.blood_type_encoder.transform(["O+"])[0]
        urgency_idx = preprocessor.urgency_encoder.transform(["MEDIUM"])[0]

        numerical_tensor = torch.tensor(numerical_features, dtype=torch.float32).unsqueeze(0).to(device)
        blood_type_tensor = torch.tensor([blood_type_idx], dtype=torch.long).to(device)
        urgency_tensor = torch.tensor([urgency_idx], dtype=torch.long).to(device)

        time_features = {
            "hour": torch.tensor([datetime.now().hour], dtype=torch.float32).to(device),
            "day_of_week": torch.tensor([datetime.now().weekday()], dtype=torch.float32).to(device),
            "month": torch.tensor([datetime.now().month], dtype=torch.float32).to(device),
        }

        with torch.no_grad():
            output = model(
                task_type="eligibility_analysis",
                numerical_features=numerical_tensor,
                blood_type_idx=blood_type_tensor,
                urgency_idx=urgency_tensor,
                time_features=time_features,
            )

        eligible = bool(output["eligible"].item())
        eligible_prob = output["eligible_prob"].item()
        edge_case_prob = output["edge_case_prob"].item()
        confidence = output["confidence"].item()
        reasoning = model.generate_reasoning(output["attention_weights"], "eligibility_analysis")

        return PredictionResponse(
            decision={
                "eligible": eligible,
                "eligible_probability": eligible_prob,
                "edge_case_probability": edge_case_prob,
            },
            reasoning=reasoning,
            confidence=confidence,
        )

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

