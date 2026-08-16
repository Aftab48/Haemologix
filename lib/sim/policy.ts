/**
 * Deterministic simulation policy — a faithful mirror of what the agents do
 * today when the LLM is unavailable (donorAgent fallback thresholds,
 * inventoryAgent "take the top-scored unit", logisticsAgent.selectTransportMethod,
 * coordinatorAgent timeout → inventory). This is the BASELINE every learned
 * policy must beat.
 */

import { selectTransportMethod } from "@/lib/agents/logisticsAgent";
import { PRIORS } from "./priors";
import type { NotifyDecision, NotifyDecisionContext, RankedSimUnit, SimAlert, SimPolicy } from "./types";

export const deterministicPolicy: SimPolicy = {
  name: "deterministic-v0",

  chooseNotification(ctx: NotifyDecisionContext): NotifyDecision {
    const p = PRIORS.policy;
    const eligible = ctx.ranked.length;
    const urgency = ctx.alert.urgency;

    // donorAgent.processShortageEvent fallback: trigger inventory in parallel when the pool is thin
    let triggerInventoryNow = false;
    let reason = "";
    if (eligible === 0) {
      triggerInventoryNow = true;
      reason = "No eligible donors — inventory search";
    } else if (urgency === "critical" && eligible <= p.criticalMaxEligibleForInventory) {
      triggerInventoryNow = true;
      reason = `Only ${eligible} eligible donors for CRITICAL urgency (need >${p.criticalMaxEligibleForInventory})`;
    } else if (urgency === "high" && eligible <= p.highMaxEligibleForInventory) {
      triggerInventoryNow = true;
      reason = `Only ${eligible} eligible donors for HIGH urgency (need >${p.highMaxEligibleForInventory})`;
    }

    // Notify count: max(10, 2×units) capped at 50 and by pool size
    const notifyCount = Math.min(
      Math.max(p.minNotify, ctx.shortfall * p.perUnitMultiplier),
      Math.min(p.maxNotify, eligible)
    );
    const notifyIds = ctx.ranked.slice(0, notifyCount).map((r) => r.donor.id);
    return {
      notifyIds,
      triggerInventoryNow,
      reason: reason || `Notify top ${notifyIds.length} of ${eligible} eligible donors`,
    };
  },

  chooseInventorySource(ranked: RankedSimUnit[]): RankedSimUnit | null {
    return ranked[0] ?? null;
  },

  chooseTransport(candidate: RankedSimUnit, alert: SimAlert) {
    return selectTransportMethod(candidate.distanceKm, alert.urgency);
  },

  shouldEscalate({ shortfall, minutesElapsed, expectedArrivals }) {
    // coordinatorAgent.handleNoResponseTimeout: after the response window with nothing coming, fall back
    if (shortfall <= 0) return false;
    if (minutesElapsed >= PRIORS.policy.responseWindowMin && expectedArrivals < shortfall) return true;
    return false;
  },
};
