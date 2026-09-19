import { TrackedCta } from "@/components/analytics/tracked-cta";
import { formatPrice, offers } from "@/lib/offers";
import { productPricingHref } from "@/lib/short-stack-plo";

/**
 * A call to action that sends the reader to the pricing block to choose an
 * offer. Checkout itself is started by `BuyOfferButton`, which needs a specific
 * offer id; this is for the places that should not preempt that choice.
 */
type BuyButtonProps = {
  /** Compact drops the price for tight spaces such as the site header. */
  size?: "default" | "compact";
  /** Names the placement for `cta_clicked` reporting. */
  location: string;
  className?: string;
};

export function BuyButton({ size = "default", location, className = "" }: BuyButtonProps) {
  const label =
    size === "compact"
      ? "Get the System"
      : `Get the Complete System — ${formatPrice(offers.system.amountCents)}`;
  const sizing =
    size === "compact" ? "px-3.5 py-2 text-[13px]" : "px-6 py-3.5 text-base";

  return (
    <TrackedCta
      href={productPricingHref}
      location={location}
      label={label}
      className={`inline-flex items-center justify-center rounded-[2px] bg-gold text-center font-semibold whitespace-nowrap text-ink shadow-[inset_0_-2px_0_rgb(0_0_0/0.18)] transition-colors duration-150 hover:bg-gold-light active:translate-y-px ${sizing} ${className}`}
    >
      {label}
    </TrackedCta>
  );
}
