import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { cards, type Card } from "../src/lib/poker/cards";
import { hands } from "../src/lib/quiz/hands";
import { paidCardRuns } from "./paid-examples.fixture";
import {
  bestHand,
  compare,
  equityAgainst,
  handClass,
  holdsTheNuts,
  unseen,
} from "./plo-eval";

/**
 * The challenge's card facts, checked independently of its explanations.
 *
 * Every claim the copy makes about what a hand holds -- its best hand, whether
 * it is the nuts, how many cards improve it, an equity quoted against a study
 * holding -- is recomputed here with an Omaha evaluator that uses exactly two
 * hole cards and exactly three board cards. A missed straight flush or a
 * Hold'em-style read of a board fails the build rather than reaching a player.
 */

function hand(id: string) {
  const found = hands.find((entry) => entry.id === id);
  assert.ok(found, `no hand ${id}`);
  return found;
}

function key(list: Card[]): string {
  return list
    .map((c) => `${c.rank}${c.suit}`)
    .sort()
    .join(" ");
}

function round(x: number): number {
  return Math.round(x * 1000) / 1000;
}

/** Next cards that make hero a straight, split by whether it is the nuts. */
function straightCards(hole: Card[], board: Card[]) {
  const nut: string[] = [];
  const beaten: string[] = [];
  for (const card of unseen(hole, board)) {
    const next = [...board, card];
    if (handClass(hole, next) !== "straight") continue;
    (holdsTheNuts(hole, next) ? nut : beaten).push(`${card.rank}${card.suit}`);
  }
  return { nut, beaten };
}

describe("challenge originality", () => {
  const paid = paidCardRuns.map((run) => key(cards(run)));
  const paidFlops = new Set(paidCardRuns.map((run) => key(cards(run).slice(0, 3))));

  it("reuses no holding printed in the paid book or Capstone Quiz", () => {
    for (const h of hands) {
      const holdings = [h.hand, ...h.choices.map((c) => c.cards ?? [])].filter(
        (list) => list.length === 4,
      );
      for (const holding of holdings) {
        assert.ok(!paid.includes(key(holding)), `hand ${h.number} reuses ${key(holding)}`);
      }
    }
  });

  it("reuses no flop printed in the paid book or Capstone Quiz", () => {
    for (const h of hands) {
      if (h.board.length < 3) continue;
      const flop = key(h.board.slice(0, 3));
      assert.ok(!paidFlops.has(flop), `hand ${h.number} reuses the flop ${flop}`);
    }
  });
});

describe("challenge card facts", () => {
  it("hand 1: the lone ten makes no straight; the hand is one pair", () => {
    const h = hand("you-hold-the-ten");
    assert.equal(handClass(h.hand, h.board), "pair");
    // A straight is available to the opponent, and J-T is the nuts.
    assert.equal(handClass(cards("Jh Ts 4c 3c"), h.board), "straight");
    assert.ok(holdsTheNuts(cards("Jh Ts 4c 3c"), h.board));
    // No flush is possible: only two clubs on board.
    assert.ok(bestHand(cards("Ac Kc Qd Jd"), h.board)[0] < 5);
  });

  it("hand 4: top two pair, beaten on the flop only by sets", () => {
    const h = hand("a-medium-hand-at-low-spr");
    assert.equal(handClass(h.hand, h.board), "two pair");
    assert.equal(round(equityAgainst(h.hand, cards("Ah Ac Qd Jh"), h.board)), 0.599);
    assert.equal(round(equityAgainst(h.hand, cards("Kc Qd Js Th"), h.board)), 0.651);
    assert.equal(round(equityAgainst(h.hand, cards("Jc Tc 8s 7d"), h.board)), 0.741);
    assert.equal(round(equityAgainst(h.hand, cards("9h 9d 7c 6h"), h.board)), 0.12);
    assert.equal(round(equityAgainst(h.hand, cards("4h 4d Ac 7h"), h.board)), 0.21);
  });

  it("hand 5: a flush that is not the nuts and has no one-card redraw", () => {
    const h = hand("you-flopped-a-flush");
    assert.equal(handClass(h.hand, h.board), "flush");
    assert.equal(holdsTheNuts(h.hand, h.board), false);
    // A single high diamond makes no flush: exactly two hole cards play.
    assert.ok(bestHand(cards("Ad Kc Qs Jh"), [...h.board, ...cards("2d 7c")])[0] < 5);
    // Any two diamonds with one above the six beat it now.
    const mine = bestHand(h.hand, h.board);
    for (const above of ["A", "K", "Q", "J", "9", "7"]) {
      const villain = cards(`${above}d 2d 5s 5c`);
      assert.ok(compare(bestHand(villain, h.board), mine) > 0, above);
    }
  });

  it("hand 6: thirteen straight cards, all the best straight, four of them hearts", () => {
    const h = hand("thirteen-straight-cards");
    const { nut, beaten } = straightCards(h.hand, h.board);
    assert.deepEqual(beaten.sort(), ["6h", "8h", "9h", "Jh"]);
    assert.equal(nut.length, 9);
    // And a straight flush becomes possible on every one of them.
    assert.equal(handClass(cards("9h 8h 2s 3s"), [...h.board, ...cards("6h")]), "straight flush");
    assert.equal(handClass(cards("9h 6h 2s 3s"), [...h.board, ...cards("8h")]), "straight flush");
    assert.equal(handClass(cards("8h 6h 2s 3s"), [...h.board, ...cards("9h")]), "straight flush");
    assert.equal(handClass(cards("9h 8h 2s 3s"), [...h.board, ...cards("Jh")]), "straight flush");
  });

  it("hand 7: fourteen rivers win against the study straight, and the sets", () => {
    const h = hand("price-the-check-raise");
    assert.equal(round(equityAgainst(h.hand, cards("7s 6h 4d 3s"), h.board)), 0.35);
    assert.equal(round(equityAgainst(h.hand, cards("9h 9d 6s 3d"), h.board)), 0.325);
    assert.equal(round(equityAgainst(h.hand, cards("8h 8s 6d 4c"), h.board)), 0.3);
    assert.equal(round(equityAgainst(h.hand, cards("7c 6c 4d 3s"), h.board)), 0.3);
    // The keyed price: $173 owed into a final $607.
    assert.ok(173 / 607 < 0.3);
  });

  it("hand 8: the flopped nuts is not the nuts on the turn, and is dead to a flush", () => {
    const h = hand("the-flush-card-arrives");
    assert.ok(holdsTheNuts(h.hand, h.board.slice(0, 3)));
    assert.equal(handClass(h.hand, h.board), "straight");
    assert.equal(holdsTheNuts(h.hand, h.board), false);
    assert.equal(equityAgainst(h.hand, cards("Ah 5h Kc 4d"), h.board), 0);
    assert.equal(round(equityAgainst(h.hand, cards("7c 7d Ac Qs"), h.board)), 0.75);
  });

  it("hand 9: bottom two pair, and T-9 is the only straight", () => {
    const h = hand("the-small-river-bet");
    assert.equal(handClass(h.hand, h.board), "two pair");
    assert.ok(holdsTheNuts(cards("Th 9h 4s 3c"), h.board));
    // A 7-6 draw that missed has nothing: not even a pair.
    assert.equal(handClass(cards("Kh 7h 6s 4c"), h.board), "high card");
  });

  it("hand 10: top pair plus seventeen straight cards, eleven of them the nuts", () => {
    const h = hand("blind-versus-blind");
    assert.equal(handClass(h.hand, h.board), "pair");
    const { nut, beaten } = straightCards(h.hand, h.board);
    assert.equal(nut.length + beaten.length, 17);
    assert.equal(nut.length, 11);
    assert.deepEqual(
      [...new Set(beaten.map((c) => c[0]))].sort(),
      ["J", "K"],
    );
    assert.equal(round(equityAgainst(h.hand, cards("Qd 8s 7s 3c"), h.board)), 0.85);
    assert.equal(round(equityAgainst(h.hand, cards("Td 9h 6s 5c"), h.board)), 0.7);
    assert.equal(round(equityAgainst(h.hand, cards("Ad 3d Th 6c"), h.board)), 0.7);
    assert.equal(round(equityAgainst(h.hand, cards("Qc Td 5s 5d"), h.board)), 0.425);
  });
});
