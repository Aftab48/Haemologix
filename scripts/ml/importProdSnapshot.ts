/**
 * Copy an ANONYMISED operational snapshot from the production database into the
 * ML database, so the shadow pilot / calibration run against realistic hospitals,
 * donors, inventory and response history.
 *
 *   npx tsx scripts/ml/importProdSnapshot.ts [--dry-run]
 *
 * Source: DATABASE_URL from the repo-root .env (production, READ-ONLY — only
 *         findMany queries are issued against it).
 * Target: DATABASE_URL from ml/.env (the dedicated ML database).
 *
 * Anonymisation (the model never needs identities):
 *   donors    → name "Donor <n>", email donor<n>@example.com, phone +9100000000<n>,
 *               clerkUserId/password dropped; blood group, DOB, weight/height/BMI,
 *               gender, coordinates, last donation, availability, medical profile kept
 *   hospitals → contact/rep emails → <slug>@example.com, phones → +910000000000,
 *               document URLs dropped; names/addresses/coords/capabilities kept
 * Copied with original ids (so relations hold): HospitalRegistration, InventoryThreshold,
 * InventoryUnit, Donor(+Profile), Alert, AlertResponse, DonorResponseHistory.
 * Skipped: users, auth, documents, verifications, approvals, agent logs, feedback.
 * Idempotent: rows are upserted by id.
 */
import fs from "node:fs";
import path from "node:path";
import { PrismaClient } from "@prisma/client";

const DRY = process.argv.includes("--dry-run");

function readEnvVar(file: string, key: string): string | null {
  if (!fs.existsSync(file)) return null;
  for (const raw of fs.readFileSync(file, "utf8").split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const i = line.indexOf("=");
    if (i < 1 || line.slice(0, i).trim() !== key) continue;
    let v = line.slice(i + 1).trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
    return v;
  }
  return null;
}

const root = process.cwd();
const prodUrl = readEnvVar(path.join(root, ".env"), "DATABASE_URL");
const mlUrl = readEnvVar(path.join(root, "ml/.env"), "DATABASE_URL");
if (!prodUrl || !mlUrl) throw new Error("need DATABASE_URL in both .env (prod) and ml/.env (ML)");
if (prodUrl === mlUrl) throw new Error("prod and ML DATABASE_URL are identical — refusing");
const host = (u: string) => u.split("@")[1]?.split("/")[0];
console.log(`[import] prod (read-only): ${host(prodUrl)}\n[import] ml   (write):     ${host(mlUrl)}${DRY ? "  [DRY RUN]" : ""}`);

const prod = new PrismaClient({ datasourceUrl: prodUrl });
const ml = new PrismaClient({ datasourceUrl: mlUrl });

const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "").slice(0, 40) || "hospital";

async function main() {
  // ---- hospitals ----------------------------------------------------------
  const hospitals = await prod.hospitalRegistration.findMany({ include: { inventoryThresholds: true, inventory: true } });
  console.log(`[import] hospitals: ${hospitals.length} (approved ${hospitals.filter((h) => h.status === "APPROVED").length})`);
  for (const h of hospitals) {
    const { inventoryThresholds, inventory, ...row } = h;
    const s = slug(h.hospitalName);
    const data = {
      ...row,
      contactEmail: `${s}@example.com`,
      repEmail: `${s}-rep@example.com`,
      contactPhone: "+910000000000",
      repPhone: "+910000000000",
      contactDetails24x7: "+910000000000",
      bloodBankLicenseDoc: null,
      hospitalRegistrationCert: null,
      authorizedRepIdProof: null,
    };
    if (!DRY) await ml.hospitalRegistration.upsert({ where: { id: h.id }, update: data, create: data });
    for (const t of inventoryThresholds) if (!DRY) await ml.inventoryThreshold.upsert({ where: { id: t.id }, update: t, create: t });
    for (const u of inventory) if (!DRY) await ml.inventoryUnit.upsert({ where: { id: u.id }, update: u, create: u });
  }
  const thrCount = hospitals.reduce((s, h) => s + h.inventoryThresholds.length, 0);
  const invCount = hospitals.reduce((s, h) => s + h.inventory.length, 0);
  console.log(`[import] thresholds: ${thrCount}, inventory units: ${invCount}`);

  // ---- donors ---------------------------------------------------------------
  const donors = await prod.donor.findMany({ include: { profile: true } });
  console.log(`[import] donors: ${donors.length}`);
  let n = 0;
  for (const d of donors) {
    n++;
    const { profile, ...row } = d;
    const data = {
      ...row,
      name: `Donor ${n}`,
      email: `donor${n}@example.com`,
      phone: `+9100000000${String(n).padStart(2, "0")}`,
      address: "anonymised",
      clerkUserId: null,
      password: null,
    };
    if (!DRY) {
      await ml.donor.upsert({ where: { id: d.id }, update: data, create: data });
      if (profile) await ml.donorProfile.upsert({ where: { id: profile.id }, update: profile, create: profile });
    }
  }

  // ---- alerts + responses + history ---------------------------------------
  // Prod does not have the new outcome columns yet → select the legacy fields explicitly.
  const alerts = await prod.alert.findMany({
    select: {
      id: true, bloodType: true, latitude: true, longitude: true, urgency: true, unitsNeeded: true, searchRadius: true,
      description: true, hospitalId: true, createdAt: true, updatedAt: true, status: true, autoDetected: true, type: true,
    },
  });
  const responses = await prod.alertResponse.findMany();
  const history = await prod.donorResponseHistory.findMany({
    select: {
      id: true, donorId: true, requestId: true, notifiedAt: true, respondedAt: true, responseTime: true, status: true,
      confirmed: true, noShow: true, distance: true, score: true, createdAt: true, expectedArrival: true,
    },
  });
  console.log(`[import] alerts: ${alerts.length}, alertResponses: ${responses.length}, responseHistory: ${history.length}`);
  const hospitalIds = new Set(hospitals.map((h) => h.id));
  const donorIds = new Set(donors.map((d) => d.id));
  if (!DRY) {
    for (const a of alerts) if (hospitalIds.has(a.hospitalId)) await ml.alert.upsert({ where: { id: a.id }, update: a, create: a });
    const alertIds = new Set(alerts.map((a) => a.id));
    for (const r of responses) if (alertIds.has(r.alertId) && donorIds.has(r.donorId)) await ml.alertResponse.upsert({ where: { id: r.id }, update: r, create: r });
    for (const h of history) if (donorIds.has(h.donorId)) await ml.donorResponseHistory.upsert({ where: { id: h.id }, update: h, create: h });
  }

  // ---- summary of what the ML DB now holds --------------------------------
  if (!DRY) {
    const [h, d, a, r] = await Promise.all([ml.hospitalRegistration.count(), ml.donor.count(), ml.alert.count(), ml.donorResponseHistory.count()]);
    console.log(`[import] ML DB now: hospitals=${h} donors=${d} alerts=${a} responseHistory=${r}`);
  }
  console.log("[import] done (prod untouched; contact details anonymised)");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prod.$disconnect();
    await ml.$disconnect();
  });
