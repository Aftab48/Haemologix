import assert from "node:assert/strict";
import test from "node:test";
import { calculateHistoryScore, donationIntervalDays, scoreDonor, type SexForInterval } from "./donorScoring";

const NOW = Date.parse("2026-09-17T10:00:00Z");
const DAY = 86_400_000;

/** Same donor, same days since becoming eligible, differing only in sex. */
function score(sex: SexForInterval, daysSinceEligible: number, hemoglobinAboveCutoff: number) {
  const cutoff = sex === "MALE" ? 13.0 : 12.5;
  return scoreDonor(
    {
      lastDonation: new Date(NOW - (donationIntervalDays(sex) + daysSinceEligible) * DAY),
      sexForInterval: sex,
      hemoglobin: String(cutoff + hemoglobinAboveCutoff),
      bmi: "22",
      recentVaccinations: false,
      medications: null,
    },
    3,
    10,
    "high",
    { totalAlerts: 4, accepted: 2, avgResponseTime: 5 },
    { now: NOW, hour: 10 }
  );
}

test("an eligible man and woman who are otherwise alike score the same", () => {
  for (const days of [0, 30, 70, 90, 91, 200, 300, 700]) {
    for (const hbMargin of [0, 0.4, 1, 1.5, 3]) {
      assert.deepEqual(score("FEMALE", days, hbMargin), score("MALE", days, hbMargin), `day ${days}, hb +${hbMargin}`);
    }
  }
});

test("the doc's example: 70 days after eligibility both get full history marks", () => {
  assert.equal(score("MALE", 70, 1).history, 100);
  assert.equal(score("FEMALE", 70, 1).history, 100); // was 80 with the flat 90-180 band
});

test("male history bands are exactly the old day-count bands", () => {
  const old = (d: number) => (d >= 90 && d <= 180 ? 100 : d > 180 && d <= 365 ? 80 : d > 365 && d <= 730 ? 60 : d > 730 ? 40 : 0);
  for (const d of [0, 89.99, 90, 135.5, 180, 180.01, 365, 365.5, 730, 730.01, 5000]) {
    assert.equal(calculateHistoryScore(d, 90), old(d), `day ${d}`);
  }
});

test("unknown sex gets the longer interval, never an early full score", () => {
  assert.equal(calculateHistoryScore(100, donationIntervalDays("UNKNOWN")), 0);
});

test("never donated scores the same for everyone", () => {
  const base = { lastDonation: null, hemoglobin: null, bmi: null, recentVaccinations: null, medications: null };
  const m = scoreDonor({ ...base, sexForInterval: "MALE" }, 1, 10, "high", undefined, { now: NOW, hour: 10 });
  const f = scoreDonor({ ...base, sexForInterval: "FEMALE" }, 1, 10, "high", undefined, { now: NOW, hour: 10 });
  assert.deepEqual(f, m);
});
