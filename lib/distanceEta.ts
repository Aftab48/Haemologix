/**
 * Client-safe distance and ETA utilities.
 * Matches logic used by LogisticsAgent for donor-to-hospital ETAs.
 */

/**
 * Haversine distance between two points (lat/lng in degrees).
 * Returns distance in kilometers, rounded to 1 decimal.
 */
export function haversineDistanceKm(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371; // Earth's radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 10) / 10;
}

/**
 * Time-of-day traffic multiplier (same as LogisticsAgent).
 */
function getTrafficMultiplier(hour: number): number {
  if ((hour >= 7 && hour < 9) || (hour >= 17 && hour < 19)) return 1.5;
  if (hour >= 10 && hour < 16) return 1.0;
  if (hour >= 19 || hour < 7) return 0.8;
  return 1.0;
}

export type TransportMode =
  | "walking"
  | "bicycle"
  | "publicTransport"
  | "car"
  | "motorcycle";

export interface DonorEtaResult {
  distanceKm: number;
  /** ETA in minutes per mode (includes ~25 min prep + check-in). */
  etaByMode: {
    walking: number;
    bicycle: number;
    publicTransport: number;
    car: number;
    motorcycle: number;
  };
  recommendedMode: TransportMode;
  recommendedEtaMinutes: number;
}

/**
 * Compute expected ETA from donor to hospital by transport mode.
 * Uses same speeds and prep/check-in buffer (25 min) as LogisticsAgent.
 */
export function calculateDonorEta(distanceKm: number): DonorEtaResult {
  const hour = new Date().getHours();
  const trafficMultiplier = getTrafficMultiplier(hour);

  const transportSpeeds = {
    walking: 5,
    bicycle: 15,
    publicTransport: 25,
    car: 40,
    motorcycle: 50,
  };

  const baseTimes = {
    walking: (distanceKm / transportSpeeds.walking) * 60,
    bicycle: (distanceKm / transportSpeeds.bicycle) * 60,
    publicTransport: (distanceKm / transportSpeeds.publicTransport) * 60,
    car: (distanceKm / transportSpeeds.car) * 60,
    motorcycle: (distanceKm / transportSpeeds.motorcycle) * 60,
  };

  const adjustedTimes = {
    walking: baseTimes.walking,
    bicycle: baseTimes.bicycle,
    publicTransport: baseTimes.publicTransport * trafficMultiplier,
    car: baseTimes.car * trafficMultiplier,
    motorcycle: baseTimes.motorcycle * trafficMultiplier,
  };

  const prepAndCheckin = 15 + 10; // 25 minutes

  const etaByMode = {
    walking: Math.ceil(adjustedTimes.walking + prepAndCheckin),
    bicycle: Math.ceil(adjustedTimes.bicycle + prepAndCheckin),
    publicTransport: Math.ceil(adjustedTimes.publicTransport + prepAndCheckin),
    car: Math.ceil(adjustedTimes.car + prepAndCheckin),
    motorcycle: Math.ceil(adjustedTimes.motorcycle + prepAndCheckin),
  };

  let recommendedMode: TransportMode;
  let recommendedEtaMinutes: number;

  if (distanceKm <= 1.5) {
    recommendedMode = "walking";
    recommendedEtaMinutes = etaByMode.walking;
  } else if (distanceKm <= 5) {
    recommendedMode = "bicycle";
    recommendedEtaMinutes = etaByMode.bicycle;
  } else if (distanceKm <= 10) {
    recommendedMode = "publicTransport";
    recommendedEtaMinutes = etaByMode.publicTransport;
  } else {
    recommendedMode = "car";
    recommendedEtaMinutes = etaByMode.car;
  }

  return {
    distanceKm,
    etaByMode,
    recommendedMode,
    recommendedEtaMinutes,
  };
}

/** Human-readable label for transport mode. */
export function transportModeLabel(mode: TransportMode): string {
  const labels: Record<TransportMode, string> = {
    walking: "Walking",
    bicycle: "Bicycle",
    publicTransport: "Public transport",
    car: "Car",
    motorcycle: "Motorcycle",
  };
  return labels[mode] ?? mode;
}
