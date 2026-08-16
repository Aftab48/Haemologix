/**
 * TypeScript client for the Haemologix model service (ml/haemologix/api.py).
 *
 * This is the ONLY place agents talk to the model. Behaviour:
 *  - one batched call per agent step (`predictBatch`)
 *  - short timeout (ML_TIMEOUT_MS, default 3 s) + one retry
 *  - shared-secret header (ML_API_SECRET)
 *  - never throws: returns null on any failure so the caller falls back to
 *    deterministic logic and records `fallback_reason`
 *  - health is cached for 30 s to avoid hammering /health from every request
 */

import { getMlConnection } from "./flags";
import type {
  MlHealth,
  PredictBatchRequest,
  PredictBatchResponse,
  PredictRequest,
  PredictResult,
  PredictionTask,
} from "./types";
import { PREDICTION_TASKS } from "./types";

export interface PredictOptions {
  timeoutMs?: number;
  retries?: number;
  modelVersion?: string;
  /** Injectable fetch for tests. */
  fetchImpl?: typeof fetch;
  env?: Record<string, string | undefined>;
}

export interface PredictFailure {
  ok: false;
  reason: string;
  status?: number;
  latencyMs: number;
}
export interface PredictSuccess {
  ok: true;
  response: PredictBatchResponse;
  latencyMs: number;
}
export type PredictOutcome = PredictSuccess | PredictFailure;

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function parseResult(v: unknown): PredictResult | null {
  if (!isRecord(v) || typeof v.task !== "string") return null;
  if (!(PREDICTION_TASKS as readonly string[]).includes(v.task)) return null;
  const pred = v.prediction;
  const okPred =
    typeof pred === "number" || (Array.isArray(pred) && pred.every((x) => typeof x === "number"));
  if (!okPred || typeof v.confidence !== "number") return null;
  return {
    task: v.task as PredictionTask,
    ref: typeof v.ref === "string" ? v.ref : undefined,
    prediction: pred as number | number[],
    confidence: v.confidence,
    featureImportance: isRecord(v.featureImportance) ? (v.featureImportance as Record<string, number>) : undefined,
    backend: typeof v.backend === "string" ? v.backend : undefined,
  };
}

function parseBatchResponse(v: unknown): PredictBatchResponse | null {
  if (!isRecord(v) || typeof v.modelVersion !== "string" || !Array.isArray(v.results)) return null;
  const results: PredictResult[] = [];
  for (const r of v.results) {
    const p = parseResult(r);
    if (!p) return null;
    results.push(p);
  }
  return { modelVersion: v.modelVersion, results, latencyMs: typeof v.latencyMs === "number" ? v.latencyMs : 0 };
}

async function fetchWithTimeout(
  fetchImpl: typeof fetch,
  url: string,
  init: RequestInit,
  timeoutMs: number
): Promise<Response> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    return await fetchImpl(url, { ...init, signal: ctrl.signal });
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Detailed variant: tells the caller *why* it failed (recorded as fallback_reason).
 */
export async function predictBatchDetailed(
  requests: PredictRequest[],
  opts: PredictOptions = {}
): Promise<PredictOutcome> {
  const started = Date.now();
  if (requests.length === 0) {
    return { ok: true, response: { modelVersion: "none", results: [], latencyMs: 0 }, latencyMs: 0 };
  }
  const conn = getMlConnection(opts.env);
  const fetchImpl = opts.fetchImpl ?? fetch;
  const timeoutMs = opts.timeoutMs ?? conn.timeoutMs;
  const retries = opts.retries ?? 1;
  const body: PredictBatchRequest = { requests, ...(opts.modelVersion ? { modelVersion: opts.modelVersion } : {}) };
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (conn.apiSecret) headers["X-ML-Secret"] = conn.apiSecret;

  let lastReason = "unknown";
  let lastStatus: number | undefined;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetchWithTimeout(
        fetchImpl,
        `${conn.apiUrl}/predict/batch`,
        { method: "POST", headers, body: JSON.stringify(body) },
        timeoutMs
      );
      lastStatus = res.status;
      if (!res.ok) {
        lastReason = `http_${res.status}`;
        // 4xx are not retryable (bad request / auth / no head for task)
        if (res.status >= 400 && res.status < 500) break;
        continue;
      }
      const parsed = parseBatchResponse(await res.json());
      if (!parsed) {
        lastReason = "invalid_response";
        break;
      }
      return { ok: true, response: parsed, latencyMs: Date.now() - started };
    } catch (err) {
      lastReason = err instanceof Error && err.name === "AbortError" ? "timeout" : "network_error";
      if (attempt < retries) await new Promise((r) => setTimeout(r, 200 * (attempt + 1)));
    }
  }
  return { ok: false, reason: lastReason, status: lastStatus, latencyMs: Date.now() - started };
}

/** Convenience: response or null. */
export async function predictBatch(
  requests: PredictRequest[],
  opts: PredictOptions = {}
): Promise<PredictBatchResponse | null> {
  const out = await predictBatchDetailed(requests, opts);
  return out.ok ? out.response : null;
}

// ---------------------------------------------------------------------------
// Health (cached)
// ---------------------------------------------------------------------------

let healthCache: { at: number; value: MlHealth } | null = null;
const HEALTH_TTL_MS = 30_000;

export async function getMlHealth(opts: PredictOptions = {}): Promise<MlHealth> {
  if (healthCache && Date.now() - healthCache.at < HEALTH_TTL_MS && !opts.fetchImpl) return healthCache.value;
  const conn = getMlConnection(opts.env);
  const fetchImpl = opts.fetchImpl ?? fetch;
  let value: MlHealth = { status: "down", modelLoaded: false, activeVersion: null, tasks: {} };
  try {
    const res = await fetchWithTimeout(fetchImpl, `${conn.apiUrl}/health`, { method: "GET" }, Math.min(conn.timeoutMs, 2500));
    if (res.ok) {
      const j: unknown = await res.json();
      if (isRecord(j)) {
        value = {
          status: j.model_loaded === true ? "healthy" : "degraded",
          modelLoaded: j.model_loaded === true,
          activeVersion: typeof j.activeVersion === "string" ? j.activeVersion : null,
          tasks: isRecord(j.tasks) ? (j.tasks as MlHealth["tasks"]) : {},
        };
      }
    }
  } catch {
    /* down */
  }
  if (!opts.fetchImpl) healthCache = { at: Date.now(), value };
  return value;
}

export async function isMLModelAvailable(opts: PredictOptions = {}): Promise<boolean> {
  return (await getMlHealth(opts)).modelLoaded;
}

/** For tests. */
export function __resetHealthCache() {
  healthCache = null;
}

// ---------------------------------------------------------------------------
// Helpers for callers
// ---------------------------------------------------------------------------

/** Index results by ref for O(1) lookup; results without ref are keyed by position. */
export function indexByRef(resp: PredictBatchResponse | null): Map<string, PredictResult> {
  const m = new Map<string, PredictResult>();
  if (!resp) return m;
  resp.results.forEach((r, i) => m.set(r.ref ?? String(i), r));
  return m;
}

export function scalar(r: PredictResult | undefined): number | null {
  return r && typeof r.prediction === "number" ? r.prediction : null;
}

export function vector(r: PredictResult | undefined): number[] | null {
  return r && Array.isArray(r.prediction) ? r.prediction : null;
}
