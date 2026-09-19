import { NextResponse } from "next/server";
import { recordEvent } from "@/lib/analytics/record";
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

  const { offerId, email, sessionId, attribution } = (body ?? {}) as Record<
    string,
    unknown
  >;

  if (!isOfferId(offerId)) {
    return NextResponse.json({ error: "Unknown offer." }, { status: 400 });
  }

  const offer = offers[offerId];
  const parsedAttribution = parseAttributionInput(attribution);
  const parsedSessionId = parseText(sessionId, 64);
  const parsedEmail = parseEmail(email);

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
      cancel_url: `${siteUrl}/short-stack-plo?checkout=cancelled`,
      metadata: buildCheckoutMetadata(offerId, parsedSessionId, parsedAttribution),
      // Mirrored onto the PaymentIntent so a Stripe-dashboard refund still shows
      // which content produced the sale.
      payment_intent_data: {
        metadata: buildCheckoutMetadata(offerId, parsedSessionId, parsedAttribution),
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
