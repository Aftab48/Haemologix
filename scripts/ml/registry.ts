/**
 * Shared helpers for the model registry scripts (register / approve / activate).
 * Reads model cards from ml/checkpoints/<version>/model_card.json and mirrors
 * them into the CustomModel table so the app can show lineage and metrics.
 */
import fs from "node:fs";
import path from "node:path";
import { db } from "@/db";

export interface TaskCardEntry {
  backend?: string;
  primary_metric?: string;
  metrics?: Record<string, number>;
  baseline_metrics?: Record<string, number>;
  beats_baseline?: boolean;
  features?: string[];
  n_features?: number;
  rows?: { total: number };
  skipped?: boolean;
  error?: string;
}

export interface ModelCard {
  version: string;
  createdAt?: string;
  status?: string;
  datasetVersion?: string;
  datasetMix?: Record<string, number>;
  tasks: Record<string, TaskCardEntry>;
  limitations?: string[];
  notes?: string;
  allBeatBaseline?: boolean;
  tasksNotBeatingBaseline?: string[];
  comparedToActive?: { activeVersion: string | null; regressions?: string[]; perTask?: Record<string, unknown> };
  approvedBy?: string;
  approvedAt?: string;
  activatedAt?: string;
}

export function modelDir(): string {
  const d = process.env.ML_MODEL_DIR || "ml/checkpoints";
  return path.isAbsolute(d) ? d : path.resolve(process.cwd(), d);
}

export function versionDir(version: string): string {
  return path.join(modelDir(), version);
}

export function readCard(version: string): ModelCard {
  const p = path.join(versionDir(version), "model_card.json");
  if (!fs.existsSync(p)) throw new Error(`model card not found: ${p}`);
  return JSON.parse(fs.readFileSync(p, "utf8")) as ModelCard;
}

export function writeCard(version: string, card: ModelCard): void {
  fs.writeFileSync(path.join(versionDir(version), "model_card.json"), JSON.stringify(card, null, 2));
}

export function readActivePointer(): string | null {
  const p = path.join(modelDir(), "active");
  return fs.existsSync(p) ? fs.readFileSync(p, "utf8").trim() || null : null;
}

export function writeActivePointer(version: string): void {
  fs.writeFileSync(path.join(modelDir(), "active"), version);
}

/** Compact per-task summary for CustomModel.metrics. */
export function summarizeCard(card: ModelCard) {
  const out: Record<string, unknown> = {};
  for (const [task, r] of Object.entries(card.tasks ?? {})) {
    if (!r.metrics) continue;
    out[task] = {
      backend: r.backend,
      primary: r.primary_metric,
      value: r.primary_metric ? r.metrics[r.primary_metric] : null,
      baseline: r.primary_metric ? r.baseline_metrics?.[r.primary_metric] : null,
      beatsBaseline: r.beats_baseline,
      rows: r.rows?.total,
    };
  }
  return out;
}

export async function upsertCustomModel(card: ModelCard, status: string, extra: Record<string, unknown> = {}) {
  const features: Record<string, string[]> = {};
  for (const [task, r] of Object.entries(card.tasks ?? {})) if (r.features) features[task] = r.features;
  return db.customModel.upsert({
    where: { version: card.version },
    update: {
      status,
      metrics: summarizeCard(card) as never,
      datasetVersion: card.datasetVersion ?? null,
      datasetMix: (card.datasetMix ?? null) as never,
      features: features as never,
      limitations: (card.limitations ?? []).join("\n") || null,
      notes: card.notes ?? null,
      config: { modelCard: card } as never,
      modelPath: versionDir(card.version),
      ...extra,
    },
    create: {
      version: card.version,
      taskType: "all",
      modelPath: versionDir(card.version),
      config: { modelCard: card } as never,
      metrics: summarizeCard(card) as never,
      status,
      datasetVersion: card.datasetVersion ?? null,
      datasetMix: (card.datasetMix ?? null) as never,
      features: features as never,
      limitations: (card.limitations ?? []).join("\n") || null,
      notes: card.notes ?? null,
      trainedAt: card.createdAt ? new Date(card.createdAt) : new Date(),
      ...extra,
    },
  });
}

export function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : undefined;
}
export function flag(name: string): boolean {
  return process.argv.includes(`--${name}`);
}

export function printCard(card: ModelCard) {
  console.log(`\nModel ${card.version}  status=${card.status ?? "?"}  dataset=${card.datasetVersion ?? "?"}  mix=${JSON.stringify(card.datasetMix ?? {})}`);
  for (const [task, r] of Object.entries(card.tasks ?? {})) {
    if (r.error) {
      console.log(`  ${task.padEnd(26)} ERROR ${r.error}`);
      continue;
    }
    if (r.skipped || !r.metrics) {
      console.log(`  ${task.padEnd(26)} skipped`);
      continue;
    }
    const pm = r.primary_metric ?? "";
    console.log(
      `  ${task.padEnd(26)} ${String(r.backend).padEnd(5)} ${pm}=${Number(r.metrics[pm]).toFixed(3)}  baseline=${Number(r.baseline_metrics?.[pm]).toFixed(3)}  ${r.beats_baseline ? "✓ beats baseline" : "✗ NOT better than baseline"}`
    );
  }
  if (card.limitations?.length) console.log(`  limitations: ${card.limitations.join(" | ")}`);
}
