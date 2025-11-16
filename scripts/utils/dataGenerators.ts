/**
 * Utility functions for generating realistic synthetic training data
 */

const BLOOD_TYPES = ["O+", "A+", "B+", "O-", "A-", "AB+", "B-", "AB-"] as const;
const BLOOD_TYPE_WEIGHTS = [0.35, 0.30, 0.15, 0.08, 0.06, 0.04, 0.015, 0.005];

const URGENCY_LEVELS = ["MEDIUM", "HIGH", "CRITICAL"] as const;
const URGENCY_WEIGHTS = [0.5, 0.3, 0.2];

const TRAFFIC_CONDITIONS = ["light", "moderate", "heavy"] as const;
const TRAFFIC_WEIGHTS = [0.4, 0.4, 0.2];

/**
 * Generate a random number between min and max (inclusive)
 */
export function randomFloat(min: number, max: number): number {
  return Math.random() * (max - min) + min;
}

/**
 * Generate a random integer between min and max (inclusive)
 */
export function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Select a value from array based on weights
 */
export function weightedRandom<T>(items: readonly T[], weights: number[]): T {
  const totalWeight = weights.reduce((sum, w) => sum + w, 0);
  let random = Math.random() * totalWeight;
  
  for (let i = 0; i < items.length; i++) {
    random -= weights[i];
    if (random <= 0) {
      return items[i];
    }
  }
  return items[items.length - 1];
}

/**
 * Generate blood type with realistic distribution
 */
export function generateBloodType(): string {
  return weightedRandom(BLOOD_TYPES, BLOOD_TYPE_WEIGHTS);
}

/**
 * Generate urgency level with realistic distribution
 */
export function generateUrgency(): string {
  return weightedRandom(URGENCY_LEVELS, URGENCY_WEIGHTS);
}

/**
 * Generate distance with realistic distribution
 * 0-10km: 40%, 10-20km: 35%, 20-30km: 15%, 30-50km: 10%
 */
export function generateDistance(): number {
  const rand = Math.random();
  if (rand < 0.4) return randomFloat(0, 10);
  if (rand < 0.75) return randomFloat(10, 20);
  if (rand < 0.9) return randomFloat(20, 30);
  return randomFloat(30, 50);
}

/**
 * Generate time of day with realistic distribution
 * Business hours (9am-5pm): 60%, Evening (5pm-9pm): 25%, Night (9pm-9am): 15%
 */
export function generateTimeOfDay(): { hour: number; timeString: string } {
  const rand = Math.random();
  let hour: number;
  
  if (rand < 0.6) {
    // Business hours: 9am-5pm
    hour = randomInt(9, 16);
  } else if (rand < 0.85) {
    // Evening: 5pm-9pm
    hour = randomInt(17, 20);
  } else {
    // Night/Early morning: 9pm-9am
    const nightRand = Math.random();
    if (nightRand < 0.5) {
      hour = randomInt(21, 23); // 9pm-11pm
    } else {
      hour = randomInt(0, 8); // 12am-8am
    }
  }
  
  const minutes = randomInt(0, 59);
  const date = new Date();
  date.setHours(hour, minutes, 0, 0);
  
  return {
    hour,
    timeString: date.toISOString(),
  };
}

/**
 * Generate traffic conditions
 */
export function generateTrafficConditions(): string {
  return weightedRandom(TRAFFIC_CONDITIONS, TRAFFIC_WEIGHTS);
}

/**
 * Calculate ETA based on distance and traffic
 */
export function calculateETA(distanceKm: number, traffic: string): number {
  const baseSpeed = 40; // km/h average
  let speedMultiplier = 1.0;
  
  if (traffic === "heavy") speedMultiplier = 0.6;
  else if (traffic === "moderate") speedMultiplier = 0.8;
  
  const baseMinutes = (distanceKm / baseSpeed) * 60;
  const trafficAdjusted = baseMinutes / speedMultiplier;
  const buffer = randomFloat(10, 25); // Buffer time
  
  return Math.ceil(trafficAdjusted + buffer);
}

/**
 * Generate reliability rate (0-1)
 * Higher reliability correlates with better outcomes
 */
export function generateReliability(): number {
  // Most donors have 0.5-1.0 reliability, with bias toward higher values
  const rand = Math.random();
  if (rand < 0.3) return randomFloat(0.5, 0.7); // Lower reliability
  if (rand < 0.7) return randomFloat(0.7, 0.9); // Medium reliability
  return randomFloat(0.9, 1.0); // High reliability
}

/**
 * Generate health score (60-100)
 */
export function generateHealthScore(): number {
  // Most donors have good health (70-100)
  const rand = Math.random();
  if (rand < 0.2) return randomFloat(60, 75); // Lower health
  return randomFloat(75, 100); // Good to excellent health
}

/**
 * Generate donor score (0-100) based on factors
 */
export function generateDonorScore(
  distance: number,
  reliability: number,
  health: number,
  urgency: string
): number {
  // Simplified scoring: distance (30%), reliability (25%), health (25%), urgency bonus (20%)
  const distanceScore = Math.max(0, 100 - (distance / 50) * 100);
  const reliabilityScore = reliability * 100;
  const healthScore = health;
  
  let urgencyBonus = 0;
  if (urgency === "CRITICAL") urgencyBonus = 20;
  else if (urgency === "HIGH") urgencyBonus = 10;
  
  return (
    distanceScore * 0.3 +
    reliabilityScore * 0.25 +
    healthScore * 0.25 +
    urgencyBonus
  );
}

/**
 * Calculate match score for coordinator selection
 */
export function calculateMatchScore(
  eta_minutes: number,
  distance_km: number,
  reliability_rate: number,
  health_score: number
): number {
  const eta_score = Math.max(0, 100 - (eta_minutes / 120) * 100);
  const distance_score = Math.max(0, 100 - (distance_km / 50) * 100);
  const reliability_score = reliability_rate * 100;

  const match_score =
    eta_score * 0.4 +
    distance_score * 0.3 +
    reliability_score * 0.2 +
    health_score * 0.1;

  return parseFloat(match_score.toFixed(2));
}

/**
 * Generate priority score for urgency assessment
 */
export function calculatePriorityScore(
  urgency: string,
  bloodType: string,
  currentUnits: number,
  daysRemaining: number
): number {
  let score = 0;
  
  // Urgency component (0-40)
  if (urgency === "CRITICAL") score += 40;
  else if (urgency === "HIGH") score += 30;
  else if (urgency === "MEDIUM") score += 20;
  else score += 10;
  
  // Blood type rarity (0-30)
  const rareTypes = ["O-", "AB-"];
  if (rareTypes.includes(bloodType)) score += 30;
  else if (["A-", "B-"].includes(bloodType)) score += 20;
  else score += 10;
  
  // Stock level (0-20)
  if (currentUnits === 0) score += 20;
  else if (currentUnits < 5) score += 15;
  else if (currentUnits < 10) score += 10;
  else score += 5;
  
  // Time criticality (0-10)
  if (daysRemaining < 1) score += 10;
  else if (daysRemaining < 2) score += 7;
  else if (daysRemaining < 3) score += 5;
  else score += 2;
  
  return Math.min(100, score) / 100; // Normalize to 0-1
}

/**
 * Generate hospital location (Mumbai area coordinates)
 */
export function generateLocation(): { latitude: string; longitude: string } {
  // Mumbai area: 18.5-19.5 N, 72.5-73.5 E
  const lat = randomFloat(18.5, 19.5);
  const lng = randomFloat(72.5, 73.5);
  return {
    latitude: lat.toFixed(6),
    longitude: lng.toFixed(6),
  };
}

/**
 * Generate UUID-like string for fake IDs
 */
export function generateFakeId(): string {
  return `${randomInt(100000, 999999)}-${randomInt(1000, 9999)}-${randomInt(1000, 9999)}-${randomInt(1000, 9999)}-${randomInt(100000000000, 999999999999)}`;
}

/**
 * Generate date in the past (for temporal distribution)
 */
export function generatePastDate(daysAgo: number): Date {
  const date = new Date();
  date.setDate(date.getDate() - daysAgo);
  return date;
}

/**
 * Generate outcome based on success rate
 */
export function generateOutcome(successRate: number): boolean {
  return Math.random() < successRate;
}

/**
 * Add variance to a value (±percentage)
 */
export function addVariance(value: number, percentage: number): number {
  const variance = value * (percentage / 100);
  const min = value - variance;
  const max = value + variance;
  return randomFloat(min, max);
}

