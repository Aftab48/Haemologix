/**
 * Human approval gate (plan §11/§14): a model version may only be activated
 * after a person has reviewed the model card AND the gate conditions hold.
 *
 *   npm run ml:approve -- --version haemologix-model-1.1 --by "Aftab" --confirm
 *
 * Gate (all must hold, or pass --force with a written --reason):
 *   1. every trained task beats the rules baseline on its primary metric
 *   2. no task regresses vs the currently active version (if any)
 *   3. --confirm is present (explicit human action; there is no auto-approve path)
 */
import "./loadEnv";
import { db } from "@/db";
import { arg, flag, printCard, readActivePointer, readCard, upsertCustomModel, writeCard } from "./registry";

async function main() {
  const version = arg("version");
  const by = arg("by");
  const reason = arg("reason");
  if (!version) throw new Error("--version is required");
  if (!by) throw new Error("--by <name/email> is required (who approves)");
  const card = readCard(version);
  printCard(card);

  const problems: string[] = [];
  if (card.allBeatBaseline === false) problems.push(`tasks not beating rules baseline: ${(card.tasksNotBeatingBaseline ?? []).join(", ")}`);
  const active = readActivePointer();
  const regressions = card.comparedToActive?.regressions ?? [];
  if (active && active !== version && regressions.length) problems.push(`regressions vs active ${active}: ${regressions.join(", ")}`);
  const trained = Object.values(card.tasks ?? {}).filter((t) => t.metrics && !t.error);
  if (trained.length === 0) problems.push("no trained tasks");

  if (problems.length && !flag("force")) {
    console.error(`\n[approve] REFUSED for ${version}:`);
    for (const p of problems) console.error(`  - ${p}`);
    console.error("  (re-train, or override with --force --reason \"...\" if you accept the risk)");
    process.exit(2);
  }
  if (problems.length && flag("force") && !reason) {
    console.error("[approve] --force requires --reason");
    process.exit(2);
  }
  if (!flag("confirm")) {
    console.log(`\n[approve] Dry run. Re-run with --confirm to approve ${version} as ${by}.`);
    if (problems.length) console.log(`[approve] would be FORCED past: ${problems.join("; ")}`);
    return;
  }

  card.status = "approved";
  card.approvedBy = by;
  card.approvedAt = new Date().toISOString();
  if (problems.length) card.notes = `${card.notes ?? ""}\nFORCE-APPROVED by ${by}: ${reason} (problems: ${problems.join("; ")})`.trim();
  writeCard(version, card);
  await upsertCustomModel(card, "approved", { approvedBy: by, approvedAt: new Date() });
  console.log(`\n[approve] ✓ ${version} approved by ${by}. Next: npm run ml:activate -- --version ${version}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
