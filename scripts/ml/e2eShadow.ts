/**
 * End-to-end shadow-pilot check against the ML database + a running app + model service.
 *
 *   # terminal 1 (model):  cd ml && python serve.py
 *   # terminal 2 (app):    . .\scripts\ml\Use-MlEnv.ps1; $env:SANDBOX_NOTIFICATIONS="1";
 *                          $env:NEXT_PUBLIC_APP_URL="http://localhost:3100"; $env:NEXT_PUBLIC_BASE_URL="http://localhost:3100";
 *                          npx next dev -p 3100
 *   # terminal 3:          npx tsx scripts/ml/e2eShadow.ts --app http://localhost:3100 [--expect-model-down]
 *
 * Steps: seed hospitals/donors/inventory → POST /api/agents/hospital (alert)
 * → the chain notifies donors → two donors respond via /api/donor/respond
 * → hospital confirms one arrival → scheduler tick → assertions on
 * ModelPrediction / outcomes / AgentDecision.ml_mode.
 */
import "./loadEnv";
import assert from "node:assert/strict";
import { db } from "@/db";

const argv = process.argv.slice(2);
const get = (k: string) => {
  const i = argv.indexOf(`--${k}`);
  return i >= 0 ? argv[i + 1] : undefined;
};
const APP = (get("app") ?? "http://localhost:3100").replace(/\/+$/, "");
const EXPECT_DOWN = argv.includes("--expect-model-down");
const EXPECT_AUTHORITY = argv.includes("--expect-authority");
const TAG = `e2e-${Date.now().toString(36)}`;

const CENTRE = { lat: 22.5726, lng: 88.3639 };
const off = (km: number, bearingDeg: number) => {
  const r = km / 111.32;
  const b = (bearingDeg * Math.PI) / 180;
  return { lat: CENTRE.lat + r * Math.cos(b), lng: CENTRE.lng + (r * Math.sin(b)) / Math.cos((CENTRE.lat * Math.PI) / 180) };
};

async function post(path: string, body: unknown) {
  const res = await fetch(`${APP}${path}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const text = await res.text();
  let json: unknown = null;
  try {
    json = JSON.parse(text);
  } catch {
    /* non-json */
  }
  return { status: res.status, json: json as Record<string, unknown> | null, text };
}

async function seed() {
  const hospitalBase = {
    bloodBankLicense: "LIC-" + TAG,
    sbtcNoc: true,
    nocNumber: "NOC-" + TAG,
    nbtcCompliance: true,
    nacoCompliance: true,
    hospitalAddress: "1 Test Road",
    city: "Kolkata",
    state: "WB",
    pincode: "700001",
    operationalStatus: "operational",
    coldStorageFacility: true,
    temperatureStandards: true,
    testingLabsOnsite: true,
    affiliatedLabs: "n/a",
    qualifiedMedicalOfficer: true,
    certifiedTechnicians: "3",
    contactEmail: `${TAG}@example.com`,
    contactPhone: "+910000000000",
    inventoryReporting: true,
    realTimeUpdates: true,
    emergencyResponseCommitment: true,
    responseTimeMinutes: "30",
    dataHandlingCommitment: true,
    confidentialityAgreement: true,
    contactDetails24x7: "+910000000000",
    mouAcceptance: true,
    repName: "E2E Rep",
    repDesignation: "Admin",
    repIdNumber: "ID-" + TAG,
    repEmail: `${TAG}-rep@example.com`,
    repPhone: "+910000000000",
    termsAccepted: true,
    dataProcessingConsent: true,
    networkParticipationAgreement: true,
    status: "APPROVED" as const,
  };
  const h1 = await db.hospitalRegistration.create({ data: { ...hospitalBase, hospitalName: `E2E Requesting Hospital ${TAG}`, latitude: String(CENTRE.lat), longitude: String(CENTRE.lng) } });
  const p2 = off(12, 90);
  const h2 = await db.hospitalRegistration.create({ data: { ...hospitalBase, hospitalName: `E2E Blood Bank ${TAG}`, latitude: String(p2.lat), longitude: String(p2.lng), contactEmail: `${TAG}-bb@example.com`, repEmail: `${TAG}-bbrep@example.com` } });
  await db.inventoryThreshold.create({ data: { hospitalId: h1.id, bloodType: "O-", minimumRequired: 6, optimalLevel: 12 } });
  await db.inventoryUnit.create({ data: { hospitalId: h2.id, bloodType: "O-", units: 8, expiryDate: new Date(Date.now() + 25 * 86_400_000) } });
  await db.inventoryUnit.create({ data: { hospitalId: h2.id, bloodType: "O+", units: 5, expiryDate: new Date(Date.now() + 25 * 86_400_000) } });

  const donors = [];
  const bloodGroups = ["O-", "O-", "O-", "O-", "O-", "O-", "O+", "A+"]; // O+ / A+ are incompatible with O- and must NOT be notified
  for (let i = 0; i < bloodGroups.length; i++) {
    const p = off(2 + i * 1.5, i * 45);
    const d = await db.donor.create({
      data: {
        name: `E2E Donor ${i} ${TAG}`,
        email: `${TAG}-donor${i}@example.com`,
        phone: `+9100000000${String(i).padStart(2, "0")}`,
        bloodGroup: bloodGroups[i],
        dateOfBirth: new Date(Date.now() - (25 + i) * 365.25 * 86_400_000),
        gender: i % 2 === 0 ? "male" : "female",
        weight: "68",
        height: "170",
        bmi: "23.5",
        address: "Test",
        city: "Kolkata",
        state: "WB",
        pincode: "700001",
        latitude: String(p.lat),
        longitude: String(p.lng),
        status: "APPROVED",
        isAvailable: true,
        lastDonationDate: new Date(Date.now() - 200 * 86_400_000),
        profile: {
          create: {
            hemoglobin: "14.2",
            hivTest: "NEGATIVE",
            hepatitisBTest: "NEGATIVE",
            hepatitisCTest: "NEGATIVE",
            syphilisTest: "NEGATIVE",
            malariaTest: "NEGATIVE",
            recentVaccinations: false,
            medications: "none",
          },
        },
      } as never,
    });
    donors.push(d);
  }
  return { h1, h2, donors };
}

async function main() {
  console.log(`[e2e] app=${APP} tag=${TAG} expectModelDown=${EXPECT_DOWN}`);
  // 0. app reachable?
  const ping = await fetch(`${APP}/api/agents/hospital`).catch(() => null);
  if (!ping || !ping.ok) throw new Error(`app not reachable at ${APP} — start it first (see header of this script)`);

  const { h1, donors } = await seed();
  console.log(`[e2e] seeded hospital ${h1.id}, ${donors.length} donors`);

  // 1. alert
  const alert = await db.alert.create({
    data: { bloodType: "O-", urgency: "CRITICAL", unitsNeeded: "2", searchRadius: "20", description: `e2e ${TAG}`, hospitalId: h1.id, latitude: String(CENTRE.lat), longitude: String(CENTRE.lng) },
  });
  console.log(`[e2e] alert ${alert.id}`);
  const r1 = await post("/api/agents/hospital", { alertId: alert.id });
  assert.equal(r1.status, 200, `hospital agent: ${r1.text.slice(0, 300)}`);

  // 2. donors were notified (compatible only)
  const notified = await db.donorResponseHistory.findMany({ where: { requestId: alert.id }, include: { donor: { select: { bloodGroup: true, id: true } } } });
  assert.ok(notified.length >= 3, `expected notifications, got ${notified.length}`);
  assert.ok(notified.every((n) => n.donor.bloodGroup === "O-"), "only O- donors may be notified for an O- alert");
  console.log(`[e2e] notified ${notified.length} donors (all O-)`);

  // 3. decisions carry ml_mode + model_version / fallback_reason
  const decisions = await db.agentDecision.findMany({ where: { requestId: alert.id } });
  const withMeta = decisions.filter((d) => typeof (d.decision as Record<string, unknown>).ml_mode === "string");
  assert.ok(withMeta.length >= 2, "hospital + donor decisions should carry ml_mode");
  const donorDecision = decisions.find((d) => d.eventType === "donor_matching");
  assert.ok(donorDecision, "donor_matching decision exists");
  const dd = donorDecision!.decision as Record<string, unknown>;
  console.log(`[e2e] donor_matching: mode=${dd.ml_mode} model=${dd.model_version ?? "-"} fallback=${dd.fallback_reason ?? "-"} source=${dd.decision_source}`);
  console.log(`[e2e] reasoning: ${String(dd.reasoning).slice(0, 220)}…`);
  if (EXPECT_DOWN) {
    assert.ok(dd.fallback_reason, "model down → fallback_reason must be recorded");
    assert.equal(dd.model_version ?? null, null);
  } else if (EXPECT_AUTHORITY) {
    assert.equal(dd.ml_mode, "authority");
    assert.equal(dd.policy_applied, true, "authority → policy decision applied");
    assert.equal(dd.decision_source, "model");
    assert.ok(typeof dd.expected_arrivals === "number", "expected arrivals computed from P(accept)·P(show)");
  } else {
    assert.equal(dd.fallback_reason ?? null, null, `unexpected fallback: ${dd.fallback_reason}`);
    assert.ok(typeof dd.model_version === "string", "model_version recorded");
    const preds = await db.modelPrediction.findMany({ where: { requestId: alert.id } });
    const byTask: Record<string, number> = {};
    for (const p of preds) byTask[p.taskType] = (byTask[p.taskType] ?? 0) + 1;
    console.log(`[e2e] ModelPrediction rows:`, byTask);
    assert.ok((byTask.donor_accept ?? 0) >= 3, "donor_accept predictions logged");
    assert.ok((byTask.urgency_priority ?? 0) >= 1, "urgency prediction logged");
    assert.ok((byTask.alert_resolves_in_window ?? 0) >= 1, "window prediction logged");
    assert.ok(preds.every((p) => p.mode === "shadow" || p.mode === "advise" || p.mode === "authority"));
  }

  // 4. two donors respond (accept, decline) through the real endpoint
  const [n1, n2] = notified;
  const t1 = `${n1.donorId}-${alert.id}-${Date.now()}`;
  const acc = await fetch(`${APP}/api/donor/respond?token=${encodeURIComponent(t1)}&status=accept`);
  assert.equal(acc.status, 200, `accept: ${await acc.text()}`);
  const t2 = `${n2.donorId}-${alert.id}-${Date.now()}`;
  const dec = await fetch(`${APP}/api/donor/respond?token=${encodeURIComponent(t2)}&status=decline`);
  assert.equal(dec.status, 200, `decline: ${await dec.text()}`);
  console.log(`[e2e] donor ${n1.donorId.slice(0, 8)} accepted, ${n2.donorId.slice(0, 8)} declined`);

  if (!EXPECT_DOWN) {
    const accOutcome = await db.modelPrediction.findFirst({ where: { requestId: alert.id, taskType: "donor_accept", subjectId: n1.donorId } });
    assert.ok(accOutcome?.actualOutcome, "donor_accept outcome back-filled on accept");
    const decOutcome = await db.modelPrediction.findFirst({ where: { requestId: alert.id, taskType: "donor_accept", subjectId: n2.donorId } });
    assert.ok(decOutcome?.actualOutcome, "donor_accept outcome back-filled on decline");
    assert.equal((decOutcome!.actualOutcome as { value: number }).value, 0);
    console.log(`[e2e] donor_accept outcomes recorded (accept error=${accOutcome!.error?.toFixed(3)}, decline error=${decOutcome!.error?.toFixed(3)})`);
  }

  // 5. progress check (escalation policy) — nothing should escalate yet
  const prog = await post("/api/agents/coordinator", { action: "check_progress", request_id: alert.id });
  assert.equal(prog.status, 200, prog.text);
  console.log(`[e2e] progress: shortfall=${prog.json?.shortfall} expectedArrivals=${prog.json?.expectedArrivals} escalated=${prog.json?.escalated}`);

  // 6. hospital confirms arrival → units-based fulfilment (2 needed → still open after 1)
  const arr = await post("/api/agents/coordinator", { action: "confirm_arrival", request_id: alert.id, donor_id: n1.donorId });
  assert.equal(arr.status, 200, arr.text);
  assert.equal(arr.json?.fulfilled, false, "2 units needed: first arrival must not fulfil");
  const a2 = await db.alert.findUnique({ where: { id: alert.id } });
  assert.equal(a2?.unitsCollected, 1);
  assert.equal(a2?.status, "MATCHED");
  console.log(`[e2e] arrival confirmed: ${a2?.unitsCollected}/2 units, status ${a2?.status}`);
  if (!EXPECT_DOWN) {
    const show = await db.modelPrediction.findFirst({ where: { requestId: alert.id, taskType: "donor_show", subjectId: n1.donorId } });
    assert.ok(show?.actualOutcome, "donor_show outcome back-filled on arrival");
  }

  // 7. close via the hospital route → typed outcome
  const close = await post(`/api/alerts/${alert.id}/close`, { source: "donors", donors: [n1.donorId], unitsCollected: 2 });
  assert.equal(close.status, 200, close.text);
  const a3 = await db.alert.findUnique({ where: { id: alert.id } });
  assert.equal(a3?.outcome, "FULFILLED");
  assert.equal(a3?.fulfilledBy, "donors");
  assert.ok(a3?.resolvedAt, "resolvedAt set");
  console.log(`[e2e] closed: outcome=${a3?.outcome} fulfilledBy=${a3?.fulfilledBy} units=${a3?.unitsCollected}`);

  // 8. scheduler tick runs cleanly
  const tick = await fetch(`${APP}/api/cron/agent-tick`, { headers: { "x-cron-secret": process.env.CRON_SECRET ?? "" } });
  const tickText = await tick.text();
  assert.equal(tick.status, 200, tickText);
  const tj = JSON.parse(tickText) as Record<string, unknown>;
  assert.equal(tj.success, true, JSON.stringify(tj));
  console.log(`[e2e] scheduler tick ok:`, JSON.stringify(tj));

  // 9. report + predictions feed
  const rep = await fetch(`${APP}/api/ml/report`);
  assert.equal(rep.status, 200);
  const feed = await fetch(`${APP}/api/agents/predictions?requestId=${alert.id}`);
  assert.equal(feed.status, 200);
  const fj = (await feed.json()) as { count: number; predictions: unknown[] };
  console.log(`[e2e] predictions feed: ${fj.count} decisions, ${fj.predictions.length} predictions`);

  console.log(`\n[e2e] ✓ PASSED (${EXPECT_DOWN ? "model down → deterministic fallback" : EXPECT_AUTHORITY ? "authority → policy decided + outcomes" : "model up → shadow logging + outcomes"})`);
}

main()
  .catch((e) => {
    console.error("[e2e] ✗ FAILED:", e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
