/**
 * Urgency policy.
 *
 * The rule (hospitalAgent.calculateUrgency) is authoritative for safety: the
 * model may move the level by at most ONE step, only when confident, and may
 * never lower a CRITICAL rule assessment. Priority score is recomputed with the
 * same deterministic formula so downstream code sees consistent numbers.
 */

import { calculatePriorityScore, type Urgency } from "@/lib/agents/hospitalAgent";
import { URGENCY_CLASSES } from "@/lib/ml/types";

export interface UrgencyPolicyInput {
  ruleUrgency: Urgency;
  bloodType: string;
  daysRemaining: number;
  /** model class probabilities in URGENCY_CLASSES order, or null */
  probs: number[] | null;
  options?: Partial<UrgencyPolicyOptions>;
}

export interface UrgencyPolicyOptions {
  /** model must be at least this confident to move the level */
  minConfidence: number;
  /** allow lowering (never below rule when rule is critical) */
  allowDowngrade: boolean;
}

export const DEFAULT_URGENCY_OPTIONS: UrgencyPolicyOptions = { minConfidence: 0.6, allowDowngrade: true };

export interface UrgencyDecision {
  urgency: Urgency;
  priorityScore: number;
  source: "model" | "deterministic";
  reason: string;
  modelUrgency?: Urgency;
  modelConfidence?: number;
}

export function assessUrgency(input: UrgencyPolicyInput): UrgencyDecision {
  const o = { ...DEFAULT_URGENCY_OPTIONS, ...(input.options ?? {}) };
  const ruleIdx = URGENCY_CLASSES.indexOf(input.ruleUrgency);
  const base: UrgencyDecision = {
    urgency: input.ruleUrgency,
    priorityScore: calculatePriorityScore(input.ruleUrgency, input.bloodType, input.daysRemaining),
    source: "deterministic",
    reason: `Rule: ${input.ruleUrgency} (${input.daysRemaining.toFixed(1)} days of stock)`,
  };
  const p = input.probs;
  if (!p || p.length !== URGENCY_CLASSES.length || ruleIdx < 0) return base;
  let mIdx = 0;
  for (let i = 1; i < p.length; i++) if (p[i] > p[mIdx]) mIdx = i;
  const conf = p[mIdx];
  const modelUrgency = URGENCY_CLASSES[mIdx] as Urgency;
  if (conf < o.minConfidence || mIdx === ruleIdx) {
    return { ...base, modelUrgency, modelConfidence: round(conf), reason: base.reason + ` — model agrees/unsure (${modelUrgency} @ ${round(conf)})` };
  }
  // move at most one step toward the model
  let target = ruleIdx + Math.sign(mIdx - ruleIdx);
  if (target < ruleIdx && (!o.allowDowngrade || input.ruleUrgency === "critical")) target = ruleIdx;
  const urgency = URGENCY_CLASSES[target] as Urgency;
  if (target === ruleIdx) {
    return { ...base, modelUrgency, modelConfidence: round(conf), reason: base.reason + ` — model says ${modelUrgency} (${round(conf)}) but downgrade from ${input.ruleUrgency} not allowed` };
  }
  return {
    urgency,
    priorityScore: calculatePriorityScore(urgency, input.bloodType, input.daysRemaining),
    source: "model",
    modelUrgency,
    modelConfidence: round(conf),
    reason: `Rule ${input.ruleUrgency} → ${urgency}: model predicts ${modelUrgency} with ${round(conf)} confidence (max one-step adjustment)`,
  };
}

function round(x: number) {
  return Math.round(x * 100) / 100;
}
