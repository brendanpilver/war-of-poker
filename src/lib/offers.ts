/**
 * The Short Stack PLO offer catalogue.
 *
 * Prices live here as integer cents so the amount a customer was charged is
 * never reconstructed from a formatted string.
 *
 * Five offers, three of them public:
 *
 * - `system` — the Complete System, book plus the complete Field Kit, $39. The
 *   main offer. Bought separately the two would be $25 + $19 = $44.
 * - `system-quiz` — the same Complete System at the $29 Player Price, earned by
 *   finishing the 10-Hand Challenge. The major promotional path.
 * - `book` — the book alone, $25, for a reader who wants to start there.
 * - `field-kit` — the Field Kit alone, $19. Available, never a headline CTA.
 * - `field-kit-upgrade` — the Field Kit for $15, sold only to someone who
 *   already owns the book. A book-first buyer who upgrades pays $40 in all,
 *   against $39 upfront; that gap is intentional.
 *
 * The Player Price is deliberately a separate entry rather than a discount
 * applied to `system`: reporting needs to tell an earned $29 sale from a $39
 * full-price one, and the earned amount can then move without touching any
 * component.
 *
 * The id `system-quiz` is kept although the 3-Hand Reality Check it was named
 * for is gone. It is written into `purchases.offer_id` rows, into that column's
 * check constraint, and into every historical sale -- the same reasoning that
 * kept the `quiz_*` event names in `src/lib/analytics/events.ts`.
 */

export type OfferId =
  | "book"
  | "field-kit"
  | "system"
  | "system-quiz"
  | "field-kit-upgrade";

/** What a purchase entitles the customer to download. See `src/lib/delivery.ts`. */
export type ProductId = "book" | "field-kit" | "complete-system";

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
  /**
   * Sold only to a verified owner of the book. `/api/checkout` refuses these
   * without a valid book delivery token that matches a paid book purchase.
   */
  bookOwnerOnly: boolean;
};

const BOOK_CENTS = 2500;
const FIELD_KIT_CENTS = 1900;
const SYSTEM_CENTS = 3900;
const UPGRADE_CENTS = 1500;

/** What the book and the Field Kit cost bought one at a time: $44. */
export const SEPARATE_TOTAL_CENTS = BOOK_CENTS + FIELD_KIT_CENTS;

function playerPriceCents(): number {
  const raw = process.env.NEXT_PUBLIC_QUIZ_OFFER_CENTS;
  const parsed = raw ? Number.parseInt(raw, 10) : Number.NaN;
  // Guard the parse rather than trusting deploy config: a typo here would
  // otherwise create a $0 or NaN checkout.
  return Number.isInteger(parsed) && parsed > 0 ? parsed : 2900;
}

const systemDescription =
  "The Short Stack PLO book plus the complete Field Kit for applying, studying, and reviewing the system.";

export const offers: Record<OfferId, Offer> = {
  book: {
    id: "book",
    product: "book",
    name: "Book Only",
    description: "The strategy guide for learning the system.",
    amountCents: BOOK_CENTS,
    quizCompleterOnly: false,
    bookOwnerOnly: false,
  },
  "field-kit": {
    id: "field-kit",
    product: "field-kit",
    name: "Field Kit Only",
    description:
      "The seven printable Field Kit tools for applying, studying, and reviewing the system.",
    amountCents: FIELD_KIT_CENTS,
    quizCompleterOnly: false,
    bookOwnerOnly: false,
  },
  system: {
    id: "system",
    product: "complete-system",
    name: "Complete System",
    description: systemDescription,
    amountCents: SYSTEM_CENTS,
    quizCompleterOnly: false,
    bookOwnerOnly: false,
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
    bookOwnerOnly: false,
  },
  // Entitles the buyer to the whole Complete System, not the Field Kit alone,
  // so the new download link carries the book they already own alongside the
  // kit. Their original book link keeps working as before.
  "field-kit-upgrade": {
    id: "field-kit-upgrade",
    product: "complete-system",
    name: "Field Kit Upgrade",
    description: "The complete Field Kit, added to the book you already own.",
    amountCents: UPGRADE_CENTS,
    quizCompleterOnly: false,
    bookOwnerOnly: true,
  },
};

export const offerIds = Object.keys(offers) as OfferId[];

export function isOfferId(value: unknown): value is OfferId {
  return typeof value === "string" && Object.hasOwn(offers, value);
}

/** `3900` -> `"$39"`, `3950` -> `"$39.50"`. */
export function formatPrice(amountCents: number): string {
  const dollars = amountCents / 100;
  return Number.isInteger(dollars)
    ? `$${dollars}`
    : `$${dollars.toFixed(2)}`;
}
