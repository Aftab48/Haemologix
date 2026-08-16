/**
 * Structured, template-based explanations. These replace the free-text LLM
 * "reasoning" with statements that cite the actual numbers a decision was made
 * on — traceable back to ModelPrediction rows and the deterministic inputs.
 */

import type { NotifyDecision } from "./policy/donorNotifyPolicy";
import type { InventoryDecision, TransportDecision } from "./policy/inventoryPolicy";
import type { UrgencyDecision } from "./policy/urgencyPolicy";
import type { EscalationDecision } from "./policy/escalationPolicy";
import type { EligibilityDecision } from "./policy/eligibilityPolicy";
import type { MlMode } from "./types";

export interface ExplainContext {
  mode: MlMode;
  modelVersion: string | null;
  fallbackReason?: string | null;
}

function head(kind: string, ctx: ExplainContext, source: "model" | "deterministic"): string {
  const via =
    source === "model" && ctx.modelVersion
      ? `${ctx.modelVersion}${ctx.mode === "authority" ? "" : ` (${ctx.mode} — deterministic decision applied)`}`
      : `deterministic rules${ctx.fallbackReason ? ` (model unavailable: ${ctx.fallbackReason})` : ""}`;
  return `[${kind} · ${via}]`;
}

export function explainNotification(d: NotifyDecision, ctx: ExplainContext, extra?: { eligible: number; urgency: string; unitsNeeded: number }): string {
  const parts = [head("Donor notification", ctx, d.source), d.reason];
  if (extra) parts.push(`Context: ${extra.eligible} eligible donors, urgency ${extra.urgency}, ${extra.unitsNeeded} unit(s) needed.`);
  if (d.perDonor && d.perDonor.length) {
    const top = d.perDonor.slice(0, 3).map((x) => `${x.id.slice(0, 8)}… P(accept)=${x.pAccept} P(show)=${x.pShow}`).join("; ");
    parts.push(`Top expected: ${top}.`);
  }
  if (d.triggerInventoryNow) parts.push("Inventory search triggered in parallel.");
  return parts.join(" ");
}

export function explainInventory(d: InventoryDecision, ctx: ExplainContext): string {
  const parts = [head("Inventory source", ctx, d.source), d.reason];
  if (d.alternatives && d.alternatives.length > 1) {
    parts.push(
      "Alternatives: " +
        d.alternatives.slice(1).map((a) => `${a.unitId.slice(0, 8)}… P(ok)=${a.pOk}, ~${a.predictedMinutes} min, score ${a.scoreFinal}`).join("; ") +
        "."
    );
  }
  return parts.join(" ");
}

export function explainTransport(d: TransportDecision, ctx: ExplainContext): string {
  return `${head("Transport", ctx, d.source)} ${d.reason}. Cold chain: ${d.coldChainCompliant ? "compliant" : "NOT compliant"}.`;
}

export function explainUrgency(d: UrgencyDecision, ctx: ExplainContext): string {
  return `${head("Urgency", ctx, d.source)} ${d.reason}. Priority score ${d.priorityScore}/100.`;
}

export function explainEscalation(d: EscalationDecision, ctx: ExplainContext): string {
  return `${head("Escalation", ctx, d.source)} ${d.reason}.${d.escalate ? ` Next: ${d.action.replace(/_/g, " ")}.` : ""}`;
}

export function explainEligibility(d: EligibilityDecision, ctx: ExplainContext): string {
  return `${head("Eligibility", ctx, d.source)} ${d.reason}.`;
}

/** Compact feature-importance sentence for dashboards. */
export function explainImportance(importance: Record<string, number> | undefined, top = 4): string | null {
  if (!importance) return null;
  const items = Object.entries(importance)
    .sort((a, b) => b[1] - a[1])
    .slice(0, top)
    .map(([k, v]) => `${k} (${Math.round(v * 100)}%)`);
  return items.length ? `Most influential features: ${items.join(", ")}.` : null;
}
