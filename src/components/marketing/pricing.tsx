import { Suspense } from "react";
import { fieldKitCount } from "@/lib/field-kit";
import { formatPrice, offers } from "@/lib/offers";
import { shortStackPlo } from "@/lib/short-stack-plo";
import { BuyOfferButton } from "./buy-offer-button";
import { PlayerPriceNotice } from "./player-price-notice";
import { Section, SectionHeading } from "./section";

/**
 * The two offers.
 *
 * They are sold as two different products, not as a book and a priced add-on:
 * the book teaches the method, the Complete System teaches it and hands you the
 * tools for applying it. Nothing here breaks the system's price into parts or
 * quotes a value for the Field Kit — the $39 is what the package costs, and the
 * difference between the two columns is what it does.
 *
 * The Complete System is visually preferred — wider column, gold rule, primary
 * button — because it is the offer the business wants chosen. It is not a dark
 * pattern: Book Only is a full, plainly described choice with its own real
 * button and its own price, there is no countdown, and no scarcity is implied.
 *
 * The player price is not advertised here. It is earned by finishing the
 * 10-Hand Challenge and appears on its results screen, so showing it to every
 * visitor would undercut the thing it rewards. `PlayerPriceNotice` is the one
 * exception: a completer who asked for their results by email arrives back
 * through a link carrying `?offer=player`, and it renders for them only.
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
      <Suspense fallback={null}>
        <PlayerPriceNotice />
      </Suspense>

      <SectionHeading id="pricing-title" eyebrow="Pricing">
        Two ways in.
      </SectionHeading>

      <div className="mt-10 grid items-start gap-6 lg:grid-cols-12">
        <div className="border-t-2 border-gold bg-ink-card p-6 sm:p-8 lg:col-span-7">
          <p className="font-mono text-[11px] tracking-[0.18em] text-gold uppercase">
            Learn it and apply it
          </p>
          <h3 className="mt-3 text-2xl font-bold text-bone uppercase sm:text-3xl">
            Complete System
          </h3>
          <p className="mt-5 text-5xl font-bold text-bone tabular-nums">
            {formatPrice(system.amountCents)}
          </p>
          <p className="mt-3 max-w-md leading-snug text-pretty text-bone-muted">
            {system.description}
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
            Learn the method
          </p>
          <h3 className="mt-3 text-2xl font-bold text-bone uppercase">
            Book Only
          </h3>
          <p className="mt-5 text-4xl font-bold text-bone tabular-nums">
            {formatPrice(book.amountCents)}
          </p>
          <p className="mt-3 leading-snug text-pretty text-bone-muted">
            {book.description}
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
