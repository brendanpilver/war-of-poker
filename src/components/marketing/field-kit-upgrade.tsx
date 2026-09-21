import { formatPrice, offers } from "@/lib/offers";
import { BuyOfferButton } from "./buy-offer-button";

/**
 * The $15 Field Kit upgrade, offered to a verified book owner. Rendered on
 * `/downloads` for a book download link and on `/upgrade` for an upgrade
 * entitlement; both pass the purchase's entitlement, which `/api/checkout`
 * checks against the purchase record. See `src/lib/book-ownership.ts`.
 */
export function FieldKitUpgrade({
  entitlement,
  location,
  headingLevel = "h2",
}: {
  entitlement: string;
  location: string;
  headingLevel?: "h1" | "h2";
}) {
  const price = formatPrice(offers["field-kit-upgrade"].amountCents);
  const Heading = headingLevel;

  return (
    <section
      aria-labelledby={`${location}-title`}
      className="border-t-2 border-gold bg-ink-card p-6 sm:p-8"
    >
      <Heading
        id={`${location}-title`}
        className="text-2xl font-bold text-balance text-bone uppercase"
      >
        Already own the book? Add the complete Field Kit for {price}.
      </Heading>
      <p className="mt-3 leading-relaxed text-pretty text-bone-muted">
        The seven printable tools for applying, studying, and reviewing the
        system — delivered with your book as the complete system.
      </p>
      <BuyOfferButton
        offerId="field-kit-upgrade"
        location={location}
        entitlement={entitlement}
        className="mt-6 w-full sm:w-auto"
        label={`Add the Field Kit — ${price}`}
      />
    </section>
  );
}
