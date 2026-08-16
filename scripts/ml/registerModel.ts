/**
 * Register a trained model version in the CustomModel table (status: evaluated).
 *
 *   npm run ml:register -- --version haemologix-model-1.0
 */
import "./loadEnv";
import { db } from "@/db";
import { arg, printCard, readCard, upsertCustomModel, writeCard } from "./registry";

async function main() {
  const version = arg("version");
  if (!version) throw new Error("--version is required");
  const card = readCard(version);
  printCard(card);
  const status = card.status === "active" ? "active" : card.status === "approved" ? "approved" : "evaluated";
  if (!card.status || card.status === "training") {
    card.status = "evaluated";
    writeCard(version, card);
  }
  const row = await upsertCustomModel(card, status);
  console.log(`\n[register] ${version} → CustomModel ${row.id} (status ${row.status})`);
  if (card.allBeatBaseline === false) {
    console.log(`[register] ⚠ tasks not beating the rules baseline: ${(card.tasksNotBeatingBaseline ?? []).join(", ")} — approval will be refused.`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
