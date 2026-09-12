import { SectionIntro } from "./section-intro";

// Verbatim from the Short Stack PLO manuscript. Re-check against the final edition.
const quotes = [
  {
    topic: "On player reads",
    text: "Your cards do not change based on who sits across from you. Their range does.",
  },
  {
    topic: "On hand selection",
    text: "We don’t play loose because we’re short. We use a strong starting range so that when the pot gets big, our range holds up better than theirs.",
  },
  {
    topic: "On turn play",
    text: "Do not pay turn prices with flop equity.",
  },
];

// U+FE0E keeps suit symbols as text rather than emoji on mobile.
const TEXT = "︎";

const traitLabels = ["High cards", "Connectivity", "Suitedness", "Nut potential"];

const hands = [
  {
    name: "Hand B",
    cards: [`A♠${TEXT} K♠${TEXT}`, `7♥${TEXT} 3♥${TEXT}`],
    spoken: "Ace of spades, king of spades, seven of hearts, three of hearts",
    traits: ["Good", "Poor", "Good", "Good in spades"],
  },
  {
    name: "Hand C",
    cards: [`J♠${TEXT} T♠${TEXT}`, `9♥${TEXT} 8♥${TEXT}`],
    spoken: "Jack of spades, ten of spades, nine of hearts, eight of hearts",
    traits: ["Good", "Excellent", "Excellent", "Strong"],
  },
];

export function BookExcerpts() {
  return (
    <section
      id="from-the-book"
      aria-labelledby="excerpts-title"
      className="border-t border-line py-20 lg:py-28"
    >
      <div className="mx-auto max-w-6xl px-5 sm:px-8">
        <SectionIntro
          index="04"
          label="From the Book"
          titleId="excerpts-title"
          title="See how the book thinks."
        >
          <p>Short excerpts from Short Stack PLO.</p>
        </SectionIntro>

        <div className="mt-12 grid gap-12 lg:grid-cols-12 lg:gap-16">
          <figure className="reveal border border-line bg-ink-card lg:col-span-7">
            <p className="border-b border-line px-6 py-4 font-mono text-xs uppercase tracking-[0.18em] text-bone-faint sm:px-8">
              Strong vs. pretty
            </p>
            <div className="px-6 pt-2 sm:px-8">
              <table className="w-full text-left">
                <caption className="sr-only">
                  Starting-hand comparison from Short Stack PLO
                </caption>
                <thead>
                  <tr className="border-b border-line">
                    <th scope="col">
                      <span className="sr-only">Attribute</span>
                    </th>
                    {hands.map((hand) => (
                      <th key={hand.name} scope="col" className="py-4 pl-4 align-bottom font-normal">
                        <span className="block font-mono text-[11px] uppercase tracking-[0.18em] text-bone-faint">
                          {hand.name}
                        </span>
                        <span aria-hidden className="mt-1 block font-mono text-lg text-bone sm:text-xl">
                          {hand.cards.map((pair) => (
                            <span key={pair} className="mr-2 inline-block whitespace-nowrap">
                              {pair}
                            </span>
                          ))}
                        </span>
                        <span className="sr-only">{hand.spoken}</span>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {traitLabels.map((trait, row) => (
                    <tr key={trait}>
                      <th
                        scope="row"
                        className="py-3 pr-2 font-mono text-[11px] font-normal uppercase tracking-[0.12em] text-bone-faint"
                      >
                        {trait}
                      </th>
                      {hands.map((hand) => (
                        <td key={hand.name} className="py-3 pl-4 text-[15px] text-bone">
                          {hand.traits[row]}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <figcaption className="border-t border-line px-6 py-6 sm:px-8">
              <p className="text-[15px] leading-relaxed text-pretty text-bone-muted">
                Hand B holds the ace and king. The book explains why Hand C can
                be dramatically better anyway.
              </p>
              <blockquote className="mt-3 text-2xl font-semibold tracking-[-0.01em] text-bone">
                “Construction beats appearances.”
              </blockquote>
            </figcaption>
          </figure>

          <ul className="reveal space-y-10 lg:col-span-5 lg:pt-4">
            {quotes.map((quote) => (
              <li key={quote.topic} className="border-l-2 border-gold pl-5">
                <figure>
                  <blockquote className="text-xl leading-snug text-pretty text-bone">
                    “{quote.text}”
                  </blockquote>
                  <figcaption className="mt-3 font-mono text-[11px] uppercase tracking-[0.18em] text-bone-faint">
                    {quote.topic}
                  </figcaption>
                </figure>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
