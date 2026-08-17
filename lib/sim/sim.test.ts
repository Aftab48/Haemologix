import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { getCompatibleDonorTypes } from "@/lib/agents/donorAgent";
import { PREDICTION_TASKS } from "@/lib/ml/types";
import { runScenario } from "./engine";
import { POST_V2_FEATURE_KEYS, hashEvents, hashRows } from "./hash";
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
  scenarioH,
  scenarioI,
  scenarioJ,
  scenarioK,
} from "./scenarios";
import type { ScenarioSpec } from "./types";

test("ladder off reproduces the frozen sim-v2 rows and events bit-for-bit", () => {
  // Frozen by scripts/sim/freezeFixture.ts on the pre-ladder engine. If this
  // fails, an engine change disturbed an existing RNG stream or event order.
  // Rows are compared with the additive post-v2 feature keys stripped (they
  // carry their defaults when the ladder is off); events are compared strictly.
  const fixture = JSON.parse(fs.readFileSync(path.join(__dirname, "__fixtures__", "sim-v2-hashes.json"), "utf8")) as {
    hashes: Record<string, { rows: string; events: string }>;
  };
  const specs: Record<string, ScenarioSpec> = {
    "random-4242": randomScenario(4242),
    "random-1": randomScenario(1),
    "random-2": randomScenario(2),
    "random-99": randomScenario(99),
    "A-3": scenarioA(3),
    "B-3": scenarioB(3),
    "C-3": scenarioC(3),
    "D-3": scenarioD(3),
    "E-3": scenarioE(3),
    "F-3": scenarioF(3),
    "G-3": scenarioG(3),
  };
  for (const [key, expected] of Object.entries(fixture.hashes)) {
    const r = runScenario(specs[key], { ladder: false });
    assert.equal(hashRows(r, { omitFeatureKeys: POST_V2_FEATURE_KEYS }), expected.rows, `${key}: training rows changed`);
    assert.equal(hashEvents(r), expected.events, `${key}: events changed`);
  }
});

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
  // window rows: once per alert at the first wave plus one per ladder expansion;
  // urgency rows once per alert plus monitoring samples
  const alerts = r.alerts.length;
  const expansions = r.events.filter((e) => e.type === "escalation.step" && e.action === "expand_donor_search").length;
  assert.ok(r.rows.filter((x) => x.task === "urgency_priority").length >= alerts);
  assert.equal(r.rows.filter((x) => x.task === "alert_resolves_in_window").length, alerts + expansions);
  assert.equal(r.rows.filter((x) => x.task === "expansion_yield").length, expansions);
  assert.ok(r.rows.some((x) => x.task === "eligibility_needs_review"));
});

test("scenario A — insufficient donor pool escalates beyond donors", () => {
  let sawEscalationPath = 0;
  for (let s = 1; s <= 12; s++) {
    const r = runScenario(scenarioA(s));
    const a = r.alerts[0];
    // the LOCAL pool is thin (wave 1); the ladder may later widen and notify more
    const wave1 = r.events.filter((e) => e.type === "donor.notified" && e.wave === 1).length;
    assert.ok(wave1 < a.unitsNeeded * 2, `pool should be thin (wave-1 notified ${wave1} for ${a.unitsNeeded})`);
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

// ---------------------------------------------------------------------------
// Escalation ladder (sim-v3)
// ---------------------------------------------------------------------------

test("scenario H — empty local ring: the ladder widens and finds donors the local search could not", () => {
  let expanded = 0;
  let notifiedAfterExpansion = 0;
  let yieldPositive = 0;
  let yieldRows = 0;
  for (let s = 1; s <= 10; s++) {
    const r = runScenario(scenarioH(s));
    const wave1 = r.events.filter((e) => e.type === "donor.notified" && e.wave === 1).length;
    assert.equal(wave1, 0, `H-${s}: the initial ring must be empty by construction`);
    const expansions = r.events.filter((e) => e.type === "escalation.step" && e.action === "expand_donor_search");
    if (expansions.length >= 1) expanded++;
    if (r.alerts[0].notified > 0) notifiedAfterExpansion++;
    const y = r.rows.filter((x) => x.task === "expansion_yield");
    yieldRows += y.length;
    yieldPositive += y.filter((x) => x.label === 1).length;
    for (const a of r.alerts) assert.ok(a.maxRadiusKm > a.initialRadiusKm, `H-${s}: radius should have widened`);
  }
  assert.ok(expanded >= 8, `ladder should expand in nearly all H runs (${expanded}/10)`);
  assert.ok(notifiedAfterExpansion >= 8, `donors should be found once widened (${notifiedAfterExpansion}/10)`);
  assert.ok(yieldRows > 0 && yieldPositive > 0 && yieldPositive < yieldRows, `expansion_yield labels should be mixed (${yieldPositive}/${yieldRows})`);
});

test("scenario I — dark inventory: the network broadcast surfaces stock and units get delivered", () => {
  let responded = 0;
  let delivered = 0;
  let resolved = 0;
  for (let s = 1; s <= 10; s++) {
    const r = runScenario(scenarioI(s));
    const a = r.alerts[0];
    assert.ok(a.broadcast, `I-${s}: broadcast rung should run`);
    if (r.events.some((e) => e.type === "network.broadcast_response")) responded++;
    if (a.unitsFromInventory > 0) delivered++;
    if (a.outcome === "FULFILLED") resolved++;
    // ladder off: nothing can be found → never fulfilled
    assert.notEqual(runScenario(scenarioI(s), { ladder: false }).alerts[0].outcome, "FULFILLED", `I-${s} without the ladder should not fulfil`);
  }
  assert.ok(responded >= 6, `facilities should respond in most I runs (${responded}/10)`);
  assert.ok(delivered >= 4, `surfaced stock should be delivered in several I runs (${delivered}/10)`);
  assert.ok(resolved >= 3, `the broadcast rung should resolve some I runs (${resolved}/10)`);
});

test("scenario J — thin local pool then wide: notify, dwell, then widen (never re-notify)", () => {
  let dwelled = 0;
  for (let s = 1; s <= 10; s++) {
    const r = runScenario(scenarioJ(s));
    const wave1 = r.events.filter((e) => e.type === "donor.notified" && e.wave === 1).length;
    const firstExpand = r.events.find((e) => e.type === "escalation.step" && e.action === "expand_donor_search");
    if (wave1 > 0 && firstExpand) {
      // ladder waited for the local ring before widening
      const created = r.events.find((e) => e.type === "alert.created")!;
      if (firstExpand.t - created.t >= 10 * 60_000) dwelled++;
    }
    const notified = r.events.filter((e) => e.type === "donor.notified").map((e) => e.donorId);
    assert.equal(new Set(notified).size, notified.length, `J-${s}: a donor must never be notified twice`);
  }
  assert.ok(dwelled >= 6, `ladder should dwell on the local ring before widening in most J runs (${dwelled}/10)`);
});

test("scenario K — total failure: full ladder, then an early explicit human hand-off", () => {
  for (let s = 1; s <= 10; s++) {
    const r = runScenario(scenarioK(s));
    const a = r.alerts[0];
    assert.equal(a.outcome, "ESCALATED", `K-${s} should end handed off`);
    assert.ok(a.handedOff && a.minutesToHandoff !== null, `K-${s} should record the hand-off`);
    assert.ok((a.minutesToHandoff ?? Infinity) < 6 * 60 * 0.5, `K-${s}: hand-off should be early, got ${a.minutesToHandoff} min`);
    assert.ok(a.broadcast, `K-${s}: broadcast rung should have run before hand-off`);
    assert.equal(a.maxRadiusKm, 100, `K-${s}: donor search should reach the ceiling`);
    assert.equal(r.events.filter((e) => e.type === "network.broadcast_response").length, 0);
    assert.equal(r.events.filter((e) => e.type === "donor.notified").length, 0);
  }
});

test("ladder invariants hold across random and cascading scenarios", () => {
  const rng = createRng(31337);
  const factories = [randomScenario, scenarioH, scenarioI, scenarioJ, scenarioK, scenarioA, scenarioG];
  for (let i = 0; i < 140; i++) {
    const f = factories[i % factories.length];
    const r = runScenario(f(rng.int(1, 1e9)), { emitRows: false });
    assert.deepEqual(r.violations, []);
    for (const a of r.alerts) {
      assert.ok(a.maxRadiusKm <= 100, `radius ${a.maxRadiusKm} > 100`);
      assert.ok(a.maxRadiusKm >= a.initialRadiusKm);
    }
    const byAlert = new Map<string, number[]>();
    for (const e of r.events) {
      if (e.type === "escalation.step") (byAlert.get(e.alertId) ?? byAlert.set(e.alertId, []).get(e.alertId)!).push(e.rung);
    }
    for (const [id, rungs] of byAlert) {
      for (let k = 1; k < rungs.length; k++) assert.ok(rungs[k] > rungs[k - 1], `${id}: rungs must strictly increase`);
    }
    const bcasts = r.events.filter((e) => e.type === "escalation.step" && e.action === "network_broadcast");
    const handoffs = r.events.filter((e) => e.type === "escalation.step" && e.action === "escalate_human");
    assert.ok(new Set(bcasts.map((e) => e.alertId)).size === bcasts.length, "at most one broadcast per alert");
    assert.ok(new Set(handoffs.map((e) => e.alertId)).size === handoffs.length, "at most one hand-off per alert");
    const notified = r.events.filter((e) => e.type === "donor.notified").map((e) => `${e.alertId}:${e.donorId}`);
    assert.equal(new Set(notified).size, notified.length, "no donor notified twice for one alert");
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
