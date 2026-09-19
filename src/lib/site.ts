/**
 * The site's own origin.
 *
 * `https://warofpoker.com` is the real production home: the Next.js app will be
 * hosted there, replacing the current site, at launch. It stays the default so
 * production needs no configuration to be correct.
 *
 * A staging deploy overrides it, because this value is not cosmetic — Stripe's
 * success and cancel URLs, the links in every email, canonical tags, OpenGraph
 * URLs, and the sitemap are all built from it. A preview pointing at the
 * production domain would send a buyer to a host that is not serving this app.
 *
 * Resolution order:
 *   1. `NEXT_PUBLIC_SITE_URL` — set this explicitly on any non-production host.
 *   2. `NEXT_PUBLIC_VERCEL_PROJECT_PRODUCTION_URL` / `NEXT_PUBLIC_VERCEL_URL` —
 *      picked up automatically on Vercel, so the staging copy is self-consistent
 *      with no configuration at all.
 *   3. The production domain.
 */

function normalize(value: string | undefined): string | null {
  if (!value) return null;
  const trimmed = value.trim().replace(/\/+$/, "");
  if (trimmed.length === 0) return null;
  // Vercel supplies a bare host; an explicit override may include the scheme.
  return /^https?:\/\//.test(trimmed) ? trimmed : `https://${trimmed}`;
}

export const PRODUCTION_URL = "https://warofpoker.com";

export const siteUrl =
  normalize(process.env.NEXT_PUBLIC_SITE_URL) ??
  normalize(process.env.NEXT_PUBLIC_VERCEL_PROJECT_PRODUCTION_URL) ??
  normalize(process.env.NEXT_PUBLIC_VERCEL_URL) ??
  PRODUCTION_URL;

/**
 * Whether this deploy is the real site. Staging is marked noindex so a preview
 * copy never competes with production in search results.
 */
export const isProductionSite = siteUrl === PRODUCTION_URL;
