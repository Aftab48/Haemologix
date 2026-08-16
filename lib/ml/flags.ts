/**
 * Runtime configuration for the ML layer.
 *
 * Everything is env-driven so authority can be flipped per agent without a deploy:
 *   ML_MODE_DEFAULT=shadow            – applies to every agent unless overridden
 *   ML_MODE_DONOR=authority           – per-agent override (HOSPITAL, DONOR, COORDINATOR,
 *                                       INVENTORY, LOGISTICS, VERIFICATION)
 *   ML_API_URL, ML_API_SECRET, ML_TIMEOUT_MS – model service connection
 *
 * `env` is injectable so tests never touch process.env.
 */

import { ML_MODES, type MlMode } from "./types";

export type MlAgent =
  | "HOSPITAL"
  | "DONOR"
  | "COORDINATOR"
  | "INVENTORY"
  | "LOGISTICS"
  | "VERIFICATION";

export const ML_AGENTS: readonly MlAgent[] = [
  "HOSPITAL",
  "DONOR",
  "COORDINATOR",
  "INVENTORY",
  "LOGISTICS",
  "VERIFICATION",
];

type Env = Record<string, string | undefined>;

function parseMode(value: string | undefined): MlMode | null {
  if (!value) return null;
  const v = value.trim().toLowerCase();
  return (ML_MODES as readonly string[]).includes(v) ? (v as MlMode) : null;
}

/** Resolve the ML authority mode for one agent. Defaults to "shadow" when nothing is set. */
export function getMlMode(agent: MlAgent, env: Env = process.env): MlMode {
  return (
    parseMode(env[`ML_MODE_${agent}`]) ??
    parseMode(env.ML_MODE_DEFAULT) ??
    "shadow"
  );
}

/** True when the model service should be called at all for this agent. */
export function shouldCallModel(agent: MlAgent, env: Env = process.env): boolean {
  return getMlMode(agent, env) !== "off";
}

/** True when the policy decision (not the deterministic one) is what the agent acts on. */
export function policyHasAuthority(agent: MlAgent, env: Env = process.env): boolean {
  return getMlMode(agent, env) === "authority";
}

export interface MlConnection {
  apiUrl: string;
  apiSecret: string | null;
  timeoutMs: number;
}

export function getMlConnection(env: Env = process.env): MlConnection {
  const timeout = Number(env.ML_TIMEOUT_MS);
  return {
    apiUrl: (env.ML_API_URL || "http://localhost:8000").replace(/\/+$/, ""),
    apiSecret: env.ML_API_SECRET?.trim() || null,
    timeoutMs: Number.isFinite(timeout) && timeout > 0 ? timeout : 3000,
  };
}

/** Grace period (minutes) after expectedArrival before a donor is marked no-show. */
export function getNoShowGraceMinutes(env: Env = process.env): number {
  const v = Number(env.ML_NO_SHOW_GRACE_MIN);
  return Number.isFinite(v) && v > 0 ? v : 45;
}

/** Response window (minutes) after which un-answered notifications count as no response. */
export function getResponseWindowMinutes(env: Env = process.env): number {
  const v = Number(env.ML_RESPONSE_WINDOW_MIN);
  return Number.isFinite(v) && v > 0 ? v : 60;
}

/** Alert resolution window (hours) used for the alert_resolves_in_window label. */
export function getAlertWindowHours(env: Env = process.env): number {
  const v = Number(env.ML_ALERT_WINDOW_HOURS);
  return Number.isFinite(v) && v > 0 ? v : 6;
}
