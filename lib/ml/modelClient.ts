/**
 * TypeScript client for calling Python model API
 * Replaces OpenRouter calls in lib/agents/llmReasoning.ts
 * Fallback to external LLM if model unavailable
 */

const ML_API_URL = process.env.ML_API_URL || "http://localhost:8000";

interface ModelPredictionResponse {
  decision: unknown;
  reasoning: string;
  confidence: number;
  alternatives?: unknown[];
}

type JsonRecord = Record<string, unknown>;

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function toFiniteNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value !== "string" || value.trim() === "") return null;

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function parseModelPrediction(value: unknown): ModelPredictionResponse {
  if (
    !isRecord(value) ||
    !("decision" in value) ||
    typeof value.reasoning !== "string" ||
    (value.alternatives !== undefined && !Array.isArray(value.alternatives))
  ) {
    throw new Error("ML API returned an invalid prediction");
  }

  const confidence = toFiniteNumber(value.confidence);
  if (confidence === null) {
    throw new Error("ML API returned an invalid prediction");
  }

  return {
    decision: value.decision,
    reasoning: value.reasoning,
    confidence,
    alternatives: value.alternatives,
  };
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
    historicalPatterns?: JsonRecord;
  };
}

interface UrgencyAssessmentRequest {
  bloodType: string;
  currentUnits: number;
  daysRemaining: number;
  dailyUsage: number;
  hospitalContext?: JsonRecord;
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
  fromHospital: JsonRecord;
  toHospital: JsonRecord;
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
    failedCriteria: JsonRecord[];
    allCriteria: JsonRecord[];
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

    const data: unknown = await response.json();
    return isRecord(data) && data.model_loaded === true;
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
  data: unknown,
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

      return parseModelPrediction(await response.json());
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

