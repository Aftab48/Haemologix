/**
 * BEHAVIOURAL PRIORS — every stochastic assumption the simulator makes lives here.
 *
 * These are *assumptions*, chosen to be plausible for urban India blood-donation
 * response, and are the first thing to recalibrate once real outcomes are
 * harvested (Phase 4: scripts/sim/calibrate.ts prints fitted vs assumed rates).
 *
 * The manifest of every generated dataset records `priorsHash` so a model can
 * always be traced back to the priors that produced its training data.
 */

import type { Urgency } from "./types";

export const PRIORS = {
  /**
   * priors-v2 (2026-08-17): first calibration against production history
   * (205 notifications, 4.4% accepted vs 15% assumed in v1). Applied HALF the
   * suggested logit shift because the sample is 11 heavily re-notified donors
   * (fatigue-confounded); fatigue penalty raised for the same reason. Re-run
   * `npm run sim:calibrate` once n ≥ 300 and move the rest of the way.
   *
   * priors-v3 (2026-08-17): adds the coordinator's escalation ladder (`ladder`,
   * mirrors production flag defaults) and the network-broadcast response model
   * (`broadcast`, assumed — no production observations yet). All v2 behaviour
   * blocks are unchanged, so `runScenario(spec, { ladder: false })` reproduces
   * sim-v2 rows bit-for-bit.
   */
  version: "priors-v3",

  /** Real-world blood-group prevalence (approx. India). Used to build donor pools. */
  bloodTypePrevalence: {
    "O+": 0.32,
    "B+": 0.30,
    "A+": 0.20,
    "AB+": 0.07,
    "O-": 0.045,
    "B-": 0.03,
    "A-": 0.02,
    "AB-": 0.015,
  } as Record<string, number>,

  // ---------------------------------------------------------------------------
  // Donor acceptance: P(accept) = sigmoid(logit)
  // ---------------------------------------------------------------------------
  accept: {
    baseLogit: -0.85, // v1 was -0.15; calibrate suggested -1.51 (obs 4.4%); moved half-way → ≈ 8% overall acceptance
    perKm: -0.06, // each km further away  (10 km ≈ -0.6)
    urgencyBonus: { low: -0.3, medium: 0, high: 0.35, critical: 0.7 } as Record<Urgency, number>,
    exactMatchBonus: 0.15,
    nightPenalty: -0.8, // 21:00–06:00
    weekendBonus: 0.1,
    fatiguePerRecentAlert: -0.35, // alerts in last 7 days (raised from -0.25: prod pool was small and re-notified often)
    neverDonatedPenalty: -0.35,
    recentDonorBonus: 0.3, // donated within last 12 months
    priorAcceptRateWeight: 1.2, // (rate - 0.5) * weight
    unscreenedPenalty: -0.2,
    /** sd of the latent per-donor propensity */
    latentSd: 0.9,
    /** Probability a notified donor never answers at all (counted as no-response). */
    silentProb: 0.25,
  },

  // ---------------------------------------------------------------------------
  // Attendance given acceptance: P(show | accept) = sigmoid(logit)
  // ---------------------------------------------------------------------------
  show: {
    baseLogit: 1.9, // ≈ 87% at 0 km; ≈ 72% at 10 km / 45 min ETA
    perKm: -0.04,
    per10MinEta: -0.05,
    nightPenalty: -0.5,
    criticalBonus: 0.3,
    priorNoShowPenalty: -0.3, // per prior no-show, capped at 3
    priorShowRateWeight: 1.0,
    slowResponsePenalty: -0.35, // took > 20 min to accept
    latentSd: 0.8,
  },

  // ---------------------------------------------------------------------------
  // Timing
  // ---------------------------------------------------------------------------
  responseDelay: {
    /** log-normal median minutes for a responder, sigma of underlying normal */
    medianMin: 9,
    sigma: 0.75,
    nightMultiplier: 1.8,
    criticalMultiplier: 0.75,
    /** hard cap — after this the notification is considered unanswered */
    windowMin: 60,
  },
  travel: {
    /** multiplicative log-normal noise on the deterministic ETA */
    sigma: 0.28,
    /** donors without a vehicle at > 10 km are slower */
    noVehicleFarMultiplier: 1.35,
    /** minutes after expected arrival before a no-show is declared */
    noShowGraceMin: 45,
  },

  // ---------------------------------------------------------------------------
  // Inventory / blood banks / transfers / logistics
  // ---------------------------------------------------------------------------
  inventory: {
    /** fraction of hospitals holding some compatible stock in a random world */
    stockedFraction: 0.65,
    /** units per stocked (hospital, bloodType) — poisson-ish mean */
    meanUnits: 6,
    bloodBankMeanUnits: 18,
    /** days to expiry ~ uniform */
    expiryDaysMin: 3,
    expiryDaysMax: 42,
    dispatchReliabilityHospital: 0.9,
    dispatchReliabilityBloodBank: 0.85,
    transferWillingnessMean: 0.7,
    /** hospitals keep a 3-day buffer (matches inventoryAgent.calculateQuantityScore) */
    bufferDays: 3,
    /** minutes to confirm a request (dispatch decision) */
    dispatchDecisionMedianMin: 12,
  },
  transport: {
    /** log-normal noise on planned ETA */
    sigma: 0.25,
    failureProb: 0.03,
    coldChainBreachProbPerHourOver4: 0.15,
    prepMinutes: 15,
  },

  // ---------------------------------------------------------------------------
  // Hospital consumption (ground truth behind urgency)
  // ---------------------------------------------------------------------------
  usage: {
    /** realised daily usage ~ lognormal(median, sigma) around the assumed 2/day */
    medianPerDay: 2,
    sigma: 0.5,
    bloodBankMultiplier: 3,
  },

  // ---------------------------------------------------------------------------
  // Deterministic policy knobs (mirrors current agents; see lib/sim/policy.ts)
  // ---------------------------------------------------------------------------
  policy: {
    /** donorAgent fallback: notify max(10, 2×units) capped at 50 */
    minNotify: 10,
    maxNotify: 50,
    perUnitMultiplier: 2,
    /** donorAgent fallback thresholds to trigger inventory in parallel */
    criticalMaxEligibleForInventory: 5,
    highMaxEligibleForInventory: 2,
    /** progress check cadence & escalation */
    checkEveryMin: 15,
    responseWindowMin: 60,
    /** re-notify next wave when shortfall persists and pool remains */
    maxWaves: 3,
  },

  // ---------------------------------------------------------------------------
  // Escalation ladder (mirrors lib/ml/flags.ts defaults / DEFAULT_LADDER_OPTIONS;
  // the sim imports production's decideNextRung — never a copy of it)
  // ---------------------------------------------------------------------------
  ladder: {
    maxDonorRadiusKm: 100,
    broadcastRadiusKm: 150,
    broadcastMaxFacilities: 20,
    /**
     * Minimum minutes between rungs once a rung found candidates. Production
     * ticks every 5 min; the sim re-evaluates at `policy.checkEveryMin` (15),
     * so the effective dwell here is 15 min.
     */
    dwellMinutes: 10,
    radiusStepKm: 25,
    radiusFactor: 2,
  },

  // ---------------------------------------------------------------------------
  // Network broadcast response — ASSUMED (no production observations yet).
  // A contacted facility may hold compatible stock the network inventory does
  // not list; when it responds it registers/dispatches a few units after a delay.
  // ---------------------------------------------------------------------------
  broadcast: {
    /** base P(responds with usable stock) by facility type */
    baseRespondProb: { blood_bank: 0.35, hospital: 0.15 } as Record<"blood_bank" | "hospital", number>,
    /** default fraction of facilities that hold unrecorded stock (spec.world.unrecordedStockProb overrides) */
    unrecordedStockProb: 0.15,
    /** minutes until a responding facility's stock becomes searchable ~ uniform */
    responseDelayMinMin: 30,
    responseDelayMinMax: 90,
    /** units surfaced by a responding facility ~ uniform int */
    unitsFoundMin: 1,
    unitsFoundMax: 3,
    /** days to expiry of surfaced units ~ uniform */
    expiryDaysMin: 14,
    expiryDaysMax: 30,
  },
} as const;

export type Priors = typeof PRIORS;

/** Stable hash of the priors object for dataset lineage. */
export function priorsHash(p: Priors = PRIORS): string {
  const s = JSON.stringify(p);
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(16).padStart(8, "0");
}
