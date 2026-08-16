/**
 * Harvest REAL outcomes into a training dataset.
 *
 *   npx tsx scripts/ml/harvestTrainingData.ts --out ml/data/real/v1 [--since 2026-08-01] [--to-db]
 *
 * Source of truth = ModelPrediction rows whose actualOutcome was back-filled by
 * the agents/scheduler. Their inputFeatures are EXACTLY what the agent computed
 * at decision time (same builders as the simulator), and actualOutcome is what
 * really happened — the cleanest possible supervised row.
 *
 * Writes one JSONL per task + manifest.json (source: "real"), optionally also
 * TrainingExample rows (source="real"). Feed into training with:
 *   python -m haemologix.retrain --version haemologix-model-1.1 --sim ml/data/sim/v1 --real ml/data/real/v1
 */
import "./loadEnv";
import path from "node:path";
import { db } from "@/db";
import { PREDICTION_TASKS, URGENCY_CLASSES, type PredictionTask, type TrainingRow } from "@/lib/ml/types";
import { DatasetWriter } from "@/lib/sim/dataset";

const argv = process.argv.slice(2);
const get = (k: string) => {
  const i = argv.indexOf(`--${k}`);
  return i >= 0 ? argv[i + 1] : undefined;
};
const out = get("out") ?? "ml/data/real/v1";
const since = get("since") ? new Date(get("since")!) : null;
const toDb = argv.includes("--to-db");
const datasetVersion = get("version") ?? path.basename(out);

function labelFrom(task: PredictionTask, actual: unknown): number | null {
  if (typeof actual === "number" && Number.isFinite(actual)) return actual;
  if (typeof actual === "string") {
    if (task === "urgency_priority") {
      const i = URGENCY_CLASSES.indexOf(actual.toLowerCase() as never);
      return i >= 0 ? i : null;
    }
    const n = Number(actual);
    return Number.isFinite(n) ? n : null;
  }
  if (typeof actual === "boolean") return actual ? 1 : 0;
  return null;
}

async function main() {
  const writer = new DatasetWriter(out);
  let total = 0;
  const perTask: Partial<Record<PredictionTask, number>> = {};
  const dbRows: Array<Record<string, unknown>> = [];

  // Page through predictions with outcomes (excluding the deterministic baseline sentinel — its features are identical anyway, but avoid duplicates)
  const pageSize = 2000;
  let cursor: string | undefined;
  for (;;) {
    const rows = await db.modelPrediction.findMany({
      where: {
        actualOutcome: { not: undefined },
        ...(since ? { createdAt: { gte: since } } : {}),
      },
      orderBy: { id: "asc" },
      take: pageSize,
      ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
    });
    if (rows.length === 0) break;
    cursor = rows[rows.length - 1].id;
    const seen = new Set<string>();
    const out: TrainingRow[] = [];
    for (const r of rows) {
      const actual = (r.actualOutcome as { value?: unknown } | null)?.value;
      if (actual === undefined || actual === null) continue;
      if (!(PREDICTION_TASKS as readonly string[]).includes(r.taskType)) continue;
      const task = r.taskType as PredictionTask;
      const label = labelFrom(task, actual);
      if (label === null) continue;
      // one row per (request, task, subject) — keep the earliest prediction's features
      const key = `${r.requestId}|${task}|${r.subjectId ?? ""}`;
      if (seen.has(key)) continue;
      seen.add(key);
      const row: TrainingRow = {
        task,
        features: r.inputFeatures as TrainingRow["features"],
        label,
        source: "real",
        groupId: r.requestId ?? r.id,
        eventTime: r.createdAt.toISOString(),
        meta: { subjectId: r.subjectId ?? null, agentType: r.agentType ?? null, mode: r.mode, predictionId: r.id },
      };
      out.push(row);
      perTask[task] = (perTask[task] ?? 0) + 1;
      if (toDb) {
        dbRows.push({
          taskType: task,
          inputFeatures: row.features,
          outputLabel: { label },
          outcome: { actual },
          requestId: r.requestId,
          source: "real",
          scenarioId: r.requestId,
          datasetVersion,
          createdAt: r.createdAt,
        });
      }
    }
    writer.write(out);
    total += out.length;
    if (rows.length < pageSize) break;
  }
  if (toDb && dbRows.length) {
    for (let i = 0; i < dbRows.length; i += 1000) {
      await db.trainingExample.createMany({ data: dbRows.slice(i, i + 1000) as never });
    }
  }
  const manifest = await writer.close({
    datasetVersion,
    createdAt: new Date().toISOString(),
    source: "real",
    notes: `Harvested from ModelPrediction rows with actualOutcome${since ? ` since ${since.toISOString()}` : ""}`,
  });
  console.log(`[harvest] wrote ${total} real rows to ${out}`);
  for (const t of PREDICTION_TASKS) if (manifest.rows[t]) console.log(`   ${t.padEnd(26)} ${manifest.rows[t]}`);
  if (total === 0) console.log("[harvest] no outcomes yet — run the shadow pilot first (agents + /api/cron/agent-tick).");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
