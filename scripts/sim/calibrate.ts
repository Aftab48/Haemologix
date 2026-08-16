/**
 * Compare the simulator's PRIORS with what real outcomes say.
 *
 *   npx tsx scripts/sim/calibrate.ts [--since 2026-08-01]
 *
 * Reads DonorResponseHistory / TransportRequest / Alert from the ML database
 * and prints assumed-vs-observed rates so lib/sim/priors.ts can be recalibrated
 * before the next dataset version. Prints "insufficient data" where n is small.
 */
import "../ml/loadEnv";
import { db } from "@/db";
import { PRIORS } from "@/lib/sim/priors";
import { runScenario } from "@/lib/sim/engine";
import { randomScenario } from "@/lib/sim/scenarios";
import { createRng, sigmoid } from "@/lib/sim/rng";

const argv = process.argv.slice(2);
const sinceIdx = argv.indexOf("--since");
const since = sinceIdx >= 0 ? new Date(argv[sinceIdx + 1]) : null;
const MIN_N = 30;

function pct(x: number) {
  return `${(x * 100).toFixed(1)}%`;
}
function line(label: string, assumed: string, observed: string, n: number) {
  console.log(`  ${label.padEnd(34)} assumed ${assumed.padStart(8)}   observed ${observed.padStart(8)}   n=${n}${n < MIN_N ? "  (insufficient data)" : ""}`);
}

async function main() {
  const where = since ? { createdAt: { gte: since } } : {};

  // --- what the sim assumes (measured on the sim itself, so priors + engine interplay is included)
  const rng = createRng(1);
  let simNotified = 0, simAccepted = 0, simArrived = 0, simNoShow = 0, simResolved = 0, simAlerts = 0;
  const simResp: number[] = [];
  for (let i = 0; i < 300; i++) {
    const r = runScenario(randomScenario(rng.int(1, 1e9)), { emitRows: false });
    for (const a of r.alerts) {
      simNotified += a.notified; simAccepted += a.accepted; simArrived += a.arrived; simNoShow += a.noShows;
      simAlerts++; if (a.outcome === "FULFILLED") simResolved++;
    }
    for (const e of r.events) if (e.type === "donor.responded") simResp.push(e.responseMinutes);
  }
  const med = (xs: number[]) => (xs.length ? xs.sort((a, b) => a - b)[Math.floor(xs.length / 2)] : NaN);

  // --- observed
  const hist = await db.donorResponseHistory.findMany({ where, select: { status: true, confirmed: true, noShow: true, responseTime: true, notifiedAt: true, respondedAt: true, arrivedAt: true, expectedArrival: true } });
  const notified = hist.length;
  const accepted = hist.filter((h) => h.status === "accepted").length;
  const arrived = hist.filter((h) => h.confirmed).length;
  const noShow = hist.filter((h) => h.noShow).length;
  const responseMins = hist.filter((h) => h.responseTime != null).map((h) => (h.responseTime as number) / 60_000);
  const etaErr = hist.filter((h) => h.arrivedAt && h.expectedArrival).map((h) => (h.arrivedAt!.getTime() - h.expectedArrival!.getTime()) / 60_000);

  const alerts = await db.alert.findMany({ where: { ...where, outcome: { not: null } }, select: { outcome: true, createdAt: true, resolvedAt: true, unitsNeeded: true, unitsCollected: true } });
  const fulfilled = alerts.filter((a) => a.outcome === "FULFILLED").length;

  const transports = await db.transportRequest.findMany({ where: { ...where, deliveredOk: { not: null } }, select: { deliveredOk: true, coldChainBreached: true, eta: true, deliveryTime: true, createdAt: true } });
  const deliveredOk = transports.filter((t) => t.deliveredOk).length;

  console.log(`\n=== Simulator priors (${PRIORS.version}) vs observed${since ? ` since ${since.toISOString()}` : ""} ===\n`);
  console.log("Donor behaviour");
  line("P(accept | notified)", pct(simNotified ? simAccepted / simNotified : 0), notified ? pct(accepted / notified) : "—", notified);
  line("P(arrive | accepted)", pct(simAccepted ? simArrived / simAccepted : 0), accepted ? pct(arrived / accepted) : "—", accepted);
  line("no-show rate | accepted", pct(simAccepted ? simNoShow / simAccepted : 0), accepted ? pct(noShow / accepted) : "—", accepted);
  line("median response minutes", `${med(simResp).toFixed(1)}`, responseMins.length ? med(responseMins).toFixed(1) : "—", responseMins.length);
  line("arrival − planned ETA (median min)", "0 (by construction)", etaErr.length ? med(etaErr).toFixed(1) : "—", etaErr.length);
  console.log("\nAlerts");
  line("P(fulfilled)", pct(simAlerts ? simResolved / simAlerts : 0), alerts.length ? pct(fulfilled / alerts.length) : "—", alerts.length);
  console.log("\nLogistics");
  line("P(delivered ok)", pct(sigmoid(2.2)), transports.length ? pct(deliveredOk / transports.length) : "—", transports.length);
  console.log("\nSuggested edits to lib/sim/priors.ts (only where n ≥ " + MIN_N + "):");
  if (notified >= MIN_N) {
    const target = accepted / notified;
    const simRate = simNotified ? simAccepted / simNotified : 0.2;
    const shift = Math.log(target / (1 - target)) - Math.log(simRate / (1 - simRate));
    console.log(`  accept.baseLogit: ${PRIORS.accept.baseLogit} → ${(PRIORS.accept.baseLogit + shift).toFixed(2)}`);
  }
  if (accepted >= MIN_N) {
    const target = arrived / accepted;
    const simRate = simAccepted ? simArrived / simAccepted : 0.7;
    const shift = Math.log(target / (1 - target)) - Math.log(simRate / (1 - simRate));
    console.log(`  show.baseLogit:   ${PRIORS.show.baseLogit} → ${(PRIORS.show.baseLogit + shift).toFixed(2)}`);
  }
  if (responseMins.length >= MIN_N) console.log(`  responseDelay.medianMin: ${PRIORS.responseDelay.medianMin} → ${med(responseMins).toFixed(1)}`);
  if (notified < MIN_N && accepted < MIN_N) console.log("  (not enough real outcomes yet — keep collecting via the shadow pilot)");
  console.log();
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
