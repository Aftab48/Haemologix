/**
 * Seed the sentinel `deterministic-baseline-v0` model row in the ML database.
 * Idempotent. Run: npx tsx scripts/ml/seedBaseline.ts
 */
import "./loadEnv";
import { db } from "@/db";
import { ensureBaselineModel, BASELINE_MODEL_VERSION } from "@/lib/ml/record";

async function main() {
  const id = await ensureBaselineModel();
  console.log(`[seedBaseline] ${BASELINE_MODEL_VERSION} → ${id}`);
  const count = await db.customModel.count();
  console.log(`[seedBaseline] CustomModel rows: ${count}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
