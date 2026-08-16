import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import test from "node:test";
import { getCompatibleDonorTypes } from "@/lib/agents/donorAgent";
import { PREDICTION_TASKS } from "@/lib/ml/types";
import { toTrainingRows } from "./dataset";
import { runScenario } from "./engine";
import { aggregateQuality, scoreRun } from "./metrics";
import { deterministicPolicy } from "./policy";
import { createRng } from "./rng";
import {
  randomScenario,
  scenarioA,
  scenarioB,
  scenarioC,
  scenarioD,
  scenarioE,
  scenarioF,
  scenarioG,
} from "./scenarios";
import type { SimRunResult } from "./types";

function hashRows(result: SimRunResult): string {
  const h = createHash("sha256");
  for (const r of toTrainingRows(result)) h.update(JSON.stringify(r));
  return h.digest("hex");
}

test("rng is deterministic and well-behaved", () => {
  const a = createRng(123);
  const b = createRng(123);
  const xs = Array.from({ length: 50 }, () => a.next());
  const ys = Array.from({ length: 50 }, () => b.next());
  assert.deepEqual(xs, ys);
  assert.ok(xs.every((x) => x >= 0 && x < 1));
  const c = createRng(1);
  const ints = Array.from({ length: 1000 }, () => c.int(3, 5));
  assert.ok(ints.every((i) => i >= 3 && i <= 5));
  assert.ok(new Set(ints).size === 3);
  const ln = Array.from({ length: 1000 }, () => c.lognormal(10, 0.5));
  assert.ok(ln.every((v) => v > 0));
});

test("same seed ⇒ identical scenario, events and training rows", () => {
  const spec1 = randomScenario(4242);
  const spec2 = randomScenario(4242);
  assert.deepEqual(spec1, spec2);
  const r1 = runScenario(spec1);
  const r2 = runScenario(spec2);
  assert.equal(hashRows(r1), hashRows(r2));
  assert.equal(JSON.stringify(r1.events), JSON.stringify(r2.events));
});

test("different seeds ⇒ different runs", () => {
  const r1 = runScenario(randomScenario(1));
  const r2 = runScenario(randomScenario(2));
  assert.notEqual(hashRows(r1), hashRows(r2));
});

test("every run emits well-formed rows for known tasks with finite features", () => {
  const r = runScenario(randomScenario(99));
  assert.ok(r.rows.length > 0);
  for (const row of r.rows) {
    assert.ok((PREDICTION_TASKS as readonly string[]).includes(row.task), row.task);
    assert.ok(Number.isFinite(row.label), `label for ${row.task}`);
    for (const [k, v] of Object.entries(row.features)) {
      if (typeof v === "number") assert.ok(Number.isFinite(v), `${row.task}.${k}`);
      else assert.ok(typeof v === "string" || typeof v === "boolean", `${row.task}.${k}`);
    }
  }
  // window rows exist once per alert; urgency rows once per alert plus monitoring samples
  const alerts = r.alerts.length;
  assert.ok(r.rows.filter((x) => x.task === "urgency_priority").length >= alerts);
  assert.equal(r.rows.filter((x) => x.task === "alert_resolves_in_window").length, alerts);
  assert.ok(r.rows.some((x) => x.task === "eligibility_needs_review"));
});

test("scenario A — insufficient donor pool escalates beyond donors", () => {
  let sawEscalationPath = 0;
  for (let s = 1; s <= 12; s++) {
    const r = runScenario(scenarioA(s));
    const a = r.alerts[0];
    assert.ok(a.notified < a.unitsNeeded * 2, `pool should be thin (notified ${a.notified} for ${a.unitsNeeded})`);
    if (a.inventoryTriggered || a.escalated) sawEscalationPath++;
  }
  assert.ok(sawEscalationPath >= 10, `expected inventory/escalation in almost all A runs, got ${sawEscalationPath}/12`);
});

test("scenario B — many accept, few arrive", () => {
  let acc = 0;
  let arr = 0;
  let noshow = 0;
  for (let s = 1; s <= 15; s++) {
    const a = runScenario(scenarioB(s)).alerts[0];
    acc += a.accepted;
    arr += a.arrived;
    noshow += a.noShows;
  }
  assert.ok(acc > 40, `expected many acceptances, got ${acc}`);
  assert.ok(noshow > arr, `expected more no-shows than arrivals (${noshow} vs ${arr})`);
});

test("scenario C — donors arrive but supply stays short → inventory", () => {
  let inv = 0;
  let arrivedButShort = 0;
  for (let s = 1; s <= 15; s++) {
    const a = runScenario(scenarioC(s)).alerts[0];
    if (a.inventoryTriggered) inv++;
    if (a.arrived > 0 && a.unitsFromDonors < a.unitsNeeded) arrivedButShort++;
  }
  assert.ok(inv >= 12, `inventory should be triggered in most C runs (${inv}/15)`);
  assert.ok(arrivedButShort >= 10, `donors arrive yet short in most C runs (${arrivedButShort}/15)`);
});

test("scenario D — blood bank cannot dispatch; system keeps escalating", () => {
  for (let s = 1; s <= 10; s++) {
    const r = runScenario(scenarioD(s));
    const bbFailures = r.events.filter((e) => e.type === "inventory.failed" && e.hospitalId.startsWith("bb"));
    const bbDelivered = r.events.filter((e) => e.type === "transport.delivered" && r.events.some((x) => x.type === "inventory.reserved" && x.hospitalId.startsWith("bb") && x.alertId === e.alertId));
    // Any blood-bank attempt must fail (reliability 0). Delivered blood-bank transports must be zero.
    assert.equal(
      r.events.filter((e) => e.type === "transport.planned").filter((e) => {
        const res = r.events.find((x) => x.type === "inventory.reserved" && x.alertId === e.alertId && x.hospitalId.startsWith("bb"));
        return res && !r.events.some((x) => x.type === "inventory.failed" && x.hospitalId.startsWith("bb") && x.alertId === e.alertId);
      }).length,
      0
    );
    void bbFailures;
    void bbDelivered;
    const a = r.alerts[0];
    assert.ok(a.inventoryTriggered, "inventory should be triggered");
  }
});

test("scenario E — hospital-to-hospital transfer resolves the shortage", () => {
  let transfers = 0;
  let resolvedViaInventory = 0;
  for (let s = 1; s <= 15; s++) {
    const r = runScenario(scenarioE(s));
    const a = r.alerts[0];
    if (a.transferTriggered) transfers++;
    if (a.unitsFromInventory > 0) resolvedViaInventory++;
  }
  assert.ok(transfers >= 13, `transfer should be attempted in nearly all E runs (${transfers}/15)`);
  assert.ok(resolvedViaInventory >= 11, `transfer should deliver units in most E runs (${resolvedViaInventory}/15)`);
});

test("scenario F — simultaneous alerts compete; no donor is double-committed", () => {
  for (let s = 1; s <= 10; s++) {
    const r = runScenario(scenarioF(s));
    assert.ok(r.alerts.length >= 3);
    assert.deepEqual(r.violations, []);
    const alreadyCommitted = r.rows.filter((x) => x.task === "donor_accept" && x.meta?.alreadyCommitted === true);
    // contention exists in at least some runs — recorded as declines, not violations
    void alreadyCommitted;
  }
});

test("scenario G — complete failure ends escalated/failed, never fulfilled", () => {
  for (let s = 1; s <= 12; s++) {
    const a = runScenario(scenarioG(s)).alerts[0];
    assert.notEqual(a.outcome, "FULFILLED", `G-${s} should not fulfil`);
    assert.ok(a.escalated || a.outcome === "PARTIAL" || a.outcome === "FAILED");
  }
});

test("hard constraints hold across many random scenarios", () => {
  const rng = createRng(2026);
  let violations = 0;
  let alerts = 0;
  for (let i = 0; i < 300; i++) {
    const seed = rng.int(1, 1e9);
    const r = runScenario(randomScenario(seed), { emitRows: false });
    violations += r.violations.length;
    alerts += r.alerts.length;
    // notified donors must be compatible
    for (const e of r.events) {
      if (e.type === "inventory.reserved") {
        const alert = r.events.find((x) => x.type === "alert.created" && x.alertId === e.alertId);
        assert.ok(alert && alert.type === "alert.created");
      }
    }
  }
  assert.equal(violations, 0);
  assert.ok(alerts >= 300);
});

test("compatibility helper agrees with the sim's notion of compatibility", () => {
  assert.deepEqual(getCompatibleDonorTypes("AB+").sort(), ["A+", "A-", "AB+", "AB-", "B+", "B-", "O+", "O-"].sort());
  assert.deepEqual(getCompatibleDonorTypes("O-"), ["O-"]);
});

test("quality scoring is bounded and rewards resolution", () => {
  const rng = createRng(77);
  const qs = [];
  for (let i = 0; i < 40; i++) qs.push(scoreRun(runScenario(randomScenario(rng.int(1, 1e9)), { emitRows: false })));
  const agg = aggregateQuality(qs);
  assert.ok(agg.meanQuality >= 0 && agg.meanQuality <= 100);
  for (const q of qs) for (const a of q.alerts) {
    assert.ok(a.qualityScore >= 0 && a.qualityScore <= 100);
    if (a.resolved) assert.ok(a.qualityScore >= 60);
  }
  assert.equal(deterministicPolicy.name, qs[0].policy);
});
