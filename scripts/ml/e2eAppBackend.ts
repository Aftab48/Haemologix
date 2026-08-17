/**
 * End-to-end check of the donor commitment hold + release *through the mobile
 * app-backend*, against the ML database. Exercises the whole chain the Kotlin
 * app uses: app-backend (JWT) → haemologix-main (/api/donor/respond,
 * /api/donor/release with the shared secret) → agents → shared DB.
 *
 * Prerequisites (nothing here touches prod):
 *   - web dev server on the ML DB:      launch config `haemologix-dev-mldb` (port 3100)
 *     with APP_BACKEND_SHARED_SECRET set in .env.local
 *   - app-backend on the ML DB:         cd ../app-backend &&
 *       DATABASE_URL=<ml> WEB_BACKEND_URL=http://localhost:3100 PORT=4000 npx tsx src/server.ts
 *     (its UPSTREAM_SHARED_SECRET must equal the web's APP_BACKEND_SHARED_SECRET)
 *
 *   npx tsx scripts/ml/e2eAppBackend.ts
 *
 * Tokens are minted by app-backend's own `signAccessToken` (run in its directory so
 * its .env supplies the JWT secret). Test rows are tagged and removed at the end.
 *
 * Scenario
 *   1. Alert A → D0..D3 notified. D0 (app) accepts A: 200, isAvailable untouched,
 *      expectedArrival set, donor-details.commitment = A, /alerts shows only A.
 *   2. Alert B → D0 not notified (web hold); D1 accepts B; D1 tries A → 409 ALREADY_COMMITTED (B).
 *   3. Toggle: committed D1 may still switch availability off/on (no ACTIVE_COMMITMENT lock).
 *   4. D0 releases A (cant_make_it): 200; row releasedBy=donor; commitment null;
 *      /alerts/A myResponse=released; /history "Released"; second release → 409 NO_ACTIVE_COMMITMENT;
 *      D1 releasing A → 409 COMMITTED_ELSEWHERE (B).
 *   5. D1 releases B (donated_recently, yesterday): lastDonationDate moved; toggle on → 409 DONATION_COOLDOWN.
 */
import "./loadEnv";
process.env.SANDBOX_NOTIFICATIONS = "1";
process.env.ML_MODE_DEFAULT = process.env.ML_MODE_DEFAULT ?? "off";
process.env.NEXT_PUBLIC_APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3100";

import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { db } from "@/db";
import { AgentType } from "@prisma/client";
import { publishEvent, type ShortageRequestEvent } from "@/lib/agents/eventBus";
import { processShortageEvent } from "@/lib/agents/donorAgent";

const APP = process.env.APP_BACKEND_URL ?? "http://localhost:4000";
const APP_BACKEND_DIR = path.resolve(process.cwd(), "..", "app-backend");
const TAG = `e2eab-${Date.now().toString(36)}`;
const CENTRE = { lat: 24.5854 + (Date.now() % 7) * 0.2, lng: 73.7125 }; // Udaipur-ish, own ring
const off = (km: number, bearingDeg: number) => {
  const r = km / 111.32;
  const b = (bearingDeg * Math.PI) / 180;
  return { lat: CENTRE.lat + r * Math.cos(b), lng: CENTRE.lng + (r * Math.sin(b)) / Math.cos((CENTRE.lat * Math.PI) / 180) };
};

function mintToken(donor: { id: string; email: string; phone: string | null }): string {
  // Runs app-backend's own signAccessToken with app-backend's .env (cwd) so the
  // secret/issuer/audience match the server under test.
  const script = fileURLToPath(new URL("./mintAppBackendToken.ts", import.meta.url));
  const tsxCli = path.join(APP_BACKEND_DIR, "node_modules", "tsx", "dist", "cli.mjs");
  return execFileSync(process.execPath, [tsxCli, script], {
    cwd: APP_BACKEND_DIR,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    env: { ...process.env, MINT_CLAIMS: JSON.stringify({ donorId: donor.id, email: donor.email, phone: donor.phone, role: "DONOR" }) },
  }).trim();
}

async function api(token: string, method: string, p: string, body?: unknown) {
  const res = await fetch(`${APP}/api/v1${p}`, {
    method,
    headers: { "content-type": "application/json", authorization: `Bearer ${token}` },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const json = (await res.json().catch(() => ({}))) as any;
  return { status: res.status, json };
}

async function seed() {
  const hospital = await db.hospitalRegistration.create({
    data: {
      hospitalName: `E2E AppBackend Hospital ${TAG}`,
      latitude: String(CENTRE.lat),
      longitude: String(CENTRE.lng),
      bloodBankLicense: "LIC-" + TAG,
      sbtcNoc: true,
      nocNumber: "NOC-" + TAG,
      nbtcCompliance: true,
      nacoCompliance: true,
      hospitalAddress: "1 Test Road",
      city: "Udaipur",
      state: "RJ",
      pincode: "313001",
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
      status: "APPROVED",
    } as never,
  });
  const donors = [];
  for (let i = 0; i < 4; i++) {
    const p = off(2 + i, i * 90);
    donors.push(
      await db.donor.create({
        data: {
          name: `E2E App Donor ${i} ${TAG}`,
          email: `${TAG}-donor${i}@example.com`,
          phone: `+9100000001${String(i).padStart(2, "0")}`,
          bloodGroup: "O-",
          dateOfBirth: new Date(Date.now() - (25 + i) * 365.25 * 86_400_000),
          gender: i % 2 === 0 ? "male" : "female",
          weight: "68",
          height: "170",
          bmi: "23.5",
          address: "Test",
          city: "Udaipur",
          state: "RJ",
          pincode: "313001",
          latitude: String(p.lat),
          longitude: String(p.lng),
          status: "APPROVED",
          isAvailable: true,
          lastDonationDate: new Date(Date.now() - 200 * 86_400_000),
        } as never,
      })
    );
  }
  return { hospital, donors };
}

async function raiseAlert(hospitalId: string, label: string) {
  const alert = await db.alert.create({
    data: {
      bloodType: "O-",
      urgency: "HIGH",
      unitsNeeded: "2",
      searchRadius: "10",
      description: `E2E ${label} ${TAG}`,
      hospitalId,
      status: "PENDING",
      latitude: String(CENTRE.lat),
      longitude: String(CENTRE.lng),
    } as never,
  });
  await db.workflowState.create({
    data: { requestId: alert.id, status: "pending", currentStep: "shortage_detected", metadata: { hospital_id: hospitalId, blood_type: "O-", urgency: "high", created_at: new Date().toISOString() } },
  });
  const payload: ShortageRequestEvent = {
    type: "shortage.request.v1",
    id: alert.id,
    hospital_id: hospitalId,
    blood_type: "O-",
    units_needed: 2,
    urgency: "high",
    search_radius_km: 10,
    location: { lat: CENTRE.lat, lng: CENTRE.lng },
    priority_score: 70,
    metadata: { reason: `E2E ${label}` },
  };
  const eventId = await publishEvent("shortage.request.v1", payload, AgentType.HOSPITAL);
  await processShortageEvent(eventId);
  return alert;
}

async function notifiedIds(alertId: string) {
  return new Set((await db.donorResponseHistory.findMany({ where: { requestId: alertId }, select: { donorId: true } })).map((r) => r.donorId));
}

async function main() {
  const health = await fetch(`${APP}/api/v1/health`).then((r) => r.status).catch(() => 0);
  assert.equal(health, 200, `app-backend not reachable at ${APP}`);

  const { hospital, donors } = await seed();
  const [D0, D1] = donors;
  const created: string[] = [];
  const t0 = mintToken(D0);
  const t1 = mintToken(D1);
  console.log(`[e2e] ${TAG} seeded; tokens minted`);

  try {
    // ---- 1. Alert A, D0 accepts through the app-backend --------------------
    const A = await raiseAlert(hospital.id, "A");
    created.push(A.id);
    const notifiedA = await notifiedIds(A.id);
    assert.ok(notifiedA.has(D0.id) && notifiedA.has(D1.id), "D0 and D1 notified for A");

    let me = await api(t0, "GET", "/donor/donor-details");
    assert.equal(me.status, 200);
    assert.equal(me.json.data.donor.commitment, null, "no commitment before accept");
    assert.equal(me.json.data.donor.isAvailable, true);

    let list = await api(t0, "GET", "/donor/alerts");
    assert.ok(list.json.data.items.some((a: any) => a.id === A.id && a.myResponse === null), "A listed, unanswered");

    const acceptA = await api(t0, "POST", "/donor/respond", { requestId: A.id, status: "accept", etaMinutes: 20 });
    assert.equal(acceptA.status, 200, JSON.stringify(acceptA.json));
    assert.equal(acceptA.json.data.status, "accepted");
    console.log("[e2e] 1. D0 accepted A via app-backend");

    const d0Row = await db.donor.findUnique({ where: { id: D0.id }, select: { isAvailable: true } });
    assert.equal(d0Row?.isAvailable, true, "accept must not flip isAvailable");
    const histA = await db.donorResponseHistory.findFirst({ where: { donorId: D0.id, requestId: A.id } });
    assert.equal(histA?.status, "accepted");
    assert.ok(histA?.expectedArrival, "expectedArrival written on the app path");

    me = await api(t0, "GET", "/donor/donor-details");
    assert.equal(me.json.data.donor.commitment?.alertId, A.id, "commitment surfaced");
    assert.equal(me.json.data.donor.commitment?.hospitalName, hospital.hospitalName);
    assert.ok(me.json.data.donor.commitment?.expectedArrival);

    // ---- 2. Alert B: D0 on hold; D1 accepts B; D1 tries A → 409 ----------
    const B = await raiseAlert(hospital.id, "B");
    created.push(B.id);
    const notifiedB = await notifiedIds(B.id);
    assert.ok(!notifiedB.has(D0.id), "committed D0 must not be notified for B");
    assert.ok(notifiedB.has(D1.id), "D1 notified for B");

    list = await api(t0, "GET", "/donor/alerts");
    assert.deepEqual(list.json.data.items.map((a: any) => a.id), [A.id], "committed donor sees only A");
    assert.equal(list.json.data.items[0].myResponse, "accepted");

    const acceptB = await api(t1, "POST", "/donor/respond", { requestId: B.id, status: "accept", etaMinutes: 25 });
    assert.equal(acceptB.status, 200, JSON.stringify(acceptB.json));
    const d1TriesA = await api(t1, "POST", "/donor/respond", { requestId: A.id, status: "accept", etaMinutes: 25 });
    assert.equal(d1TriesA.status, 409, JSON.stringify(d1TriesA.json));
    assert.equal(d1TriesA.json.error.details?.reason, "ALREADY_COMMITTED");
    assert.equal(d1TriesA.json.error.details?.alertId, B.id);
    console.log("[e2e] 2. hold: D0 hidden from B; D1 second accept → 409 ALREADY_COMMITTED");

    // ---- 3. Toggle is the donor's own while committed -----------------------
    let toggle = await api(t1, "PATCH", "/donor/donor-details", { isAvailable: false });
    assert.equal(toggle.status, 200, JSON.stringify(toggle.json));
    toggle = await api(t1, "PATCH", "/donor/donor-details", { isAvailable: true });
    assert.equal(toggle.status, 200, "no ACTIVE_COMMITMENT lock any more");
    assert.equal(toggle.json.data.donor.commitment?.alertId, B.id);
    console.log("[e2e] 3. committed donor can still switch availability off/on");

    // ---- 4. D0 releases A ---------------------------------------------------
    const rel = await api(t0, "POST", `/donor/alerts/${A.id}/release`, { reason: "cant_make_it" });
    assert.equal(rel.status, 200, JSON.stringify(rel.json));
    assert.equal(rel.json.data.released, true);
    assert.ok(typeof rel.json.data.message === "string" && rel.json.data.message.length > 0);
    const relRow = await db.donorResponseHistory.findFirst({ where: { donorId: D0.id, requestId: A.id } });
    assert.equal(relRow?.releasedBy, "donor");
    assert.equal(relRow?.releaseReason, "cant_make_it");
    assert.equal(relRow?.noShow, false);
    const ar = await db.alertResponse.findUnique({ where: { alertId_donorId: { alertId: A.id, donorId: D0.id } } });
    assert.equal(ar?.status, "RELEASED");
    const decision = await db.agentDecision.findFirst({ where: { requestId: A.id, eventType: "donor_released" } });
    assert.ok(decision, "donor_released decision logged by the web app");

    me = await api(t0, "GET", "/donor/donor-details");
    assert.equal(me.json.data.donor.commitment, null, "commitment cleared after release");
    const detailA = await api(t0, "GET", `/donor/alerts/${A.id}`);
    assert.equal(detailA.json.data.myResponse, "released");
    assert.equal(detailA.json.data.releasedBy, "donor");
    assert.equal(detailA.json.data.releaseReason, "cant_make_it");
    const hist = await api(t0, "GET", "/donor/history");
    const histItem = hist.json.data.items.find((i: any) => i.requestId === A.id);
    assert.equal(histItem?.status, "Released");
    assert.equal(histItem?.releaseReason, "cant_make_it");
    const again = await api(t0, "POST", `/donor/alerts/${A.id}/release`, { reason: "unwell" });
    assert.equal(again.status, 409);
    assert.equal(again.json.error.details?.reason, "NO_ACTIVE_COMMITMENT");
    const elsewhere = await api(t1, "POST", `/donor/alerts/${A.id}/release`, { reason: "unwell" });
    assert.equal(elsewhere.status, 409);
    assert.equal(elsewhere.json.error.details?.reason, "COMMITTED_ELSEWHERE");
    assert.equal(elsewhere.json.error.details?.alertId, B.id);
    console.log("[e2e] 4. D0 released A: row/AlertResponse/decision, myResponse=released, history Released, repeat → 409s");

    // ---- 5. D1 releases B as donated_recently → cooldown lock --------------
    const yesterday = new Date(Date.now() - 86_400_000).toISOString().slice(0, 10);
    const relB = await api(t1, "POST", `/donor/alerts/${B.id}/release`, { reason: "donated_recently", donatedOn: yesterday });
    assert.equal(relB.status, 200, JSON.stringify(relB.json));
    assert.equal(relB.json.data.lastDonationDateUpdated, true);
    const d1 = await db.donor.findUnique({ where: { id: D1.id }, select: { lastDonationDate: true, hasDonatedBefore: true } });
    assert.ok(d1?.lastDonationDate && Date.now() - d1.lastDonationDate.getTime() < 3 * 86_400_000, "lastDonationDate moved to yesterday");
    const cooldown = await api(t1, "PATCH", "/donor/donor-details", { isAvailable: true });
    assert.equal(cooldown.status, 409, JSON.stringify(cooldown.json));
    assert.equal(cooldown.json.error.details?.reason, "DONATION_COOLDOWN");
    console.log("[e2e] 5. donated_recently moved lastDonationDate; toggle on → 409 DONATION_COOLDOWN");

    console.log("\n[e2e] ALL PASSED");
  } finally {
    await db.alert.updateMany({ where: { id: { in: created }, outcome: null }, data: { status: "CLOSED", outcome: "CANCELLED", resolvedAt: new Date() } });
    await db.agentDecision.deleteMany({ where: { requestId: { in: created } } });
    await db.modelPrediction.deleteMany({ where: { requestId: { in: created } } });
    await db.workflowState.deleteMany({ where: { requestId: { in: created } } });
    await db.donorResponseHistory.deleteMany({ where: { donorId: { in: donors.map((d) => d.id) } } });
    await db.alertResponse.deleteMany({ where: { alertId: { in: created } } });
    await db.agentEvent.deleteMany({ where: { payload: { path: ["id"], string_contains: TAG } } }).catch(() => undefined);
    await db.alert.deleteMany({ where: { id: { in: created } } });
    await db.donor.deleteMany({ where: { id: { in: donors.map((d) => d.id) } } });
    await db.hospitalRegistration.deleteMany({ where: { id: hospital.id } });
    console.log("[e2e] cleaned up");
  }
}

main()
  .catch((e) => {
    console.error("[e2e] FAILED:", e);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
