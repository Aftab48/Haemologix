/**
 * Escalation policy — when should the coordinator stop waiting on donors and
 * open the next intervention (inventory / hospital transfer / manual)?
 *
 * Deterministic today: after the response window (60 min) with no acceptances
 * (coordinatorAgent.handleNoResponseTimeout).
 *
 * With predictions: escalate as soon as the expected arrivals from committed
 * donors are not going to cover the shortfall, or the alert-level model says
 * the alert is unlikely to resolve inside its window. Always escalate at the
 * deterministic deadline as a floor.
 *
 * This policy answers *whether* to escalate now. *What* the next rung is
 * (wider donor radius, network broadcast, human hand-off) is decided by the
 * escalation ladder in ./escalationLadder.ts.
 */

export interface EscalationInput {
  shortfall: number;
  /** donors who accepted and are neither arrived nor no-show */
  committedDonors: number;
  /** Σ P(show) over committed donors, or null → assume defaultShowProb each */
  expectedArrivals: number | null;
  minutesElapsed: number;
  minutesLeft: number;
  /** P(alert resolves in window) or null */
  pResolvesInWindow: number | null;
  inventoryTriggered: boolean;
  options?: Partial<EscalationOptions>;
}

export interface EscalationOptions {
  responseWindowMin: number; // 60
  minMinutesBeforeModelEscalation: number; // 15
  resolveProbThreshold: number; // 0.35
  defaultShowProb: number; // 0.7
}

export const DEFAULT_ESCALATION_OPTIONS: EscalationOptions = {
  responseWindowMin: 60,
  minMinutesBeforeModelEscalation: 15,
  resolveProbThreshold: 0.35,
  defaultShowProb: 0.7,
};

export interface EscalationDecision {
  escalate: boolean;
  /**
   * what to open next:
   *  - inventory_search   – first timeout: look at network inventory
   *  - escalation_ladder  – inventory already tried: hand to the ladder
   *                         (radius expansion → network broadcast → human), see escalationLadder.ts
   */
  action: "none" | "inventory_search" | "escalation_ladder";
  source: "model" | "deterministic";
  reason: string;
  expectedArrivals: number;
}

export function decideEscalation(input: EscalationInput): EscalationDecision {
  const o = { ...DEFAULT_ESCALATION_OPTIONS, ...(input.options ?? {}) };
  const expected = input.expectedArrivals ?? input.committedDonors * o.defaultShowProb;
  const next: EscalationDecision["action"] = input.inventoryTriggered ? "escalation_ladder" : "inventory_search";
  if (input.shortfall <= 0) return { escalate: false, action: "none", source: "deterministic", reason: "no shortfall", expectedArrivals: round(expected) };

  // deterministic floor
  if (input.minutesElapsed >= o.responseWindowMin && expected < input.shortfall) {
    return { escalate: true, action: next, source: "deterministic", reason: `Response window (${o.responseWindowMin} min) elapsed; expected ${round(expected)} < shortfall ${input.shortfall}`, expectedArrivals: round(expected) };
  }
  // model-informed early escalation
  if (input.minutesElapsed >= o.minMinutesBeforeModelEscalation) {
    if (input.pResolvesInWindow !== null && input.pResolvesInWindow < o.resolveProbThreshold) {
      return { escalate: true, action: next, source: "model", reason: `P(resolve in window)=${round(input.pResolvesInWindow)} < ${o.resolveProbThreshold} after ${Math.round(input.minutesElapsed)} min`, expectedArrivals: round(expected) };
    }
    if (input.expectedArrivals !== null && expected < input.shortfall && input.minutesLeft < 3 * o.responseWindowMin) {
      return { escalate: true, action: next, source: "model", reason: `Expected ${round(expected)} arrivals < shortfall ${input.shortfall} with ${Math.round(input.minutesLeft)} min left`, expectedArrivals: round(expected) };
    }
  }
  return { escalate: false, action: "none", source: input.pResolvesInWindow !== null || input.expectedArrivals !== null ? "model" : "deterministic", reason: `Waiting: expected ${round(expected)} arrivals for shortfall ${input.shortfall}`, expectedArrivals: round(expected) };
}

function round(x: number) {
  return Math.round(x * 100) / 100;
}
