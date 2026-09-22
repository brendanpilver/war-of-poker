import { formatPrice, offers, SEPARATE_TOTAL_CENTS } from "@/lib/offers";
import { totalHands } from "@/lib/quiz/hands";
import { Section, SectionHeading } from "./section";

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
    answer: `The Complete System is ${formatPrice(offers.system.amountCents)}: the Short Stack PLO book plus the complete seven-piece Field Kit, including the 20-Hand Capstone Quiz, for applying the method at the table and reviewing it afterwards. Bought separately the two would be ${formatPrice(SEPARATE_TOTAL_CENTS)}. Everything is a digital download with immediate access.`,
  },
  {
    question: "How do I get the Player Price?",
    answer: `Take the free ${totalHands}-Hand Challenge and unlock the complete ${formatPrice(offers.system.amountCents)} system for ${formatPrice(offers["system-quiz"].amountCents)}. That is the book and the complete Field Kit — everything, not a discount on one part — for only ${formatPrice(offers["system-quiz"].amountCents - offers.book.amountCents)} more than the book alone.`,
  },
  {
    question: "Can I buy the book or the Field Kit on its own?",
    answer: `Yes. The book alone is ${formatPrice(offers.book.amountCents)}, and the Field Kit alone is ${formatPrice(offers["field-kit"].amountCents)}. If you start with the book, you can add the complete Field Kit later for ${formatPrice(offers["field-kit-upgrade"].amountCents)} with the upgrade link in your purchase email — it doesn’t expire.`,
  },
];

export function Faq() {
  return (
    <Section id="faq" aria-labelledby="faq-title">
      <SectionHeading id="faq-title">Before you buy.</SectionHeading>

      <div className="mt-8 divide-y divide-line border-y border-line">
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
    </Section>
  );
}
