/**
 * Feature builders shared by the simulator (training data) and the agents
 * (inference). Because BOTH paths call these exact functions, the model can
 * never see a feature at serve time that it did not see at train time.
 *
 * Rules:
 *  - Inputs are plain, framework-free objects (no Prisma types) so the sim can
 *    build them without a database.
 *  - Every builder returns a flat FeatureVector; categoricals are strings.
 *  - Time features come from the EVENT time passed in, never from Date.now().
 *  - `FEATURE_ORDER` lists the canonical column order per task; Python uses the
 *    dataset manifest, but keeping the list here documents the contract.
 */

import { getTrafficMultiplier } from "@/lib/agents/logisticsAgent";
import type { FeatureVector, PredictionTask } from "./types";

// ---------------------------------------------------------------------------
// Blood-type helpers (kept tiny and local so features.ts has no DB deps)
// ---------------------------------------------------------------------------

export const BLOOD_TYPES = ["O-", "O+", "A-", "A+", "B-", "B+", "AB-", "AB+"] as const;
export type BloodType = (typeof BLOOD_TYPES)[number];

/** Same rarity ordering hospitalAgent uses (higher = rarer / more critical). */
export const BLOOD_RARITY: Record<string, number> = {
  "AB-": 10,
  "O-": 10,
  "B-": 9,
  "AB+": 8,
  "A-": 7,
  "B+": 5,
  "A+": 4,
  "O+": 3,
};

export function bloodRarity(bloodType: string): number {
  return BLOOD_RARITY[bloodType] ?? 5;
}

// ---------------------------------------------------------------------------
// Time context
// ---------------------------------------------------------------------------

export interface TimeContext {
  hour: number; // 0-23 local
  dayOfWeek: number; // 0=Sunday .. 6
}

export function timeContextFrom(date: Date): TimeContext {
  return { hour: date.getHours(), dayOfWeek: date.getDay() };
}

function timeFeatures(t: TimeContext): FeatureVector {
  return {
    hour: t.hour,
    dayOfWeek: t.dayOfWeek,
    isNight: t.hour >= 21 || t.hour < 6,
    isWeekend: t.dayOfWeek === 0 || t.dayOfWeek === 6,
    trafficMultiplier: getTrafficMultiplier(t.hour),
  };
}

function urgencyLower(u: string): string {
  const v = (u || "medium").toLowerCase();
  return v === "low" || v === "medium" || v === "high" || v === "critical" ? v : "medium";
}

function round(n: number, dp = 3): number {
  const f = 10 ** dp;
  return Math.round(n * f) / f;
}

// ---------------------------------------------------------------------------
// Donor notification / acceptance / attendance / response time
// ---------------------------------------------------------------------------

export interface DonorFeatureInput {
  /** Donor side */
  donorBloodType: string;
  distanceKm: number;
  daysSinceLastDonation: number | null; // null = never donated
  priorAlerts: number;
  priorAccepted: number;
  priorArrived: number;
  priorNoShows: number;
  avgResponseMinutes: number | null;
  alertsLast7Days: number; // fatigue
  unscreened: boolean;
  /** Ranking scores from lib/agents/donorScoring.scoreDonor */
  scores: {
    distance: number;
    history: number;
    responsiveness: number;
    timeOfDay: number;
    health: number;
    final: number;
  };
  rank: number; // 1-based position in ranked list
  /** Alert side */
  alertBloodType: string;
  urgency: string;
  unitsNeeded: number;
  searchRadiusKm: number;
  notifiedCount: number; // batch size this donor was part of
  eligibleCount: number; // pool size
  time: TimeContext;
}

export function donorNotificationFeatures(i: DonorFeatureInput): FeatureVector {
  const priorAcceptRate = i.priorAlerts > 0 ? i.priorAccepted / i.priorAlerts : 0.5;
  const priorShowRate = i.priorAccepted > 0 ? i.priorArrived / i.priorAccepted : 0.75;
  return {
    distanceKm: round(i.distanceKm, 2),
    searchRadiusKm: i.searchRadiusKm,
    distanceRatio: round(i.searchRadiusKm > 0 ? i.distanceKm / i.searchRadiusKm : 1),
    urgency: urgencyLower(i.urgency),
    alertBloodType: i.alertBloodType,
    donorBloodType: i.donorBloodType,
    exactMatch: i.donorBloodType === i.alertBloodType,
    rarity: bloodRarity(i.alertBloodType),
    unitsNeeded: i.unitsNeeded,
    notifiedCount: i.notifiedCount,
    eligibleCount: i.eligibleCount,
    rank: i.rank,
    daysSinceLastDonation: i.daysSinceLastDonation ?? 365,
    neverDonated: i.daysSinceLastDonation === null,
    priorAlerts: i.priorAlerts,
    priorAcceptRate: round(priorAcceptRate),
    priorShowRate: round(priorShowRate),
    priorNoShows: i.priorNoShows,
    avgResponseMinutes: i.avgResponseMinutes ?? 10,
    alertsLast7Days: i.alertsLast7Days,
    unscreened: i.unscreened,
    scoreDistance: i.scores.distance,
    scoreHistory: i.scores.history,
    scoreResponsiveness: i.scores.responsiveness,
    scoreTimeOfDay: i.scores.timeOfDay,
    scoreHealth: i.scores.health,
    scoreFinal: i.scores.final,
    ...timeFeatures(i.time),
  };
}

export interface DonorShowFeatureInput extends DonorFeatureInput {
  responseMinutes: number; // how long they took to accept
  etaMinutes: number; // deterministic ETA at acceptance
  acceptTime: TimeContext;
}

/** Features for P(show | accepted) and donor_eta. */
export function donorShowFeatures(i: DonorShowFeatureInput): FeatureVector {
  return {
    ...donorNotificationFeatures(i),
    responseMinutes: round(i.responseMinutes, 1),
    etaMinutes: i.etaMinutes,
    acceptHour: i.acceptTime.hour,
    acceptIsNight: i.acceptTime.hour >= 21 || i.acceptTime.hour < 6,
  };
}

// ---------------------------------------------------------------------------
// Inventory / transport
// ---------------------------------------------------------------------------

export interface InventoryFeatureInput {
  sourceType: "hospital" | "blood_bank";
  distanceKm: number;
  unitsAvailable: number;
  unitsNeeded: number;
  unitsRequested: number;
  daysToExpiry: number;
  unitBloodType: string;
  alertBloodType: string;
  urgency: string;
  transportMethod: "ambulance" | "courier" | "scheduled";
  etaMinutes: number; // deterministic ETA
  scores: { proximity: number; expiry: number; quantity: number; feasibility: number; final: number };
  rank: number;
  candidateCount: number;
  networkAgreement: boolean;
  coldStorage: boolean;
  time: TimeContext;
}

export function inventoryUnitFeatures(i: InventoryFeatureInput): FeatureVector {
  return {
    sourceType: i.sourceType,
    distanceKm: round(i.distanceKm, 2),
    unitsAvailable: i.unitsAvailable,
    unitsNeeded: i.unitsNeeded,
    unitsRequested: i.unitsRequested,
    coverageRatio: round(i.unitsNeeded > 0 ? i.unitsRequested / i.unitsNeeded : 1),
    daysToExpiry: i.daysToExpiry,
    unitBloodType: i.unitBloodType,
    alertBloodType: i.alertBloodType,
    exactMatch: i.unitBloodType === i.alertBloodType,
    urgency: urgencyLower(i.urgency),
    transportMethod: i.transportMethod,
    etaMinutes: i.etaMinutes,
    scoreProximity: i.scores.proximity,
    scoreExpiry: i.scores.expiry,
    scoreQuantity: i.scores.quantity,
    scoreFeasibility: i.scores.feasibility,
    scoreFinal: i.scores.final,
    rank: i.rank,
    candidateCount: i.candidateCount,
    networkAgreement: i.networkAgreement,
    coldStorage: i.coldStorage,
    ...timeFeatures(i.time),
  };
}

// ---------------------------------------------------------------------------
// Urgency (hospital agent)
// ---------------------------------------------------------------------------

export interface UrgencyFeatureInput {
  bloodType: string;
  currentUnits: number;
  dailyUsage: number;
  daysRemaining: number;
  minimumRequired: number | null;
  activeAlertsSameType: number; // regional demand
  hospitalIsBloodBank: boolean;
  time: TimeContext;
}

export function urgencyFeatures(i: UrgencyFeatureInput): FeatureVector {
  return {
    bloodType: i.bloodType,
    rarity: bloodRarity(i.bloodType),
    currentUnits: i.currentUnits,
    dailyUsage: round(i.dailyUsage, 2),
    daysRemaining: round(i.daysRemaining, 2),
    minimumRequired: i.minimumRequired ?? 0,
    stockRatio: round(i.minimumRequired ? i.currentUnits / i.minimumRequired : 1),
    activeAlertsSameType: i.activeAlertsSameType,
    hospitalIsBloodBank: i.hospitalIsBloodBank,
    ...timeFeatures(i.time),
  };
}

// ---------------------------------------------------------------------------
// Alert-level: will this alert resolve inside its window?
// ---------------------------------------------------------------------------

export interface AlertWindowFeatureInput {
  bloodType: string;
  urgency: string;
  unitsNeeded: number;
  searchRadiusKm: number;
  eligibleDonors: number;
  notifiedDonors: number;
  sumScoreFinal: number; // Σ score of notified donors (deterministic proxy for expected arrivals)
  networkUnitsAvailable: number; // compatible, unreserved, unexpired units in network
  nearestInventoryKm: number | null;
  bloodBanksInRange: number;
  activeAlertsSameType: number;
  windowHours: number;
  time: TimeContext;
}

export function alertWindowFeatures(i: AlertWindowFeatureInput): FeatureVector {
  return {
    bloodType: i.bloodType,
    rarity: bloodRarity(i.bloodType),
    urgency: urgencyLower(i.urgency),
    unitsNeeded: i.unitsNeeded,
    searchRadiusKm: i.searchRadiusKm,
    eligibleDonors: i.eligibleDonors,
    notifiedDonors: i.notifiedDonors,
    donorsPerUnit: round(i.unitsNeeded > 0 ? i.notifiedDonors / i.unitsNeeded : i.notifiedDonors),
    sumScoreFinal: round(i.sumScoreFinal, 1),
    networkUnitsAvailable: i.networkUnitsAvailable,
    nearestInventoryKm: i.nearestInventoryKm ?? 999,
    hasInventoryOption: i.networkUnitsAvailable > 0,
    bloodBanksInRange: i.bloodBanksInRange,
    activeAlertsSameType: i.activeAlertsSameType,
    windowHours: i.windowHours,
    ...timeFeatures(i.time),
  };
}

// ---------------------------------------------------------------------------
// Eligibility review (verification agent) — deterministic result stays authoritative
// ---------------------------------------------------------------------------

export interface EligibilityReviewInput {
  age: number;
  weightKg: number;
  bmi: number | null;
  hemoglobin: number | null;
  gender: string;
  daysSinceLastDonation: number | null;
  passed: boolean;
  failedCount: number;
  hardFailure: boolean; // age / weight / hb / disease test
}

export function eligibilityReviewFeatures(i: EligibilityReviewInput): FeatureVector {
  const g = (i.gender || "").toLowerCase();
  const minHb = g === "male" ? 13.0 : 12.5;
  const minInterval = g === "male" ? 90 : 120;
  const margins: number[] = [];
  margins.push(Math.min(Math.abs(i.age - 18), Math.abs(65 - i.age)) / 47);
  margins.push(Math.abs(i.weightKg - 50) / 50);
  if (i.bmi !== null) margins.push(Math.abs(i.bmi - 18.5) / 18.5);
  if (i.hemoglobin !== null) margins.push(Math.abs(i.hemoglobin - minHb) / minHb);
  if (i.daysSinceLastDonation !== null)
    margins.push(Math.abs(i.daysSinceLastDonation - minInterval) / minInterval);
  const minMargin = margins.length ? Math.min(...margins) : 1;
  return {
    age: i.age,
    weightKg: round(i.weightKg, 1),
    bmi: i.bmi ?? 0,
    bmiMissing: i.bmi === null,
    hemoglobin: i.hemoglobin ?? 0,
    hemoglobinMissing: i.hemoglobin === null,
    gender: g === "male" || g === "female" ? g : "other",
    daysSinceLastDonation: i.daysSinceLastDonation ?? 365,
    neverDonated: i.daysSinceLastDonation === null,
    passed: i.passed,
    failedCount: i.failedCount,
    hardFailure: i.hardFailure,
    minMarginRatio: round(minMargin, 4),
  };
}

// ---------------------------------------------------------------------------
// Canonical column order (documentation + used by the sim manifest)
// ---------------------------------------------------------------------------

export const FEATURE_BUILDERS: Record<PredictionTask, string> = {
  donor_accept: "donorNotificationFeatures",
  donor_show: "donorShowFeatures",
  donor_response_time: "donorNotificationFeatures",
  donor_eta: "donorShowFeatures",
  inventory_delivery_ok: "inventoryUnitFeatures",
  delivery_time: "inventoryUnitFeatures",
  urgency_priority: "urgencyFeatures",
  alert_resolves_in_window: "alertWindowFeatures",
  eligibility_needs_review: "eligibilityReviewFeatures",
};
