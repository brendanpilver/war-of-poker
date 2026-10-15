import type { EmailContent } from "@/lib/email/templates";
import { formatPrice } from "@/lib/offers";
import { siteUrl } from "@/lib/site";
import type { ExperimentResults } from "./evaluate";
import { metricLabels, type FunnelMetrics, type FunnelStep, type MetricId, type PeriodChange } from "./metrics";

/**
 * The operator's daily and weekly reports, sent through the existing Resend
 * client and rendered by the existing email renderer.
 *
 * Plain statements of what the data shows, with its uncertainty attached.
 * The weekly review is organised around five fixed questions so successive
 * weeks read as one PDCA record.
 */

export type ReportExperiment = {
  id: string;
  status: string;
  hypothesis: string;
  primaryMetric: MetricId;
  startedAt: string;
  endedAt: string | null;
  results: ExperimentResults | null;
};

export type ReportRecommendation = {
  title: string;
  summary: string;
  evidenceStrength: string;
  blockers: string[];
};

export type ReportContext = {
  now: Date;
  day: FunnelMetrics;
  week: FunnelMetrics;
  bottleneck: FunnelStep | null;
  changes: PeriodChange[];
  experiments: ReportExperiment[];
  proposals: ReportRecommendation[];
  plannerStatus: string[];
  dataWarnings: string[];
  failedRunsLastDay: number;
};

const pct = (x: number) => `${(x * 100).toFixed(1)}%`;

function funnelLine(m: FunnelMetrics): string {
  return `${m.visitors} visitors → ${m.challengeStarts} challenge starts → ${m.challengeCompletions} completions → ${m.checkoutStarts} checkouts → ${m.purchases} purchases (${m.refunds} refunded), ${formatPrice(m.netRevenueCents)} net`;
}

function experimentLine(e: ReportExperiment): string {
  const r = e.results;
  if (!r) return `${e.id}: no results yet.`;
  const arms = r.arms
    .map((arm) => `${arm.key} ${arm.matured}/${arm.planned} matured${arm.primaryMean !== null ? `, mean ${arm.primaryMean.toFixed(3)}` : ""}`)
    .join("; ");
  return `${e.id} [${r.evidence}, ${r.decision}]: ${arms}. ${r.decisionReason}`;
}

const dashboard = `${siteUrl}/growth/experiments`;

export function buildDailyReport(ctx: ReportContext): EmailContent {
  const notable = ctx.changes.filter((c) => c.notable);
  return {
    subject: `War of Poker daily · ${ctx.now.toISOString().slice(0, 10)} · ${ctx.day.purchases} purchase(s), ${formatPrice(ctx.day.netRevenueCents)} net`,
    blocks: [
      { kind: "h", text: "Last 24 hours" },
      { kind: "p", text: funnelLine(ctx.day) },
      { kind: "h", text: "Last 7 days" },
      { kind: "p", text: funnelLine(ctx.week) },
      {
        kind: "p",
        text: ctx.bottleneck
          ? `Largest drop-off: ${ctx.bottleneck.from} → ${ctx.bottleneck.to}, ${pct(ctx.bottleneck.rate)} advance (${pct(ctx.bottleneck.low)}–${pct(ctx.bottleneck.high)}). No external benchmark: this is where the leak is largest, not proof it is abnormal.`
          : "Too little traffic to name a bottleneck.",
      },
      ...(notable.length > 0
        ? [
            { kind: "h" as const, text: "Changes worth a look (99% interval excludes zero)" },
            {
              kind: "list" as const,
              items: notable.map((c) => `${c.metric}: ${pct(c.previous.rate)} → ${pct(c.current.rate)} (n ${c.previous.n} → ${c.current.n})`),
            },
          ]
        : []),
      { kind: "h", text: "Experiments" },
      {
        kind: "list",
        items:
          ctx.experiments.filter((e) => e.status === "running").map(experimentLine).concat(ctx.plannerStatus).slice(0, 8)
            .concat(ctx.experiments.some((e) => e.status === "running") ? [] : ["No experiment running."]),
      },
      {
        kind: "p",
        text:
          ctx.proposals.length > 0
            ? `${ctx.proposals.length} proposal(s) awaiting review.`
            : "No proposals awaiting review.",
      },
      ...(ctx.failedRunsLastDay > 0 || ctx.dataWarnings.length > 0
        ? [{ kind: "list" as const, items: [...(ctx.failedRunsLastDay > 0 ? [`${ctx.failedRunsLastDay} failed analytics run(s) in the last day.`] : []), ...ctx.dataWarnings] }]
        : []),
    ],
    cta: { label: "Open the experiment dashboard", href: dashboard },
  };
}

export function buildWeeklyReport(ctx: ReportContext): EmailContent {
  const weekAgo = ctx.now.getTime() - 7 * 24 * 60 * 60 * 1000;
  const relevant = ctx.experiments.filter(
    (e) => e.status === "running" || (e.endedAt !== null && Date.parse(e.endedAt) >= weekAgo),
  );
  const concluded = relevant.filter((e) => e.status === "concluded");

  const tested =
    relevant.length > 0
      ? relevant.map((e) => `${e.id} (${e.status}): ${e.hypothesis} Primary metric: ${metricLabels[e.primaryMetric].toLowerCase()}.`)
      : ["No experiment was running this week."];

  const happened = [
    `Site, last 7 days: ${funnelLine(ctx.week)}.`,
    ...relevant.map(experimentLine),
    ...ctx.changes.map(
      (c) => `${c.metric}: ${pct(c.previous.rate)} the week before → ${pct(c.current.rate)} (difference ${pct(c.diff)}, 99% interval ${pct(c.low)} to ${pct(c.high)})${c.notable ? " — notable" : ""}.`,
    ),
  ];

  const supported =
    concluded.length > 0
      ? concluded.map((e) => `${e.id}: ${e.results?.learning ?? e.results?.decisionReason ?? "no learning recorded"}`)
      : [
          "No experiment reached its pre-registered evaluation this week, so no result is supported yet. Interim numbers above are description, not evidence.",
        ];

  const uncertain = [
    ...new Set(
      relevant.flatMap((e) => [
        ...(e.results?.readinessNotes ?? []),
        ...(e.results?.confounders ?? []),
      ]),
    ),
    ...ctx.dataWarnings,
  ];
  if (ctx.week.purchases < 20) {
    uncertain.push(`${ctx.week.purchases} purchase(s) this week: too few to compare conversion between any two groups of content.`);
  }

  const next =
    ctx.proposals.length > 0
      ? ctx.proposals.map((p) => `${p.title} [evidence: ${p.evidenceStrength}]. ${p.summary}${p.blockers.length > 0 ? ` Blocked: ${p.blockers[0]}` : ""}`)
      : ctx.plannerStatus.length > 0
        ? ctx.plannerStatus
        : ["No proposal this week."];

  return {
    subject: `War of Poker weekly review · ${ctx.now.toISOString().slice(0, 10)}`,
    blocks: [
      { kind: "h", text: "1. What did we test?" },
      { kind: "list", items: tested },
      { kind: "h", text: "2. What happened?" },
      { kind: "list", items: happened },
      { kind: "h", text: "3. What do the results actually support?" },
      { kind: "list", items: supported },
      { kind: "h", text: "4. What remains uncertain?" },
      { kind: "list", items: uncertain.length > 0 ? uncertain : ["Nothing beyond the standing limits of organic distribution."] },
      { kind: "h", text: "5. What should we test next?" },
      { kind: "list", items: next },
    ],
    cta: { label: "Review proposals", href: dashboard },
  };
}
