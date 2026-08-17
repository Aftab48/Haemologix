/**
 * Escalation ladder — what the coordinator does after the local search comes
 * back empty. Pure and deterministic; the driver (lib/agents/escalation.ts)
 * does the I/O and re-validates every proposal against the same guardrails.
 *
 *   local search (R0)
 *     → expand donor radius in tiers up to maxDonorRadiusKm (inventory re-checked each rung)
 *     → network broadcast to nearby facilities
 *     → hand off to a human coordinator (explicit terminal rung)
 *
 * The ladder climbs immediately while a rung yields nothing (there is nobody to
 * wait for) and pauses (`wait`) as soon as a rung produced candidates, leaving
 * the response-window logic in escalationPolicy to decide when to climb again.
 */

export type LadderAction =
  | { type: "expand_donor_search"; radiusKm: number }
  | { type: "network_broadcast"; radiusKm: number; maxFacilities: number }
  | { type: "escalate_human" }
  | { type: "wait" }
  | { type: "none" };

export type LadderActionType = LadderAction["type"];

export interface LadderOptions {
  maxDonorRadiusKm: number; // 100
  broadcastRadiusKm: number; // 150
  broadcastMaxFacilities: number; // 20
  dwellMinutes: number; // 10
  radiusStepKm: number; // 25 — minimum growth per rung
  radiusFactor: number; // 2 — geometric growth per rung
}

export const DEFAULT_LADDER_OPTIONS: LadderOptions = {
  maxDonorRadiusKm: 100,
  broadcastRadiusKm: 150,
  broadcastMaxFacilities: 20,
  dwellMinutes: 10,
  radiusStepKm: 25,
  radiusFactor: 2,
};

export interface LadderInput {
  /** units still needed after collected + pending deliveries */
  shortfall: number;
  /** donor radius currently in force (km) */
  currentRadiusKm: number;
  /** did the most recent donor search (at currentRadiusKm) notify anyone? */
  lastRungFoundDonors: boolean;
  /** has inventory been reserved / a transport opened for this alert? */
  inventoryFound: boolean;
  /** donors who accepted and are neither arrived nor no-show */
  committedDonors: number;
  broadcastDone: boolean;
  humanEscalated: boolean;
  minutesSinceLastAdvance: number;
  options?: Partial<LadderOptions>;
}

export interface LadderDecision {
  action: LadderAction;
  /** user-facing sentence: what was observed and what happens next */
  reason: string;
}

/** Next donor radius tier, or null when the current radius is already at (or past) the ceiling. */
export function nextDonorRadius(currentKm: number, o: LadderOptions = DEFAULT_LADDER_OPTIONS): number | null {
  if (!(currentKm >= 0) || currentKm >= o.maxDonorRadiusKm) return null;
  const grown = Math.max(currentKm * o.radiusFactor, currentKm + o.radiusStepKm);
  return Math.min(Math.round(grown), o.maxDonorRadiusKm);
}

export function decideNextRung(input: LadderInput): LadderDecision {
  const o: LadderOptions = { ...DEFAULT_LADDER_OPTIONS, ...(input.options ?? {}) };
  const r = Math.round(input.currentRadiusKm);

  if (input.shortfall <= 0) {
    return { action: { type: "none" }, reason: "No shortfall remaining — nothing to escalate." };
  }
  if (input.humanEscalated) {
    return { action: { type: "none" }, reason: "Already handed off to a human coordinator; automated escalation is complete." };
  }
  if (input.inventoryFound) {
    return { action: { type: "wait" }, reason: "Inventory has been reserved for this alert — waiting on delivery before escalating further." };
  }
  if (input.committedDonors > 0) {
    return { action: { type: "wait" }, reason: `${input.committedDonors} donor(s) have accepted — waiting on arrival before escalating further.` };
  }
  if (input.lastRungFoundDonors && input.minutesSinceLastAdvance < o.dwellMinutes) {
    const left = Math.max(1, Math.ceil(o.dwellMinutes - input.minutesSinceLastAdvance));
    return { action: { type: "wait" }, reason: `Donors within ${r} km were notified — giving them ${left} more min to respond before widening the search.` };
  }

  const next = nextDonorRadius(input.currentRadiusKm, o);
  const observed = input.lastRungFoundDonors
    ? `Donors within ${r} km were notified but the shortfall of ${input.shortfall} unit(s) is still uncovered and no network inventory is available`
    : `No eligible donors within ${r} km and no network inventory`;
  if (next !== null) {
    return {
      action: { type: "expand_donor_search", radiusKm: next },
      reason: `${observed} — next: expanding donor search to ${next} km.`,
    };
  }
  if (!input.broadcastDone) {
    return {
      action: { type: "network_broadcast", radiusKm: o.broadcastRadiusKm, maxFacilities: o.broadcastMaxFacilities },
      reason: `${observed}; donor search is at the ${o.maxDonorRadiusKm} km limit — next: asking facilities within ${o.broadcastRadiusKm} km to check and update their stock.`,
    };
  }
  return {
    action: { type: "escalate_human" },
    reason: "Automated search and network broadcast are exhausted — next: handing off to a human coordinator with the full search record.",
  };
}
