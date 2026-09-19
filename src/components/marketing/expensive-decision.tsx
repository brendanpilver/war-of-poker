import { TrackedCta } from "@/components/analytics/tracked-cta";
import { CardRow } from "@/components/poker/playing-card";
import { questions } from "@/lib/quiz/reality-check";
import { QUIZ_PATH } from "@/lib/short-stack-plo";
import { Section, SectionHeading } from "./section";

/**
 * One real decision, worked — the page's proof mechanism.
 *
 * Uses the first Reality Check hand, which is approved published material
 * rather than a constructed example. It is a $242 decision: the cost of getting
 * this one spot wrong is several times the price of the system, which is the
 * whole argument made concrete.
 *
 * Kept deliberately short. The long version is the book; this only has to show
 * that the reasoning is real.
 */

const [acesHand] = questions;

const framework = [
  {
    term: "Hand",
    body: "Bare aces. No heart, no useful straight coverage. The nuts right now is T7.",
  },
  {
    term: "SPR",
    body: "1.97. That describes the leverage available — not your cards, and not an instruction to commit.",
  },
  {
    term: "Equity",
    body: "A bet folds the hands with little equity and gets called by the straights, sets and wraps that beat you.",
  },
  {
    term: "Player",
    body: "This opponent has shown down rundowns and suited connectors after calling 3-bets — exactly what 9-8-6 hits.",
  },
];

export function ExpensiveDecision({ ctaLocation }: { ctaLocation: string }) {
  return (
    <Section id="expensive-decision" tone="raised" aria-labelledby="expensive-decision-title">
      <SectionHeading
        id="expensive-decision-title"
        eyebrow="One expensive decision"
        lead="$2/$5 live. You 3-bet the button to $58 with aces and the cutoff calls. The flop comes down and they check."
      >
        $242 behind, and the Hold&apos;em answer costs you all of it.
      </SectionHeading>

      <div className="mt-10 grid gap-8 lg:grid-cols-12 lg:gap-12">
        <div className="lg:col-span-5">
          <div className="flex flex-wrap items-end gap-x-8 gap-y-6">
            <CardRow cards={acesHand.hand} label="Your hand" size="lead" />
            <CardRow cards={acesHand.board} label="Flop" />
          </div>

          <dl className="mt-8 flex gap-10">
            <div>
              <dt className="font-mono text-[11px] tracking-[0.16em] text-bone-faint uppercase">
                Pot
              </dt>
              <dd className="mt-1 text-3xl font-semibold text-bone tabular-nums">$123</dd>
            </div>
            <div>
              <dt className="font-mono text-[11px] tracking-[0.16em] text-bone-faint uppercase">
                Behind
              </dt>
              <dd className="mt-1 text-3xl font-semibold text-gold tabular-nums">$242</dd>
            </div>
          </dl>

          <p className="mt-8 text-lg leading-relaxed text-pretty text-bone">
            SPR is under 2 and you hold aces.{" "}
            <span className="text-bone-muted">Are you committed?</span>
          </p>
        </div>

        <div className="lg:col-span-7">
          <p className="text-2xl leading-snug font-semibold text-balance text-bone sm:text-3xl">
            No. Check back.
          </p>
          <p className="mt-4 text-lg leading-relaxed text-pretty text-bone">
            Your preflop range advantage is not a flop advantage on this board.
            The same aces bet comfortably on A♦7♠2♣ — the cards didn&apos;t
            change, the board did.
          </p>

          <dl className="mt-8 space-y-5 border-l border-line pl-6">
            {framework.map((item) => (
              <div key={item.term}>
                <dt className="font-mono text-xs font-medium tracking-[0.18em] text-gold uppercase">
                  {item.term}
                </dt>
                <dd className="mt-1.5 leading-relaxed text-pretty text-bone-muted">
                  {item.body}
                </dd>
              </div>
            ))}
          </dl>

          <TrackedCta
            href={QUIZ_PATH}
            location={ctaLocation}
            label="Try the free 3-Hand Reality Check"
            className="mt-9 inline-flex w-full items-center justify-center rounded-[2px] border border-gold px-6 py-3.5 text-center font-semibold whitespace-nowrap text-gold transition-colors duration-150 hover:bg-gold hover:text-ink active:translate-y-px sm:w-auto"
          >
            Try the free 3-Hand Reality Check
          </TrackedCta>
        </div>
      </div>
    </Section>
  );
}
