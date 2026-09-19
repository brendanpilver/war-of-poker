import { CardRow } from "@/components/poker/playing-card";
import { questions } from "@/lib/quiz/reality-check";
import { SectionIntro } from "./section-intro";

/**
 * One real decision, worked.
 *
 * Uses the first Reality Check hand — approved published material — rather than
 * a constructed example. It is a $242 decision, which is the point: the cost of
 * getting this single spot wrong is several times the price of the system.
 */

const [acesHand] = questions;

const commonMistake = {
  label: "The common line",
  body: "Bet $123. You raised preflop, the SPR is under 3, so you're committed — the Hold'em read of a strong made hand and a low SPR.",
};

const framework = [
  {
    term: "Hand",
    body: "Bare aces. No heart, no useful straight coverage. The current nuts is T7, and 75 also makes a straight.",
  },
  {
    term: "SPR",
    body: "1.97 describes the leverage available. It does not describe your cards, and it is not an instruction to commit.",
  },
  {
    term: "Equity",
    body: "A bet folds the hands with little equity and gets action from the straights, sets and big wraps that have you crushed.",
  },
  {
    term: "Player",
    body: "This caller has shown down rundowns and suited connectors after calling 3-bets — exactly what connects with 9-8-6.",
  },
];

export function ExpensiveDecision() {
  return (
    <section
      id="expensive-decision"
      aria-labelledby="expensive-decision-title"
      className="scroll-mt-24 border-t border-line bg-ink-raised py-20 lg:py-28"
    >
      <div className="mx-auto max-w-6xl px-5 sm:px-8">
        <SectionIntro
          index="04"
          label="An expensive decision"
          titleId="expensive-decision-title"
          title="$242 behind, and the Hold'em answer costs you all of it."
          className="max-w-3xl"
        >
          <p>
            $2/$5, eight-handed, $300 effective. You 3-bet the button to $58 with
            aces and the cutoff calls. Here is the flop.
          </p>
        </SectionIntro>

        <div className="mt-12 grid gap-6 lg:grid-cols-12">
          <div className="border border-line bg-ink-card p-6 sm:p-8 lg:col-span-5">
            <div className="flex flex-wrap items-end gap-x-8 gap-y-5">
              <CardRow cards={acesHand.hand} label="Your hand" size="lead" />
              <CardRow cards={acesHand.board} label="Flop" />
            </div>

            <dl className="mt-8 grid grid-cols-2 gap-px border border-line bg-line">
              <div className="bg-ink-card p-4">
                <dt className="font-mono text-[10px] tracking-[0.16em] text-bone-faint uppercase">
                  Pot
                </dt>
                <dd className="mt-1.5 text-2xl font-semibold text-bone tabular-nums">
                  $123
                </dd>
              </div>
              <div className="bg-ink-card p-4">
                <dt className="font-mono text-[10px] tracking-[0.16em] text-bone-faint uppercase">
                  Behind
                </dt>
                <dd className="mt-1.5 text-2xl font-semibold text-gold tabular-nums">
                  $242
                </dd>
              </div>
            </dl>

            <p className="mt-6 text-[15px] leading-relaxed text-pretty text-bone-muted">
              The cutoff checks.
            </p>
          </div>

          <div className="lg:col-span-7">
            <div className="border border-line bg-ink-card p-6 sm:p-8">
              <p className="font-mono text-[11px] tracking-[0.18em] text-bone-faint uppercase">
                {commonMistake.label}
              </p>
              <p className="mt-3 leading-relaxed text-pretty text-bone-muted">
                {commonMistake.body}
              </p>
            </div>

            <div className="mt-6 border border-line bg-ink-card">
              <p className="border-b border-line px-6 py-4 font-mono text-[11px] tracking-[0.18em] text-gold uppercase sm:px-8">
                The same spot, through the four questions
              </p>
              <dl className="divide-y divide-line">
                {framework.map((item) => (
                  <div key={item.term} className="px-6 py-5 sm:px-8">
                    <dt className="font-mono text-sm font-medium tracking-[0.18em] text-gold uppercase">
                      {item.term}
                    </dt>
                    <dd className="mt-2 leading-relaxed text-pretty text-bone">
                      {item.body}
                    </dd>
                  </div>
                ))}
              </dl>
            </div>

            <p className="mt-6 border-l-2 border-gold pl-4 text-lg leading-relaxed text-pretty text-bone">
              Check back. On A♦7♠2♣ the same aces bet comfortably — the cards
              didn&apos;t change, the board did.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
