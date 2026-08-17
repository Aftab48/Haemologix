/**
 * End-to-end check of the donor commitment hold + release, against the ML
 * database, calling the agent functions directly (no app server needed).
 *
 *   npx tsx scripts/ml/e2eCommitment.ts
 *
 * Requires the release columns (prisma/sql/0003_donor_release.sql) on the ML DB.
 * Notifications are sandboxed for the run. The model service is optional —
 * everything asserted here is deterministic. Test rows are tagged and removed
 * at the end (alerts closed first, since the scheduler shares this DB).
 *
 * Scenario
 *   1. Alert A (O-) → local search notifies donors; D0 accepts A
 *      → D0 has an open commitment, expectedArrival is set (web-path bug fixed)
 *   2. Alert B (O-, same hospital) → local search must NOT notify D0 (on hold)
 *      → other donors are notified
 *   3. D0 tries to accept B → rejected: already_committed
 *   4. D0 releases A ("I can't make it") → row released, AlertResponse RELEASED,
 *      donor_released decision, D0 free again; A's committed count drops to 0
 *   5. Alert C → D0 IS notified again (hold lifted)
 *   6. D1 accepts C; the coordinator releases D1 → same effects, released_by coordinator
 *   7. D2 accepts A; A is closed via the sweep condition (status CLOSED) → sweep
 *      releases D2 with releasedBy=system, no donor_show label written
 *   8. History features: D0.priorNoShows counts the release; priorReleases = 1
 */
import "./loadEnv";
process.env.SANDBOX_NOTIFICATIONS = "1";
process.env.ML_MODE_DEFAULT = process.env.ML_MODE_DEFAULT ?? "off";
process.env.NEXT_PUBLIC_APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

import assert from "node:assert/strict";
import { db } from "@/db";
import { AgentType } from "@prisma/client";
import { publishEvent, type ShortageRequestEvent } from "@/lib/agents/eventBus";
import { processShortageEvent, findAndRankDonors } from "@/lib/agents/donorAgent";
import { processDonorResponse } from "@/lib/agents/coordinatorAgent";
import { COMMITTED_WHERE, findActiveCommitment, releaseDonorCommitment } from "@/lib/agents/commitment";
import { computeShortfall } from "@/lib/agents/shortfall";
import { releaseStaleCommitments } from "@/lib/agents/scheduler";

const TAG = `e2ec-${Date.now().toString(36)}`;
// Own geography (not the Kolkata centre other E2E scripts use) so leftover
// test donors from other runs never fall inside this scenario's 10 km ring.
const CENTRE = { lat: 26.9124 + (Date.now() % 7) * 0.2, lng: 75.7873 };
const off = (km: number, bearingDeg: number) => {
  const r = km / 111.32;
  const b = (bearingDeg * Math.PI) / 180;
  return { lat: CENTRE.lat + r * Math.cos(b), lng: CENTRE.lng + (r * Math.sin(b)) / Math.cos((CENTRE.lat * Math.PI) / 180) };
};

async function seed() {
  const hospital = await db.hospitalRegistration.create({
    data: {
      hospitalName: `E2E Commitment Hospital ${TAG}`,
      latitude: String(CENTRE.lat),
      longitude: String(CENTRE.lng),
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
      status: "APPROVED",
    } as never,
  });
  const donors = [];
  for (let i = 0; i < 4; i++) {
    const p = off(2 + i, i * 90);
    donors.push(
      await db.donor.create({
        data: {
          name: `E2E Donor ${i} ${TAG}`,
          email: `${TAG}-donor${i}@example.com`,
          phone: `+9100000000${String(i).padStart(2, "0")}`,
          bloodGroup: "O-",
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
  // The hospital agent creates this before publishing; mirror it.
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
  const res = await processShortageEvent(eventId);
  return { alert, res };
}

async function notifiedIds(alertId: string) {
  return new Set((await db.donorResponseHistory.findMany({ where: { requestId: alertId }, select: { donorId: true } })).map((r) => r.donorId));
}

async function main() {
  const cols = await db.$queryRawUnsafe<{ column_name: string }[]>(
    `SELECT column_name FROM information_schema.columns WHERE table_name='DonorResponseHistory' AND column_name='releasedAt'`
  );
  assert.equal(cols.length, 1, "ML DB is missing the release columns — apply prisma/sql/0003_donor_release.sql first");

  const { hospital, donors } = await seed();
  const [D0, D1, D2, D3] = donors;
  const created: string[] = [];
  const log = (s: string) => console.log(`  ✔ ${s}`);

  try {
    // 1. Alert A: local search + D0 accepts
    const A = await raiseAlert(hospital.id, "alert A");
    created.push(A.alert.id);
    assert.ok((await notifiedIds(A.alert.id)).has(D0.id), "D0 notified for A");
    const acc = await processDonorResponse({ donor_id: D0.id, request_id: A.alert.id, status: "accepted", eta_minutes: 45, response_time: 5_000 });
    assert.equal(acc.success, true, acc.error);
    const c0 = await findActiveCommitment(D0.id);
    assert.ok(c0 && c0.requestId === A.alert.id, "D0 has an open commitment on A");
    assert.ok(c0.expectedArrival, "expectedArrival was written on accept (web path)");
    log("D0 accepted A → open commitment with expectedArrival");

    // 2. Alert B: D0 must not be notified while on hold
    const B = await raiseAlert(hospital.id, "alert B");
    created.push(B.alert.id);
    const nB = await notifiedIds(B.alert.id);
    assert.equal(nB.has(D0.id), false, "D0 excluded from B's search (on hold)");
    assert.ok(nB.has(D1.id) || nB.has(D2.id), "other donors notified for B");
    const ranked = await findAndRankDonors("O-", "high", 10, CENTRE.lat, CENTRE.lng);
    assert.equal(ranked.some((d) => d.id === D0.id), false, "findAndRankDonors omits committed donor");
    log("B's search skipped D0; others notified");

    // 3. D0 tries to accept B anyway → already_committed (row left notified: there is none, but simulate via a manual notify row)
    await db.donorResponseHistory.create({ data: { donorId: D0.id, requestId: B.alert.id, notifiedAt: new Date(), status: "notified" } });
    const dbl = await processDonorResponse({ donor_id: D0.id, request_id: B.alert.id, status: "accepted", eta_minutes: 45, response_time: 5_000 });
    assert.equal(dbl.success, false);
    assert.equal(dbl.error, "already_committed");
    assert.equal(dbl.committed_request_id, A.alert.id);
    const stillNotified = await db.donorResponseHistory.findFirst({ where: { donorId: D0.id, requestId: B.alert.id } });
    assert.equal(stillNotified?.status, "notified", "B row left as notified");
    log("double accept rejected with already_committed");

    // 4. D0 releases A
    const before = await computeShortfall(A.alert);
    assert.equal(before.committedDonorIds.length, 1);
    const rel = await releaseDonorCommitment(A.alert.id, D0.id, { by: "donor", reason: "cant_make_it", note: "car broke down" });
    assert.equal(rel.success, true, rel.error);
    assert.equal(rel.released, true);
    const row = await db.donorResponseHistory.findFirst({ where: { donorId: D0.id, requestId: A.alert.id, status: "accepted" } });
    assert.ok(row?.releasedAt && row.releasedBy === "donor" && row.releaseReason === "cant_make_it" && row.releaseNote === "car broke down");
    assert.equal(row.noShow, false, "release is not a no-show");
    const ar = await db.alertResponse.findFirst({ where: { alertId: A.alert.id, donorId: D0.id } });
    assert.equal(ar?.status, "RELEASED");
    const dec = await db.agentDecision.findFirst({ where: { requestId: A.alert.id, eventType: "donor_released" } });
    assert.ok(dec, "donor_released decision row");
    assert.equal(await findActiveCommitment(D0.id), null, "D0 free again");
    const after = await computeShortfall(A.alert);
    assert.equal(after.committedDonorIds.length, 0, "A's committed count dropped");
    // idempotent
    const again = await releaseDonorCommitment(A.alert.id, D0.id, { by: "donor", reason: "cant_make_it" });
    assert.equal(again.released, false);
    log("D0 released A → RELEASED, decision row, free, idempotent");

    // 5. Alert C: D0 notified again
    const C = await raiseAlert(hospital.id, "alert C");
    created.push(C.alert.id);
    assert.ok((await notifiedIds(C.alert.id)).has(D0.id), "D0 notified for C after release");
    log("hold lifted: D0 notified for C");

    // 6. D1 accepts C, coordinator releases
    if (!(await notifiedIds(C.alert.id)).has(D1.id)) {
      await db.donorResponseHistory.create({ data: { donorId: D1.id, requestId: C.alert.id, notifiedAt: new Date(), status: "notified" } });
    }
    const acc1 = await processDonorResponse({ donor_id: D1.id, request_id: C.alert.id, status: "accepted", eta_minutes: 45, response_time: 5_000 });
    assert.equal(acc1.success, true, acc1.error);
    const rel1 = await releaseDonorCommitment(C.alert.id, D1.id, { by: "coordinator", reason: "cant_make_it", note: "called, stuck at work" });
    assert.equal(rel1.released, true);
    const row1 = await db.donorResponseHistory.findFirst({ where: { donorId: D1.id, requestId: C.alert.id, status: "accepted" } });
    assert.equal(row1?.releasedBy, "coordinator");
    log("coordinator release recorded");

    // 6b. D3 accepts C, releases with "donated recently" → lastDonationDate moves later
    //     and D3 drops out of matching on the medical interval (the safety gap this closes)
    if (!(await notifiedIds(C.alert.id)).has(D3.id)) {
      await db.donorResponseHistory.create({ data: { donorId: D3.id, requestId: C.alert.id, notifiedAt: new Date(), status: "notified" } });
    }
    const acc3 = await processDonorResponse({ donor_id: D3.id, request_id: C.alert.id, status: "accepted", eta_minutes: 45, response_time: 5_000 });
    assert.equal(acc3.success, true, acc3.error);
    const rel3 = await releaseDonorCommitment(C.alert.id, D3.id, { by: "donor", reason: "donated_recently", donatedOn: "2026-08-10", note: "gave at a camp" });
    assert.equal(rel3.released, true);
    assert.equal(rel3.lastDonationDateUpdated, true, "lastDonationDate moved later");
    const d3 = await db.donor.findUnique({ where: { id: D3.id }, select: { lastDonationDate: true } });
    assert.equal(d3?.lastDonationDate?.toISOString().slice(0, 10), "2026-08-10");
    const rankedAfterD3 = await findAndRankDonors("O-", "high", 10, CENTRE.lat, CENTRE.lng);
    assert.equal(rankedAfterD3.some((d) => d.id === D3.id), false, "D3 now inside the donation interval → not matchable");
    // an earlier self-report can never move the date back
    const rel3b = await releaseDonorCommitment(C.alert.id, D3.id, { by: "donor", reason: "donated_recently", donatedOn: "2026-01-01" });
    assert.equal(rel3b.released, false, "no open commitment left (idempotent)");
    log("donated_recently: lastDonationDate updated, D3 excluded on medical interval");

    // 7. D2 accepts A; A closed → sweep releases D2 as system, no label
    if (!(await notifiedIds(A.alert.id)).has(D2.id)) {
      await db.donorResponseHistory.create({ data: { donorId: D2.id, requestId: A.alert.id, notifiedAt: new Date(), status: "notified" } });
    }
    const acc2 = await processDonorResponse({ donor_id: D2.id, request_id: A.alert.id, status: "accepted", eta_minutes: 45, response_time: 5_000 });
    assert.equal(acc2.success, true, acc2.error);
    assert.ok(await findActiveCommitment(D2.id));
    await db.alert.update({ where: { id: A.alert.id }, data: { status: "CLOSED", outcome: "CANCELLED", resolvedAt: new Date() } });
    const sweep = await releaseStaleCommitments(new Date(), { deadlineAt: Date.now() + 30_000, batch: 200 });
    assert.ok(sweep.released >= 1, `sweep released ${sweep.released}`);
    const row2 = await db.donorResponseHistory.findFirst({ where: { donorId: D2.id, requestId: A.alert.id, status: "accepted" } });
    assert.equal(row2?.releasedBy, "system");
    assert.equal(row2?.releaseReason, "alert_closed");
    assert.equal(await findActiveCommitment(D2.id), null);
    log("sweep released D2 (system / alert_closed) after A closed");

    // 8. History features for D0: the release counts as "did not arrive" AND as a release
    const hist = await db.donorResponseHistory.findMany({ where: { donorId: D0.id } });
    const noShows = hist.filter((h) => h.noShow || h.releasedAt).length;
    const releases = hist.filter((h) => h.releasedAt && h.releasedBy !== "system").length;
    assert.equal(noShows, 1);
    assert.equal(releases, 1);
    // and the ranked-donor builder agrees
    const rankedC = await findAndRankDonors("O-", "high", 10, CENTRE.lat, CENTRE.lng);
    const rd0 = rankedC.find((d) => d.id === D0.id);
    assert.ok(rd0, "D0 rankable (no open commitment)");
    assert.equal(rd0.history.noShows, 1);
    assert.equal(rd0.history.releases, 1);
    log("history features: priorNoShows=1, priorReleases=1 for D0");

    // COMMITTED_WHERE sanity: no open commitments remain for our donors
    const openLeft = await db.donorResponseHistory.count({ where: { donorId: { in: donors.map((d) => d.id) }, ...COMMITTED_WHERE } });
    assert.equal(openLeft, 0);

    console.log("\nE2E commitment: ALL CHECKS PASSED");
  } finally {
    // Close our alerts first (shared DB with the scheduler), then remove test rows.
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
    await db.$disconnect();
  }
}

main().catch(async (e) => {
  console.error("\nE2E commitment FAILED:", e);
  await db.$disconnect();
  process.exit(1);
});
