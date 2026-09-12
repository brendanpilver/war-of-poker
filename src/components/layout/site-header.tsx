import Link from "next/link";
import { BuyButton } from "@/components/marketing/buy-button";
import { BrandLogo } from "./brand-logo";
import { navLinks } from "./nav-links";

const navLinkClass =
  "font-mono text-xs uppercase tracking-[0.14em] text-bone-muted transition-colors duration-150 hover:text-bone";

export function SiteHeader() {
  return (
    <>
      <header className="sticky top-0 z-40 border-b border-line bg-ink/95 supports-[backdrop-filter]:bg-ink/85 supports-[backdrop-filter]:backdrop-blur-sm">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-6 px-5 sm:px-8">
          <Link href="/" className="shrink-0">
            <BrandLogo height={48} loading="eager" className="h-10 w-auto sm:h-11" />
          </Link>
          <nav aria-label="Primary" className="hidden md:block">
            <ul className="flex items-center gap-7">
              {navLinks.map((link) => (
                <li key={link.href}>
                  <a href={link.href} className={navLinkClass}>
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
          <BuyButton size="compact" />
        </div>
      </header>
      <nav aria-label="Primary" className="border-b border-line md:hidden">
        <ul className="mx-auto flex max-w-6xl justify-between gap-4 overflow-x-auto px-5 py-3 whitespace-nowrap sm:justify-start sm:gap-7 sm:px-8">
          {navLinks.map((link) => (
            <li key={link.href}>
              <a href={link.href} className={navLinkClass}>
                {link.label}
              </a>
            </li>
          ))}
        </ul>
      </nav>
    </>
  );
}
