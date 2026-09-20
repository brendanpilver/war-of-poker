import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  parseEmail,
  parseEventProps,
  parseText,
} from "../src/lib/validation";

describe("parseEmail", () => {
  it("accepts ordinary addresses", () => {
    assert.equal(parseEmail("river@warofpoker.com"), "river@warofpoker.com");
    assert.equal(parseEmail("a.b+tag@sub.example.co.uk"), "a.b+tag@sub.example.co.uk");
  });

  it("lowercases and trims so one person cannot become two subscribers", () => {
    assert.equal(parseEmail("  River@WarOfPoker.COM "), "river@warofpoker.com");
  });

  it("rejects addresses without a dotted domain", () => {
    assert.equal(parseEmail("river@localhost"), null);
    assert.equal(parseEmail("river@warofpoker"), null);
  });

  it("rejects malformed input", () => {
    for (const bad of ["", "   ", "no-at-sign", "@warofpoker.com", "a@@b.com", "a b@c.com"]) {
      assert.equal(parseEmail(bad), null, `expected ${JSON.stringify(bad)} to be rejected`);
    }
  });

  it("rejects consecutive dots", () => {
    assert.equal(parseEmail("river..potter@warofpoker.com"), null);
  });

  it("rejects non-strings and over-long addresses", () => {
    assert.equal(parseEmail(null), null);
    assert.equal(parseEmail(42), null);
    assert.equal(parseEmail(`${"a".repeat(250)}@warofpoker.com`), null);
  });

  it("strips control characters rather than accepting a header injection", () => {
    const crlf = `${String.fromCharCode(13)}${String.fromCharCode(10)}`;
    assert.equal(
      parseEmail(`river@warofpoker.com${crlf}Bcc: someone@else.com`),
      null,
    );
  });
});

describe("parseText", () => {
  it("trims and bounds the length", () => {
    assert.equal(parseText("  hello  "), "hello");
    assert.equal(parseText("x".repeat(500))?.length, 120);
  });

  it("returns null for empty or non-string input", () => {
    assert.equal(parseText(""), null);
    assert.equal(parseText("   "), null);
    assert.equal(parseText(undefined), null);
  });
});

describe("parseEventProps", () => {
  it("keeps scalar values", () => {
    assert.deepEqual(
      parseEventProps({ offer: "system", price: 3900, promo: true, note: null }),
      { offer: "system", price: 3900, promo: true, note: null },
    );
  });

  it("drops objects, arrays, functions, and non-finite numbers", () => {
    assert.deepEqual(
      parseEventProps({ nested: { a: 1 }, list: [1], bad: Number.NaN, inf: Infinity }),
      {},
    );
  });

  it("caps how many properties one caller can write", () => {
    const many = Object.fromEntries(
      Array.from({ length: 50 }, (_, i) => [`k${i}`, i]),
    );
    assert.equal(Object.keys(parseEventProps(many)).length, 24);
  });

  it("returns an empty object for non-object input", () => {
    assert.deepEqual(parseEventProps(null), {});
    assert.deepEqual(parseEventProps("nope"), {});
  });
});
