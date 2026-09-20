import { concepts, type ConceptId } from "./concepts";
import { hands, totalHands, type ChoiceId } from "./hands";

/**
 * Challenge scoring, and the diagnostic the results screen reads from.
 *
 * Pure: the same answers always produce the same result, with no storage or
 * network involved, so the funnel's most-used calculation stays easy to test.
 *
 * The interpretation comments on these ten decisions and nothing else. It does
 * not claim to have measured anyone's game, and no band tells a reader they
 * need the book.
 */

/** A player's answers, keyed by hand id. Absent means unanswered. */
export type ChallengeAnswers = Record<string, ChoiceId>;

export type ChallengeResult = {
  score: number;
  total: number;
  /** Ids of the hands answered incorrectly, in hand order. */
  missedHandIds: string[];
  /** Concepts whose hand was answered correctly, in hand order. */
  strongConceptIds: ConceptId[];
  /** Concepts whose hand was missed, in hand order. */
  watchConceptIds: ConceptId[];
  interpretation: string;
};

export function isCorrect(handId: string, choiceId: ChoiceId | undefined): boolean {
  const hand = hands.find((entry) => entry.id === handId);
  return hand !== undefined && hand.correctChoiceId === choiceId;
}

/**
 * Four bands. Wording is about the decisions just made, not about the reader:
 * a missed hand is an input that moved without the answer moving with it.
 */
function interpret(score: number): string {
  if (score >= 9) {
    return "You were working the decisions rather than reaching for the Hold'em answer, which is the habit the whole system is built on. What the system adds from here is speed and consistency — the same lens, applied the same way, when the game is loud and the clock is running.";
  }
  if (score >= 7) {
    return "Most of the reasoning is already there. The hands you missed are the ones where a single input moved and the answer should have moved with it — which is exactly what a repeatable process is for.";
  }
  if (score >= 4) {
    return "A solid core with some expensive gaps. These read less like knowledge gaps than habit gaps: a Hold'em answer arriving before the PLO question has finished being asked.";
  }
  return "Four hole cards genuinely change the game. Nothing here suggests you play badly — it suggests the inputs you are used to trusting are not the inputs that decide these hands. That is a fixable problem, and it is the one this system was written for.";
}

export function scoreChallenge(answers: ChallengeAnswers): ChallengeResult {
  const missedHandIds: string[] = [];
  const strongConceptIds: ConceptId[] = [];
  const watchConceptIds: ConceptId[] = [];

  for (const hand of hands) {
    if (isCorrect(hand.id, answers[hand.id])) {
      strongConceptIds.push(hand.concept);
    } else {
      missedHandIds.push(hand.id);
      watchConceptIds.push(hand.concept);
    }
  }

  const score = totalHands - missedHandIds.length;

  return {
    score,
    total: totalHands,
    missedHandIds,
    strongConceptIds,
    watchConceptIds,
    interpretation: interpret(score),
  };
}

/** The principles attached to the hands the player got wrong. */
export function missedPrinciples(
  result: ChallengeResult,
): { title: string; principle: string; concept: string }[] {
  return result.missedHandIds.flatMap((id) => {
    const hand = hands.find((entry) => entry.id === id);
    return hand
      ? [
          {
            title: hand.title,
            principle: hand.principle,
            concept: concepts[hand.concept].label,
          },
        ]
      : [];
  });
}

/** True once every hand has an answer. Gates the results screen. */
export function isComplete(answers: ChallengeAnswers): boolean {
  return hands.every((hand) => answers[hand.id] !== undefined);
}

/** How far through the challenge a set of answers is. */
export function answeredCount(answers: ChallengeAnswers): number {
  return hands.filter((hand) => answers[hand.id] !== undefined).length;
}
