/**
 * The statistics the engine is allowed to use. All deterministic, all small.
 *
 * The central design choice: **the experimental unit is the content piece, not
 * the viewer.** A platform decides how far each video travels, so visitors
 * arriving from one video are not independent draws -- they share that
 * video's distribution. Pooling every visitor and running a two-proportion
 * test would treat a lucky video as hundreds of independent confirmations.
 * The inferential test is therefore a permutation test on per-piece values,
 * which asks only whether the arm labels matter, and pooled Wilson intervals
 * are reported as description, never as proof.
 */

/** Wilson score interval for a proportion. Well behaved at 0, 1 and small n. */
export function wilson(
  successes: number,
  trials: number,
  z = 1.96,
): { rate: number; low: number; high: number } {
  if (trials <= 0) return { rate: 0, low: 0, high: 1 };
  const p = successes / trials;
  const z2 = z * z;
  const denom = 1 + z2 / trials;
  const centre = (p + z2 / (2 * trials)) / denom;
  const half = (z * Math.sqrt((p * (1 - p)) / trials + z2 / (4 * trials * trials))) / denom;
  return { rate: p, low: Math.max(0, centre - half), high: Math.min(1, centre + half) };
}

/**
 * Newcombe's hybrid score interval for p2 - p1. Used for descriptive
 * period-over-period changes, where the unit really is the visitor.
 */
export function differenceInterval(
  x1: number,
  n1: number,
  x2: number,
  n2: number,
  z = 1.96,
): { diff: number; low: number; high: number } {
  const a = wilson(x1, n1, z);
  const b = wilson(x2, n2, z);
  const diff = b.rate - a.rate;
  const low = diff - Math.sqrt((b.rate - b.low) ** 2 + (a.high - a.rate) ** 2);
  const high = diff + Math.sqrt((b.high - b.rate) ** 2 + (a.rate - a.low) ** 2);
  return { diff, low, high };
}

function mean(values: number[]): number {
  return values.length === 0 ? 0 : values.reduce((s, v) => s + v, 0) / values.length;
}

/** n choose k, exact for the small sizes used here. */
export function choose(n: number, k: number): number {
  if (k < 0 || k > n) return 0;
  let result = 1;
  for (let i = 1; i <= Math.min(k, n - k); i++) {
    result = (result * (n - i + 1)) / i;
  }
  return Math.round(result);
}

/** Every k-subset of 0..n-1, as index arrays. */
function subsets(n: number, k: number): number[][] {
  const out: number[][] = [];
  const pick: number[] = [];
  const walk = (start: number) => {
    if (pick.length === k) {
      out.push([...pick]);
      return;
    }
    for (let i = start; i < n; i++) {
      pick.push(i);
      walk(i + 1);
      pick.pop();
    }
  };
  walk(0);
  return out;
}

/** Deterministic PRNG, so a Monte Carlo p-value is reproducible run to run. */
export function seededRandom(seed: string): () => number {
  let h = 1779033703 ^ seed.length;
  for (let i = 0; i < seed.length; i++) {
    h = Math.imul(h ^ seed.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  let state = h >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Fisher-Yates with a seeded generator. */
export function seededShuffle<T>(items: readonly T[], seed: string): T[] {
  const random = seededRandom(seed);
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

const EXACT_LIMIT = 50_000;
const MONTE_CARLO_DRAWS = 20_000;

/**
 * Two-sided permutation test for a difference in means, `mean(b) - mean(a)`.
 *
 * Exact when the number of relabellings is manageable (it always is at the
 * batch sizes the engine proposes), otherwise a seeded Monte Carlo
 * approximation. The p-value counts relabellings at least as extreme as the
 * observed one, observed included, so it is never zero.
 */
export function permutationTest(
  a: number[],
  b: number[],
  seed = "permutation",
): { diff: number; pValue: number; exact: boolean; relabellings: number } {
  const diff = mean(b) - mean(a);
  const pooled = [...a, ...b];
  const n = pooled.length;
  const k = b.length;
  if (a.length === 0 || b.length === 0) {
    return { diff, pValue: 1, exact: true, relabellings: 0 };
  }

  const total = pooled.reduce((s, v) => s + v, 0);
  const observed = Math.abs(diff);
  const tolerance = 1e-12;
  const statistic = (sumB: number) => Math.abs(sumB / k - (total - sumB) / (n - k));

  const count = choose(n, k);
  if (count <= EXACT_LIMIT) {
    let extreme = 0;
    for (const subset of subsets(n, k)) {
      const sumB = subset.reduce((s, i) => s + pooled[i], 0);
      if (statistic(sumB) >= observed - tolerance) extreme += 1;
    }
    return { diff, pValue: extreme / count, exact: true, relabellings: count };
  }

  const random = seededRandom(seed);
  let extreme = 1;
  for (let draw = 0; draw < MONTE_CARLO_DRAWS; draw++) {
    const order = [...pooled];
    for (let i = order.length - 1; i > 0; i--) {
      const j = Math.floor(random() * (i + 1));
      [order[i], order[j]] = [order[j], order[i]];
    }
    const sumB = order.slice(0, k).reduce((s, v) => s + v, 0);
    if (statistic(sumB) >= observed - tolerance) extreme += 1;
  }
  return { diff, pValue: extreme / (MONTE_CARLO_DRAWS + 1), exact: false, relabellings: count };
}

/**
 * The fewest pieces per arm at which a two-arm permutation test can reach
 * `alpha` at all. With three per arm the smallest possible two-sided p-value
 * is 2/20 = 0.1, so a 3-vs-3 test can never succeed at 0.05 however large the
 * effect. Four per arm gives 2/70 ≈ 0.029.
 */
export function minPiecesPerArm(alpha: number): number {
  for (let k = 2; k <= 20; k++) {
    if (2 / choose(2 * k, k) <= alpha) return k;
  }
  return 20;
}
