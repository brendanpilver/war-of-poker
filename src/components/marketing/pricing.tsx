import { fieldKitCount } from "@/lib/field-kit";
import { formatPrice, offers } from "@/lib/offers";
import { shortStackPlo } from "@/lib/short-stack-plo";
import { BuyOfferButton } from "./buy-offer-button";
import { Section, SectionHeading } from "./section";

/**
 * The two offers.
 *
 * The Complete System is visually preferred — wider column, gold rule, primary
 * button — because it is the offer the business wants chosen. It is not a dark
 * pattern: Book Only is a full, plainly described choice with its own real
 * button and its own price, there is no countdown, and no scarcity is implied.
 *
 * The quiz-completer price is not shown here. It is unlocked by finishing the
 * Reality Check and appears on the result screen, so advertising it on the
 * sales page would undercut the thing it rewards.
 */

export const PRICING_SECTION_ID = "pricing";

const systemIncludes = [
  `The complete ${shortStackPlo.title} book`,
  `All ${fieldKitCount} printable Field Kit tools`,
  "20-Hand Capstone Quiz + Answer Key",
];

const bookIncludes = [
  `The complete ${shortStackPlo.title} book`,
  "Fully worked example hands",
];

export function Pricing() {
  const system = offers.system;
  const book = offers.book;

  return (
    <Section
      id={PRICING_SECTION_ID}
      tone="raised"
      aria-labelledby="pricing-title"
    >
      <SectionHeading id="pricing-title" eyebrow="Pricing">
        Two ways in.
      </SectionHeading>

      <div className="mt-10 grid items-start gap-6 lg:grid-cols-12">
        <div className="border-t-2 border-gold bg-ink-card p-6 sm:p-8 lg:col-span-7">
          <p className="font-mono text-[11px] tracking-[0.18em] text-gold uppercase">
            Everything
          </p>
          <h3 className="mt-3 text-2xl font-bold text-bone uppercase sm:text-3xl">
            Complete System
          </h3>
          <p className="mt-5 text-5xl font-bold text-bone tabular-nums">
            {formatPrice(system.amountCents)}
          </p>

          <ul className="mt-6 space-y-2.5">
            {systemIncludes.map((item) => (
              <li key={item} className="flex gap-3 leading-snug text-pretty text-bone">
                <span aria-hidden className="text-gold">
                  —
                </span>
                {item}
              </li>
            ))}
          </ul>

          <BuyOfferButton
            offerId="system"
            location="pricing"
            className="mt-8 w-full"
            label={`Get the Complete System — ${formatPrice(system.amountCents)}`}
          />
          <p className="mt-4 text-sm text-bone-faint">
            {shortStackPlo.format} · {shortStackPlo.access}
          </p>
        </div>

        <div className="border-t border-line bg-ink-card p-6 sm:p-8 lg:col-span-5">
          <p className="font-mono text-[11px] tracking-[0.18em] text-bone-faint uppercase">
            The book on its own
          </p>
          <h3 className="mt-3 text-2xl font-bold text-bone uppercase">
            Book Only
          </h3>
          <p className="mt-5 text-4xl font-bold text-bone tabular-nums">
            {formatPrice(book.amountCents)}
          </p>

          <ul className="mt-6 space-y-2.5">
            {bookIncludes.map((item) => (
              <li
                key={item}
                className="flex gap-3 leading-snug text-pretty text-bone-muted"
              >
                <span aria-hidden className="text-bone-faint">
                  —
                </span>
                {item}
              </li>
            ))}
          </ul>

          <BuyOfferButton
            offerId="book"
            location="pricing"
            variant="secondary"
            className="mt-8 w-full"
            label={`Get the Book — ${formatPrice(book.amountCents)}`}
          />
          <p className="mt-4 text-sm text-bone-faint">
            {shortStackPlo.format} · {shortStackPlo.access}
          </p>
        </div>
      </div>
    </Section>
  );
}
