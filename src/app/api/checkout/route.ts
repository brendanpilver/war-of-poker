import { NextResponse } from "next/server";
import { recordEvent } from "@/lib/analytics/record";
import { verifyUpgradeEntitlement } from "@/lib/book-ownership";
import { isOfferId, offers } from "@/lib/offers";
import { siteUrl } from "@/lib/site";
import { buildCheckoutMetadata, stripeClient } from "@/lib/stripe";
import { parseAttributionInput, parseEmail, parseText } from "@/lib/validation";

/**
 * Creates a Stripe Checkout session.
 *
 * The browser sends an offer id, never a price. Everything chargeable -- the
 * amount, the currency, the product name -- is resolved here from the offer
 * catalogue, so a tampered request can only select a different real offer, not
 * invent a cheaper one.
 *
 * The $15 Field Kit upgrade is the one offer that also needs proof: it is sold
 * only against the signed upgrade entitlement of a paid, unrefunded book
 * purchase, and the checkout is locked to that purchase's email address. See
 * `src/lib/book-ownership.ts`.
 */

export async function POST(request: Request) {
  const stripe = stripeClient();
  if (!stripe) {
    return NextResponse.json(
      { error: "Checkout is not configured yet." },
      { status: 503 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const { offerId, email, sessionId, attribution, entitlement } = (body ??
    {}) as Record<string, unknown>;

  if (!isOfferId(offerId)) {
    return NextResponse.json({ error: "Unknown offer." }, { status: 400 });
  }

  const offer = offers[offerId];
  const parsedAttribution = parseAttributionInput(attribution);
  const parsedSessionId = parseText(sessionId, 64);
  let parsedEmail = parseEmail(email);
  let cancelUrl = `${siteUrl}/short-stack-plo?checkout=cancelled`;
  let upgradeOf: string | null = null;

  if (offer.bookOwnerOnly) {
    const ownership = await verifyUpgradeEntitlement(entitlement);
    if (!ownership.ok) {
      if (ownership.reason === "unavailable") {
        return NextResponse.json(
          { error: "The upgrade is unavailable right now." },
          { status: 503 },
        );
      }
      if (ownership.reason === "already-upgraded") {
        return NextResponse.json(
          { error: "This book purchase has already been upgraded." },
          { status: 409 },
        );
      }
      return NextResponse.json(
        {
          error:
            "The upgrade is for readers who already own the book. Use the upgrade link in your purchase email.",
        },
        { status: 403 },
      );
    }
    // The upgrade is delivered to the address that bought the book, whatever
    // the browser sent.
    parsedEmail = ownership.owner.email;
    upgradeOf = ownership.owner.purchaseId;
    cancelUrl = `${siteUrl}/upgrade?entitlement=${encodeURIComponent(String(entitlement))}`;
  }

  try {
    const checkout = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: "usd",
            unit_amount: offer.amountCents,
            product_data: {
              name: `Short Stack PLO — ${offer.name}`,
              description: offer.description,
            },
          },
        },
      ],
      // Stripe collects the address when we do not already have one; either way
      // the webhook reads the address off the completed session.
      customer_email: parsedEmail ?? undefined,
      success_url: `${siteUrl}/thank-you?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: cancelUrl,
      metadata: buildCheckoutMetadata(
        offerId,
        parsedSessionId,
        parsedAttribution,
        upgradeOf,
      ),
      // Mirrored onto the PaymentIntent so a Stripe-dashboard refund still shows
      // which content produced the sale.
      payment_intent_data: {
        metadata: buildCheckoutMetadata(
          offerId,
          parsedSessionId,
          parsedAttribution,
          upgradeOf,
        ),
      },
    });

    if (!checkout.url) {
      return NextResponse.json(
        { error: "Checkout is unavailable right now." },
        { status: 502 },
      );
    }

    await recordEvent({
      name: "checkout_started",
      sessionId: parsedSessionId,
      attribution: parsedAttribution,
      props: {
        offer: offerId,
        price_cents: offer.amountCents,
        stripe_checkout_session_id: checkout.id,
        source: "server",
      },
    });

    return NextResponse.json({ url: checkout.url });
  } catch (error) {
    console.error("[checkout] failed to create session", error);
    return NextResponse.json(
      { error: "Checkout is unavailable right now." },
      { status: 502 },
    );
  }
}
