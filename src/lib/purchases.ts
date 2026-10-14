import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Recording a paid Checkout session -- exactly once -- and delivering it.
 *
 * Stripe delivers webhooks at least once and in no guaranteed order: a slow
 * response, a timeout or a manual "Resend" all deliver the same event again,
 * and `charge.refunded` can arrive before `checkout.session.completed`.
 *
 * - The purchase is inserted with ON CONFLICT DO NOTHING on the session id
 *   (unique in the schema). Only the delivery that creates the row records the
 *   conversion, so a replay can never count a sale twice or rewrite a refund.
 * - Whether the payment is already fully refunded is asked of Stripe when the
 *   row is first created, so a refund delivered first is never overwritten.
 * - The delivery email is claimed atomically and marked sent on success. A
 *   failure releases the claim and fails the webhook, so Stripe's retry --
 *   arriving as a redelivery -- sends it. Nothing is sent twice unless a send
 *   succeeds and recording that success then fails.
 */

export type PurchaseRow = Record<string, unknown> & {
  stripe_checkout_session_id: string;
};

/** The slice of the Supabase client this needs, so tests can supply a fake. */
export type PurchaseStore = {
  from(table: "purchases"): {
    upsert(
      row: PurchaseRow,
      options: { onConflict: string; ignoreDuplicates: boolean },
    ): {
      select(columns: string): PromiseLike<{
        data: { id: string }[] | null;
        error: { message: string } | null;
      }>;
    };
  };
};

export type RecordPurchaseResult =
  | { ok: true; created: true; id: string }
  | { ok: true; created: false }
  | { ok: false; message: string };

export async function recordPurchaseOnce(
  db: PurchaseStore,
  row: PurchaseRow,
): Promise<RecordPurchaseResult> {
  const { data, error } = await db
    .from("purchases")
    .upsert(row, { onConflict: "stripe_checkout_session_id", ignoreDuplicates: true })
    .select("id");

  if (error) return { ok: false, message: error.message };

  // With ignoreDuplicates, PostgREST returns only the rows it inserted.
  const inserted = data?.[0];
  return inserted ? { ok: true, created: true, id: inserted.id } : { ok: true, created: false };
}

// ---------------------------------------------------------------------------
// Refunds that arrive before the purchase is recorded
// ---------------------------------------------------------------------------

type ChargeRefundState = {
  refunded?: boolean | null;
  amount?: number | null;
  amount_refunded?: number | null;
};

/** A full refund ends the sale; a partial refund leaves it standing. */
export function isFullyRefunded(charge: ChargeRefundState | null): boolean {
  if (!charge) return false;
  if (charge.refunded === true) return true;
  const amount = charge.amount ?? 0;
  return amount > 0 && (charge.amount_refunded ?? 0) >= amount;
}

/** The slice of the Stripe client this needs, so tests can supply a fake. */
export type PaymentIntentReader = {
  paymentIntents: {
    retrieve(
      id: string,
      params: { expand: string[] },
    ): PromiseLike<{ latest_charge?: string | ChargeRefundState | null }>;
  };
};

/**
 * Whether the payment behind a Checkout session has already been fully
 * refunded. Stripe does not guarantee event order: `charge.refunded` can be
 * delivered before `checkout.session.completed`, when there is no row yet to
 * mark. Asking Stripe at the moment the purchase is first recorded makes the
 * outcome independent of delivery order. Throws if Stripe cannot be reached,
 * so the webhook fails and Stripe retries.
 */
export async function paymentIsFullyRefunded(
  stripe: PaymentIntentReader,
  paymentIntentId: string | null,
): Promise<boolean> {
  if (!paymentIntentId) return false;
  const intent = await stripe.paymentIntents.retrieve(paymentIntentId, {
    expand: ["latest_charge"],
  });
  const charge = typeof intent.latest_charge === "object" ? intent.latest_charge : null;
  return isFullyRefunded(charge);
}

// ---------------------------------------------------------------------------
// Download access
// ---------------------------------------------------------------------------

export type PurchaseAccess = "active" | "refunded" | "missing" | "unavailable";

/**
 * Downloads close after a confirmed full refund. A partial refund leaves the
 * row `paid`, so access continues.
 */
export function accessFor(row: { status: string } | null): Exclude<PurchaseAccess, "unavailable"> {
  if (!row) return "missing";
  return row.status === "refunded" ? "refunded" : "active";
}

export async function purchaseAccess(
  db: SupabaseClient | null,
  purchaseId: string,
): Promise<PurchaseAccess> {
  if (!db) return "unavailable";
  const { data, error } = await db
    .from("purchases")
    .select("status")
    .eq("id", purchaseId)
    .maybeSingle();
  if (error) return "unavailable";
  return accessFor(data as { status: string } | null);
}

// ---------------------------------------------------------------------------
// Purchase email: sent once, recoverable if it fails
// ---------------------------------------------------------------------------

/** How long a claimed-but-unconfirmed send blocks another attempt. */
export const DELIVERY_CLAIM_TTL_MS = 10 * 60 * 1000;

/**
 * Atomically claim the right to send a purchase's delivery email. Exactly one
 * webhook delivery wins: the row must be `paid`, not yet emailed, and not
 * claimed by a send still in flight (claims older than DELIVERY_CLAIM_TTL_MS
 * are treated as abandoned). Returns null if the database cannot be reached.
 */
export async function claimDeliveryEmail(
  db: SupabaseClient,
  purchaseId: string,
  now = new Date(),
): Promise<boolean | null> {
  const stale = new Date(now.getTime() - DELIVERY_CLAIM_TTL_MS).toISOString();
  const { data, error } = await db
    .from("purchases")
    .update({ delivery_email_claimed_at: now.toISOString() })
    .eq("id", purchaseId)
    .eq("status", "paid")
    .is("delivery_emailed_at", null)
    .or(`delivery_email_claimed_at.is.null,delivery_email_claimed_at.lt.${stale}`)
    .select("id");
  if (error) {
    console.error("[purchases] could not claim delivery email", error.message);
    return null;
  }
  return (data?.length ?? 0) > 0;
}

/** Record the outcome: mark it sent, or release the claim so a retry can send. */
export async function finishDeliveryEmail(
  db: SupabaseClient,
  purchaseId: string,
  sent: boolean,
  now = new Date(),
): Promise<void> {
  const { error } = await db
    .from("purchases")
    .update(
      sent
        ? { delivery_emailed_at: now.toISOString() }
        : { delivery_email_claimed_at: null },
    )
    .eq("id", purchaseId);
  if (error) console.error("[purchases] could not record delivery email outcome", error.message);
}

/** The purchase id for a session already recorded (a redelivery). */
export async function findPurchaseIdBySession(
  db: SupabaseClient,
  sessionId: string,
): Promise<string | null> {
  const { data, error } = await db
    .from("purchases")
    .select("id")
    .eq("stripe_checkout_session_id", sessionId)
    .maybeSingle();
  if (error || !data) return null;
  return data.id as string;
}
