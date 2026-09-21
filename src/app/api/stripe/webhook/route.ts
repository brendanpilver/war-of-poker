import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { recordEvent } from "@/lib/analytics/record";
import {
  createUpgradeEntitlement,
  findBookOwner,
  upgradeUrl,
} from "@/lib/book-ownership";
import { createDeliveryToken, TOKEN_TTL_LABEL, assetsFor } from "@/lib/delivery";
import { sendEmail } from "@/lib/email/client";
import { purchaseEmail, renderHtml, renderText } from "@/lib/email/templates";
import { env } from "@/lib/env";
import { isOfferId, offers } from "@/lib/offers";
import { siteUrl } from "@/lib/site";
import { metadataToColumns, stripeClient } from "@/lib/stripe";
import { markCustomer } from "@/lib/subscribers";
import { supabaseAdmin } from "@/lib/supabase";
import { parseEmail } from "@/lib/validation";

/**
 * Stripe webhook: the only place a purchase is recorded.
 *
 * The success redirect is not trusted -- a browser can navigate to
 * /thank-you with any session id. Money is only recognised here, after the
 * signature has been verified against the raw request body.
 *
 * Stripe retries on any non-2xx, so every write is idempotent: the purchases
 * row is keyed on the Checkout session id, and a repeated delivery updates it
 * rather than creating a second sale.
 */

export async function POST(request: Request) {
  const stripe = stripeClient();
  const webhookSecret = env.stripeWebhookSecret;

  if (!stripe || !webhookSecret) {
    return NextResponse.json({ error: "Not configured." }, { status: 503 });
  }

  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "Missing signature." }, { status: 400 });
  }

  // The raw text body is required: any re-serialisation invalidates the
  // signature.
  const payload = await request.text();

  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(
      payload,
      signature,
      webhookSecret,
    );
  } catch (error) {
    console.error("[stripe] signature verification failed", error);
    return NextResponse.json({ error: "Invalid signature." }, { status: 400 });
  }

  if (event.type === "charge.refunded") {
    return recordRefund(event.data.object as Stripe.Charge);
  }

  if (event.type !== "checkout.session.completed") {
    // Acknowledge everything else so Stripe stops retrying it.
    return NextResponse.json({ received: true });
  }

  const session = event.data.object as Stripe.Checkout.Session;

  // `complete` without `paid` means an async method has not cleared yet.
  if (session.payment_status !== "paid") {
    return NextResponse.json({ received: true, ignored: "not_paid" });
  }

  const offerId = session.metadata?.offer_id;
  if (!isOfferId(offerId)) {
    console.error("[stripe] session has no known offer_id", session.id);
    return NextResponse.json({ received: true, ignored: "unknown_offer" });
  }

  let email = parseEmail(
    session.customer_details?.email ?? session.customer_email ?? null,
  );
  if (!email) {
    console.error("[stripe] session has no usable email", session.id);
    return NextResponse.json({ received: true, ignored: "no_email" });
  }

  const offer = offers[offerId];
  const attributionColumns = metadataToColumns(session.metadata);
  const db = supabaseAdmin();

  if (!db) {
    // Returning 500 makes Stripe retry, which is what we want: the sale is
    // real and must not be lost because the database was briefly unreachable.
    console.error("[stripe] no database configured; cannot record", session.id);
    return NextResponse.json({ error: "Storage unavailable." }, { status: 500 });
  }

  // A book-owner upgrade belongs to the book's buyer. It is recorded against,
  // and delivered to, the address on the original book purchase -- never to an
  // address typed at checkout -- so paying for someone else's upgrade link only
  // ever delivers the Field Kit to its rightful owner.
  let upgradeOf: string | null = null;
  let deliver = true;
  if (offer.bookOwnerOnly) {
    upgradeOf = session.metadata?.upgrade_of || null;
    const owner = upgradeOf ? await findBookOwner(upgradeOf) : null;
    if (owner === undefined) {
      console.error("[stripe] cannot reach the book purchase for", session.id);
      return NextResponse.json({ error: "Storage unavailable." }, { status: 500 });
    }
    if (owner) {
      email = owner.email;
    } else {
      // Checkout verified ownership, so this means the book was refunded in
      // between. The money is real and is recorded; delivery waits for a human.
      console.error("[stripe] upgrade without a qualifying book purchase", session.id);
      deliver = false;
    }
  }

  const subscriberId = await markCustomer(email, offer.product, {
    src: attributionColumns.content_id ?? undefined,
    utmSource: attributionColumns.utm_source ?? undefined,
    utmMedium: attributionColumns.utm_medium ?? undefined,
    utmCampaign: attributionColumns.utm_campaign ?? undefined,
    platform: attributionColumns.platform ?? undefined,
    landingPage: attributionColumns.landing_page ?? undefined,
  });

  const { data: purchase, error } = await db
    .from("purchases")
    .upsert(
      {
        stripe_checkout_session_id: session.id,
        stripe_payment_intent_id:
          typeof session.payment_intent === "string" ? session.payment_intent : null,
        email,
        subscriber_id: subscriberId,
        offer_id: offerId,
        product: offer.product,
        // The amount Stripe actually collected, not the catalogue price, so the
        // record stays true if a price changed between checkout and capture.
        amount_cents: session.amount_total ?? offer.amountCents,
        currency: session.currency ?? "usd",
        status: "paid",
        ...attributionColumns,
        // Only named for upgrades, so a database without the 0003 column still
        // records every other sale.
        ...(upgradeOf ? { upgrade_of: upgradeOf } : {}),
      },
      { onConflict: "stripe_checkout_session_id" },
    )
    .select("id")
    .single();

  if (error || !purchase) {
    console.error("[stripe] failed to record purchase", error?.message);
    return NextResponse.json({ error: "Could not record." }, { status: 500 });
  }

  await recordEvent({
    name: "purchase_completed",
    sessionId: attributionColumns.session_id,
    subscriberId,
    attribution: {
      src: attributionColumns.content_id ?? undefined,
      utmSource: attributionColumns.utm_source ?? undefined,
      utmMedium: attributionColumns.utm_medium ?? undefined,
      utmCampaign: attributionColumns.utm_campaign ?? undefined,
      platform: attributionColumns.platform ?? undefined,
      landingPage: attributionColumns.landing_page ?? undefined,
    },
    props: {
      offer: offerId,
      product: offer.product,
      amount_cents: session.amount_total ?? offer.amountCents,
      promotional: offer.quizCompleterOnly,
      purchase_id: purchase.id,
    },
  });

  if (!deliver) return NextResponse.json({ received: true, held: "upgrade_owner" });

  // Delivery. A failed email must not fail the webhook: the purchase is already
  // recorded, and /thank-you can mint the same link from the verified session.
  const token = createDeliveryToken({ purchaseId: purchase.id, product: offer.product });
  if (token) {
    // A book purchase also carries its permanent upgrade entitlement, as a
    // secondary link beneath the download.
    const entitlement =
      offer.product === "book" ? createUpgradeEntitlement(purchase.id) : null;
    const content = purchaseEmail({
      productName: offer.name,
      includes: assetsFor(offer.product).map((asset) => asset.name),
      downloadUrl: `${siteUrl}/downloads?token=${encodeURIComponent(token)}`,
      expiresLabel: TOKEN_TTL_LABEL,
      upgradeUrl: entitlement ? upgradeUrl(entitlement) : undefined,
    });

    const sent = await sendEmail({
      to: email,
      subject: content.subject,
      html: renderHtml(content),
      text: renderText(content),
    });

    if (!sent.ok) {
      console.error("[stripe] purchase email failed for", session.id, sent.reason);
    }
  } else {
    console.error("[stripe] DELIVERY_SECRET unset; no download link sent");
  }

  return NextResponse.json({ received: true });
}

/**
 * A full refund marks the purchase `refunded`. That is what revokes a book
 * purchase's upgrade entitlement (`src/lib/book-ownership.ts`). Partial refunds
 * leave the sale standing. Download links already issued are not revoked here;
 * they expire on their own schedule.
 */
async function recordRefund(charge: Stripe.Charge) {
  const paymentIntent =
    typeof charge.payment_intent === "string"
      ? charge.payment_intent
      : (charge.payment_intent?.id ?? null);

  if (!charge.refunded || !paymentIntent) {
    return NextResponse.json({ received: true, ignored: "partial_refund" });
  }

  const db = supabaseAdmin();
  if (!db) {
    return NextResponse.json({ error: "Storage unavailable." }, { status: 500 });
  }

  const { error } = await db
    .from("purchases")
    .update({ status: "refunded" })
    .eq("stripe_payment_intent_id", paymentIntent);

  if (error) {
    console.error("[stripe] failed to record refund", error.message);
    return NextResponse.json({ error: "Could not record." }, { status: 500 });
  }
  return NextResponse.json({ received: true });
}
