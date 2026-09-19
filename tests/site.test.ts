import assert from "node:assert/strict";
import { describe, it } from "node:test";

/**
 * `siteUrl` is resolved once at module load, so each case imports a fresh copy
 * with a different environment. The cache-busting query keeps Node from
 * returning the already-evaluated module.
 */
async function loadSite(env: Record<string, string | undefined>, key: string) {
  const previous: Record<string, string | undefined> = {};
  for (const [name, value] of Object.entries(env)) {
    previous[name] = process.env[name];
    if (value === undefined) delete process.env[name];
    else process.env[name] = value;
  }

  try {
    return (await import(`../src/lib/site.ts?case=${key}`)) as {
      siteUrl: string;
      isProductionSite: boolean;
      PRODUCTION_URL: string;
    };
  } finally {
    for (const [name, value] of Object.entries(previous)) {
      if (value === undefined) delete process.env[name];
      else process.env[name] = value;
    }
  }
}

const cleared = {
  NEXT_PUBLIC_SITE_URL: undefined,
  NEXT_PUBLIC_VERCEL_PROJECT_PRODUCTION_URL: undefined,
  NEXT_PUBLIC_VERCEL_URL: undefined,
};

describe("siteUrl resolution", () => {
  it("defaults to the production domain so launch needs no configuration", async () => {
    const site = await loadSite(cleared, "default");
    assert.equal(site.siteUrl, "https://warofpoker.com");
    assert.equal(site.isProductionSite, true);
  });

  it("prefers an explicit NEXT_PUBLIC_SITE_URL", async () => {
    const site = await loadSite(
      { ...cleared, NEXT_PUBLIC_SITE_URL: "https://staging.example.com" },
      "explicit",
    );
    assert.equal(site.siteUrl, "https://staging.example.com");
    assert.equal(site.isProductionSite, false);
  });

  it("adds a scheme to Vercel's bare host", async () => {
    const site = await loadSite(
      { ...cleared, NEXT_PUBLIC_VERCEL_URL: "war-of-poker.vercel.app" },
      "vercel",
    );
    assert.equal(site.siteUrl, "https://war-of-poker.vercel.app");
    assert.equal(site.isProductionSite, false);
  });

  it("strips a trailing slash so joined paths never double up", async () => {
    const site = await loadSite(
      { ...cleared, NEXT_PUBLIC_SITE_URL: "https://example.com/" },
      "slash",
    );
    assert.equal(site.siteUrl, "https://example.com");
    assert.equal(`${site.siteUrl}/thank-you`, "https://example.com/thank-you");
  });

  it("ignores an empty or whitespace override rather than producing a bad origin", async () => {
    const site = await loadSite(
      { ...cleared, NEXT_PUBLIC_SITE_URL: "   " },
      "blank",
    );
    assert.equal(site.siteUrl, "https://warofpoker.com");
  });

  it("treats the production URL as production however it is supplied", async () => {
    const site = await loadSite(
      { ...cleared, NEXT_PUBLIC_SITE_URL: "https://warofpoker.com/" },
      "prod-explicit",
    );
    assert.equal(site.isProductionSite, true);
  });

  it("always yields a parseable origin for metadataBase", async () => {
    for (const [key, env] of [
      ["p1", cleared],
      ["p2", { ...cleared, NEXT_PUBLIC_VERCEL_URL: "foo.vercel.app" }],
    ] as const) {
      const site = await loadSite(env, key);
      assert.doesNotThrow(() => new URL(site.siteUrl));
    }
  });
});
