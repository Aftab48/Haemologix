import { db } from "@/db";
import { AgentType } from "@prisma/client";
import type { HospitalRegistration } from "@prisma/client";
import { parseShortageRequestEvent, publishEvent } from "./eventBus";
import { calculateDistance } from "./donorAgent";
import { calculateBaseTime, calculateETA, getTrafficMultiplier, selectTransportMethod, validateColdChain } from "./logisticsAgent";
import { consultModel, decisionBasis, nowTimeContext } from "@/lib/ml/agentBridge";
import { explainInventory } from "@/lib/ml/explain";
import { inventoryUnitFeatures } from "@/lib/ml/features";
import { getAlertWindowHours } from "@/lib/ml/flags";
import { chooseInventorySource, chooseTransportMethod, deterministicInventoryDecision } from "@/lib/ml/policy/inventoryPolicy";

/**
 * INVENTORY AGENT
 * Searches blood inventory across hospital network and blood banks,
 * ranks units, reserves them, and proposes inter-facility transfers.
 */

export type RankedInventoryUnit = {
  unit_id: string;
  hospital_id: string;
  hospital_name: string;
  blood_type: string;
  units_available: number;
  expiry_date: Date;
  distance_km: number;
  scores: {
    proximity: number;
    expiry: number;
    quantity: number;
    feasibility: number;
    final: number;
  };
  rank: number;
};

/**
 * Blood type compatibility matrix (same as Donor Agent)
 * Maps donor blood type → list of recipient types they can donate to
 */
const BLOOD_TYPE_COMPATIBILITY: Record<string, string[]> = {
  "O-": ["O-", "O+", "A-", "A+", "B-", "B+", "AB-", "AB+"],
  "O+": ["O+", "A+", "B+", "AB+"],
  "A-": ["A-", "A+", "AB-", "AB+"],
  "A+": ["A+", "AB+"],
  "B-": ["B-", "B+", "AB-", "AB+"],
  "B+": ["B+", "AB+"],
  "AB-": ["AB-", "AB+"],
  "AB+": ["AB+"],
};

/**
 * Get all donor blood types that can donate to a given recipient type
 * This is the inverse of BLOOD_TYPE_COMPATIBILITY
 */
function getCompatibleDonorTypes(requiredBloodType: string): string[] {
  const compatibleDonors: string[] = [];

  // Check each donor type to see if it can donate to the required type
  for (const [donorType, recipientTypes] of Object.entries(
    BLOOD_TYPE_COMPATIBILITY
  )) {
    if (recipientTypes.includes(requiredBloodType)) {
      compatibleDonors.push(donorType);
    }
  }

  return compatibleDonors;
}

/**
 * Check if unit's blood type is compatible with required type
 */
function isBloodTypeCompatible(
  unitBloodType: string,
  requiredBloodType: string
): boolean {
  const compatible = BLOOD_TYPE_COMPATIBILITY[unitBloodType] || [];
  return compatible.includes(requiredBloodType);
}

/**
 * Calculate proximity score (0-100)
 * Weight: 40%
 */
export function calculateProximityScore(distanceKm: number): number {
  return Math.max(0, 100 - (distanceKm / 200) * 100);
}

/**
 * Calculate expiry score (0-100) - prefer units expiring sooner (FIFO)
 * Weight: 30%
 */
export function calculateExpiryScore(expiryDate: Date, now: number = Date.now()): number {
  const daysUntilExpiry = Math.floor(
    (expiryDate.getTime() - now) / (1000 * 60 * 60 * 24)
  );

  if (daysUntilExpiry <= 14) return 100; // Expire soon, use first
  if (daysUntilExpiry <= 30) return 80;
  if (daysUntilExpiry <= 45) return 60;
  return 40; // > 45 days
}

/**
 * Calculate quantity score (0-100) - prefer hospitals with surplus
 * Weight: 20%
 */
export function calculateQuantityScore(
  hospitalUnits: number,
  unitsNeeded: number,
  hospitalDailyUsage: number = 2 // Simplified average
): number {
  const surplus = hospitalUnits - hospitalDailyUsage * 3; // Keep 3 days buffer
  if (surplus <= 0) return 0; // No surplus, don't take from them
  return Math.min(100, (surplus / unitsNeeded) * 50);
}

/**
 * Calculate feasibility score (0-100) - based on hospital participation
 * Weight: 10%
 */
/** The subset of hospital fields the feasibility score depends on (so the simulator can supply them). */
export type FeasibilityInput = Pick<
  HospitalRegistration,
  "networkParticipationAgreement" | "coldStorageFacility" | "temperatureStandards"
>;

export function calculateFeasibilityScore(hospital: FeasibilityInput): number {
  // Check if hospital is in network and has sharing agreement
  if (!hospital.networkParticipationAgreement) return 50;
  if (!hospital.coldStorageFacility) return 70;
  if (!hospital.temperatureStandards) return 70;
  return 100; // Fully compliant and willing to share
}

export type InventoryScores = {
  proximity: number;
  expiry: number;
  quantity: number;
  feasibility: number;
  final: number;
};

/**
 * Calculate composite score for an inventory unit
 */
export function scoreInventoryUnit(
  distanceKm: number,
  expiryDate: Date,
  hospitalUnits: number,
  unitsNeeded: number,
  hospital: FeasibilityInput,
  now: number = Date.now()
): InventoryScores {
  const proximity = calculateProximityScore(distanceKm);
  const expiry = calculateExpiryScore(expiryDate, now);
  const quantity = calculateQuantityScore(hospitalUnits, unitsNeeded);
  const feasibility = calculateFeasibilityScore(hospital);

  const final =
    proximity * 0.4 + expiry * 0.3 + quantity * 0.2 + feasibility * 0.1;

  return {
    proximity,
    expiry,
    quantity,
    feasibility,
    final: parseFloat(final.toFixed(2)),
  };
}

/**
 * Find and rank available inventory units across hospital network and blood banks
 */
export async function findAndRankInventoryUnits(
  bloodType: string,
  unitsNeeded: number,
  requestingHospitalId: string,
  requestingHospitalLat: number,
  requestingHospitalLng: number
): Promise<RankedInventoryUnit[]> {
  // Get all compatible donor blood types (e.g., for A+ → [O-, O+, A-, A+])
  const compatibleDonorTypes = getCompatibleDonorTypes(bloodType);

  console.log(
    `[InventoryAgent] Searching for ${bloodType} compatible units across hospital network and blood banks...`
  );
  console.log(
    `[InventoryAgent] Compatible donor types: ${compatibleDonorTypes.join(
      ", "
    )}`
  );

  // Find all inventory units with compatible blood types (excluding requesting facility)
  // This searches both hospitals and blood banks (stored in HospitalRegistration)
  const inventoryUnits = await db.inventoryUnit.findMany({
    where: {
      bloodType: {
        in: compatibleDonorTypes,
      },
      units: { gt: 0 },
      reserved: false,
      expiryDate: { gt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) }, // > 7 days
      hospitalId: { not: requestingHospitalId },
    },
    include: {
      hospital: true,
    },
  });

  console.log(
    `[InventoryAgent] Found ${
      inventoryUnits.length
    } available units with compatible blood types (${compatibleDonorTypes.join(
      ", "
    )}) across hospitals and blood banks`
  );

  if (inventoryUnits.length === 0) {
    return [];
  }

  const rankedUnits: RankedInventoryUnit[] = [];

  for (const unit of inventoryUnits) {
    const hospital = unit.hospital;

    // Blood type compatibility already filtered at database level
    // Double-check for safety (should always pass now)
    if (!isBloodTypeCompatible(unit.bloodType, bloodType)) {
      console.warn(
        `[InventoryAgent] Unexpected: Unit ${unit.id} with blood type ${unit.bloodType} passed DB filter but is incompatible with ${bloodType}`
      );
      continue;
    }

    // Calculate distance
    if (!hospital.latitude || !hospital.longitude) {
      continue; // Skip hospitals without coordinates
    }

    const distanceKm = calculateDistance(
      requestingHospitalLat,
      requestingHospitalLng,
      parseFloat(hospital.latitude),
      parseFloat(hospital.longitude)
    );

    // Calculate scores
    const scores = scoreInventoryUnit(
      distanceKm,
      unit.expiryDate,
      unit.units,
      unitsNeeded,
      hospital
    );

    rankedUnits.push({
      unit_id: unit.id,
      hospital_id: hospital.id,
      hospital_name: hospital.hospitalName,
      blood_type: unit.bloodType,
      units_available: unit.units,
      expiry_date: unit.expiryDate,
      distance_km: distanceKm,
      scores,
      rank: 0, // Will be set after sorting
    });
  }

  // Sort by final score (descending)
  rankedUnits.sort((a, b) => b.scores.final - a.scores.final);

  // Assign ranks
  rankedUnits.forEach((unit, index) => {
    unit.rank = index + 1;
  });

  console.log(
    `[InventoryAgent] ${rankedUnits.length} units available after compatibility checks`
  );

  return rankedUnits;
}

/**
 * Process inventory search (triggered when no donors respond)
 */
export async function processInventorySearch(
  requestId: string,
  opts: {
    /**
     * true when the escalation ladder is calling: it owns what happens after an
     * empty result, so we must not bounce back to the coordinator over HTTP.
     */
    fromLadder?: boolean;
  } = {}
): Promise<{
  success: boolean;
  unitsFound: number;
  reserved: boolean;
  error?: string;
}> {
  try {
    console.log(
      `[InventoryAgent] Processing inventory search for request: ${requestId}`
    );

    // 1. Get the shortage event details (the ladder re-publishes the event with a
    //    wider radius, so take the most recent one for this request)
    const shortageEvent = await db.agentEvent.findFirst({
      where: {
        payload: {
          path: ["id"],
          equals: requestId,
        },
        type: "shortage.request.v1",
      },
      orderBy: { createdAt: "desc" },
    });

    if (!shortageEvent) {
      return {
        success: false,
        unitsFound: 0,
        reserved: false,
        error: "Shortage event not found",
      };
    }

    const payload = parseShortageRequestEvent(shortageEvent.payload);
    if (!payload) {
      throw new Error("Shortage event has an invalid payload");
    }
    const bloodType = payload.blood_type;
    const unitsNeeded = payload.units_needed;
    const hospitalId = payload.hospital_id;
    const hospitalLat = payload.location.lat;
    const hospitalLng = payload.location.lng;

    // 2. Find and rank inventory units
    const rankedUnits = await findAndRankInventoryUnits(
      bloodType,
      unitsNeeded,
      hospitalId,
      hospitalLat,
      hospitalLng
    );

    if (rankedUnits.length === 0) {
      console.log("[InventoryAgent] No inventory units found in network");

      // Log decision
      await db.agentDecision.create({
        data: {
          agentType: AgentType.INVENTORY,
          eventType: "no_inventory_found",
          requestId,
          decision: {
            blood_type: bloodType,
            units_needed: unitsNeeded,
            units_found: 0,
            escalation_rung: payload.escalation?.rung ?? 0,
            reasoning: opts.fromLadder
              ? `Re-checked network inventory for ${bloodType} (escalation rung ${payload.escalation?.rung ?? 0}): still no available units. Returning to coordinator.`
              : `No available inventory found for ${bloodType} across hospitals and blood banks (all units reserved, expiring, or absent). Handing to the Coordinator Agent to decide the next step (wait for notified donors, widen the search, or escalate).`,
            ...decisionBasis(),
          },
          confidence: null,
        },
      });

      // Local search exhausted (no donors → no inventory): hand the alert to the
      // coordinator's escalation ladder. Awaited: a fire-and-forget fetch dies
      // when the Vercel function freezes. Skipped when the ladder itself called
      // us — it decides the next rung from our return value.
      if (!opts.fromLadder) {
        try {
          const baseUrl =
            process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
          await fetch(`${baseUrl}/api/agents/coordinator`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: "escalate", request_id: requestId, trigger: "no_local_match" }),
          });
        } catch (error) {
          console.error("[InventoryAgent] Error triggering Coordinator escalation:", error);
        }
      }

      return { success: true, unitsFound: 0, reserved: false };
    }

    // 3. Source selection: model predictions (P(delivery ok), delivery time) + policy.
    //    Cold-chain compliance is a hard constraint enforced before the policy sees a unit.
    const alert = await db.alert.findUnique({
      where: { id: requestId },
      include: { hospital: { select: { hospitalName: true, bloodBankLicense: true, networkParticipationAgreement: true, coldStorageFacility: true } } },
    });
    const urgency = (alert?.urgency || "medium").toLowerCase();
    const time = nowTimeContext();
    const traffic = getTrafficMultiplier(time.hour);
    const windowMs = getAlertWindowHours() * 3_600_000;
    const minutesLeft = alert ? Math.max(0, (alert.createdAt.getTime() + windowMs - Date.now()) / 60_000) : Infinity;
    const hospitalsById = new Map(
      (await db.hospitalRegistration.findMany({
        where: { id: { in: rankedUnits.slice(0, 20).map((u) => u.hospital_id) } },
        select: { id: true, bloodBankLicense: true, networkParticipationAgreement: true, coldStorageFacility: true },
      })).map((h) => [h.id, h])
    );
    const candidates = rankedUnits.slice(0, 20).map((u) => {
      const method = selectTransportMethod(u.distance_km, urgency);
      const etaMinutes = calculateETA(calculateBaseTime(u.distance_km), traffic, method);
      const h = hospitalsById.get(u.hospital_id);
      return { u, method, etaMinutes, h, coldChainOk: validateColdChain(etaMinutes, method).compliant };
    });
    const validCandidates = candidates.filter((c) => c.coldChainOk);
    const items = validCandidates.flatMap((c) => {
      const features = inventoryUnitFeatures({
        sourceType: c.h?.bloodBankLicense ? "blood_bank" : "hospital",
        distanceKm: c.u.distance_km,
        unitsAvailable: c.u.units_available,
        unitsNeeded,
        unitsRequested: Math.min(c.u.units_available, unitsNeeded),
        daysToExpiry: Math.floor((c.u.expiry_date.getTime() - Date.now()) / 86_400_000),
        unitBloodType: c.u.blood_type,
        alertBloodType: bloodType,
        urgency,
        transportMethod: c.method,
        etaMinutes: c.etaMinutes,
        scores: c.u.scores,
        rank: c.u.rank,
        candidateCount: validCandidates.length,
        networkAgreement: Boolean(c.h?.networkParticipationAgreement),
        coldStorage: Boolean(c.h?.coldStorageFacility),
        time,
      });
      return [
        { task: "inventory_delivery_ok" as const, ref: `ok:${c.u.unit_id}`, subjectId: c.u.unit_id, features },
        { task: "delivery_time" as const, ref: `time:${c.u.unit_id}`, subjectId: c.u.unit_id, features },
      ];
    });
    const ml = await consultModel({ agent: "INVENTORY", requestId, items });
    const policyInput = {
      candidates: validCandidates.map((c) => ({
        id: c.u.unit_id,
        rank: c.u.rank,
        scoreFinal: c.u.scores.final,
        distanceKm: c.u.distance_km,
        unitsAvailable: c.u.units_available,
        etaMinutes: c.etaMinutes,
        method: c.method,
      })),
      shortfall: unitsNeeded,
      urgency,
      minutesLeft,
      predictions: ml.ok
        ? {
            deliveryOk: new Map(validCandidates.map((c) => [c.u.unit_id, ml.scalar(`ok:${c.u.unit_id}`) ?? 0.5])),
            deliveryMinutes: new Map(validCandidates.map((c) => [c.u.unit_id, ml.scalar(`time:${c.u.unit_id}`) ?? c.etaMinutes])),
          }
        : null,
    };
    const policyDecision = chooseInventorySource(policyInput);
    const ruleDecision = deterministicInventoryDecision(policyInput);
    const decision = ml.hasAuthority ? policyDecision : ruleDecision;
    const chosenId = decision.unitId ?? rankedUnits[0]?.unit_id;
    const topUnit: RankedInventoryUnit = rankedUnits.find((u) => u.unit_id === chosenId) ?? rankedUnits[0];
    const chosenCandidate = candidates.find((c) => c.u.unit_id === topUnit.unit_id);
    const predictedMinutes = ml.scalar(`time:${topUnit.unit_id}`);
    const transportDecision = chooseTransportMethod({
      distanceKm: topUnit.distance_km,
      urgency,
      etaMinutes: chosenCandidate?.etaMinutes ?? Math.ceil((topUnit.distance_km / 40) * 60),
      minutesLeft,
      predictedMinutes: ml.hasAuthority ? predictedMinutes : null,
    });
    const selectionReasoning = explainInventory(decision, { mode: ml.mode, modelVersion: ml.modelVersion, fallbackReason: ml.fallbackReason });
    const transportStrategy = `${transportDecision.method} — ${transportDecision.reason}`;
    // Model-informed only when the policy acted (authority): P(delivery ok) of the chosen unit.
    const sourceBasis = decisionBasis(ml, policyDecision.pOk ?? null);
    const confidence = sourceBasis.model_confidence;
    console.log(`[InventoryAgent] Selected ${topUnit.hospital_name} (${decision.source}, mode ${ml.mode}); transport ${transportDecision.method}`);

    // Check if top unit has enough
    const unitsToReserve = Math.min(topUnit.units_available, unitsNeeded);

    // 4. Reserve the unit(s)
    await db.inventoryUnit.update({
      where: { id: topUnit.unit_id },
      data: {
        reserved: true,
        reservedFor: requestId,
      },
    });

    console.log(
      `[InventoryAgent] Reserved ${unitsToReserve} units from ${topUnit.hospital_name}`
    );

    // 5. Create inventory.match event
    await publishEvent(
      "inventory.match.v1",
      {
        type: "inventory.match.v1",
        request_id: requestId,
        source_hospital_id: topUnit.hospital_id,
        destination_hospital_id: hospitalId,
        blood_type: bloodType,
        units: unitsToReserve,
        unit_ids: [topUnit.unit_id],
        match_score: topUnit.scores.final,
        distance_km: topUnit.distance_km,
        timestamp: new Date().toISOString(),
      },
      AgentType.INVENTORY
    );

    // 6. Create transport request
    const transportRequest = await db.transportRequest.create({
      data: {
        fromHospitalId: topUnit.hospital_id,
        toHospitalId: hospitalId,
        bloodType: bloodType,
        units: unitsToReserve,
        status: "pending",
        transportMethod: transportDecision.method,
        eta: new Date(Date.now() + (chosenCandidate?.etaMinutes ?? (topUnit.distance_km / 40) * 60) * 60 * 1000),
      },
    });

    console.log(
      `[InventoryAgent] Created transport request: ${transportRequest.id}`
    );

    // 7. Trigger Logistics Agent to plan transport
    console.log(
      `[InventoryAgent] Triggering Logistics Agent for transport planning...`
    );
    try {
      const baseUrl =
        process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
      // Awaited: a fire-and-forget fetch dies when the Vercel function freezes
      await fetch(`${baseUrl}/api/agents/logistics`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "plan_transport",
          transport_id: transportRequest.id,
        }),
      });
    } catch (error) {
      console.error(
        "[InventoryAgent] Error triggering Logistics Agent:",
        error
      );
    }

    // 8. Log agent decision
    await db.agentDecision.create({
      data: {
        agentType: AgentType.INVENTORY,
        eventType: "inventory_match",
        requestId,
        decision: {
          total_units_found: rankedUnits.length,
          selected_source: topUnit.hospital_name,
          units_reserved: unitsToReserve,
          match_score: topUnit.scores.final,
          distance_km: topUnit.distance_km,
          expiry_date: topUnit.expiry_date,
          transport_method: transportRequest.transportMethod,
          reasoning:
            selectionReasoning ||
            `Selected ${
              topUnit.hospital_name
            } based on optimal scoring. Score: ${
              topUnit.scores.final
            }/100. Distance: ${topUnit.distance_km.toFixed(
              1
            )}km. ${unitsToReserve} units reserved.`,
          decision_source: decision.source,
          transport_strategy: transportStrategy,
          transport_source: transportDecision.source,
          p_delivery_ok: policyDecision.pOk ?? null,
          predicted_delivery_minutes: predictedMinutes,
          deterministic_eta_minutes: chosenCandidate?.etaMinutes ?? null,
          policy_suggestion: { unit_id: policyDecision.unitId, reason: policyDecision.reason },
          rule_suggestion: { unit_id: ruleDecision.unitId },
          top_alternatives: rankedUnits.slice(0, 3).map((u) => ({
            rank: u.rank,
            hospital: u.hospital_name,
            score: u.scores.final,
            distance_km: u.distance_km,
            p_ok: ml.scalar(`ok:${u.unit_id}`),
            predicted_minutes: ml.scalar(`time:${u.unit_id}`),
          })),
          ...ml.meta(),
          rule_score: topUnit.scores.final / 100,
          ...sourceBasis,
        },
        confidence,
      },
    });

    // 9. Update workflow state
    await db.workflowState.update({
      where: { requestId },
      data: {
        status: "fulfillment_in_progress",
        currentStep: "inventory_matched",
        metadata: {
          ...((
            await db.workflowState.findUnique({ where: { requestId } })
          )?.metadata as object),
          inventory_source: topUnit.hospital_name,
          units_reserved: unitsToReserve,
          transport_id: transportRequest.id,
          matched_at: new Date().toISOString(),
        },
        fulfillmentPlan: {
          method: "inventory",
          source_hospital: topUnit.hospital_name,
          units: unitsToReserve,
          transport_method: transportRequest.transportMethod,
          eta_minutes: Math.ceil((topUnit.distance_km / 40) * 60),
          confidence: topUnit.scores.final / 100,
        },
      },
    });

    console.log(
      `[InventoryAgent] Successfully matched ${unitsToReserve} units for request ${requestId}`
    );

    return { success: true, unitsFound: rankedUnits.length, reserved: true };
  } catch (error) {
    console.error("[InventoryAgent] Error processing inventory search:", error);
    return {
      success: false,
      unitsFound: 0,
      reserved: false,
      error: String(error),
    };
  }
}

/**
 * Release reserved units (if transfer is cancelled or expires)
 */
export async function releaseReservedUnits(requestId: string): Promise<void> {
  await db.inventoryUnit.updateMany({
    where: {
      reservedFor: requestId,
      reserved: true,
    },
    data: {
      reserved: false,
      reservedFor: null,
    },
  });

  console.log(
    `[InventoryAgent] Released reserved units for request: ${requestId}`
  );
}
