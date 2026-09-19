import Link from "next/link";
import { shortStackPlo } from "@/lib/short-stack-plo";
import { BrandLogo } from "./brand-logo";
import { navLinks } from "./nav-links";

const legalLinks = [
  { label: "Contact", href: "/contact" },
  { label: "Privacy", href: "/privacy" },
  { label: "Terms", href: "/terms" },
];

const headingClass =
  "font-mono text-xs uppercase tracking-[0.18em] text-bone-faint";

export function SiteFooter() {
  const exploreLinks = navLinks.filter((link) => link.href !== "/#about");

  return (
    <footer id="about" className="border-t border-line bg-ink-raised">
      <div className="mx-auto grid max-w-6xl gap-12 px-5 py-14 sm:px-8 lg:grid-cols-12 lg:py-16">
        <div className="lg:col-span-6">
          <BrandLogo height={96} className="h-20 w-auto" />
          <h2 className="sr-only">About War of Poker</h2>
          <p className="mt-6 max-w-md text-pretty text-bone-muted">
            War of Poker develops practical systems, guides, and tools for
            players who want to think more clearly and play more deliberately.
          </p>
        </div>

        <nav aria-label="Footer" className="grid grid-cols-2 gap-8 lg:col-span-6">
          <div>
            <h2 className={headingClass}>Explore</h2>
            <ul className="mt-4 space-y-3">
              {exploreLinks.map((link) => (
                <li key={link.href}>
                  <a
                    href={link.href}
                    className="text-bone-muted transition-colors duration-150 hover:text-bone"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h2 className={headingClass}>Contact &amp; Legal</h2>
            <ul className="mt-4 space-y-3">
              {legalLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-bone-muted transition-colors duration-150 hover:text-bone"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </nav>
      </div>

      <div className="border-t border-line">
        <div className="mx-auto flex max-w-6xl flex-col gap-2 px-5 py-6 text-xs text-bone-faint sm:flex-row sm:justify-between sm:px-8">
          <p>© {new Date().getFullYear()} War of Poker. All rights reserved.</p>
          <p>
            {shortStackPlo.title} by {shortStackPlo.author}, published by{" "}
            {shortStackPlo.publisher}.
          </p>
        </div>
      </div>
    </footer>
  );
}
