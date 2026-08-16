/**
 * Small, fast, seedable PRNG (mulberry32) plus the distributions the simulator
 * needs. Determinism matters: same seed ⇒ identical scenarios ⇒ identical
 * training data ⇒ reproducible model versions.
 */

export interface Rng {
  /** Uniform in [0, 1). */
  next(): number;
  /** Integer in [min, max] inclusive. */
  int(min: number, max: number): number;
  /** Uniform float in [min, max). */
  float(min: number, max: number): number;
  pick<T>(items: readonly T[]): T;
  bernoulli(p: number): boolean;
  gaussian(mean?: number, sd?: number): number;
  /** Log-normal by median and sigma (of the underlying normal). Always > 0. */
  lognormal(median: number, sigma: number): number;
  exponential(mean: number): number;
  /** Weighted choice: weights need not sum to 1. */
  weighted<T>(items: ReadonlyArray<{ value: T; weight: number }>): T;
  shuffle<T>(items: T[]): T[];
  /** Fork a child generator with a derived seed (keeps sub-streams independent). */
  fork(label: string): Rng;
  readonly seed: number;
}

function hashString(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function createRng(seed: number): Rng {
  let a = seed >>> 0;
  const next = (): number => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };

  let spareGaussian: number | null = null;

  const rng: Rng = {
    seed,
    next,
    int: (min, max) => Math.floor(next() * (max - min + 1)) + min,
    float: (min, max) => min + next() * (max - min),
    pick: (items) => items[Math.floor(next() * items.length)],
    bernoulli: (p) => next() < p,
    gaussian: (mean = 0, sd = 1) => {
      if (spareGaussian !== null) {
        const v = spareGaussian;
        spareGaussian = null;
        return mean + sd * v;
      }
      let u = 0;
      let v = 0;
      while (u === 0) u = next();
      while (v === 0) v = next();
      const mag = Math.sqrt(-2.0 * Math.log(u));
      spareGaussian = mag * Math.sin(2 * Math.PI * v);
      return mean + sd * mag * Math.cos(2 * Math.PI * v);
    },
    lognormal: (median, sigma) => median * Math.exp(rng.gaussian(0, sigma)),
    exponential: (mean) => -Math.log(1 - next()) * mean,
    weighted: (items) => {
      const total = items.reduce((s, i) => s + Math.max(0, i.weight), 0);
      let r = next() * total;
      for (const item of items) {
        r -= Math.max(0, item.weight);
        if (r <= 0) return item.value;
      }
      return items[items.length - 1].value;
    },
    shuffle: (items) => {
      for (let i = items.length - 1; i > 0; i--) {
        const j = Math.floor(next() * (i + 1));
        [items[i], items[j]] = [items[j], items[i]];
      }
      return items;
    },
    fork: (label) => createRng((seed ^ hashString(label)) >>> 0),
  };
  return rng;
}

/** Clamp helper used all over the behaviour models. */
export const clamp = (x: number, lo: number, hi: number): number => Math.min(hi, Math.max(lo, x));

export const sigmoid = (x: number): number => 1 / (1 + Math.exp(-x));
