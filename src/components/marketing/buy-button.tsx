import { shortStackPlo, shortStackPloCheckoutHref } from "@/lib/short-stack-plo";

type BuyButtonProps = {
  /** Compact drops the price for tight spaces such as the site header. */
  size?: "default" | "compact";
  className?: string;
};

export function BuyButton({ size = "default", className = "" }: BuyButtonProps) {
  const label =
    size === "compact"
      ? `Get ${shortStackPlo.title}`
      : `Get ${shortStackPlo.title} — ${shortStackPlo.price}`;
  const sizing =
    size === "compact" ? "px-3.5 py-2 text-[13px]" : "px-6 py-3.5 text-base";

  return (
    <a
      href={shortStackPloCheckoutHref}
      className={`inline-flex items-center justify-center rounded-[2px] bg-gold text-center font-semibold whitespace-nowrap text-ink shadow-[inset_0_-2px_0_rgb(0_0_0/0.18)] transition-colors duration-150 hover:bg-gold-light active:translate-y-px ${sizing} ${className}`}
    >
      {label}
    </a>
  );
}
