import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { getMlHealth } from "@/lib/ml/modelClient";
import { ML_AGENTS, getMlMode } from "@/lib/ml/flags";
import { PREDICTION_TASKS, taskKind, type PredictionTask } from "@/lib/ml/types";

/**
 * Shadow-pilot report: how well have the model's predictions matched reality?
 *
 *   GET /api/ml/report?since=2026-08-01&modelVersion=haemologix-model-1.0
 *
 * Per task: predictions, resolved (with outcome), and — for resolved rows —
 * MAE (regression), Brier / accuracy@0.5 / positive rate (binary), accuracy
 * (multiclass). Grouped by model version so the deterministic-baseline sentinel
 * and each served model can be compared on the same rows.
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const since = searchParams.get("since") ? new Date(searchParams.get("since")!) : null;
    const modelVersion = searchParams.get("modelVersion");

    const rows = await db.modelPrediction.findMany({
      where: {
        ...(since ? { createdAt: { gte: since } } : {}),
        ...(modelVersion ? { model: { version: modelVersion } } : {}),
      },
      select: {
        taskType: true,
        prediction: true,
        actualOutcome: true,
        error: true,
        mode: true,
        agentType: true,
        latencyMs: true,
        model: { select: { version: true } },
      },
      take: 50_000,
      orderBy: { createdAt: "desc" },
    });

    type Agg = {
      predictions: number;
      resolved: number;
      sumErr: number;
      sumSqErr: number;
      correct: number;
      positives: number;
      latencies: number[];
    };
    const byVersionTask = new Map<string, Agg>();
    const key = (v: string, t: string) => `${v}::${t}`;
    for (const r of rows) {
      const k = key(r.model.version, r.taskType);
      let a = byVersionTask.get(k);
      if (!a) {
        a = { predictions: 0, resolved: 0, sumErr: 0, sumSqErr: 0, correct: 0, positives: 0, latencies: [] };
        byVersionTask.set(k, a);
      }
      a.predictions++;
      if (typeof r.latencyMs === "number") a.latencies.push(r.latencyMs);
      const actual = (r.actualOutcome as { value?: unknown } | null)?.value;
      if (actual === undefined || actual === null) continue;
      a.resolved++;
      const pred = (r.prediction as { value?: unknown } | null)?.value;
      const kind = (PREDICTION_TASKS as readonly string[]).includes(r.taskType) ? taskKind(r.taskType as PredictionTask) : "binary";
      if (kind === "binary" && typeof pred === "number" && typeof actual === "number") {
        a.sumSqErr += (pred - actual) ** 2;
        a.correct += (pred >= 0.5 ? 1 : 0) === actual ? 1 : 0;
        a.positives += actual;
      } else if (kind === "regression" && typeof pred === "number" && typeof actual === "number") {
        a.sumErr += Math.abs(pred - actual);
      } else if (kind === "multiclass" && Array.isArray(pred)) {
        const idx = (pred as number[]).indexOf(Math.max(...(pred as number[])));
        const act = typeof actual === "number" ? actual : -1;
        a.correct += idx === act ? 1 : 0;
      }
    }

    const report: Record<string, Record<string, unknown>> = {};
    for (const [k, a] of byVersionTask) {
      const [version, task] = k.split("::");
      const kind = (PREDICTION_TASKS as readonly string[]).includes(task) ? taskKind(task as PredictionTask) : "binary";
      const lat = a.latencies.sort((x, y) => x - y);
      const p95 = lat.length ? lat[Math.floor(lat.length * 0.95)] : null;
      const entry: Record<string, unknown> = { predictions: a.predictions, resolved: a.resolved, latencyP95Ms: p95 };
      if (a.resolved > 0) {
        if (kind === "binary") {
          entry.brier = a.sumSqErr / a.resolved;
          entry.accuracyAt05 = a.correct / a.resolved;
          entry.positiveRate = a.positives / a.resolved;
        } else if (kind === "regression") {
          entry.mae = a.sumErr / a.resolved;
        } else {
          entry.accuracy = a.correct / a.resolved;
        }
      }
      (report[version] ??= {})[task] = entry;
    }

    const [health, activeModel] = await Promise.all([
      getMlHealth(),
      db.customModel.findFirst({ where: { isActive: true }, select: { version: true, status: true, deployedAt: true, metrics: true, datasetVersion: true, datasetMix: true } }),
    ]);

    return NextResponse.json({
      success: true,
      since: since?.toISOString() ?? null,
      totalPredictions: rows.length,
      modelService: health,
      activeModel,
      modes: Object.fromEntries(ML_AGENTS.map((a) => [a, getMlMode(a)])),
      byModelVersion: report,
    });
  } catch (error) {
    console.error("[ML report] Error:", error);
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}
