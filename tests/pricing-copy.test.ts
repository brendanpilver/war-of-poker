import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";

/**
 * Customer-facing pricing copy.
 *
 * The components are TSX, which Node's type stripping cannot load, so these
 * read the source. The rule they enforce is the one that keeps prices honest:
 * a price on a pricing surface is always computed from `src/lib/offers.ts`,
 * never typed as a literal that could survive the next price change.
 */

const root = new URL("..", import.meta.url).pathname;

function read(path: string): string {
  return readFileSync(join(root, path), "utf8");
}

function sourceFiles(dir: string): string[] {
  return readdirSync(join(root, dir)).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(join(root, path)).isDirectory()) return sourceFiles(path);
    return /\.(ts|tsx)$/.test(name) ? [path] : [];
  });
}

/** Every surface that states a Short Stack PLO price to a customer. */
const pricingSurfaces = [
  "src/components/marketing/pricing.tsx",
  "src/components/marketing/product-hero.tsx",
  "src/components/marketing/challenge-cta.tsx",
  "src/components/marketing/player-price-notice.tsx",
  "src/components/marketing/buy-button.tsx",
  "src/components/marketing/what-you-get.tsx",
  "src/components/quiz/challenge-result.tsx",
  "src/app/plo-challenge/page.tsx",
  "src/app/downloads/page.tsx",
  "src/app/thank-you/page.tsx",
  "src/app/upgrade/page.tsx",
  "src/components/marketing/field-kit-upgrade.tsx",
];

/** Strips comments so a note about pricing history is not mistaken for copy. */
function code(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
}

describe("pricing copy", () => {
  it("never hard-codes a dollar price on a pricing surface", () => {
    for (const path of pricingSurfaces) {
      assert.doesNotMatch(code(read(path)), /\$\d/, path);
    }
  });

  it("no longer mentions the retired $49 price anywhere in the application", () => {
    for (const path of sourceFiles("src")) {
      assert.doesNotMatch(code(read(path)), /\$49\b/, path);
    }
  });

  it("promotes the challenge as the whole system, book and Field Kit, for $29", () => {
    for (const path of [
      "src/components/marketing/challenge-cta.tsx",
      "src/components/marketing/product-hero.tsx",
      "src/components/marketing/pricing.tsx",
    ]) {
      const source = read(path);
      assert.match(source, /unlock the complete/, path);
      assert.match(source, /the book\s+and the complete\s+Field Kit/, path);
      assert.match(source, /[Ee]verything/, path);
    }
  });

  it("tells a completer exactly what the Player Price buys", () => {
    const source = read("src/components/quiz/challenge-result.tsx");
    assert.match(source, /You unlocked the Player Price/);
    assert.match(source, /\+ the complete Field Kit for/);
    assert.match(source, /Regular price/);
    assert.match(source, /offerId="system-quiz"/);
  });

  it("sells the $15 upgrade only with a book owner's entitlement", () => {
    const upgrade = "src/components/marketing/field-kit-upgrade.tsx";
    assert.match(read(upgrade), /offerId="field-kit-upgrade"/);
    assert.match(read(upgrade), /entitlement=\{entitlement\}/);
    // Nowhere else carries a buy button for it.
    for (const path of sourceFiles("src").filter((p) => p !== upgrade)) {
      assert.doesNotMatch(read(path), /offerId="field-kit-upgrade"/, path);
    }
    // Rendered only for a book download link, or a verified entitlement.
    assert.match(read("src/app/downloads/page.tsx"), /payload\?\.product === "book"/);
    assert.match(read("src/app/upgrade/page.tsx"), /verifyUpgradeEntitlement/);
  });

  it("never shows an upgrade's download links on the thank-you page", () => {
    // They go by email to the book buyer only; see src/app/thank-you/page.tsx.
    const source = read("src/app/thank-you/page.tsx");
    assert.match(source, /purchase\?\.id && !offer\.bookOwnerOnly/);
  });
});
