/**
 * ESCALATION LADDER DRIVER
 *
 * What the coordinator does once the local search comes back empty:
 *
 *   local search → expand donor radius (tiers, inventory re-checked each rung)
 *                → network broadcast (nearby facilities: "please check your stock")
 *                → hand-off to a human coordinator (explicit terminal rung)
 *
 * The *decision* is the pure policy in lib/ml/policy/escalationLadder.ts; this
 * module does the I/O. It runs one rung at a time and keeps climbing while a
 * rung produces nothing (there is nobody to wait for), bounded by a time budget
 * so it fits inside a serverless invocation; the scheduler continues any ladder
 * that ran out of budget or is dwelling.
 *
 * Entry points:
 *   • inventoryAgent (empty result)   → POST /api/agents/coordinator {action:"escalate"}
 *   • coordinatorAgent.checkFulfillmentProgress (response-window timeout)
 *   • scheduler.advanceEscalations (every tick, for alerts in an escalating step)
 *
 * State lives in WorkflowState.metadata.escalation (see workflowSteps.ts) and
 * every rung is logged as an AgentDecision `escalation_step` so the alert page
 * can show "…so these are the next actions being taken".
 */

import { db } from "@/db";
import { AgentType, type Prisma } from "@prisma/client";
import { parseShortageRequestEvent, publishEvent, type ShortageRequestEvent } from "./eventBus";
import { calculateDistance, processShortageEvent } from "./donorAgent";
import { processInventorySearch } from "./inventoryAgent";
import { computeShortfall } from "./shortfall";
import { readEscalationMeta, type EscalationMeta, type WorkflowStep } from "./workflowSteps";
import { sendEscalationHandoffEmail, sendNetworkStockCheckEmail, type EscalationEmailData } from "../actions/mails.actions";
import { sendEscalationHandoffSMS, sendNetworkStockCheckSMS } from "../actions/sms.actions";
import {
  getEscalationDwellMinutes,
  getMaxDonorRadiusKm,
  getNetworkBroadcastMaxFacilities,
  getNetworkBroadcastRadiusKm,
} from "@/lib/ml/flags";
import { decideNextRung, type LadderAction, type LadderOptions } from "@/lib/ml/policy/escalationLadder";
import { decisionBasis } from "@/lib/ml/agentBridge";

const DEFAULT_BUDGET_MS = 25_000;
const MIN_TIME_FOR_RUNG_MS = 8_000;
const MAX_RUNGS_PER_CALL = 6;

export type EscalationTrigger = "no_local_match" | "response_window" | "scheduler" | "manual";

export interface EscalationResult {
  success: boolean;
  rungsRun: number;
  lastAction: LadderAction["type"] | "skipped";
  /** every automated rung has been used (alert handed to a human) */
  exhausted: boolean;
  message?: string;
  error?: string;
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function ladderOptions(): LadderOptions {
  return {
    maxDonorRadiusKm: getMaxDonorRadiusKm(),
    broadcastRadiusKm: getNetworkBroadcastRadiusKm(),
    broadcastMaxFacilities: getNetworkBroadcastMaxFacilities(),
    dwellMinutes: getEscalationDwellMinutes(),
    radiusStepKm: 25,
    radiusFactor: 2,
  };
}

function appUrl(): string {
  return (process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000").replace(/\/+$/, "");
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const EMAIL_IN_TEXT_RE = /[^\s@<>()]+@[^\s@<>()]+\.[^\s@<>()]+/g;
const PHONE_IN_TEXT_RE = /\+?\d[\d\s().-]{8,}\d/g;
function looksLikeEmail(s: string | null | undefined): s is string {
  return typeof s === "string" && EMAIL_RE.test(s.trim());
}
function looksLikePhone(s: string | null | undefined): s is string {
  return typeof s === "string" && s.replace(/\D/g, "").length >= 10;
}
/** Pull e-mail addresses out of free text such as "Contact the rep at ops@x.org". */
function emailsIn(text: string | null | undefined): string[] {
  return typeof text === "string" ? (text.match(EMAIL_IN_TEXT_RE) ?? []).map((e) => e.trim()) : [];
}
/** Pull phone numbers out of free text such as "Contact the rep at +91-70444 72365". */
function phonesIn(text: string | null | undefined): string[] {
  if (typeof text !== "string") return [];
  return (text.match(PHONE_IN_TEXT_RE) ?? []).map((p) => p.trim()).filter((p) => p.replace(/\D/g, "").length >= 10);
}
/** Same number written differently ("7044472365" vs "+91-7044472365") → same key. */
function phoneKey(p: string): string {
  const digits = p.replace(/\D/g, "");
  return digits.length > 10 ? digits.slice(-10) : digits;
}

/**
 * Advance the escalation ladder for one alert. Idempotent: rungs already
 * recorded in metadata are never re-executed; calling this on an alert that is
 * fulfilled, closed, or already handed off is a no-op.
 */
export async function advanceEscalation(
  requestId: string,
  opts: { trigger: EscalationTrigger; budgetMs?: number }
): Promise<EscalationResult> {
  const deadline = Date.now() + (opts.budgetMs ?? DEFAULT_BUDGET_MS);
  const timeLeft = () => deadline - Date.now();
  let rungsRun = 0;
  let lastAction: EscalationResult["lastAction"] = "skipped";

  try {
    const alert = await db.alert.findUnique({ where: { id: requestId }, include: { hospital: true } });
    if (!alert) return { success: false, rungsRun, lastAction, exhausted: false, error: "Alert not found" };
    if (alert.outcome || alert.status === "FULFILLED" || alert.status === "CLOSED") {
      return { success: true, rungsRun, lastAction, exhausted: Boolean(alert.outcome), message: "Alert already resolved or handed off" };
    }

    // The most recent shortage event is the template we re-publish with a wider radius.
    const latestEvent = await db.agentEvent.findFirst({
      where: { type: "shortage.request.v1", payload: { path: ["id"], equals: requestId } },
      orderBy: { createdAt: "desc" },
    });
    const basePayload = latestEvent ? parseShortageRequestEvent(latestEvent.payload) : null;
    if (!basePayload) return { success: false, rungsRun, lastAction, exhausted: false, error: "Shortage event not found" };

    const o = ladderOptions();
    let workflow = await db.workflowState.findUnique({ where: { requestId } });
    let meta: EscalationMeta =
      readEscalationMeta(workflow?.metadata) ?? {
        rung: 0,
        donor_radius_km: parseInt(alert.searchRadius) || basePayload.search_radius_km,
        radius_history: [parseInt(alert.searchRadius) || basePayload.search_radius_km],
        last_advanced_at: alert.createdAt.toISOString(),
        next_action: "",
        exhausted: false,
      };
    // Was the most recent donor search fruitful? For a ladder rung use its own
    // record; before any rung ran, "did the local search notify anyone".
    let lastRungFoundDonors: boolean;
    const lastExpand = await db.agentDecision.findFirst({
      where: { requestId, eventType: "escalation_step", decision: { path: ["action"], equals: "expand_donor_search" } },
      orderBy: { createdAt: "desc" },
      select: { decision: true },
    });
    if (lastExpand && isRecord(lastExpand.decision)) {
      lastRungFoundDonors = Number(lastExpand.decision.donors_notified ?? 0) > 0;
    } else {
      lastRungFoundDonors = (await db.donorResponseHistory.count({ where: { requestId } })) > 0;
    }

    for (let i = 0; i < MAX_RUNGS_PER_CALL; i++) {
      if (timeLeft() < MIN_TIME_FOR_RUNG_MS) {
        return { success: true, rungsRun, lastAction, exhausted: meta.exhausted, message: "Time budget exhausted — scheduler will continue" };
      }

      const snap = await computeShortfall(alert);
      // Model hook (not consulted yet): once haemologix-model-1.2 has an
      // `expansion_yield` head (P(next ring finds ≥1 donor); features =
      // expansionYieldFeatures in lib/ml/features.ts, all derivable from `meta`
      // + donorResponseHistory counts), consult it here in shadow first, then let
      // a low P(yield) skip straight to the broadcast rung under authority.
      const inventoryFound =
        (await db.inventoryUnit.count({ where: { reservedFor: requestId, reserved: true } })) > 0 ||
        (isRecord(workflow?.metadata) && typeof workflow!.metadata.transport_id === "string");
      const decision = decideNextRung({
        shortfall: snap.shortfall,
        currentRadiusKm: meta.donor_radius_km,
        lastRungFoundDonors,
        inventoryFound,
        committedDonors: snap.committedDonorIds.length,
        broadcastDone: Boolean(meta.broadcast_at),
        humanEscalated: Boolean(meta.escalated_at),
        minutesSinceLastAdvance: (Date.now() - new Date(meta.last_advanced_at).getTime()) / 60_000,
        options: o,
      });
      const action = decision.action;
      lastAction = action.type;

      // ---- guardrails: the driver re-validates every proposal ----------------
      if (action.type === "expand_donor_search" && (action.radiusKm > o.maxDonorRadiusKm || action.radiusKm <= meta.donor_radius_km)) {
        return { success: false, rungsRun, lastAction, exhausted: meta.exhausted, error: `Rejected radius ${action.radiusKm} km (current ${meta.donor_radius_km}, max ${o.maxDonorRadiusKm})` };
      }
      if (action.type === "network_broadcast" && meta.broadcast_at) {
        return { success: true, rungsRun, lastAction, exhausted: meta.exhausted, message: "Broadcast already sent" };
      }
      if (action.type === "escalate_human" && meta.escalated_at) {
        return { success: true, rungsRun, lastAction, exhausted: true, message: "Already handed off" };
      }

      if (action.type === "wait" || action.type === "none") {
        const changed = meta.next_action !== decision.reason;
        meta = { ...meta, next_action: decision.reason };
        await persistMeta(requestId, workflow, meta, null);
        // Scheduler ticks every few minutes; only put a "waiting" entry on the
        // timeline when the reason changed or a non-scheduler caller asked.
        if (changed || opts.trigger !== "scheduler") {
          await logStep(requestId, meta, action, decision.reason, opts.trigger, { shortfall: snap.shortfall, committed_donors: snap.committedDonorIds.length, inventory_found: inventoryFound });
        }
        return { success: true, rungsRun, lastAction, exhausted: meta.exhausted, message: decision.reason };
      }

      // ---- execute one rung ------------------------------------------------
      // Log the rung *before* running it so the timeline reads "next: widen to
      // 35 km" → donor/inventory results → next rung; results are patched in below.
      const stepId = await logStep(requestId, { ...meta, rung: meta.rung + 1, next_action: decision.reason }, action, decision.reason, opts.trigger, {
        shortfall: snap.shortfall,
        status: "running",
      });
      const now = new Date();
      let stepDetails: Record<string, unknown> = {};
      let nextStep: WorkflowStep;
      let stopAfter = false;

      if (action.type === "expand_donor_search") {
        const rung = meta.rung + 1;
        const prevRadius = meta.donor_radius_km;
        await db.alert.update({ where: { id: requestId }, data: { searchRadius: String(action.radiusKm) } });
        const payload: ShortageRequestEvent = { ...basePayload, search_radius_km: action.radiusKm, escalation: { rung, previous_radius_km: prevRadius } };
        const eventId = await publishEvent("shortage.request.v1", payload, AgentType.COORDINATOR);
        const donors = await processShortageEvent(eventId);
        const inv = await processInventorySearch(requestId, { fromLadder: true });
        lastRungFoundDonors = donors.donorsNotified > 0;
        meta = {
          ...meta,
          rung,
          donor_radius_km: action.radiusKm,
          radius_history: [...meta.radius_history, action.radiusKm],
          last_advanced_at: now.toISOString(),
        };
        stepDetails = { previous_radius_km: prevRadius, radius_km: action.radiusKm, donors_found: donors.donorsFound, donors_notified: donors.donorsNotified, inventory_units_found: inv.unitsFound, inventory_reserved: inv.reserved, event_id: eventId };
        nextStep = "search_expanding";
        if (donors.donorsNotified > 0 || inv.reserved) stopAfter = true; // someone to wait for now
      } else if (action.type === "network_broadcast") {
        const contacted = await broadcastToNetwork(alert, action.radiusKm, action.maxFacilities, meta);
        meta = {
          ...meta,
          rung: meta.rung + 1,
          broadcast_at: now.toISOString(),
          broadcast_facility_ids: contacted.map((c) => c.id),
          last_advanced_at: now.toISOString(),
        };
        stepDetails = { radius_km: action.radiusKm, facilities_contacted: contacted.length, facilities: contacted.map((c) => ({ id: c.id, name: c.name, distance_km: c.distanceKm, email: c.emailed, sms: c.smsed })) };
        nextStep = "network_broadcast";
      } else {
        // escalate_human
        const notified = await notifyHumans(alert, meta);
        await db.alert.update({ where: { id: requestId }, data: { outcome: "ESCALATED" } });
        meta = { ...meta, rung: meta.rung + 1, escalated_at: now.toISOString(), last_advanced_at: now.toISOString(), exhausted: true };
        stepDetails = { recipients: notified };
        nextStep = "escalated_manual";
        stopAfter = true;
      }

      // Decide the sentence for "what happens next" before we know the next decision:
      // if this rung produced nothing we will climb again, otherwise we wait.
      const nextSentence =
        action.type === "escalate_human"
          ? "Handed off to a human coordinator. Automated escalation is complete; the alert stays open for manual follow-up."
          : stopAfter
            ? `Candidates found at this rung — waiting for responses before escalating further.`
            : decision.reason;
      meta = { ...meta, next_action: nextSentence };
      workflow = await persistMeta(requestId, workflow, meta, nextStep);
      await updateStep(stepId, meta, { ...stepDetails, status: "done" });
      rungsRun++;

      if (stopAfter) {
        return { success: true, rungsRun, lastAction, exhausted: meta.exhausted, message: nextSentence };
      }
    }
    return { success: true, rungsRun, lastAction, exhausted: meta.exhausted, message: "Rung limit for one call reached — scheduler will continue" };
  } catch (error) {
    console.error("[Escalation] Error advancing ladder:", error);
    return { success: false, rungsRun, lastAction, exhausted: false, error: String(error) };
  }
}

async function persistMeta(
  requestId: string,
  workflow: { metadata: Prisma.JsonValue; status: string } | null,
  meta: EscalationMeta,
  step: WorkflowStep | null
) {
  const prev = isRecord(workflow?.metadata) ? (workflow!.metadata as Record<string, unknown>) : {};
  const metadata = { ...prev, escalation: { ...meta } } as Prisma.InputJsonObject;
  const status = step === "escalated_manual" ? "escalated" : step ? "escalating" : undefined;
  return db.workflowState.upsert({
    where: { requestId },
    update: { metadata, ...(step ? { currentStep: step } : {}), ...(status ? { status } : {}) },
    create: { requestId, status: status ?? "pending", currentStep: step ?? "shortage_detected", metadata },
  });
}

async function logStep(
  requestId: string,
  meta: EscalationMeta,
  action: LadderAction,
  reason: string,
  trigger: EscalationTrigger,
  details: Record<string, unknown>
): Promise<string> {
  const row = await db.agentDecision.create({
    data: {
      agentType: AgentType.COORDINATOR,
      eventType: "escalation_step",
      requestId,
      decision: {
        rung: meta.rung,
        action: action.type,
        trigger,
        donor_radius_km: meta.donor_radius_km,
        radius_history: meta.radius_history,
        next_action: meta.next_action,
        exhausted: meta.exhausted,
        ...details,
        reasoning: reason,
        decision_source: "deterministic",
        ...decisionBasis(),
      } as Prisma.InputJsonObject,
      confidence: null,
    },
    select: { id: true },
  });
  return row.id;
}

/** Patch a rung's decision row with what actually happened once it has run. */
async function updateStep(id: string, meta: EscalationMeta, results: Record<string, unknown>) {
  const row = await db.agentDecision.findUnique({ where: { id }, select: { decision: true } });
  const prev = isRecord(row?.decision) ? (row!.decision as Record<string, unknown>) : {};
  await db.agentDecision.update({
    where: { id },
    data: {
      decision: {
        ...prev,
        rung: meta.rung,
        donor_radius_km: meta.donor_radius_km,
        radius_history: meta.radius_history,
        next_action: meta.next_action,
        exhausted: meta.exhausted,
        ...results,
      } as Prisma.InputJsonObject,
    },
  });
}

type AlertWithHospital = Prisma.AlertGetPayload<{ include: { hospital: true } }>;

function emailData(alert: AlertWithHospital, meta: EscalationMeta): EscalationEmailData {
  return {
    hospitalName: alert.hospital.hospitalName,
    bloodType: alert.bloodType,
    unitsNeeded: parseInt(alert.unitsNeeded) || 1,
    urgency: String(alert.urgency).toLowerCase(),
    radiusSearchedKm: meta.donor_radius_km,
    facilitiesContacted: meta.broadcast_facility_ids?.length ?? 0,
    alertUrl: `${appUrl()}/hospital/alert/${alert.id}`,
    requestingContact: alert.hospital.contactPhone || alert.hospital.contactEmail || undefined,
  };
}

/** Network-broadcast rung: nearest facilities (blood banks first) within radius, capped. */
async function broadcastToNetwork(alert: AlertWithHospital, radiusKm: number, maxFacilities: number, meta: EscalationMeta) {
  const lat = parseFloat(alert.hospital.latitude ?? "");
  const lng = parseFloat(alert.hospital.longitude ?? "");
  const facilities = await db.hospitalRegistration.findMany({
    where: { id: { not: alert.hospitalId }, latitude: { not: null }, longitude: { not: null } },
    select: { id: true, hospitalName: true, latitude: true, longitude: true, bloodBankLicense: true, contactEmail: true, contactPhone: true, repEmail: true, repPhone: true },
  });
  const inRange = facilities
    .map((f) => ({ f, distanceKm: Number.isFinite(lat) && Number.isFinite(lng) ? calculateDistance(lat, lng, parseFloat(f.latitude!), parseFloat(f.longitude!)) : Number.POSITIVE_INFINITY }))
    .filter((x) => x.distanceKm <= radiusKm)
    .sort((a, b) => Number(Boolean(b.f.bloodBankLicense)) - Number(Boolean(a.f.bloodBankLicense)) || a.distanceKm - b.distanceKm)
    .slice(0, Math.max(0, Math.min(maxFacilities, getNetworkBroadcastMaxFacilities())));

  const data = emailData(alert, meta);
  const results = await Promise.all(
    inRange.map(async ({ f, distanceKm }) => {
      const email = looksLikeEmail(f.contactEmail) ? f.contactEmail : looksLikeEmail(f.repEmail) ? f.repEmail : null;
      const phone = looksLikePhone(f.contactPhone) ? f.contactPhone : looksLikePhone(f.repPhone) ? f.repPhone : null;
      const [e, s] = await Promise.allSettled([
        email ? sendNetworkStockCheckEmail(email, data) : Promise.reject(new Error("no email")),
        phone ? sendNetworkStockCheckSMS(phone, data) : Promise.reject(new Error("no phone")),
      ]);
      return { id: f.id, name: f.hospitalName, distanceKm: Math.round(distanceKm * 10) / 10, emailed: e.status === "fulfilled", smsed: s.status === "fulfilled" };
    })
  );
  console.log(`[Escalation] Network broadcast: ${results.length} facilities within ${radiusKm} km contacted`);
  return results;
}

/** Human-escalation rung: requesting hospital's contacts + platform admin. */
async function notifyHumans(alert: AlertWithHospital, meta: EscalationMeta) {
  const data = emailData(alert, meta);
  const h = alert.hospital;
  const emails = new Set<string>();
  const phonesByKey = new Map<string, string>();
  for (const e of [h.contactEmail, h.repEmail]) if (looksLikeEmail(e)) emails.add(e.trim().toLowerCase());
  for (const e of emailsIn(h.contactDetails24x7)) emails.add(e.toLowerCase());
  // contactDetails24x7 is free text ("Contact the Representative at +91-…"), so
  // extract numbers rather than passing the sentence to the SMS gateway.
  for (const p of [h.contactPhone, h.repPhone].filter(looksLikePhone).concat(phonesIn(h.contactDetails24x7))) {
    const k = phoneKey(p);
    if (k.length >= 10 && !phonesByKey.has(k)) phonesByKey.set(k, p);
  }
  const phones = new Set<string>(phonesByKey.values());
  const admin = process.env.CONTACT_ADMIN_EMAIL || "founders@haemologix.in";
  emails.add(admin.toLowerCase());

  const emailResults = await Promise.allSettled([...emails].map((to) => sendEscalationHandoffEmail(to, data)));
  const smsResults = await Promise.allSettled([...phones].map((to) => sendEscalationHandoffSMS(to, data)));
  const recipients = {
    emails: [...emails].map((to, i) => ({ to, ok: emailResults[i].status === "fulfilled" })),
    sms: [...phones].map((to, i) => ({ to, ok: smsResults[i].status === "fulfilled" })),
  };
  console.log(`[Escalation] Human hand-off: ${recipients.emails.length} email(s), ${recipients.sms.length} SMS`);
  return recipients;
}
