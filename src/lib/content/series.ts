/**
 * The recurring content series, and the content IDs that trace a piece through
 * the funnel.
 *
 * A content ID is the unit of attribution: it goes out in the link on a
 * published piece (`?src=EPM-001`), is stored first-touch in the browser, rides
 * through Stripe Checkout metadata, and lands on the purchase row. That is what
 * makes "which Short generated this purchase?" answerable.
 */

export const seriesCodes = ["EPM", "PRC", "HIPR", "HSEP"] as const;
export type SeriesCode = (typeof seriesCodes)[number];

export type Series = {
  code: SeriesCode;
  name: string;
  premise: string;
};

export const series: Record<SeriesCode, Series> = {
  EPM: {
    code: "EPM",
    name: "EXPENSIVE PLO MISTAKES",
    premise:
      "One spot, one number, one avoidable loss. Opens on the money already at risk.",
  },
  PRC: {
    code: "PRC",
    name: "PLO REALITY CHECK",
    premise: "A single A/B/C/D decision, answered and explained.",
  },
  HIPR: {
    code: "HIPR",
    name: "HOLD'EM INSTINCT vs PLO REALITY",
    premise:
      "A familiar No-Limit heuristic set against the PLO decision it gets wrong.",
  },
  HSEP: {
    code: "HSEP",
    name: "HAND · SPR · EQUITY · PLAYER",
    premise: "One hand, teaching one component of the four-question lens.",
  },
};

export const contentStatuses = [
  "draft",
  "in_review",
  "approved",
  "published",
  "retired",
] as const;
export type ContentStatus = (typeof contentStatuses)[number];

export function isSeriesCode(value: unknown): value is SeriesCode {
  return typeof value === "string" && (seriesCodes as readonly string[]).includes(value);
}

export function isContentStatus(value: unknown): value is ContentStatus {
  return (
    typeof value === "string" && (contentStatuses as readonly string[]).includes(value)
  );
}

/** Content IDs are `<SERIES>-<3 digits>`, e.g. "EPM-001". */
const CONTENT_ID_PATTERN = /^(EPM|PRC|HIPR|HSEP)-(\d{3})$/;

export function isContentId(value: unknown): value is string {
  return typeof value === "string" && CONTENT_ID_PATTERN.test(value);
}

export function parseContentId(
  value: string,
): { series: SeriesCode; number: number } | null {
  const match = CONTENT_ID_PATTERN.exec(value);
  if (!match) return null;
  return { series: match[1] as SeriesCode, number: Number.parseInt(match[2], 10) };
}

export function formatContentId(seriesCode: SeriesCode, n: number): string {
  return `${seriesCode}-${String(n).padStart(3, "0")}`;
}

/** The tracked link a published piece points at. */
export function trackedLink(
  contentId: string,
  path = "/plo-reality-check",
  platform?: string,
): string {
  const params = new URLSearchParams({ src: contentId });
  if (platform) params.set("platform", platform);
  return `${path}?${params.toString()}`;
}
