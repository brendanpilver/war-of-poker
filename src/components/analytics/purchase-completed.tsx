"use client";

import { useEffect, useRef } from "react";
import { track } from "@/lib/analytics/track";

/**
 * Records the browser-side view of a completed purchase, so the buyer's session
 * and stored attribution are tied to the sale.
 *
 * The authoritative `purchase_completed` event is written by the Stripe webhook
 * from verified server state; this one is marked `client` so reporting can
 * count the server event and ignore this.
 */
export function PurchaseCompleted({
  offerId,
  amountCents,
}: {
  offerId: string;
  amountCents: number;
}) {
  const sent = useRef(false);

  useEffect(() => {
    if (sent.current) return;
    sent.current = true;
    track("purchase_completed", {
      offer: offerId,
      amount_cents: amountCents,
      source: "client",
    });
  }, [offerId, amountCents]);

  return null;
}
