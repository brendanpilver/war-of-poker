import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { recordPurchaseOnce, type PurchaseRow, type PurchaseStore } from "../src/lib/purchases";

/**
 * Stripe delivers webhooks at least once. These cases pin the rule that only
 * the first delivery of a session creates the purchase, and that a replay can
 * never rewrite it -- the property the webhook relies on to send exactly one
 * purchase email and record exactly one conversion.
 */

/** An in-memory `purchases` table honouring ON CONFLICT DO NOTHING on the
 * session id, the way PostgREST does with `ignoreDuplicates: true`. */
function fakeStore() {
  const rows = new Map<string, PurchaseRow & { id: string }>();
  const calls: { onConflict: string; ignoreDuplicates: boolean }[] = [];
  let nextId = 1;
  let failWith: string | null = null;

  const store: PurchaseStore = {
    from: () => ({
      upsert: (row, options) => ({
        select: async () => {
          calls.push(options);
          if (failWith) return { data: null, error: { message: failWith } };
          const key = row.stripe_checkout_session_id;
          const existing = rows.get(key);
          if (existing) {
            if (options.ignoreDuplicates) return { data: [], error: null };
            const updated = { ...existing, ...row };
            rows.set(key, updated);
            return { data: [{ id: updated.id }], error: null };
          }
          const inserted = { ...row, id: `purchase-${nextId++}` };
          rows.set(key, inserted);
          return { data: [{ id: inserted.id }], error: null };
        },
      }),
    }),
  };

  return {
    store,
    rows,
    calls,
    fail(message: string) {
      failWith = message;
    },
  };
}

const paid: PurchaseRow = {
  stripe_checkout_session_id: "cs_test_replay",
  email: "buyer@example.com",
  offer_id: "system-quiz",
  product: "complete-system",
  amount_cents: 2900,
  status: "paid",
};

describe("recording a purchase exactly once", () => {
  it("creates the purchase on the first delivery", async () => {
    const { store, rows } = fakeStore();
    const result = await recordPurchaseOnce(store, paid);
    assert.deepEqual(result, { ok: true, created: true, id: "purchase-1" });
    assert.equal(rows.size, 1);
  });

  it("reports a redelivery of the same session as not created", async () => {
    const { store, rows } = fakeStore();
    await recordPurchaseOnce(store, paid);
    const replay = await recordPurchaseOnce(store, paid);
    const thirdTime = await recordPurchaseOnce(store, paid);
    assert.deepEqual(replay, { ok: true, created: false });
    assert.deepEqual(thirdTime, { ok: true, created: false });
    assert.equal(rows.size, 1);
  });

  it("never rewrites a recorded purchase, so a replay cannot undo a refund", async () => {
    const { store, rows } = fakeStore();
    await recordPurchaseOnce(store, paid);
    const recorded = rows.get("cs_test_replay");
    assert.ok(recorded);
    recorded.status = "refunded";

    await recordPurchaseOnce(store, paid);
    assert.equal(rows.get("cs_test_replay")?.status, "refunded");
  });

  it("asks the database to ignore duplicates on the session id", async () => {
    const { store, calls } = fakeStore();
    await recordPurchaseOnce(store, paid);
    assert.deepEqual(calls, [{ onConflict: "stripe_checkout_session_id", ignoreDuplicates: true }]);
  });

  it("treats a different session as a separate purchase", async () => {
    const { store, rows } = fakeStore();
    await recordPurchaseOnce(store, paid);
    const second = await recordPurchaseOnce(store, { ...paid, stripe_checkout_session_id: "cs_test_other" });
    assert.deepEqual(second, { ok: true, created: true, id: "purchase-2" });
    assert.equal(rows.size, 2);
  });

  it("surfaces a storage error so Stripe retries", async () => {
    const { store, fail } = fakeStore();
    fail("connection refused");
    assert.deepEqual(await recordPurchaseOnce(store, paid), {
      ok: false,
      message: "connection refused",
    });
  });
});
