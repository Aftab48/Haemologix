/**
 * Haemologix Blood-Emergency Simulator — CLI
 *
 *   npx tsx scripts/sim/run.ts --n 100000 --seed 42 --out ml/data/sim/v3 --version sim-v3
 *   npx tsx scripts/sim/run.ts --n 2000 --mix "random:0.5,A:0.1,B:0.1,C:0.1,D:0.05,E:0.05,F:0.05,G:0.05,H:0.02,I:0.01,J:0.01,K:0.01"
 *   npx tsx scripts/sim/run.ts --n 500 --kind B --quality        # policy quality report only
 *   npx tsx scripts/sim/run.ts --n 5000 --to-db                  # also upsert TrainingExample rows
 *   npx tsx scripts/sim/run.ts --n 1000 --no-ladder              # sim-v2 coordinator (no escalation ladder)
 *
 * Writes one JSONL per prediction task + manifest.json into --out.
 */
import "../ml/loadEnv";
import { execSync } from "node:child_process";
import path from "node:path";
import { PREDICTION_TASKS } from "@/lib/ml/types";
import { DatasetWriter, toTrainingRows } from "@/lib/sim/dataset";
import { runScenario } from "@/lib/sim/engine";
import { aggregateQuality, scoreRun, type RunQuality } from "@/lib/sim/metrics";
import { deterministicPolicy } from "@/lib/sim/policy";
import { PRIORS, priorsHash } from "@/lib/sim/priors";
import { createRng } from "@/lib/sim/rng";
import { DEFAULT_MIX, parseMix, pickKind, SCENARIO_FACTORIES, type ScenarioKind } from "@/lib/sim/scenarios";

interface Args {
  n: number;
  seed: number;
  out: string;
  mix: Partial<Record<ScenarioKind, number>>;
  kind: ScenarioKind | null;
  quality: boolean;
  toDb: boolean;
  datasetVersion: string;
  quiet: boolean;
  ladder: boolean;
}

function parseArgs(argv: string[]): Args {
  const get = (k: string) => {
    const i = argv.indexOf(`--${k}`);
    return i >= 0 ? argv[i + 1] : undefined;
  };
  const has = (k: string) => argv.includes(`--${k}`);
  const out = get("out") ?? "ml/data/sim/v1";
  return {
    n: Number(get("n") ?? 1000),
    seed: Number(get("seed") ?? 42),
    out,
    mix: get("mix") ? parseMix(get("mix")) : DEFAULT_MIX,
    kind: (get("kind") as ScenarioKind | undefined) ?? null,
    quality: has("quality"),
    toDb: has("to-db"),
    datasetVersion: get("version") ?? path.basename(out),
    quiet: has("quiet"),
    ladder: !has("no-ladder"),
  };
}

function gitSha(): string | undefined {
  try {
    return execSync("git rev-parse --short HEAD", { stdio: ["ignore", "pipe", "ignore"] }).toString().trim();
  } catch {
    return undefined;
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const rng = createRng(args.seed);
  const t0 = Date.now();
  const writer = args.quality ? null : new DatasetWriter(args.out);
  const qualities: RunQuality[] = [];
  const kindCounts: Record<string, number> = {};
  const outcomeCounts: Record<string, number> = {};
  let violations = 0;
  let rows = 0;

  let dbRows: Array<Record<string, unknown>> = [];
  let db: typeof import("@/db").db | null = null;
  if (args.toDb) {
    db = (await import("@/db")).db;
  }

  for (let i = 0; i < args.n; i++) {
    const kind = args.kind ?? pickKind(rng, args.mix);
    const seed = rng.int(1, 2 ** 31 - 1);
    const spec = SCENARIO_FACTORIES[kind](seed, `${kind}-${i}-${seed}`);
    const result = runScenario(spec, { policy: deterministicPolicy, emitRows: !args.quality, ladder: args.ladder });
    kindCounts[kind] = (kindCounts[kind] ?? 0) + 1;
    for (const a of result.alerts) outcomeCounts[a.outcome] = (outcomeCounts[a.outcome] ?? 0) + 1;
    violations += result.violations.length;
    if (result.violations.length && !args.quiet) console.warn(`[sim] ${spec.id}: ${result.violations.join("; ")}`);
    qualities.push(scoreRun(result, spec.windowHours));

    if (writer) {
      const trs = toTrainingRows(result);
      writer.write(trs);
      rows += trs.length;
      if (db) {
        for (const r of trs) {
          dbRows.push({
            taskType: r.task,
            inputFeatures: r.features,
            outputLabel: { label: r.label },
            outcome: r.meta ?? {},
            requestId: r.groupId,
            source: "sim",
            scenarioId: r.groupId,
            datasetVersion: args.datasetVersion,
            createdAt: new Date(r.eventTime),
          });
        }
        if (dbRows.length >= 2000) {
          await db.trainingExample.createMany({ data: dbRows as never });
          dbRows = [];
        }
      }
    }
    if (!args.quiet && (i + 1) % Math.max(1, Math.floor(args.n / 20)) === 0) {
      const el = ((Date.now() - t0) / 1000).toFixed(1);
      console.log(`[sim] ${i + 1}/${args.n} scenarios (${rows} rows, ${el}s)`);
    }
  }
  if (db && dbRows.length) await db.trainingExample.createMany({ data: dbRows as never });
  if (db) await db.$disconnect();

  const agg = aggregateQuality(qualities);
  console.log("\n[sim] scenario mix:", kindCounts);
  console.log("[sim] outcomes:", outcomeCounts);
  console.log("[sim] deterministic policy quality:", agg);
  if (violations > 0) console.error(`[sim] ⚠ ${violations} hard-constraint violations`);

  if (writer) {
    const manifest = await writer.close({
      datasetVersion: args.datasetVersion,
      createdAt: new Date().toISOString(),
      source: "sim",
      seed: args.seed,
      scenarioMix: kindCounts,
      priorsHash: priorsHash(PRIORS),
      priorsVersion: PRIORS.version,
      ladder: args.ladder,
      gitSha: gitSha(),
      notes: `Generated by scripts/sim/run.ts with policy=${deterministicPolicy.name}; priors ${PRIORS.version}; escalation ladder ${args.ladder ? "on" : "off"}`,
    });
    console.log(`\n[sim] wrote ${rows} rows to ${args.out}`);
    for (const t of PREDICTION_TASKS) if (manifest.rows[t]) console.log(`   ${t.padEnd(26)} ${manifest.rows[t]}`);
  }
  console.log(`[sim] done in ${((Date.now() - t0) / 1000).toFixed(1)}s`);
  if (violations > 0) process.exit(2);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
