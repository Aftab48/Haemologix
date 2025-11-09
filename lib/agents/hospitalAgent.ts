/**
 * Hospital Agent - Autonomous shortage detection and alert triggering
 * Monitors inventory and creates shortage.request events
 */

import { db } from "@/db";
import { AgentType, UrgencyLevel } from "@prisma/client";
import { publishEvent, ShortageRequestEvent } from "./eventBus";
import { reasonAboutUrgency } from "./llmReasoning";

export interface InventoryCheck {
  hospitalId: string;
  bloodType: string;
  currentUnits: number;
  dailyUsage: number;
  daysRemaining: number;
}

export interface ShortageDetection {
  detected: boolean;
  urgency: "low" | "medium" | "high" | "critical";
  unitsNeeded: number;
  priorityScore: number;
  reasoning: string;
}

/**
 * Calculate urgency based on blood type rarity and stock level
 */
function calculateUrgency(
  bloodType: string,
  daysRemaining: number,
  currentUnits: number
): "low" | "medium" | "high" | "critical" {
  // Blood type rarity factor
  const rarityScore: Record<string, number> = {
    "AB-": 10, // Rarest
    "B-": 9,
    "AB+": 8,
    "A-": 7,
    "O-": 10, // Universal donor - very critical
    "B+": 5,
    "A+": 4,
    "O+": 3, // Most common
  };

  const rarity = rarityScore[bloodType] || 5;

  // Critical: < 1 day or 0 units
  if (daysRemaining < 1 || currentUnits === 0) {
    return "critical";
  }

  // High: < 2 days OR rare blood type with < 3 days
  if (daysRemaining < 2 || (rarity >= 8 && daysRemaining < 3)) {
    return "high";
  }

  // Medium: < 3 days
  if (daysRemaining < 3) {
    return "medium";
  }

  // Low: < 5 days
  return "low";
}

/**
 * Calculate priority score (0-100) for shortage request
 */
function calculatePriorityScore(
  urgency: string,
  bloodType: string,
  daysRemaining: number
): number {
  let score = 0;

  // Urgency contributes 40 points
  switch (urgency) {
    case "critical":
      score += 40;
      break;
    case "high":
      score += 30;
      break;
    case "medium":
      score += 20;
      break;
    case "low":
      score += 10;
      break;
  }

  // Blood type rarity contributes 30 points
  const rarityScore: Record<string, number> = {
    "AB-": 30,
    "O-": 30,
    "B-": 25,
    "A-": 20,
    "AB+": 15,
    "B+": 12,
    "A+": 10,
    "O+": 8,
  };
  score += rarityScore[bloodType] || 15;

  // Time criticality contributes 30 points
  if (daysRemaining < 0.5) score += 30; // < 12 hours
  else if (daysRemaining < 1) score += 25;
  else if (daysRemaining < 2) score += 20;
  else if (daysRemaining < 3) score += 15;
  else score += 10;

  return Math.min(100, score);
}

/**
 * Calculate recommended search radius based on urgency
 */
function calculateSearchRadius(urgency: string): number {
  switch (urgency) {
    case "critical":
      return 20; // 20km
    case "high":
      return 35; // 35km
    case "medium":
      return 50; // 50km
    case "low":
      return 75; // 75km
    default:
      return 35;
  }
}

/**
 * Detect if there's a shortage for a specific blood type
 */
export function detectShortage(
  inventoryCheck: InventoryCheck,
  threshold: number = 3 // Default: trigger if < 3 days remaining
): ShortageDetection {
  const { currentUnits, dailyUsage, bloodType, daysRemaining } = inventoryCheck;

  // No shortage if we have enough for threshold days
  if (daysRemaining >= threshold && currentUnits > 0) {
    return {
      detected: false,
      urgency: "low",
      unitsNeeded: 0,
      priorityScore: 0,
      reasoning: `Stock sufficient: ${currentUnits} units, ${daysRemaining.toFixed(
        1
      )} days remaining`,
    };
  }

  // Calculate needed units to reach safe level (5 days supply)
  const safeSupplyDays = 5;
  const safeSupplyUnits = Math.ceil(dailyUsage * safeSupplyDays);
  const unitsNeeded = Math.max(1, safeSupplyUnits - currentUnits);

  const urgency = calculateUrgency(bloodType, daysRemaining, currentUnits);
  const priorityScore = calculatePriorityScore(
    urgency,
    bloodType,
    daysRemaining
  );

  return {
    detected: true,
    urgency,
    unitsNeeded,
    priorityScore,
    reasoning: `Stock low: ${currentUnits} units remaining (${daysRemaining.toFixed(
      1
    )} days). Need ${unitsNeeded} units to reach safe level.`,
  };
}

/**
 * Process an alert and create shortage.request event
 */
export async function processAlert(alertId: string): Promise<{
  success: boolean;
  eventId?: string;
  error?: string;
}> {
  try {
    // Fetch alert with hospital details
    const alert = await db.alert.findUnique({
      where: { id: alertId },
      include: { hospital: true },
    });

    if (!alert) {
      return { success: false, error: "Alert not found" };
    }

    // Validate hospital authorization
    if (alert.hospital.status !== "APPROVED") {
      return { success: false, error: "Hospital not authorized" };
    }

    // Get hospital inventory for this blood type (if exists)
    const inventoryUnit = await db.inventoryUnit.findFirst({
      where: {
        hospitalId: alert.hospitalId,
        bloodType: alert.bloodType,
      },
      orderBy: { createdAt: "desc" },
    });

    // Estimate daily usage (default 2 units if no history)
    const dailyUsage = 2;
    const currentUnits = inventoryUnit?.units || 0;
    const daysRemaining = currentUnits / dailyUsage;

    // Detect shortage
    const shortage = detectShortage({
      hospitalId: alert.hospitalId,
      bloodType: alert.bloodType,
      currentUnits,
      dailyUsage,
      daysRemaining,
    });

    // Use LLM reasoning to assess urgency (AGENTIC AI)
    let urgency: "low" | "medium" | "high" | "critical";
    let priorityScore: number;
    let urgencyReasoning: string;
    let recommendedAction: string;
    let llmUsed: boolean = false;

    try {
      console.log("[HospitalAgent] Using LLM reasoning to assess urgency...");
      const llmUrgency = await reasonAboutUrgency({
        bloodType: alert.bloodType,
        currentUnits,
        daysRemaining,
        dailyUsage,
        hospitalContext: {
          hospitalName: alert.hospital.hospitalName,
          operationalStatus: alert.hospital.operationalStatus,
        },
        timeOfDay: new Date().toLocaleTimeString(),
      });

      urgency = llmUrgency.urgency;
      priorityScore = llmUrgency.priorityScore;
      urgencyReasoning = llmUrgency.reasoning;
      recommendedAction = llmUrgency.recommendedAction;
      llmUsed = true;

      console.log(
        `[HospitalAgent] LLM assessed urgency: ${urgency} (priority: ${priorityScore})`
      );
    } catch (error) {
      console.warn(
        "[HospitalAgent] LLM reasoning failed, using algorithmic fallback:",
        error
      );
      // Fallback to algorithmic assessment
      urgency = alert.urgency.toLowerCase() as any;
      priorityScore = calculatePriorityScore(
        urgency,
        alert.bloodType,
        daysRemaining
      );
      urgencyReasoning = `Algorithmic assessment: ${urgency} urgency based on stock levels.`;
      recommendedAction = "Standard donor notification process";
      llmUsed = false;
    }

    const searchRadius =
      parseInt(alert.searchRadius) || calculateSearchRadius(urgency);

    // Create shortage.request event
    const eventPayload: ShortageRequestEvent = {
      type: "shortage.request.v1",
      id: alertId,
      hospital_id: alert.hospitalId,
      blood_type: alert.bloodType,
      units_needed: parseInt(alert.unitsNeeded) || shortage.unitsNeeded,
      urgency: urgency,
      location: {
        lat: parseFloat(alert.hospital.latitude || "0"),
        lng: parseFloat(alert.hospital.longitude || "0"),
      },
      search_radius_km: searchRadius,
      priority_score: priorityScore,
      metadata: {
        contact_person: alert.hospital.repName,
        contact_phone: alert.hospital.contactPhone,
        reason: alert.description || "emergency_shortage",
      },
    };

    // Publish event
    console.log("[HospitalAgent] Publishing event...");
    const eventId = await publishEvent(
      "shortage.request.v1",
      eventPayload as any,
      "hospital"
    );
    console.log(`[HospitalAgent] Event published: ${eventId}`);

    // Log agent decision
    console.log("[HospitalAgent] Creating agent decision...");
    await db.agentDecision.create({
      data: {
        agentType: AgentType.HOSPITAL,
        eventType: "shortage_detection",
        eventId,
        requestId: alertId,
        decision: {
          shortage_detected: true,
          urgency,
          priority_score: priorityScore,
          search_radius_km: searchRadius,
          units_needed: eventPayload.units_needed,
          reasoning:
            urgencyReasoning ||
            `Hospital ${alert.hospital.hospitalName} requires ${eventPayload.units_needed} units of ${alert.bloodType}. Urgency: ${urgency}. Search radius: ${searchRadius}km.`,
          llm_used: llmUsed,
          recommended_action: recommendedAction,
        },
        confidence: 1.0,
      },
    });

    // Create workflow state
    console.log("[HospitalAgent] Creating workflow state...");
    await db.workflowState.create({
      data: {
        requestId: alertId,
        status: "pending",
        currentStep: "shortage_detected",
        metadata: {
          hospital_id: alert.hospitalId,
          blood_type: alert.bloodType,
          urgency,
          created_at: new Date().toISOString(),
        },
      },
    });

    console.log(`[HospitalAgent] Created shortage request: ${eventId}`);

    return { success: true, eventId };
  } catch (error) {
    console.error("[HospitalAgent] Error processing alert:", error);
    console.error("[HospitalAgent] Error details:", error);
    return { success: false, error: String(error) };
  }
}

/**
 * Check inventory for a specific hospital and blood type
 * Triggers when inventory is updated
 */
export async function checkInventoryAndAutoAlert(
  hospitalId: string,
  bloodType: string
): Promise<{ alertCreated: boolean; alertId?: string; reason?: string }> {
  try {
    console.log(
      `[HospitalAgent] Checking inventory: ${hospitalId} - ${bloodType}`
    );

    // Get threshold for this blood type
    const threshold = await db.inventoryThreshold.findUnique({
      where: {
        hospitalId_bloodType: {
          hospitalId,
          bloodType,
        },
      },
    });

    if (!threshold) {
      console.log(
        `[HospitalAgent] No threshold set for ${bloodType} at this hospital`
      );
      return { alertCreated: false, reason: "No threshold configured" };
    }

    // Calculate current total units (sum of all non-reserved units)
    const inventoryUnits = await db.inventoryUnit.findMany({
      where: {
        hospitalId,
        bloodType,
        reserved: false,
      },
    });

    const currentTotal = inventoryUnits.reduce(
      (sum, unit) => sum + unit.units,
      0
    );
    const criticalThreshold = threshold.minimumRequired * 0.4;

    console.log(
      `[HospitalAgent] Current: ${currentTotal}, Critical threshold: ${criticalThreshold}`
    );

    // Not critical yet
    if (currentTotal >= criticalThreshold) {
      return {
        alertCreated: false,
        reason: "Inventory above critical threshold",
      };
    }

    // Check if alert already exists for this blood type (unfulfilled)
    const existingAlert = await db.alert.findFirst({
      where: {
        hospitalId,
        bloodType,
        status: {
          in: ["PENDING", "NOTIFIED", "MATCHED"],
        },
        createdAt: {
          gte: new Date(Date.now() - 4 * 60 * 60 * 1000), // Within last 4 hours
        },
      },
    });

    if (existingAlert) {
      console.log(`[HospitalAgent] Alert already exists: ${existingAlert.id}`);
      return { alertCreated: false, reason: "Alert already exists" };
    }

    // Determine urgency based on how critical
    const percentOfMinimum = (currentTotal / threshold.minimumRequired) * 100;
    let urgency: UrgencyLevel;
    if (percentOfMinimum < 20) {
      urgency = UrgencyLevel.CRITICAL;
    } else if (percentOfMinimum < 30) {
      urgency = UrgencyLevel.HIGH;
    } else {
      urgency = UrgencyLevel.MEDIUM;
    }

    const unitsNeeded = Math.max(1, threshold.minimumRequired - currentTotal);

    // Get hospital details
    const hospital = await db.hospitalRegistration.findUnique({
      where: { id: hospitalId },
    });

    if (!hospital) {
      return { alertCreated: false, reason: "Hospital not found" };
    }

    console.log(
      `[HospitalAgent] 🚨 AUTO-CREATING ALERT: ${hospital.hospitalName} - ${bloodType} (${urgency})`
    );

    // Auto-create alert
    const alert = await db.alert.create({
      data: {
        bloodType,
        urgency,
        unitsNeeded: String(unitsNeeded),
        searchRadius: String(
          calculateSearchRadius(urgency.toLowerCase() as any)
        ),
        description: `Auto-detected critical shortage: ${currentTotal} units remaining (critical threshold: ${criticalThreshold})`,
        autoDetected: true, // Mark as auto-detected
        hospitalId: hospital.id,
        latitude: hospital.latitude,
        longitude: hospital.longitude,
      },
    });

    // Process the alert through the agent chain
    console.log(`[HospitalAgent] Processing auto-created alert: ${alert.id}`);
    await processAlert(alert.id);

    return {
      alertCreated: true,
      alertId: alert.id,
      reason: `Critical shortage detected: ${currentTotal} < ${criticalThreshold}`,
    };
  } catch (error) {
    console.error(
      "[HospitalAgent] Error in checkInventoryAndAutoAlert:",
      error
    );
    return { alertCreated: false, reason: String(error) };
  }
}

/**
 * Monitor inventory levels across all hospitals (cron job)
 * Can be called periodically to check all hospitals
 */
export async function monitorAllHospitalsInventory(): Promise<{
  hospitalsChecked: number;
  alertsCreated: number;
}> {
  try {
    console.log("[HospitalAgent] Starting full inventory monitoring...");

    let hospitalsChecked = 0;
    let alertsCreated = 0;

    // Get all approved hospitals with thresholds
    const hospitals = await db.hospitalRegistration.findMany({
      where: { status: "APPROVED" },
      include: { inventoryThresholds: true },
    });

    for (const hospital of hospitals) {
      for (const threshold of hospital.inventoryThresholds) {
        hospitalsChecked++;
        const result = await checkInventoryAndAutoAlert(
          hospital.id,
          threshold.bloodType
        );
        if (result.alertCreated) {
          alertsCreated++;
        }
      }
    }

    console.log(
      `[HospitalAgent] Monitoring complete: ${hospitalsChecked} checked, ${alertsCreated} alerts created`
    );
    return { hospitalsChecked, alertsCreated };
  } catch (error) {
    console.error("[HospitalAgent] Error monitoring all hospitals:", error);
    return { hospitalsChecked: 0, alertsCreated: 0 };
  }
}
