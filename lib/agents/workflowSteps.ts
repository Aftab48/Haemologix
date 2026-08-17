/**
 * WorkflowState.currentStep vocabulary — the single source of truth for the
 * per-alert workflow position, including the escalation ladder.
 *
 * `WorkflowState.currentStep` is a plain String column; historically each agent
 * wrote free strings. New code imports this union so the stepper, the scheduler
 * and the ladder agree on names.
 */

export const WORKFLOW_STEPS = [
  "shortage_detected",
  "donors_notified",
  "escalation_inventory",
  "fulfillment_in_progress",
  "donor_matched",
  "donor_arrived",
  "inventory_matched",
  "search_expanding",
  "network_broadcast",
  "escalated_manual",
  "completed",
  "window_expired",
] as const;

export type WorkflowStep = (typeof WORKFLOW_STEPS)[number];

/** Steps in which the escalation ladder owns the alert and the scheduler should keep advancing it. */
export const ESCALATING_STEPS: readonly WorkflowStep[] = ["search_expanding", "network_broadcast"];

/** Steps after which the workflow is finished (no more agent action). */
export const TERMINAL_STEPS: readonly WorkflowStep[] = ["completed", "window_expired"];

const LABELS: Record<WorkflowStep, string> = {
  shortage_detected: "Shortage detected",
  donors_notified: "Donors notified",
  escalation_inventory: "Inventory search",
  fulfillment_in_progress: "Fulfilment in progress",
  donor_matched: "Donor matched",
  donor_arrived: "Donor arrived",
  inventory_matched: "Inventory matched",
  search_expanding: "Expanding search",
  network_broadcast: "Network broadcast",
  escalated_manual: "Human escalation",
  completed: "Fulfilled",
  window_expired: "Window expired",
};

export function isWorkflowStep(value: unknown): value is WorkflowStep {
  return typeof value === "string" && (WORKFLOW_STEPS as readonly string[]).includes(value);
}

/** Human label for a step; unknown/legacy strings are title-cased. */
export function stepLabel(step: string): string {
  if (isWorkflowStep(step)) return LABELS[step];
  return step
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

/**
 * Ordered stages shown on the alert page. Each stage lists the steps that map to it,
 * so the stepper can highlight the current stage without hard-coding percentages.
 */
export const WORKFLOW_STAGES: ReadonlyArray<{ key: string; label: string; steps: readonly WorkflowStep[] }> = [
  { key: "detected", label: "Detected", steps: ["shortage_detected"] },
  { key: "local", label: "Local search", steps: ["donors_notified", "escalation_inventory"] },
  { key: "expanding", label: "Expanding search", steps: ["search_expanding"] },
  { key: "broadcast", label: "Network broadcast", steps: ["network_broadcast"] },
  { key: "fulfilment", label: "Fulfilment", steps: ["donor_matched", "donor_arrived", "inventory_matched", "fulfillment_in_progress"] },
  { key: "handoff", label: "Human escalation", steps: ["escalated_manual"] },
  { key: "done", label: "Closed", steps: ["completed", "window_expired"] },
];

// ---------------------------------------------------------------------------
// Escalation ladder state, stored under WorkflowState.metadata.escalation
// ---------------------------------------------------------------------------

export interface EscalationMeta {
  /** number of ladder rungs executed so far (0 = local search only) */
  rung: number;
  /** donor search radius currently in force (km) */
  donor_radius_km: number;
  /** every radius searched, in order, including the initial one */
  radius_history: number[];
  /** set once the network broadcast rung has run */
  broadcast_at?: string;
  broadcast_facility_ids?: string[];
  /** set once the alert was handed to a human coordinator */
  escalated_at?: string;
  last_advanced_at: string;
  /** what the ladder will do next / did last — user-facing sentence */
  next_action: string;
  /** true once every automated rung has been used */
  exhausted: boolean;
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

export function readEscalationMeta(metadata: unknown): EscalationMeta | null {
  if (!isRecord(metadata) || !isRecord(metadata.escalation)) return null;
  const e = metadata.escalation;
  if (typeof e.rung !== "number" || typeof e.donor_radius_km !== "number") return null;
  return {
    rung: e.rung,
    donor_radius_km: e.donor_radius_km,
    radius_history: Array.isArray(e.radius_history) ? e.radius_history.filter((x): x is number => typeof x === "number") : [e.donor_radius_km],
    broadcast_at: typeof e.broadcast_at === "string" ? e.broadcast_at : undefined,
    broadcast_facility_ids: Array.isArray(e.broadcast_facility_ids) ? e.broadcast_facility_ids.filter((x): x is string => typeof x === "string") : undefined,
    escalated_at: typeof e.escalated_at === "string" ? e.escalated_at : undefined,
    last_advanced_at: typeof e.last_advanced_at === "string" ? e.last_advanced_at : new Date(0).toISOString(),
    next_action: typeof e.next_action === "string" ? e.next_action : "",
    exhausted: e.exhausted === true,
  };
}
