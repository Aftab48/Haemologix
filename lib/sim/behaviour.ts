/**
 * Stochastic behaviour models: how donors, blood banks, hospitals and transport
 * actually behave in the simulated world. All probabilities come from PRIORS;
 * all randomness comes from the injected RNG.
 */

import { calculateDonorEta } from "@/lib/distanceEta";
import { getTrafficMultiplier } from "@/lib/agents/logisticsAgent";
import { PRIORS } from "./priors";
import { clamp, sigmoid, type Rng } from "./rng";
import type { ScenarioSpec, SimAlert, SimDonor, SimHospital } from "./types";

const isNight = (hour: number) => hour >= 21 || hour < 6;

export interface DonorContext {
  donor: SimDonor;
  alert: SimAlert;
  distanceKm: number;
  hour: number;
  dayOfWeek: number;
  unscreened: boolean;
  spec: ScenarioSpec;
}

/** P(accept notification). Returns the probability (the caller samples). */
export function donorAcceptProbability(c: DonorContext): number {
  const p = PRIORS.accept;
  const h = c.donor.history;
  const priorRate = h.totalAlerts > 0 ? h.accepted / h.totalAlerts : 0.5;
  const daysSince = c.donor.lastDonationDate
    ? (c.alert.createdAt - new Date(c.donor.lastDonationDate).getTime()) / 86_400_000
    : null;
  const logit =
    p.baseLogit +
    p.perKm * c.distanceKm +
    p.urgencyBonus[c.alert.urgency] +
    (c.donor.bloodGroup === c.alert.bloodType ? p.exactMatchBonus : 0) +
    (isNight(c.hour) ? p.nightPenalty : 0) +
    (c.dayOfWeek === 0 || c.dayOfWeek === 6 ? p.weekendBonus : 0) +
    p.fatiguePerRecentAlert * h.alertsLast7Days +
    (daysSince === null ? p.neverDonatedPenalty : daysSince < 365 ? p.recentDonorBonus : 0) +
    p.priorAcceptRateWeight * (priorRate - 0.5) +
    (c.unscreened ? p.unscreenedPenalty : 0) +
    c.donor.latent.acceptPropensity +
    (c.spec.world.acceptShift ?? 0);
  // availability by hour scales the whole thing multiplicatively
  const avail = c.donor.latent.availabilityByHour[c.hour] ?? 0.7;
  return clamp(sigmoid(logit) * (0.55 + 0.45 * avail), 0, 0.98);
}

/** Does the donor respond at all within the window? */
export function donorResponds(rng: Rng, c: DonorContext): boolean {
  const silent = PRIORS.accept.silentProb * (isNight(c.hour) ? 1.4 : 1);
  return !rng.bernoulli(clamp(silent, 0, 0.9));
}

/** Minutes from notification to response. */
export function donorResponseDelay(rng: Rng, c: DonorContext): number {
  const p = PRIORS.responseDelay;
  let median = c.donor.latent.latencyMedianMin;
  if (isNight(c.hour)) median *= p.nightMultiplier;
  if (c.alert.urgency === "critical") median *= p.criticalMultiplier;
  return clamp(rng.lognormal(median, p.sigma), 0.5, p.windowMin);
}

/** P(show | accepted). */
export function donorShowProbability(c: DonorContext & { responseMinutes: number; etaMinutes: number }): number {
  const p = PRIORS.show;
  const h = c.donor.history;
  const priorShowRate = h.accepted > 0 ? h.arrived / h.accepted : 0.75;
  const logit =
    p.baseLogit +
    p.perKm * c.distanceKm +
    p.per10MinEta * (c.etaMinutes / 10) +
    (isNight(c.hour) ? p.nightPenalty : 0) +
    (c.alert.urgency === "critical" ? p.criticalBonus : 0) +
    p.priorNoShowPenalty * Math.min(3, h.noShows) +
    p.priorShowRateWeight * (priorShowRate - 0.75) +
    (c.responseMinutes > 20 ? p.slowResponsePenalty : 0) +
    c.donor.latent.showPropensity +
    (c.spec.world.showShift ?? 0);
  return clamp(sigmoid(logit), 0.02, 0.99);
}

/** Deterministic ETA the agents would quote (uses the shared helper). */
export function donorPlannedEta(distanceKm: number, hour: number): number {
  return calculateDonorEta(distanceKm, hour).recommendedEtaMinutes;
}

/** Realised travel minutes (noise around the planned ETA). */
export function donorTravelMinutes(rng: Rng, donor: SimDonor, distanceKm: number, plannedEta: number): number {
  const p = PRIORS.travel;
  let m = rng.lognormal(plannedEta, p.sigma);
  if (!donor.latent.hasVehicle && distanceKm > 10) m *= p.noVehicleFarMultiplier;
  return Math.max(10, m);
}

/** Blood bank / hospital agrees and is able to dispatch the requested units. */
export function facilityDispatches(rng: Rng, facility: SimHospital, isTransfer: boolean): boolean {
  const ok = rng.bernoulli(facility.dispatchReliability);
  if (!ok) return false;
  if (isTransfer && !facility.isBloodBank) return rng.bernoulli(facility.transferWillingness);
  return true;
}

export function dispatchDecisionMinutes(rng: Rng): number {
  return clamp(rng.lognormal(PRIORS.inventory.dispatchDecisionMedianMin, 0.5), 3, 60);
}

/** Realised transport minutes and whether it fails / breaches cold chain. */
export function transportOutcome(
  rng: Rng,
  plannedEtaMinutes: number,
  hour: number,
  spec: ScenarioSpec
): { minutes: number; failed: boolean; coldChainBreached: boolean } {
  const p = PRIORS.transport;
  const failProb = spec.world.transportFailureProb ?? p.failureProb;
  const failed = rng.bernoulli(failProb);
  const traffic = getTrafficMultiplier(hour);
  const minutes = Math.max(10, rng.lognormal(plannedEtaMinutes, p.sigma) * (traffic > 1 ? 1.05 : 1)) + p.prepMinutes;
  const hoursOver4 = Math.max(0, minutes / 60 - 4);
  const coldChainBreached = rng.bernoulli(clamp(hoursOver4 * p.coldChainBreachProbPerHourOver4, 0, 0.9));
  return { minutes, failed, coldChainBreached };
}

/**
 * Would a human reviewer want a second look at this deterministic eligibility
 * result? Borderline values (close to a threshold) and missing-but-passing data
 * are the things reviewers flag; hard failures (disease test positive, age) are
 * clear-cut and rarely flagged. Returns a probability the caller samples.
 */
export function reviewerFlagProbability(i: {
  minMarginRatio: number;
  hardFailure: boolean;
  passed: boolean;
  missingData: boolean;
}): number {
  if (i.hardFailure) return 0.04;
  let p = sigmoid(9 * (0.07 - i.minMarginRatio)); // ≈ 65% at margin 0, ≈ 12% at 0.3
  if (i.missingData && i.passed) p = Math.max(p, 0.55);
  if (!i.passed && !i.hardFailure) p = Math.max(p, 0.35); // soft failure → often reviewed
  return clamp(p, 0.02, 0.95);
}

/**
 * Ground-truth urgency for the urgency_priority label: how many hours until the
 * hospital's stock of this type hits zero at the *realised* consumption rate,
 * mapped onto the same 4 levels the rules use. This is what a well-calibrated
 * model should predict better than the fixed dailyUsage=2 assumption.
 */
export function oracleUrgency(currentUnits: number, realisedDailyUsage: number, rarity: number): SimAlert["urgency"] {
  const days = realisedDailyUsage > 0 ? currentUnits / realisedDailyUsage : 99;
  if (days < 1 || currentUnits === 0) return "critical";
  if (days < 2 || (rarity >= 8 && days < 3)) return "high";
  if (days < 3) return "medium";
  return "low";
}
