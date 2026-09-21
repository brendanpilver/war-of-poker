import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  formatContentId,
  isContentId,
  isContentStatus,
  isSeriesCode,
  parseContentId,
  series,
  trackedLink,
} from "../src/lib/content/series";
import {
  formatPrice,
  isOfferId,
  offerIds,
  offers,
  SEPARATE_TOTAL_CENTS,
} from "../src/lib/offers";
import { fieldKit } from "../src/lib/field-kit";

describe("content IDs", () => {
  it("accepts the documented forms", () => {
    for (const id of ["EPM-001", "PRC-012", "HIPR-007", "HSEP-015"]) {
      assert.ok(isContentId(id), `expected ${id} to be valid`);
    }
  });

  it("rejects unknown series and malformed numbers", () => {
    for (const id of ["XXX-001", "EPM-1", "EPM-0001", "epm-001", "EPM001", "", null]) {
      assert.equal(isContentId(id), false, `expected ${id} rejected`);
    }
  });

  it("round-trips through parse and format", () => {
    const parsed = parseContentId("HIPR-007");
    assert.deepEqual(parsed, { series: "HIPR", number: 7 });
    assert.equal(formatContentId("HIPR", 7), "HIPR-007");
  });

  it("zero-pads to three digits", () => {
    assert.equal(formatContentId("EPM", 1), "EPM-001");
    assert.equal(formatContentId("EPM", 123), "EPM-123");
  });
});

describe("tracked links", () => {
  it("carries the content ID into the challenge by default", () => {
    assert.equal(trackedLink("EPM-001"), "/plo-challenge?src=EPM-001");
  });

  it("can point at another path and record a platform", () => {
    assert.equal(
      trackedLink("PRC-003", "/short-stack-plo", "youtube"),
      "/short-stack-plo?src=PRC-003&platform=youtube",
    );
  });
});

describe("series catalogue", () => {
  it("defines the four recurring series", () => {
    assert.deepEqual(Object.keys(series), ["EPM", "PRC", "HIPR", "HSEP"]);
  });

  it("validates series codes and statuses", () => {
    assert.ok(isSeriesCode("EPM"));
    assert.equal(isSeriesCode("NOPE"), false);
    assert.ok(isContentStatus("published"));
    assert.equal(isContentStatus("live"), false);
  });
});

describe("offers", () => {
  it("prices the book at $25", () => {
    assert.equal(offers.book.amountCents, 2500);
    assert.equal(formatPrice(offers.book.amountCents), "$25");
  });

  it("prices the Field Kit on its own at $19", () => {
    assert.equal(offers["field-kit"].amountCents, 1900);
    assert.equal(formatPrice(offers["field-kit"].amountCents), "$19");
  });

  it("prices the Complete System at $39", () => {
    assert.equal(offers.system.amountCents, 3900);
    assert.equal(formatPrice(offers.system.amountCents), "$39");
  });

  it("defaults the challenge Player Price to $29 against the $39 public price", () => {
    assert.equal(offers["system-quiz"].amountCents, 2900);
    assert.equal(formatPrice(offers["system-quiz"].amountCents), "$29");
    assert.equal(offers["system-quiz"].compareAtCents, 3900);
  });

  it("prices the book-owner upgrade at $15", () => {
    assert.equal(offers["field-kit-upgrade"].amountCents, 1500);
    assert.equal(formatPrice(offers["field-kit-upgrade"].amountCents), "$15");
  });

  it("totals $44 bought separately, so the Complete System saves $5", () => {
    assert.equal(SEPARATE_TOTAL_CENTS, 4400);
    assert.equal(SEPARATE_TOTAL_CENTS - offers.system.amountCents, 500);
  });

  it("puts the Player Price only $4 above the book alone", () => {
    assert.equal(offers["system-quiz"].amountCents - offers.book.amountCents, 400);
  });

  it("makes book-then-upgrade $40, one dollar above the Complete System upfront", () => {
    const bookFirst = offers.book.amountCents + offers["field-kit-upgrade"].amountCents;
    assert.equal(bookFirst, 4000);
    assert.ok(offers.system.amountCents < bookFirst);
  });

  it("keeps the Player Price below the public one it is compared against", () => {
    const player = offers["system-quiz"];
    assert.ok(player.compareAtCents !== undefined);
    assert.ok(player.amountCents < player.compareAtCents);
    assert.equal(player.compareAtCents, offers.system.amountCents);
  });

  it("offers exactly the five intended prices, and none of the retired ones", () => {
    assert.deepEqual(
      Object.fromEntries(offerIds.map((id) => [id, offers[id].amountCents])),
      {
        book: 2500,
        "field-kit": 1900,
        system: 3900,
        "system-quiz": 2900,
        "field-kit-upgrade": 1500,
      },
    );
    // $49 was the old Complete System; $19 was the old book.
    assert.ok(offerIds.every((id) => offers[id].amountCents !== 4900));
    assert.notEqual(offers.book.amountCents, 1900);
  });

  it("marks only the Player Price offer as challenge-completer-only", () => {
    for (const id of offerIds) {
      assert.equal(offers[id].quizCompleterOnly, id === "system-quiz", id);
    }
  });

  it("marks only the upgrade as sold to book owners only", () => {
    for (const id of offerIds) {
      assert.equal(offers[id].bookOwnerOnly, id === "field-kit-upgrade", id);
    }
  });

  it("maps every offer onto the product it should deliver", () => {
    assert.equal(offers.book.product, "book");
    assert.equal(offers["field-kit"].product, "field-kit");
    assert.equal(offers.system.product, "complete-system");
    assert.equal(offers["system-quiz"].product, "complete-system");
    // The upgrade delivers the whole system so the new link carries the book
    // the buyer already owns alongside the kit.
    assert.equal(offers["field-kit-upgrade"].product, "complete-system");
  });

  it("describes the book and the system as different products", () => {
    assert.notEqual(offers.book.description, offers.system.description);
    assert.equal(offers.system.description, offers["system-quiz"].description);
  });

  it("validates offer ids", () => {
    for (const id of ["book", "field-kit", "system", "system-quiz", "field-kit-upgrade"]) {
      assert.ok(isOfferId(id), id);
    }
    assert.equal(isOfferId("free"), false);
    assert.equal(isOfferId(null), false);
    // Inherited object keys are not offers.
    assert.equal(isOfferId("toString"), false);
    assert.equal(isOfferId("__proto__"), false);
  });

  it("formats whole dollars without cents", () => {
    assert.equal(formatPrice(3900), "$39");
    assert.equal(formatPrice(1500), "$15");
    assert.equal(formatPrice(3950), "$39.50");
  });
});

describe("field kit", () => {
  it("has seven pieces, numbered one to seven", () => {
    assert.equal(fieldKit.length, 7);
    assert.deepEqual(
      fieldKit.map((piece) => piece.index),
      [1, 2, 3, 4, 5, 6, 7],
    );
  });

  it("gives every piece a distinct id and object path", () => {
    assert.equal(new Set(fieldKit.map((p) => p.id)).size, 7);
    assert.equal(new Set(fieldKit.map((p) => p.objectPath)).size, 7);
  });
});
