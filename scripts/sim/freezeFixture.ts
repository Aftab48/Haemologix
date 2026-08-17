/**
 * Freeze the row/event digests of a fixed set of scenarios into
 * lib/sim/__fixtures__/sim-v2-hashes.json.
 *
 * Run ONCE on the pre-ladder engine (sim-v2 behaviour). The test
 * "ladder off reproduces sim-v2 rows" then guarantees later engine changes
 * leave every existing RNG stream untouched when the ladder is disabled.
 *
 *   npx tsx --tsconfig tsconfig.json scripts/sim/freezeFixture.ts
 */

import fs from "node:fs";
import path from "node:path";
import { runScenario } from "../../lib/sim/engine";
import { hashEvents, hashRows } from "../../lib/sim/hash";
import { randomScenario, scenarioA, scenarioB, scenarioC, scenarioD, scenarioE, scenarioF, scenarioG } from "../../lib/sim/scenarios";
import type { ScenarioSpec } from "../../lib/sim/types";

export const FIXTURE_SPECS: Array<{ key: string; spec: ScenarioSpec }> = [
  ...[4242, 1, 2, 99].map((s) => ({ key: `random-${s}`, spec: randomScenario(s) })),
  { key: "A-3", spec: scenarioA(3) },
  { key: "B-3", spec: scenarioB(3) },
  { key: "C-3", spec: scenarioC(3) },
  { key: "D-3", spec: scenarioD(3) },
  { key: "E-3", spec: scenarioE(3) },
  { key: "F-3", spec: scenarioF(3) },
  { key: "G-3", spec: scenarioG(3) },
];

function main() {
  const out: Record<string, { rows: string; events: string }> = {};
  for (const { key, spec } of FIXTURE_SPECS) {
    const r = runScenario(spec, { ladder: false });
    out[key] = { rows: hashRows(r), events: hashEvents(r) };
    console.log(`${key}: rows ${out[key].rows.slice(0, 12)}… events ${out[key].events.slice(0, 12)}…`);
  }
  const file = path.join(__dirname, "..", "..", "lib", "sim", "__fixtures__", "sim-v2-hashes.json");
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify({ frozenFrom: "sim-v2 engine (pre-ladder), priors-v2", hashes: out }, null, 2) + "\n");
  console.log(`wrote ${file}`);
}

main();
