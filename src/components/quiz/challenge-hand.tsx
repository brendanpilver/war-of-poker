"use client";

import { CardRow } from "@/components/poker/playing-card";
import { concepts } from "@/lib/quiz/concepts";
import { totalHands, type ChallengeHand, type ChoiceId } from "@/lib/quiz/hands";

/**
 * One hand of the challenge: the situation, the four options, and -- once an
 * answer is locked in -- River Potter's reasoning and the system principle it
 * demonstrates.
 *
 * The reasoning appears immediately on answering, with no email required. That
 * is the point of the asset: the free value has to land before anything is
 * asked for.
 *
 * Laid out for a phone first. One decision fills the screen, the options are
 * full-width targets, and the explanation opens below the answer rather than
 * replacing it, so a reader can see what they picked while they read why.
 */

type ChallengeHandCardProps = {
  hand: ChallengeHand;
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

export function ChallengeHandCard({
  hand,
  answer,
  onAnswer,
  onNext,
  isLast,
}: ChallengeHandCardProps) {
  const answered = answer !== undefined;
  const wasRight = answer === hand.correctChoiceId;
  const hasCards = hand.hand.length > 0 || hand.board.length > 0;

  return (
    <article aria-labelledby={`${hand.id}-title`}>
      <p className="font-mono text-[11px] tracking-[0.18em] text-gold uppercase">
        Hand {hand.number} of {totalHands} · {concepts[hand.concept].label}
      </p>
      <h2
        id={`${hand.id}-title`}
        className="mt-3 text-[1.75rem] leading-[1.08] font-bold tracking-[-0.01em] text-balance text-bone uppercase sm:text-4xl"
      >
        {hand.title}
      </h2>

      <div className="mt-4 space-y-3 text-[15px] leading-relaxed text-pretty text-bone-muted sm:mt-6 sm:text-base">
        {hand.setup.map((paragraph) => (
          <p key={paragraph}>{paragraph}</p>
        ))}
      </div>

      <div className="mt-5 border border-line bg-ink-raised sm:mt-7">
        {hasCards && (
          <div className="flex flex-wrap items-end gap-x-8 gap-y-5 border-b border-line p-3.5 sm:p-5">
            {hand.hand.length > 0 && (
              <CardRow cards={hand.hand} label="Your hand" size="lead" />
            )}
            {hand.board.length > 0 && (
              <CardRow
                cards={hand.board}
                label={hand.boardLabel ?? "Board"}
                streetBreaks={hand.boardStreetBreaks}
              />
            )}
          </div>
        )}
        {/* One fact per row, so any number of facts fills the box: a grid left
            empty cells whenever the count didn't divide by the column count. */}
        <dl className="divide-y divide-line">
          {hand.facts.map((fact) => (
            <div
              key={fact.label}
              className="grid gap-1 px-3.5 py-3 sm:grid-cols-[11rem_1fr] sm:items-baseline sm:gap-4 sm:px-5"
            >
              <dt className="font-mono text-[10px] tracking-[0.16em] text-bone-faint uppercase">
                {fact.label}
              </dt>
              <dd className="text-sm leading-snug text-pretty text-bone">{fact.value}</dd>
            </div>
          ))}
        </dl>
      </div>

      <fieldset className="mt-6 sm:mt-8" disabled={answered}>
        <legend className="text-lg font-semibold text-pretty text-bone sm:text-xl">
          {hand.prompt}
        </legend>
        <div className="mt-3.5 space-y-2.5 sm:mt-4">
          {hand.choices.map((choice) => {
            const isAnswerKey = answered && choice.id === hand.correctChoiceId;
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
                <span className="min-w-0">
                  {choice.cards && (
                    <CardRow cards={choice.cards} size="mini" />
                  )}
                  <span
                    className={`block text-[15px] leading-snug text-pretty text-bone ${choice.cards ? "mt-2.5" : ""}`}
                  >
                    {choice.text}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      </fieldset>

      {answered && (
        <section
          aria-live="polite"
          className="mt-7 border border-line bg-ink-card p-5 sm:mt-8 sm:p-7"
        >
          <p
            className={`font-mono text-[11px] tracking-[0.18em] uppercase ${
              wasRight ? "text-olive-light" : "text-gold"
            }`}
          >
            {wasRight ? "That's the one" : `You answered ${answer}`}
          </p>
          <h3 className="mt-2.5 text-xl font-semibold text-pretty text-bone sm:text-2xl">
            Answer: {hand.answerHeadline}
          </h3>

          <div className="mt-4 space-y-3.5 text-[15px] leading-relaxed text-pretty text-bone-muted">
            {hand.explanation.map((paragraph) => (
              <p key={paragraph}>{paragraph}</p>
            ))}
          </div>

          {hand.outsTable && (
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
                  {hand.outsTable.rows.map((row) => (
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
                      {hand.outsTable.totalLabel}
                    </td>
                    <td className="py-2.5 text-right font-semibold tabular-nums text-gold">
                      {hand.outsTable.total}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}

          <div className="mt-6 border-l-2 border-gold bg-ink-raised py-4 pr-4 pl-4 sm:pl-5">
            <p className="font-mono text-[10px] tracking-[0.2em] text-gold uppercase">
              System principle
            </p>
            <p className="mt-2 text-[17px] leading-snug text-pretty text-bone sm:text-lg">
              {hand.principle}
            </p>
          </div>

          <button
            type="button"
            onClick={onNext}
            className="mt-7 inline-flex w-full items-center justify-center rounded-[2px] bg-gold px-6 py-3.5 font-semibold text-ink shadow-[inset_0_-2px_0_rgb(0_0_0/0.18)] transition-colors duration-150 hover:bg-gold-light active:translate-y-px sm:w-auto"
          >
            {isLast ? "See your result" : "Next hand →"}
          </button>
        </section>
      )}
    </article>
  );
}
