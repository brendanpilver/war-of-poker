import assert from "node:assert/strict";
import { before, describe, it } from "node:test";
import Stripe from "stripe";

/**
 * The webhook is the only place money is recognised, so its signature check is
 * exercised against the real Stripe library rather than a stub.
 *
 * Supabase is deliberately left unconfigured: these cases all assert the route
 * rejects before it would ever reach storage.
 */

const WEBHOOK_SECRET = "whsec_test_secret_for_signature_verification";
process.env.STRIPE_SECRET_KEY = "sk_test_placeholder_key_not_used_for_network";
process.env.STRIPE_WEBHOOK_SECRET = WEBHOOK_SECRET;

let POST: (request: Request) => Promise<Response>;
let stripe: Stripe;

before(async () => {
  ({ POST } = await import("../src/app/api/stripe/webhook/route"));
  stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string);
});

function post(body: string, signature?: string): Request {
  return new Request("http://localhost/api/stripe/webhook", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...(signature ? { "stripe-signature": signature } : {}),
    },
    body,
  });
}

function signedEvent(event: unknown) {
  const payload = JSON.stringify(event);
  const signature = stripe.webhooks.generateTestHeaderString({
    payload,
    secret: WEBHOOK_SECRET,
  });
  return { payload, signature };
}

function checkoutEvent(overrides: Record<string, unknown> = {}) {
  return {
    id: "evt_test_1",
    type: "checkout.session.completed",
    data: {
      object: {
        id: "cs_test_1",
        payment_status: "paid",
        amount_total: 3900,
        currency: "usd",
        payment_intent: "pi_test_1",
        customer_details: { email: "buyer@example.com" },
        metadata: { offer_id: "system", content_id: "EPM-001" },
        ...overrides,
      },
    },
  };
}

describe("Stripe webhook signature verification", () => {
  it("rejects a request with no signature header", async () => {
    const response = await POST(post(JSON.stringify(checkoutEvent())));
    assert.equal(response.status, 400);
  });

  it("rejects a forged signature", async () => {
    const response = await POST(
      post(JSON.stringify(checkoutEvent()), "t=1,v1=deadbeef"),
    );
    assert.equal(response.status, 400);
  });

  it("rejects a valid signature over a different body", async () => {
    const { signature } = signedEvent(checkoutEvent());
    // Same signature, tampered payload: the amount has been doubled.
    const tampered = JSON.stringify(checkoutEvent({ amount_total: 7800 }));
    const response = await POST(post(tampered, signature));
    assert.equal(response.status, 400);
  });

  it("accepts a correctly signed event", async () => {
    const { payload, signature } = signedEvent(checkoutEvent());
    const response = await POST(post(payload, signature));
    // Supabase is unconfigured here, so a genuine event reaches storage and
    // returns 500 so Stripe retries. What matters is that it passed the
    // signature gate rather than being rejected at 400.
    assert.notEqual(response.status, 400);
    assert.equal(response.status, 500);
  });
});

describe("Stripe webhook event handling", () => {
  it("ignores an unpaid session without recording anything", async () => {
    const { payload, signature } = signedEvent(
      checkoutEvent({ payment_status: "unpaid" }),
    );
    const response = await POST(post(payload, signature));
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), {
      received: true,
      ignored: "not_paid",
    });
  });

  it("ignores an event type it does not handle", async () => {
    const { payload, signature } = signedEvent({
      id: "evt_test_2",
      type: "payment_intent.created",
      data: { object: { id: "pi_test_2" } },
    });
    const response = await POST(post(payload, signature));
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { received: true });
  });

  it("leaves a partially refunded sale standing", async () => {
    const { payload, signature } = signedEvent({
      id: "evt_test_refund",
      type: "charge.refunded",
      data: { object: { id: "ch_test", refunded: false, payment_intent: "pi_test" } },
    });
    const response = await POST(post(payload, signature));
    assert.deepEqual(await response.json(), { received: true, ignored: "partial_refund" });
  });

  it("asks Stripe to retry a full refund it cannot store yet", async () => {
    // No database in tests: the refund must not be acknowledged and lost,
    // because the refunded status is what revokes an upgrade entitlement.
    const { payload, signature } = signedEvent({
      id: "evt_test_refund_2",
      type: "charge.refunded",
      data: { object: { id: "ch_test", refunded: true, payment_intent: "pi_test" } },
    });
    const response = await POST(post(payload, signature));
    assert.equal(response.status, 500);
  });

  it("ignores a session whose offer_id is not in the catalogue", async () => {
    const { payload, signature } = signedEvent(
      checkoutEvent({ metadata: { offer_id: "free-lunch" } }),
    );
    const response = await POST(post(payload, signature));
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), {
      received: true,
      ignored: "unknown_offer",
    });
  });

  it("ignores a session with no usable email", async () => {
    const { payload, signature } = signedEvent(
      checkoutEvent({ customer_details: { email: null }, customer_email: null }),
    );
    const response = await POST(post(payload, signature));
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { received: true, ignored: "no_email" });
  });
});
