import Stripe from "stripe";
import { env } from "./env";
import type { Attribution } from "./analytics/events";
import type { OfferId } from "./offers";

/**
 * Stripe client and the metadata contract for a Checkout session.
 *
 * Returns `null` when unconfigured so the site builds and runs without Stripe
 * keys; the checkout route reports that plainly rather than failing obscurely.
 * Use test-mode keys (`sk_test_…`) in development.
 */

let cached: Stripe | null = null;

export function stripeClient(): Stripe | null {
  const { stripeSecretKey } = env;
  if (!stripeSecretKey) return null;
  cached ??= new Stripe(stripeSecretKey, { typescript: true });
  return cached;
}

/**
 * What we attach to a Checkout session so the webhook can reconstruct the sale.
 *
 * Stripe metadata values are strings, so everything is flattened. The offer id
 * is the important one: the webhook resolves the product and the expected price
 * from it rather than trusting any amount that came from a browser.
 */
export type CheckoutMetadata = {
  offer_id: OfferId;
  session_id: string;
  content_id: string;
  utm_source: string;
  utm_medium: string;
  utm_campaign: string;
  platform: string;
  landing_page: string;
};

export function buildCheckoutMetadata(
  offerId: OfferId,
  sessionId: string | null,
  attribution: Attribution,
): CheckoutMetadata {
  // Stripe rejects null metadata values, so absent attribution becomes "".
  return {
    offer_id: offerId,
    session_id: sessionId ?? "",
    content_id: attribution.src ?? "",
    utm_source: attribution.utmSource ?? "",
    utm_medium: attribution.utmMedium ?? "",
    utm_campaign: attribution.utmCampaign ?? "",
    platform: attribution.platform ?? "",
    landing_page: attribution.landingPage ?? "",
  };
}

/** Turns Stripe metadata back into the columns the purchases table expects. */
export function metadataToColumns(metadata: Stripe.Metadata | null) {
  const value = (key: string) => {
    const raw = metadata?.[key];
    return typeof raw === "string" && raw.length > 0 ? raw : null;
  };
  return {
    session_id: value("session_id"),
    content_id: value("content_id"),
    utm_source: value("utm_source"),
    utm_medium: value("utm_medium"),
    utm_campaign: value("utm_campaign"),
    platform: value("platform"),
    landing_page: value("landing_page"),
  };
}
