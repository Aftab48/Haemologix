/**
 * DONOR COMMITMENT ("hold")
 *
 * Once a donor accepts an alert they are committed to it: excluded from other
 * alerts' matching (donorAgent.findAndRankDonors), unable to accept a second
 * alert (coordinatorAgent.processDonorResponse), and shown only that alert on
 * their dashboard. The simulator has modelled this from the start
 * (SimDonor.committedToAlertId, lib/sim/engine.ts) — this is the production side.
 *
 * The hold is *derived*, never stored on Donor: an open commitment is a
 * DonorResponseHistory row matching COMMITTED_WHERE. It ends by exactly one of
 *   • hospital confirms arrival        → confirmed = true   (coordinatorAgent.confirmDonorArrival)
 *   • no-show timer                    → noShow = true      (scheduler.markNoShows)
 *   • release                          → releasedAt set     (this module)
 * Release and no-show stay distinguishable forever: noShow means "accepted, did
 * not arrive, did not tell us"; releasedAt means somebody said they are not
 * coming — the donor, a coordinator, or the system once the alert is over.
 */

import { db } from "@/db";
import { AgentType, Prisma } from "@prisma/client";
import { decisionBasis } from "@/lib/ml/agentBridge";
import { recordOutcome } from "@/lib/ml/record";
import { checkFulfillmentProgress } from "./coordinatorAgent";
import {
  COMMITTED_WHERE,
  RELEASE_REASON_LABELS,
  nextLastDonationDate,
  parseDonatedOn,
  type ReleasedBy,
  type ReleaseReason,
  type SystemReleaseReason,
} from "./commitmentRules";

// Pure rules (predicate, reason taxonomy, date rules) live in commitmentRules.ts
// so they stay unit-testable without a database; re-exported for callers.
export * from "./commitmentRules";

/** Alert statuses in which the alert is still being worked (mirrors scheduler.ts). */
export const ALERT_OPEN_STATUSES = ["PENDING", "NOTIFIED", "MATCHED"] as const;

// Type-level guard: the shared predicate must remain a valid Prisma where-fragment.
const _committedWhereIsPrismaWhere: Prisma.DonorResponseHistoryWhereInput = COMMITTED_WHERE;
void _committedWhereIsPrismaWhere;

export interface ActiveCommitment {
  historyId: string;
  donorId: string;
  requestId: string;
  respondedAt: Date | null;
  expectedArrival: Date | null;
  alert: {
    id: string;
    bloodType: string;
    urgency: string;
    unitsNeeded: string;
    status: string;
    outcome: string | null;
    hospitalId: string;
    hospitalName: string | null;
    hospitalAddress: string | null;
    hospitalPhone: string | null;
    latitude: string | null;
    longitude: string | null;
  } | null;
}

/** The donor's open commitment, if any (most recent acceptance first). */
export async function findActiveCommitment(donorId: string): Promise<ActiveCommitment | null> {
  const row = await db.donorResponseHistory.findFirst({
    where: { donorId, ...COMMITTED_WHERE },
    orderBy: { respondedAt: "desc" },
    select: { id: true, donorId: true, requestId: true, respondedAt: true, expectedArrival: true },
  });
  if (!row) return null;
  const alert = await db.alert.findUnique({
    where: { id: row.requestId },
    include: { hospital: { select: { hospitalName: true, hospitalAddress: true, contactPhone: true, latitude: true, longitude: true } } },
  });
  return {
    historyId: row.id,
    donorId: row.donorId,
    requestId: row.requestId,
    respondedAt: row.respondedAt,
    expectedArrival: row.expectedArrival,
    alert: alert
      ? {
          id: alert.id,
          bloodType: alert.bloodType,
          urgency: String(alert.urgency),
          unitsNeeded: alert.unitsNeeded,
          status: alert.status,
          outcome: alert.outcome,
          hospitalId: alert.hospitalId,
          hospitalName: alert.hospital?.hospitalName ?? null,
          hospitalAddress: alert.hospital?.hospitalAddress ?? null,
          hospitalPhone: alert.hospital?.contactPhone ?? null,
          latitude: alert.hospital?.latitude ?? alert.latitude ?? null,
          longitude: alert.hospital?.longitude ?? alert.longitude ?? null,
        }
      : null,
  };
}

export interface ReleaseOptions {
  by: ReleasedBy;
  reason?: ReleaseReason | SystemReleaseReason | null;
  note?: string | null;
  /** self-reported donation date, honoured only with reason "donated_recently" */
  donatedOn?: Date | string | null;
  /** skip the coordinator re-plan (used by bulk/system paths that handle it themselves) */
  skipProgressCheck?: boolean;
}

export interface ReleaseResult {
  success: boolean;
  /** false when there was nothing to release (idempotent no-op) */
  released: boolean;
  message?: string;
  error?: string;
  lastDonationDateUpdated?: boolean;
}

/**
 * Release one donor's commitment to one alert.
 *
 * Idempotent: a second call finds no open row and returns released:false. Only
 * human releases (donor / coordinator) write the donor_show=0 label — the donor
 * did not arrive and told us so. System releases record nothing: the donor may
 * still have turned up after the alert closed.
 */
export async function releaseDonorCommitment(requestId: string, donorId: string, opts: ReleaseOptions): Promise<ReleaseResult> {
  try {
    const now = new Date();
    const open = await db.donorResponseHistory.findFirst({
      where: { donorId, requestId, ...COMMITTED_WHERE },
      orderBy: { respondedAt: "desc" },
      select: { id: true, respondedAt: true, expectedArrival: true },
    });
    if (!open) return { success: true, released: false, message: "No open commitment for this donor on this alert" };

    const reason = opts.reason ?? null;
    const note = typeof opts.note === "string" && opts.note.trim() ? opts.note.trim().slice(0, 500) : null;

    await db.donorResponseHistory.updateMany({
      where: { donorId, requestId, ...COMMITTED_WHERE },
      data: { releasedAt: now, releasedBy: opts.by, releaseReason: reason, releaseNote: note },
    });

    // Hospital dashboard row: CONFIRMED (= accepted) → RELEASED
    await db.alertResponse.updateMany({ where: { alertId: requestId, donorId }, data: { status: "RELEASED" } });

    // Learning loop: they did not arrive. Human releases only (see doc comment).
    if (opts.by !== "system") {
      await recordOutcome({ requestId, task: "donor_show", subjectId: donorId, actual: 0, outcomeAt: now });
    }

    // Off-platform donation → tighten the medical interval (only ever later).
    let lastDonationDateUpdated = false;
    if (reason === "donated_recently") {
      const reported = parseDonatedOn(opts.donatedOn, now);
      const donor = await db.donor.findUnique({ where: { id: donorId }, select: { lastDonationDate: true } });
      const next = nextLastDonationDate(donor?.lastDonationDate ?? null, reported);
      if (next) {
        await db.donor.update({ where: { id: donorId }, data: { lastDonationDate: next, hasDonatedBefore: true } });
        lastDonationDateUpdated = true;
      }
    }

    const minutesSinceAccept = open.respondedAt ? Math.round((now.getTime() - open.respondedAt.getTime()) / 60_000) : null;
    const who = opts.by === "donor" ? "Donor" : opts.by === "coordinator" ? "Coordinator" : "System";
    const why = reason ? ` (${RELEASE_REASON_LABELS[reason] ?? reason})` : "";
    await db.agentDecision.create({
      data: {
        agentType: AgentType.COORDINATOR,
        eventType: "donor_released",
        requestId,
        decision: {
          donor_id: donorId,
          released_by: opts.by,
          reason,
          note,
          expected_arrival: open.expectedArrival?.toISOString() ?? null,
          minutes_since_accept: minutesSinceAccept,
          last_donation_date_updated: lastDonationDateUpdated,
          reasoning:
            opts.by === "system"
              ? `Commitment released by the system${why} — the alert is over; the donor is available for other alerts again.`
              : `${who} released this commitment${why}${minutesSinceAccept !== null ? ` ${minutesSinceAccept} min after accepting` : ""} — the donor is not coming and is available for other alerts again.`,
          ...decisionBasis(),
        } as Prisma.InputJsonObject,
        confidence: null,
      },
    });

    // Re-plan exactly as a no-show would (scheduler.markNoShows).
    if (!opts.skipProgressCheck) {
      const alert = await db.alert.findUnique({ where: { id: requestId }, select: { status: true, outcome: true } });
      if (alert && !alert.outcome && (ALERT_OPEN_STATUSES as readonly string[]).includes(alert.status)) {
        await checkFulfillmentProgress(requestId);
      }
    }

    console.log(`[Commitment] Released donor ${donorId} from ${requestId} by ${opts.by}${why}`);
    return { success: true, released: true, message: "Commitment released", lastDonationDateUpdated };
  } catch (error) {
    console.error("[Commitment] Release failed:", error);
    return { success: false, released: false, error: String(error) };
  }
}

/**
 * System release of every open commitment on an alert that has reached a
 * terminal state (closed / fulfilled / window expired). No labels, no re-plan.
 */
export async function releaseCommitmentsForClosedAlert(requestId: string, reason: SystemReleaseReason): Promise<number> {
  const open = await db.donorResponseHistory.findMany({
    where: { requestId, ...COMMITTED_WHERE },
    select: { donorId: true },
    distinct: ["donorId"],
  });
  let n = 0;
  for (const { donorId } of open) {
    const r = await releaseDonorCommitment(requestId, donorId, { by: "system", reason, skipProgressCheck: true });
    if (r.released) n++;
  }
  return n;
}
