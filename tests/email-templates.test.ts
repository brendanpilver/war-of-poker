import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  purchaseEmail,
  renderHtml,
  renderText,
  sequence,
  welcomeEmail,
} from "../src/lib/email/templates";
import { offers, formatPrice } from "../src/lib/offers";

const survivalCardUrl = "https://warofpoker.com/downloads/nlh-to-plo-survival-card.pdf";
const playerPriceUrl =
  "https://warofpoker.com/short-stack-plo?src=results-email&offer=player";

function finished(overrides: Partial<Parameters<typeof welcomeEmail>[0]> = {}) {
  return welcomeEmail({
    quizScore: 7,
    strongConcepts: ["SPR and commitment", "Draw quality"],
    watchConcepts: ["Turn discipline"],
    survivalCardUrl,
    playerPriceUrl,
    ...overrides,
  });
}

describe("the results email", () => {
  it("reports the score a completer earned", () => {
    assert.match(renderText(finished()), /7 of 10/);
    assert.match(finished({ quizScore: 10 }).subject, /challenge results/i);
  });

  it("carries the concepts they were strong in and should review", () => {
    const text = renderText(finished());
    assert.match(text, /SPR and commitment/);
    assert.match(text, /Turn discipline/);
  });

  it("delivers the Survival Card as its call to action", () => {
    assert.equal(finished().cta?.href, survivalCardUrl);
  });

  it("names the player price against the public one and links back to it", () => {
    const text = renderText(finished());
    assert.match(text, new RegExp(`\\${formatPrice(offers["system-quiz"].amountCents)}\\b`));
    assert.match(text, new RegExp(`\\${formatPrice(offers.system.amountCents)}\\b`));
    assert.ok(text.includes(playerPriceUrl));
    // The HTML renderer escapes `&`, so match the path and the parameter.
    assert.match(renderHtml(finished()), /short-stack-plo\?src=results-email&amp;offer=player/);
  });

  it("says the $29 Player Price buys both the book and the complete Field Kit", () => {
    const text = renderText(finished());
    assert.match(text, /You unlocked the Player Price/i);
    assert.match(text, /Short Stack PLO \+ the complete Field Kit for \$29/);
    assert.match(text, /regularly \$39/);
  });

  it("offers no player price to someone who did not finish the challenge", () => {
    const content = welcomeEmail({
      quizScore: null,
      survivalCardUrl,
      playerPriceUrl,
    });
    const text = renderText(content);
    assert.equal(content.subject, "Your PLO Survival Card");
    assert.ok(!text.includes(playerPriceUrl));
    assert.doesNotMatch(text, /player price/i);
  });

  // "countdown" is deliberately absent from this list: the copy uses the word
  // to say there isn't one.
  it("invents no urgency and runs no retail promotion", () => {
    const everything = [finished(), ...sequence.map((step) => step.content)]
      .map(renderText)
      .join("\n");
    for (const word of ["expires", "promo code", "% off", "act now", "sale", "coupon"]) {
      assert.doesNotMatch(everything, new RegExp(word, "i"), word);
    }
  });
});

describe("the sequence", () => {
  it("sends the two offer-led steps to the earned price", () => {
    for (const key of ["inside-the-system", "offer-reminder"]) {
      const step = sequence.find((entry) => entry.key === key);
      assert.ok(step, key);
      assert.match(step.content.cta?.href ?? "", /offer=player/, key);
    }
  });

  it("keeps every step's link on a real path with its own source", () => {
    for (const step of sequence) {
      assert.match(step.content.cta?.href ?? "", new RegExp(`src=email-${step.key}`));
    }
  });
});

describe("the purchase email", () => {
  const base = {
    includes: ["Short Stack PLO (PDF)"],
    downloadUrl: "https://warofpoker.com/downloads?token=t",
    expiresLabel: "30 days",
  };
  const upgradeUrl = "https://warofpoker.com/upgrade?entitlement=e";

  it("gives a book buyer a permanent $15 upgrade link", () => {
    const content = purchaseEmail({ ...base, productName: "Book Only", upgradeUrl });
    const text = renderText(content);
    assert.match(text, /Want the Field Kit later\?/);
    assert.match(text, /add the complete Field Kit anytime for \$15/);
    assert.ok(text.includes(`Add the Field Kit for $15: ${upgradeUrl}`));
  });

  it("puts the upgrade beneath the download button, never above it", () => {
    const content = purchaseEmail({ ...base, productName: "Book Only", upgradeUrl });
    const text = renderText(content);
    assert.ok(text.indexOf("Open your downloads") < text.indexOf("Want the Field Kit later"));
    const html = renderHtml(content);
    assert.ok(html.indexOf("Open your downloads") < html.indexOf("Want the Field Kit later"));
    // The download is the button; the upgrade is only a text link.
    assert.equal(content.cta?.href, base.downloadUrl);
  });

  it("does not offer the upgrade to anyone who already has the Field Kit", () => {
    const text = renderText(purchaseEmail({ ...base, productName: "Complete System" }));
    assert.doesNotMatch(text, /\$15/);
  });
});

describe("the offer-led sequence copy", () => {
  it("names both products and the $39 regular price alongside the $29", () => {
    const reminder = sequence.find((step) => step.key === "offer-reminder");
    assert.ok(reminder);
    const text = renderText(reminder.content);
    assert.match(text, /Short Stack PLO \+ the complete Field Kit for \$29/);
    assert.match(text, /regular \$39/);
    assert.match(text, /only \$4 more than the book alone/);
  });
});
