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
 *   advanceEscalations()     – alerts mid-ladder (search_expanding / network_broadcast)
 *                              → escalation.advanceEscalation (next rung once the dwell elapsed)
 *
 * Together these produce the real-world labels the learning loop trains on.
 */

import { db } from "@/db";
import { AgentType, type Prisma } from "@prisma/client";
import { decisionBasis } from "@/lib/ml/agentBridge";
import { getAlertWindowHours, getEscalationDwellMinutes, getNoShowGraceMinutes, getResponseWindowMinutes } from "@/lib/ml/flags";
import { recordOutcome } from "@/lib/ml/record";
import { checkFulfillmentProgress } from "./coordinatorAgent";
import { advanceEscalation } from "./escalation";
import { trackDecisionOutcome } from "./outcomeTracking";
import { ESCALATING_STEPS, readEscalationMeta } from "./workflowSteps";

const OPEN_STATUSES = ["PENDING", "NOTIFIED", "MATCHED"];

export interface TickResult {
  ranAt: string;
  timeouts: { checked: number; escalated: number };
  escalations: { checked: number; advanced: number };
  noShows: number;
  transports: { settled: number; unitsDelivered: number };
  staleAlerts: { closed: number; byOutcome: Record<string, number> };
  /** true when a job stopped early because the time budget ran out (next tick continues) */
  truncated: boolean;
  elapsedMs: number;
  errors: string[];
}

/**
 * Time budget for one tick. Serverless functions (Vercel Hobby: 60 s) must never
 * run the whole backlog in one go; each job processes small batches and stops
 * when the deadline is near — the next tick (5 min later) picks up the rest.
 */
export interface TickBudget {
  deadlineAt: number; // epoch ms
  batch: number; // rows per job per tick
}
const DEFAULT_BUDGET_MS = 40_000;
const DEFAULT_BATCH = 20;
const PROGRESS_RECHECK_MIN = 15; // don't re-run checkFulfillmentProgress on the same alert more often than this

function timeLeft(b: TickBudget) {
  return b.deadlineAt - Date.now();
}
function budgetOr(b?: TickBudget): TickBudget {
  return b ?? { deadlineAt: Date.now() + DEFAULT_BUDGET_MS, batch: DEFAULT_BATCH };
}

/**
 * Response-window timeouts → escalation policy. Only alerts that are past the
 * response window but still inside the resolution window (older ones belong to
 * closeStaleAlerts) and that were not progress-checked in the last 15 minutes.
 */
export async function runNoResponseTimeouts(now = new Date(), budget?: TickBudget): Promise<{ checked: number; escalated: number; truncated: boolean }> {
  const b = budgetOr(budget);
  const windowMin = getResponseWindowMinutes();
  const alertWindowMs = getAlertWindowHours() * 3_600_000;
  const cutoff = new Date(now.getTime() - windowMin * 60_000);
  const oldest = new Date(now.getTime() - alertWindowMs);
  const recheckCutoff = new Date(now.getTime() - PROGRESS_RECHECK_MIN * 60_000);
  const alerts = await db.alert.findMany({
    where: { status: { in: OPEN_STATUSES }, outcome: null, createdAt: { lte: cutoff, gt: oldest } },
    select: { id: true },
    orderBy: { createdAt: "asc" },
    take: b.batch,
  });
  let checked = 0;
  let escalated = 0;
  let truncated = false;
  for (const a of alerts) {
    if (timeLeft(b) < 8_000) {
      truncated = true;
      break;
    }
    const recent = await db.agentDecision.findFirst({
      where: { requestId: a.id, eventType: "fulfillment_progress", createdAt: { gte: recheckCutoff } },
      select: { id: true },
    });
    if (recent) continue;
    const r = await checkFulfillmentProgress(a.id);
    checked++;
    if (r.escalated) escalated++;
  }
  return { checked, escalated, truncated };
}

/**
 * Open alerts the escalation ladder is involved with — in an escalating step
 * (search_expanding / network_broadcast) or carrying ladder metadata because
 * a rung found candidates and is dwelling — whose last rung is older than the
 * dwell period → next rung. The ladder itself is idempotent, so re-checking an
 * alert is always safe.
 */
export async function advanceEscalations(now = new Date(), budget?: TickBudget): Promise<{ checked: number; advanced: number; truncated: boolean }> {
  const b = budgetOr(budget);
  const dwellMs = getEscalationDwellMinutes() * 60_000;
  // Scope to open alerts first (bounded), so finished ladders never clog the batch.
  const openAlerts = await db.alert.findMany({
    where: { status: { in: OPEN_STATUSES }, outcome: null },
    select: { id: true },
    orderBy: { createdAt: "asc" },
    take: 500,
  });
  if (openAlerts.length === 0) return { checked: 0, advanced: 0, truncated: false };
  const workflows = await db.workflowState.findMany({
    where: {
      requestId: { in: openAlerts.map((a) => a.id) },
      OR: [{ currentStep: { in: [...ESCALATING_STEPS] } }, { metadata: { path: ["escalation", "rung"], gte: 0 } }],
    },
    select: { requestId: true, metadata: true },
    orderBy: { updatedAt: "asc" },
    take: b.batch,
  });
  let checked = 0;
  let advanced = 0;
  let truncated = false;
  for (const wf of workflows) {
    if (timeLeft(b) < 8_000) {
      truncated = true;
      break;
    }
    const meta = readEscalationMeta(wf.metadata);
    if (meta && now.getTime() - new Date(meta.last_advanced_at).getTime() < dwellMs) continue;
    checked++;
    const r = await advanceEscalation(wf.requestId, { trigger: "scheduler", budgetMs: Math.max(8_000, timeLeft(b) - 8_000) });
    if (r.rungsRun > 0) advanced++;
  }
  return { checked, advanced, truncated };
}

export async function markNoShows(now = new Date(), budget?: TickBudget): Promise<number> {
  const b = budgetOr(budget);
  const grace = getNoShowGraceMinutes();
  const cutoff = new Date(now.getTime() - grace * 60_000);
  const overdue = await db.donorResponseHistory.findMany({
    where: { status: "accepted", confirmed: false, noShow: false, expectedArrival: { lte: cutoff } },
    select: { id: true, donorId: true, requestId: true, expectedArrival: true },
    orderBy: { expectedArrival: "asc" },
    take: b.batch,
  });
  let n = 0;
  for (const r of overdue) {
    if (timeLeft(b) < 8_000) break;
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
          ...decisionBasis(),
        },
        confidence: null,
      },
    });
    n++;
    // Shortfall may have changed → let the coordinator re-evaluate (only for alerts still open)
    const open = await db.alert.findFirst({ where: { id: r.requestId, outcome: null, status: { in: OPEN_STATUSES } }, select: { id: true } });
    if (open) await checkFulfillmentProgress(r.requestId);
  }
  return n;
}

export async function settleTransportOutcomes(now = new Date(), budget?: TickBudget): Promise<{ settled: number; unitsDelivered: number }> {
  const b = budgetOr(budget);
  const done = await db.transportRequest.findMany({
    where: { status: { in: ["delivered", "cancelled", "failed"] }, deliveredOk: null },
    orderBy: { updatedAt: "asc" },
    take: b.batch,
  });
  let unitsDelivered = 0;
  let settled = 0;
  for (const t of done) {
    if (timeLeft(b) < 8_000) break;
    settled++;
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
  return { settled, unitsDelivered };
}

export async function closeStaleAlerts(now = new Date(), budget?: TickBudget): Promise<{ closed: number; byOutcome: Record<string, number>; truncated: boolean }> {
  const b = budgetOr(budget);
  const windowMs = getAlertWindowHours() * 3_600_000;
  const cutoff = new Date(now.getTime() - windowMs);
  const stale = await db.alert.findMany({
    where: { status: { in: OPEN_STATUSES }, outcome: null, createdAt: { lte: cutoff } },
    orderBy: { createdAt: "asc" },
    take: b.batch,
  });
  const byOutcome: Record<string, number> = {};
  let closed = 0;
  let truncated = false;
  for (const a of stale) {
    if (timeLeft(b) < 8_000) {
      truncated = true;
      break;
    }
    closed++;
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
        decision: { outcome, units_collected: a.unitsCollected, units_needed: parseInt(a.unitsNeeded) || 1, reasoning: `Resolution window (${getAlertWindowHours()}h) expired — ${outcome}.`, ...decisionBasis() },
        confidence: null,
      },
    });
    byOutcome[outcome] = (byOutcome[outcome] ?? 0) + 1;
  }
  return { closed, byOutcome, truncated };
}

/**
 * One scheduler tick, bounded by `budgetMs` (default 40 s — safely inside a 60 s
 * serverless limit). Order matters: close expired alerts first so they never
 * reach the (expensive) progress check; then no-shows and transports (which
 * change shortfalls); then alerts mid-escalation-ladder; then the
 * response-window escalation check.
 */
export async function runAgentTick(now = new Date(), opts: { budgetMs?: number; batch?: number } = {}): Promise<TickResult> {
  const started = Date.now();
  const budget: TickBudget = { deadlineAt: started + (opts.budgetMs ?? DEFAULT_BUDGET_MS), batch: opts.batch ?? DEFAULT_BATCH };
  const result: TickResult = {
    ranAt: now.toISOString(),
    timeouts: { checked: 0, escalated: 0 },
    escalations: { checked: 0, advanced: 0 },
    noShows: 0,
    transports: { settled: 0, unitsDelivered: 0 },
    staleAlerts: { closed: 0, byOutcome: {} },
    truncated: false,
    elapsedMs: 0,
    errors: [],
  };
  const step = async (name: string, fn: () => Promise<void>) => {
    if (timeLeft(budget) < 8_000) {
      result.truncated = true;
      return;
    }
    try {
      await fn();
    } catch (e) {
      console.error(`[scheduler] ${name} failed:`, e);
      result.errors.push(`${name}: ${String(e)}`);
    }
  };
  await step("staleAlerts", async () => {
    const r = await closeStaleAlerts(now, budget);
    result.staleAlerts = { closed: r.closed, byOutcome: r.byOutcome };
    result.truncated ||= r.truncated;
  });
  await step("noShows", async () => { result.noShows = await markNoShows(now, budget); });
  await step("transports", async () => { result.transports = await settleTransportOutcomes(now, budget); });
  await step("escalations", async () => {
    const r = await advanceEscalations(now, budget);
    result.escalations = { checked: r.checked, advanced: r.advanced };
    result.truncated ||= r.truncated;
  });
  await step("timeouts", async () => {
    const r = await runNoResponseTimeouts(now, budget);
    result.timeouts = { checked: r.checked, escalated: r.escalated };
    result.truncated ||= r.truncated;
  });
  result.elapsedMs = Date.now() - started;
  console.log("[scheduler] tick", JSON.stringify(result));
  return result;
}
