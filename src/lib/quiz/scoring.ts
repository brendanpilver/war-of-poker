import { questions, totalQuestions, type ChoiceId } from "./reality-check";

/**
 * Quiz scoring and result interpretation.
 *
 * Pure: the same answers always produce the same result, with no storage or
 * network involved, so the funnel's most-used calculation is straightforward to
 * test. The interpretation text comments only on quiz performance -- it makes
 * no claim about the reader's game beyond these three hands.
 */

/** A reader's answers, keyed by question id. Absent means unanswered. */
export type QuizAnswers = Record<string, ChoiceId>;

export type QuizResult = {
  score: number;
  total: number;
  /** Ids of the questions answered incorrectly, in question order. */
  missedQuestionIds: string[];
  interpretation: string;
};

export function isCorrect(questionId: string, choiceId: ChoiceId | undefined): boolean {
  const question = questions.find((entry) => entry.id === questionId);
  return question !== undefined && question.correctChoiceId === choiceId;
}

/**
 * The bands come from the source material's own closing note: missing one is
 * "interesting", missing two means Hold'em instincts are still driving.
 */
function interpret(score: number): string {
  if (score === 3) {
    return "Three for three. You worked through each spot rather than reaching for the Hold'em answer — which is the habit the whole system is built on.";
  }
  if (score === 2) {
    return "Missing one of these is interesting. The reasoning is already mostly there; one input changed and the answer moved with it.";
  }
  return "Missing two means your Hold'em instincts are still driving, and in PLO they drive into traffic.";
}

export function scoreQuiz(answers: QuizAnswers): QuizResult {
  const missedQuestionIds = questions
    .filter((question) => !isCorrect(question.id, answers[question.id]))
    .map((question) => question.id);

  const score = totalQuestions - missedQuestionIds.length;

  return {
    score,
    total: totalQuestions,
    missedQuestionIds,
    interpretation: interpret(score),
  };
}

/** The lessons attached to the questions the reader got wrong. */
export function missedLessons(result: QuizResult): { title: string; lesson: string }[] {
  return result.missedQuestionIds.flatMap((id) => {
    const question = questions.find((entry) => entry.id === id);
    return question ? [{ title: question.title, lesson: question.lesson }] : [];
  });
}

/** True once every question has an answer. Gates the result screen. */
export function isComplete(answers: QuizAnswers): boolean {
  return questions.every((question) => answers[question.id] !== undefined);
}
