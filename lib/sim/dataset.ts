/**
 * Turn simulation results into TrainingRow objects and JSONL files.
 */

import fs from "node:fs";
import path from "node:path";
import { PREDICTION_TASKS, type DatasetManifest, type PredictionTask, type TrainingRow } from "@/lib/ml/types";
import type { SimRunResult } from "./types";

export function toTrainingRows(result: SimRunResult): TrainingRow[] {
  return result.rows.map((r) => ({
    task: r.task,
    features: r.features,
    label: r.label,
    source: "sim",
    groupId: result.scenarioId,
    eventTime: new Date(r.eventTime).toISOString(),
    meta: { ...(r.meta ?? {}), subjectId: r.subjectId ?? null, kind: result.kind, policy: result.policy },
  }));
}

/**
 * Streaming JSONL writer: one file per task under `dir`, plus manifest.json.
 * Keeps file handles open across many scenarios so 10^5 runs do not thrash the FS.
 */
export class DatasetWriter {
  private streams = new Map<PredictionTask, fs.WriteStream>();
  private counts: Partial<Record<PredictionTask, number>> = {};
  private features: Partial<Record<PredictionTask, Set<string>>> = {};
  private labelSums: Partial<Record<PredictionTask, number>> = {};

  constructor(readonly dir: string) {
    fs.mkdirSync(dir, { recursive: true });
  }

  private stream(task: PredictionTask): fs.WriteStream {
    let s = this.streams.get(task);
    if (!s) {
      s = fs.createWriteStream(path.join(this.dir, `${task}.jsonl`), { flags: "w" });
      this.streams.set(task, s);
    }
    return s;
  }

  write(rows: TrainingRow[]) {
    for (const row of rows) {
      this.stream(row.task).write(JSON.stringify(row) + "\n");
      this.counts[row.task] = (this.counts[row.task] ?? 0) + 1;
      this.labelSums[row.task] = (this.labelSums[row.task] ?? 0) + row.label;
      let f = this.features[row.task];
      if (!f) {
        f = new Set<string>();
        this.features[row.task] = f;
      }
      for (const k of Object.keys(row.features)) f.add(k);
    }
  }

  async close(manifest: Omit<DatasetManifest, "rows" | "features">): Promise<DatasetManifest> {
    await Promise.all(
      [...this.streams.values()].map(
        (s) => new Promise<void>((resolve, reject) => s.end((err?: Error | null) => (err ? reject(err) : resolve())))
      )
    );
    const features: Partial<Record<PredictionTask, string[]>> = {};
    for (const t of PREDICTION_TASKS) if (this.features[t]) features[t] = [...this.features[t]!].sort();
    const labelMeans: Partial<Record<PredictionTask, number>> = {};
    for (const t of PREDICTION_TASKS) {
      const n = this.counts[t] ?? 0;
      if (n > 0) labelMeans[t] = Math.round(((this.labelSums[t] ?? 0) / n) * 10000) / 10000;
    }
    const full: DatasetManifest & { labelMeans: typeof labelMeans } = {
      ...manifest,
      rows: { ...this.counts },
      features,
      labelMeans,
    };
    fs.writeFileSync(path.join(this.dir, "manifest.json"), JSON.stringify(full, null, 2));
    return full;
  }
}
