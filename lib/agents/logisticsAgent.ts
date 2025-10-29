import { db } from "@/db";
import { AgentType } from "@prisma/client";
import { publishEvent } from "./eventBus";
import { calculateDistance } from "./donorAgent";

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
function getTrafficMultiplier(hour: number): number {
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
function calculateBaseTime(distanceKm: number): number {
  // Assume average speed: 40 km/h urban, 60 km/h highway
  // For simplicity, use 40 km/h as base
  const avgSpeedKmh = 40;
  const baseTimeMinutes = (distanceKm / avgSpeedKmh) * 60;
  return baseTimeMinutes;
}

/**
 * Select optimal transport method based on distance and urgency
 */
function selectTransportMethod(
  distanceKm: number,
  urgency: string
): "ambulance" | "courier" | "scheduled" {
  const urgencyLower = urgency?.toLowerCase();

  // Ambulance for critical short distance
  if (distanceKm < 15 && urgencyLower === "critical") {
    return "ambulance";
  }

  // Courier for medium distance and high/critical urgency
  if (distanceKm < 50 && (urgencyLower === "high" || urgencyLower === "critical")) {
    return "courier";
  }

  // Scheduled transport for low urgency or long distance
  return "scheduled";
}

/**
 * Calculate ETA with transport method adjustments
 */
function calculateETA(
  baseTimeMinutes: number,
  trafficMultiplier: number,
  method: "ambulance" | "courier" | "scheduled"
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
function validateColdChain(
  etaMinutes: number,
  method: "ambulance" | "courier" | "scheduled"
): { compliant: boolean; reason?: string } {
  const maxTransportHours = 6;
  const etaHours = etaMinutes / 60;

  if (etaHours > maxTransportHours) {
    return {
      compliant: false,
      reason: `Transport time ${etaHours.toFixed(1)}h exceeds 6-hour cold chain limit`,
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
    if (!fromHospital.latitude || !fromHospital.longitude || 
        !toHospital.latitude || !toHospital.longitude) {
      return { success: false, error: "Hospital coordinates missing" };
    }

    const distanceKm = calculateDistance(
      parseFloat(fromHospital.latitude),
      parseFloat(fromHospital.longitude),
      parseFloat(toHospital.latitude),
      parseFloat(toHospital.longitude)
    );

    // Calculate time factors
    const currentHour = new Date().getHours();
    const trafficMultiplier = getTrafficMultiplier(currentHour);
    const baseTimeMinutes = calculateBaseTime(distanceKm);

    // Get urgency from related alert (simplified - assume from metadata)
    const urgency = "high"; // This should come from the shortage request

    // Select transport method
    const method = selectTransportMethod(distanceKm, urgency);

    // Calculate ETA
    const adjustedEtaMinutes = calculateETA(baseTimeMinutes, trafficMultiplier, method);

    // Validate cold chain
    const coldChainValidation = validateColdChain(adjustedEtaMinutes, method);

    if (!coldChainValidation.compliant) {
      console.error(`[LogisticsAgent] Cold chain validation failed: ${coldChainValidation.reason}`);
      
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
            recommendation: "Escalate to manual coordination or find closer source",
          },
          confidence: 1.0,
        },
      });

      return { success: false, error: coldChainValidation.reason };
    }

    // Calculate pickup and delivery times
    const now = new Date();
    const pickupTime = new Date(now.getTime() + 15 * 60 * 1000); // +15 min prep
    const estimatedDelivery = new Date(pickupTime.getTime() + adjustedEtaMinutes * 60 * 1000);

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
          reasoning: `Selected ${method} transport for ${distanceKm.toFixed(1)}km journey. Base time: ${baseTimeMinutes.toFixed(0)}min, traffic multiplier: ${trafficMultiplier}x, final ETA: ${adjustedEtaMinutes}min. Pickup at ${pickupTime.toTimeString().slice(0, 5)}, delivery at ${estimatedDelivery.toTimeString().slice(0, 5)}.`,
        },
        confidence: 0.9,
      },
    });

    console.log(
      `[LogisticsAgent] Transport plan created: ${method}, ${distanceKm.toFixed(1)}km, ETA ${adjustedEtaMinutes}min`
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
    console.log(`[LogisticsAgent] Calculating donor ETA: ${donorId} -> ${hospitalId}`);

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
      const remainingMinutes = Math.max(0, Math.ceil((arrivalTime - now) / (60 * 1000)));
      
      console.log(
        `[LogisticsAgent] Donor already accepted. Expected arrival: ${existingResponse.expectedArrival.toTimeString().slice(0, 5)}. Remaining time: ${remainingMinutes}min`
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
    const donor = await db.donorRegistration.findUnique({
      where: { id: donorId },
    });

    const hospital = await db.hospitalRegistration.findUnique({
      where: { id: hospitalId },
    });

    if (!donor || !hospital) {
      return { success: false, error: "Donor or hospital not found" };
    }

    // Calculate distance
    if (!donor.latitude || !donor.longitude || !hospital.latitude || !hospital.longitude) {
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
      publicTransport: Math.ceil(adjustedTimes.publicTransport + prepAndCheckin),
      car: Math.ceil(adjustedTimes.car + prepAndCheckin),
      motorcycle: Math.ceil(adjustedTimes.motorcycle + prepAndCheckin),
    };

    // Recommend mode based on distance
    let recommendedMode: string;
    let recommendedEta: number;

    if (distanceKm <= 1.5) {
      recommendedMode = "walking";
      recommendedEta = etaOptions.walking;
    } else if (distanceKm <= 5) {
      recommendedMode = "bicycle";
      recommendedEta = etaOptions.bicycle;
    } else if (distanceKm <= 10) {
      recommendedMode = "publicTransport";
      recommendedEta = etaOptions.publicTransport;
    } else {
      recommendedMode = "car";
      recommendedEta = etaOptions.car;
    }

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
          reasoning: `Donor is ${distanceKm.toFixed(1)}km away. Calculated ETAs for all transport modes (includes 25min prep+check-in). Traffic multiplier: ${trafficMultiplier}x. Recommended: ${recommendedMode} (${recommendedEta}min).`,
        },
        confidence: 0.85,
      },
    });

    console.log(
      `[LogisticsAgent] Donor ETA calculated for ${distanceKm.toFixed(1)}km. Recommended: ${recommendedMode} (${recommendedEta}min)`
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
    console.log(`[LogisticsAgent] Updating transport status: ${transportId} -> ${status}`);

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

