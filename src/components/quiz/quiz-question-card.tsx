"use client";

import { CardRow } from "@/components/poker/playing-card";
import type { ChoiceId, QuizQuestion } from "@/lib/quiz/reality-check";

/**
 * One hand of the Reality Check: the situation, the four options, and -- once
 * an answer is locked in -- the explanation.
 *
 * The explanation appears immediately on answering, with no email required.
 * That is the point of the asset: the free value has to land before anything is
 * asked for.
 */

type QuizQuestionCardProps = {
  question: QuizQuestion;
  answer: ChoiceId | undefined;
  onAnswer: (choiceId: ChoiceId) => void;
  onNext: () => void;
  isLast: boolean;
};

function choiceStateClasses(
  isChosen: boolean,
  isAnswerKey: boolean,
  answered: boolean,
): string {
  if (!answered) {
    return "border-line bg-ink-card hover:border-bone-faint hover:bg-ink-raised";
  }
  if (isAnswerKey) return "border-olive-light bg-olive/15";
  if (isChosen) return "border-[#a8202a]/70 bg-[#a8202a]/10";
  return "border-line bg-ink-card opacity-55";
}

export function QuizQuestionCard({
  question,
  answer,
  onAnswer,
  onNext,
  isLast,
}: QuizQuestionCardProps) {
  const answered = answer !== undefined;
  const wasRight = answer === question.correctChoiceId;

  return (
    <article aria-labelledby={`${question.id}-title`}>
      <p className="font-mono text-[11px] tracking-[0.18em] text-gold uppercase">
        Hand {question.number} of 3
      </p>
      <h2
        id={`${question.id}-title`}
        className="mt-3 text-3xl leading-[1.1] font-bold tracking-[-0.01em] text-balance text-bone uppercase sm:text-4xl"
      >
        {question.title}
      </h2>

      <div className="mt-6 space-y-3 text-[15px] leading-relaxed text-pretty text-bone-muted sm:text-base">
        {question.setup.map((paragraph) => (
          <p key={paragraph}>{paragraph}</p>
        ))}
      </div>

      <div className="mt-7 border border-line bg-ink-raised">
        <div className="flex flex-wrap items-end gap-x-8 gap-y-5 border-b border-line p-4 sm:p-5">
          <CardRow cards={question.hand} label="Your hand" size="lead" />
          <CardRow
            cards={question.board}
            label={question.boardTurnIndex ? "Board · flop + turn" : "Board"}
            streetBreakIndex={question.boardTurnIndex}
          />
        </div>
        {/* gap-px over a line-coloured ground gives hairline rules without a
            dangling border when the row is not full. */}
        <dl className="grid grid-cols-2 gap-px bg-line sm:grid-cols-3">
          {question.facts.map((fact) => (
            <div
              key={fact.label}
              className={`bg-ink-raised p-3.5 sm:p-4 ${fact.wide ? "col-span-2 sm:col-span-3" : ""}`}
            >
              <dt className="font-mono text-[10px] tracking-[0.16em] text-bone-faint uppercase">
                {fact.label}
              </dt>
              <dd className="mt-1.5 text-sm leading-snug text-pretty text-bone">
                {fact.value}
              </dd>
            </div>
          ))}
        </dl>
      </div>

      <fieldset className="mt-8" disabled={answered}>
        <legend className="text-lg font-semibold text-pretty text-bone sm:text-xl">
          {question.prompt}
        </legend>
        <div className="mt-4 space-y-2.5">
          {question.choices.map((choice) => {
            const isAnswerKey = answered && choice.id === question.correctChoiceId;
            const isChosen = answer === choice.id;
            return (
              <button
                key={choice.id}
                type="button"
                onClick={() => onAnswer(choice.id)}
                aria-pressed={isChosen}
                className={`flex w-full items-start gap-3.5 rounded-[2px] border p-3.5 text-left transition-colors duration-150 sm:p-4 ${choiceStateClasses(isChosen, isAnswerKey, answered)}`}
              >
                <span
                  aria-hidden
                  className={`mt-px flex size-6 shrink-0 items-center justify-center rounded-[2px] font-mono text-xs font-semibold ${
                    isAnswerKey
                      ? "bg-olive-light text-ink"
                      : isChosen
                        ? "bg-[#a8202a] text-bone"
                        : "bg-ink text-bone-muted"
                  }`}
                >
                  {choice.id}
                </span>
                <span className="text-[15px] leading-snug text-pretty text-bone">
                  {choice.text}
                </span>
              </button>
            );
          })}
        </div>
      </fieldset>

      {answered && (
        <section
          aria-live="polite"
          className="mt-8 border border-line bg-ink-card p-5 sm:p-7"
        >
          <p
            className={`font-mono text-[11px] tracking-[0.18em] uppercase ${
              wasRight ? "text-olive-light" : "text-gold"
            }`}
          >
            {wasRight ? "Correct" : `You answered ${answer}`}
          </p>
          <h3 className="mt-2.5 text-xl font-semibold text-pretty text-bone sm:text-2xl">
            Answer: {question.answerHeadline}
          </h3>

          <div className="mt-4 space-y-3.5 text-[15px] leading-relaxed text-pretty text-bone-muted">
            {question.explanation.map((paragraph) => (
              <p key={paragraph}>{paragraph}</p>
            ))}
          </div>

          {question.outsTable && (
            <div className="mt-5 -mx-1 overflow-x-auto">
              <table className="w-full min-w-[22rem] border-collapse text-sm">
                <thead>
                  <tr className="border-b border-line text-left">
                    <th className="py-2 pr-3 font-mono text-[10px] tracking-[0.16em] text-bone-faint uppercase">
                      Improvement
                    </th>
                    <th className="py-2 pr-3 font-mono text-[10px] tracking-[0.16em] text-bone-faint uppercase">
                      Cards
                    </th>
                    <th className="py-2 text-right font-mono text-[10px] tracking-[0.16em] text-bone-faint uppercase">
                      Count
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {question.outsTable.rows.map((row) => (
                    <tr key={row.improvement} className="border-b border-line/60">
                      <td className="py-2.5 pr-3 text-bone">{row.improvement}</td>
                      <td className="py-2.5 pr-3 text-bone-muted">{row.cards}</td>
                      <td className="py-2.5 text-right tabular-nums text-bone">
                        {row.count}
                      </td>
                    </tr>
                  ))}
                  <tr>
                    <td className="py-2.5 pr-3 font-semibold text-bone" colSpan={2}>
                      {question.outsTable.totalLabel}
                    </td>
                    <td className="py-2.5 text-right font-semibold tabular-nums text-gold">
                      {question.outsTable.total}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}

          <p className="mt-5 border-l-2 border-gold pl-4 text-[15px] leading-relaxed text-pretty text-bone italic">
            {question.lesson}
          </p>

          <button
            type="button"
            onClick={onNext}
            className="mt-7 inline-flex w-full items-center justify-center rounded-[2px] bg-gold px-6 py-3.5 font-semibold text-ink shadow-[inset_0_-2px_0_rgb(0_0_0/0.18)] transition-colors duration-150 hover:bg-gold-light active:translate-y-px sm:w-auto"
          >
            {isLast ? "See your result" : `Next hand →`}
          </button>
        </section>
      )}
    </article>
  );
}
