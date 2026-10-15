import { isContentId, parseContentId } from "@/lib/content/series";
import type { ContentSettings } from "./spec";
import { differenceInterval, wilson } from "./stats";

/**
 * Funnel metrics per content ID, computed from the raw tables.
 *
 * Counting rules, which are the point of this file:
 *
 * - **Steps count browsers, not events.** Each funnel step is the number of
 *   distinct `session_id`s that reached it. The session id lives in
 *   `localStorage`, so it is one browser on one device -- closer to a person
 *   than a page view, but not a person. A reload, a second tab or a retried
 *   beacon cannot inflate a step.
 * - **Checkouts are the server's.** Both the browser and `/api/checkout` emit
 *   `checkout_started`; only the server's (`props.source === "server"`) means
 *   a Stripe session was created.
 * - **Sales come from `purchases`**, which only the verified webhook writes,
 *   never from `purchase_completed` events.
 * - **Revenue is refund-adjusted.** A refunded purchase stays in the count of
 *   purchases made and leaves net revenue.
 * - **Attribution is first touch**, as recorded on each row. Sources that are
 *   not content IDs (`email-welcome`, `results-email`) are reported but never
 *   credited to a piece.
 */

export type EventRow = {
  name: string;
  session_id: string | null;
  content_id: string | null;
  platform: string | null;
  created_at: string;
  props: Record<string, unknown> | null;
};

export type PurchaseRow = {
  content_id: string | null;
  amount_cents: number;
  status: string;
  created_at: string;
};

export type SubscriberRow = {
  content_id: string | null;
  created_at: string;
};

export type MetricImportRow = {
  content_id: string;
  platform: string;
  captured_on: string;
  impressions: number | null;
  views: number | null;
  avg_view_seconds: number | null;
  link_clicks: number | null;
};

export type FunnelMetrics = {
  visitors: number;
  challengeStarts: number;
  challengeCompletions: number;
  emailCaptures: number;
  checkoutStarts: number;
  /** Purchases made, including any later refunded. */
  purchases: number;
  refunds: number;
  grossRevenueCents: number;
  refundedCents: number;
  netRevenueCents: number;
};

export type PieceMetrics = FunnelMetrics & {
  impressions: number | null;
  views: number | null;
  avgViewSeconds: number | null;
  /** The platform's capture date for the impression figures. */
  importCapturedOn: string | null;
};

export const emptyFunnel = (): FunnelMetrics => ({
  visitors: 0,
  challengeStarts: 0,
  challengeCompletions: 0,
  emailCaptures: 0,
  checkoutStarts: 0,
  purchases: 0,
  refunds: 0,
  grossRevenueCents: 0,
  refundedCents: 0,
  netRevenueCents: 0,
});

export type Window = { from: Date; to: Date };

function within(iso: string, window: Window): boolean {
  const t = Date.parse(iso);
  return t >= window.from.getTime() && t < window.to.getTime();
}

const STEP_EVENTS = {
  page_view: "visitors",
  quiz_started: "challengeStarts",
  quiz_completed: "challengeCompletions",
  checkout_started: "checkoutStarts",
} as const;

type StepKey = (typeof STEP_EVENTS)[keyof typeof STEP_EVENTS];

/**
 * Aggregates every row in `window` under the key `keyOf` returns for its
 * content ID. Rows mapped to null are dropped.
 */
export function aggregateFunnel(
  input: { events: EventRow[]; purchases: PurchaseRow[]; subscribers: SubscriberRow[] },
  window: Window,
  keyOf: (contentId: string | null) => string | null,
): { byKey: Map<string, FunnelMetrics>; sessionlessEvents: number } {
  const sessions = new Map<string, Record<StepKey, Set<string>>>();
  const byKey = new Map<string, FunnelMetrics>();
  let sessionlessEvents = 0;

  const ensure = (key: string) => {
    let metrics = byKey.get(key);
    if (!metrics) {
      metrics = emptyFunnel();
      byKey.set(key, metrics);
      sessions.set(key, {
        visitors: new Set(),
        challengeStarts: new Set(),
        challengeCompletions: new Set(),
        checkoutStarts: new Set(),
      });
    }
    return metrics;
  };

  for (const event of input.events) {
    if (!Object.hasOwn(STEP_EVENTS, event.name)) continue;
    if (event.name === "checkout_started" && event.props?.source !== "server") continue;
    if (!within(event.created_at, window)) continue;
    const key = keyOf(event.content_id);
    if (key === null) continue;
    ensure(key);
    if (!event.session_id) {
      sessionlessEvents += 1;
      continue;
    }
    const step = STEP_EVENTS[event.name as keyof typeof STEP_EVENTS];
    sessions.get(key)?.[step].add(event.session_id);
  }

  for (const [key, steps] of sessions) {
    const metrics = byKey.get(key);
    if (!metrics) continue;
    metrics.visitors = steps.visitors.size;
    metrics.challengeStarts = steps.challengeStarts.size;
    metrics.challengeCompletions = steps.challengeCompletions.size;
    metrics.checkoutStarts = steps.checkoutStarts.size;
  }

  for (const subscriber of input.subscribers) {
    if (!within(subscriber.created_at, window)) continue;
    const key = keyOf(subscriber.content_id);
    if (key === null) continue;
    ensure(key).emailCaptures += 1;
  }

  for (const purchase of input.purchases) {
    if (!within(purchase.created_at, window)) continue;
    const key = keyOf(purchase.content_id);
    if (key === null) continue;
    const metrics = ensure(key);
    metrics.purchases += 1;
    metrics.grossRevenueCents += purchase.amount_cents;
    if (purchase.status === "refunded") {
      metrics.refunds += 1;
      metrics.refundedCents += purchase.amount_cents;
    } else {
      metrics.netRevenueCents += purchase.amount_cents;
    }
  }

  return { byKey, sessionlessEvents };
}

/** Credits only real content IDs; everything else is unattributed. */
export const byContentId = (contentId: string | null) =>
  contentId && isContentId(contentId) ? contentId : null;

export const allTraffic = () => "all";

// ---------------------------------------------------------------------------
// Metric catalogue
// ---------------------------------------------------------------------------

export const metricIds = [
  "visitors",
  "visitors_per_1k_impressions",
  "challenge_start_rate",
  "challenge_completion_rate",
  "checkout_rate",
  "purchase_rate",
  "net_revenue_per_visitor",
  "net_revenue_per_1k_impressions",
  "refund_rate",
] as const;
export type MetricId = (typeof metricIds)[number];

export const metricLabels: Record<MetricId, string> = {
  visitors: "Visitors (browsers)",
  visitors_per_1k_impressions: "Visitors per 1,000 impressions",
  challenge_start_rate: "Challenge starts per visitor",
  challenge_completion_rate: "Challenge completions per start",
  checkout_rate: "Checkouts per visitor",
  purchase_rate: "Purchases per visitor",
  net_revenue_per_visitor: "Net revenue per visitor",
  net_revenue_per_1k_impressions: "Net revenue per 1,000 impressions",
  refund_rate: "Refunds per purchase",
};

/** Numerator and denominator for each rate, so pooled intervals can be built. */
const ratios: Partial<Record<MetricId, [keyof PieceMetrics, keyof PieceMetrics]>> = {
  challenge_start_rate: ["challengeStarts", "visitors"],
  challenge_completion_rate: ["challengeCompletions", "challengeStarts"],
  checkout_rate: ["checkoutStarts", "visitors"],
  purchase_rate: ["purchases", "visitors"],
  refund_rate: ["refunds", "purchases"],
};

export function isMetricId(value: unknown): value is MetricId {
  return typeof value === "string" && (metricIds as readonly string[]).includes(value);
}

/** True when the metric needs impressions we may not have. */
export function needsImpressions(metric: MetricId): boolean {
  return metric === "visitors_per_1k_impressions" || metric === "net_revenue_per_1k_impressions";
}

/** A piece's value for a metric, or null when its denominator is zero or missing. */
export function metricValue(metric: MetricId, m: PieceMetrics): number | null {
  switch (metric) {
    case "visitors":
      return m.visitors;
    case "visitors_per_1k_impressions":
      return m.impressions ? (m.visitors * 1000) / m.impressions : null;
    case "net_revenue_per_visitor":
      return m.visitors > 0 ? m.netRevenueCents / m.visitors : null;
    case "net_revenue_per_1k_impressions":
      return m.impressions ? (m.netRevenueCents * 1000) / m.impressions : null;
    default: {
      const pair = ratios[metric];
      if (!pair) return null;
      const den = m[pair[1]] as number;
      return den > 0 ? (m[pair[0]] as number) / den : null;
    }
  }
}

/** Numerator and denominator of a pooled rate, when the metric is a proportion. */
export function metricRatio(metric: MetricId, m: PieceMetrics): [number, number] | null {
  const pair = ratios[metric];
  if (!pair) return null;
  return [m[pair[0]] as number, m[pair[1]] as number];
}

export function sumMetrics(list: PieceMetrics[]): PieceMetrics {
  const total: PieceMetrics = { ...emptyFunnel(), impressions: null, views: null, avgViewSeconds: null, importCapturedOn: null };
  for (const m of list) {
    total.visitors += m.visitors;
    total.challengeStarts += m.challengeStarts;
    total.challengeCompletions += m.challengeCompletions;
    total.emailCaptures += m.emailCaptures;
    total.checkoutStarts += m.checkoutStarts;
    total.purchases += m.purchases;
    total.refunds += m.refunds;
    total.grossRevenueCents += m.grossRevenueCents;
    total.refundedCents += m.refundedCents;
    total.netRevenueCents += m.netRevenueCents;
    if (m.impressions !== null) total.impressions = (total.impressions ?? 0) + m.impressions;
    if (m.views !== null) total.views = (total.views ?? 0) + m.views;
  }
  return total;
}

// ---------------------------------------------------------------------------
// Platform imports
// ---------------------------------------------------------------------------

/**
 * The import to use for a piece measured up to `asOf`: the earliest capture
 * on or after that date (closest to the measured period without falling
 * short of it), else the latest before it.
 */
export function pickImport(
  imports: MetricImportRow[],
  contentId: string,
  asOf: Date,
): MetricImportRow | null {
  const mine = imports
    .filter((row) => row.content_id === contentId)
    .sort((a, b) => a.captured_on.localeCompare(b.captured_on));
  if (mine.length === 0) return null;
  const day = asOf.toISOString().slice(0, 10);
  return mine.find((row) => row.captured_on >= day) ?? mine[mine.length - 1];
}

export function withImport(funnel: FunnelMetrics, row: MetricImportRow | null): PieceMetrics {
  return {
    ...funnel,
    impressions: row?.impressions ?? null,
    views: row?.views ?? null,
    avgViewSeconds: row?.avg_view_seconds ?? null,
    importCapturedOn: row?.captured_on ?? null,
  };
}

// ---------------------------------------------------------------------------
// Funnel steps, bottleneck, and period-over-period change
// ---------------------------------------------------------------------------

export type FunnelStep = {
  from: string;
  to: string;
  entered: number;
  advanced: number;
  rate: number;
  low: number;
  high: number;
  lost: number;
};

const STEP_CHAIN: [keyof FunnelMetrics, string][] = [
  ["visitors", "Visit"],
  ["challengeStarts", "Challenge start"],
  ["challengeCompletions", "Challenge completion"],
  ["checkoutStarts", "Checkout"],
  ["purchases", "Purchase"],
];

/** Below this many entrants a step's rate is too noisy to call a bottleneck. */
export const MIN_STEP_ENTRANTS = 20;

/**
 * Step-to-step conversion. The chain is approximate: a visitor can reach
 * checkout from the product page without starting the challenge, so the
 * checkout step can exceed the completion step.
 */
export function funnelSteps(m: FunnelMetrics): FunnelStep[] {
  const steps: FunnelStep[] = [];
  for (let i = 0; i < STEP_CHAIN.length - 1; i++) {
    const [fromKey, from] = STEP_CHAIN[i];
    const [toKey, to] = STEP_CHAIN[i + 1];
    const entered = m[fromKey];
    const advanced = m[toKey];
    const interval = wilson(Math.min(advanced, entered), entered);
    steps.push({
      from,
      to,
      entered,
      advanced,
      rate: entered > 0 ? advanced / entered : 0,
      low: interval.low,
      high: interval.high,
      lost: Math.max(0, entered - advanced),
    });
  }
  return steps;
}

/**
 * The step losing the largest share of the people who reach it, among steps
 * with enough entrants to measure. There is no external benchmark: this says
 * where the leak is largest, not that it is abnormal.
 */
export function bottleneck(steps: FunnelStep[]): FunnelStep | null {
  const measurable = steps.filter((step) => step.entered >= MIN_STEP_ENTRANTS);
  if (measurable.length === 0) return null;
  return measurable.reduce((worst, step) => (step.rate < worst.rate ? step : worst));
}

export type PeriodChange = {
  metric: string;
  current: { x: number; n: number; rate: number };
  previous: { x: number; n: number; rate: number };
  diff: number;
  low: number;
  high: number;
  /** The 99% interval excludes zero and both periods have enough traffic. */
  notable: boolean;
};

/** Minimum traffic per period before a change is flagged. */
export const MIN_CHANGE_N = 50;

/**
 * Last seven days against the seven before, for the site-wide step rates. A
 * 99% interval, because several rates are checked every run and a 95% one
 * would flag noise most weeks.
 */
export function periodChanges(current: FunnelMetrics, previous: FunnelMetrics): PeriodChange[] {
  const pairs: [string, keyof FunnelMetrics, keyof FunnelMetrics][] = [
    ["Challenge starts per visitor", "challengeStarts", "visitors"],
    ["Challenge completions per start", "challengeCompletions", "challengeStarts"],
    ["Checkouts per visitor", "checkoutStarts", "visitors"],
    ["Purchases per visitor", "purchases", "visitors"],
  ];
  return pairs.map(([metric, num, den]) => {
    const cx = Math.min(current[num], current[den]);
    const px = Math.min(previous[num], previous[den]);
    const interval = differenceInterval(px, previous[den], cx, current[den], 2.576);
    return {
      metric,
      current: { x: cx, n: current[den], rate: current[den] > 0 ? cx / current[den] : 0 },
      previous: { x: px, n: previous[den], rate: previous[den] > 0 ? px / previous[den] : 0 },
      diff: interval.diff,
      low: interval.low,
      high: interval.high,
      notable:
        current[den] >= MIN_CHANGE_N &&
        previous[den] >= MIN_CHANGE_N &&
        (interval.low > 0 || interval.high < 0),
    };
  });
}

// ---------------------------------------------------------------------------
// Observational comparisons by setting
// ---------------------------------------------------------------------------

export type LevelSummary = {
  level: string;
  pieces: number;
  visitors: number;
  challengeStarts: number;
  purchases: number;
  netRevenueCents: number;
  startRate: { rate: number; low: number; high: number };
  purchaseRate: { rate: number; low: number; high: number };
};

export type FactorSummary = {
  factor: string;
  levels: LevelSummary[];
};

export type PieceRecord = {
  contentId: string;
  settings: ContentSettings | null;
  metrics: PieceMetrics;
};

const SUMMARY_FACTORS = [
  "series",
  "hook",
  "lesson",
  "durationSec",
  "countdownSec",
  "pacing",
  "visual",
  "cta",
  "platform",
  "template",
] as const;

/**
 * Pooled results grouped by each setting. **Observational**: pieces were not
 * randomised across these levels, so differences mix the setting with
 * publish date, platform, example and luck. Pooled intervals treat visitors
 * as independent, which they are not (see stats.ts), so they understate the
 * uncertainty. Shown to steer what to test, never as a result.
 */
export function factorSummaries(pieces: PieceRecord[]): FactorSummary[] {
  return SUMMARY_FACTORS.map((factor) => {
    const groups = new Map<string, PieceMetrics[]>();
    for (const piece of pieces) {
      const level =
        factor === "series"
          ? parseContentId(piece.contentId)?.series
          : piece.settings
            ? String(piece.settings[factor])
            : undefined;
      if (level === undefined) continue;
      const list = groups.get(level) ?? [];
      list.push(piece.metrics);
      groups.set(level, list);
    }
    const levels = [...groups.entries()]
      .map(([level, list]) => {
        const total = sumMetrics(list);
        return {
          level,
          pieces: list.length,
          visitors: total.visitors,
          challengeStarts: total.challengeStarts,
          purchases: total.purchases,
          netRevenueCents: total.netRevenueCents,
          startRate: wilson(Math.min(total.challengeStarts, total.visitors), total.visitors),
          purchaseRate: wilson(Math.min(total.purchases, total.visitors), total.visitors),
        };
      })
      .sort((a, b) => b.visitors - a.visitors);
    return { factor, levels };
  }).filter((summary) => summary.levels.length > 0);
}
