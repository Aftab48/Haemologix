import assert from "node:assert/strict";
import test from "node:test";
import { chooseNotificationBatch, deterministicNotifyDecision, type NotifyCandidate } from "./donorNotifyPolicy";
import { chooseInventorySource, chooseTransportMethod, type InventoryCandidate } from "./inventoryPolicy";
import { assessUrgency } from "./urgencyPolicy";
import { decideEscalation } from "./escalationPolicy";
import { decideEligibility } from "./eligibilityPolicy";

const cands = (n: number): NotifyCandidate[] =>
  Array.from({ length: n }, (_, i) => ({ id: `d${i}`, rank: i + 1, scoreFinal: 90 - i, distanceKm: 1 + i }));

test("notify: null predictions → deterministic rule (max(10,2×units) ≤ 50, thin-pool inventory trigger)", () => {
  const d = chooseNotificationBatch({ candidates: cands(30), shortfall: 3, urgency: "high", predictions: null });
  assert.equal(d.source, "deterministic");
  assert.equal(d.notifyIds.length, 10);
  assert.equal(d.triggerInventoryNow, false);
  const thin = chooseNotificationBatch({ candidates: cands(4), shortfall: 8, urgency: "critical", predictions: null });
  assert.equal(thin.triggerInventoryNow, true);
  assert.equal(thin.notifyIds.length, 4);
  assert.deepEqual(deterministicNotifyDecision({ candidates: [], shortfall: 1, urgency: "low", predictions: null }).notifyIds, []);
});

test("notify: predictions → smallest prefix reaching target, ordered by expected arrival", () => {
  const c = cands(20);
  const accept = new Map(c.map((x, i) => [x.id, i < 5 ? 0.9 : 0.1]));
  const show = new Map(c.map((x) => [x.id, 0.8]));
  const d = chooseNotificationBatch({ candidates: c, shortfall: 2, urgency: "medium", predictions: { accept, show } });
  assert.equal(d.source, "model");
  // floor is min(10, pool) or shortfall; the 5 strong donors alone give 3.6 expected ≥ 3 target, but floor=10
  assert.equal(d.notifyIds.length, 10);
  assert.ok(d.notifyIds.slice(0, 5).every((id) => Number(id.slice(1)) < 5), "strong donors first");
  assert.equal(d.triggerInventoryNow, false);
  assert.ok((d.expectedArrivals ?? 0) >= 3);
});

test("notify: pool cannot cover shortfall → inventory now; caps by urgency", () => {
  const c = cands(60);
  const accept = new Map(c.map((x) => [x.id, 0.05]));
  const show = new Map(c.map((x) => [x.id, 0.5]));
  const d = chooseNotificationBatch({ candidates: c, shortfall: 6, urgency: "low", predictions: { accept, show } });
  assert.equal(d.triggerInventoryNow, true);
  assert.equal(d.notifyIds.length, 20, "low urgency cap");
  const dc = chooseNotificationBatch({ candidates: c, shortfall: 6, urgency: "critical", predictions: { accept, show } });
  assert.equal(dc.notifyIds.length, 50, "critical cap");
});

const units = (n: number): InventoryCandidate[] =>
  Array.from({ length: n }, (_, i) => ({ id: `u${i}`, rank: i + 1, scoreFinal: 90 - i * 5, distanceKm: 5 + i * 10, unitsAvailable: 4, etaMinutes: 30 + i * 20, method: "courier" }));

test("inventory: null predictions → deterministic top; model prefers higher P(ok) that fits window", () => {
  const u = units(4);
  assert.equal(chooseInventorySource({ candidates: u, shortfall: 2, urgency: "high", minutesLeft: 240, predictions: null }).unitId, "u0");
  const deliveryOk = new Map([["u0", 0.4], ["u1", 0.9], ["u2", 0.95], ["u3", 0.3]]);
  const deliveryMinutes = new Map([["u0", 40], ["u1", 55], ["u2", 300], ["u3", 90]]);
  const d = chooseInventorySource({ candidates: u, shortfall: 2, urgency: "high", minutesLeft: 120, predictions: { deliveryOk, deliveryMinutes } });
  assert.equal(d.unitId, "u1", "u2 has best P(ok) but does not fit the window");
  assert.equal(d.source, "model");
});

test("inventory: cold-chain-invalid candidates are never chosen even if predicted best", () => {
  const u = units(2);
  u[1].etaMinutes = 7 * 60; // > 6h
  const d = chooseInventorySource({ candidates: u, shortfall: 1, urgency: "critical", minutesLeft: 600, predictions: { deliveryOk: new Map([["u0", 0.2], ["u1", 0.99]]), deliveryMinutes: new Map([["u0", 30], ["u1", 100]]) } });
  assert.equal(d.unitId, "u0");
});

test("transport: rule method with model-only upgrades; cold chain reported", () => {
  const base = chooseTransportMethod({ distanceKm: 30, urgency: "high", etaMinutes: 60, minutesLeft: 300, predictedMinutes: null });
  assert.equal(base.method, "courier");
  assert.equal(base.source, "deterministic");
  // 40 km / medium → rule says scheduled; predicted to miss window → courier
  const up = chooseTransportMethod({ distanceKm: 40, urgency: "medium", etaMinutes: 120, minutesLeft: 90, predictedMinutes: 150 });
  assert.equal(up.method, "courier");
  assert.equal(up.source, "model");
  // 10 km / critical is already ambulance by rule
  assert.equal(chooseTransportMethod({ distanceKm: 10, urgency: "critical", etaMinutes: 20, minutesLeft: 10, predictedMinutes: 30 }).method, "ambulance");
  const noUp = chooseTransportMethod({ distanceKm: 40, urgency: "critical", etaMinutes: 70, minutesLeft: 30, predictedMinutes: 90 });
  assert.equal(noUp.method, "courier", "no ambulance beyond 15 km");
});

test("urgency: one-step moves only, never below critical", () => {
  assert.equal(assessUrgency({ ruleUrgency: "medium", bloodType: "O+", daysRemaining: 2.5, probs: null }).urgency, "medium");
  const up = assessUrgency({ ruleUrgency: "medium", bloodType: "O-", daysRemaining: 2.5, probs: [0, 0.05, 0.15, 0.8] });
  assert.equal(up.urgency, "high", "moves one step toward critical, not two");
  assert.equal(up.source, "model");
  const stay = assessUrgency({ ruleUrgency: "critical", bloodType: "O-", daysRemaining: 0.5, probs: [0.9, 0.1, 0, 0] });
  assert.equal(stay.urgency, "critical");
  const unsure = assessUrgency({ ruleUrgency: "low", bloodType: "A+", daysRemaining: 4, probs: [0.45, 0.4, 0.1, 0.05] });
  assert.equal(unsure.urgency, "low");
});

test("escalation: deterministic floor at 60 min; model escalates earlier on low P(resolve)", () => {
  const wait = decideEscalation({ shortfall: 2, committedDonors: 1, expectedArrivals: null, minutesElapsed: 30, minutesLeft: 300, pResolvesInWindow: null, inventoryTriggered: false });
  assert.equal(wait.escalate, false);
  const floor = decideEscalation({ shortfall: 2, committedDonors: 0, expectedArrivals: null, minutesElapsed: 61, minutesLeft: 300, pResolvesInWindow: null, inventoryTriggered: false });
  assert.equal(floor.escalate, true);
  assert.equal(floor.action, "inventory_search");
  const early = decideEscalation({ shortfall: 2, committedDonors: 1, expectedArrivals: 0.6, minutesElapsed: 20, minutesLeft: 300, pResolvesInWindow: 0.2, inventoryTriggered: true });
  assert.equal(early.escalate, true);
  assert.equal(early.action, "transfer_or_manual");
  assert.equal(early.source, "model");
  const none = decideEscalation({ shortfall: 0, committedDonors: 0, expectedArrivals: null, minutesElapsed: 100, minutesLeft: 10, pResolvesInWindow: 0.01, inventoryTriggered: false });
  assert.equal(none.escalate, false);
});

test("eligibility: model can only add needs_review; hard failures always rejected", () => {
  assert.equal(decideEligibility({ passed: false, failedCriteria: ["Hemoglobin"], hardFailure: true, pNeedsReview: 0.99 }).finalDecision, "rejected");
  assert.equal(decideEligibility({ passed: true, failedCriteria: [], hardFailure: false, pNeedsReview: null }).finalDecision, "approved");
  const r = decideEligibility({ passed: true, failedCriteria: [], hardFailure: false, pNeedsReview: 0.7 });
  assert.equal(r.finalDecision, "needs_review");
  assert.equal(r.needsReview, true);
  const s = decideEligibility({ passed: false, failedCriteria: ["BMI"], hardFailure: false, pNeedsReview: 0.2 });
  assert.equal(s.finalDecision, "rejected");
});
