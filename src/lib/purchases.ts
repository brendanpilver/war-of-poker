/**
 * Recording a paid Checkout session -- exactly once.
 *
 * Stripe delivers webhooks at least once: a slow response, a timeout or a
 * manual "Resend" all deliver the same `checkout.session.completed` again. The
 * insert therefore uses ON CONFLICT DO NOTHING on the session id (unique in
 * the schema), and the caller learns whether this delivery created the row.
 * Only the delivery that created it records the conversion and sends the
 * purchase email. A replay changes nothing -- in particular it cannot flip a
 * refunded purchase back to `paid`.
 *
 * The trade-off is deliberate: if the first delivery recorded the row and then
 * failed before emailing, a retry will not email either. The buyer still has
 * the /thank-you page, which mints the same download link from the verified
 * session, and support can resend.
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
