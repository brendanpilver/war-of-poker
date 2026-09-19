"use client";

import { useEffect, useRef, useState } from "react";
import { track } from "@/lib/analytics/track";
import { questions, type ChoiceId } from "@/lib/quiz/reality-check";
import { scoreQuiz, type QuizAnswers } from "@/lib/quiz/scoring";
import { QuizQuestionCard } from "./quiz-question-card";
import { QuizResult } from "./quiz-result";

/**
 * The Reality Check's state machine: one hand at a time, then the result.
 *
 * State is held in memory rather than persisted. Someone who reloads starts
 * over, which is the honest behaviour for a three-question diagnostic and
 * avoids a half-finished run producing a misleading score later.
 */

export function RealityCheckQuiz() {
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<QuizAnswers>({});
  const [finished, setFinished] = useState(false);
  const started = useRef(false);
  const headingRef = useRef<HTMLDivElement>(null);
  const movedRef = useRef(false);

  const question = questions[index];

  useEffect(() => {
    // Moving between hands changes the whole panel; without this the reader is
    // left scrolled at the previous hand's explanation.
    if (!movedRef.current) return;
    headingRef.current?.scrollIntoView({ block: "start", behavior: "smooth" });
  }, [index, finished]);

  function handleAnswer(choiceId: ChoiceId) {
    if (answers[question.id] !== undefined) return;

    if (!started.current) {
      started.current = true;
      track("quiz_started", { quiz: "reality-check" });
    }

    setAnswers((previous) => ({ ...previous, [question.id]: choiceId }));
    track("quiz_question_answered", {
      question_id: question.id,
      question_number: question.number,
      choice: choiceId,
      correct: choiceId === question.correctChoiceId,
    });
  }

  function handleNext() {
    movedRef.current = true;
    if (index < questions.length - 1) {
      setIndex(index + 1);
      return;
    }

    const result = scoreQuiz(answers);
    track("quiz_completed", {
      score: result.score,
      total: result.total,
      missed: result.missedQuestionIds.join(",") || null,
    });
    setFinished(true);
  }

  function handleRestart() {
    movedRef.current = true;
    started.current = false;
    setAnswers({});
    setIndex(0);
    setFinished(false);
  }

  return (
    <div ref={headingRef} className="scroll-mt-24">
      {!finished && (
        <div className="mb-8">
          <ol
            aria-label="Progress"
            className="flex items-center gap-2"
          >
            {questions.map((entry, position) => {
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
        <QuizResult
          result={scoreQuiz(answers)}
          answers={answers}
          onRestart={handleRestart}
        />
      ) : (
        <QuizQuestionCard
          key={question.id}
          question={question}
          answer={answers[question.id]}
          onAnswer={handleAnswer}
          onNext={handleNext}
          isLast={index === questions.length - 1}
        />
      )}
    </div>
  );
}
