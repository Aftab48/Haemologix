/**
 * Intelligent Donor Scoring System
 * 5-factor algorithm for optimal donor matching
 */

export interface DonorScores {
  distance: number;
  history: number;
  responsiveness: number;
  timeOfDay: number;
  health: number;
  final: number;
}

/**
 * Calculate distance score (30% weight)
 * Closer donors score higher
 */
export function calculateDistanceScore(
  distanceKm: number,
  maxRadiusKm: number
): number {
  return Math.max(0, 100 - (distanceKm / maxRadiusKm) * 100);
}

/**
 * Calculate donation history score (25% weight)
 * Optimal: 90-180 days since last donation
 */
export function calculateHistoryScore(daysSinceLastDonation: number): number {
  if (daysSinceLastDonation >= 90 && daysSinceLastDonation <= 180) {
    return 100; // Optimal range
  } else if (daysSinceLastDonation > 180 && daysSinceLastDonation <= 365) {
    return 80; // Good
  } else if (daysSinceLastDonation > 365 && daysSinceLastDonation <= 730) {
    return 60; // Acceptable
  } else if (daysSinceLastDonation > 730) {
    return 40; // Long time ago
  } else {
    return 0; // Too recent (< 90 days)
  }
}

/**
 * Calculate responsiveness score (25% weight)
 * Based on historical response patterns
 */
export function calculateResponsivenessScore(
  totalAlertsReceived: number,
  alertsAccepted: number,
  avgResponseTimeMinutes: number
): number {
  // New donors get neutral score
  if (totalAlertsReceived === 0) {
    return 50;
  }

  const responseRate = alertsAccepted / totalAlertsReceived;
  const responseRateScore = responseRate * 70; // Max 70 points

  // Speed bonus: faster response = higher score
  const speedScore = Math.min(30, 30 - avgResponseTimeMinutes / 10);
  const speedBonus = Math.max(0, speedScore);

  return responseRateScore + speedBonus;
}

/**
 * Calculate time-of-day score (10% weight)
 * Best response times during business hours
 */
export function calculateTimeOfDayScore(urgency: string): number {
  const hour = new Date().getHours();

  // Critical urgency: all times are equal
  if (urgency === "critical") {
    return 100;
  }

  // Best times: 9-11am, 2-5pm
  if ((hour >= 9 && hour < 11) || (hour >= 14 && hour < 17)) {
    return 100;
  }

  // Acceptable: 11am-2pm, 5-8pm
  if ((hour >= 11 && hour < 14) || (hour >= 17 && hour < 20)) {
    return 80;
  }

  // Poor: 8pm-9am (night/early morning)
  return 40;
}

/**
 * Calculate health status score (10% weight)
 * Better health indicators = higher score
 */
export function calculateHealthScore(donor: {
  hemoglobin: string;
  bmi: string;
  recentVaccinations: boolean;
  medications: string | null;
}): number {
  let score = 0;

  // Hemoglobin (40 points)
  const hb = parseFloat(donor.hemoglobin);
  if (hb > 14) {
    score += 40;
  } else if (hb >= 13 && hb <= 14) {
    score += 32;
  } else {
    score += 24;
  }

  // BMI (30 points)
  const bmi = parseFloat(donor.bmi);
  if (bmi >= 18.5 && bmi <= 24.9) {
    score += 30;
  } else if (bmi >= 25 && bmi <= 29.9) {
    score += 24;
  } else {
    score += 18;
  }

  // Recent vaccinations (15 points)
  score += donor.recentVaccinations ? 10 : 15;

  // Medications (15 points)
  if (!donor.medications || donor.medications === "none") {
    score += 15;
  } else {
    score += 12;
  }

  return score;
}

/**
 * Calculate composite score with weights
 */
export function calculateCompositeScore(
  distanceScore: number,
  historyScore: number,
  responsivenessScore: number,
  timeScore: number,
  healthScore: number
): number {
  return (
    distanceScore * 0.3 +
    historyScore * 0.25 +
    responsivenessScore * 0.25 +
    timeScore * 0.1 +
    healthScore * 0.1
  );
}

/**
 * Calculate all scores for a donor
 */
export function scoreDonor(
  donor: any,
  distanceKm: number,
  maxRadiusKm: number,
  urgency: string,
  responseHistory?: {
    totalAlerts: number;
    accepted: number;
    avgResponseTime: number;
  }
): DonorScores {
  // Calculate days since last donation
  const daysSinceLastDonation = donor.lastDonation
    ? (Date.now() - new Date(donor.lastDonation).getTime()) /
      (1000 * 60 * 60 * 24)
    : 365; // Default to 1 year if never donated

  // Calculate individual scores
  const distance = calculateDistanceScore(distanceKm, maxRadiusKm);
  const history = calculateHistoryScore(daysSinceLastDonation);
  const responsiveness = calculateResponsivenessScore(
    responseHistory?.totalAlerts || 0,
    responseHistory?.accepted || 0,
    responseHistory?.avgResponseTime || 10
  );
  const timeOfDay = calculateTimeOfDayScore(urgency);
  const health = calculateHealthScore({
    hemoglobin: donor.hemoglobin,
    bmi: donor.bmi,
    recentVaccinations: donor.recentVaccinations,
    medications: donor.medications,
  });

  // Calculate final composite score
  const final = calculateCompositeScore(
    distance,
    history,
    responsiveness,
    timeOfDay,
    health
  );

  return {
    distance: Math.round(distance * 10) / 10,
    history: Math.round(history * 10) / 10,
    responsiveness: Math.round(responsiveness * 10) / 10,
    timeOfDay: Math.round(timeOfDay * 10) / 10,
    health: Math.round(health * 10) / 10,
    final: Math.round(final * 10) / 10,
  };
}

