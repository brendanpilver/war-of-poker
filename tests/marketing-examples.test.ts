import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { cards, type Card } from "../src/lib/poker/cards";
import { hands } from "../src/lib/quiz/hands";
import { exampleById, lensFactors, marketingExamples } from "../src/lib/experiments/examples";
import { DEFAULT_BASELINE } from "../src/lib/experiments/planner";
import { buildTimeline, hookLine } from "../src/lib/experiments/script";
import { hookTypes, lessonIds } from "../src/lib/experiments/spec";
import { paidCardRuns } from "./paid-examples.fixture";
import { bestHand, compare, equityAgainst, handClass, holdsTheNuts, unseen } from "./plo-eval";

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
    const flopPot = blinds + threeBet * 2;
    assert.equal(flopPot, 123);
    assert.equal(example.behind, 300 - threeBet);
    assert.equal(example.facing, flopPot, "a pot-sized bet");
    assert.equal(example.pot, flopPot + (example.facing ?? 0));
    assert.equal(Math.round(example.behind / flopPot), 2);
    // A pot raise would be the call plus the pot after calling: more than is left.
    assert.ok(flopPot + (flopPot + 2 * flopPot) > example.behind);
  });

  it("quotes those numbers in its copy", () => {
    const text = JSON.stringify(example);
    for (const figure of ["$17", "$58", "$123", "$242"]) assert.ok(text.includes(figure), figure);
    assert.ok(example.beats.some((b) => b.factor === "SPR" && b.text.includes("SPR about 2")));
  });
});

// ---------------------------------------------------------------------------
// The eight candidates for the first experiment, mx-002 to mx-009
// ---------------------------------------------------------------------------

function ex(id: string) {
  const found = exampleById(id);
  assert.ok(found, id);
  return found;
}

/** Rivers (or turns) after which hero holds the nuts. */
function nutCards(id: string): number {
  const e = ex(id);
  return unseen(e.hand, e.board).filter((card) => holdsTheNuts(e.hand, [...e.board, card])).length;
}

function beats(heroId: string, villain: string): boolean {
  const e = ex(heroId);
  return compare(bestHand(cards(villain), e.board), bestHand(e.hand, e.board)) > 0;
}

/** Pot-limit raise to: call `toCall`, then raise by the pot after calling. */
const potRaise = (potBefore: number, toCall: number) => toCall + (potBefore + toCall);
const pct = (x: number) => Math.round(x * 100);

const textOf = (id: string) => JSON.stringify(ex(id));

describe("candidate batch: pot-limit arithmetic", () => {
  it("mx-002: pot $53 three-way, SPR about 5, pot bet", () => {
    const flop = 2 + 17 * 3;
    assert.equal(flop, 53);
    const e = ex("mx-002");
    assert.equal(e.behind, 300 - 17);
    assert.equal(e.pot, flop + 53);
    assert.equal(Math.round(e.behind / flop), 5);
  });

  it("mx-003: open $15, pot 3-bet to $52, SPR about 2, all-in is the only raise", () => {
    assert.equal(potRaise(2 + 5 + 15, 15), 52);
    const flop = 2 + 5 + 52 * 2;
    assert.equal(flop, 111);
    const e = ex("mx-003");
    assert.equal(e.behind, 300 - 52);
    assert.equal(e.pot, flop * 2);
    assert.equal(Math.round(e.behind / flop), 2);
    assert.ok(potRaise(flop + 111, 111) > e.behind);
  });

  it("mx-004 and mx-005: four-way pot of $70", () => {
    assert.equal(2 + 17 * 4, 70);
    assert.equal(ex("mx-004").pot, 70 + 70 + 70);
    assert.equal(potRaise(70 + 70, 70), 280);
    assert.equal(ex("mx-005").pot, 70 + 70 + 280);
    assert.ok(ex("mx-005").behind >= 280);
  });

  it("mx-006 and mx-008: flop pot bet called, then the turn or river bet", () => {
    const turn = 41 + 41 * 2;
    assert.equal(turn, 123);
    assert.equal(ex("mx-006").pot, turn + 123);
    assert.equal(ex("mx-006").behind, 300 - 17 - 41);
    assert.equal(pct(123 / (246 + 123)), 33);
    assert.equal(ex("mx-008").pot, turn + 41);
    assert.equal(pct(41 / (164 + 41)), 20);
  });

  it("mx-007: half-pot turn bet needs 25%", () => {
    const flop = 2 + 17 * 2;
    assert.equal(flop, 36);
    assert.equal(ex("mx-007").pot, flop + 18);
    assert.equal(pct(18 / (54 + 18)), 25);
  });

  it("mx-009: big-blind defence, flop bet called, pot bet on the turn", () => {
    const flop = 2 + 17 * 2;
    const turn = flop + 36 * 2;
    assert.equal(turn, 108);
    const e = ex("mx-009");
    assert.equal(e.pot, turn + 108);
    assert.equal(e.behind, 300 - 17 - 36);
    assert.equal(pct(108 / (216 + 108)), 33);
  });

  it("every price stated in the copy is the arithmetic", () => {
    assert.match(textOf("mx-006"), /About 23%. The price needs 33%/);
    assert.match(textOf("mx-007"), /needs 25%/);
    assert.match(textOf("mx-008"), /Call \$41 to win \$205: you need 20%/);
    assert.match(textOf("mx-009"), /You need 33%/);
  });
});

describe("street pots", () => {
  it("match the action each example states, and SPR is measured against them", () => {
    const expected: Record<string, number> = {
      "mx-001": 2 + 5 + 58 * 2, "mx-002": 2 + 17 * 3, "mx-003": 2 + 5 + 52 * 2, "mx-004": 2 + 17 * 4,
      "mx-005": 2 + 17 * 4, "mx-006": 41 + 41 * 2, "mx-007": 2 + 17 * 2, "mx-008": 41 + 41 * 2, "mx-009": 36 + 36 * 2,
    };
    for (const [id, pot] of Object.entries(expected)) assert.equal(ex(id).streetPot, pot, id);
    for (const id of ["mx-001", "mx-002", "mx-003"]) {
      const e = ex(id);
      const stated = Number(/SPR about (\d+)/.exec(JSON.stringify(e))?.[1]);
      assert.equal(Math.round(e.behind / e.streetPot), stated, id);
    }
  });
});

describe("candidate batch: card facts", () => {
  it("mx-002: bare aces, no straight or flush draw, already beaten by J-9 and 9-6", () => {
    const e = ex("mx-002");
    assert.equal(handClass(e.hand, e.board), "pair");
    for (const card of unseen(e.hand, e.board)) {
      assert.ok(!["straight", "flush"].includes(handClass(e.hand, [...e.board, card])), `${card.rank}${card.suit}`);
    }
    assert.ok(beats("mx-002", "Js 9s 3c 3d"));
    assert.ok(beats("mx-002", "9c 6c Kd Ks"));
  });

  it("mx-003: no made hand, fifteen nut turns, 50.4% against top set", () => {
    const e = ex("mx-003");
    assert.equal(handClass(e.hand, e.board), "high card");
    assert.equal(nutCards("mx-003"), 15);
    const equity = equityAgainst(e.hand, cards("Qc Qs 7d 6d"), e.board);
    assert.ok(Math.abs(equity - 0.5037) < 0.0005, String(equity));
  });

  it("mx-004: nine spades make a flush and none makes the nuts", () => {
    const e = ex("mx-004");
    const spades = unseen(e.hand, e.board).filter((c) => c.suit === "s");
    assert.equal(spades.length, 9);
    for (const card of spades) {
      assert.equal(handClass(e.hand, [...e.board, card]), "flush");
      assert.ok(!holdsTheNuts(e.hand, [...e.board, card]));
    }
    for (const card of unseen(e.hand, e.board)) {
      assert.notEqual(handClass(e.hand, [...e.board, card]), "straight");
    }
  });

  it("mx-005: the low straight, beaten by T-9 and 9-5, 3.4% against T-9", () => {
    const e = ex("mx-005");
    assert.equal(handClass(e.hand, e.board), "straight");
    assert.ok(!holdsTheNuts(e.hand, e.board));
    assert.ok(beats("mx-005", "Ts 9h Jc 2d"));
    assert.ok(beats("mx-005", "9c 5c Qd Qs"));
    const equity = equityAgainst(e.hand, cards("Ts 9h Jc 2d"), e.board);
    assert.ok(Math.abs(equity - 0.0341) < 0.0005, String(equity));
  });

  it("mx-006: ten rivers give the nuts, about 23%", () => {
    assert.equal(nutCards("mx-006"), 10);
    assert.equal(pct(10 / 44), 23);
  });

  it("mx-007: rainbow turn, fourteen nut rivers, about 32%", () => {
    const e = ex("mx-007");
    assert.equal(new Set(e.board.map((c) => c.suit)).size, 4);
    assert.equal(nutCards("mx-007"), 14);
    assert.equal(pct(14 / 44), 32);
  });

  it("mx-008: top pair, beaten by a straight", () => {
    const e = ex("mx-008");
    assert.equal(handClass(e.hand, e.board), "pair");
    assert.ok(beats("mx-008", "8h 6h 2c 2s"));
  });

  it("mx-009: five rivers give the nuts, about 11%", () => {
    assert.equal(nutCards("mx-009"), 5);
    assert.equal(pct(5 / 44), 11);
  });
});

describe("candidate batch: fit and balance", () => {
  const batch = ["mx-002", "mx-003", "mx-004", "mx-005", "mx-006", "mx-007", "mx-008", "mx-009"].map(ex);

  it("covers four lessons, two hands each", () => {
    const counts = new Map<string, number>();
    for (const e of batch) counts.set(e.lesson, (counts.get(e.lesson) ?? 0) + 1);
    assert.deepEqual([...counts.values()], [2, 2, 2, 2]);
  });

  it("reads in 25 seconds under every hook", () => {
    for (const e of batch) {
      for (const hook of hookTypes) {
        const built = buildTimeline(
          {
            specVersion: 1, engineVersion: "t", contentId: null, series: "PRC", exampleId: e.id,
            settings: { ...DEFAULT_BASELINE, hook, lesson: e.lesson },
            experimentId: null, variant: null, recommendationId: null, publishOrder: null,
          },
          e,
        );
        assert.ok(built.ok, `${e.id} ${hook}: ${built.ok ? "" : built.error}`);
      }
    }
  });
});
