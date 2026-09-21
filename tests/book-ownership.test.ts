import assert from "node:assert/strict";
import { before, describe, it } from "node:test";

/**
 * The $15 upgrade is sold only to someone who owns the book. The proof is the
 * book purchase's upgrade entitlement: signed, non-expiring, and always checked
 * against the purchase record it names. Storage is an injected lookup here.
 */

process.env.DELIVERY_SECRET = "test-delivery-secret-value";

let ownership: typeof import("../src/lib/book-ownership");
let delivery: typeof import("../src/lib/delivery");

before(async () => {
  ownership = await import("../src/lib/book-ownership");
  delivery = await import("../src/lib/delivery");
});

const paidBookRow = {
  email: "reader@example.com",
  offerId: "book",
  product: "book",
  status: "paid",
  upgraded: false,
};
const paidBook = async () => paidBookRow;

function entitlement(purchaseId = "p-book") {
  const token = ownership.createUpgradeEntitlement(purchaseId);
  assert.ok(token);
  return token;
}

describe("upgrade entitlements", () => {
  it("accept a paid book purchase and name the address to lock checkout to", async () => {
    const result = await ownership.verifyUpgradeEntitlement(entitlement(), paidBook);
    assert.deepEqual(result, {
      ok: true,
      owner: { purchaseId: "p-book", email: "reader@example.com" },
    });
  });

  it("carry no expiry, so they still work long after the download link lapses", () => {
    const token = entitlement();
    const [body] = token.split(".");
    const payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8"));
    assert.equal("exp" in payload, false);
    assert.deepEqual(payload, {
      kind: "field-kit-upgrade",
      v: 1,
      purchaseId: "p-book",
      offerId: "book",
    });
  });

  it("are deterministic, so one can be re-issued from the purchase record", () => {
    assert.equal(entitlement("p-7"), entitlement("p-7"));
    assert.notEqual(entitlement("p-7"), entitlement("p-8"));
  });

  it("refuse a missing, malformed, or forged token", async () => {
    const [body] = entitlement().split(".");
    for (const token of [undefined, null, "", 42, "a.b", `${body}.forged`]) {
      const result = await ownership.verifyUpgradeEntitlement(token, paidBook);
      assert.deepEqual(result, { ok: false, reason: "invalid" }, String(token));
    }
  });

  it("refuse an entitlement edited to name another purchase", async () => {
    const [, signature] = entitlement("p-book").split(".");
    const forgedBody = Buffer.from(
      JSON.stringify({ kind: "field-kit-upgrade", v: 1, purchaseId: "p-other", offerId: "book" }),
    ).toString("base64url");
    const result = await ownership.verifyUpgradeEntitlement(`${forgedBody}.${signature}`, paidBook);
    assert.equal(result.ok, false);
  });

  it("never accept a download token as an entitlement, even for the book", async () => {
    const download = delivery.createDeliveryToken({ purchaseId: "p-book", product: "book" });
    const result = await ownership.verifyUpgradeEntitlement(download, paidBook);
    assert.deepEqual(result, { ok: false, reason: "invalid" });
  });

  it("never grant downloads: an entitlement is not a valid download token", () => {
    assert.equal(delivery.verifyDeliveryToken(entitlement()), null);
  });

  it("are revoked by a refund, and refuse anything but a paid book sale", async () => {
    const rows = [
      null,
      { ...paidBookRow, status: "refunded" },
      { ...paidBookRow, offerId: "system", product: "complete-system" },
      { ...paidBookRow, offerId: "field-kit", product: "field-kit" },
    ];
    for (const row of rows) {
      const result = await ownership.verifyUpgradeEntitlement(entitlement(), async () => row);
      assert.deepEqual(result, { ok: false, reason: "invalid" }, JSON.stringify(row));
    }
  });

  it("refuse a purchase that has already been upgraded", async () => {
    const result = await ownership.verifyUpgradeEntitlement(entitlement(), async () => ({
      ...paidBookRow,
      upgraded: true,
    }));
    assert.deepEqual(result, { ok: false, reason: "already-upgraded" });
  });

  it("report unavailable, not invalid, when storage cannot be reached", async () => {
    const result = await ownership.verifyUpgradeEntitlement(entitlement(), async () => undefined);
    assert.deepEqual(result, { ok: false, reason: "unavailable" });
  });

  it("link to the upgrade page", () => {
    assert.match(ownership.upgradeUrl("abc.def"), /\/upgrade\?entitlement=abc\.def$/);
  });
});

describe("the webhook's book-owner lookup", () => {
  it("still resolves an already-upgraded purchase, so a paid sale is delivered", async () => {
    const owner = await ownership.findBookOwner("p-book", async () => ({
      ...paidBookRow,
      upgraded: true,
    }));
    assert.deepEqual(owner, { purchaseId: "p-book", email: "reader@example.com" });
  });

  it("returns null for a refunded book and undefined when storage is down", async () => {
    assert.equal(
      await ownership.findBookOwner("p-book", async () => ({ ...paidBookRow, status: "refunded" })),
      null,
    );
    assert.equal(await ownership.findBookOwner("p-book", async () => undefined), undefined);
  });
});
