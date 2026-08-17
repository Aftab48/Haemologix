import assert from "node:assert/strict";
import test from "node:test";
import {
  COMMITTED_WHERE,
  RELEASE_REASONS,
  SYSTEM_RELEASE_REASONS,
  alertIsOver,
  isReleaseReason,
  nextLastDonationDate,
  parseDonatedOn,
} from "./commitmentRules";

const NOW = new Date("2026-08-17T10:00:00Z");

test("the committed predicate is exactly accepted / not confirmed / not no-show / not released", () => {
  assert.deepEqual(COMMITTED_WHERE, { status: "accepted", confirmed: false, noShow: false, releasedAt: null });
});

test("release reasons: donor/coordinator taxonomy is closed, system reasons are separate", () => {
  for (const r of RELEASE_REASONS) assert.equal(isReleaseReason(r), true);
  for (const r of SYSTEM_RELEASE_REASONS) assert.equal(isReleaseReason(r), false, `${r} is system-only`);
  assert.equal(isReleaseReason("banana"), false);
  assert.equal(isReleaseReason(undefined), false);
  assert.equal(isReleaseReason(42), false);
});

test("parseDonatedOn accepts past dates, rejects future / garbage / empty", () => {
  assert.equal(parseDonatedOn("2026-08-10", NOW)?.toISOString(), new Date("2026-08-10").toISOString());
  assert.equal(parseDonatedOn(new Date("2026-08-01T00:00:00Z"), NOW)?.toISOString(), "2026-08-01T00:00:00.000Z");
  assert.equal(parseDonatedOn("2026-09-01", NOW), null, "future");
  assert.equal(parseDonatedOn("not a date", NOW), null);
  assert.equal(parseDonatedOn("", NOW), null);
  assert.equal(parseDonatedOn(null, NOW), null);
  assert.equal(parseDonatedOn(undefined, NOW), null);
});

test("lastDonationDate only ever moves later", () => {
  const reported = new Date("2026-08-10T00:00:00Z");
  assert.equal(nextLastDonationDate(null, reported), reported, "never donated → set");
  assert.equal(nextLastDonationDate(new Date("2026-05-01T00:00:00Z"), reported), reported, "older on file → move later");
  assert.equal(nextLastDonationDate(new Date("2026-08-15T00:00:00Z"), reported), null, "newer on file → keep");
  assert.equal(nextLastDonationDate(reported, reported), null, "same → no-op");
  assert.equal(nextLastDonationDate(null, null), null, "nothing reported → no-op");
});

test("alertIsOver mirrors the SQL backfill condition", () => {
  const fresh = new Date(NOW.getTime() - 60 * 60_000); // 1 h old
  const stale = new Date(NOW.getTime() - 7 * 3_600_000); // 7 h old (> 6 h window)
  assert.deepEqual(alertIsOver({ status: "MATCHED", outcome: null, createdAt: fresh }, NOW, 6), { over: false, reason: null });
  assert.deepEqual(alertIsOver({ status: "FULFILLED", outcome: "FULFILLED", createdAt: fresh }, NOW, 6), { over: true, reason: "alert_closed" });
  assert.deepEqual(alertIsOver({ status: "CLOSED", outcome: "CANCELLED", createdAt: fresh }, NOW, 6), { over: true, reason: "alert_closed" });
  // escalated: still MATCHED but has an outcome and never auto-closes
  assert.deepEqual(alertIsOver({ status: "MATCHED", outcome: "ESCALATED", createdAt: fresh }, NOW, 6), { over: true, reason: "alert_expired" });
  assert.deepEqual(alertIsOver({ status: "PENDING", outcome: null, createdAt: stale }, NOW, 6), { over: true, reason: "alert_expired" });
  assert.deepEqual(alertIsOver(null, NOW, 6), { over: true, reason: "alert_closed" }, "orphan row");
});
