import { TrackedCta } from "@/components/analytics/tracked-cta";
import { formatPrice, offers } from "@/lib/offers";
import { shortStackPlo } from "@/lib/short-stack-plo";
import { BookCover } from "./book-cover";
import { BookSubtitle } from "./book-subtitle";
import { BuyOfferButton } from "./buy-offer-button";
import { PRICING_SECTION_ID } from "./pricing";
import { Eyebrow } from "./section-intro";

/**
 * The sales page hero. Problem-led rather than product-led: the headline is
 * about the decision that costs money, not about page counts.
 */

const outcomes = [
  "Know which four-card hands hold up when money goes in early.",
  "Plan the SPR before the flop instead of reacting to it.",
  "Count outs that actually win, then grade what they are worth.",
  "Recognise the repeatable mistakes live players make, and adjust.",
];

export function ProductHero() {
  const system = offers.system;
  const book = offers.book;

  return (
    <section aria-labelledby="product-hero-title" className="border-b border-line">
      <div className="mx-auto grid max-w-6xl gap-x-16 gap-y-12 px-5 pt-12 pb-16 sm:px-8 sm:pt-16 lg:grid-cols-12 lg:items-center lg:pt-20 lg:pb-24">
        <div className="lg:col-span-7">
          <Eyebrow>From War of Poker</Eyebrow>
          <h1
            id="product-hero-title"
            className="mt-5 text-[2.6rem] leading-[0.95] font-bold tracking-[-0.02em] text-bone uppercase sm:text-7xl lg:text-[4.25rem] xl:text-[4.75rem]"
          >
            <span className="block">Short Stack</span>
            <span className="block text-gold">PLO</span>
          </h1>
          <p className="mt-5 max-w-xl text-xl leading-snug text-pretty text-gold-light sm:text-2xl">
            <BookSubtitle />
          </p>
          <p className="mt-3 text-sm text-bone-faint">
            By {shortStackPlo.author} · PLO Specialist, War of Poker
          </p>

          <p className="mt-7 max-w-xl text-lg leading-relaxed text-pretty text-bone-muted">
            A decision system for live Hold&apos;em players moving into PLO,
            where one bad decision can cost hundreds of dollars. Four questions,
            asked the same way on every street:{" "}
            <span className="text-bone">Hand · SPR · Equity · Player.</span>
          </p>

          <ul className="mt-7 max-w-xl space-y-3">
            {outcomes.map((outcome) => (
              <li
                key={outcome}
                className="flex gap-3 leading-snug text-pretty text-bone"
              >
                <span aria-hidden className="text-gold">
                  —
                </span>
                {outcome}
              </li>
            ))}
          </ul>

          <div className="mt-9 flex flex-col items-start gap-4">
            <BuyOfferButton
              offerId="system"
              location="product-hero"
              className="w-full sm:w-auto"
              label={`Get the Complete System — ${formatPrice(system.amountCents)}`}
            />
            <p className="text-sm text-bone-muted">
              Or{" "}
              <TrackedCta
                href={`#${PRICING_SECTION_ID}`}
                location="product-hero-secondary"
                label="book only"
                className="text-bone underline decoration-bone/30 underline-offset-4 transition-colors hover:decoration-gold"
              >
                the book on its own for {formatPrice(book.amountCents)}
              </TrackedCta>
              .
            </p>
          </div>

          <p className="mt-6 font-mono text-[11px] tracking-[0.18em] text-bone-faint uppercase">
            {shortStackPlo.format} · {shortStackPlo.access}
          </p>
        </div>

        <div className="lg:col-span-5">
          <BookCover
            sizes="(min-width: 1024px) 384px, 256px"
            loading="eager"
            className="mx-auto w-full max-w-[14rem] sm:max-w-xs lg:max-w-sm"
          />
        </div>
      </div>
    </section>
  );
}
