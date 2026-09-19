/**
 * The Short Stack PLO offer catalogue.
 *
 * Prices live here as integer cents so the amount a customer was charged is
 * never reconstructed from a formatted string. The quiz-completer offer is
 * deliberately a separate entry rather than a discount applied to `system`:
 * reporting needs to tell a $39 promotional sale from a $49 full-price one, and
 * the promotional amount can then move without touching any component.
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
  /** Set when this offer is a promotional price for an offer sold higher. */
  compareAtCents?: number;
  /** Only offers marked eligible may be unlocked by finishing the quiz. */
  quizCompleterOnly: boolean;
};

function promotionalSystemCents(): number {
  const raw = process.env.NEXT_PUBLIC_QUIZ_OFFER_CENTS;
  const parsed = raw ? Number.parseInt(raw, 10) : Number.NaN;
  // Guard the parse rather than trusting deploy config: a typo here would
  // otherwise create a $0 or NaN checkout.
  return Number.isInteger(parsed) && parsed > 0 ? parsed : 3900;
}

export const offers: Record<OfferId, Offer> = {
  book: {
    id: "book",
    product: "book",
    name: "Book Only",
    description: "The complete Short Stack PLO book.",
    amountCents: 2900,
    quizCompleterOnly: false,
  },
  system: {
    id: "system",
    product: "complete-system",
    name: "Complete System",
    description: "The book, the full 7-piece Field Kit, and the 20-Hand Capstone Quiz.",
    amountCents: 4900,
    quizCompleterOnly: false,
  },
  "system-quiz": {
    id: "system-quiz",
    product: "complete-system",
    name: "Complete System",
    description: "The book, the full 7-piece Field Kit, and the 20-Hand Capstone Quiz.",
    get amountCents() {
      return promotionalSystemCents();
    },
    compareAtCents: 4900,
    quizCompleterOnly: true,
  },
};

export const offerIds = Object.keys(offers) as OfferId[];

export function isOfferId(value: unknown): value is OfferId {
  return typeof value === "string" && value in offers;
}

/** `4900` -> `"$49"`, `3950` -> `"$39.50"`. */
export function formatPrice(amountCents: number): string {
  const dollars = amountCents / 100;
  return Number.isInteger(dollars)
    ? `$${dollars}`
    : `$${dollars.toFixed(2)}`;
}
