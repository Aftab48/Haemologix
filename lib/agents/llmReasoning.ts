import type { DonorRegistration, HospitalRegistration } from "@prisma/client";
import type { MatchedDonor } from "./coordinatorAgent";
import type { RankedInventoryUnit } from "./inventoryAgent";
import type { EligibilityCheckResult } from "./verificationAgent";

type JsonRecord = Record<string, unknown>;

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parseJsonRecord(value: string): JsonRecord {
  const parsed: unknown = JSON.parse(value);
  if (!isRecord(parsed)) {
    throw new Error("LLM returned a non-object JSON response");
  }
  return parsed;
}

function getString(
  record: JsonRecord,
  key: string,
  fallback: string
): string {
  return typeof record[key] === "string" ? record[key] : fallback;
}

function getNumber(
  record: JsonRecord,
  key: string,
  fallback: number
): number {
  const value = record[key];
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  }
  return fallback;
}

function getBoolean(
  record: JsonRecord,
  key: string,
  fallback: boolean
): boolean {
  return typeof record[key] === "boolean" ? record[key] : fallback;
}

function getStringArray(record: JsonRecord, key: string): string[] {
  const value = record[key];
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
}

function normalizeUrgency(
  value: string
): "low" | "medium" | "high" | "critical" {
  switch (value.trim().toLowerCase()) {
    case "low":
      return "low";
    case "medium":
      return "medium";
    case "high":
      return "high";
    case "critical":
      return "critical";
    default:
      return "medium";
  }
}

function getMessageText(value: unknown): string | null {
  if (typeof value === "string") return value;
  if (!Array.isArray(value)) return null;

  const parts = value.flatMap((part) =>
    isRecord(part) && typeof part.text === "string" ? [part.text] : []
  );
  return parts.length > 0 ? parts.join("") : null;
}

interface ReasoningRequest {
  context: unknown;
  prompt: string;
  temperature?: number;
  responseFormat?: "json" | "text";
  systemPrompt?: string;
}

interface ReasoningResponse {
  reasoning: string;
  decision?: JsonRecord | null;
  confidence?: number;
  model_used: string;
}

interface LLMConfig {
  model: string;
  baseUrl: string;
  apiKey: string;
  maxTokens: number;
}

// OpenRouter Configuration
const LLM_CONFIG: LLMConfig = {
  model: "anthropic/claude-sonnet-4.5",
  baseUrl: "https://openrouter.ai/api/v1",
  apiKey: process.env.OPENROUTER_API_KEY || "",
  maxTokens: 150000,
};

// Fallback model configuration
const FALLBACK_MODEL = "openai/gpt-4o-mini";

/**
 * Call LLM via OpenRouter
 */
async function callLLM(
  prompt: string,
  options: {
    temperature?: number;
    responseFormat?: "json" | "text";
    systemPrompt?: string;
    model?: string;
  } = {}
): Promise<string> {
  if (!LLM_CONFIG.apiKey) {
    throw new Error("OPENROUTER_API_KEY not configured");
  }

  const model = options.model || LLM_CONFIG.model;
  const systemPrompt =
    options.systemPrompt ||
    "You are an intelligent blood donation coordinator agent. Analyze scenarios carefully, consider all factors, and provide clear, reasoned decisions with explanations.";

  const response = await fetch(`${LLM_CONFIG.baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${LLM_CONFIG.apiKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer":
        process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
      "X-Title": "Haemologix Agentic AI",
    },
    body: JSON.stringify({
      model: model,
      messages: [
        {
          role: "system",
          content: systemPrompt,
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      temperature: options.temperature ?? 0.3,
      max_tokens: LLM_CONFIG.maxTokens,
      ...(options.responseFormat === "json" && {
        response_format: { type: "json_object" },
      }),
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`LLM API error: ${response.status} - ${error}`);
  }

  const data: unknown = await response.json();
  if (!isRecord(data) || !Array.isArray(data.choices)) {
    throw new Error("LLM API returned an invalid response");
  }
  const firstChoice = data.choices[0];
  if (!isRecord(firstChoice) || !isRecord(firstChoice.message)) {
    throw new Error("LLM API response is missing a message");
  }
  const content = getMessageText(firstChoice.message.content);
  if (content === null) {
    throw new Error("LLM API response message has no text content");
  }
  return content;
}

/**
 * Main reasoning function
 * Tries Claude Sonnet 4.5 first, falls back to GPT-4o mini if it fails
 */
export async function reasonAboutDecision(
  request: ReasoningRequest
): Promise<ReasoningResponse> {
  // First, try Claude Sonnet 4.5
  try {
    console.log(
      "[LLM Reasoning] Processing decision with Claude Sonnet 4.5..."
    );

    const response = await callLLM(request.prompt, {
      temperature: request.temperature,
      responseFormat: request.responseFormat,
      systemPrompt: request.systemPrompt,
      model: LLM_CONFIG.model,
    });

    let parsed: JsonRecord;
    if (request.responseFormat === "json") {
      try {
        parsed = parseJsonRecord(response);
      } catch {
        // If JSON parsing fails, wrap the response
        parsed = { reasoning: response };
      }
    } else {
      parsed = { reasoning: response };
    }

    return {
      reasoning: getString(parsed, "reasoning", response),
      decision: isRecord(parsed.decision) ? parsed.decision : parsed,
      confidence: getNumber(parsed, "confidence", 0.8),
      model_used: "claude-4.5",
    };
  } catch (error) {
    console.warn(
      "[LLM Reasoning] Claude Sonnet 4.5 failed, trying GPT-4o mini fallback...",
      error instanceof Error ? error.message : "Unknown error"
    );

    // Fallback to GPT-4o mini
    try {
      console.log("[LLM Reasoning] Processing decision with GPT-4o mini...");

      const response = await callLLM(request.prompt, {
        temperature: request.temperature,
        responseFormat: request.responseFormat,
        systemPrompt: request.systemPrompt,
        model: FALLBACK_MODEL,
      });

      let parsed: JsonRecord;
      if (request.responseFormat === "json") {
        try {
          parsed = parseJsonRecord(response);
        } catch {
          // If JSON parsing fails, wrap the response
          parsed = { reasoning: response };
        }
      } else {
        parsed = { reasoning: response };
      }

      console.log("[LLM Reasoning] GPT-4o mini fallback succeeded");

      return {
        reasoning: getString(parsed, "reasoning", response),
        decision: isRecord(parsed.decision) ? parsed.decision : parsed,
        confidence: getNumber(parsed, "confidence", 0.75), // Slightly lower confidence for fallback
        model_used: "gpt-4o-mini",
      };
    } catch (fallbackError) {
      console.error("[LLM Reasoning] Both models failed:", fallbackError);
      // Fallback to basic reasoning if both LLMs fail
      return {
        reasoning: `LLM reasoning unavailable: ${
          fallbackError instanceof Error
            ? fallbackError.message
            : "Unknown error"
        }. Using algorithmic fallback.`,
        decision: null,
        confidence: 0.5,
        model_used: "fallback",
      };
    }
  }
}

/**
 * Reason about donor selection with full context
 */
interface DonorSelectionCandidate extends MatchedDonor {
  firstName?: string;
  lastName?: string;
  reliability_rate?: number;
  health_score?: number;
  lastDonationDays?: number;
}

interface DonorSelectionAlert {
  bloodType: string;
  unitsNeeded: string | number;
  latitude: string | null;
  longitude: string | null;
}

export async function reasonAboutDonorSelection(
  candidates: DonorSelectionCandidate[],
  alert: DonorSelectionAlert,
  context: {
    urgency: string;
    timeOfDay: string;
    historicalPatterns?: unknown;
    trafficConditions?: string;
  }
): Promise<{
  selectedDonor: DonorSelectionCandidate;
  reasoning: string;
  confidence: number;
  alternatives?: string[];
  model_used: string;
}> {
  const prompt = `You are a blood donation coordinator agent. Analyze this scenario and select the optimal donor:

CANDIDATES:
${candidates
  .map(
    (d, i) => `
${i + 1}. ${d.donor_name || d.firstName + " " + d.lastName}
   - Distance: ${d.distance_km}km
   - ETA: ${d.eta_minutes} minutes
   - Match Score: ${d.match_score || d.score}/100
   - Reliability: ${((d.reliability_rate || 0.5) * 100).toFixed(1)}%
   - Health Status: ${d.health_score || "N/A"}/100
   - Last Donation: ${d.lastDonationDays || "N/A"} days ago
`
  )
  .join("\n")}

ALERT CONTEXT:
- Blood Type: ${alert.bloodType}
- Urgency: ${context.urgency}
- Units Needed: ${alert.unitsNeeded || 1}
- Time: ${context.timeOfDay}
- Location: ${alert.latitude}, ${alert.longitude}
${context.trafficConditions ? `- Traffic: ${context.trafficConditions}` : ""}

${
  context.historicalPatterns
    ? `HISTORICAL PATTERNS:\n${JSON.stringify(
        context.historicalPatterns,
        null,
        2
      )}`
    : ""
}

ANALYSIS REQUIRED:
Consider all factors holistically:
1. Medical urgency (CRITICAL needs fastest response, even if not perfect match)
2. Donor reliability (past no-shows are critical - unreliable donors waste time)
3. Distance vs time trade-offs (closer isn't always faster due to traffic, transport mode)
4. Time of day (traffic patterns, donor availability, hospital shift changes)
5. Overall match quality (health, eligibility, compatibility)
6. Historical patterns (which donors consistently perform well)

Think step-by-step:
- What's the true urgency? (CRITICAL = minutes matter, HIGH = hours matter)
- Which donor can actually arrive fastest considering ALL factors?
- Which donor is most reliable (won't no-show)?
- What are the risks of each choice?

Respond in JSON format:
{
  "selected_index": 0,
  "reasoning": "Detailed step-by-step explanation of why this donor is optimal, considering all factors. Be specific about trade-offs considered.",
  "confidence": 0.95,
  "alternative_considerations": "What other options were seriously considered and why they were rejected",
  "risk_factors": "Any concerns about this selection and how they're mitigated",
  "expected_outcome": "What you expect to happen with this selection"
}`;

  const result = await reasonAboutDecision({
    context: { candidates, alert, context },
    prompt,
    temperature: 0.3,
    responseFormat: "json",
    systemPrompt:
      "You are an expert blood donation coordinator with years of experience. You make life-or-death decisions and must consider all factors carefully.",
  });

  const decision =
    result.decision ||
    (typeof result.reasoning === "string"
      ? parseJsonRecord(result.reasoning)
      : {});
  const selectedIndex = getNumber(decision, "selected_index", 0);
  const alternativeConsiderations = getString(
    decision,
    "alternative_considerations",
    ""
  );

  return {
    selectedDonor: candidates[selectedIndex] || candidates[0],
    reasoning: getString(decision, "reasoning", result.reasoning),
    confidence: getNumber(
      decision,
      "confidence",
      result.confidence || 0.8
    ),
    alternatives: alternativeConsiderations
      ? [alternativeConsiderations]
      : undefined,
    model_used: result.model_used,
  };
}

/**
 * Reason about urgency assessment
 */
export async function reasonAboutUrgency(context: {
  bloodType: string;
  currentUnits: number;
  daysRemaining: number;
  dailyUsage: number;
  hospitalContext?: Pick<
    HospitalRegistration,
    "hospitalName" | "operationalStatus"
  >;
  timeOfDay?: string;
}): Promise<{
  urgency: "low" | "medium" | "high" | "critical";
  reasoning: string;
  priorityScore: number;
  recommendedAction: string;
}> {
  const prompt = `Assess the urgency of this blood shortage:

CONTEXT:
- Blood Type: ${context.bloodType}
- Current Units: ${context.currentUnits}
- Days Remaining: ${context.daysRemaining.toFixed(1)}
- Daily Usage: ${context.dailyUsage}
- Time: ${context.timeOfDay || new Date().toLocaleTimeString()}

${
  context.hospitalContext
    ? `HOSPITAL CONTEXT:\n${JSON.stringify(context.hospitalContext, null, 2)}`
    : ""
}

BLOOD TYPE RARITY:
- O-: Universal donor, extremely critical
- AB-: Rarest type, very critical
- O+: Most common, less critical
- Others: Vary by rarity

URGENCY LEVELS:
- CRITICAL: Immediate life-threatening shortage (< 1 day or 0 units)
- HIGH: Severe shortage (< 2 days or rare type < 3 days)
- MEDIUM: Moderate shortage (< 3 days)
- LOW: Early warning (< 5 days)

Consider:
1. Blood type rarity (O- and AB- are critical even with moderate stock)
2. Current stock level (0 units = critical regardless)
3. Consumption rate (high usage = higher urgency)
4. Time of day (night/weekend = fewer backup options)
5. Hospital capacity (large hospital = more patients at risk)

Respond in JSON:
{
  "urgency": "critical|high|medium|low",
  "reasoning": "Detailed explanation of urgency assessment considering all factors",
  "priority_score": 95,
  "recommended_action": "Specific action to take (e.g., 'Immediate donor notification within 5km radius')"
}`;

  const result = await reasonAboutDecision({
    context,
    prompt,
    temperature: 0.2, // Lower temperature for more consistent urgency assessment
    responseFormat: "json",
  });

  const decision = result.decision || parseJsonRecord(result.reasoning);

  return {
    urgency: normalizeUrgency(getString(decision, "urgency", "medium")),
    reasoning: getString(decision, "reasoning", result.reasoning),
    priorityScore: getNumber(decision, "priority_score", 50),
    recommendedAction: getString(
      decision,
      "recommended_action",
      "Monitor and prepare"
    ),
  };
}

/**
 * Reason about inventory source selection
 */
export async function reasonAboutInventorySelection(
  rankedUnits: RankedInventoryUnit[],
  request: {
    bloodType: string;
    unitsNeeded: number;
    urgency: string;
    requestingHospital?:
      | Pick<HospitalRegistration, "hospitalName">
      | null;
  }
): Promise<{
  selectedSource: RankedInventoryUnit;
  reasoning: string;
  confidence: number;
  transportStrategy: string;
}> {
  const prompt = `Select the optimal blood inventory source:

AVAILABLE SOURCES:
${rankedUnits
  .slice(0, 10)
  .map(
    (unit, i) => `
${i + 1}. ${unit.hospital_name}
   - Distance: ${unit.distance_km}km
   - Units Available: ${unit.units_available}
   - Expiry: ${unit.expiry_date}
   - Proximity Score: ${unit.scores.proximity}/100
   - Expiry Score: ${unit.scores.expiry}/100
   - Quantity Score: ${unit.scores.quantity}/100
   - Final Score: ${unit.scores.final}/100
`
  )
  .join("\n")}

REQUEST CONTEXT:
- Blood Type: ${request.bloodType}
- Units Needed: ${request.unitsNeeded}
- Urgency: ${request.urgency}
- Requesting Hospital: ${request.requestingHospital?.hospitalName || "Unknown"}

Consider:
1. Urgency (CRITICAL = prioritize speed over cost, LOW = can optimize for cost)
2. Distance vs time (further = longer transport, but might have better stock)
3. Expiry dates (use FIFO - first in, first out)
4. Quantity (ensure source has enough units)
5. Transport feasibility (cold chain, distance limits)
6. Network relationships (preferred partners)

Think about:
- What's the fastest way to get blood to the patient?
- What's the most reliable source (won't cancel)?
- What's the best balance of speed, reliability, and cost?

Respond in JSON:
{
  "selected_index": 0,
  "reasoning": "Detailed explanation of why this source is optimal",
  "confidence": 0.9,
  "transport_strategy": "Recommended transport method and timeline"
}`;

  const result = await reasonAboutDecision({
    context: { rankedUnits, request },
    prompt,
    temperature: 0.3,
    responseFormat: "json",
  });

  const decision = result.decision || parseJsonRecord(result.reasoning);
  const selectedIndex = getNumber(decision, "selected_index", 0);

  return {
    selectedSource: rankedUnits[selectedIndex] || rankedUnits[0],
    reasoning: getString(decision, "reasoning", result.reasoning),
    confidence: getNumber(
      decision,
      "confidence",
      result.confidence || 0.8
    ),
    transportStrategy: getString(
      decision,
      "transport_strategy",
      "Standard courier"
    ),
  };
}

/**
 * Reason about transport method and route
 */
export async function reasonAboutTransport(context: {
  fromHospital: Pick<HospitalRegistration, "hospitalName"> | null;
  toHospital: Pick<HospitalRegistration, "hospitalName"> | null;
  distanceKm: number;
  urgency: string;
  bloodType: string;
  units: number;
  timeOfDay: string;
  trafficConditions?: string;
}): Promise<{
  method: "ambulance" | "courier" | "scheduled";
  reasoning: string;
  etaMinutes: number;
  coldChainCompliant: boolean;
  routeOptimization: string;
}> {
  const prompt = `Plan optimal transport for blood units:

TRANSPORT CONTEXT:
- From: ${context.fromHospital?.hospitalName || "Source Hospital"}
- To: ${context.toHospital?.hospitalName || "Destination Hospital"}
- Distance: ${context.distanceKm}km
- Urgency: ${context.urgency}
- Blood Type: ${context.bloodType}
- Units: ${context.units}
- Time: ${context.timeOfDay}
${context.trafficConditions ? `- Traffic: ${context.trafficConditions}` : ""}

TRANSPORT OPTIONS:
1. Ambulance: Fastest (<15km, CRITICAL only), can use sirens, 30% faster
2. Courier: Standard (<50km, HIGH/CRITICAL), dedicated cold chain
3. Scheduled: Long distance or LOW urgency, batched transport

COLD CHAIN REQUIREMENTS:
- Temperature: 2-6°C
- Maximum time: 6 hours
- Must maintain throughout transport

Consider:
1. Urgency (CRITICAL = speed over cost)
2. Distance (affects method choice and ETA)
3. Traffic conditions (rush hour = slower)
4. Time of day (affects traffic and availability)
5. Cold chain compliance (distance limits)
6. Cost vs speed trade-off

Respond in JSON:
{
  "method": "ambulance|courier|scheduled",
  "reasoning": "Detailed explanation of transport method selection",
  "eta_minutes": 45,
  "cold_chain_compliant": true,
  "route_optimization": "Specific route recommendations or considerations"
}`;

  const result = await reasonAboutDecision({
    context,
    prompt,
    temperature: 0.2,
    responseFormat: "json",
  });

  const decision = result.decision || parseJsonRecord(result.reasoning);
  const requestedMethod = getString(decision, "method", "courier");
  const method =
    requestedMethod === "ambulance" ||
    requestedMethod === "scheduled" ||
    requestedMethod === "courier"
      ? requestedMethod
      : "courier";

  return {
    method,
    reasoning: getString(decision, "reasoning", result.reasoning),
    etaMinutes: getNumber(decision, "eta_minutes", 60),
    coldChainCompliant: getBoolean(
      decision,
      "cold_chain_compliant",
      true
    ),
    routeOptimization: getString(
      decision,
      "route_optimization",
      "Standard route"
    ),
  };
}

/**
 * Reason about donor matching strategy
 */
export async function reasonAboutDonorMatchingStrategy(context: {
  eligibleDonors: number;
  urgency: string;
  bloodType: string;
  searchRadius: number;
  historicalResponseRate?: number;
}): Promise<{
  shouldTriggerInventory: boolean;
  reasoning: string;
  notificationStrategy: string;
  expectedResponseRate: number;
}> {
  const prompt = `Determine donor matching strategy:

CONTEXT:
- Eligible Donors Found: ${context.eligibleDonors}
- Urgency: ${context.urgency}
- Blood Type: ${context.bloodType}
- Search Radius: ${context.searchRadius}km
${
  context.historicalResponseRate
    ? `- Historical Response Rate: ${(
        context.historicalResponseRate * 100
      ).toFixed(1)}%`
    : ""
}

STRATEGY DECISIONS:
1. Should we trigger inventory search in parallel? (Dual strategy)
2. How many donors should we notify?
3. What's the expected response rate?

TRIGGERING THRESHOLDS:
- CRITICAL: ≤5 eligible donors → trigger inventory immediately
- HIGH: ≤2 eligible donors → trigger inventory immediately
- MEDIUM: 0 eligible donors → trigger inventory
- LOW: Only trigger if no donors found

Consider:
1. Urgency (higher = need backup plan)
2. Donor count (fewer = higher risk of no response)
3. Historical patterns (low response rate = need backup)
4. Blood type rarity (rare = harder to find donors)
5. Time of day (affects availability)

Respond in JSON:
{
  "should_trigger_inventory": true,
  "reasoning": "Detailed explanation of strategy decision",
  "notification_strategy": "How many donors to notify and why",
  "expected_response_rate": 0.3
}`;

  const result = await reasonAboutDecision({
    context,
    prompt,
    temperature: 0.3,
    responseFormat: "json",
  });

  const decision = result.decision || parseJsonRecord(result.reasoning);

  return {
    shouldTriggerInventory: getBoolean(
      decision,
      "should_trigger_inventory",
      false
    ),
    reasoning: getString(decision, "reasoning", result.reasoning),
    notificationStrategy:
      getString(
        decision,
        "notification_strategy",
        "Notify top 10 donors"
      ),
    expectedResponseRate:
      getNumber(decision, "expected_response_rate", 0.3) || 0.3,
  };
}

/**
 * Reason about donor eligibility with LLM for edge cases and explanations
 */
export async function reasonAboutEligibility(
  eligibilityResult: EligibilityCheckResult,
  donor: DonorRegistration
): Promise<{
  finalDecision: "approved" | "rejected" | "needs_review";
  reasoning: string;
  edgeCases: string[];
  recommendations: string[];
  confidence: number;
}> {
  const prompt = `Analyze donor eligibility decision:

DONOR PROFILE:
- Age: ${
    new Date().getFullYear() - new Date(donor.dateOfBirth).getFullYear()
  } years
- Weight: ${donor.weight} kg
- BMI: ${donor.bmi}
- Hemoglobin: ${donor.hemoglobin} g/dL
- Gender: ${donor.gender}
- Last Donation: ${
    donor.lastDonation
      ? new Date(donor.lastDonation).toLocaleDateString()
      : "Never"
  }

ELIGIBILITY CHECK RESULTS:
- Overall Status: ${eligibilityResult.passed ? "PASSED" : "FAILED"}
- Failed Criteria: ${eligibilityResult.failedCriteria.length}
${eligibilityResult.failedCriteria
  .map((c) => `  - ${c.criterion}: ${c.value} (Required: ${c.required})`)
  .join("\n")}

ALL CRITERIA:
${eligibilityResult.allCriteria
  .map(
    (c) =>
      `  - ${c.criterion}: ${c.value} (Required: ${c.required}) - ${
        c.passed ? "PASS" : "FAIL"
      }`
  )
  .join("\n")}

ANALYSIS REQUIRED:
1. Are there any edge cases? (e.g., BMI 18.4 vs 18.5, hemoglobin 12.4 vs 12.5)
2. Are the failures clear-cut or borderline?
3. Should this be flagged for human review?
4. What are specific recommendations for the donor to become eligible?

IMPORTANT RULES:
- Medical safety is paramount - never override hard medical requirements
- Age < 18 or > 65: ALWAYS reject (legal requirement)
- Disease tests positive: ALWAYS reject (safety requirement)
- Weight < 50kg: ALWAYS reject (safety requirement)
- Hemoglobin < 12.5: ALWAYS reject (safety requirement)
- BMI < 18.5: Usually reject, but flag for review if very close (e.g., 18.4)
- Donation interval: Usually reject, but consider if very close (e.g., 2.9 months vs 3.0)

Respond in JSON:
{
  "final_decision": "approved|rejected|needs_review",
  "reasoning": "Detailed explanation of eligibility decision, considering all factors and edge cases",
  "edge_cases": ["List any borderline cases that might need human review"],
  "recommendations": ["Specific actionable recommendations for donor to become eligible"],
  "confidence": 0.95
}`;

  const result = await reasonAboutDecision({
    context: { eligibilityResult, donor },
    prompt,
    temperature: 0.2, // Low temperature for consistent medical decisions
    responseFormat: "json",
    systemPrompt:
      "You are a medical eligibility expert for blood donation. You must prioritize safety while providing helpful guidance. Never override hard medical requirements, but identify edge cases that may need human review.",
  });

  const decision = result.decision || parseJsonRecord(result.reasoning);
  const requestedDecision = getString(
    decision,
    "final_decision",
    eligibilityResult.passed ? "approved" : "rejected"
  );
  const finalDecision =
    requestedDecision === "approved" ||
    requestedDecision === "rejected" ||
    requestedDecision === "needs_review"
      ? requestedDecision
      : eligibilityResult.passed
      ? "approved"
      : "rejected";

  return {
    finalDecision,
    reasoning: getString(decision, "reasoning", result.reasoning),
    edgeCases: getStringArray(decision, "edge_cases"),
    recommendations: getStringArray(decision, "recommendations"),
    confidence:
      getNumber(decision, "confidence", result.confidence || 0.9) ||
      result.confidence ||
      0.9,
  };
}
