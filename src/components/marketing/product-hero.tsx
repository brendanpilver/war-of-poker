import { TrackedCta } from "@/components/analytics/tracked-cta";
import { formatPrice, offers } from "@/lib/offers";
import { totalHands } from "@/lib/quiz/hands";
import {
  CHALLENGE_PATH,
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
 * **Both pages now lead with checkout**, in the same order as `Pricing`: the
 * Complete System at its public price, then the challenge as the way to earn
 * the player price, then the book. The homepage used to lead with the challenge
 * and hold the offer underneath; that was reversed under explicit direction, so
 * the page a visitor lands on states the price first whichever one it is.
 *
 * The middle step is not a second checkout. Its call to action is the
 * challenge, because $29 is earned by finishing it — a buy button at that price
 * for every visitor would retire the thing it rewards. See `Pricing`.
 *
 * `variant` no longer changes the layout, only where the pricing link points
 * and how each placement is named in reporting: the sales page links to its own
 * pricing block, the homepage to the sales page's.
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

export function ProductHero({ variant }: { variant: "home" | "product" }) {
  const system = offers.system;
  const book = offers.book;
  const player = offers["system-quiz"];

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
              location={`${variant}-hero`}
              className="mt-5 w-full sm:w-auto"
              label={`Get the Complete System — ${formatPrice(system.amountCents)}`}
            />
          </div>

          <div className="mt-6 border-t border-line pt-5 sm:mt-7 sm:pt-6">
            <p className="flex flex-wrap items-baseline gap-x-3">
              <span className="text-lg font-semibold text-bone">
                Or earn your player price
              </span>
              <span className="text-3xl font-bold text-bone tabular-nums">
                {formatPrice(player.amountCents)}
              </span>
            </p>
            <p className="mt-1.5 text-bone-muted">
              Finish the free {totalHands}-Hand Challenge and the same Complete
              System is {formatPrice(player.amountCents)} instead of{" "}
              {formatPrice(system.amountCents)}.
            </p>
            <TrackedCta
              href={CHALLENGE_PATH}
              location={`${variant}-hero-challenge`}
              label={`Take the ${totalHands}-Hand Challenge`}
              className="mt-5 inline-flex w-full items-center justify-center rounded-[2px] border border-gold px-6 py-3.5 text-center font-semibold whitespace-nowrap text-gold transition-colors duration-150 hover:bg-gold hover:text-ink active:translate-y-px sm:w-auto"
            >
              Take the {totalHands}-Hand Challenge
            </TrackedCta>
          </div>

          <p className="mt-6 border-t border-line pt-5 text-[15px] text-bone-muted sm:mt-7 sm:pt-6">
            Book only — {formatPrice(book.amountCents)}.{" "}
            <TrackedCta
              href={variant === "home" ? productPricingHref : "#pricing"}
              location={`${variant}-hero-pricing`}
              label="pricing"
              className="text-bone underline decoration-bone/30 underline-offset-4 transition-colors hover:decoration-gold"
            >
              See all three options
            </TrackedCta>
          </p>
        </div>
      </div>
    </section>
  );
}
