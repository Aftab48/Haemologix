/**
 * Persistence for the ML layer: ModelPrediction rows and the model registry.
 *
 *  - recordPredictions()   – write one ModelPrediction per prediction an agent asked for
 *  - recordOutcome()       – back-fill actualOutcome/error once reality is known
 *  - ensureBaselineModel() – the sentinel CustomModel row that "deterministic"
 *                            decisions are logged against, so shadow reports can
 *                            compare model vs baseline on identical rows
 *  - getActiveModel()      – active CustomModel row (or null)
 *
 * All writes are best-effort: a logging failure must never break an agent.
 */

import { db } from "@/db";
import { Prisma } from "@prisma/client";
import type { MlAgent } from "./flags";
import {
  taskKind,
  URGENCY_CLASSES,
  type FeatureVector,
  type MlMode,
  type PredictionTask,
  type PredictResult,
} from "./types";

export const BASELINE_MODEL_VERSION = "deterministic-baseline-v0";

let baselineIdCache: string | null = null;
const modelIdCache = new Map<string, string>();

/** Upsert the sentinel baseline model row and return its id. */
export async function ensureBaselineModel(): Promise<string> {
  if (baselineIdCache) return baselineIdCache;
  const row = await db.customModel.upsert({
    where: { version: BASELINE_MODEL_VERSION },
    update: {},
    create: {
      version: BASELINE_MODEL_VERSION,
      taskType: "all",
      modelPath: "n/a",
      config: { kind: "deterministic", description: "Existing rule-based agent logic" },
      status: "active",
      isActive: false,
      notes:
        "Sentinel row. Predictions attributed to this version are the deterministic " +
        "agent heuristics, logged so shadow-mode reports can compare model vs rules.",
    },
  });
  baselineIdCache = row.id;
  return row.id;
}

/** Resolve a CustomModel id from a version string (creating a placeholder row if the service reports a version we have not registered yet). */
export async function ensureModelRow(version: string): Promise<string> {
  const cached = modelIdCache.get(version);
  if (cached) return cached;
  const row = await db.customModel.upsert({
    where: { version },
    update: {},
    create: {
      version,
      taskType: "all",
      modelPath: `ml/checkpoints/${version}`,
      config: { kind: "served", registeredBy: "runtime" },
      status: "evaluated",
      notes: "Auto-registered at runtime because the model service reported this version.",
    },
  });
  modelIdCache.set(version, row.id);
  return row.id;
}

export async function getActiveModel() {
  return db.customModel.findFirst({ where: { isActive: true }, orderBy: { deployedAt: "desc" } });
}

export interface RecordPredictionInput {
  agentType: MlAgent;
  requestId: string | null;
  mode: MlMode;
  modelVersion: string;
  latencyMs?: number;
  items: Array<{
    task: PredictionTask;
    subjectId?: string | null;
    features: FeatureVector;
    result: PredictResult;
  }>;
}

/** Write ModelPrediction rows. Returns the created ids (same order as items). Never throws. */
export async function recordPredictions(input: RecordPredictionInput): Promise<string[]> {
  if (input.items.length === 0) return [];
  try {
    const modelId =
      input.modelVersion === BASELINE_MODEL_VERSION
        ? await ensureBaselineModel()
        : await ensureModelRow(input.modelVersion);

    // createMany does not return ids in Prisma; use a transaction of creates.
    const created = await db.$transaction(
      input.items.map((item) =>
        db.modelPrediction.create({
          data: {
            modelId,
            taskType: item.task,
            inputFeatures: item.features as Prisma.InputJsonObject,
            prediction: {
              value: item.result.prediction,
              backend: item.result.backend ?? null,
              featureImportance: item.result.featureImportance ?? null,
            } as Prisma.InputJsonObject,
            confidence: item.result.confidence,
            requestId: input.requestId,
            agentType: input.agentType,
            mode: input.mode,
            latencyMs: input.latencyMs ?? null,
            subjectId: item.subjectId ?? null,
          },
          select: { id: true },
        })
      )
    );
    return created.map((r) => r.id);
  } catch (error) {
    console.error("[ml/record] Failed to record predictions:", error);
    return [];
  }
}

export interface RecordOutcomeInput {
  requestId: string;
  task: PredictionTask;
  /** For per-subject tasks (donor_accept etc.), the donorId / unitId. */
  subjectId?: string | null;
  /** binary → 0|1, regression → number, multiclass → class index or class name */
  actual: number | string;
  outcomeAt?: Date;
}

/**
 * Back-fill the actual outcome onto every prediction row that matches
 * (requestId, task, subjectId). Computes `error` per task kind. Never throws.
 */
export async function recordOutcome(input: RecordOutcomeInput): Promise<number> {
  try {
    const rows = await db.modelPrediction.findMany({
      where: {
        requestId: input.requestId,
        taskType: input.task,
        ...(input.subjectId !== undefined ? { subjectId: input.subjectId } : {}),
        actualOutcome: { equals: Prisma.DbNull },
      },
      select: { id: true, prediction: true },
    });
    if (rows.length === 0) return 0;

    const kind = taskKind(input.task);
    const actualNumeric =
      typeof input.actual === "number"
        ? input.actual
        : kind === "multiclass"
        ? URGENCY_CLASSES.indexOf(input.actual.toLowerCase() as never)
        : Number(input.actual);

    await db.$transaction(
      rows.map((row) => {
        const pred = row.prediction as { value?: unknown } | null;
        const value = pred?.value;
        let error: number | null = null;
        if (kind === "binary" && typeof value === "number") {
          error = Math.abs(value - actualNumeric);
        } else if (kind === "regression" && typeof value === "number") {
          error = Math.abs(value - actualNumeric);
        } else if (kind === "multiclass" && Array.isArray(value)) {
          const predictedIdx = value.indexOf(Math.max(...(value as number[])));
          error = predictedIdx === actualNumeric ? 0 : 1;
        }
        return db.modelPrediction.update({
          where: { id: row.id },
          data: {
            actualOutcome: { value: input.actual } as Prisma.InputJsonObject,
            outcomeAt: input.outcomeAt ?? new Date(),
            error,
          },
        });
      })
    );
    return rows.length;
  } catch (error) {
    console.error("[ml/record] Failed to record outcome:", error);
    return 0;
  }
}
