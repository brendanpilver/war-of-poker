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
import { offers, formatPrice, isOfferId } from "../src/lib/offers";
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
  it("prices the book at $19 and the Complete System at $39", () => {
    assert.equal(offers.book.amountCents, 1900);
    assert.equal(offers.system.amountCents, 3900);
  });

  it("defaults the challenge player price to $29 against the $39 public price", () => {
    assert.equal(offers["system-quiz"].amountCents, 2900);
    assert.equal(offers["system-quiz"].compareAtCents, 3900);
  });

  it("keeps the player price below the public one it is compared against", () => {
    const player = offers["system-quiz"];
    assert.ok(player.compareAtCents !== undefined);
    assert.ok(player.amountCents < player.compareAtCents);
    assert.equal(player.compareAtCents, offers.system.amountCents);
  });

  it("leaves the book cheaper than every route to the Complete System", () => {
    assert.ok(offers.book.amountCents < offers["system-quiz"].amountCents);
    assert.ok(offers["system-quiz"].amountCents < offers.system.amountCents);
  });

  it("marks only the player-price offer as challenge-completer-only", () => {
    assert.equal(offers["system-quiz"].quizCompleterOnly, true);
    assert.equal(offers.system.quizCompleterOnly, false);
    assert.equal(offers.book.quizCompleterOnly, false);
  });

  it("gives both system offers the same product entitlement", () => {
    assert.equal(offers.system.product, offers["system-quiz"].product);
    assert.equal(offers.book.product, "book");
  });

  it("describes the book and the system as different products", () => {
    assert.notEqual(offers.book.description, offers.system.description);
    assert.equal(offers.system.description, offers["system-quiz"].description);
  });

  it("validates offer ids", () => {
    assert.ok(isOfferId("system-quiz"));
    assert.equal(isOfferId("free"), false);
    assert.equal(isOfferId(null), false);
  });

  it("formats whole dollars without cents", () => {
    assert.equal(formatPrice(3900), "$39");
    assert.equal(formatPrice(1900), "$19");
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
