import assert from "node:assert/strict";
import { before, describe, it } from "node:test";

/**
 * `/api/checkout` is where a browser asks to be charged, so the thing worth
 * testing is what it refuses to take from the browser: a price.
 *
 * Stripe is configured with a placeholder key so the route gets past its
 * "not configured" guard and into validation. Every case below is rejected
 * before any network call would be made, which is why no Stripe traffic
 * happens here.
 */

process.env.STRIPE_SECRET_KEY = "sk_test_placeholder_key_not_used_for_network";
process.env.DELIVERY_SECRET = "test-delivery-secret-value";
// No Supabase: the ownership check can verify a token but not the purchase row.
delete process.env.SUPABASE_URL;
delete process.env.SUPABASE_SERVICE_ROLE_KEY;

let POST: (request: Request) => Promise<Response>;
let createDeliveryToken: typeof import("../src/lib/delivery").createDeliveryToken;
let createUpgradeEntitlement: typeof import("../src/lib/book-ownership").createUpgradeEntitlement;

before(async () => {
  ({ POST } = await import("../src/app/api/checkout/route"));
  ({ createDeliveryToken } = await import("../src/lib/delivery"));
  ({ createUpgradeEntitlement } = await import("../src/lib/book-ownership"));
});

function post(body: unknown): Request {
  return new Request("http://localhost/api/checkout", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

describe("checkout offer resolution", () => {
  it("refuses an offer id that is not in the catalogue", async () => {
    const response = await POST(post({ offerId: "system-free" }));
    assert.equal(response.status, 400);
    assert.equal((await response.json()).error, "Unknown offer.");
  });

  it("will not let a supplied price conjure an offer", async () => {
    // Everything a tampered client might try to dictate, with no real offer id.
    const response = await POST(
      post({
        offerId: "custom",
        amountCents: 1,
        price_cents: 1,
        unit_amount: 1,
        currency: "usd",
      }),
    );
    assert.equal(response.status, 400);
  });

  it("refuses a missing or non-string offer id", async () => {
    for (const offerId of [undefined, null, 1900, { id: "system" }, ["book"]]) {
      const response = await POST(post({ offerId }));
      assert.equal(response.status, 400, String(offerId));
    }
  });

  it("refuses a body that is not JSON", async () => {
    const response = await POST(post("not json"));
    assert.equal(response.status, 400);
  });
});

describe("checkout catalogue", () => {
  it("accepts exactly the five intended offer ids at the intended prices", async () => {
    const { offers, offerIds } = await import("../src/lib/offers");
    assert.deepEqual(
      offerIds.map((id) => [id, offers[id].amountCents]),
      [
        ["book", 2500],
        ["field-kit", 1900],
        ["system", 3900],
        ["system-quiz", 2900],
        ["field-kit-upgrade", 1500],
      ],
    );
  });
});

describe("the $15 book-owner upgrade", () => {
  it("is refused without proof of owning the book", async () => {
    const response = await POST(post({ offerId: "field-kit-upgrade" }));
    assert.equal(response.status, 403);
  });

  it("is refused for an email address alone", async () => {
    const response = await POST(
      post({ offerId: "field-kit-upgrade", email: "someone@example.com" }),
    );
    assert.equal(response.status, 403);
  });

  it("is refused for a forged entitlement or any download token", async () => {
    const bookDownload = createDeliveryToken({ purchaseId: "p-1", product: "book" });
    const systemDownload = createDeliveryToken({ purchaseId: "p-1", product: "complete-system" });
    for (const entitlement of ["forged.token", bookDownload, systemDownload]) {
      const response = await POST(post({ offerId: "field-kit-upgrade", entitlement }));
      assert.equal(response.status, 403, String(entitlement));
    }
  });

  it("cannot confirm a real entitlement without the purchase record", async () => {
    // A valid signature is not enough: the purchase must still be a paid,
    // unrefunded book sale, and with no database that cannot be checked, so
    // nothing is sold.
    const entitlement = createUpgradeEntitlement("p-1");
    const response = await POST(post({ offerId: "field-kit-upgrade", entitlement }));
    assert.equal(response.status, 503);
  });
});

describe("checkout metadata", () => {
  it("records which book purchase an upgrade extends, and nothing for other offers", async () => {
    const { buildCheckoutMetadata } = await import("../src/lib/stripe");
    assert.equal(buildCheckoutMetadata("field-kit-upgrade", null, {}, "p-book").upgrade_of, "p-book");
    assert.equal(buildCheckoutMetadata("system", null, {}).upgrade_of, "");
  });
});
