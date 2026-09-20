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

let POST: (request: Request) => Promise<Response>;

before(async () => {
  ({ POST } = await import("../src/app/api/checkout/route"));
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
