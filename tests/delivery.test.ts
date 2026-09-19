import assert from "node:assert/strict";
import { before, describe, it } from "node:test";

// The delivery module reads DELIVERY_SECRET at call time via src/lib/env, which
// snapshots process.env on import. Set it before importing either module.
process.env.DELIVERY_SECRET = "test-delivery-secret-value";

let delivery: typeof import("../src/lib/delivery");

before(async () => {
  delivery = await import("../src/lib/delivery");
});

describe("delivery tokens", () => {
  it("round-trips a valid token", () => {
    const token = delivery.createDeliveryToken({
      purchaseId: "p-123",
      product: "complete-system",
    });
    assert.ok(token);

    const payload = delivery.verifyDeliveryToken(token);
    assert.ok(payload);
    assert.equal(payload.purchaseId, "p-123");
    assert.equal(payload.product, "complete-system");
  });

  it("rejects a token whose payload was edited", () => {
    const token = delivery.createDeliveryToken({
      purchaseId: "p-123",
      product: "book",
    });
    assert.ok(token);

    const [, signature] = token.split(".");
    const forgedBody = Buffer.from(
      JSON.stringify({
        purchaseId: "p-123",
        product: "complete-system",
        exp: Date.now() + 100000,
      }),
    )
      .toString("base64")
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");

    assert.equal(delivery.verifyDeliveryToken(`${forgedBody}.${signature}`), null);
  });

  it("rejects an expired token", () => {
    const longAgo = Date.now() - 1000 * 60 * 60 * 24 * 365;
    const token = delivery.createDeliveryToken({ purchaseId: "p-1", product: "book" }, longAgo);
    assert.ok(token);
    assert.equal(delivery.verifyDeliveryToken(token), null);
  });

  it("accepts a token that has not yet expired", () => {
    const token = delivery.createDeliveryToken({ purchaseId: "p-1", product: "book" });
    assert.ok(token);
    // One day from now is still inside the 30-day window.
    assert.ok(delivery.verifyDeliveryToken(token, Date.now() + 1000 * 60 * 60 * 24));
  });

  it("rejects malformed and missing tokens", () => {
    for (const bad of [null, undefined, "", "no-dot", "a.b.c", "!!!.???"]) {
      assert.equal(delivery.verifyDeliveryToken(bad), null, `expected ${bad} rejected`);
    }
  });

  it("rejects a signature of the wrong length without throwing", () => {
    const token = delivery.createDeliveryToken({ purchaseId: "p-1", product: "book" });
    assert.ok(token);
    const [body] = token.split(".");
    assert.equal(delivery.verifyDeliveryToken(`${body}.short`), null);
  });
});

describe("product assets", () => {
  it("gives the book buyer only the book", () => {
    const assets = delivery.assetsFor("book");
    assert.equal(assets.length, 1);
    assert.equal(assets[0].id, "book");
  });

  it("gives the Complete System the book plus all seven Field Kit pieces", () => {
    assert.equal(delivery.assetsFor("complete-system").length, 8);
  });

  it("does not resolve a Field Kit asset for a book-only purchase", () => {
    assert.equal(delivery.findAsset("book", "field-kit-07"), null);
    assert.ok(delivery.findAsset("complete-system", "field-kit-07"));
  });

  it("uses a distinct object path for every asset", () => {
    const paths = delivery.assetsFor("complete-system").map((a) => a.objectPath);
    assert.equal(new Set(paths).size, paths.length);
  });
});
