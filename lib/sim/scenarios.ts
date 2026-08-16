/**
 * Scenario factories.
 *
 *  A – insufficient donor pool             E – hospital-to-hospital transfer
 *  B – high acceptance, low attendance     F – multiple simultaneous emergencies
 *  C – donors arrive but supply still short G – complete failure of initial response
 *  D – blood-bank intervention fails        random – combinatorial sampler
 *
 * Every factory returns a ScenarioSpec; the engine does the rest.
 */

import { PRIORS } from "./priors";
import { createRng, type Rng } from "./rng";
import type { ScenarioSpec, Urgency } from "./types";

export const SCENARIO_KINDS = ["random", "A", "B", "C", "D", "E", "F", "G"] as const;
export type ScenarioKind = (typeof SCENARIO_KINDS)[number];

/** Spread scenario start times across hours/days so time features have support. */
function randomStart(rng: Rng): string {
  // Base week in 2026; treat as "local" time (engine reads UTC fields).
  const base = Date.UTC(2026, 7, 3, 0, 0, 0); // Mon 3 Aug 2026 00:00
  const day = rng.int(0, 27);
  // bias to daytime but keep nights
  const hour = rng.weighted([
    { value: rng.int(0, 5), weight: 1.2 },
    { value: rng.int(6, 9), weight: 2 },
    { value: rng.int(10, 16), weight: 4 },
    { value: rng.int(17, 20), weight: 3 },
    { value: rng.int(21, 23), weight: 1.5 },
  ]);
  return new Date(base + day * 86_400_000 + hour * 3_600_000 + rng.int(0, 59) * 60_000).toISOString();
}

const RARE = ["O-", "AB-", "B-", "A-"];

function baseWorld(rng: Rng) {
  return {
    hospitals: rng.int(3, 7),
    bloodBanks: rng.int(1, 3),
    donors: rng.int(60, 400),
    spreadKm: rng.float(15, 45),
  };
}

export function randomScenario(seed: number, id = `rand-${seed}`): ScenarioSpec {
  const rng = createRng(seed);
  const world = baseWorld(rng);
  const nAlerts = rng.weighted([
    { value: 1, weight: 0.8 },
    { value: 2, weight: 0.15 },
    { value: 3, weight: 0.05 },
  ]);
  const alerts = Array.from({ length: nAlerts }, (_, i) => ({
    hospitalIndex: rng.int(0, world.hospitals - 1),
    unitsNeeded: rng.int(1, 10),
    offsetMinutes: i === 0 ? 0 : rng.int(5, 120),
    ...(rng.bernoulli(0.25) ? { bloodType: rng.pick(RARE) } : {}),
    ...(rng.bernoulli(0.3) ? { urgency: rng.pick<Urgency>(["low", "medium", "high", "critical"]) } : {}),
  }));
  return {
    id,
    kind: "random",
    seed,
    startAt: randomStart(rng),
    windowHours: rng.pick([4, 6, 6, 8]),
    world: {
      ...world,
      inventoryLevel: rng.float(0.2, 1.4),
      acceptShift: rng.gaussian(0, 0.35),
      showShift: rng.gaussian(0, 0.3),
      transportFailureProb: rng.bernoulli(0.1) ? rng.float(0.1, 0.4) : undefined,
      usageMultiplier: rng.lognormal(1, 0.35),
    },
    alerts,
  };
}

/** A — Hospital needs many units; only a handful of suitable donors exist. */
export function scenarioA(seed: number, id = `A-${seed}`): ScenarioSpec {
  const rng = createRng(seed);
  const bloodType = rng.pick(["O-", "AB-", "B-"]);
  return {
    id,
    kind: "A",
    seed,
    startAt: randomStart(rng),
    windowHours: 6,
    world: {
      hospitals: rng.int(3, 5),
      bloodBanks: 1,
      donors: rng.int(40, 120),
      spreadKm: rng.float(20, 40),
      // very few compatible donors: force everyone incompatible except a handful
      donorBloodTypeWeights: { "AB+": 6, "A+": 4, "B+": 4, "O+": 1, [bloodType]: 0.35 },
      inventoryLevel: rng.float(0.5, 1.0),
    },
    alerts: [{ hospitalIndex: 0, bloodType, unitsNeeded: rng.int(8, 12), urgency: "critical" }],
  };
}

/** B — Many donors accept, few actually turn up. */
export function scenarioB(seed: number, id = `B-${seed}`): ScenarioSpec {
  const rng = createRng(seed);
  return {
    id,
    kind: "B",
    seed,
    startAt: randomStart(rng),
    windowHours: 6,
    world: {
      hospitals: rng.int(3, 6),
      bloodBanks: rng.int(1, 2),
      donors: rng.int(200, 400),
      spreadKm: rng.float(15, 30),
      acceptShift: rng.float(1.2, 2.0),
      showShift: rng.float(-2.2, -1.2),
      inventoryLevel: rng.float(0.4, 1.0),
    },
    alerts: [{ hospitalIndex: 0, unitsNeeded: rng.int(6, 10), urgency: rng.pick<Urgency>(["high", "critical"]) }],
  };
}

/** C — Everyone who accepts arrives, but the pool is smaller than the need. */
export function scenarioC(seed: number, id = `C-${seed}`): ScenarioSpec {
  const rng = createRng(seed);
  const bloodType = rng.pick(["A-", "B-", "O-"]);
  return {
    id,
    kind: "C",
    seed,
    startAt: randomStart(rng),
    windowHours: 6,
    world: {
      hospitals: rng.int(3, 6),
      bloodBanks: rng.int(1, 2),
      donors: rng.int(120, 220),
      spreadKm: rng.float(10, 20),
      // a handful of compatible donors (≈4-8), all keen and reliable
      donorBloodTypeWeights: { "AB+": 5, "A+": 4, "B+": 4, "O+": 2, [bloodType]: 0.7 },
      acceptShift: rng.float(2.7, 3.7),
      showShift: rng.float(2.5, 3.5),
      inventoryLevel: rng.float(0.6, 1.2),
    },
    alerts: [{ hospitalIndex: 0, bloodType, unitsNeeded: rng.int(9, 12), urgency: "high" }],
  };
}

/** D — Nearby blood banks are contacted but cannot provide compatible stock. */
export function scenarioD(seed: number, id = `D-${seed}`): ScenarioSpec {
  const rng = createRng(seed);
  return {
    id,
    kind: "D",
    seed,
    startAt: randomStart(rng),
    windowHours: 6,
    world: {
      hospitals: rng.int(3, 5),
      bloodBanks: rng.int(1, 3),
      donors: rng.int(30, 80),
      spreadKm: rng.float(20, 45),
      donorBloodTypeWeights: { "AB+": 6, "A+": 5, "B+": 5, "O+": 1, "O-": 0.2 },
      bloodBankReliability: 0,
      inventoryLevel: rng.float(0.5, 1.0),
      transferWillingness: rng.float(0.3, 0.7),
    },
    alerts: [{ hospitalIndex: 0, bloodType: "O-", unitsNeeded: rng.int(5, 9), urgency: "critical" }],
  };
}

/** E — Hospital B has compatible excess; hospital-to-hospital coordination should resolve it. */
export function scenarioE(seed: number, id = `E-${seed}`): ScenarioSpec {
  const rng = createRng(seed);
  return {
    id,
    kind: "E",
    seed,
    startAt: randomStart(rng),
    windowHours: 6,
    world: {
      hospitals: rng.int(3, 6),
      bloodBanks: 0,
      donors: rng.int(20, 60),
      spreadKm: rng.float(10, 25),
      donorBloodTypeWeights: { "AB+": 6, "A+": 5, "B+": 5, "O+": 1, "A-": 0.2 },
      guaranteeTransferSource: true,
      transferWillingness: 1,
      inventoryLevel: rng.float(0.3, 0.8),
    },
    alerts: [{ hospitalIndex: 0, bloodType: "A-", unitsNeeded: rng.int(3, 6), urgency: rng.pick<Urgency>(["high", "critical"]) }],
  };
}

/** F — Several hospitals need the same blood group at once. */
export function scenarioF(seed: number, id = `F-${seed}`): ScenarioSpec {
  const rng = createRng(seed);
  const hospitals = rng.int(4, 7);
  const bloodType = rng.pick(["O+", "B+", "A+", "O-"]);
  const n = rng.int(3, Math.min(5, hospitals));
  return {
    id,
    kind: "F",
    seed,
    startAt: randomStart(rng),
    windowHours: 6,
    world: {
      hospitals,
      bloodBanks: rng.int(1, 2),
      donors: rng.int(120, 300),
      spreadKm: rng.float(15, 35),
      inventoryLevel: rng.float(0.3, 0.9),
    },
    alerts: Array.from({ length: n }, (_, i) => ({
      hospitalIndex: i,
      bloodType,
      unitsNeeded: rng.int(3, 8),
      offsetMinutes: i * rng.int(3, 20),
      urgency: rng.pick<Urgency>(["high", "critical", "critical"]),
    })),
  };
}

/** G — Donors, hospitals and blood banks all fail; only escalation remains. */
export function scenarioG(seed: number, id = `G-${seed}`): ScenarioSpec {
  const rng = createRng(seed);
  return {
    id,
    kind: "G",
    seed,
    startAt: randomStart(rng),
    windowHours: 6,
    world: {
      hospitals: rng.int(3, 5),
      bloodBanks: rng.int(1, 2),
      donors: rng.int(30, 90),
      spreadKm: rng.float(25, 45),
      donorBloodTypeWeights: { "AB+": 6, "A+": 5, "B+": 5, "O+": 1, "AB-": 0.15 },
      acceptShift: rng.float(-2.5, -1.5),
      showShift: rng.float(-2, -1),
      inventoryLevel: 0.05,
      bloodBankReliability: 0,
      transferWillingness: 0,
      transportFailureProb: 0.5,
    },
    alerts: [{ hospitalIndex: 0, bloodType: "AB-", unitsNeeded: rng.int(6, 10), urgency: "critical" }],
  };
}

export const SCENARIO_FACTORIES: Record<ScenarioKind, (seed: number, id?: string) => ScenarioSpec> = {
  random: randomScenario,
  A: scenarioA,
  B: scenarioB,
  C: scenarioC,
  D: scenarioD,
  E: scenarioE,
  F: scenarioF,
  G: scenarioG,
};

/** Default mix used by `sim:run` when none is given (80% random, 20% edge cases). */
export const DEFAULT_MIX: Record<ScenarioKind, number> = {
  random: 0.72,
  A: 0.04,
  B: 0.04,
  C: 0.04,
  D: 0.04,
  E: 0.04,
  F: 0.04,
  G: 0.04,
};

export function pickKind(rng: Rng, mix: Partial<Record<ScenarioKind, number>> = DEFAULT_MIX): ScenarioKind {
  return rng.weighted(
    (Object.keys(mix) as ScenarioKind[]).map((k) => ({ value: k, weight: mix[k] ?? 0 }))
  );
}

/** Convenience: parse "random:0.8,A:0.05,B:0.05" into a mix. */
export function parseMix(s: string | undefined): Partial<Record<ScenarioKind, number>> {
  if (!s) return DEFAULT_MIX;
  const out: Partial<Record<ScenarioKind, number>> = {};
  for (const part of s.split(",")) {
    const [k, v] = part.split(":");
    if ((SCENARIO_KINDS as readonly string[]).includes(k)) out[k as ScenarioKind] = Number(v);
  }
  return out;
}

export { PRIORS };
