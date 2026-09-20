"use client";

import { useState } from "react";
import { getSessionId, readAttribution } from "@/lib/analytics/attribution";
import { track } from "@/lib/analytics/track";
import { formatPrice, offers, type OfferId } from "@/lib/offers";

/**
 * Starts Stripe Checkout for one offer.
 *
 * The price and the offer definition are resolved server-side from the offer
 * id; this component sends only the id, so a tampered request cannot change
 * what anything costs. Attribution rides along in the request body and is
 * stored on the Checkout session's metadata, which is how a purchase gets
 * traced back to the content that produced it.
 */

type BuyOfferButtonProps = {
  offerId: OfferId;
  /** Where on the site this button sits, for `cta_clicked` reporting. */
  location: string;
  /** Prefills Stripe Checkout when we already know the address. */
  email?: string;
  variant?: "primary" | "secondary";
  className?: string;
  label?: string;
};

export function BuyOfferButton({
  offerId,
  location,
  email,
  variant = "primary",
  className = "",
  label,
}: BuyOfferButtonProps) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const offer = offers[offerId];

  async function startCheckout() {
    if (pending) return;
    setPending(true);
    setError(null);

    track("product_selected", { offer: offerId, price_cents: offer.amountCents });
    track("checkout_started", {
      offer: offerId,
      price_cents: offer.amountCents,
      location,
    });
    if (offer.quizCompleterOnly) {
      track("promo_offer_used", { offer: offerId, price_cents: offer.amountCents });
    }

    try {
      const response = await fetch("/api/checkout", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          offerId,
          email,
          sessionId: getSessionId(),
          attribution: readAttribution(),
        }),
      });

      const body = (await response.json().catch(() => null)) as
        | { url?: string; error?: string }
        | null;

      if (!response.ok || !body?.url) {
        setError(body?.error ?? "Checkout is unavailable right now.");
        setPending(false);
        return;
      }

      window.location.assign(body.url);
    } catch {
      setError("Checkout is unavailable right now.");
      setPending(false);
    }
  }

  const styles =
    variant === "primary"
      ? "bg-gold text-ink shadow-[inset_0_-2px_0_rgb(0_0_0/0.18)] hover:bg-gold-light"
      : "border border-line bg-ink-card text-bone hover:border-bone-faint hover:bg-ink-raised";

  return (
    // `relative` so the error can be taken out of flow below. A transparent
    // border keeps this the same height as an outlined call to action, which is
    // what lets a row of mixed buttons line up on the same baseline.
    <span className="relative inline-flex flex-col items-stretch">
      <button
        type="button"
        onClick={startCheckout}
        disabled={pending}
        className={`inline-flex items-center justify-center rounded-[2px] border border-transparent px-6 py-3.5 text-center font-semibold whitespace-nowrap transition-colors duration-150 active:translate-y-px disabled:opacity-60 ${styles} ${className}`}
      >
        {pending
          ? "Opening checkout…"
          : (label ?? `Get the ${offer.name} — ${formatPrice(offer.amountCents)}`)}
      </button>
      {/* Positioned rather than stacked: in a pricing row this button is
          anchored to the bottom of its column, so an error appearing in flow
          would shove it upward and break the row's alignment just as the
          reader is trying to buy. */}
      {error && (
        <span
          aria-live="polite"
          className="absolute top-full right-0 left-0 mt-2.5 text-sm text-gold"
        >
          {error}
        </span>
      )}
    </span>
  );
}
