/**
 * The Short Stack PLO offer catalogue.
 *
 * Prices live here as integer cents so the amount a customer was charged is
 * never reconstructed from a formatted string.
 *
 * Two public offers, sold as two different things rather than as a bundle and
 * its discount: the book teaches the method, the Complete System teaches it and
 * supplies the tools for applying it. No component assigns the Field Kit a
 * price of its own, and nothing here subtracts one offer from the other.
 *
 * The challenge player price is deliberately a separate entry rather than a
 * discount applied to `system`: reporting needs to tell an earned $29 sale from
 * a $39 full-price one, and the earned amount can then move without touching
 * any component.
 *
 * The id `system-quiz` is kept although the 3-Hand Reality Check it was named
 * for is gone. It is written into `purchases.offer_id` rows, into that column's
 * check constraint, and into every historical sale -- the same reasoning that
 * kept the `quiz_*` event names in `src/lib/analytics/events.ts`.
 */

export type OfferId = "book" | "system" | "system-quiz";

/** What a purchase entitles the customer to download. See `src/lib/delivery.ts`. */
export type ProductId = "book" | "complete-system";

export type Offer = {
  id: OfferId;
  product: ProductId;
  name: string;
  /** Shown beneath the name on the pricing cards. */
  description: string;
  amountCents: number;
  /** The public price of the same product, when this offer is earned. */
  compareAtCents?: number;
  /** Only offers marked eligible are unlocked by finishing the challenge. */
  quizCompleterOnly: boolean;
};

const SYSTEM_CENTS = 3900;

function playerPriceCents(): number {
  const raw = process.env.NEXT_PUBLIC_QUIZ_OFFER_CENTS;
  const parsed = raw ? Number.parseInt(raw, 10) : Number.NaN;
  // Guard the parse rather than trusting deploy config: a typo here would
  // otherwise create a $0 or NaN checkout.
  return Number.isInteger(parsed) && parsed > 0 ? parsed : 2900;
}

const systemDescription =
  "The strategy guide plus the full Field Kit for applying, studying, and reviewing the system.";

export const offers: Record<OfferId, Offer> = {
  book: {
    id: "book",
    product: "book",
    name: "Book Only",
    description: "The strategy guide for learning the system.",
    amountCents: 1900,
    quizCompleterOnly: false,
  },
  system: {
    id: "system",
    product: "complete-system",
    name: "Complete System",
    description: systemDescription,
    amountCents: SYSTEM_CENTS,
    quizCompleterOnly: false,
  },
  "system-quiz": {
    id: "system-quiz",
    product: "complete-system",
    name: "Complete System",
    description: systemDescription,
    get amountCents() {
      return playerPriceCents();
    },
    compareAtCents: SYSTEM_CENTS,
    quizCompleterOnly: true,
  },
};

export const offerIds = Object.keys(offers) as OfferId[];

export function isOfferId(value: unknown): value is OfferId {
  return typeof value === "string" && value in offers;
}

/** `3900` -> `"$39"`, `3950` -> `"$39.50"`. */
export function formatPrice(amountCents: number): string {
  const dollars = amountCents / 100;
  return Number.isInteger(dollars)
    ? `$${dollars}`
    : `$${dollars.toFixed(2)}`;
}
