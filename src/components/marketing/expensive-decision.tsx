import { TrackedCta } from "@/components/analytics/tracked-cta";
import { CardRow } from "@/components/poker/playing-card";
import { hands, totalHands } from "@/lib/quiz/hands";
import { CHALLENGE_PATH } from "@/lib/short-stack-plo";
import { Section, SectionHeading } from "./section";

/**
 * One real decision, worked — the page's proof mechanism.
 *
 * Uses the challenge's opening hand, which is approved published material
 * rather than a constructed example. The Hold'em answer puts $253 in: the cost
 * of getting this one spot wrong is several times the price of the system, which
 * is the whole argument made concrete.
 *
 * The prose below is written for that one hand, so it is looked up by id rather
 * than by position. If the challenge's hands are reordered or replaced, this
 * fails the build instead of putting one hand's cards over another's story.
 *
 * Kept deliberately short. The long version is the book; this only has to show
 * that the reasoning is real.
 */

function findFeaturedHand() {
  const hand = hands.find((candidate) => candidate.id === "you-hold-the-ten");
  if (!hand) {
    throw new Error(
      'ExpensiveDecision is written for the challenge hand "you-hold-the-ten", which no longer exists in src/lib/quiz/hands.ts. Rewrite this component for the new hand.',
    );
  }
  return hand;
}

const featuredHand = findFeaturedHand();

const framework = [
  {
    term: "Hand",
    body: "One pair. Q♥Q♣ with 9-8-7 is your best five. The T♦ needs a second card from J, 9, 8, 7 or 6 to make a straight, and you hold queens and a three.",
  },
  {
    term: "SPR",
    body: "$253 behind a $101 pot is room for a shove. That describes the bet — not your cards, and not an instruction to make it.",
  },
  {
    term: "Equity",
    body: "$101 to call into a final $303 is 33.3%. One pair would need a third of their range to be bluffs, and on four to a straight it isn't close.",
  },
  {
    term: "Player",
    body: "A turn bet, then the pot on the river, on a board this connected. Any ten with a 9, 8, 7 or 6 makes a straight — that is where their range lives.",
  },
];

export function ExpensiveDecision({ ctaLocation }: { ctaLocation: string }) {
  return (
    <Section id="expensive-decision" tone="raised" aria-labelledby="expensive-decision-title">
      <SectionHeading
        id="expensive-decision-title"
        eyebrow="One expensive decision"
        lead="$2/$5 live. You call the cutoff's open on the button with Q♥Q♣T♦3♠. The flop checks through, you call a turn bet, and the river bet is the pot."
      >
        $253 behind, and the Hold&apos;em answer puts all of it in.
      </SectionHeading>

      <div className="mt-10 grid gap-8 lg:grid-cols-12 lg:gap-12">
        <div className="lg:col-span-5">
          <div className="flex flex-wrap items-end gap-x-8 gap-y-6">
            <CardRow cards={featuredHand.hand} label="Your hand" size="lead" />
            <CardRow
              cards={featuredHand.board}
              label={featuredHand.boardLabel}
              streetBreaks={featuredHand.boardStreetBreaks}
            />
          </div>

          <dl className="mt-8 flex flex-wrap gap-x-10 gap-y-5">
            <div>
              <dt className="font-mono text-[11px] tracking-[0.16em] text-bone-faint uppercase">
                Pot
              </dt>
              <dd className="mt-1 text-3xl font-semibold text-bone tabular-nums">$101</dd>
            </div>
            <div>
              <dt className="font-mono text-[11px] tracking-[0.16em] text-bone-faint uppercase">
                They bet
              </dt>
              <dd className="mt-1 text-3xl font-semibold text-bone tabular-nums">$101</dd>
            </div>
            <div>
              <dt className="font-mono text-[11px] tracking-[0.16em] text-bone-faint uppercase">
                Behind
              </dt>
              <dd className="mt-1 text-3xl font-semibold text-gold tabular-nums">$253</dd>
            </div>
          </dl>

          <p className="mt-8 text-lg leading-relaxed text-pretty text-bone">
            The board reads 9-8-7-6 and you hold a ten.{" "}
            <span className="text-bone-muted">Is that a straight?</span>
          </p>
        </div>

        <div className="lg:col-span-7">
          <p className="text-2xl leading-snug font-semibold text-balance text-bone sm:text-3xl">
            No. Fold.
          </p>
          <p className="mt-4 text-lg leading-relaxed text-pretty text-bone">
            Point to the two cards in your hand that make it. PLO plays exactly
            two hole cards and three from the board, and your ten has no
            partner among 9-8-7-6. In Hold&apos;em that is a straight; here it
            is a pair of queens.
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
            href={CHALLENGE_PATH}
            location={ctaLocation}
            label={`Take the free ${totalHands}-Hand Challenge`}
            className="mt-9 inline-flex w-full items-center justify-center rounded-[2px] border border-gold px-6 py-3.5 text-center font-semibold whitespace-nowrap text-gold transition-colors duration-150 hover:bg-gold hover:text-ink active:translate-y-px sm:w-auto"
          >
            Take the free {totalHands}-Hand Challenge
          </TrackedCta>
        </div>
      </div>
    </Section>
  );
}
