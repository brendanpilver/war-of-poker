import assert from "node:assert/strict";
import { statSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";
import { bookPreviews, homepageBookPreviews } from "@/lib/book-previews";
import { fieldKit, fieldKitThumbnails } from "@/lib/field-kit";

/**
 * These previews are the section's only claim to being real. A broken path
 * would render as a missing image where the proof is supposed to be, and a
 * declared size that does not match the file would make Next reserve the wrong
 * space, so both are checked against the committed PNGs.
 */

const publicDir = fileURLToPath(new URL("../public/", import.meta.url));

describe("book previews", () => {
  it("has previews with unique ids", () => {
    assert.ok(bookPreviews.length > 0);
    const ids = new Set(bookPreviews.map((preview) => preview.id));
    assert.equal(ids.size, bookPreviews.length);
  });

  it("points every preview at a committed file", () => {
    for (const { id, image } of bookPreviews) {
      assert.ok(image.src.startsWith("/books/"), `${id}: unexpected location`);
      const file = statSync(publicDir + image.src.slice(1), {
        throwIfNoEntry: false,
      });
      assert.ok(file?.isFile(), `${id}: ${image.src} is not committed`);
    }
  });

  it("declares one shared aspect ratio, so the grid does not jump", () => {
    const [first] = bookPreviews;
    for (const { id, image } of bookPreviews) {
      assert.equal(image.width, first.image.width, `${id}: width`);
      assert.equal(image.height, first.image.height, `${id}: height`);
    }
  });

  it("describes every preview for a screen reader", () => {
    for (const { id, headline, stat, learn, image } of bookPreviews) {
      assert.ok(headline.length > 0, `${id}: headline`);
      assert.ok(stat.length > 0, `${id}: stat`);
      assert.ok(learn.length > 0, `${id}: learn`);
      assert.ok(image.alt.length > 20, `${id}: alt text is too thin`);
    }
  });

  it("states a hand, a board, and a decision in every stat line", () => {
    // The stat line is transcribed from the page above it. If it stops naming
    // cards it has stopped being evidence and become a caption.
    for (const { id, stat } of bookPreviews) {
      assert.match(stat, /[♠♥♦♣]/u, `${id}: no cards in the stat line`);
      assert.equal(stat.split(" · ").length, 3, `${id}: expected three parts`);
    }
  });

  it("gives the compact homepage version three previews", () => {
    assert.equal(homepageBookPreviews.length, 3);
  });

  it("keeps the sales page to four, two clean rows of two", () => {
    assert.equal(bookPreviews.length, 4);
  });
});

describe("field kit thumbnails", () => {
  it("carries only real, committed previews", () => {
    for (const { id, thumbnail } of fieldKitThumbnails) {
      const file = statSync(publicDir + thumbnail.src.slice(1), {
        throwIfNoEntry: false,
      });
      assert.ok(file?.isFile(), `${id}: ${thumbnail.src} is not committed`);
      assert.ok(thumbnail.alt.length > 20, `${id}: alt text is too thin`);
    }
  });

  it("gives every piece a card-sized phrase as well as its summary", () => {
    for (const { id, phrase, summary } of fieldKit) {
      assert.ok(phrase.length > 0, `${id}: phrase`);
      assert.ok(summary.length > 0, `${id}: summary`);
      assert.ok(
        phrase.length < summary.length,
        `${id}: the phrase should be shorter than the summary it condenses`,
      );
    }
  });

  it("declares one shared aspect ratio, so the row does not jump", () => {
    const [first] = fieldKitThumbnails;
    if (first === undefined) return;
    for (const { id, thumbnail } of fieldKitThumbnails) {
      assert.equal(thumbnail.width, first.thumbnail.width, `${id}: width`);
      assert.equal(thumbnail.height, first.thumbnail.height, `${id}: height`);
    }
  });
});
