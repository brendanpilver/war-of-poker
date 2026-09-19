import type { Metadata } from "next";
import Link from "next/link";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { PurchaseCompleted } from "@/components/analytics/purchase-completed";
import { assetsFor, createDeliveryToken, TOKEN_TTL_LABEL } from "@/lib/delivery";
import { isOfferId, offers } from "@/lib/offers";
import { stripeClient } from "@/lib/stripe";
import { supabaseAdmin } from "@/lib/supabase";
import { legalContactEmail } from "@/lib/legal";

/**
 * The post-purchase page.
 *
 * The session id in the URL is not trusted as proof of payment. It is used to
 * retrieve the session from Stripe, and access is granted only if Stripe itself
 * reports `payment_status: "paid"`. The purchase record is written by the
 * webhook; this page reads it to mint a download token, and tolerates the
 * webhook not having landed yet.
 */

export const metadata: Metadata = {
  title: "Thank you | War of Poker",
  description: "Your Short Stack PLO purchase is confirmed.",
  robots: { index: false, follow: false },
};

type VerifiedPurchase = {
  productName: string;
  assetNames: string[];
  token: string | null;
  email: string | null;
  amountCents: number;
  offerId: string;
};

async function verify(sessionId: string): Promise<VerifiedPurchase | null> {
  const stripe = stripeClient();
  if (!stripe) return null;

  try {
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    if (session.payment_status !== "paid") return null;

    const offerId = session.metadata?.offer_id;
    if (!isOfferId(offerId)) return null;
    const offer = offers[offerId];

    // The webhook owns the purchases row. If it has not arrived yet we still
    // confirm the sale and email the links; the buyer is not made to wait on
    // our internal ordering.
    const db = supabaseAdmin();
    const { data: purchase } = (await db
      ?.from("purchases")
      .select("id")
      .eq("stripe_checkout_session_id", session.id)
      .maybeSingle()) ?? { data: null };

    return {
      productName: offer.name,
      assetNames: assetsFor(offer.product).map((asset) => asset.name),
      token: purchase?.id
        ? createDeliveryToken({ purchaseId: purchase.id, product: offer.product })
        : null,
      email: session.customer_details?.email ?? null,
      amountCents: session.amount_total ?? offer.amountCents,
      offerId,
    };
  } catch {
    return null;
  }
}

export default async function ThankYouPage({
  searchParams,
}: PageProps<"/thank-you">) {
  const params = await searchParams;
  const raw = params.session_id;
  const sessionId = typeof raw === "string" ? raw : null;
  const purchase = sessionId ? await verify(sessionId) : null;

  return (
    <>
      <SiteHeader />
      <main className="flex-1">
        <div className="mx-auto max-w-3xl px-5 pt-16 pb-20 sm:px-8 lg:pt-20 lg:pb-28">
          {purchase ? (
            <>
              <PurchaseCompleted
                offerId={purchase.offerId}
                amountCents={purchase.amountCents}
              />
              <p className="font-mono text-[11px] tracking-[0.18em] text-olive-light uppercase">
                Purchase confirmed
              </p>
              <h1 className="mt-5 text-[2.4rem] leading-[1] font-bold tracking-[-0.02em] text-balance text-bone uppercase sm:text-5xl">
                Short Stack PLO — {purchase.productName}
              </h1>
              <p className="mt-6 text-lg leading-relaxed text-pretty text-bone-muted">
                Thank you. A confirmation with your download links is on its way
                to{" "}
                <span className="text-bone">
                  {purchase.email ?? "the address you used at checkout"}
                </span>
                .
              </p>

              <section aria-labelledby="includes-title" className="mt-12">
                <h2
                  id="includes-title"
                  className="font-mono text-[11px] tracking-[0.18em] text-bone-faint uppercase"
                >
                  What you bought
                </h2>
                <ul className="mt-5 divide-y divide-line border-y border-line">
                  {purchase.assetNames.map((name) => (
                    <li
                      key={name}
                      className="flex gap-4 py-4 leading-snug text-pretty text-bone"
                    >
                      <span aria-hidden className="text-gold">
                        —
                      </span>
                      {name}
                    </li>
                  ))}
                </ul>
              </section>

              {purchase.token ? (
                <Link
                  href={`/downloads?token=${encodeURIComponent(purchase.token)}`}
                  className="mt-10 inline-flex w-full items-center justify-center rounded-[2px] bg-gold px-6 py-3.5 text-center font-semibold text-ink shadow-[inset_0_-2px_0_rgb(0_0_0/0.18)] transition-colors duration-150 hover:bg-gold-light active:translate-y-px sm:w-auto"
                >
                  Open your downloads
                </Link>
              ) : (
                <p className="mt-10 border-l-2 border-gold pl-4 leading-relaxed text-pretty text-bone-muted">
                  Your download links are being prepared and will arrive by
                  email within a few minutes. If they don&apos;t, contact{" "}
                  <a
                    href={`mailto:${legalContactEmail}`}
                    className="text-bone underline decoration-bone/30 underline-offset-4"
                  >
                    {legalContactEmail}
                  </a>
                  .
                </p>
              )}

              <p className="mt-6 text-sm text-bone-faint">
                Download links stay valid for {TOKEN_TTL_LABEL}. Keep yours to
                yourself.
              </p>
            </>
          ) : (
            <>
              <h1 className="text-[2.4rem] leading-[1] font-bold tracking-[-0.02em] text-balance text-bone uppercase sm:text-5xl">
                We couldn&apos;t confirm that purchase
              </h1>
              <p className="mt-6 text-lg leading-relaxed text-pretty text-bone-muted">
                This page needs a valid checkout reference. If you have just
                paid, check your email for the confirmation — it carries your
                download links either way.
              </p>
              <p className="mt-4 leading-relaxed text-pretty text-bone-muted">
                If nothing arrives, contact{" "}
                <a
                  href={`mailto:${legalContactEmail}`}
                  className="text-bone underline decoration-bone/30 underline-offset-4"
                >
                  {legalContactEmail}
                </a>{" "}
                and we&apos;ll sort it out.
              </p>
              <Link
                href="/short-stack-plo"
                className="mt-10 inline-block text-bone underline decoration-bone/30 underline-offset-4 hover:decoration-gold"
              >
                Back to Short Stack PLO
              </Link>
            </>
          )}
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
