/**
 * Decision-quality scoring for a simulation run. Used to (a) compare policies
 * (deterministic vs learned) on identical scenarios and (b) build the
 * "decision quality" annotations the plan asks for.
 */

import type { AlertSummary, SimRunResult } from "./types";

export interface AlertQuality {
  alertId: string;
  resolved: boolean;
  outcome: AlertSummary["outcome"];
  minutesToResolve: number | null;
  unitsShortfall: number;
  donorsNotified: number;
  /** notified donors beyond what was needed to reach the target (goodwill cost) */
  wastedNotifications: number;
  noShowRate: number;
  acceptRate: number;
  escalated: boolean;
  qualityScore: number; // 0..100
}

export interface RunQuality {
  scenarioId: string;
  kind: string;
  policy: string;
  alerts: AlertQuality[];
  /** mean of alert qualityScore */
  qualityScore: number;
  resolvedRate: number;
  meanMinutesToResolve: number | null;
  totalNotified: number;
  violations: number;
}

export function scoreAlert(a: AlertSummary, windowMinutes: number): AlertQuality {
  const resolved = a.outcome === "FULFILLED";
  const shortfall = Math.max(0, a.unitsNeeded - a.unitsCollected);
  const noShowRate = a.accepted > 0 ? a.noShows / a.accepted : 0;
  const acceptRate = a.notified > 0 ? a.accepted / a.notified : 0;
  // A generous notion of "needed" notifications: 3 per unit still short from donors
  const reasonable = Math.max(10, a.unitsNeeded * 3);
  const wasted = Math.max(0, a.notified - reasonable);

  let score = 0;
  // 60 pts: outcome
  if (resolved) score += 60;
  else if (a.outcome === "PARTIAL") score += 25 * (a.unitsCollected / Math.max(1, a.unitsNeeded));
  else if (a.outcome === "ESCALATED") score += 10;
  // 25 pts: speed (only if resolved)
  if (resolved && a.minutesToResolve !== null) {
    score += 25 * Math.max(0, 1 - a.minutesToResolve / windowMinutes);
  }
  // 15 pts: efficiency (fewer wasted notifications, fewer no-shows)
  score += 15 * Math.max(0, 1 - wasted / 30) * (1 - 0.5 * noShowRate);

  return {
    alertId: a.alertId,
    resolved,
    outcome: a.outcome,
    minutesToResolve: a.minutesToResolve,
    unitsShortfall: shortfall,
    donorsNotified: a.notified,
    wastedNotifications: wasted,
    noShowRate: Math.round(noShowRate * 1000) / 1000,
    acceptRate: Math.round(acceptRate * 1000) / 1000,
    escalated: a.escalated,
    qualityScore: Math.round(Math.min(100, Math.max(0, score)) * 10) / 10,
  };
}

export function scoreRun(result: SimRunResult, windowHours = 6): RunQuality {
  const windowMinutes = windowHours * 60;
  const alerts = result.alerts.map((a) => scoreAlert(a, windowMinutes));
  const resolvedTimes = alerts.filter((a) => a.minutesToResolve !== null).map((a) => a.minutesToResolve as number);
  return {
    scenarioId: result.scenarioId,
    kind: result.kind,
    policy: result.policy,
    alerts,
    qualityScore: alerts.length ? Math.round((alerts.reduce((s, a) => s + a.qualityScore, 0) / alerts.length) * 10) / 10 : 0,
    resolvedRate: alerts.length ? alerts.filter((a) => a.resolved).length / alerts.length : 0,
    meanMinutesToResolve: resolvedTimes.length ? resolvedTimes.reduce((s, m) => s + m, 0) / resolvedTimes.length : null,
    totalNotified: alerts.reduce((s, a) => s + a.donorsNotified, 0),
    violations: result.violations.length,
  };
}

/** Aggregate many RunQuality objects (e.g. per policy) into a compact summary. */
export function aggregateQuality(runs: RunQuality[]) {
  const n = runs.length || 1;
  const alerts = runs.flatMap((r) => r.alerts);
  const byOutcome: Record<string, number> = {};
  for (const a of alerts) byOutcome[a.outcome] = (byOutcome[a.outcome] ?? 0) + 1;
  const times = alerts.filter((a) => a.minutesToResolve !== null).map((a) => a.minutesToResolve as number);
  return {
    runs: runs.length,
    alerts: alerts.length,
    meanQuality: Math.round((runs.reduce((s, r) => s + r.qualityScore, 0) / n) * 10) / 10,
    resolvedRate: alerts.length ? Math.round((alerts.filter((a) => a.resolved).length / alerts.length) * 1000) / 1000 : 0,
    meanMinutesToResolve: times.length ? Math.round(times.reduce((s, m) => s + m, 0) / times.length) : null,
    meanNotifiedPerAlert: alerts.length ? Math.round((alerts.reduce((s, a) => s + a.donorsNotified, 0) / alerts.length) * 10) / 10 : 0,
    meanNoShowRate: alerts.length ? Math.round((alerts.reduce((s, a) => s + a.noShowRate, 0) / alerts.length) * 1000) / 1000 : 0,
    escalatedRate: alerts.length ? Math.round((alerts.filter((a) => a.escalated).length / alerts.length) * 1000) / 1000 : 0,
    byOutcome,
    violations: runs.reduce((s, r) => s + r.violations, 0),
  };
}
