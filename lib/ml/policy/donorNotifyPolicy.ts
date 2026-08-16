/**
 * Donor notification policy.
 *
 * Deterministic today (donorAgent.processShortageEvent fallback):
 *   notify max(10, 2×units) capped at 50; trigger inventory when the eligible pool
 *   is thin for the urgency (critical ≤5, high ≤2, medium 0).
 *
 * With predictions (P(accept), P(show|accept) per candidate):
 *   expected arrivals from a batch = Σ P(accept)·P(show). Notify the smallest
 *   prefix (in expected-arrival order) that reaches `shortfall × safetyFactor`,
 *   within [minNotify, urgencyCap]. Trigger inventory now if even the whole pool
 *   is not expected to cover the shortfall.
 *
 * Hard constraints (compatibility, eligibility, radius) are applied by the caller
 * BEFORE this function — the policy only ever chooses among already-valid donors.
 */

export interface NotifyCandidate {
  id: string;
  rank: number; // deterministic rank (1 = best)
  scoreFinal: number;
  distanceKm: number;
}

export interface CandidatePredictions {
  /** donorId → P(accept) */
  accept: Map<string, number>;
  /** donorId → P(show | accept) */
  show: Map<string, number>;
}

export interface NotifyPolicyInput {
  candidates: NotifyCandidate[];
  shortfall: number; // units still needed (≥ 1)
  urgency: string;
  predictions: CandidatePredictions | null;
  options?: Partial<NotifyPolicyOptions>;
}

export interface NotifyPolicyOptions {
  minNotify: number; // 10 (matches donorAgent)
  maxNotify: number; // 50
  perUnitMultiplier: number; // 2
  safetyFactor: number; // expected arrivals target = shortfall × safetyFactor
  urgencyCaps: Record<string, number>;
  criticalMaxEligibleForInventory: number; // 5
  highMaxEligibleForInventory: number; // 2
  /** if P(show) is missing use this prior */
  defaultShowProb: number;
  defaultAcceptProb: number;
}

export const DEFAULT_NOTIFY_OPTIONS: NotifyPolicyOptions = {
  minNotify: 10,
  maxNotify: 50,
  perUnitMultiplier: 2,
  safetyFactor: 1.5,
  urgencyCaps: { critical: 50, high: 40, medium: 30, low: 20 },
  criticalMaxEligibleForInventory: 5,
  highMaxEligibleForInventory: 2,
  defaultShowProb: 0.7,
  defaultAcceptProb: 0.2,
};

export interface NotifyDecision {
  notifyIds: string[];
  triggerInventoryNow: boolean;
  /** Σ P(accept)·P(show) over the chosen batch (null when deterministic). */
  expectedArrivals: number | null;
  /** Σ over the whole pool. */
  poolExpectedArrivals: number | null;
  source: "model" | "deterministic";
  reason: string;
  /** Per-donor expected arrival, for explanations. */
  perDonor?: Array<{ id: string; pAccept: number; pShow: number; expected: number }>;
}

function urgencyLower(u: string) {
  return (u || "medium").toLowerCase();
}

/** The deterministic rule, exposed on its own so shadow mode can log both. */
export function deterministicNotifyDecision(input: NotifyPolicyInput): NotifyDecision {
  const o = { ...DEFAULT_NOTIFY_OPTIONS, ...(input.options ?? {}) };
  const eligible = input.candidates.length;
  const u = urgencyLower(input.urgency);
  let triggerInventoryNow = false;
  let reason = "";
  if (eligible === 0) {
    triggerInventoryNow = true;
    reason = "No eligible donors — inventory search";
  } else if (u === "critical" && eligible <= o.criticalMaxEligibleForInventory) {
    triggerInventoryNow = true;
    reason = `Only ${eligible} eligible donors for CRITICAL urgency (need >${o.criticalMaxEligibleForInventory})`;
  } else if (u === "high" && eligible <= o.highMaxEligibleForInventory) {
    triggerInventoryNow = true;
    reason = `Only ${eligible} eligible donors for HIGH urgency (need >${o.highMaxEligibleForInventory})`;
  }
  const count = Math.min(Math.max(o.minNotify, input.shortfall * o.perUnitMultiplier), Math.min(o.maxNotify, eligible));
  const sorted = [...input.candidates].sort((a, b) => a.rank - b.rank);
  const notifyIds = sorted.slice(0, count).map((c) => c.id);
  return {
    notifyIds,
    triggerInventoryNow,
    expectedArrivals: null,
    poolExpectedArrivals: null,
    source: "deterministic",
    reason: reason || `Notify top ${notifyIds.length} of ${eligible} eligible donors (rule: max(${o.minNotify}, ${o.perUnitMultiplier}×units) ≤ ${o.maxNotify})`,
  };
}

export function chooseNotificationBatch(input: NotifyPolicyInput): NotifyDecision {
  const o = { ...DEFAULT_NOTIFY_OPTIONS, ...(input.options ?? {}) };
  const p = input.predictions;
  if (!p || input.candidates.length === 0) return deterministicNotifyDecision(input);

  const per = input.candidates.map((c) => {
    const pAccept = clamp01(p.accept.get(c.id) ?? o.defaultAcceptProb);
    const pShow = clamp01(p.show.get(c.id) ?? o.defaultShowProb);
    return { id: c.id, rank: c.rank, pAccept, pShow, expected: pAccept * pShow };
  });
  // Order by expected arrival, ties by deterministic rank (keeps behaviour stable)
  per.sort((a, b) => b.expected - a.expected || a.rank - b.rank);
  const poolExpected = per.reduce((s, x) => s + x.expected, 0);
  const target = Math.max(1, input.shortfall) * o.safetyFactor;
  const cap = Math.min(o.maxNotify, o.urgencyCaps[urgencyLower(input.urgency)] ?? o.maxNotify, per.length);
  const floor = Math.min(cap, Math.max(Math.min(o.minNotify, per.length), Math.min(input.shortfall, per.length)));

  let acc = 0;
  let n = 0;
  for (const x of per) {
    if (n >= cap) break;
    if (acc >= target && n >= floor) break;
    acc += x.expected;
    n++;
  }
  n = Math.max(n, floor);
  const chosen = per.slice(0, n);
  const expected = chosen.reduce((s, x) => s + x.expected, 0);
  const u = urgencyLower(input.urgency);
  const triggerInventoryNow =
    poolExpected < input.shortfall || (u === "critical" && expected < input.shortfall * 1.2) || per.length === 0;

  return {
    notifyIds: chosen.map((x) => x.id),
    triggerInventoryNow,
    expectedArrivals: round(expected),
    poolExpectedArrivals: round(poolExpected),
    source: "model",
    reason:
      `Notify ${chosen.length}/${per.length}: expected ${round(expected)} arrivals for ${input.shortfall} unit(s) ` +
      `(target ${round(target)}); pool could yield ${round(poolExpected)}` +
      (triggerInventoryNow ? " → also search inventory now" : ""),
    perDonor: chosen.map(({ id, pAccept, pShow, expected }) => ({ id, pAccept: round(pAccept), pShow: round(pShow), expected: round(expected) })),
  };
}

function clamp01(x: number) {
  return Math.min(1, Math.max(0, Number.isFinite(x) ? x : 0));
}
function round(x: number) {
  return Math.round(x * 100) / 100;
}
