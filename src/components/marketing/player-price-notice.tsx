"use client";

import { useSearchParams } from "next/navigation";
import { formatPrice, offers } from "@/lib/offers";
import { BuyOfferButton } from "./buy-offer-button";

/**
 * The way back to the player price.
 *
 * Someone who finishes the challenge and asks for their results by email
 * instead of buying gets `/short-stack-plo?offer=player` in that email and in
 * the sequence that follows. This renders the earned price when they follow it,
 * and nothing at all otherwise, so the sales page's public price is what an
 * ordinary visitor sees.
 *
 * `useSearchParams` puts only this component behind a Suspense boundary; the
 * rest of the sales page stays prerendered. There is no countdown and no
 * expiry: the offer is theirs because they finished the challenge.
 *
 * Not a security boundary. `system-quiz` is a real offer id and `/api/checkout`
 * resolves its amount server-side, so nothing chargeable is decided here -- but
 * a reader who knows the id can select it without the link. See
 * docs/GROWTH-ARCHITECTURE.md § Offers.
 */

export const PLAYER_PRICE_PARAM = "offer";
export const PLAYER_PRICE_VALUE = "player";

export function PlayerPriceNotice() {
  const searchParams = useSearchParams();
  if (searchParams.get(PLAYER_PRICE_PARAM) !== PLAYER_PRICE_VALUE) return null;

  const offer = offers["system-quiz"];

  return (
    <div className="mb-10 border-t-2 border-gold bg-ink-card p-6 sm:p-8">
      <p className="font-mono text-[11px] tracking-[0.18em] text-gold uppercase">
        You finished the challenge — your Player Price is still on
      </p>
      <h3 className="mt-3 text-2xl font-bold text-balance text-bone uppercase">
        Get Short Stack PLO + the complete Field Kit for{" "}
        {formatPrice(offer.amountCents)}
      </h3>
      <dl className="mt-5 flex flex-wrap items-baseline gap-x-8 gap-y-2">
        <div className="flex items-baseline gap-2">
          <dt className="text-sm text-bone-faint">Regular price</dt>
          <dd className="text-lg text-bone-muted tabular-nums">
            {formatPrice(offer.compareAtCents ?? offers.system.amountCents)}
          </dd>
        </div>
        <div className="flex items-baseline gap-2">
          <dt className="text-sm text-gold">Your player price</dt>
          <dd className="text-4xl font-bold text-bone tabular-nums">
            {formatPrice(offer.amountCents)}
          </dd>
        </div>
      </dl>
      <BuyOfferButton
        offerId="system-quiz"
        location="pricing-player-price"
        className="mt-6 w-full sm:w-auto"
        label={`Get the Book + Field Kit — ${formatPrice(offer.amountCents)}`}
      />
    </div>
  );
}
