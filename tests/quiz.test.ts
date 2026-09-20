import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { fieldKit } from "../src/lib/field-kit";
import { conceptIds, concepts, materialsFor } from "../src/lib/quiz/concepts";
import { hands, totalHands } from "../src/lib/quiz/hands";
import {
  answeredCount,
  isComplete,
  isCorrect,
  missedPrinciples,
  scoreChallenge,
  type ChallengeAnswers,
} from "../src/lib/quiz/scoring";

const allCorrect: ChallengeAnswers = Object.fromEntries(
  hands.map((hand) => [hand.id, hand.correctChoiceId]),
);

/** Any answer other than the correct one for that hand. */
function wrongAnswerFor(handId: string) {
  const hand = hands.find((entry) => entry.id === handId);
  assert.ok(hand, `no hand ${handId}`);
  const wrong = hand.choices.find((c) => c.id !== hand.correctChoiceId);
  assert.ok(wrong);
  return wrong.id;
}

describe("challenge content", () => {
  it("has exactly ten hands, numbered in order", () => {
    assert.equal(totalHands, 10);
    assert.deepEqual(
      hands.map((h) => h.number),
      [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
    );
  });

  it("gives every hand a unique id", () => {
    const ids = hands.map((h) => h.id);
    assert.equal(new Set(ids).size, ids.length);
  });

  it("gives every hand four distinct labelled choices", () => {
    for (const hand of hands) {
      assert.deepEqual(
        hand.choices.map((c) => c.id),
        ["A", "B", "C", "D"],
        `hand ${hand.number}`,
      );
    }
  });

  it("points every correct answer at a choice that exists", () => {
    for (const hand of hands) {
      assert.ok(
        hand.choices.some((c) => c.id === hand.correctChoiceId),
        `hand ${hand.number}`,
      );
    }
  });

  it("deals no duplicate card within a hand, its board, or its options", () => {
    for (const hand of hands) {
      const dealt = [...hand.hand, ...hand.board].map((c) => `${c.rank}${c.suit}`);
      assert.equal(
        new Set(dealt).size,
        dealt.length,
        `hand ${hand.number} deals a duplicate card`,
      );

      for (const choice of hand.choices) {
        if (!choice.cards) continue;
        const option = choice.cards.map((c) => `${c.rank}${c.suit}`);
        assert.equal(option.length, 4, `hand ${hand.number} option ${choice.id}`);
        assert.equal(
          new Set(option).size,
          option.length,
          `hand ${hand.number} option ${choice.id} repeats a card`,
        );
      }
    }
  });

  it("deals four hole cards wherever a hero hand is shown", () => {
    for (const hand of hands) {
      if (hand.hand.length === 0) continue;
      assert.equal(hand.hand.length, 4, `hand ${hand.number} hole cards`);
    }
  });

  it("keeps every street break inside its board", () => {
    for (const hand of hands) {
      for (const index of hand.boardStreetBreaks ?? []) {
        assert.ok(
          index > 0 && index < hand.board.length,
          `hand ${hand.number} street break ${index}`,
        );
      }
    }
  });

  it("gives every hand a setup, a prompt, an explanation and a principle", () => {
    for (const hand of hands) {
      assert.ok(hand.setup.length > 0, `hand ${hand.number} setup`);
      assert.ok(hand.prompt.length > 0, `hand ${hand.number} prompt`);
      assert.ok(hand.explanation.length > 0, `hand ${hand.number} explanation`);
      assert.ok(hand.principle.length > 0, `hand ${hand.number} principle`);
      assert.ok(hand.facts.length > 0, `hand ${hand.number} facts`);
    }
  });

  it("keeps the three already-published free hands unchanged", () => {
    // These three are the approved FREE_3_HAND_PLO_QUIZ_RELEASE hands. Their
    // cards, options and answers are that document's and must not drift.
    const [aces] = hands;
    assert.equal(aces.id, "aces-on-a-rundown-board");
    assert.deepEqual(
      aces.board.map((c) => `${c.rank}${c.suit}`),
      ["9h", "8h", "6c"],
    );
    assert.ok(aces.explanation[0].includes("no heart"));
    assert.equal(aces.correctChoiceId, "B");

    const draw = hands[5];
    assert.equal(draw.id, "counting-a-big-draw");
    assert.equal(draw.correctChoiceId, "B");

    const turn = hands[7];
    assert.equal(turn.id, "the-turn-pairs-the-board");
    assert.equal(turn.correctChoiceId, "C");
    assert.equal(turn.board.length, 4);
    assert.deepEqual(turn.boardStreetBreaks, [3]);
  });

  it("counts the draw-quality outs table to the stated 19 unique cards", () => {
    const table = hands[5].outsTable;
    assert.ok(table, "hand 6 has an outs table");
    const summed = table.rows.reduce((total, row) => total + row.count, 0);
    assert.equal(summed, table.total);
    assert.equal(table.total, 19);
  });
});

describe("concepts", () => {
  it("names a real concept on every hand", () => {
    for (const hand of hands) {
      assert.ok(hand.concept in concepts, `hand ${hand.number}: ${hand.concept}`);
    }
  });

  it("exercises every concept exactly once, so the diagnostic is honest", () => {
    const used = hands.map((hand) => hand.concept);
    assert.equal(new Set(used).size, used.length, "a concept is tested twice");
    assert.deepEqual([...used].sort(), [...conceptIds].sort());
  });

  it("maps every concept onto Field Kit pieces that exist", () => {
    const kitIds = new Set(fieldKit.map((piece) => piece.id));
    for (const id of conceptIds) {
      const declared = concepts[id].materialIds;
      assert.ok(declared.length > 0, `${id} names no material`);
      for (const materialId of declared) {
        assert.ok(kitIds.has(materialId), `${id} names unknown piece ${materialId}`);
      }
      assert.equal(materialsFor(id).length, declared.length, `${id} resolution`);
    }
  });
});

describe("scoreChallenge", () => {
  it("scores a perfect run", () => {
    const result = scoreChallenge(allCorrect);
    assert.equal(result.score, 10);
    assert.equal(result.total, 10);
    assert.deepEqual(result.missedHandIds, []);
    assert.equal(result.strongConceptIds.length, 10);
    assert.deepEqual(result.watchConceptIds, []);
  });

  it("scores an empty submission as zero rather than throwing", () => {
    const result = scoreChallenge({});
    assert.equal(result.score, 0);
    assert.equal(result.missedHandIds.length, 10);
    assert.equal(result.watchConceptIds.length, 10);
    assert.deepEqual(result.strongConceptIds, []);
  });

  it("reports which hands were missed, in hand order", () => {
    const answers = {
      ...allCorrect,
      [hands[4].id]: wrongAnswerFor(hands[4].id),
      [hands[1].id]: wrongAnswerFor(hands[1].id),
    };
    const result = scoreChallenge(answers);
    assert.equal(result.score, 8);
    assert.deepEqual(result.missedHandIds, [hands[1].id, hands[4].id]);
    assert.deepEqual(result.watchConceptIds, [hands[1].concept, hands[4].concept]);
  });

  it("ignores answers to hands that do not exist", () => {
    const result = scoreChallenge({ ...allCorrect, "not-a-hand": "A" });
    assert.equal(result.score, 10);
  });

  it("splits the interpretation into four bands", () => {
    const texts = new Map<number, string>();
    for (let score = 0; score <= 10; score += 1) {
      const answers: ChallengeAnswers = { ...allCorrect };
      for (const hand of hands.slice(score)) {
        answers[hand.id] = wrongAnswerFor(hand.id);
      }
      const result = scoreChallenge(answers);
      assert.equal(result.score, score, `expected score ${score}`);
      texts.set(score, result.interpretation);
    }

    assert.equal(new Set(texts.values()).size, 4);
    // The lowest band must not tell anyone their score proves they need it.
    for (const text of texts.values()) {
      assert.ok(!/need this book|need the book/i.test(text), text);
    }
  });
});

describe("missedPrinciples", () => {
  it("returns the principle and concept for each missed hand", () => {
    const answers = { ...allCorrect, [hands[0].id]: wrongAnswerFor(hands[0].id) };
    const missed = missedPrinciples(scoreChallenge(answers));
    assert.equal(missed.length, 1);
    assert.equal(missed[0].title, hands[0].title);
    assert.equal(missed[0].principle, hands[0].principle);
    assert.equal(missed[0].concept, concepts[hands[0].concept].label);
  });

  it("returns nothing for a perfect run", () => {
    assert.deepEqual(missedPrinciples(scoreChallenge(allCorrect)), []);
  });
});

describe("isCorrect / isComplete / answeredCount", () => {
  it("rejects an unanswered hand", () => {
    assert.equal(isCorrect(hands[0].id, undefined), false);
  });

  it("rejects an unknown hand id", () => {
    assert.equal(isCorrect("not-a-hand", "A"), false);
  });

  it("is complete only once every hand is answered", () => {
    assert.equal(isComplete({}), false);
    assert.equal(isComplete({ [hands[0].id]: "A" }), false);
    assert.equal(isComplete(allCorrect), true);
  });

  it("counts answers given, right or wrong", () => {
    assert.equal(answeredCount({}), 0);
    assert.equal(
      answeredCount({ [hands[0].id]: "A", [hands[3].id]: wrongAnswerFor(hands[3].id) }),
      2,
    );
    assert.equal(answeredCount(allCorrect), 10);
  });
});
