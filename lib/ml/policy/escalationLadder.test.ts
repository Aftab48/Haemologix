import assert from "node:assert/strict";
import test from "node:test";
import { DEFAULT_LADDER_OPTIONS, decideNextRung, nextDonorRadius, type LadderInput } from "./escalationLadder";

const base: LadderInput = {
  shortfall: 2,
  currentRadiusKm: 10,
  lastRungFoundDonors: false,
  inventoryFound: false,
  committedDonors: 0,
  broadcastDone: false,
  humanEscalated: false,
  minutesSinceLastAdvance: 0,
};

test("ladder: donor radius tiers grow by max(×2, +25) and clamp at the ceiling", () => {
  assert.equal(nextDonorRadius(10), 35);
  assert.equal(nextDonorRadius(35), 70);
  assert.equal(nextDonorRadius(70), 100);
  assert.equal(nextDonorRadius(100), null);
  assert.equal(nextDonorRadius(150), null, "beyond ceiling → no further tier");
  assert.equal(nextDonorRadius(20), 45);
  assert.equal(nextDonorRadius(50, { ...DEFAULT_LADDER_OPTIONS, maxDonorRadiusKm: 60 }), 60);
  assert.equal(nextDonorRadius(-1), null);
});

test("ladder: empty local search → expand immediately, no dwell", () => {
  const d = decideNextRung(base);
  assert.equal(d.action.type, "expand_donor_search");
  assert.equal(d.action.type === "expand_donor_search" && d.action.radiusKm, 35);
  assert.match(d.reason, /expanding donor search to 35 km/);
});

test("ladder: at max radius → network broadcast → human hand-off, in that order", () => {
  const b = decideNextRung({ ...base, currentRadiusKm: 100 });
  assert.equal(b.action.type, "network_broadcast");
  assert.equal(b.action.type === "network_broadcast" && b.action.radiusKm, 150);
  assert.equal(b.action.type === "network_broadcast" && b.action.maxFacilities, 20);
  const h = decideNextRung({ ...base, currentRadiusKm: 100, broadcastDone: true });
  assert.equal(h.action.type, "escalate_human");
  const done = decideNextRung({ ...base, currentRadiusKm: 100, broadcastDone: true, humanEscalated: true });
  assert.equal(done.action.type, "none");
});

test("ladder: waits while there is someone to wait for", () => {
  assert.equal(decideNextRung({ ...base, committedDonors: 1 }).action.type, "wait");
  assert.equal(decideNextRung({ ...base, inventoryFound: true }).action.type, "wait");
  const dwelling = decideNextRung({ ...base, lastRungFoundDonors: true, minutesSinceLastAdvance: 3 });
  assert.equal(dwelling.action.type, "wait");
  assert.match(dwelling.reason, /7 more min/);
  const dwelt = decideNextRung({ ...base, lastRungFoundDonors: true, minutesSinceLastAdvance: 11 });
  assert.equal(dwelt.action.type, "expand_donor_search", "after the dwell the ladder climbs again");
  assert.match(dwelt.reason, /were notified but the shortfall/, "reason reflects that donors were found");
  assert.doesNotMatch(dwelt.reason, /No eligible donors/);
});

test("ladder: no shortfall → none, regardless of everything else", () => {
  const d = decideNextRung({ ...base, shortfall: 0, currentRadiusKm: 100, broadcastDone: true });
  assert.equal(d.action.type, "none");
});

test("ladder: options override the guardrails", () => {
  const d = decideNextRung({ ...base, currentRadiusKm: 40, options: { maxDonorRadiusKm: 50, broadcastRadiusKm: 80, broadcastMaxFacilities: 5 } });
  assert.equal(d.action.type === "expand_donor_search" && d.action.radiusKm, 50);
  const b = decideNextRung({ ...base, currentRadiusKm: 50, options: { maxDonorRadiusKm: 50, broadcastRadiusKm: 80, broadcastMaxFacilities: 5 } });
  assert.deepEqual(b.action, { type: "network_broadcast", radiusKm: 80, maxFacilities: 5 });
});
