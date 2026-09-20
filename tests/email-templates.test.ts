import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { renderHtml, renderText, sequence, welcomeEmail } from "../src/lib/email/templates";
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
