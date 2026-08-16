/**
 * A SimPolicy driven by the production policy layer (lib/ml/policy) fed by a
 * pluggable *synchronous* predictor. The engine is synchronous, so the real
 * HTTP model cannot be called inside a run; instead:
 *
 *   - tests / `scripts/sim/compare.ts` use an ORACLE predictor (reads the
 *     simulator's own latent behaviour → the upper bound a perfect model gives)
 *     or a NOISY oracle (oracle + noise → what a decent model looks like)
 *   - this proves the policy machinery is a net win over deterministic rules
 *     before any real model is trusted with authority.
 */

import { chooseInventorySource, chooseNotificationBatch, decideEscalation } from "@/lib/ml/policy";
import type { CandidatePredictions } from "@/lib/ml/policy/donorNotifyPolicy";
import type { InventoryPredictions } from "@/lib/ml/policy/inventoryPolicy";
import { selectTransportMethod } from "@/lib/agents/logisticsAgent";
import { donorAcceptProbability, donorPlannedEta, donorShowProbability } from "./behaviour";
import { createRng, clamp, type Rng } from "./rng";
import type { NotifyDecisionContext, RankedSimUnit, ScenarioSpec, SimAlert, SimPolicy } from "./types";

export interface SimPredictor {
  predictDonors(ctx: NotifyDecisionContext): CandidatePredictions | null;
  predictInventory(ranked: RankedSimUnit[], alert: SimAlert): InventoryPredictions | null;
  predictResolve(alert: SimAlert, shortfall: number, expectedArrivals: number, minutesElapsed: number): number | null;
}

/** Perfect knowledge of the sim's behaviour model (upper bound). */
export function oraclePredictor(spec: ScenarioSpec, noise = 0, seed = 1): SimPredictor {
  const rng: Rng = createRng(seed);
  const jitter = (p: number) => (noise > 0 ? clamp(p + rng.gaussian(0, noise), 0.01, 0.99) : p);
  return {
    predictDonors(ctx) {
      const t = new Date(ctx.now);
      const hour = t.getUTCHours();
      const dayOfWeek = t.getUTCDay();
      const accept = new Map<string, number>();
      const show = new Map<string, number>();
      for (const r of ctx.ranked) {
        const base = { donor: r.donor, alert: ctx.alert, distanceKm: r.distanceKm, hour, dayOfWeek, unscreened: r.unscreened, spec };
        // include the "silent" mass: P(responds) × P(accept | responds)
        const pAccept = (1 - 0.25) * donorAcceptProbability(base);
        const eta = donorPlannedEta(r.distanceKm, hour);
        const pShow = donorShowProbability({ ...base, responseMinutes: 10, etaMinutes: eta });
        accept.set(r.donor.id, jitter(pAccept));
        show.set(r.donor.id, jitter(pShow));
      }
      return { accept, show };
    },
    predictInventory(ranked) {
      const deliveryOk = new Map<string, number>();
      const deliveryMinutes = new Map<string, number>();
      for (const u of ranked) {
        const p = u.hospital.dispatchReliability * (u.hospital.isBloodBank ? 1 : u.hospital.transferWillingness) * 0.97;
        deliveryOk.set(u.unit.id, jitter(p));
        deliveryMinutes.set(u.unit.id, u.etaMinutes + 15);
      }
      return { deliveryOk, deliveryMinutes };
    },
    predictResolve(alert, shortfall, expectedArrivals, minutesElapsed) {
      const p = clamp(0.5 + 0.35 * (expectedArrivals - shortfall) - 0.001 * minutesElapsed, 0.02, 0.98);
      return jitter(p);
    },
  };
}

export function createModelPolicy(predictor: SimPredictor, name = "ml-policy"): SimPolicy {
  return {
    name,
    chooseNotification(ctx) {
      const preds = predictor.predictDonors(ctx);
      const d = chooseNotificationBatch({
        candidates: ctx.ranked.map((r) => ({ id: r.donor.id, rank: r.rank, scoreFinal: r.scores.final, distanceKm: r.distanceKm })),
        shortfall: Math.max(1, ctx.shortfall),
        urgency: ctx.alert.urgency,
        predictions: preds,
      });
      return { notifyIds: d.notifyIds, triggerInventoryNow: d.triggerInventoryNow, reason: d.reason };
    },
    chooseInventorySource(ranked, alert, shortfall, now) {
      const preds = predictor.predictInventory(ranked, alert);
      const d = chooseInventorySource({
        candidates: ranked.map((u) => ({ id: u.unit.id, rank: u.rank, scoreFinal: u.scores.final, distanceKm: u.distanceKm, unitsAvailable: u.unit.units, etaMinutes: u.etaMinutes, method: u.method })),
        shortfall,
        urgency: alert.urgency,
        minutesLeft: Math.max(0, (alert.deadlineAt - now) / 60_000),
        predictions: preds,
      });
      return ranked.find((u) => u.unit.id === d.unitId) ?? null;
    },
    chooseTransport(candidate, alert) {
      return selectTransportMethod(candidate.distanceKm, alert.urgency);
    },
    shouldEscalate({ alert, now, shortfall, expectedArrivals, minutesElapsed }) {
      const pResolve = predictor.predictResolve(alert, shortfall, expectedArrivals, minutesElapsed);
      const d = decideEscalation({
        shortfall,
        committedDonors: expectedArrivals,
        expectedArrivals: null,
        minutesElapsed,
        minutesLeft: Math.max(0, (alert.deadlineAt - now) / 60_000),
        pResolvesInWindow: pResolve,
        inventoryTriggered: alert.inventoryTriggered,
      });
      return d.escalate;
    },
  };
}
