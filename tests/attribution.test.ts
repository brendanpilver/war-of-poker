import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  compact,
  isAnonymousVisit,
  mergeAttribution,
  parseAttribution,
} from "../src/lib/analytics/attribution";

describe("parseAttribution", () => {
  it("reads the content ID from ?src", () => {
    const result = parseAttribution(
      "https://warofpoker.com/plo-challenge?src=EPM-001",
    );
    assert.equal(result.src, "EPM-001");
    assert.equal(result.landingPage, "/plo-challenge");
  });

  it("accepts ?content_id as an alias for ?src", () => {
    const result = parseAttribution("https://warofpoker.com/?content_id=PRC-012");
    assert.equal(result.src, "PRC-012");
  });

  it("reads UTM parameters and the platform", () => {
    const result = parseAttribution(
      "https://warofpoker.com/?utm_source=youtube&utm_medium=short&utm_campaign=launch&platform=yt",
    );
    assert.equal(result.utmSource, "youtube");
    assert.equal(result.utmMedium, "short");
    assert.equal(result.utmCampaign, "launch");
    assert.equal(result.platform, "yt");
  });

  it("records the referrer when one is supplied", () => {
    const result = parseAttribution(
      "https://warofpoker.com/",
      "https://reddit.com/r/poker",
    );
    assert.equal(result.referrer, "https://reddit.com/r/poker");
  });

  it("omits absent parameters rather than storing empty strings", () => {
    const result = parseAttribution("https://warofpoker.com/short-stack-plo");
    assert.equal("src" in result, false);
    assert.equal("utmSource" in result, false);
  });

  it("strips control characters and bounds the length", () => {
    const nul = String.fromCharCode(0);
    const result = parseAttribution(
      `https://warofpoker.com/?src=${encodeURIComponent(`EP${nul}M-001`)}` +
        `&utm_campaign=${"x".repeat(300)}`,
    );
    assert.equal(result.src, "EPM-001");
    assert.equal(result.utmCampaign?.length, 120);
  });

  it("returns nothing for an unparseable URL instead of throwing", () => {
    assert.deepEqual(parseAttribution("not a url"), {});
  });
});

describe("isAnonymousVisit", () => {
  it("is true when no content ID or campaign is present", () => {
    assert.equal(isAnonymousVisit({ landingPage: "/" }), true);
  });

  it("is false once a content ID is present", () => {
    assert.equal(isAnonymousVisit({ src: "EPM-001" }), false);
  });
});

describe("mergeAttribution", () => {
  it("keeps the first credited visit when a later visit is anonymous", () => {
    const merged = mergeAttribution(
      { src: "EPM-001" },
      { landingPage: "/short-stack-plo" },
    );
    assert.equal(merged.src, "EPM-001");
  });

  it("does not let a second tracked link steal credit from the first", () => {
    const merged = mergeAttribution({ src: "EPM-001" }, { src: "PRC-012" });
    assert.equal(merged.src, "EPM-001");
  });

  it("fills in a credited visit over an uncredited stored one", () => {
    const merged = mergeAttribution({ landingPage: "/" }, { src: "HSEP-015" });
    assert.equal(merged.src, "HSEP-015");
  });
});

describe("compact", () => {
  it("drops undefined values", () => {
    const result = compact({ src: "EPM-001", utmSource: undefined });
    assert.deepEqual(result, { src: "EPM-001" });
  });
});
