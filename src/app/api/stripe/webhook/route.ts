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
import {
  claimDeliveryEmail,
  findPurchaseIdBySession,
  finishDeliveryEmail,
  paymentIsFullyRefunded,
  recordPurchaseOnce,
} from "@/lib/purchases";
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
 * Stripe retries on any non-2xx and does not guarantee event order, so every
 * step is safe to repeat and to receive out of order. See src/lib/purchases.ts.
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

  const paymentIntentId =
    typeof session.payment_intent === "string" ? session.payment_intent : null;

  // A refund can be delivered before this event. Ask Stripe, so a payment that
  // is already fully refunded is recorded as refunded and never delivered.
  let refundedAlready: boolean;
  try {
    refundedAlready = await paymentIsFullyRefunded(stripe, paymentIntentId);
  } catch (error) {
    console.error("[stripe] could not read the payment for", session.id, error);
    return NextResponse.json({ error: "Could not verify payment." }, { status: 500 });
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

  const subscriberId = refundedAlready
    ? null
    : await markCustomer(email, offer.product, {
    src: attributionColumns.content_id ?? undefined,
    utmSource: attributionColumns.utm_source ?? undefined,
    utmMedium: attributionColumns.utm_medium ?? undefined,
    utmCampaign: attributionColumns.utm_campaign ?? undefined,
    platform: attributionColumns.platform ?? undefined,
        landingPage: attributionColumns.landing_page ?? undefined,
      });

  const recorded = await recordPurchaseOnce(db, {
    stripe_checkout_session_id: session.id,
    stripe_payment_intent_id: paymentIntentId,
    email,
    subscriber_id: subscriberId,
    offer_id: offerId,
    product: offer.product,
    // The amount Stripe actually collected, not the catalogue price, so the
    // record stays true if a price changed between checkout and capture.
    amount_cents: session.amount_total ?? offer.amountCents,
    currency: session.currency ?? "usd",
    status: refundedAlready ? "refunded" : "paid",
    ...attributionColumns,
    // Only named for upgrades, so a database without the 0003 column still
    // records every other sale.
    ...(upgradeOf ? { upgrade_of: upgradeOf } : {}),
  });

  if (!recorded.ok) {
    console.error("[stripe] failed to record purchase", recorded.message);
    return NextResponse.json({ error: "Could not record." }, { status: 500 });
  }

  let purchaseId: string;
  if (recorded.created) {
    purchaseId = recorded.id;
    if (refundedAlready) {
      console.error("[stripe] payment was fully refunded before it was recorded", session.id);
      return NextResponse.json({ received: true, refunded: true });
    }
    // Only the delivery that created the row counts the sale.
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
        purchase_id: purchaseId,
      },
    });
  } else {
    // A redelivery: the sale is already counted. It may still owe the email.
    const existing = await findPurchaseIdBySession(db, session.id);
    if (!existing) {
      return NextResponse.json({ error: "Storage unavailable." }, { status: 500 });
    }
    purchaseId = existing;
  }

  if (!deliver) return NextResponse.json({ received: true, held: "upgrade_owner" });

  // Exactly one delivery sends the email: the claim fails for a refunded
  // purchase, one already emailed, or one whose send is still in flight.
  const claimed = await claimDeliveryEmail(db, purchaseId);
  if (claimed === null) {
    return NextResponse.json({ error: "Storage unavailable." }, { status: 500 });
  }
  if (!claimed) {
    return NextResponse.json({ received: true, duplicate: !recorded.created });
  }

  const token = createDeliveryToken({ purchaseId, product: offer.product });
  if (!token) {
    console.error("[stripe] DELIVERY_SECRET unset; no download link sent");
    await finishDeliveryEmail(db, purchaseId, false);
    return NextResponse.json({ error: "Delivery unavailable." }, { status: 500 });
  }

  // A book purchase also carries its permanent upgrade entitlement, as a
  // secondary link beneath the download.
  const entitlement = offer.product === "book" ? createUpgradeEntitlement(purchaseId) : null;
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
  await finishDeliveryEmail(db, purchaseId, sent.ok);

  if (!sent.ok) {
    // The sale is recorded and counted; failing here makes Stripe redeliver,
    // and the redelivery sends the email. /thank-you also shows the link.
    console.error("[stripe] purchase email failed for", session.id, sent.reason);
    return NextResponse.json({ error: "Email not sent; retry." }, { status: 500 });
  }

  return NextResponse.json({ received: true, emailed: true });
}

/**
 * A full refund marks the purchase `refunded`. That closes its downloads
 * (`/api/download`) and revokes a book purchase's upgrade entitlement
 * (`src/lib/book-ownership.ts`). Partial refunds leave the sale standing.
 *
 * If the purchase is not recorded yet -- Stripe delivered the refund first --
 * there is nothing to mark. That is safe to acknowledge: when
 * `checkout.session.completed` arrives it asks Stripe and records the payment
 * as refunded from the start.
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

  const { data, error } = await db
    .from("purchases")
    .update({ status: "refunded" })
    .eq("stripe_payment_intent_id", paymentIntent)
    .select("id");

  if (error) {
    console.error("[stripe] failed to record refund", error.message);
    return NextResponse.json({ error: "Could not record." }, { status: 500 });
  }
  if (!data?.length) {
    console.error("[stripe] refund for a payment not yet recorded", paymentIntent);
    return NextResponse.json({ received: true, pending: "purchase_not_recorded" });
  }
  return NextResponse.json({ received: true });
}
