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
 */

export function ProductHero({ variant }: { variant: "home" | "product" }) {
  const system = offers.system;
  const book = offers.book;

  return (
    <section aria-labelledby="product-hero-title" className="border-b border-line">
      <div className="mx-auto grid max-w-5xl gap-x-14 gap-y-7 px-5 pt-8 pb-14 sm:gap-y-10 sm:px-8 sm:pt-16 lg:grid-cols-12 lg:items-center lg:pt-20 lg:pb-20">
        <div className="order-2 lg:order-1 lg:col-span-7">
          <h1
            id="product-hero-title"
            className="text-[2.75rem] leading-[0.92] font-bold tracking-[-0.02em] text-bone uppercase sm:text-6xl lg:text-7xl"
          >
            <span className="block">Short Stack</span>
            <span className="block text-gold">PLO</span>
          </h1>

          <p className="mt-4 text-[15px] leading-snug text-pretty text-bone-faint">
            {shortStackPlo.subtitle}
            <span className="mt-0.5 block">By {shortStackPlo.author}</span>
          </p>

          <p className="mt-6 max-w-lg text-xl leading-snug text-balance text-bone sm:text-2xl">
            Stop bringing Hold&apos;em instincts into PLO.
          </p>

          <p className="mt-4 max-w-lg text-lg leading-relaxed text-pretty text-bone-muted">
            A practical decision system for live players, where one bad call can
            cost hundreds of dollars on a single hand.
          </p>

          <div className="mt-7 border-t border-line pt-5 sm:pt-6">
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
              className="mt-6 w-full sm:w-auto"
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

        <div className="order-1 lg:order-2 lg:col-span-5">
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
