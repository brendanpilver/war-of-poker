import { BuyButton } from "./buy-button";
import { SectionIntro } from "./section-intro";

const groups = [
  {
    title: "Foundations",
    summary:
      "Stop judging PLO hands like Hold’em hands. Learn why four cards that work together beat hands that only look strong.",
    topics: [
      "PLO fundamentals for Hold’em players",
      "Strong starting-hand construction",
    ],
  },
  {
    title: "Preflop & SPR",
    summary:
      "Know what kind of flop you are creating before you put money in, and which hands benefit from a low-SPR pot.",
    topics: [
      "Position and preflop strategy",
      "3-bet and low-SPR pots",
      "SPR and stack commitment",
    ],
  },
  {
    title: "Postflop",
    summary:
      "Read boards, judge equity quality honestly, and reassess every street instead of paying turn prices with flop equity.",
    topics: [
      "Board texture",
      "Wraps, draws, redraws, and equity quality",
      "Turn play",
      "River value, bluff-catching, and blockers",
    ],
  },
  {
    title: "Live Play",
    summary:
      "Profile the players in your game, adjust to what they do too much or too little, and manage the session around your stack.",
    topics: [
      "Live player types",
      "Exploitative adjustments",
      "Session and stack management",
      "Complete hand walkthroughs",
    ],
  },
];

export function BookContents() {
  return (
    <section id="inside" aria-labelledby="inside-title" className="py-20 lg:py-28">
      <div className="mx-auto grid max-w-6xl gap-12 px-5 sm:px-8 lg:grid-cols-12 lg:gap-16">
        <div className="lg:sticky lg:top-28 lg:col-span-4 lg:self-start">
          <SectionIntro
            index="03"
            label="What’s Inside"
            titleId="inside-title"
            title="From the first four cards to the last river decision."
          >
            <p>
              Short Stack PLO moves from hand construction to complete hand
              walkthroughs, with stack depth and live reads carried through
              each stage.
            </p>
          </SectionIntro>
          <BuyButton location="book-contents" className="mt-8" />
        </div>

        <div className="reveal grid gap-px border border-line bg-line sm:grid-cols-2 lg:col-span-8">
          {groups.map((group) => (
            <article key={group.title} className="flex flex-col bg-ink p-6 sm:p-8">
              <h3 className="text-xl font-semibold text-bone">{group.title}</h3>
              <p className="mt-2 text-[15px] leading-relaxed text-pretty text-bone-muted">
                {group.summary}
              </p>
              <ul className="mt-6 divide-y divide-line border-t border-line">
                {group.topics.map((topic) => (
                  <li key={topic} className="flex gap-3 py-3 text-[15px] text-bone">
                    <span aria-hidden className="text-gold">
                      —
                    </span>
                    {topic}
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
