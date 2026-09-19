import Link from "next/link";
import { BuyButton } from "@/components/marketing/buy-button";
import { BrandLogo } from "./brand-logo";
import { navLinks } from "./nav-links";

/**
 * The site header.
 *
 * On phones the nav used to be a second full-width strip of uppercase mono
 * links directly beneath the logo, which put four competing links above the
 * product on every page. It now collapses into the footer of the header row at
 * a smaller, quieter weight, so the first thing on screen is the product.
 */

const navLinkClass =
  "font-mono text-[11px] tracking-[0.12em] text-bone-muted uppercase transition-colors duration-150 hover:text-bone";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-line bg-ink/95 supports-[backdrop-filter]:bg-ink/85 supports-[backdrop-filter]:backdrop-blur-sm">
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between gap-4 px-5 sm:h-16 sm:px-8">
        <Link href="/" className="shrink-0" aria-label="War of Poker — home">
          <BrandLogo height={44} loading="eager" className="h-9 w-auto sm:h-10" />
        </Link>

        <nav aria-label="Primary" className="hidden md:block">
          <ul className="flex items-center gap-7">
            {navLinks.map((link) => (
              <li key={link.href}>
                <Link href={link.href} className={navLinkClass}>
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <BuyButton size="compact" location="site-header" />
      </div>

      {/* Phones only: one quiet scrollable row rather than a second banner. */}
      <nav aria-label="Primary" className="border-t border-line/60 md:hidden">
        <ul className="mx-auto flex max-w-5xl gap-5 overflow-x-auto px-5 py-2 whitespace-nowrap">
          {navLinks.map((link) => (
            <li key={link.href}>
              <Link href={link.href} className={navLinkClass}>
                {link.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </header>
  );
}
