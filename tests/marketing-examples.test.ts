import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { cards, type Card } from "../src/lib/poker/cards";
import { hands } from "../src/lib/quiz/hands";
import { exampleById, lensFactors, marketingExamples } from "../src/lib/experiments/examples";
import { hookLine } from "../src/lib/experiments/script";
import { hookTypes, lessonIds } from "../src/lib/experiments/spec";
import { paidCardRuns } from "./paid-examples.fixture";
import { handClass, holdsTheNuts } from "./plo-eval";

/**
 * The marketing example library, checked the way the Challenge is: no hand
 * may reuse paid inventory, the Challenge, or another example, and every
 * card fact the copy states is recomputed with the Omaha evaluator.
 */

const RANKS = new Set("AKQJT98765432");
const SUITS = new Set("shdc");

function key(list: Card[]): string {
  return list.map((c) => `${c.rank}${c.suit}`).sort().join(" ");
}

describe("marketing example library", () => {
  it("has unique ids and known lessons", () => {
    const ids = marketingExamples.map((e) => e.id);
    assert.equal(new Set(ids).size, ids.length);
    for (const example of marketingExamples) {
      assert.match(example.id, /^mx-\d{3}$/);
      assert.ok((lessonIds as readonly string[]).includes(example.lesson), example.id);
    }
  });

  it("uses legal cards with no duplicates", () => {
    for (const example of marketingExamples) {
      assert.equal(example.hand.length, 4, `${example.id} hand`);
      assert.ok(example.board.length >= 3 && example.board.length <= 5, `${example.id} board`);
      const all = [...example.hand, ...example.board];
      for (const card of all) {
        assert.ok(RANKS.has(card.rank) && SUITS.has(card.suit), `${example.id} card ${card.rank}${card.suit}`);
      }
      assert.equal(new Set(all.map((c) => `${c.rank}${c.suit}`)).size, all.length, `${example.id} duplicates`);
    }
  });

  it("reuses no holding or flop from the paid book, the Capstone Quiz or the Challenge", () => {
    const paid = new Set(paidCardRuns.map((run) => key(cards(run))));
    const paidFlops = new Set(paidCardRuns.map((run) => key(cards(run).slice(0, 3))));
    const challengeHoldings = new Set(
      hands.flatMap((h) => [h.hand, ...h.choices.map((c) => c.cards ?? [])]).filter((l) => l.length === 4).map(key),
    );
    const challengeFlops = new Set(hands.filter((h) => h.board.length >= 3).map((h) => key(h.board.slice(0, 3))));

    for (const example of marketingExamples) {
      const holding = key(example.hand);
      const flop = key(example.board.slice(0, 3));
      assert.ok(!paid.has(holding), `${example.id} reuses paid holding ${holding}`);
      assert.ok(!paidFlops.has(flop), `${example.id} reuses paid flop ${flop}`);
      assert.ok(!challengeHoldings.has(holding), `${example.id} reuses a Challenge holding`);
      assert.ok(!challengeFlops.has(flop), `${example.id} reuses a Challenge flop`);
    }
  });

  it("reuses no holding or flop from another example", () => {
    const seen = new Map<string, string>();
    for (const example of marketingExamples) {
      for (const k of [`hand:${key(example.hand)}`, `flop:${key(example.board.slice(0, 3))}`]) {
        assert.ok(!seen.has(k), `${example.id} repeats ${seen.get(k)}: ${k}`);
        seen.set(k, example.id);
      }
    }
  });

  it("answers with one of its own choices, and explains in lens order", () => {
    for (const example of marketingExamples) {
      assert.ok(example.choices.includes(example.answer), example.id);
      const order = example.beats.map((b) => lensFactors.indexOf(b.factor));
      assert.deepEqual(order, [...order].sort((a, b) => a - b), `${example.id} beats out of order`);
      assert.ok(example.beats.length > 0, `${example.id} explains nothing`);
    }
  });

  it("records a reviewer for every approved example and none for a candidate", () => {
    for (const example of marketingExamples) {
      const reviewed = example.provenance.reviewedBy !== null && example.provenance.reviewedOn !== null;
      assert.equal(reviewed, example.status === "approved", example.id);
      assert.ok(example.provenance.source.length > 0, `${example.id} cites no source`);
    }
  });

  it("gives every hook a line or declines it, never an empty one", () => {
    for (const example of marketingExamples) {
      for (const hook of hookTypes) {
        const line = hookLine(example, hook);
        if (line !== null) assert.ok(line.trim().length > 0, `${example.id} ${hook}`);
      }
    }
  });

  it("never calls a stack small", () => {
    for (const example of marketingExamples) {
      const text = JSON.stringify(example);
      assert.ok(!/\bsmall(er)? stack/i.test(text), example.id);
    }
  });
});

describe("mx-001 card facts", () => {
  const example = exampleById("mx-001");
  assert.ok(example);

  it("holds top set, which is the nuts on K-7-2 rainbow", () => {
    assert.equal(handClass(example.hand, example.board), "trips");
    assert.ok(holdsTheNuts(example.hand, example.board));
    assert.equal(new Set(example.board.map((c) => c.suit)).size, 3, "rainbow");
  });

  it("states pot, stack and SPR that follow from the action", () => {
    const blinds = 2 + 5;
    const open = 17; // pot-sized open: 5 to call + 12 in the pot
    assert.equal(open, 5 + (blinds + 5));
    const threeBet = 58; // pot-sized 3-bet: 17 to call + 41 in the pot
    assert.equal(threeBet, open + (blinds + open + open));
    assert.equal(example.pot, blinds + threeBet * 2);
    assert.equal(example.behind, 300 - threeBet);
    assert.equal(example.facing, example.pot, "a pot-sized bet");
    assert.equal(Math.round(example.behind / example.pot), 2);
    // A pot raise would be the call plus the pot after calling: more than is left.
    assert.ok(example.facing + (example.pot + 2 * example.facing) > example.behind);
  });

  it("quotes those numbers in its copy", () => {
    const text = JSON.stringify(example);
    for (const figure of ["$17", "$58", "$123", "$242"]) assert.ok(text.includes(figure), figure);
    assert.ok(example.beats.some((b) => b.factor === "SPR" && b.text.includes("SPR about 2")));
  });
});
