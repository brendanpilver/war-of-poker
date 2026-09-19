import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { questions, totalQuestions } from "../src/lib/quiz/reality-check";
import {
  isComplete,
  isCorrect,
  missedLessons,
  scoreQuiz,
  type QuizAnswers,
} from "../src/lib/quiz/scoring";

const allCorrect: QuizAnswers = Object.fromEntries(
  questions.map((question) => [question.id, question.correctChoiceId]),
);

/** Any answer other than the correct one for that question. */
function wrongAnswerFor(questionId: string) {
  const question = questions.find((entry) => entry.id === questionId);
  assert.ok(question, `no question ${questionId}`);
  const wrong = question.choices.find((c) => c.id !== question.correctChoiceId);
  assert.ok(wrong);
  return wrong.id;
}

describe("Reality Check content matches the approved source", () => {
  it("has exactly three hands", () => {
    assert.equal(totalQuestions, 3);
    assert.deepEqual(
      questions.map((q) => q.number),
      [1, 2, 3],
    );
  });

  it("carries the source's correct answers", () => {
    assert.deepEqual(
      questions.map((q) => q.correctChoiceId),
      ["B", "B", "C"],
    );
  });

  it("gives every question four distinct labelled choices", () => {
    for (const question of questions) {
      assert.deepEqual(
        question.choices.map((c) => c.id),
        ["A", "B", "C", "D"],
        `question ${question.number}`,
      );
    }
  });

  it("deals four hole cards and no duplicate card in any hand", () => {
    for (const question of questions) {
      assert.equal(question.hand.length, 4, `question ${question.number} hole cards`);
      const all = [...question.hand, ...question.board].map((c) => `${c.rank}${c.suit}`);
      assert.equal(
        new Set(all).size,
        all.length,
        `question ${question.number} deals a duplicate card`,
      );
    }
  });

  it("puts two hearts on the Question 1 flop, which the explanation relies on", () => {
    const [q1] = questions;
    assert.deepEqual(
      q1.board.map((c) => `${c.rank}${c.suit}`),
      ["9h", "8h", "6c"],
    );
    assert.ok(q1.explanation[0].includes("no heart"));
  });

  it("counts Question 2's outs table to the stated 19 unique cards", () => {
    const table = questions[1].outsTable;
    assert.ok(table, "question 2 has an outs table");
    const summed = table.rows.reduce((total, row) => total + row.count, 0);
    assert.equal(summed, table.total);
    assert.equal(table.total, 19);
  });

  it("marks Question 3's fourth board card as the turn", () => {
    const q3 = questions[2];
    assert.equal(q3.board.length, 4);
    assert.equal(q3.boardTurnIndex, 3);
  });

  it("gives every question a closing lesson", () => {
    for (const question of questions) {
      assert.ok(question.lesson.length > 0, `question ${question.number}`);
    }
  });
});

describe("scoreQuiz", () => {
  it("scores a perfect run", () => {
    const result = scoreQuiz(allCorrect);
    assert.equal(result.score, 3);
    assert.equal(result.total, 3);
    assert.deepEqual(result.missedQuestionIds, []);
  });

  it("scores an empty submission as zero rather than throwing", () => {
    const result = scoreQuiz({});
    assert.equal(result.score, 0);
    assert.equal(result.missedQuestionIds.length, 3);
  });

  it("reports which questions were missed, in question order", () => {
    const answers = { ...allCorrect, [questions[1].id]: wrongAnswerFor(questions[1].id) };
    const result = scoreQuiz(answers);
    assert.equal(result.score, 2);
    assert.deepEqual(result.missedQuestionIds, [questions[1].id]);
  });

  it("ignores answers to questions that do not exist", () => {
    const result = scoreQuiz({ ...allCorrect, "not-a-question": "A" });
    assert.equal(result.score, 3);
  });

  it("gives a different interpretation at each band", () => {
    const texts = [0, 1, 2, 3].map((score) => {
      const answers: QuizAnswers = { ...allCorrect };
      for (const question of questions.slice(score)) {
        answers[question.id] = wrongAnswerFor(question.id);
      }
      const result = scoreQuiz(answers);
      assert.equal(result.score, score);
      return result.interpretation;
    });
    assert.equal(new Set(texts).size, 3, "0 and 1 share the 'missing two' band");
  });
});

describe("missedLessons", () => {
  it("returns the lesson for each missed question", () => {
    const answers = { ...allCorrect, [questions[0].id]: wrongAnswerFor(questions[0].id) };
    const lessons = missedLessons(scoreQuiz(answers));
    assert.equal(lessons.length, 1);
    assert.equal(lessons[0].title, questions[0].title);
    assert.equal(lessons[0].lesson, questions[0].lesson);
  });

  it("returns nothing for a perfect run", () => {
    assert.deepEqual(missedLessons(scoreQuiz(allCorrect)), []);
  });
});

describe("isCorrect / isComplete", () => {
  it("rejects an unanswered question", () => {
    assert.equal(isCorrect(questions[0].id, undefined), false);
  });

  it("rejects an unknown question id", () => {
    assert.equal(isCorrect("not-a-question", "A"), false);
  });

  it("is complete only once every question is answered", () => {
    assert.equal(isComplete({}), false);
    assert.equal(isComplete({ [questions[0].id]: "A" }), false);
    assert.equal(isComplete(allCorrect), true);
  });
});
