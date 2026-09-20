"use client";

import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { track } from "@/lib/analytics/track";
import { hands, totalHands, type ChoiceId } from "@/lib/quiz/hands";
import {
  answeredCount,
  scoreChallenge,
  type ChallengeAnswers,
} from "@/lib/quiz/scoring";
import { ChallengeHandCard } from "./challenge-hand";
import { ChallengeResult } from "./challenge-result";

/**
 * The challenge's state machine: one hand at a time, then the results.
 *
 * Progress is written to `sessionStorage` after every answer. Ten hands is a
 * long enough commitment that losing it to an accidental reload or a tapped
 * link is a real cost, and most of this traffic is a phone. Session scope
 * rather than local is deliberate: a run abandoned days ago should not
 * resurface and produce a score nobody remembers earning.
 *
 * Restoring is offered rather than applied. Silently dropping someone back on
 * hand 7 is disorienting, and reading storage during the first render would
 * make the server's HTML and the client's disagree. `useSyncExternalStore`
 * reports the saved run only once hydration is done, and the reader decides.
 *
 * Every storage access is guarded -- private mode and embedded browsers throw,
 * and none of this is worth a blank page.
 */

const STORAGE_KEY = "wop.challenge";

type StoredProgress = {
  index: number;
  answers: ChallengeAnswers;
  finished: boolean;
};

function safeStorage(): Storage | null {
  try {
    return window.sessionStorage;
  } catch {
    return null;
  }
}

function subscribeToStorage(onChange: () => void): () => void {
  // Only fires for writes from another tab; our own writes deliberately do not
  // re-offer a resume to the run currently in progress.
  window.addEventListener("storage", onChange);
  return () => window.removeEventListener("storage", onChange);
}

function readRaw(): string | null {
  try {
    return safeStorage()?.getItem(STORAGE_KEY) ?? null;
  } catch {
    return null;
  }
}

/**
 * Rebuild from the hands rather than trusting the stored keys, so a run saved
 * by an earlier version of the challenge cannot inject an unknown hand id or a
 * choice that no longer exists.
 */
function parseProgress(raw: string | null): StoredProgress | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<StoredProgress>;
    const stored = parsed.answers ?? {};
    const answers: ChallengeAnswers = {};
    for (const hand of hands) {
      const choice = stored[hand.id];
      if (hand.choices.some((option) => option.id === choice)) {
        answers[hand.id] = choice as ChoiceId;
      }
    }
    if (Object.keys(answers).length === 0) return null;

    const index =
      typeof parsed.index === "number" &&
      Number.isInteger(parsed.index) &&
      parsed.index >= 0 &&
      parsed.index < totalHands
        ? parsed.index
        : 0;

    return { index, answers, finished: parsed.finished === true };
  } catch {
    return null;
  }
}

function writeProgress(progress: StoredProgress): void {
  try {
    safeStorage()?.setItem(STORAGE_KEY, JSON.stringify(progress));
  } catch {
    // Non-fatal: the run simply won't survive a reload.
  }
}

function clearProgress(): void {
  try {
    safeStorage()?.removeItem(STORAGE_KEY);
  } catch {
    // Non-fatal.
  }
}

export function Challenge() {
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<ChallengeAnswers>({});
  const [finished, setFinished] = useState(false);
  const [resumeDismissed, setResumeDismissed] = useState(false);

  const started = useRef(false);
  const viewed = useRef(new Set<string>());
  const headingRef = useRef<HTMLDivElement>(null);
  const movedRef = useRef(false);

  const hand = hands[index];
  const answered = answeredCount(answers);

  const savedRaw = useSyncExternalStore(subscribeToStorage, readRaw, () => null);
  const saved = useMemo(() => parseProgress(savedRaw), [savedRaw]);
  const canResume = saved !== null && !resumeDismissed && answered === 0 && !finished;

  useEffect(() => {
    // Nothing worth restoring until an answer exists, and writing before that
    // would offer a resume to a run that never started.
    if (answered === 0 && !finished) return;
    writeProgress({ index, answers, finished });
  }, [index, answers, finished, answered]);

  useEffect(() => {
    if (finished) return;
    if (viewed.current.has(hand.id)) return;
    viewed.current.add(hand.id);
    track("quiz_question_viewed", {
      hand_id: hand.id,
      hand_number: hand.number,
      concept: hand.concept,
    });
  }, [finished, hand]);

  useEffect(() => {
    // Moving between hands changes the whole panel; without this the reader is
    // left scrolled at the previous hand's explanation.
    if (!movedRef.current) return;
    headingRef.current?.scrollIntoView({ block: "start", behavior: "smooth" });
  }, [index, finished]);

  function handleAnswer(choiceId: ChoiceId) {
    if (answers[hand.id] !== undefined) return;

    if (!started.current) {
      started.current = true;
      track("quiz_started", { quiz: "ten-hand-challenge" });
    }

    setAnswers((previous) => ({ ...previous, [hand.id]: choiceId }));
    track("quiz_question_answered", {
      hand_id: hand.id,
      hand_number: hand.number,
      concept: hand.concept,
      choice: choiceId,
      correct: choiceId === hand.correctChoiceId,
    });
  }

  function handleNext() {
    movedRef.current = true;
    if (index < hands.length - 1) {
      setIndex(index + 1);
      return;
    }

    const result = scoreChallenge(answers);
    track("quiz_completed", {
      score: result.score,
      total: result.total,
      missed: result.missedHandIds.join(",") || null,
    });
    setFinished(true);
  }

  function handleResume() {
    if (!saved) return;
    movedRef.current = true;
    started.current = true;
    // A restored hand has already been recorded as reached.
    viewed.current = new Set(Object.keys(saved.answers));
    setAnswers(saved.answers);
    setIndex(saved.index);
    setFinished(saved.finished);
  }

  function handleRestart() {
    movedRef.current = true;
    started.current = false;
    viewed.current = new Set();
    clearProgress();
    setResumeDismissed(true);
    setAnswers({});
    setIndex(0);
    setFinished(false);
  }

  return (
    <div ref={headingRef} className="scroll-mt-[5.75rem] md:scroll-mt-20">
      {canResume && saved && (
        <div className="mb-7 flex flex-col gap-4 border border-line bg-ink-card p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
          <p className="text-[15px] leading-snug text-pretty text-bone">
            You have a run in progress —{" "}
            <span className="text-bone-muted">
              {saved.finished
                ? "you reached the results"
                : `you were on hand ${hands[saved.index].number} of ${totalHands}`}
              .
            </span>
          </p>
          <div className="flex shrink-0 gap-3">
            <button
              type="button"
              onClick={handleResume}
              className="rounded-[2px] bg-gold px-4 py-2.5 text-sm font-semibold whitespace-nowrap text-ink transition-colors duration-150 hover:bg-gold-light active:translate-y-px"
            >
              Pick it back up
            </button>
            <button
              type="button"
              onClick={handleRestart}
              className="rounded-[2px] border border-line px-4 py-2.5 text-sm font-semibold whitespace-nowrap text-bone-muted transition-colors duration-150 hover:border-bone-faint hover:text-bone active:translate-y-px"
            >
              Start over
            </button>
          </div>
        </div>
      )}

      {!finished && (
        <div className="mb-7 sm:mb-8">
          <div className="flex items-baseline justify-between">
            <p className="font-mono text-[11px] tracking-[0.18em] text-bone-faint uppercase">
              Hand {hand.number} of {totalHands}
            </p>
            <p className="font-mono text-[11px] tracking-[0.18em] text-bone-faint tabular-nums uppercase">
              {answered} answered
            </p>
          </div>
          <ol aria-label="Progress" className="mt-2.5 flex items-center gap-1">
            {hands.map((entry, position) => {
              const done = answers[entry.id] !== undefined;
              const current = position === index;
              return (
                <li
                  key={entry.id}
                  aria-current={current ? "step" : undefined}
                  className={`h-1 flex-1 rounded-full ${
                    done ? "bg-gold" : current ? "bg-bone-faint" : "bg-line"
                  }`}
                >
                  <span className="sr-only">
                    {`Hand ${entry.number}: ${done ? "answered" : current ? "current" : "not yet reached"}`}
                  </span>
                </li>
              );
            })}
          </ol>
        </div>
      )}

      {finished ? (
        <ChallengeResult
          result={scoreChallenge(answers)}
          answers={answers}
          onRestart={handleRestart}
        />
      ) : (
        <ChallengeHandCard
          key={hand.id}
          hand={hand}
          answer={answers[hand.id]}
          onAnswer={handleAnswer}
          onNext={handleNext}
          isLast={index === hands.length - 1}
        />
      )}
    </div>
  );
}
