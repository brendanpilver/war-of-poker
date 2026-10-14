import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  accessFor,
  isFullyRefunded,
  paymentIsFullyRefunded,
  recordPurchaseOnce,
  type PaymentIntentReader,
  type PurchaseRow,
  type PurchaseStore,
} from "../src/lib/purchases";

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

/** A Stripe client whose one payment intent has the given latest charge. */
function fakeStripe(latestCharge: unknown) {
  const calls: { id: string; expand: string[] }[] = [];
  const stripe: PaymentIntentReader = {
    paymentIntents: {
      retrieve: async (id, params) => {
        calls.push({ id, expand: params.expand });
        if (latestCharge instanceof Error) throw latestCharge;
        return { latest_charge: latestCharge as never };
      },
    },
  };
  return { stripe, calls };
}

describe("full versus partial refunds", () => {
  it("treats a charge Stripe marks refunded as fully refunded", () => {
    assert.equal(isFullyRefunded({ refunded: true, amount: 2900, amount_refunded: 2900 }), true);
  });

  it("treats a refunded amount equal to the charge as fully refunded", () => {
    assert.equal(isFullyRefunded({ refunded: false, amount: 2900, amount_refunded: 2900 }), true);
  });

  it("leaves a partially refunded sale standing", () => {
    assert.equal(isFullyRefunded({ refunded: false, amount: 3900, amount_refunded: 1000 }), false);
  });

  it("treats an unrefunded or missing charge as not refunded", () => {
    assert.equal(isFullyRefunded({ refunded: false, amount: 2900, amount_refunded: 0 }), false);
    assert.equal(isFullyRefunded(null), false);
  });
});

describe("a refund delivered before the purchase is recorded", () => {
  it("asks Stripe for the payment's latest charge", async () => {
    const { stripe, calls } = fakeStripe({ refunded: true, amount: 2900, amount_refunded: 2900 });
    assert.equal(await paymentIsFullyRefunded(stripe, "pi_test_1"), true);
    assert.deepEqual(calls, [{ id: "pi_test_1", expand: ["latest_charge"] }]);
  });

  it("reports a paid, unrefunded payment as not refunded", async () => {
    const { stripe } = fakeStripe({ refunded: false, amount: 2900, amount_refunded: 0 });
    assert.equal(await paymentIsFullyRefunded(stripe, "pi_test_1"), false);
  });

  it("does not call Stripe without a payment intent", async () => {
    const { stripe, calls } = fakeStripe(null);
    assert.equal(await paymentIsFullyRefunded(stripe, null), false);
    assert.equal(calls.length, 0);
  });

  it("lets a Stripe outage fail the webhook so Stripe retries", async () => {
    const { stripe } = fakeStripe(new Error("stripe unreachable"));
    await assert.rejects(paymentIsFullyRefunded(stripe, "pi_test_1"), /stripe unreachable/);
  });

  it("records the purchase as refunded, and a later replay cannot make it paid", async () => {
    // Order of delivery: charge.refunded (no row yet, acknowledged), then
    // checkout.session.completed, then a redelivery of it.
    const { stripe } = fakeStripe({ refunded: true, amount: 2900, amount_refunded: 2900 });
    const { store, rows } = fakeStore();

    const refundedAlready = await paymentIsFullyRefunded(stripe, "pi_test_1");
    const first = await recordPurchaseOnce(store, {
      ...paid,
      status: refundedAlready ? "refunded" : "paid",
    });
    assert.deepEqual(first, { ok: true, created: true, id: "purchase-1" });
    assert.equal(rows.get("cs_test_replay")?.status, "refunded");

    const replay = await recordPurchaseOnce(store, { ...paid, status: "paid" });
    assert.deepEqual(replay, { ok: true, created: false });
    assert.equal(rows.get("cs_test_replay")?.status, "refunded");
  });
});

describe("download access after refunds", () => {
  it("keeps downloads open for a paid purchase, including after a partial refund", () => {
    assert.equal(accessFor({ status: "paid" }), "active");
  });

  it("closes downloads after a confirmed full refund", () => {
    assert.equal(accessFor({ status: "refunded" }), "refunded");
  });

  it("refuses a token whose purchase does not exist", () => {
    assert.equal(accessFor(null), "missing");
  });
});
