/**
 * Stable digests of a run — used by tests and by the sim-v2 reproduction
 * fixture (lib/sim/__fixtures__/sim-v2-hashes.json) to prove that changes to
 * the engine do not disturb existing RNG streams or event order.
 */

import { createHash } from "node:crypto";
import { toTrainingRows } from "./dataset";
import type { SimRunResult } from "./types";

/**
 * Feature keys added to existing tasks AFTER sim-v2 was frozen. They carry
 * their default value whenever the ladder is off, so the reproduction test
 * strips them before hashing rows; the events digest stays strict.
 */
export const POST_V2_FEATURE_KEYS: readonly string[] = [
  // alert_resolves_in_window (sim-v3): escalation-ladder state
  "escalationRung",
  "minutesSinceAlert",
  "previouslyNotified",
  // donor_* tasks: donor commitment release (production feature; constant 0 in sim)
  "priorReleases",
];

export function hashRows(result: SimRunResult, opts: { omitFeatureKeys?: readonly string[] } = {}): string {
  const omit = new Set(opts.omitFeatureKeys ?? []);
  const h = createHash("sha256");
  for (const r of toTrainingRows(result)) {
    if (omit.size === 0) {
      h.update(JSON.stringify(r));
      continue;
    }
    const features: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(r.features)) if (!omit.has(k)) features[k] = v;
    h.update(JSON.stringify({ ...r, features }));
  }
  return h.digest("hex");
}

export function hashEvents(result: SimRunResult): string {
  return createHash("sha256").update(JSON.stringify(result.events)).digest("hex");
}
