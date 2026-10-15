import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { parseMetricsCsv } from "../src/lib/experiments/imports";
import { isCronAuthorized } from "../src/lib/experiments/cron-auth";
import { dailyReportKey, slotKey, weeklyReportKey } from "../src/lib/experiments/job-schedule";
import { buildWeeklyReport } from "../src/lib/experiments/report";
import { emptyFunnel } from "../src/lib/experiments/metrics";

const today = new Date("2026-10-25T00:00:00Z");

describe("platform metrics import", () => {
  it("parses rows and keeps blanks as null, never zero", () => {
    const { rows, errors } = parseMetricsCsv(
      "content_id,platform,captured_on,impressions,views,avg_view_seconds,link_clicks\nEPM-004,youtube-shorts,2026-10-22,5120,1830,11.4,\n",
      today,
    );
    assert.deepEqual(errors, []);
    assert.deepEqual(rows, [
      { content_id: "EPM-004", platform: "youtube-shorts", captured_on: "2026-10-22", impressions: 5120, views: 1830, avg_view_seconds: 11.4, link_clicks: null },
    ]);
  });

  it("accepts columns in any order", () => {
    const { rows } = parseMetricsCsv("platform,content_id,captured_on,views\ntiktok,PRC-002,2026-10-20,900", today);
    assert.equal(rows[0].views, 900);
    assert.equal(rows[0].impressions, null);
  });

  it("rejects bad ids, platforms, future dates, negatives, empties and duplicates", () => {
    const csv = [
      "content_id,platform,captured_on,impressions,views",
      "XYZ-1,tiktok,2026-10-20,1,1",
      "EPM-001,myspace,2026-10-20,1,1",
      "EPM-001,tiktok,2026-12-01,1,1",
      "EPM-001,tiktok,2026-10-20,-5,1",
      "EPM-001,tiktok,2026-10-20,,",
      "EPM-002,tiktok,2026-10-20,10,1",
      "EPM-002,tiktok,2026-10-20,11,1",
    ].join("\n");
    const { rows, errors } = parseMetricsCsv(csv, today);
    assert.equal(rows.length, 1);
    assert.equal(errors.length, 6);
  });

  it("requires the key columns", () => {
    assert.match(parseMetricsCsv("content_id,views\nEPM-001,3", today).errors[0], /platform/);
  });
});

describe("job slots", () => {
  it("rounds down to the six-hour slot in UTC", () => {
    assert.equal(slotKey(new Date("2026-10-15T00:00:00Z")), "2026-10-15T00");
    assert.equal(slotKey(new Date("2026-10-15T05:59:59Z")), "2026-10-15T00");
    assert.equal(slotKey(new Date("2026-10-15T13:10:00Z")), "2026-10-15T12");
    assert.equal(slotKey(new Date("2026-10-15T23:59:00Z")), "2026-10-15T18");
  });

  it("makes reports due once a day and on Monday afternoons", () => {
    assert.equal(dailyReportKey(new Date("2026-10-15T06:00:00Z")), null);
    assert.equal(dailyReportKey(new Date("2026-10-15T12:00:00Z")), "2026-10-15");
    assert.equal(weeklyReportKey(new Date("2026-10-15T12:00:00Z")), null, "a Thursday");
    assert.equal(weeklyReportKey(new Date("2026-10-19T12:00:00Z")), "2026-W43");
    assert.equal(weeklyReportKey(new Date("2026-10-19T06:00:00Z")), null);
  });
});

describe("weekly report", () => {
  it("answers the five questions, and says when nothing is supported", () => {
    const report = buildWeeklyReport({
      now: new Date("2026-10-19T12:00:00Z"),
      day: emptyFunnel(),
      week: emptyFunnel(),
      bottleneck: null,
      changes: [],
      experiments: [],
      proposals: [],
      plannerStatus: [],
      dataWarnings: [],
      failedRunsLastDay: 0,
    });
    const headings = report.blocks.filter((b) => b.kind === "h").map((b) => (b as { text: string }).text);
    assert.deepEqual(headings, [
      "1. What did we test?",
      "2. What happened?",
      "3. What do the results actually support?",
      "4. What remains uncertain?",
      "5. What should we test next?",
    ]);
    assert.match(JSON.stringify(report), /no result is supported yet/);
  });
});

describe("cron authorisation", () => {
  const request = (auth?: string) => new Request("https://x.test/api/analytics/run", { method: "POST", headers: auth ? { authorization: auth } : {} });

  it("accepts only the exact cron secret", () => {
    assert.equal(isCronAuthorized(request("Bearer s3cret"), "s3cret"), true);
    assert.equal(isCronAuthorized(request("Bearer s3cre"), "s3cret"), false);
    assert.equal(isCronAuthorized(request("s3cret"), "s3cret"), false);
    assert.equal(isCronAuthorized(request(), "s3cret"), false);
  });

  it("is closed when no secret is configured", () => {
    assert.equal(isCronAuthorized(request("Bearer "), null), false);
    assert.equal(isCronAuthorized(request("Bearer anything"), null), false);
  });
});
