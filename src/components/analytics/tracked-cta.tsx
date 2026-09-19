"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { track } from "@/lib/analytics/track";

/**
 * A call to action that records `cta_clicked` before navigating.
 *
 * `location` names where on the site the CTA sits (for example "hero" or
 * "pricing"), so the dashboard can tell which placements actually move people
 * into the funnel.
 */
type TrackedCtaProps = {
  href: string;
  location: string;
  label?: string;
  className?: string;
  children: ReactNode;
};

export function TrackedCta({
  href,
  location,
  label,
  className,
  children,
}: TrackedCtaProps) {
  const record = () =>
    track("cta_clicked", {
      location,
      href,
      label: label ?? (typeof children === "string" ? children : null),
    });

  // Anchors for same-page jumps; Link for real navigations.
  if (href.startsWith("#")) {
    return (
      <a href={href} className={className} onClick={record}>
        {children}
      </a>
    );
  }

  return (
    <Link href={href} className={className} onClick={record}>
      {children}
    </Link>
  );
}
