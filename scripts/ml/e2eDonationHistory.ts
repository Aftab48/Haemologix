/**
 * Checks the donation-history triggers from prisma/sql/0004_donation_history.sql
 * against the ML database: sexForInterval derivation, self-reported vs
 * hospital-confirmed donation logging, corrections and de-duplication. Then the
 * retention metrics from prisma/sql/0005_retention_metrics.sql, as deltas so
 * other rows in the database don't matter.
 *
 *   npx tsx scripts/ml/e2eDonationHistory.ts
 *
 * Test donors are tagged and deleted at the end (events cascade).
 */
import "./loadEnv";
import assert from "node:assert/strict";
import { db } from "@/db";

const day = (s: string) => new Date(`${s}T10:00:00.000Z`);

type RateRow = { sexForInterval: string; matured_windows: bigint; returned: bigint; early_returns: bigint };
const AS_OF = "2026-12-31";
const rates = async () => {
  const rows = await db.$queryRawUnsafe<RateRow[]>(
    `SELECT "sexForInterval"::text AS "sexForInterval", matured_windows, returned, early_returns
     FROM haemologix_return_rate(60, '${AS_OF}'::timestamp)`
  );
  const get = (sex: string) => {
    const r = rows.find((x) => x.sexForInterval === sex);
    return { windows: Number(r?.matured_windows ?? 0), returned: Number(r?.returned ?? 0), early: Number(r?.early_returns ?? 0) };
  };
  return { MALE: get("MALE"), FEMALE: get("FEMALE") };
};
const events = async (donorId: string) =>
  (await db.bloodDonationEvent.findMany({ where: { donorId }, orderBy: { donatedAt: "asc" } }))
    .map((e) => `${e.donatedAt.toISOString().slice(0, 10)}:${e.source}`);

async function main() {
  const base = {
    phone: "0", address: "x", city: "x", state: "x", pincode: "0", dateOfBirth: day("1990-01-01"),
    weight: "60", height: "170", bmi: "22", bloodGroup: "O+",
  };
  const tag = `trigger-check-${Date.now()}`;
  const a = await db.donor.create({ data: { ...base, name: tag, email: `${tag}-a@example.invalid`, gender: "Male ", lastDonationDate: day("2026-01-10") } });
  const b = await db.donor.create({ data: { ...base, name: tag, email: `${tag}-b@example.invalid`, gender: "other" } });
  const c = await db.donor.create({ data: { ...base, name: tag, email: `${tag}-c@example.invalid`, gender: "F" } });
  try {
    // sex from gender
    assert.equal(a.sexForInterval, "MALE");
    assert.equal(b.sexForInterval, "UNKNOWN");
    assert.equal(c.sexForInterval, "FEMALE");
    // gender change recomputes; explicit write wins
    const b2 = await db.donor.update({ where: { id: b.id }, data: { gender: "m" } });
    assert.equal(b2.sexForInterval, "MALE");
    const b3 = await db.donor.update({ where: { id: b.id }, data: { gender: "other", sexForInterval: "FEMALE" } });
    assert.equal(b3.sexForInterval, "FEMALE");

    // onboarding self-report logged
    assert.deepEqual(await events(a.id), ["2026-01-10:SELF_REPORT"]);
    // later self-report = new donation
    await db.donor.update({ where: { id: a.id }, data: { lastDonationDate: day("2026-05-01") } });
    assert.deepEqual(await events(a.id), ["2026-01-10:SELF_REPORT", "2026-05-01:SELF_REPORT"]);
    // earlier = correction of the latest self-report
    await db.donor.update({ where: { id: a.id }, data: { lastDonationDate: day("2026-04-20") } });
    assert.deepEqual(await events(a.id), ["2026-01-10:SELF_REPORT", "2026-04-20:SELF_REPORT"]);
    // unrelated update does nothing
    await db.donor.update({ where: { id: a.id }, data: { city: "y" } });
    assert.equal((await events(a.id)).length, 2);

    // hospital confirms: accepted row → confirmed (as confirmDonorArrival does)
    const responded = new Date("2026-08-01T09:00:00.000Z");
    const h = await db.donorResponseHistory.create({
      data: { donorId: a.id, requestId: `${tag}-alert`, notifiedAt: new Date("2026-08-01T08:50:00.000Z"), respondedAt: responded, status: "accepted" },
    });
    assert.equal((await events(a.id)).length, 2, "accepted alone is not a donation");
    await db.donorResponseHistory.updateMany({ where: { id: h.id }, data: { confirmed: true, arrivedAt: new Date("2026-08-01T10:00:00.000Z"), donationCompleted: true } });
    assert.deepEqual(await events(a.id), ["2026-01-10:SELF_REPORT", "2026-04-20:SELF_REPORT", "2026-08-01:HOSPITAL_CONFIRMED"]);
    // app-backend sweep then copies respondedAt into lastDonationDate: no duplicate
    await db.donor.update({ where: { id: a.id }, data: { lastDonationDate: responded } });
    assert.equal((await events(a.id)).length, 3);
    // same-day self-report then hospital confirmation → upgraded, not duplicated
    await db.donor.update({ where: { id: c.id }, data: { lastDonationDate: day("2026-09-01") } });
    await db.donorResponseHistory.create({
      data: { donorId: c.id, requestId: `${tag}-alert2`, notifiedAt: day("2026-09-01"), status: "accepted", confirmed: true, arrivedAt: new Date("2026-09-01T12:00:00.000Z") },
    });
    assert.deepEqual(await events(c.id), ["2026-09-01:HOSPITAL_CONFIRMED"]);

    // deferral table is writable
    await db.deferralEvent.create({ data: { donorId: c.id, category: "LOW_HB", recheckDate: day("2026-10-01"), source: "hospital" } });
    console.log("trigger checks passed");

    // --- R60-E (section 1.2), as of 2026-12-31 --------------------------------
    await db.donor.deleteMany({ where: { name: tag } }); // keep only the cases below
    const before = await rates();
    const donor = (key: string, gender: string, first: string) =>
      db.donor.create({ data: { ...base, name: tag, email: `${tag}-${key}@example.invalid`, gender, lastDonationDate: day(first) } });
    const donate = (id: string, on: string) => db.donor.update({ where: { id }, data: { lastDonationDate: day(on) } });

    // M1: eligible 04-01, back 04-15 (returned); eligible again 07-14, no return by 09-12 (matured, not returned)
    const m1 = await donor("m1", "male", "2026-01-01");
    await donate(m1.id, "2026-04-15");
    // M2: back 02-01, before eligibility on 04-01 (early: flagged, not counted); then eligible 05-02, never back
    const m2 = await donor("m2", "male", "2026-01-01");
    await donate(m2.id, "2026-02-01");
    // F1: eligible 05-01, back 05-21 (returned); eligible again 09-18, no return by 11-17 (matured, not returned)
    const f1 = await donor("f1", "female", "2026-01-01");
    await donate(f1.id, "2026-05-21");
    // F2: eligible 05-01, deferred 05-10 until 06-10: not churn, so left out of the window count
    const f2 = await donor("f2", "female", "2026-01-01");
    await db.deferralEvent.create({ data: { donorId: f2.id, category: "LOW_HB", deferredAt: day("2026-05-10"), recheckDate: day("2026-06-10"), source: "hospital" } });

    const view = await db.$queryRawUnsafe<{ eligible_at: Date; return_gap_days: number | null }[]>(
      `SELECT eligible_at, return_gap_days FROM "DonorEligibilityWindow" WHERE "donorId" = $1 ORDER BY donation_number`,
      f1.id
    );
    assert.deepEqual(
      view.map((v) => [v.eligible_at.toISOString().slice(0, 10), v.return_gap_days]),
      [["2026-05-01", 20], ["2026-09-18", null]],
      "a woman's window opens at day 120"
    );

    const after = await rates();
    assert.deepEqual(
      { windows: after.MALE.windows - before.MALE.windows, returned: after.MALE.returned - before.MALE.returned, early: after.MALE.early - before.MALE.early },
      { windows: 3, returned: 1, early: 1 },
      "men"
    );
    assert.deepEqual(
      { windows: after.FEMALE.windows - before.FEMALE.windows, returned: after.FEMALE.returned - before.FEMALE.returned, early: after.FEMALE.early - before.FEMALE.early },
      { windows: 2, returned: 1, early: 0 },
      "women (the deferred donor is excluded)"
    );
    console.log("retention metric checks passed");
  } finally {
    await db.donor.deleteMany({ where: { name: tag } });
    assert.equal(await db.bloodDonationEvent.count({ where: { donorId: { in: [a.id, b.id, c.id] } } }), 0, "cascade");
    await db.$disconnect();
  }
}
main().catch((e) => { console.error(e); process.exit(1); });
