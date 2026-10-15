import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  choose,
  differenceInterval,
  minPiecesPerArm,
  permutationTest,
  seededShuffle,
  wilson,
} from "../src/lib/experiments/stats";

describe("wilson interval", () => {
  it("matches a published value (10 of 100)", () => {
    const { low, high } = wilson(10, 100);
    assert.ok(Math.abs(low - 0.0552) < 0.001, `low ${low}`);
    assert.ok(Math.abs(high - 0.1744) < 0.001, `high ${high}`);
  });

  it("stays inside [0, 1] at the edges and with no trials", () => {
    assert.equal(wilson(0, 10).low, 0);
    assert.ok(wilson(0, 10).high > 0);
    assert.equal(wilson(10, 10).high, 1);
    assert.deepEqual(wilson(0, 0), { rate: 0, low: 0, high: 1 });
  });
});

describe("difference interval", () => {
  it("brackets the observed difference", () => {
    const { diff, low, high } = differenceInterval(20, 200, 40, 200);
    assert.ok(Math.abs(diff - 0.1) < 1e-9);
    assert.ok(low > 0 && high > diff);
  });
});

describe("permutation test", () => {
  it("gives the exact minimum p-value for complete separation, 4 vs 4", () => {
    const result = permutationTest([1, 2, 3, 4], [10, 11, 12, 13]);
    assert.equal(result.exact, true);
    assert.equal(result.relabellings, 70);
    assert.ok(Math.abs(result.pValue - 2 / 70) < 1e-12);
    assert.equal(result.diff, 9);
  });

  it("finds nothing in identical arms", () => {
    assert.equal(permutationTest([5, 5, 5, 5], [5, 5, 5, 5]).pValue, 1);
  });

  it("is deterministic when it falls back to Monte Carlo", () => {
    const a = Array.from({ length: 12 }, (_, i) => i);
    const b = Array.from({ length: 12 }, (_, i) => i + 3);
    const first = permutationTest(a, b, "seed");
    const second = permutationTest(a, b, "seed");
    assert.equal(first.exact, false);
    assert.equal(first.pValue, second.pValue);
  });
});

describe("batch sizing", () => {
  it("needs four pieces per arm at alpha 0.05, because three can never reach it", () => {
    assert.equal(2 / choose(6, 3), 0.1);
    assert.equal(minPiecesPerArm(0.05), 4);
  });
});

describe("seeded shuffle", () => {
  it("is reproducible and a permutation", () => {
    const items = ["a", "b", "c", "d", "e", "f"];
    assert.deepEqual(seededShuffle(items, "x"), seededShuffle(items, "x"));
    assert.deepEqual([...seededShuffle(items, "x")].sort(), items);
  });
});
