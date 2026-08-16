/**
 * Compare policies on IDENTICAL scenarios (same seeds):
 *   deterministic-v0  vs  ml-policy(oracle)  vs  ml-policy(noisy oracle)
 *
 *   npx tsx scripts/sim/compare.ts --n 300 [--kind B] [--noise 0.15]
 *
 * The oracle knows the simulator's true behaviour → it is the CEILING a perfect
 * model could reach with this policy layer. The noisy oracle approximates a
 * realistic model. If even the oracle does not beat deterministic on a scenario
 * family, the *policy* needs work, not the model.
 */
import { runScenario } from "@/lib/sim/engine";
import { aggregateQuality, scoreRun, type RunQuality } from "@/lib/sim/metrics";
import { createModelPolicy, oraclePredictor } from "@/lib/sim/mlPolicy";
import { deterministicPolicy } from "@/lib/sim/policy";
import { createRng } from "@/lib/sim/rng";
import { DEFAULT_MIX, pickKind, SCENARIO_FACTORIES, type ScenarioKind } from "@/lib/sim/scenarios";

const argv = process.argv.slice(2);
const get = (k: string) => {
  const i = argv.indexOf(`--${k}`);
  return i >= 0 ? argv[i + 1] : undefined;
};
const n = Number(get("n") ?? 300);
const kind = (get("kind") as ScenarioKind | undefined) ?? null;
const noise = Number(get("noise") ?? 0.15);
const seed = Number(get("seed") ?? 99);

const rng = createRng(seed);
const det: RunQuality[] = [];
const oracle: RunQuality[] = [];
const noisy: RunQuality[] = [];
const byKind: Record<string, { det: RunQuality[]; oracle: RunQuality[]; noisy: RunQuality[] }> = {};

for (let i = 0; i < n; i++) {
  const k = kind ?? pickKind(rng, DEFAULT_MIX);
  const s = rng.int(1, 2 ** 31 - 1);
  const spec = SCENARIO_FACTORIES[k](s, `${k}-${i}-${s}`);
  const rD = scoreRun(runScenario(spec, { policy: deterministicPolicy, emitRows: false }), spec.windowHours);
  const rO = scoreRun(runScenario(spec, { policy: createModelPolicy(oraclePredictor(spec, 0, s), "ml-oracle"), emitRows: false }), spec.windowHours);
  const rN = scoreRun(runScenario(spec, { policy: createModelPolicy(oraclePredictor(spec, noise, s), "ml-noisy"), emitRows: false }), spec.windowHours);
  det.push(rD);
  oracle.push(rO);
  noisy.push(rN);
  const b = (byKind[k] ??= { det: [], oracle: [], noisy: [] });
  b.det.push(rD);
  b.oracle.push(rO);
  b.noisy.push(rN);
}

function row(label: string, q: ReturnType<typeof aggregateQuality>) {
  return `${label.padEnd(14)} quality=${String(q.meanQuality).padStart(5)}  resolved=${(q.resolvedRate * 100).toFixed(1).padStart(5)}%  ` +
    `t50=${String(q.meanMinutesToResolve ?? "-").padStart(4)}min  notified/alert=${String(q.meanNotifiedPerAlert).padStart(5)}  noShow=${(q.meanNoShowRate * 100).toFixed(1)}%  escalated=${(q.escalatedRate * 100).toFixed(1)}%`;
}

console.log(`\n=== ${n} scenarios${kind ? ` (kind ${kind})` : ""}, seed ${seed}, noise ${noise} ===`);
console.log(row("deterministic", aggregateQuality(det)));
console.log(row("ml-oracle", aggregateQuality(oracle)));
console.log(row("ml-noisy", aggregateQuality(noisy)));
console.log("\nper scenario kind (quality det → noisy → oracle):");
for (const k of Object.keys(byKind).sort()) {
  const b = byKind[k];
  console.log(`  ${k.padEnd(7)} n=${String(b.det.length).padStart(4)}  ${aggregateQuality(b.det).meanQuality} → ${aggregateQuality(b.noisy).meanQuality} → ${aggregateQuality(b.oracle).meanQuality}`);
}
