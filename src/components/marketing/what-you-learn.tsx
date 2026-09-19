import { FrameworkStrip } from "./framework-strip";
import { Section, SectionHeading } from "./section";

/**
 * Merges the former TheProblem, CoreFramework, and LivePlayers into one
 * section: why Hold'em instincts misfire, the lens that replaces them, what the
 * book covers, and who it is and isn't for.
 *
 * Each mismatch below is one of the translation errors from the published
 * Survival Card, compressed to a line apiece.
 */

const mismatches = [
  {
    instinct: "An overpair is a strong made hand",
    reality: "Bare aces on JT9 have to fold to real action.",
  },
  {
    instinct: "Top two pair is close to the nuts",
    reality: "Four hole cards mean sets and straights arrive far more often.",
  },
  {
    instinct: "A set is a stack-off hand",
    reality: "Bottom set multiway is often drawing to one improvement.",
  },
  {
    instinct: "Count your outs",
    reality: "A card that makes your straight and a better one is not an out.",
  },
  {
    instinct: "The made hand is the goal",
    reality: "The made hand plus its redraw is the goal.",
  },
  {
    instinct: "The rule of four estimates my equity",
    reality: "It prices two cards when a call usually buys one.",
  },
];

const covered = [
  "Hand construction",
  "Preflop and pot geometry",
  "SPR and commitment",
  "Board texture and flop play",
  "Draw quality — clean versus dirty outs",
  "Redraws",
  "Turn resets",
  "River value and bluff-catching",
  "Live player reads and exploits",
  "Session and stack management",
];

const notFor = [
  "Complete solver ranges or preflop charts",
  "High-stakes solver specialists",
  "Anyone expecting guaranteed winnings",
];

export function WhatYouLearn() {
  return (
    <Section id="what-you-learn" aria-labelledby="what-you-learn-title">
      <SectionHeading
        id="what-you-learn-title"
        eyebrow="What you'll learn"
        lead="Your instincts aren't wrong — the inputs changed. Four hole cards mean stronger hands, bigger draws, and far more equity running against you."
      >
        Where Hold&apos;em instincts get expensive.
      </SectionHeading>

      <ul className="mt-10 grid gap-x-10 gap-y-6 sm:grid-cols-2">
        {mismatches.map((item) => (
          <li key={item.instinct}>
            <p className="leading-snug font-medium text-pretty text-bone">
              {item.instinct}
            </p>
            <p className="mt-1.5 leading-relaxed text-pretty text-bone-muted">
              {item.reality}
            </p>
          </li>
        ))}
      </ul>

      <div className="mt-14 border-t border-line pt-12">
        <FrameworkStrip headingId="framework-title" />
      </div>

      <div className="mt-14 grid gap-10 border-t border-line pt-12 sm:grid-cols-2 sm:gap-16">
        <div>
          <h3 className="text-xl font-semibold text-bone">What the book covers</h3>
          <ul className="mt-5 space-y-2">
            {covered.map((item) => (
              <li
                key={item}
                className="flex gap-3 leading-snug text-pretty text-bone"
              >
                <span aria-hidden className="text-gold">
                  —
                </span>
                {item}
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h3 className="text-xl font-semibold text-bone">Who it&apos;s for</h3>
          <p className="mt-5 leading-relaxed text-pretty text-bone">
            Competent No-Limit Hold&apos;em cash players moving into live PLO, at
            low and mid stakes, commonly playing around shallow-to-moderate
            stacks. The book works from roughly 60 big blinds — $300 in a $2/$5
            game — as its example depth.
          </p>

          <h3 className="mt-10 text-xl font-semibold text-bone">
            What it isn&apos;t
          </h3>
          <ul className="mt-5 space-y-2">
            {notFor.map((item) => (
              <li
                key={item}
                className="flex gap-3 leading-snug text-pretty text-bone-muted"
              >
                <span aria-hidden className="text-bone-faint">
                  ×
                </span>
                {item}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </Section>
  );
}
