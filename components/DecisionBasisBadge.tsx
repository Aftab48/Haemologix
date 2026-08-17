"use client";

import { Badge } from "@/components/ui/badge";

/**
 * Honest provenance chip for an agent decision.
 *
 * Renders one of:
 *   "Model · 72%"                       – the model's decision was acted on (confidence shown)
 *   "Deterministic rule"                – rule path (model not consulted, or consulted in shadow)
 *   "Rule fallback — model unavailable" – model call failed; rules acted
 *
 * A rule is not "100% confident" — it is a rule. So a percentage is shown only
 * when decision_method === "model". Older rows without decision_method fall
 * back to: fallback_reason → rule fallback; numeric confidence → model %.
 */
export interface DecisionBasisProps {
  decisionMethod?: string | null;
  modelConfidence?: number | null;
  /** legacy column value, used only when decisionMethod is absent */
  confidence?: number | null;
  fallbackReason?: string | null;
  className?: string;
}

export function describeDecisionBasis(p: DecisionBasisProps): { label: string; tone: "model" | "rule" | "fallback" } {
  const method =
    p.decisionMethod ??
    (p.fallbackReason && p.fallbackReason !== "ml_mode_off" ? "deterministic_fallback" : typeof p.confidence === "number" ? "model" : "deterministic");
  const conf = typeof p.modelConfidence === "number" ? p.modelConfidence : p.decisionMethod ? null : typeof p.confidence === "number" ? p.confidence : null;
  if (method === "model") {
    return { label: conf !== null ? `Model · ${Math.round(conf * 100)}%` : "Model", tone: "model" };
  }
  if (method === "deterministic_fallback") {
    return { label: "Rule fallback — model unavailable", tone: "fallback" };
  }
  return { label: "Deterministic rule", tone: "rule" };
}

const TONE: Record<"model" | "rule" | "fallback", string> = {
  model: "bg-green-600/20 text-green-300 border-green-600",
  rule: "bg-slate-500/20 text-slate-200 border-slate-500",
  fallback: "bg-amber-600/20 text-amber-200 border-amber-600",
};

export default function DecisionBasisBadge(p: DecisionBasisProps) {
  const { label, tone } = describeDecisionBasis(p);
  return (
    <Badge variant="outline" className={`text-xs ${TONE[tone]} ${p.className ?? ""}`}>
      {label}
    </Badge>
  );
}
