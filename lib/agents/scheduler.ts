/**
 * SCHEDULER — the timers the agent system never had.
 *
 * Runs from /api/cron/agent-tick (every ~5 min). Each job is idempotent:
 *
 *   runNoResponseTimeouts()  – alerts past the response window with a shortfall
 *                              → coordinator.checkFulfillmentProgress (escalation policy)
 *   markNoShows()            – accepted donors past expectedArrival + grace and not
 *                              confirmed → noShow=true, donor_show outcome = 0
 *   settleTransportOutcomes()– delivered/cancelled transports → deliveredOk,
 *                              inventory_delivery_ok / delivery_time outcomes,
 *                              Alert.unitsCollected += delivered units
 *   closeStaleAlerts()       – open alerts past the resolution window → outcome
 *                              PARTIAL/FAILED/ESCALATED, alert_resolves_in_window = 0
 *
 * Together these produce the real-world labels the learning loop trains on.
 */

import { db } from "@/db";
import { AgentType, type Prisma } from "@prisma/client";
import { getAlertWindowHours, getNoShowGraceMinutes, getResponseWindowMinutes } from "@/lib/ml/flags";
import { recordOutcome } from "@/lib/ml/record";
import { checkFulfillmentProgress } from "./coordinatorAgent";
import { trackDecisionOutcome } from "./outcomeTracking";

const OPEN_STATUSES = ["PENDING", "NOTIFIED", "MATCHED"];

export interface TickResult {
  ranAt: string;
  timeouts: { checked: number; escalated: number };
  noShows: number;
  transports: { settled: number; unitsDelivered: number };
  staleAlerts: { closed: number; byOutcome: Record<string, number> };
  errors: string[];
}

export async function runNoResponseTimeouts(now = new Date()): Promise<{ checked: number; escalated: number }> {
  const windowMin = getResponseWindowMinutes();
  const cutoff = new Date(now.getTime() - windowMin * 60_000);
  const alerts = await db.alert.findMany({
    where: { status: { in: OPEN_STATUSES }, outcome: null, createdAt: { lte: cutoff } },
    select: { id: true },
    take: 200,
  });
  let escalated = 0;
  for (const a of alerts) {
    const r = await checkFulfillmentProgress(a.id);
    if (r.escalated) escalated++;
  }
  return { checked: alerts.length, escalated };
}

export async function markNoShows(now = new Date()): Promise<number> {
  const grace = getNoShowGraceMinutes();
  const cutoff = new Date(now.getTime() - grace * 60_000);
  const overdue = await db.donorResponseHistory.findMany({
    where: { status: "accepted", confirmed: false, noShow: false, expectedArrival: { lte: cutoff } },
    select: { id: true, donorId: true, requestId: true, expectedArrival: true },
    take: 500,
  });
  let n = 0;
  for (const r of overdue) {
    // If the alert is already resolved we still count the donor as a no-show for their history.
    await db.donorResponseHistory.update({ where: { id: r.id }, data: { noShow: true } });
    await recordOutcome({ requestId: r.requestId, task: "donor_show", subjectId: r.donorId, actual: 0, outcomeAt: now });
    await db.agentDecision.create({
      data: {
        agentType: AgentType.COORDINATOR,
        eventType: "donor_no_show",
        requestId: r.requestId,
        decision: {
          donor_id: r.donorId,
          expected_arrival: r.expectedArrival?.toISOString() ?? null,
          grace_minutes: grace,
          reasoning: `Donor accepted but did not arrive within ${grace} min of expected arrival — marked no-show.`,
        },
        confidence: 1.0,
      },
    });
    n++;
    // Shortfall may have changed → let the coordinator re-evaluate
    await checkFulfillmentProgress(r.requestId);
  }
  return n;
}

export async function settleTransportOutcomes(now = new Date()): Promise<{ settled: number; unitsDelivered: number }> {
  const done = await db.transportRequest.findMany({
    where: { status: { in: ["delivered", "cancelled", "failed"] }, deliveredOk: null },
    take: 200,
  });
  let unitsDelivered = 0;
  for (const t of done) {
    const delivered = t.status === "delivered" && !t.coldChainBreached;
    const minutes = t.deliveryTime ? Math.max(1, (t.deliveryTime.getTime() - t.createdAt.getTime()) / 60_000) : null;
    // find the alert this transport served (workflow metadata carries transport_id)
    const wf = await db.workflowState.findFirst({ where: { metadata: { path: ["transport_id"], equals: t.id } }, select: { requestId: true } });
    const alert = wf ? await db.alert.findUnique({ where: { id: wf.requestId } }) : null;
    const windowMs = getAlertWindowHours() * 3_600_000;
    const inTime = alert && t.deliveryTime ? t.deliveryTime.getTime() <= alert.createdAt.getTime() + windowMs : delivered;
    const ok = delivered && Boolean(inTime);
    await db.transportRequest.update({ where: { id: t.id }, data: { deliveredOk: ok } });
    if (wf) {
      const unitIds = await db.inventoryUnit.findMany({ where: { reservedFor: wf.requestId }, select: { id: true } });
      for (const u of unitIds) {
        await recordOutcome({ requestId: wf.requestId, task: "inventory_delivery_ok", subjectId: u.id, actual: ok ? 1 : 0, outcomeAt: now });
        if (minutes !== null) await recordOutcome({ requestId: wf.requestId, task: "delivery_time", subjectId: u.id, actual: Math.round(minutes), outcomeAt: now });
      }
      // logistics predicted delivery_time keyed by transport id
      if (minutes !== null) await recordOutcome({ requestId: wf.requestId, task: "delivery_time", subjectId: t.id, actual: Math.round(minutes), outcomeAt: now });
      if (ok && alert && !alert.outcome) {
        const updated = await db.alert.update({ where: { id: alert.id }, data: { unitsCollected: { increment: t.units } } });
        unitsDelivered += t.units;
        const unitsNeeded = parseInt(updated.unitsNeeded) || 1;
        if (updated.unitsCollected >= unitsNeeded) {
          await db.alert.update({
            where: { id: alert.id },
            data: { status: "FULFILLED", outcome: "FULFILLED", resolvedAt: now, fulfilledBy: updated.unitsCollected > t.units ? "mixed" : "inventory" },
          });
          await db.workflowState.update({
            where: { requestId: alert.id },
            data: { status: "fulfilled", currentStep: "completed", metadata: { fulfilled_at: now.toISOString(), fulfillment_source: "inventory", transport_id: t.id } },
          });
          await recordOutcome({ requestId: alert.id, task: "alert_resolves_in_window", actual: inTime ? 1 : 0, outcomeAt: now });
        }
      }
      // release the reservation flag on consumed units
      await db.inventoryUnit.updateMany({ where: { reservedFor: wf.requestId, reserved: true }, data: { reserved: false, reservedFor: null } });
    }
  }
  return { settled: done.length, unitsDelivered };
}

export async function closeStaleAlerts(now = new Date()): Promise<{ closed: number; byOutcome: Record<string, number> }> {
  const windowMs = getAlertWindowHours() * 3_600_000;
  const cutoff = new Date(now.getTime() - windowMs);
  const stale = await db.alert.findMany({
    where: { status: { in: OPEN_STATUSES }, outcome: null, createdAt: { lte: cutoff } },
    take: 200,
  });
  const byOutcome: Record<string, number> = {};
  for (const a of stale) {
    const wf = await db.workflowState.findUnique({ where: { requestId: a.id } });
    const escalated = wf?.currentStep === "escalated_manual";
    const outcome = escalated ? "ESCALATED" : a.unitsCollected > 0 ? "PARTIAL" : "FAILED";
    await db.alert.update({ where: { id: a.id }, data: { status: "CLOSED", outcome, resolvedAt: now } });
    if (wf) {
      await db.workflowState.update({
        where: { requestId: a.id },
        data: { status: "closed", currentStep: "window_expired", metadata: { ...((wf.metadata as object) ?? {}), closed_at: now.toISOString(), outcome } },
      });
    }
    await recordOutcome({ requestId: a.id, task: "alert_resolves_in_window", actual: 0, outcomeAt: now });
    const decisions = await db.agentDecision.findMany({ where: { requestId: a.id, eventType: "donor_matching" }, select: { id: true, decision: true } });
    for (const d of decisions) {
      await trackDecisionOutcome({
        decisionId: d.id,
        agentType: AgentType.DONOR,
        requestId: a.id,
        decision: (d.decision as Prisma.JsonObject) ?? {},
        outcome: outcome === "PARTIAL" ? "partial" : "failure",
        outcomeDetails: { fulfillmentTime: Math.round((now.getTime() - a.createdAt.getTime()) / 60_000), donorArrived: a.unitsCollected > 0 },
        performanceMetrics: {},
      });
    }
    await db.agentDecision.create({
      data: {
        agentType: AgentType.COORDINATOR,
        eventType: "alert_window_expired",
        requestId: a.id,
        decision: { outcome, units_collected: a.unitsCollected, units_needed: parseInt(a.unitsNeeded) || 1, reasoning: `Resolution window (${getAlertWindowHours()}h) expired — ${outcome}.` },
        confidence: 1.0,
      },
    });
    byOutcome[outcome] = (byOutcome[outcome] ?? 0) + 1;
  }
  return { closed: stale.length, byOutcome };
}

export async function runAgentTick(now = new Date()): Promise<TickResult> {
  const result: TickResult = {
    ranAt: now.toISOString(),
    timeouts: { checked: 0, escalated: 0 },
    noShows: 0,
    transports: { settled: 0, unitsDelivered: 0 },
    staleAlerts: { closed: 0, byOutcome: {} },
    errors: [],
  };
  const step = async (name: string, fn: () => Promise<void>) => {
    try {
      await fn();
    } catch (e) {
      console.error(`[scheduler] ${name} failed:`, e);
      result.errors.push(`${name}: ${String(e)}`);
    }
  };
  await step("noShows", async () => { result.noShows = await markNoShows(now); });
  await step("transports", async () => { result.transports = await settleTransportOutcomes(now); });
  await step("timeouts", async () => { result.timeouts = await runNoResponseTimeouts(now); });
  await step("staleAlerts", async () => { result.staleAlerts = await closeStaleAlerts(now); });
  console.log("[scheduler] tick", JSON.stringify(result));
  return result;
}
