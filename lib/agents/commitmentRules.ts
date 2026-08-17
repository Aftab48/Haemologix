/**
 * Pure rules for the donor commitment hold — no I/O, so they can be unit-tested
 * and shared with the simulator later. The I/O side lives in commitment.ts.
 */

/**
 * The one definition of "open commitment" on DonorResponseHistory. Reused by the
 * donor search, the shortfall computation, the no-show timer, the sweep and the
 * release paths so they can never disagree.
 */
export const COMMITTED_WHERE = {
  status: "accepted",
  confirmed: false,
  noShow: false,
  releasedAt: null,
} as const;

export const RELEASED_BY = ["donor", "coordinator", "system"] as const;
export type ReleasedBy = (typeof RELEASED_BY)[number];

/** Reasons a donor or coordinator may give. */
export const RELEASE_REASONS = ["cant_make_it", "unwell", "donated_recently", "other"] as const;
export type ReleaseReason = (typeof RELEASE_REASONS)[number];

/** Reasons the system records when it releases a commitment on its own. */
export const SYSTEM_RELEASE_REASONS = ["alert_closed", "alert_expired", "backfill"] as const;
export type SystemReleaseReason = (typeof SYSTEM_RELEASE_REASONS)[number];

export const RELEASE_REASON_LABELS: Record<ReleaseReason | SystemReleaseReason, string> = {
  cant_make_it: "Can't make it",
  unwell: "Unwell",
  donated_recently: "Donated recently elsewhere",
  other: "Other",
  alert_closed: "Alert closed",
  alert_expired: "Alert window expired",
  backfill: "Backfill",
};

export function isReleaseReason(v: unknown): v is ReleaseReason {
  return typeof v === "string" && (RELEASE_REASONS as readonly string[]).includes(v);
}

/**
 * Parse a self-reported donation date. Accepts ISO strings / Date; rejects
 * unparseable values and dates in the future. Returns null when unusable.
 */
export function parseDonatedOn(v: unknown, now: Date = new Date()): Date | null {
  if (v === null || v === undefined || v === "") return null;
  const d = v instanceof Date ? v : new Date(String(v));
  if (!Number.isFinite(d.getTime())) return null;
  if (d.getTime() > now.getTime()) return null;
  return d;
}

/**
 * A self-reported donation may only move lastDonationDate *later* (making the
 * donor less eligible), never earlier.
 */
export function nextLastDonationDate(current: Date | null | undefined, reported: Date | null): Date | null {
  if (!reported) return null;
  if (current && current.getTime() >= reported.getTime()) return null;
  return reported;
}

/**
 * Is a commitment's alert "over" for the purposes of the system sweep? Mirrors
 * the backfill in prisma/sql/0003_donor_release.sql: closed / fulfilled, has an
 * outcome (escalated alerts never auto-close), older than the resolution
 * window, or missing entirely.
 */
export function alertIsOver(
  alert: { status: string; outcome: string | null; createdAt: Date } | null | undefined,
  now: Date,
  windowHours: number
): { over: boolean; reason: SystemReleaseReason | null } {
  if (!alert) return { over: true, reason: "alert_closed" };
  if (alert.status === "FULFILLED" || alert.status === "CLOSED") return { over: true, reason: "alert_closed" };
  if (alert.outcome !== null) return { over: true, reason: "alert_expired" };
  if (alert.createdAt.getTime() <= now.getTime() - windowHours * 3_600_000) return { over: true, reason: "alert_expired" };
  return { over: false, reason: null };
}
