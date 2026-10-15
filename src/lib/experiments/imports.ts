import { isContentId } from "@/lib/content/series";
import type { MetricImportRow } from "./metrics";
import { platforms } from "./spec";

/**
 * The manual import for platform metrics.
 *
 * Impressions, views and watch time live inside YouTube, TikTok and
 * Instagram. None of them is reachable without an OAuth app connection (and,
 * for TikTok and Instagram, an app review), so until one exists the operator
 * pastes the numbers from each platform's analytics screen. Nothing is ever
 * estimated: a blank cell stays null, and a metric that needs it reports
 * "no data" rather than a guess.
 *
 * Format, one row per piece per capture date, header required:
 *
 *   content_id,platform,captured_on,impressions,views,avg_view_seconds,link_clicks
 *   EPM-004,youtube-shorts,2026-10-22,5120,1830,11.4,
 */

export const IMPORT_COLUMNS = [
  "content_id",
  "platform",
  "captured_on",
  "impressions",
  "views",
  "avg_view_seconds",
  "link_clicks",
] as const;

const MAX_ROWS = 500;

function count(raw: string | undefined): number | null | "invalid" {
  const value = (raw ?? "").trim().replace(/,/g, "");
  if (value === "") return null;
  if (!/^\d+$/.test(value)) return "invalid";
  const n = Number.parseInt(value, 10);
  return n <= 2_000_000_000 ? n : "invalid";
}

function seconds(raw: string | undefined): number | null | "invalid" {
  const value = (raw ?? "").trim();
  if (value === "") return null;
  if (!/^\d+(\.\d+)?$/.test(value)) return "invalid";
  const n = Number.parseFloat(value);
  return n < 100_000 ? n : "invalid";
}

export function parseMetricsCsv(
  text: string,
  today: Date,
): { rows: MetricImportRow[]; errors: string[] } {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
  const errors: string[] = [];
  if (lines.length === 0) return { rows: [], errors: ["Nothing to import."] };

  const header = lines[0].split(",").map((cell) => cell.trim().toLowerCase());
  const index = Object.fromEntries(IMPORT_COLUMNS.map((name) => [name, header.indexOf(name)]));
  for (const required of ["content_id", "platform", "captured_on"] as const) {
    if (index[required] < 0) errors.push(`Missing column: ${required}.`);
  }
  if (errors.length > 0) return { rows: [], errors };
  if (lines.length - 1 > MAX_ROWS) return { rows: [], errors: [`At most ${MAX_ROWS} rows per import.`] };

  const latest = today.toISOString().slice(0, 10);
  const rows: MetricImportRow[] = [];
  const seen = new Set<string>();

  lines.slice(1).forEach((line, i) => {
    const cells = line.split(",");
    const at = (name: (typeof IMPORT_COLUMNS)[number]) => (index[name] >= 0 ? cells[index[name]]?.trim() : undefined);
    const where = `Row ${i + 2}`;

    const contentId = at("content_id") ?? "";
    const platform = at("platform") ?? "";
    const capturedOn = at("captured_on") ?? "";
    if (!isContentId(contentId)) return void errors.push(`${where}: content_id "${contentId}" is not a content ID.`);
    if (!(platforms as readonly string[]).includes(platform)) {
      return void errors.push(`${where}: platform must be one of ${platforms.join(", ")}.`);
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(capturedOn) || Number.isNaN(Date.parse(capturedOn)) || capturedOn > latest) {
      return void errors.push(`${where}: captured_on must be a date (YYYY-MM-DD) no later than today.`);
    }

    const impressions = count(at("impressions"));
    const views = count(at("views"));
    const linkClicks = count(at("link_clicks"));
    const avg = seconds(at("avg_view_seconds"));
    if ([impressions, views, linkClicks, avg].includes("invalid")) {
      return void errors.push(`${where}: numbers must be non-negative, without units.`);
    }
    if (impressions === null && views === null && avg === null && linkClicks === null) {
      return void errors.push(`${where}: no metrics given.`);
    }

    const key = `${contentId}|${platform}|${capturedOn}`;
    if (seen.has(key)) return void errors.push(`${where}: duplicate of an earlier row.`);
    seen.add(key);

    rows.push({
      content_id: contentId,
      platform,
      captured_on: capturedOn,
      impressions: impressions as number | null,
      views: views as number | null,
      avg_view_seconds: avg as number | null,
      link_clicks: linkClicks as number | null,
    });
  });

  return { rows, errors };
}
