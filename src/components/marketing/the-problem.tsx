import { SectionIntro } from "./section-intro";

/**
 * Why Hold'em instincts misfire in PLO.
 *
 * Each pairing is one of the translation errors from the published Survival
 * Card, stated as instinct against consequence.
 */

const mismatches = [
  {
    instinct: "An overpair is a strong made hand",
    reality:
      "Bare aces on JT9 have to fold to real action. Four-card hands make straights and sets constantly.",
  },
  {
    instinct: "Top two pair is close to the nuts",
    reality: "Opponents hold four cards, so sets and straights arrive far more often.",
  },
  {
    instinct: "A set is a stack-off hand",
    reality:
      "Top set usually is at low SPR. Bottom set multiway is often drawing to one improvement.",
  },
  {
    instinct: "Count your outs",
    reality:
      "A card that makes your straight and someone else's better straight is not an out.",
  },
  {
    instinct: "The made hand is the goal",
    reality:
      "A strong made hand routinely faces a draw with plenty of equity against it. The made hand plus its redraw is the goal.",
  },
  {
    instinct: "The rule of four estimates my equity",
    reality:
      "It overstates large PLO draws, double-counts overlapping cards, and prices two cards when you are buying one.",
  },
];

export function TheProblem() {
  return (
    <section
      id="the-problem"
      aria-labelledby="the-problem-title"
      className="scroll-mt-24 py-20 lg:py-28"
    >
      <div className="mx-auto max-w-6xl px-5 sm:px-8">
        <SectionIntro
          index="02"
          label="The problem"
          titleId="the-problem-title"
          title="Your instincts aren't wrong. The inputs changed."
          className="max-w-3xl"
        >
          <p>
            You already know how to play poker. The expensive errors in PLO come
            from applying accurate Hold&apos;em instincts to a game with four
            hole cards — where players make stronger hands, pick up bigger draws,
            and hold far more equity against one another.
          </p>
          <p>
            Bigger draws. Closer equities. Nut-quality problems. Redraws. And a
            completely different set of commitment decisions.
          </p>
        </SectionIntro>

        <ul className="mt-14 grid gap-px border border-line bg-line sm:grid-cols-2 lg:grid-cols-3">
          {mismatches.map((item) => (
            <li key={item.instinct} className="bg-ink p-6 sm:p-7">
              <p className="font-mono text-[10px] tracking-[0.16em] text-bone-faint uppercase">
                Hold&apos;em instinct
              </p>
              <h3 className="mt-2.5 text-lg leading-snug font-semibold text-pretty text-bone">
                {item.instinct}
              </h3>
              <p className="mt-4 font-mono text-[10px] tracking-[0.16em] text-gold uppercase">
                PLO reality
              </p>
              <p className="mt-2 text-[15px] leading-relaxed text-pretty text-bone-muted">
                {item.reality}
              </p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
