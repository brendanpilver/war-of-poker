import { TrackedCta } from "@/components/analytics/tracked-cta";
import { formatPrice, offers } from "@/lib/offers";
import {
  CHALLENGE_PATH,
  PRODUCT_PATH,
  productPricingHref,
  shortStackPlo,
} from "@/lib/short-stack-plo";
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
 * `variant` sets which action leads, because the two pages receive different
 * traffic:
 *
 * - **home** leads with the 10-Hand Challenge. Social and content links point
 *   at the challenge, and it sells the system better than a price does: ten
 *   worked decisions in River Potter's voice, with the player price at the end.
 *   Both variants name that price in figures. "Your player price is unlocked"
 *   told a first-time visitor nothing -- the reward has to be a number before
 *   it can be a reason to start.
 * - **product** leads with checkout. This is the dedicated sales page, and
 *   someone who arrives ready to buy should not have to navigate around a free
 *   quiz to do it. The challenge follows as the alternative for a reader who
 *   isn't ready yet.
 *
 * Either way buying is never gated behind the challenge: `Pricing` is high on
 * both pages and the price sits in this block on both.
 *
 * The grid is three items rather than two — copy, cover, then the actions — so
 * that on one column the cover falls between the pitch and the price instead of
 * above the headline or below the button. On `lg` the cover spans both rows in
 * the right-hand column, which puts the left column back to the single stack it
 * has always been.
 *
 * That order only fits a phone because there is very little above it: the
 * headline, one byline, one line of argument. A paragraph describing the book
 * as a decision system for expensive spots used to sit here too, and it was
 * cut rather than shortened — `ExpensiveDecision` follows immediately and makes
 * that case with a real $242 hand, so the hero was spending a line to preempt
 * its own proof. The byline holds on one line down to 375px, which is what buys
 * the cover its full width back.
 *
 * `shortStackPlo.subtitle` is the book's real subtitle and stays as it is —
 * metadata and the cover's alt text quote it, and the cover art itself carries
 * it here — so the byline is a hero-length version, not a change to the
 * product.
 */

const primaryLinkClass =
  "inline-flex w-full items-center justify-center rounded-[2px] bg-gold px-6 py-3.5 text-center font-semibold whitespace-nowrap text-ink shadow-[inset_0_-2px_0_rgb(0_0_0/0.18)] transition-colors duration-150 hover:bg-gold-light active:translate-y-px sm:w-auto";

const secondaryLinkClass =
  "inline-flex w-full items-center justify-center rounded-[2px] border border-line bg-ink-card px-6 py-3.5 text-center font-semibold whitespace-nowrap text-bone transition-colors duration-150 hover:border-bone-faint hover:bg-ink-raised active:translate-y-px sm:w-auto";

export function ProductHero({ variant }: { variant: "home" | "product" }) {
  const system = offers.system;
  const book = offers.book;
  const player = offers["system-quiz"];

  const bookLine = (
    <p className="mt-4 text-[15px] text-bone-muted">
      Book only — {formatPrice(book.amountCents)}.{" "}
      <TrackedCta
        href={variant === "home" ? productPricingHref : "#pricing"}
        location={`${variant}-hero-pricing`}
        label="pricing"
        className="text-bone underline decoration-bone/30 underline-offset-4 transition-colors hover:decoration-gold"
      >
        See both options
      </TrackedCta>
    </p>
  );

  return (
    <section aria-labelledby="product-hero-title" className="border-b border-line">
      <div className="mx-auto grid max-w-5xl gap-x-14 px-5 pt-5 pb-14 sm:px-8 sm:pt-16 lg:grid-cols-12 lg:items-center lg:pt-20 lg:pb-20">
        <div className="lg:col-span-7">
          <h1
            id="product-hero-title"
            className="text-[2.75rem] leading-[0.92] font-bold tracking-[-0.02em] text-bone uppercase sm:text-6xl lg:text-7xl"
          >
            <span className="block">Short Stack</span>
            <span className="block text-gold">PLO</span>
          </h1>

          <p className="mt-3 text-[15px] leading-snug text-pretty text-bone-faint sm:mt-4">
            Shallow-stack live PLO strategy by {shortStackPlo.author}
          </p>

          <p className="mt-5 max-w-lg text-xl leading-snug text-balance text-bone sm:mt-6 sm:text-2xl">
            Stop bringing Hold&apos;em instincts into PLO.
          </p>
        </div>

        <div className="mt-6 sm:mt-10 lg:col-span-5 lg:row-span-2 lg:mt-0">
          <BookCover
            sizes="(min-width: 1024px) 360px, 240px"
            loading="eager"
            className="mx-auto w-full max-w-[11.5rem] sm:max-w-[15rem] lg:max-w-none"
          />
        </div>

        <div className="lg:col-span-7">
          {variant === "product" ? (
            <>
              <div className="mt-5 border-t border-line pt-4 sm:mt-7 sm:pt-6">
                <p className="flex flex-wrap items-baseline gap-x-3">
                  <span className="text-lg font-semibold text-bone">
                    Complete System
                  </span>
                  <span className="text-3xl font-bold text-bone tabular-nums">
                    {formatPrice(system.amountCents)}
                  </span>
                </p>
                <p className="mt-1.5 text-bone-muted">
                  The book and the full Field Kit — learn the method, and apply it.
                </p>
                <BuyOfferButton
                  offerId="system"
                  location="product-hero"
                  className="mt-5 w-full sm:w-auto"
                  label={`Get the Complete System — ${formatPrice(system.amountCents)}`}
                />
                {bookLine}
              </div>

              <div className="mt-6 border-t border-line pt-5 sm:mt-7 sm:pt-6">
                <p className="text-[15px] leading-snug text-pretty text-bone-muted">
                  Not sure yet? Ten live PLO decisions, worked, free. Finish it
                  and your player price on the Complete System is{" "}
                  <span className="font-semibold text-bone">
                    {formatPrice(player.amountCents)}
                  </span>{" "}
                  instead of {formatPrice(system.amountCents)}.
                </p>
                <TrackedCta
                  href={CHALLENGE_PATH}
                  location="product-hero-secondary"
                  label="Take the 10-Hand Challenge"
                  className={`mt-5 ${secondaryLinkClass}`}
                >
                  Take the 10-Hand Challenge
                </TrackedCta>
              </div>
            </>
          ) : (
            <>
              <div className="mt-5 border-t border-line pt-4 sm:mt-7 sm:pt-6">
                <TrackedCta
                  href={CHALLENGE_PATH}
                  location="home-hero"
                  label="Take the 10-Hand Challenge"
                  className={primaryLinkClass}
                >
                  Take the 10-Hand Challenge
                </TrackedCta>
                <p className="mt-3 text-[15px] leading-snug text-pretty text-bone-muted">
                  Free. Ten live PLO decisions, worked. Finish it and your player
                  price on the Complete System is{" "}
                  <span className="font-semibold text-bone">
                    {formatPrice(player.amountCents)}
                  </span>{" "}
                  instead of {formatPrice(system.amountCents)}.
                </p>
              </div>

              <div className="mt-6 border-t border-line pt-5 sm:mt-7 sm:pt-6">
                <p className="flex flex-wrap items-baseline gap-x-3">
                  <span className="text-lg font-semibold text-bone">
                    Complete System
                  </span>
                  <span className="text-3xl font-bold text-bone tabular-nums">
                    {formatPrice(system.amountCents)}
                  </span>
                </p>
                <p className="mt-1.5 text-bone-muted">
                  The book and the full Field Kit — learn the method, and apply it.
                </p>
                <TrackedCta
                  href={PRODUCT_PATH}
                  location="home-hero-secondary"
                  label="See the Short Stack PLO System"
                  className={`mt-5 ${secondaryLinkClass}`}
                >
                  See the Short Stack PLO System
                </TrackedCta>
                {bookLine}
              </div>
            </>
          )}
        </div>
      </div>
    </section>
  );
}
