import { TrackedCta } from "@/components/analytics/tracked-cta";
import { formatPrice, offers } from "@/lib/offers";
import { PRODUCT_PATH, QUIZ_PATH, shortStackPlo } from "@/lib/short-stack-plo";
import { BookCover } from "./book-cover";
import { BuyOfferButton } from "./buy-offer-button";

/**
 * The product-led hero, used on the homepage and the sales page.
 *
 * Stripped to what a cold visitor needs in five seconds: what it is, the
 * problem it solves, what the offer contains, what it costs, and a free way in.
 * The outcome bullets, second paragraph, and framework restatement that used to
 * live here are now further down the page — above the fold they competed with
 * the cover and the price.
 *
 * `variant` only changes the heading level and the secondary link: the sales
 * page is already the product page, so its secondary action is the quiz rather
 * than a link to itself.
 *
 * On a phone the cover used to be ordered above the copy, where its 276px plus
 * the 98px header left 293px of a 667px screen for the headline, the pitch, the
 * price and the button — so the button opened around 250px below the fold. Below
 * `sm` the grid now follows document order instead, which puts the copy first
 * and the cover after it; `sm:order-*` keeps the cover leading on tablets, and
 * `lg:order-*` keeps the two-column desktop layout, both exactly as they were.
 * The margins below are trimmed on phones and restored at `sm`. Everything above
 * the button is part of the offer, so none of it was cut to make room.
 */

export function ProductHero({ variant }: { variant: "home" | "product" }) {
  const system = offers.system;
  const book = offers.book;

  return (
    <section aria-labelledby="product-hero-title" className="border-b border-line">
      <div className="mx-auto grid max-w-5xl gap-x-14 gap-y-7 px-5 pt-6 pb-14 sm:gap-y-10 sm:px-8 sm:pt-16 lg:grid-cols-12 lg:items-center lg:pt-20 lg:pb-20">
        <div className="sm:order-2 lg:order-1 lg:col-span-7">
          <h1
            id="product-hero-title"
            className="text-[2.75rem] leading-[0.92] font-bold tracking-[-0.02em] text-bone uppercase sm:text-6xl lg:text-7xl"
          >
            <span className="block">Short Stack</span>
            <span className="block text-gold">PLO</span>
          </h1>

          <p className="mt-3 text-[15px] leading-snug text-pretty text-bone-faint sm:mt-4">
            {shortStackPlo.subtitle}
            <span className="mt-0.5 block">By {shortStackPlo.author}</span>
          </p>

          <p className="mt-5 max-w-lg text-xl leading-snug text-balance text-bone sm:mt-6 sm:text-2xl">
            Stop bringing Hold&apos;em instincts into PLO.
          </p>

          <p className="mt-4 max-w-lg text-lg leading-relaxed text-pretty text-bone-muted">
            A practical decision system for live players, where one bad call can
            cost hundreds of dollars on a single hand.
          </p>

          <div className="mt-6 border-t border-line pt-4 sm:mt-7 sm:pt-6">
            <p className="flex flex-wrap items-baseline gap-x-3">
              <span className="text-lg font-semibold text-bone">
                Complete System
              </span>
              <span className="text-3xl font-bold text-bone tabular-nums">
                {formatPrice(system.amountCents)}
              </span>
            </p>
            <p className="mt-1.5 text-bone-muted">
              Book + 7-piece Field Kit + 20-Hand Capstone
            </p>

            <BuyOfferButton
              offerId="system"
              location={`${variant}-hero`}
              className="mt-5 w-full sm:mt-6 sm:w-auto"
              label={`Get the Complete System — ${formatPrice(system.amountCents)}`}
            />

            <p className="mt-4 text-[15px] text-bone-muted">
              Book only — {formatPrice(book.amountCents)}.{" "}
              <TrackedCta
                href={variant === "home" ? PRODUCT_PATH : "#pricing"}
                location={`${variant}-hero-secondary`}
                label="pricing"
                className="text-bone underline decoration-bone/30 underline-offset-4 transition-colors hover:decoration-gold"
              >
                See both options
              </TrackedCta>
            </p>
          </div>

          <p className="mt-7">
            <TrackedCta
              href={QUIZ_PATH}
              location={`${variant}-hero-quiz`}
              label="Take the free 3-Hand Reality Check"
              className="inline-flex items-center gap-2 font-medium text-gold underline decoration-gold/40 underline-offset-[6px] transition-colors hover:decoration-gold"
            >
              Take the free 3-Hand Reality Check
              <span aria-hidden>→</span>
            </TrackedCta>
          </p>
        </div>

        <div className="sm:order-1 lg:order-2 lg:col-span-5">
          <BookCover
            sizes="(min-width: 1024px) 360px, 240px"
            loading="eager"
            className="mx-auto w-full max-w-[11.5rem] sm:max-w-[15rem] lg:max-w-none"
          />
        </div>
      </div>
    </section>
  );
}
