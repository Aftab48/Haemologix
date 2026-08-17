import { db } from "@/db";
import { AgentType } from "@prisma/client";
import { publishEvent } from "./eventBus";
import { calculateDistance } from "./donorAgent";
import { consultModel, decisionBasis, nowTimeContext } from "@/lib/ml/agentBridge";
import { explainTransport } from "@/lib/ml/explain";
import { donorShowFeatures, inventoryUnitFeatures } from "@/lib/ml/features";
import { getAlertWindowHours } from "@/lib/ml/flags";
import { chooseTransportMethod } from "@/lib/ml/policy/inventoryPolicy";

/**
 * LOGISTICS AGENT
 * Plans optimal transport routes, calculates accurate ETAs,
 * selects transport methods, and tracks delivery status.
 */

export type TransportPlan = {
  transport_id: string;
  method: "ambulance" | "courier" | "scheduled";
  distance_km: number;
  base_eta_minutes: number;
  adjusted_eta_minutes: number;
  traffic_multiplier: number;
  pickup_time: Date;
  estimated_delivery: Date;
  cold_chain_compliant: boolean;
  route_details: {
    from: { name: string; lat: number; lng: number; address: string };
    to: { name: string; lat: number; lng: number; address: string };
    map_url: string;
  };
};

/**
 * Calculate time-of-day traffic multiplier
 */
export function getTrafficMultiplier(hour: number): number {
  // Rush hours: 7-9am, 5-7pm
  if ((hour >= 7 && hour < 9) || (hour >= 17 && hour < 19)) {
    return 1.5; // 50% slower
  }
  // Normal hours: 10am-4pm
  if (hour >= 10 && hour < 16) {
    return 1.0; // Normal traffic
  }
  // Night: 7pm-7am
  if (hour >= 19 || hour < 7) {
    return 0.8; // 20% faster
  }
  // Default
  return 1.0;
}

/**
 * Calculate base travel time based on distance and road type
 */
export function calculateBaseTime(distanceKm: number): number {
  // Assume average speed: 40 km/h urban, 60 km/h highway
  // For simplicity, use 40 km/h as base
  const avgSpeedKmh = 40;
  const baseTimeMinutes = (distanceKm / avgSpeedKmh) * 60;
  return baseTimeMinutes;
}

/**
 * Select optimal transport method based on distance and urgency
 */
export type TransportMethod = "ambulance" | "courier" | "scheduled";

export function selectTransportMethod(
  distanceKm: number,
  urgency: string
): TransportMethod {
  const urgencyLower = urgency?.toLowerCase();

  // Ambulance for critical short distance
  if (distanceKm < 15 && urgencyLower === "critical") {
    return "ambulance";
  }

  // Courier for medium distance and high/critical urgency
  if (
    distanceKm < 50 &&
    (urgencyLower === "high" || urgencyLower === "critical")
  ) {
    return "courier";
  }

  // Scheduled transport for low urgency or long distance
  return "scheduled";
}

/**
 * Calculate ETA with transport method adjustments
 */
export function calculateETA(
  baseTimeMinutes: number,
  trafficMultiplier: number,
  method: TransportMethod
): number {
  let adjustedTime = baseTimeMinutes * trafficMultiplier;

  // Apply method-specific adjustments
  switch (method) {
    case "ambulance":
      // Can use sirens, 30% faster
      adjustedTime *= 0.7;
      break;
    case "courier":
      // Normal speed
      adjustedTime *= 1.0;
      break;
    case "scheduled":
      // Batching delay + slower
      adjustedTime = adjustedTime * 1.2 + 60; // +60 min batching
      break;
  }

  return Math.ceil(adjustedTime);
}

/**
 * Validate cold chain compliance
 */
export function validateColdChain(
  etaMinutes: number,
  method: TransportMethod
): { compliant: boolean; reason?: string } {
  const maxTransportHours = 6;
  const etaHours = etaMinutes / 60;

  if (etaHours > maxTransportHours) {
    return {
      compliant: false,
      reason: `Transport time ${etaHours.toFixed(
        1
      )}h exceeds 6-hour cold chain limit`,
    };
  }

  // Check if method has cold chain capability
  if (method === "scheduled") {
    // Scheduled transport should have proper cold storage
    return { compliant: true };
  }

  if (method === "ambulance" || method === "courier") {
    // Assume these have insulated containers
    return { compliant: true };
  }

  return { compliant: true };
}

/**
 * Plan inter-hospital/blood bank transport
 */
export async function planTransport(transportRequestId: string): Promise<{
  success: boolean;
  plan?: TransportPlan;
  error?: string;
}> {
  try {
    console.log(`[LogisticsAgent] Planning transport: ${transportRequestId}`);

    // Fetch transport request
    const transportRequest = await db.transportRequest.findUnique({
      where: { id: transportRequestId },
      include: {
        fromHospital: true,
        toHospital: true,
      },
    });

    if (!transportRequest) {
      return { success: false, error: "Transport request not found" };
    }

    const fromHospital = transportRequest.fromHospital;
    const toHospital = transportRequest.toHospital;

    // Calculate distance
    if (
      !fromHospital.latitude ||
      !fromHospital.longitude ||
      !toHospital.latitude ||
      !toHospital.longitude
    ) {
      return { success: false, error: "Hospital coordinates missing" };
    }

    const distanceKm = calculateDistance(
      parseFloat(fromHospital.latitude),
      parseFloat(fromHospital.longitude),
      parseFloat(toHospital.latitude),
      parseFloat(toHospital.longitude)
    );

    // Related alert (for urgency / window) via workflow state
    const workflowState = await db.workflowState.findFirst({
      where: { metadata: { path: ["transport_id"], equals: transportRequestId } },
    });
    const alert = workflowState ? await db.alert.findUnique({ where: { id: workflowState.requestId } }) : null;
    const urgency = (alert?.urgency || "medium").toLowerCase();
    const requestId = alert?.id ?? null;

    // Deterministic plan (authoritative for method; the model may only upgrade)
    const time = nowTimeContext();
    const baseTimeMinutes = calculateBaseTime(distanceKm);
    const currentHour = time.hour;
    const trafficMultiplier = getTrafficMultiplier(currentHour);
    const ruleMethod = selectTransportMethod(distanceKm, urgency);
    const ruleEtaMinutes = calculateETA(baseTimeMinutes, trafficMultiplier, ruleMethod);
    const windowMs = getAlertWindowHours() * 3_600_000;
    const minutesLeft = alert ? Math.max(0, (alert.createdAt.getTime() + windowMs - Date.now()) / 60_000) : Infinity;

    // Model: predicted delivery time for this transfer
    const features = inventoryUnitFeatures({
      sourceType: fromHospital.bloodBankLicense ? "blood_bank" : "hospital",
      distanceKm,
      unitsAvailable: transportRequest.units,
      unitsNeeded: alert ? parseInt(alert.unitsNeeded) || transportRequest.units : transportRequest.units,
      unitsRequested: transportRequest.units,
      daysToExpiry: 21, // not tracked on TransportRequest; neutral value
      unitBloodType: transportRequest.bloodType,
      alertBloodType: alert?.bloodType ?? transportRequest.bloodType,
      urgency,
      transportMethod: ruleMethod,
      etaMinutes: ruleEtaMinutes,
      scores: { proximity: Math.max(0, 100 - (distanceKm / 200) * 100), expiry: 60, quantity: 50, feasibility: fromHospital.networkParticipationAgreement ? 100 : 50, final: 0 },
      rank: 1,
      candidateCount: 1,
      networkAgreement: fromHospital.networkParticipationAgreement,
      coldStorage: fromHospital.coldStorageFacility,
      time,
    });
    const ml = await consultModel({
      agent: "LOGISTICS",
      requestId,
      items: [{ task: "delivery_time", ref: "time", subjectId: transportRequestId, features }],
    });
    const predictedMinutes = ml.scalar("time");
    const transportDecision = chooseTransportMethod({
      distanceKm,
      urgency,
      etaMinutes: ruleEtaMinutes,
      minutesLeft,
      predictedMinutes: ml.hasAuthority ? predictedMinutes : null,
    });
    const method: TransportMethod = transportDecision.method;
    const adjustedEtaMinutes =
      method === ruleMethod ? ruleEtaMinutes : calculateETA(baseTimeMinutes, trafficMultiplier, method);
    const transportReasoning = explainTransport(transportDecision, { mode: ml.mode, modelVersion: ml.modelVersion, fallbackReason: ml.fallbackReason });
    const routeOptimization =
      predictedMinutes !== null
        ? `Model predicts ${Math.round(predictedMinutes)} min door-to-door (rule ETA ${ruleEtaMinutes} min)`
        : "Standard route";
    console.log(`[LogisticsAgent] Plan: ${method}, ETA ${adjustedEtaMinutes} min (predicted ${predictedMinutes ?? "n/a"}, mode ${ml.mode})`);

    // Cold chain is always validated deterministically (never delegated)
    const coldChainValidation = validateColdChain(adjustedEtaMinutes, method);

    if (!coldChainValidation.compliant) {
      console.error(
        `[LogisticsAgent] Cold chain validation failed: ${coldChainValidation.reason}`
      );

      // Log decision about non-compliance
      await db.agentDecision.create({
        data: {
          agentType: AgentType.LOGISTICS,
          eventType: "cold_chain_violation",
          decision: {
            transport_id: transportRequestId,
            distance_km: distanceKm,
            eta_hours: adjustedEtaMinutes / 60,
            reason: coldChainValidation.reason,
            recommendation:
              "Escalate to manual coordination or find closer source",
            ...decisionBasis(),
          },
          confidence: null,
        },
      });

      return { success: false, error: coldChainValidation.reason };
    }

    // Calculate pickup and delivery times
    const now = new Date();
    const pickupTime = new Date(now.getTime() + 15 * 60 * 1000); // +15 min prep
    const estimatedDelivery = new Date(
      pickupTime.getTime() + adjustedEtaMinutes * 60 * 1000
    );

    // Create route details
    const mapUrl = `https://www.google.com/maps/dir/${fromHospital.latitude},${fromHospital.longitude}/${toHospital.latitude},${toHospital.longitude}`;

    const plan: TransportPlan = {
      transport_id: transportRequestId,
      method,
      distance_km: distanceKm,
      base_eta_minutes: baseTimeMinutes,
      adjusted_eta_minutes: adjustedEtaMinutes,
      traffic_multiplier: trafficMultiplier,
      pickup_time: pickupTime,
      estimated_delivery: estimatedDelivery,
      cold_chain_compliant: coldChainValidation.compliant,
      route_details: {
        from: {
          name: fromHospital.hospitalName,
          lat: parseFloat(fromHospital.latitude),
          lng: parseFloat(fromHospital.longitude),
          address: fromHospital.hospitalAddress,
        },
        to: {
          name: toHospital.hospitalName,
          lat: parseFloat(toHospital.latitude),
          lng: parseFloat(toHospital.longitude),
          address: toHospital.hospitalAddress,
        },
        map_url: mapUrl,
      },
    };

    // Update transport request with plan
    await db.transportRequest.update({
      where: { id: transportRequestId },
      data: {
        transportMethod: method,
        pickupTime: pickupTime,
        eta: estimatedDelivery,
        status: "pending",
      },
    });

    // Publish logistics.plan event
    await publishEvent(
      "logistics.plan.v1",
      {
        type: "logistics.plan.v1",
        transport_id: transportRequestId,
        method,
        distance_km: distanceKm,
        eta_minutes: adjustedEtaMinutes,
        pickup_time: pickupTime.toISOString(),
        estimated_delivery: estimatedDelivery.toISOString(),
        route: {
          from: plan.route_details.from,
          to: plan.route_details.to,
          map_url: mapUrl,
        },
        cold_chain_compliant: true,
        timestamp: new Date().toISOString(),
      },
      AgentType.LOGISTICS
    );

    // Log agent decision
    await db.agentDecision.create({
      data: {
        agentType: AgentType.LOGISTICS,
        eventType: "transport_planning",
        decision: {
          transport_id: transportRequestId,
          from_hospital: fromHospital.hospitalName,
          to_hospital: toHospital.hospitalName,
          distance_km: distanceKm,
          method,
          base_eta_minutes: baseTimeMinutes,
          traffic_multiplier: trafficMultiplier,
          adjusted_eta_minutes: adjustedEtaMinutes,
          pickup_time: pickupTime.toISOString(),
          estimated_delivery: estimatedDelivery.toISOString(),
          cold_chain_compliant: true,
          reasoning:
            transportReasoning ||
            `Selected ${method} transport for ${distanceKm.toFixed(
              1
            )}km journey. Base time: ${baseTimeMinutes.toFixed(
              0
            )}min, traffic multiplier: ${trafficMultiplier}x, final ETA: ${adjustedEtaMinutes}min. Pickup at ${pickupTime
              .toTimeString()
              .slice(0, 5)}, delivery at ${estimatedDelivery
              .toTimeString()
              .slice(0, 5)}.`,
          route_optimization: routeOptimization,
          rule_method: ruleMethod,
          rule_eta_minutes: ruleEtaMinutes,
          predicted_delivery_minutes: predictedMinutes,
          decision_source: transportDecision.source,
          ...ml.meta(),
          // ETA regressions carry no probability; report method only.
          decision_method: transportDecision.source === "model" ? "model" : decisionBasis(ml).decision_method,
          model_confidence: null,
        },
        confidence: null,
      },
    });

    console.log(
      `[LogisticsAgent] Transport plan created: ${method}, ${distanceKm.toFixed(
        1
      )}km, ETA ${adjustedEtaMinutes}min`
    );

    return { success: true, plan };
  } catch (error) {
    console.error("[LogisticsAgent] Error planning transport:", error);
    return { success: false, error: String(error) };
  }
}

/**
 * Calculate donor ETA to hospital with multiple transport modes
 */
export async function calculateDonorETA(
  donorId: string,
  hospitalId: string,
  requestId: string
): Promise<{
  success: boolean;
  eta_options?: {
    walking: number;
    bicycle: number;
    publicTransport: number;
    car: number;
    motorcycle: number;
  };
  distance_km?: number;
  recommended_mode?: string;
  recommended_eta?: number;
  error?: string;
}> {
  try {
    console.log(
      `[LogisticsAgent] Calculating donor ETA: ${donorId} -> ${hospitalId}`
    );

    // Check if donor already accepted and has expected arrival time
    const existingResponse = await db.donorResponseHistory.findFirst({
      where: {
        donorId,
        requestId,
        status: "accepted",
        expectedArrival: { not: null },
      },
    });

    if (existingResponse?.expectedArrival) {
      // Calculate remaining time instead of recalculating from scratch
      const now = Date.now();
      const arrivalTime = existingResponse.expectedArrival.getTime();
      const remainingMinutes = Math.max(
        0,
        Math.ceil((arrivalTime - now) / (60 * 1000))
      );

      console.log(
        `[LogisticsAgent] Donor already accepted. Expected arrival: ${existingResponse.expectedArrival
          .toTimeString()
          .slice(0, 5)}. Remaining time: ${remainingMinutes}min`
      );

      // Return remaining time with same structure
      return {
        success: true,
        eta_options: {
          walking: remainingMinutes,
          bicycle: remainingMinutes,
          publicTransport: remainingMinutes,
          car: remainingMinutes,
          motorcycle: remainingMinutes,
        },
        distance_km: existingResponse.distance || 0,
        recommended_mode: "accepted",
        recommended_eta: remainingMinutes,
      };
    }

    // Fetch donor and hospital
    const donor = await db.donor.findUnique({
      where: { id: donorId },
    });

    const hospital = await db.hospitalRegistration.findUnique({
      where: { id: hospitalId },
    });

    if (!donor || !hospital) {
      return { success: false, error: "Donor or hospital not found" };
    }

    // Calculate distance
    if (
      !donor.latitude ||
      !donor.longitude ||
      !hospital.latitude ||
      !hospital.longitude
    ) {
      return { success: false, error: "Coordinates missing" };
    }

    const distanceKm = calculateDistance(
      parseFloat(donor.latitude),
      parseFloat(donor.longitude),
      parseFloat(hospital.latitude),
      parseFloat(hospital.longitude)
    );

    // Get traffic multiplier for motorized transport
    const currentHour = new Date().getHours();
    const trafficMultiplier = getTrafficMultiplier(currentHour);

    // Define transport speeds (km/h)
    const transportSpeeds = {
      walking: 5,
      bicycle: 15,
      publicTransport: 25, // Includes stops and waiting
      car: 40,
      motorcycle: 50,
    };

    // Calculate base travel times for each mode
    const baseTimes = {
      walking: (distanceKm / transportSpeeds.walking) * 60,
      bicycle: (distanceKm / transportSpeeds.bicycle) * 60,
      publicTransport: (distanceKm / transportSpeeds.publicTransport) * 60,
      car: (distanceKm / transportSpeeds.car) * 60,
      motorcycle: (distanceKm / transportSpeeds.motorcycle) * 60,
    };

    // Apply traffic multiplier only to motorized transport
    // Walking and bicycle are not affected by road traffic
    const adjustedTimes = {
      walking: baseTimes.walking,
      bicycle: baseTimes.bicycle,
      publicTransport: baseTimes.publicTransport * trafficMultiplier,
      car: baseTimes.car * trafficMultiplier,
      motorcycle: baseTimes.motorcycle * trafficMultiplier,
    };

    // Add preparation time (15 min) and hospital check-in buffer (10 min) to all modes
    const prepAndCheckin = 15 + 10; // 25 minutes total

    const etaOptions = {
      walking: Math.ceil(adjustedTimes.walking + prepAndCheckin),
      bicycle: Math.ceil(adjustedTimes.bicycle + prepAndCheckin),
      publicTransport: Math.ceil(
        adjustedTimes.publicTransport + prepAndCheckin
      ),
      car: Math.ceil(adjustedTimes.car + prepAndCheckin),
      motorcycle: Math.ceil(adjustedTimes.motorcycle + prepAndCheckin),
    };

    // Recommend mode based on distance
    let recommendedMode: string;
    let ruleEta: number;

    if (distanceKm <= 1.5) {
      recommendedMode = "walking";
      ruleEta = etaOptions.walking;
    } else if (distanceKm <= 5) {
      recommendedMode = "bicycle";
      ruleEta = etaOptions.bicycle;
    } else if (distanceKm <= 10) {
      recommendedMode = "publicTransport";
      ruleEta = etaOptions.publicTransport;
    } else {
      recommendedMode = "car";
      ruleEta = etaOptions.car;
    }

    // Model: predicted arrival minutes for THIS donor (learned from actual arrivals).
    // Rule ETA stays the floor/ceiling: with authority the prediction is used but
    // clamped to [0.7, 1.6] × rule so a bad prediction cannot mislead the hospital.
    const alert = await db.alert.findUnique({ where: { id: requestId }, select: { bloodType: true, urgency: true, unitsNeeded: true, searchRadius: true } });
    const history = await db.donorResponseHistory.findMany({ where: { donorId }, select: { status: true, confirmed: true, noShow: true, releasedAt: true, releasedBy: true, responseTime: true, notifiedAt: true } });
    const responded = history.filter((h) => h.responseTime != null);
    const time = nowTimeContext();
    const showFeatures = donorShowFeatures({
      donorBloodType: donor.bloodGroup,
      distanceKm,
      daysSinceLastDonation: donor.lastDonationDate ? Math.round((Date.now() - new Date(donor.lastDonationDate).getTime()) / 86_400_000) : null,
      priorAlerts: history.length,
      priorAccepted: history.filter((h) => h.status === "accepted").length,
      priorArrived: history.filter((h) => h.confirmed).length,
      // same definitions as donorAgent.findAndRankDonors
      priorNoShows: history.filter((h) => h.noShow || h.releasedAt).length,
      priorReleases: history.filter((h) => h.releasedAt && h.releasedBy !== "system").length,
      avgResponseMinutes: responded.length ? responded.reduce((s, h) => s + (h.responseTime ?? 600), 0) / responded.length / 60 : null,
      alertsLast7Days: history.filter((h) => h.notifiedAt >= new Date(Date.now() - 7 * 86_400_000)).length,
      unscreened: false,
      scores: { distance: Math.max(0, 100 - (distanceKm / 35) * 100), history: 60, responsiveness: 50, timeOfDay: 80, health: 70, final: 65 },
      rank: 1,
      alertBloodType: alert?.bloodType ?? donor.bloodGroup,
      urgency: (alert?.urgency ?? "medium").toLowerCase(),
      unitsNeeded: alert ? parseInt(alert.unitsNeeded) || 1 : 1,
      searchRadiusKm: alert ? parseInt(alert.searchRadius) || 35 : 35,
      notifiedCount: 10,
      eligibleCount: 10,
      time,
      responseMinutes: responded.length ? Math.max(1, (responded[responded.length - 1].responseTime ?? 600) / 60) : 10,
      etaMinutes: ruleEta,
      acceptTime: time,
    });
    const ml = await consultModel({ agent: "LOGISTICS", requestId, items: [{ task: "donor_eta", ref: "eta", subjectId: donorId, features: showFeatures }] });
    const predictedEta = ml.scalar("eta");
    const recommendedEta =
      ml.hasAuthority && predictedEta !== null
        ? Math.round(Math.min(ruleEta * 1.6, Math.max(ruleEta * 0.7, predictedEta)))
        : ruleEta;

    // Log decision with all transport modes
    await db.agentDecision.create({
      data: {
        agentType: AgentType.LOGISTICS,
        eventType: "donor_eta_calculation",
        requestId,
        decision: {
          donor_id: donorId,
          hospital_id: hospitalId,
          distance_km: distanceKm,
          traffic_multiplier: trafficMultiplier,
          eta_options: etaOptions,
          recommended_mode: recommendedMode,
          recommended_eta: recommendedEta,
          rule_eta: ruleEta,
          predicted_eta: predictedEta,
          reasoning: `Donor is ${distanceKm.toFixed(
            1
          )}km away. Calculated ETAs for all transport modes (includes 25min prep+check-in). Traffic multiplier: ${trafficMultiplier}x. Recommended: ${recommendedMode} (${recommendedEta}min${
            predictedEta !== null ? `; model predicts ${Math.round(predictedEta)}min, rule ${ruleEta}min` : ""
          }).`,
          ...ml.meta(),
          decision_method: ml.hasAuthority && predictedEta !== null ? "model" : decisionBasis(ml).decision_method,
          model_confidence: null,
        },
        confidence: null,
      },
    });

    console.log(
      `[LogisticsAgent] Donor ETA calculated for ${distanceKm.toFixed(
        1
      )}km. Recommended: ${recommendedMode} (${recommendedEta}min)`
    );

    return {
      success: true,
      eta_options: etaOptions,
      distance_km: distanceKm,
      recommended_mode: recommendedMode,
      recommended_eta: recommendedEta,
    };
  } catch (error) {
    console.error("[LogisticsAgent] Error calculating donor ETA:", error);
    return { success: false, error: String(error) };
  }
}

/**
 * Update transport status (for tracking)
 */
export async function updateTransportStatus(
  transportId: string,
  status: "pending" | "picked_up" | "in_transit" | "delivered" | "cancelled"
): Promise<{ success: boolean; error?: string }> {
  try {
    console.log(
      `[LogisticsAgent] Updating transport status: ${transportId} -> ${status}`
    );

    await db.transportRequest.update({
      where: { id: transportId },
      data: {
        status,
        ...(status === "picked_up" && { pickupTime: new Date() }),
        ...(status === "delivered" && { deliveryTime: new Date() }),
      },
    });

    // Publish status update event
    await publishEvent(
      "logistics.status.v1",
      {
        type: "logistics.status.v1",
        transport_id: transportId,
        status,
        timestamp: new Date().toISOString(),
      },
      AgentType.LOGISTICS
    );

    console.log(`[LogisticsAgent] Transport status updated to: ${status}`);

    return { success: true };
  } catch (error) {
    console.error("[LogisticsAgent] Error updating transport status:", error);
    return { success: false, error: String(error) };
  }
}
