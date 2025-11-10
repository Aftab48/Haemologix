"""Pydantic schemas for API request/response validation"""

from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any, Literal


# Donor Selection
class Candidate(BaseModel):
    distance: float
    eta: float
    score: float
    reliability: float
    health: float


class DonorSelectionRequest(BaseModel):
    candidates: List[Candidate]
    alert: Dict[str, Any] = Field(..., description="Alert context with bloodType, urgency, unitsNeeded, location")
    context: Dict[str, Any] = Field(default_factory=dict, description="Time of day, traffic conditions, etc.")


# Urgency Assessment
class UrgencyAssessmentRequest(BaseModel):
    bloodType: str
    currentUnits: int
    daysRemaining: float
    dailyUsage: float
    hospitalContext: Optional[Dict[str, Any]] = None
    timeOfDay: Optional[str] = None


# Inventory Selection
class RankedUnit(BaseModel):
    distance: float
    expiry: float
    quantity: int
    scores: Dict[str, float]


class InventorySelectionRequest(BaseModel):
    rankedUnits: List[RankedUnit]
    request: Dict[str, Any] = Field(..., description="bloodType, unitsNeeded, urgency")


# Transport Planning
class TransportPlanningRequest(BaseModel):
    fromHospital: Dict[str, Any]
    toHospital: Dict[str, Any]
    distanceKm: float
    urgency: str
    bloodType: str
    units: int
    timeOfDay: str
    trafficConditions: Optional[str] = None


# Eligibility Analysis
class DonorProfile(BaseModel):
    age: float
    weight: float
    bmi: float
    hemoglobin: float
    gender: str
    lastDonation: Optional[float] = None


class EligibilityAnalysisRequest(BaseModel):
    donor: DonorProfile
    eligibilityResult: Dict[str, Any] = Field(..., description="passed, failedCriteria, allCriteria")


# Common Response
class PredictionResponse(BaseModel):
    decision: Dict[str, Any]
    reasoning: str
    confidence: float
    alternatives: Optional[List[Dict[str, Any]]] = None

