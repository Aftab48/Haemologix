/**
 * TypeScript client for calling Python model API
 * Replaces OpenRouter calls in lib/agents/llmReasoning.ts
 * Fallback to external LLM if model unavailable
 */

const ML_API_URL = process.env.ML_API_URL || "http://localhost:8000";

interface ModelPredictionResponse {
  decision: any;
  reasoning: string;
  confidence: number;
  alternatives?: any[];
}

interface DonorSelectionRequest {
  candidates: Array<{
    distance: number;
    eta: number;
    score: number;
    reliability: number;
    health: number;
  }>;
  alert: {
    bloodType: string;
    urgency: string;
    unitsNeeded: number;
    location?: { latitude: number; longitude: number };
  };
  context?: {
    timeOfDay?: string;
    trafficConditions?: string;
    historicalPatterns?: any;
  };
}

interface UrgencyAssessmentRequest {
  bloodType: string;
  currentUnits: number;
  daysRemaining: number;
  dailyUsage: number;
  hospitalContext?: any;
  timeOfDay?: string;
}

interface InventorySelectionRequest {
  rankedUnits: Array<{
    distance: number;
    expiry: number;
    quantity: number;
    scores: { [key: string]: number };
  }>;
  request: {
    bloodType: string;
    unitsNeeded: number;
    urgency: string;
  };
}

interface TransportPlanningRequest {
  fromHospital: any;
  toHospital: any;
  distanceKm: number;
  urgency: string;
  bloodType: string;
  units: number;
  timeOfDay: string;
  trafficConditions?: string;
}

interface EligibilityAnalysisRequest {
  donor: {
    age: number;
    weight: number;
    bmi: number;
    hemoglobin: number;
    gender: string;
    lastDonation?: number;
  };
  eligibilityResult: {
    passed: boolean;
    failedCriteria: any[];
    allCriteria: any[];
  };
}

/**
 * Check if ML API is available
 */
async function checkMLApiHealth(): Promise<boolean> {
  try {
    const response = await fetch(`${ML_API_URL}/health`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
      signal: AbortSignal.timeout(5000), // 5 second timeout
    });

    if (!response.ok) {
      return false;
    }

    const data = await response.json();
    return data.model_loaded === true;
  } catch (error) {
    console.warn("[ModelClient] ML API health check failed:", error);
    return false;
  }
}

/**
 * Call ML API with retry logic
 */
async function callMLApi(
  endpoint: string,
  data: any,
  retries: number = 2
): Promise<ModelPredictionResponse | null> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const response = await fetch(`${ML_API_URL}${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        signal: AbortSignal.timeout(10000), // 10 second timeout
      });

      if (!response.ok) {
        if (attempt < retries) {
          await new Promise((resolve) => setTimeout(resolve, 1000 * (attempt + 1)));
          continue;
        }
        throw new Error(`ML API error: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      if (attempt < retries) {
        console.warn(
          `[ModelClient] Attempt ${attempt + 1} failed, retrying...`,
          error
        );
        await new Promise((resolve) => setTimeout(resolve, 1000 * (attempt + 1)));
        continue;
      }
      console.error("[ModelClient] All retry attempts failed:", error);
      return null;
    }
  }
  return null;
}

/**
 * Predict donor selection using ML model
 */
export async function predictDonorSelection(
  request: DonorSelectionRequest
): Promise<ModelPredictionResponse | null> {
  return await callMLApi("/predict/donor-selection", request);
}

/**
 * Predict urgency assessment using ML model
 */
export async function predictUrgencyAssessment(
  request: UrgencyAssessmentRequest
): Promise<ModelPredictionResponse | null> {
  return await callMLApi("/predict/urgency-assessment", request);
}

/**
 * Predict inventory selection using ML model
 */
export async function predictInventorySelection(
  request: InventorySelectionRequest
): Promise<ModelPredictionResponse | null> {
  return await callMLApi("/predict/inventory-selection", request);
}

/**
 * Predict transport planning using ML model
 */
export async function predictTransportPlanning(
  request: TransportPlanningRequest
): Promise<ModelPredictionResponse | null> {
  return await callMLApi("/predict/transport-planning", request);
}

/**
 * Predict eligibility analysis using ML model
 */
export async function predictEligibilityAnalysis(
  request: EligibilityAnalysisRequest
): Promise<ModelPredictionResponse | null> {
  return await callMLApi("/predict/eligibility-analysis", request);
}

/**
 * Check if ML model is available and ready
 */
export async function isMLModelAvailable(): Promise<boolean> {
  return await checkMLApiHealth();
}

