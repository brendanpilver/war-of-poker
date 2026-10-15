import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  aggregateFunnel,
  allTraffic,
  bottleneck,
  byContentId,
  emptyFunnel,
  funnelSteps,
  metricValue,
  periodChanges,
  pickImport,
  withImport,
  type EventRow,
} from "../src/lib/experiments/metrics";

const window = { from: new Date("2026-10-01T00:00:00Z"), to: new Date("2026-10-08T00:00:00Z") };
const at = "2026-10-03T12:00:00Z";

function event(name: string, session: string | null, content: string | null, props = {}): EventRow {
  return { name, session_id: session, content_id: content, platform: null, created_at: at, props };
}

describe("funnel aggregation", () => {
  it("counts browsers, not events, at every step", () => {
    const events = [
      event("page_view", "s1", "EPM-001"),
      event("page_view", "s1", "EPM-001"),
      event("page_view", "s1", "EPM-001"),
      event("page_view", "s2", "EPM-001"),
      event("quiz_started", "s1", "EPM-001"),
      event("quiz_started", "s1", "EPM-001"),
      event("quiz_completed", "s1", "EPM-001"),
    ];
    const m = aggregateFunnel({ events, purchases: [], subscribers: [] }, window, byContentId).byKey.get("EPM-001");
    assert.equal(m?.visitors, 2);
    assert.equal(m?.challengeStarts, 1);
    assert.equal(m?.challengeCompletions, 1);
  });

  it("counts only the server's checkout_started", () => {
    const events = [
      event("checkout_started", "s1", "PRC-002", { source: "browser" }),
      event("checkout_started", "s1", "PRC-002", { source: "server" }),
      event("checkout_started", "s2", "PRC-002"),
    ];
    const m = aggregateFunnel({ events, purchases: [], subscribers: [] }, window, byContentId).byKey.get("PRC-002");
    assert.equal(m?.checkoutStarts, 1);
  });

  it("nets refunds out of revenue but keeps them in purchases made", () => {
    const purchases = [
      { content_id: "EPM-001", amount_cents: 3900, status: "paid", created_at: at },
      { content_id: "EPM-001", amount_cents: 2900, status: "refunded", created_at: at },
    ];
    const m = aggregateFunnel({ events: [], purchases, subscribers: [] }, window, byContentId).byKey.get("EPM-001");
    assert.equal(m?.purchases, 2);
    assert.equal(m?.refunds, 1);
    assert.equal(m?.grossRevenueCents, 6800);
    assert.equal(m?.netRevenueCents, 3900);
  });

  it("never credits a non-content source to a piece, and ignores rows outside the window", () => {
    const events = [
      event("page_view", "s1", "email-welcome"),
      { ...event("page_view", "s2", "EPM-001"), created_at: "2026-09-01T00:00:00Z" },
    ];
    const { byKey } = aggregateFunnel({ events, purchases: [], subscribers: [] }, window, byContentId);
    assert.equal(byKey.size, 0);
    const all = aggregateFunnel({ events, purchases: [], subscribers: [] }, window, allTraffic);
    assert.equal(all.byKey.get("all")?.visitors, 1);
  });

  it("reports events with no session rather than counting them", () => {
    const result = aggregateFunnel(
      { events: [event("page_view", null, "EPM-001")], purchases: [], subscribers: [] },
      window,
      byContentId,
    );
    assert.equal(result.sessionlessEvents, 1);
    assert.equal(result.byKey.get("EPM-001")?.visitors, 0);
  });
});

describe("metric values", () => {
  it("returns null rather than zero when the denominator is missing", () => {
    const m = withImport({ ...emptyFunnel(), visitors: 0 }, null);
    assert.equal(metricValue("challenge_start_rate", m), null);
    assert.equal(metricValue("visitors_per_1k_impressions", m), null);
  });

  it("uses imported impressions when present", () => {
    const m = withImport(
      { ...emptyFunnel(), visitors: 30 },
      { content_id: "EPM-001", platform: "youtube-shorts", captured_on: "2026-10-09", impressions: 6000, views: 2000, avg_view_seconds: 11, link_clicks: null },
    );
    assert.equal(metricValue("visitors_per_1k_impressions", m), 5);
  });

  it("picks the first platform capture on or after the measured date", () => {
    const rows = ["2026-10-05", "2026-10-09", "2026-10-20"].map((captured_on) => ({
      content_id: "EPM-001", platform: "tiktok", captured_on, impressions: 1, views: null, avg_view_seconds: null, link_clicks: null,
    }));
    assert.equal(pickImport(rows, "EPM-001", new Date("2026-10-08T00:00:00Z"))?.captured_on, "2026-10-09");
    assert.equal(pickImport(rows, "EPM-001", new Date("2026-11-01T00:00:00Z"))?.captured_on, "2026-10-20");
    assert.equal(pickImport(rows, "PRC-001", new Date()), null);
  });
});

describe("bottleneck and change detection", () => {
  it("names the measurable step that loses the largest share", () => {
    const steps = funnelSteps({ ...emptyFunnel(), visitors: 1000, challengeStarts: 400, challengeCompletions: 300, checkoutStarts: 30, purchases: 20 });
    assert.equal(bottleneck(steps)?.to, "Checkout");
  });

  it("will not name a bottleneck on too little traffic", () => {
    const steps = funnelSteps({ ...emptyFunnel(), visitors: 10, challengeStarts: 2 });
    assert.equal(bottleneck(steps), null);
  });

  it("flags a large change and ignores a small sample", () => {
    const big = periodChanges(
      { ...emptyFunnel(), visitors: 1000, challengeStarts: 500 },
      { ...emptyFunnel(), visitors: 1000, challengeStarts: 250 },
    );
    assert.equal(big[0].notable, true);
    const small = periodChanges(
      { ...emptyFunnel(), visitors: 20, challengeStarts: 18 },
      { ...emptyFunnel(), visitors: 20, challengeStarts: 2 },
    );
    assert.equal(small[0].notable, false);
  });
});
