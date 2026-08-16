/**
 * Inventory source + transport policy.
 *
 * Deterministic today: take the top-scored unit (proximity/expiry/quantity/
 * feasibility); transport by `selectTransportMethod(distance, urgency)`.
 *
 * With predictions (P(delivery ok), predicted delivery minutes per candidate):
 * prefer the candidate with the highest P(ok) whose predicted delivery time fits
 * the remaining window; break ties by deterministic score. Cold-chain-invalid
 * candidates must have been removed by the caller (validateColdChain) — the
 * policy re-checks anyway and never selects one.
 */

import { selectTransportMethod, validateColdChain, type TransportMethod } from "@/lib/agents/logisticsAgent";

export interface InventoryCandidate {
  id: string; // unit id
  rank: number;
  scoreFinal: number;
  distanceKm: number;
  unitsAvailable: number;
  /** deterministic ETA (minutes) for the deterministic method */
  etaMinutes: number;
  method: TransportMethod;
}

export interface InventoryPredictions {
  /** unitId → P(delivered usable in time) */
  deliveryOk: Map<string, number>;
  /** unitId → predicted minutes */
  deliveryMinutes: Map<string, number>;
}

export interface InventoryPolicyInput {
  candidates: InventoryCandidate[];
  shortfall: number;
  urgency: string;
  /** minutes until the alert window closes (Infinity if unknown) */
  minutesLeft: number;
  predictions: InventoryPredictions | null;
  options?: Partial<InventoryPolicyOptions>;
}

export interface InventoryPolicyOptions {
  /** candidates below this P(ok) are skipped when a better one exists */
  minAcceptableProb: number;
  /** how much of the remaining window a delivery may consume */
  windowFraction: number;
}

export const DEFAULT_INVENTORY_OPTIONS: InventoryPolicyOptions = { minAcceptableProb: 0.35, windowFraction: 0.9 };

export interface InventoryDecision {
  unitId: string | null;
  method: TransportMethod | null;
  source: "model" | "deterministic";
  reason: string;
  pOk?: number;
  predictedMinutes?: number;
  alternatives?: Array<{ unitId: string; pOk: number; predictedMinutes: number; scoreFinal: number }>;
}

export function deterministicInventoryDecision(input: InventoryPolicyInput): InventoryDecision {
  const valid = input.candidates.filter((c) => validateColdChain(c.etaMinutes, c.method).compliant);
  const top = [...valid].sort((a, b) => a.rank - b.rank)[0];
  if (!top) return { unitId: null, method: null, source: "deterministic", reason: "no cold-chain-valid inventory candidates" };
  return {
    unitId: top.id,
    method: top.method,
    source: "deterministic",
    reason: `Top-scored source (score ${top.scoreFinal}/100, ${top.distanceKm.toFixed(1)} km, ${top.method}, ETA ${top.etaMinutes} min)`,
  };
}

export function chooseInventorySource(input: InventoryPolicyInput): InventoryDecision {
  const o = { ...DEFAULT_INVENTORY_OPTIONS, ...(input.options ?? {}) };
  const p = input.predictions;
  if (!p || input.candidates.length === 0) return deterministicInventoryDecision(input);

  const scored = input.candidates
    .filter((c) => validateColdChain(c.etaMinutes, c.method).compliant) // hard constraint, re-checked
    .map((c) => {
      const pOk = clamp01(p.deliveryOk.get(c.id) ?? 0.5);
      const mins = p.deliveryMinutes.get(c.id) ?? c.etaMinutes;
      const fits = mins <= input.minutesLeft * o.windowFraction;
      return { c, pOk, mins, fits };
    });
  if (scored.length === 0) return { unitId: null, method: null, source: "model", reason: "no cold-chain-valid inventory candidates" };

  const fitting = scored.filter((s) => s.fits);
  const pool = fitting.length ? fitting : scored;
  pool.sort((a, b) => b.pOk - a.pOk || a.mins - b.mins || a.c.rank - b.c.rank);
  let best = pool[0];
  // If the best is weak, fall back to deterministic top if it is close in probability (stability)
  const detTop = [...scored].sort((a, b) => a.c.rank - b.c.rank)[0];
  if (best.pOk < o.minAcceptableProb && detTop && detTop.pOk >= best.pOk - 0.05) best = detTop;

  return {
    unitId: best.c.id,
    method: best.c.method,
    source: "model",
    pOk: round(best.pOk),
    predictedMinutes: Math.round(best.mins),
    reason:
      `Chose ${best.c.id}: P(delivered ok)=${round(best.pOk)}, predicted ${Math.round(best.mins)} min` +
      (Number.isFinite(input.minutesLeft) ? ` of ${Math.round(input.minutesLeft)} min left` : "") +
      (best.c.rank !== 1 ? ` (deterministic rank #${best.c.rank})` : " (also deterministic top)"),
    alternatives: pool.slice(0, 3).map((s) => ({ unitId: s.c.id, pOk: round(s.pOk), predictedMinutes: Math.round(s.mins), scoreFinal: s.c.scoreFinal })),
  };
}

export interface TransportPolicyInput {
  distanceKm: number;
  urgency: string;
  /** deterministic ETA for the deterministic method */
  etaMinutes: number;
  minutesLeft: number;
  /** predicted delivery minutes for the deterministic method (null if unknown) */
  predictedMinutes: number | null;
}

export interface TransportDecision {
  method: TransportMethod;
  source: "model" | "deterministic";
  reason: string;
  coldChainCompliant: boolean;
}

/**
 * Method choice stays rule-based (safety); the model may only *upgrade* to a
 * faster method when the predicted time would miss the window and the upgrade
 * is allowed for that distance/urgency. Cold chain always vetoes.
 */
export function chooseTransportMethod(input: TransportPolicyInput): TransportDecision {
  const base = selectTransportMethod(input.distanceKm, input.urgency);
  let method: TransportMethod = base;
  let source: "model" | "deterministic" = "deterministic";
  let reason = `Rule: ${base} for ${input.distanceKm.toFixed(1)} km / ${input.urgency}`;
  const u = (input.urgency || "").toLowerCase();
  if (input.predictedMinutes !== null && input.predictedMinutes > input.minutesLeft) {
    if (base === "scheduled" && input.distanceKm < 50 && (u === "high" || u === "critical" || u === "medium")) {
      method = "courier";
      source = "model";
      reason = `Predicted ${Math.round(input.predictedMinutes)} min > ${Math.round(input.minutesLeft)} min left → upgrade scheduled→courier`;
    } else if (base === "courier" && input.distanceKm < 15 && u === "critical") {
      method = "ambulance";
      source = "model";
      reason = `Predicted ${Math.round(input.predictedMinutes)} min > ${Math.round(input.minutesLeft)} min left → upgrade courier→ambulance`;
    }
  }
  const cc = validateColdChain(input.etaMinutes, method);
  return { method, source, reason, coldChainCompliant: cc.compliant };
}

function clamp01(x: number) {
  return Math.min(1, Math.max(0, Number.isFinite(x) ? x : 0));
}
function round(x: number) {
  return Math.round(x * 100) / 100;
}
