/**
 * Activate an APPROVED model version: flips ml/checkpoints/active, marks the
 * CustomModel row isActive (previous active → retired) and asks the running
 * model service to reload. Rollback = activate the previous version.
 *
 *   npm run ml:activate -- --version haemologix-model-1.1
 *   npm run ml:activate -- --version haemologix-model-1.0   # rollback
 */
import "./loadEnv";
import { db } from "@/db";
import { getMlConnection } from "@/lib/ml/flags";
import { arg, flag, readActivePointer, readCard, upsertCustomModel, writeActivePointer, writeCard } from "./registry";

async function main() {
  const version = arg("version");
  if (!version) throw new Error("--version is required");
  const card = readCard(version);
  if (card.status !== "approved" && card.status !== "active" && !flag("force")) {
    console.error(`[activate] ${version} is '${card.status}', not 'approved'. Run ml:approve first (or --force).`);
    process.exit(2);
  }
  const previous = readActivePointer();
  writeActivePointer(version);
  card.status = "active";
  card.activatedAt = new Date().toISOString();
  writeCard(version, card);

  const now = new Date();
  await db.customModel.updateMany({ where: { isActive: true, version: { not: version } }, data: { isActive: false, status: "retired" } });
  await upsertCustomModel(card, "active", { isActive: true, deployedAt: now });
  if (previous && previous !== version) {
    try {
      const prevCard = readCard(previous);
      prevCard.status = "retired";
      writeCard(previous, prevCard);
    } catch {
      /* previous card missing — fine */
    }
  }
  console.log(`[activate] active pointer: ${previous ?? "(none)"} → ${version}`);

  // Ask the running service to reload (best effort)
  const conn = getMlConnection();
  try {
    const res = await fetch(`${conn.apiUrl}/reload`, {
      method: "POST",
      headers: conn.apiSecret ? { "X-ML-Secret": conn.apiSecret } : {},
      signal: AbortSignal.timeout(5000),
    });
    const j = await res.json();
    console.log(`[activate] model service reload → ${res.status} ${JSON.stringify(j)}`);
  } catch (e) {
    console.log(`[activate] model service not reachable at ${conn.apiUrl} (${String(e)}) — it will pick up the new version on restart.`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
