/**
 * The one entry point agents use to consult the model.
 *
 *   const ml = await consultModel({ agent: "DONOR", requestId, items: [...] });
 *   ml.get("donor-123")?.prediction  // number | number[] | undefined
 *   ml.meta                          // → spread into AgentDecision.decision
 *
 * Behaviour:
 *  - honours ML_MODE_* (off → no call, meta says so)
 *  - one batched HTTP call, short timeout, never throws
 *  - records every prediction as a ModelPrediction row (mode = shadow/advise/authority)
 *  - returns a `fallbackReason` the agent stores when it had to use rules
 */

import { getMlMode, type MlAgent } from "./flags";
import { indexByRef, predictBatchDetailed } from "./modelClient";
import { recordPredictions } from "./record";
import type { FeatureVector, MlMode, PredictionTask, PredictResult } from "./types";

export interface ConsultItem {
  task: PredictionTask;
  /** unique within the batch; use `${task}:${subjectId}` */
  ref: string;
  features: FeatureVector;
  subjectId?: string | null;
}

export interface ConsultInput {
  agent: MlAgent;
  requestId: string | null;
  items: ConsultItem[];
  env?: Record<string, string | undefined>;
  fetchImpl?: typeof fetch;
}

/** Fields every agent writes into AgentDecision.decision (replaces llm_used / model_used). */
export interface MlDecisionMeta {
  ml_mode: MlMode;
  model_version: string | null;
  prediction_ids: string[];
  fallback_reason: string | null;
  ml_latency_ms: number | null;
  /** true when the policy's (model-informed) decision was the one acted on */
  policy_applied: boolean;
}

export class ConsultResult {
  constructor(
    readonly mode: MlMode,
    readonly modelVersion: string | null,
    readonly results: Map<string, PredictResult>,
    readonly predictionIds: string[],
    readonly fallbackReason: string | null,
    readonly latencyMs: number | null
  ) {}

  get ok(): boolean {
    return this.fallbackReason === null && this.mode !== "off";
  }
  /** Policy decisions are acted on only in authority mode AND when the model answered. */
  get hasAuthority(): boolean {
    return this.ok && this.mode === "authority";
  }
  get(ref: string): PredictResult | undefined {
    return this.results.get(ref);
  }
  scalar(ref: string): number | null {
    const r = this.results.get(ref);
    return r && typeof r.prediction === "number" ? r.prediction : null;
  }
  vector(ref: string): number[] | null {
    const r = this.results.get(ref);
    return r && Array.isArray(r.prediction) ? r.prediction : null;
  }
  meta(policyApplied = this.hasAuthority): MlDecisionMeta {
    return {
      ml_mode: this.mode,
      model_version: this.modelVersion,
      prediction_ids: this.predictionIds,
      fallback_reason: this.fallbackReason,
      ml_latency_ms: this.latencyMs,
      policy_applied: policyApplied,
    };
  }
  static off(agent: MlAgent, mode: MlMode = "off"): ConsultResult {
    return new ConsultResult(mode, null, new Map(), [], mode === "off" ? "ml_mode_off" : "no_items", null);
  }
}

export async function consultModel(input: ConsultInput): Promise<ConsultResult> {
  const mode = getMlMode(input.agent, input.env);
  if (mode === "off") return ConsultResult.off(input.agent);
  if (input.items.length === 0) return new ConsultResult(mode, null, new Map(), [], "no_items", null);

  const outcome = await predictBatchDetailed(
    input.items.map((i) => ({ task: i.task, features: i.features, ref: i.ref })),
    { env: input.env, fetchImpl: input.fetchImpl }
  );
  if (!outcome.ok) {
    console.warn(`[ml] ${input.agent} model call failed (${outcome.reason}) — deterministic fallback`);
    return new ConsultResult(mode, null, new Map(), [], outcome.reason, outcome.latencyMs);
  }
  const byRef = indexByRef(outcome.response);
  const ids = await recordPredictions({
    agentType: input.agent,
    requestId: input.requestId,
    mode,
    modelVersion: outcome.response.modelVersion,
    latencyMs: outcome.latencyMs,
    items: input.items
      .filter((i) => byRef.has(i.ref))
      .map((i) => ({ task: i.task, subjectId: i.subjectId ?? null, features: i.features, result: byRef.get(i.ref)! })),
  });
  return new ConsultResult(mode, outcome.response.modelVersion, byRef, ids, null, outcome.latencyMs);
}

/** Convenience for agents: hour/dow of "now" in the server's local time (what the rules use). */
export function nowTimeContext(now = new Date()) {
  return { hour: now.getHours(), dayOfWeek: now.getDay() };
}
