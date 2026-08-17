/**
 * Shared contracts for the Haemologix decision-intelligence layer.
 *
 * These types are used by:
 *  - the simulator (lib/sim) when it emits training rows,
 *  - the agents when they build features at runtime,
 *  - the model client (lib/ml/modelClient.ts) when it talks to the FastAPI service,
 *  - the policy layer (lib/ml/policy) when it turns predictions into decisions.
 *
 * Keeping one vocabulary here is what makes train/serve skew impossible: the same
 * feature builders (lib/ml/features.ts) run in the simulator and in production.
 */

/** Every prediction the model service can be asked for. One task = one model = one label. */
export const PREDICTION_TASKS = [
  "donor_accept", // P(donor accepts the notification)
  "donor_show", // P(donor arrives | accepted)
  "donor_response_time", // minutes from notification to response (regression, log-space)
  "donor_eta", // minutes from acceptance to arrival (regression, log-space)
  "inventory_delivery_ok", // P(reserved unit is delivered usable within the window)
  "delivery_time", // minutes from reservation to delivery (regression, log-space)
  "urgency_priority", // 4-class urgency (LOW/MEDIUM/HIGH/CRITICAL)
  "alert_resolves_in_window", // P(alert fully resolved before its deadline)
  "eligibility_needs_review", // P(a deterministic eligibility result is borderline / worth a human look)
  "expansion_yield", // P(widening the donor radius to the next tier finds ≥1 new eligible donor) — escalation ladder
] as const;

export type PredictionTask = (typeof PREDICTION_TASKS)[number];

export const BINARY_TASKS: readonly PredictionTask[] = [
  "donor_accept",
  "donor_show",
  "inventory_delivery_ok",
  "alert_resolves_in_window",
  "eligibility_needs_review",
  "expansion_yield",
];

export const REGRESSION_TASKS: readonly PredictionTask[] = [
  "donor_response_time",
  "donor_eta",
  "delivery_time",
];

export const MULTICLASS_TASKS: readonly PredictionTask[] = ["urgency_priority"];

export type TaskKind = "binary" | "regression" | "multiclass";

export function taskKind(task: PredictionTask): TaskKind {
  if (BINARY_TASKS.includes(task)) return "binary";
  if (REGRESSION_TASKS.includes(task)) return "regression";
  return "multiclass";
}

/** Urgency classes in index order used by the multiclass head. */
export const URGENCY_CLASSES = ["low", "medium", "high", "critical"] as const;
export type UrgencyClass = (typeof URGENCY_CLASSES)[number];

/** Flat, JSON-serialisable feature vector. Strings are categoricals; numbers/booleans are numeric. */
export type FeatureValue = number | string | boolean;
export type FeatureVector = Record<string, FeatureValue>;

// ---------------------------------------------------------------------------
// Model service contract (POST /predict/batch)
// ---------------------------------------------------------------------------

export interface PredictRequest {
  task: PredictionTask;
  features: FeatureVector;
  /** Optional caller-side identifier echoed back in the result. */
  ref?: string;
}

export interface PredictBatchRequest {
  /** Pin a specific model version; omit for the active version. */
  modelVersion?: string;
  requests: PredictRequest[];
}

export interface PredictResult {
  task: PredictionTask;
  ref?: string;
  /**
   * binary → probability in [0,1]
   * regression → predicted value in natural units (minutes)
   * multiclass → probabilities per class, in URGENCY_CLASSES order
   */
  prediction: number | number[];
  /** Model's own confidence in [0,1] (calibrated |p-0.5|*2 for binary; 1 - normalised interval for regression). */
  confidence: number;
  /** Optional per-feature contribution scores (GBDT importances / MLP gradients). */
  featureImportance?: Record<string, number>;
  /** Which backend produced this (mlp | gbdt | baseline). */
  backend?: string;
}

export interface PredictBatchResponse {
  modelVersion: string;
  results: PredictResult[];
  latencyMs: number;
}

export interface MlHealth {
  status: "healthy" | "degraded" | "down";
  modelLoaded: boolean;
  activeVersion: string | null;
  tasks: Partial<Record<PredictionTask, string>>;
}

// ---------------------------------------------------------------------------
// Authority modes
// ---------------------------------------------------------------------------

/**
 * off       – model never called
 * shadow    – model called, prediction logged, deterministic decision used
 * advise    – model prediction shown / stored alongside; deterministic decision used, policy suggestion logged
 * authority – policy decision (predictions + hard constraints) is what the agent does
 */
export const ML_MODES = ["off", "shadow", "advise", "authority"] as const;
export type MlMode = (typeof ML_MODES)[number];

// ---------------------------------------------------------------------------
// Outcome vocabulary written to the DB by agents / scheduler
// ---------------------------------------------------------------------------

export const ALERT_OUTCOMES = [
  "FULFILLED", // unitsCollected >= unitsNeeded within window
  "PARTIAL", // some units collected, window closed
  "ESCALATED", // handed off to manual / external coordination
  "FAILED", // nothing collected, window closed
  "CANCELLED", // hospital cancelled
] as const;
export type AlertOutcome = (typeof ALERT_OUTCOMES)[number];

export const FULFILLED_BY = ["donors", "inventory", "mixed", "external"] as const;
export type FulfilledBy = (typeof FULFILLED_BY)[number];

/** Alert lifecycle statuses (previously an untyped string). */
export const ALERT_STATUSES = [
  "PENDING",
  "NOTIFIED",
  "MATCHED",
  "FULFILLED",
  "CLOSED",
] as const;
export type AlertStatus = (typeof ALERT_STATUSES)[number];

// ---------------------------------------------------------------------------
// Training rows (what the simulator and the harvester emit; what Python reads)
// ---------------------------------------------------------------------------

export interface TrainingRow {
  task: PredictionTask;
  features: FeatureVector;
  /** binary → 0|1, regression → number, multiclass → class index */
  label: number;
  /** "sim" | "real" */
  source: "sim" | "real";
  /** Simulator scenario id or production requestId — used for grouped train/val splits. */
  groupId: string;
  /** ISO timestamp of the event the row describes (event time, never wall clock). */
  eventTime: string;
  /** Free-form extra context that is NOT a feature (kept for analysis). */
  meta?: Record<string, FeatureValue | null>;
}

export interface DatasetManifest {
  datasetVersion: string;
  createdAt: string;
  source: "sim" | "real" | "mixed";
  rows: Partial<Record<PredictionTask, number>>;
  features: Partial<Record<PredictionTask, string[]>>;
  /** Simulator-specific provenance */
  seed?: number;
  scenarioMix?: Record<string, number>;
  priorsHash?: string;
  priorsVersion?: string;
  /** whether the coordinator's escalation ladder was simulated (sim-v3+) */
  ladder?: boolean;
  gitSha?: string;
  notes?: string;
}
