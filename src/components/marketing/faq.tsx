import { formatPrice, offers } from "@/lib/offers";
import { BuyButton } from "./buy-button";
import { SectionIntro } from "./section-intro";

const faqs = [
  {
    question: "Who is Short Stack PLO for?",
    answer:
      "No-Limit Hold’em players moving into PLO, and low- and mid-stakes live PLO players who want a repeatable way to make decisions with a shallower stack.",
  },
  {
    question: "Do I need to buy in for exactly 60 BB?",
    answer:
      "No. The book uses roughly 60 big blinds — $300 in a $2/$5 game — as its main example depth. The principles apply across shallow-stack live PLO, because what drives each decision is the effective stack and the SPR it creates.",
  },
  {
    question: "I play No-Limit Hold’em. Is PLO too big a jump?",
    answer:
      "The book starts where Hold’em players usually go wrong: PLO is not Hold’em with four cards. It covers how to judge whether four cards work together before moving into preflop strategy, SPR, and postflop play.",
  },
  {
    question: "Is this solver-based strategy?",
    answer:
      "No. Short Stack PLO is practical live strategy built around four questions — Hand, SPR, Equity, and Player. It is written for decisions made at a live table, not for studying solver outputs.",
  },
  {
    question: "Will playing a shallower stack make me a winning player?",
    answer:
      "Not by itself. Buying in shallower doesn’t automatically make anyone a winner. The edge comes from playing that depth better than your opponents do, and that is what the book teaches.",
  },
  {
    question: "Does it cover postflop play?",
    answer:
      "Yes: board texture; wraps, draws, redraws, and equity quality; turn play; river value, bluff-catching, and blockers; and complete hand walkthroughs that put the pieces together.",
  },
  {
    question: "What do I get?",
    answer: `Two options. The Complete System (${formatPrice(offers.system.amountCents)}) is the book plus the full seven-piece Field Kit and the 20-Hand Capstone Quiz. The book on its own is ${formatPrice(offers.book.amountCents)}. Both are digital downloads with immediate access.`,
  },
];

export function Faq() {
  return (
    <section id="faq" aria-labelledby="faq-title" className="py-20 lg:py-28">
      <div className="mx-auto grid max-w-6xl gap-12 px-5 sm:px-8 lg:grid-cols-12 lg:gap-16">
        <div className="lg:sticky lg:top-28 lg:col-span-4 lg:self-start">
          <SectionIntro label="Questions" titleId="faq-title" title="Before you buy." />
          <BuyButton location="faq" className="mt-8" />
        </div>

        <div className="divide-y divide-line border-y border-line lg:col-span-8">
          {faqs.map((faq, i) => (
            <details key={faq.question} open={i === 0} className="group">
              <summary className="flex cursor-pointer list-none items-start justify-between gap-6 py-5 text-lg leading-snug font-medium text-bone transition-colors duration-150 hover:text-gold-light [&::-webkit-details-marker]:hidden">
                {faq.question}
                <span
                  aria-hidden
                  className="font-mono text-xl leading-none text-gold transition-transform duration-150 group-open:rotate-45"
                >
                  +
                </span>
              </summary>
              <p className="max-w-2xl pb-6 leading-relaxed text-pretty text-bone-muted">
                {faq.answer}
              </p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
