import { db } from "@/db";
import { AgentType } from "@prisma/client";
import { publishEvent } from "./eventBus";
import { calculateDistance } from "./donorAgent";

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
function calculateProximityScore(distanceKm: number): number {
  return Math.max(0, 100 - (distanceKm / 200) * 100);
}

/**
 * Calculate expiry score (0-100) - prefer units expiring sooner (FIFO)
 * Weight: 30%
 */
function calculateExpiryScore(expiryDate: Date): number {
  const daysUntilExpiry = Math.floor(
    (expiryDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
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
function calculateQuantityScore(
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
function calculateFeasibilityScore(hospital: any): number {
  // Check if hospital is in network and has sharing agreement
  if (!hospital.networkParticipationAgreement) return 50;
  if (!hospital.coldStorageFacility) return 70;
  if (!hospital.temperatureStandards) return 70;
  return 100; // Fully compliant and willing to share
}

/**
 * Calculate composite score for an inventory unit
 */
function scoreInventoryUnit(
  distanceKm: number,
  expiryDate: Date,
  hospitalUnits: number,
  unitsNeeded: number,
  hospital: any
): {
  proximity: number;
  expiry: number;
  quantity: number;
  feasibility: number;
  final: number;
} {
  const proximity = calculateProximityScore(distanceKm);
  const expiry = calculateExpiryScore(expiryDate);
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
  console.log(
    `[InventoryAgent] Searching for ${bloodType} units across hospital network and blood banks...`
  );

  // Find all inventory units matching blood type (excluding requesting facility)
  // This searches both hospitals and blood banks (stored in HospitalRegistration)
  const inventoryUnits = await db.inventoryUnit.findMany({
    where: {
      bloodType: bloodType,
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
    `[InventoryAgent] Found ${inventoryUnits.length} available units across hospitals and blood banks`
  );

  if (inventoryUnits.length === 0) {
    return [];
  }

  const rankedUnits: RankedInventoryUnit[] = [];

  for (const unit of inventoryUnits) {
    const hospital = unit.hospital;

    // Check blood type compatibility
    if (!isBloodTypeCompatible(unit.bloodType, bloodType)) {
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
export async function processInventorySearch(requestId: string): Promise<{
  success: boolean;
  unitsFound: number;
  reserved: boolean;
  error?: string;
}> {
  try {
    console.log(
      `[InventoryAgent] Processing inventory search for request: ${requestId}`
    );

    // 1. Get the shortage event details
    const shortageEvent = await db.agentEvent.findFirst({
      where: {
        payload: {
          path: ["id"],
          equals: requestId,
        } as any,
        type: "shortage.request.v1",
      },
    });

    if (!shortageEvent) {
      return { success: false, unitsFound: 0, reserved: false, error: "Shortage event not found" };
    }

    const payload = shortageEvent.payload as any;
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
            reasoning: `No available inventory found for ${bloodType} across hospitals and blood banks. All units are either reserved, expired, or insufficient.`,
          },
          confidence: 1.0,
        },
      });

      return { success: true, unitsFound: 0, reserved: false };
    }

    // 3. Select best unit(s) - prefer single source if possible
    const topUnit = rankedUnits[0];

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
        transportMethod: topUnit.distance_km < 15 ? "ambulance" : "courier",
        eta: new Date(Date.now() + (topUnit.distance_km / 40) * 60 * 60 * 1000), // Simple ETA
      },
    });

    console.log(`[InventoryAgent] Created transport request: ${transportRequest.id}`);

    // 7. Trigger Logistics Agent to plan transport
    console.log(`[InventoryAgent] Triggering Logistics Agent for transport planning...`);
    try {
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
      fetch(`${baseUrl}/api/agents/logistics`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          action: 'plan_transport',
          transport_id: transportRequest.id
        })
      }).catch(err => {
        console.error("[InventoryAgent] Failed to trigger Logistics Agent:", err);
      });
    } catch (error) {
      console.error("[InventoryAgent] Error triggering Logistics Agent:", error);
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
          reasoning: `Selected ${topUnit.hospital_name} based on optimal scoring. Score: ${topUnit.scores.final}/100. Distance: ${topUnit.distance_km.toFixed(1)}km. ${unitsToReserve} units reserved.`,
          top_alternatives: rankedUnits.slice(0, 3).map((u) => ({
            rank: u.rank,
            hospital: u.hospital_name,
            score: u.scores.final,
            distance_km: u.distance_km,
          })),
        },
        confidence: topUnit.scores.final / 100,
      },
    });

    // 9. Update workflow state
    await db.workflowState.update({
      where: { requestId },
      data: {
        status: "fulfillment_in_progress",
        currentStep: "inventory_matched",
        metadata: {
          ...(
            (await db.workflowState.findUnique({ where: { requestId } }))
              ?.metadata as object
          ),
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
    return { success: false, unitsFound: 0, reserved: false, error: String(error) };
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

  console.log(`[InventoryAgent] Released reserved units for request: ${requestId}`);
}

