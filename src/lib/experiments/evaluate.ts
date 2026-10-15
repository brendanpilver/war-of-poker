import {
  metricLabels,
  metricRatio,
  metricValue,
  needsImpressions,
  sumMetrics,
  type MetricId,
  type PieceMetrics,
} from "./metrics";
import type { ContentSettings } from "./spec";
import { differenceInterval, permutationTest, wilson } from "./stats";

/**
 * Experiment evaluation: a fixed-horizon test, pre-registered at acceptance.
 *
 * Nothing is declared until every planned piece is published and has been
 * live for the plan's horizon. Looking earlier and stopping on a good-looking
 * interim number is how small tests manufacture winners, so interim numbers
 * are reported as description and the decision stays `continue`.
 *
 * Each piece's metrics cover the same span -- its first `horizonDays` after
 * publication -- so an older piece is not favoured for having had longer.
 */

export type ExperimentPlan = {
  alpha: number;
  piecesPerArm: number;
  horizonDays: number;
  /** Minimum pooled denominator per arm for a rate metric. */
  minDenominatorPerArm: number;
  /** Days after start at which an unfinished test is closed as inconclusive. */
  deadlineDays: number;
  /**
   * The smallest relative difference in the primary metric worth acting on,
   * fixed before the test. A non-significant result at least this large is
   * inconclusive -- re-test -- rather than evidence of no difference.
   */
  minimumEffect?: number;
};

export const DEFAULT_MINIMUM_EFFECT = 0.2;

export type Variant = { key: string; settings: Partial<ContentSettings> };

export type ExperimentRecord = {
  id: string;
  status: "running" | "concluded" | "abandoned";
  kind: "exploration" | "replication";
  replicates: string | null;
  factors: string[];
  variants: Variant[];
  held_constant: Partial<ContentSettings>;
  primary_metric: MetricId;
  secondary_metrics: MetricId[];
  guardrail_metrics: MetricId[];
  plan: ExperimentPlan;
  platform: string | null;
  started_at: string;
  decision: Decision | null;
  evidence: Evidence | null;
};

export type ExperimentPiece = {
  contentId: string;
  variant: string | null;
  status: string;
  publishedAt: string | null;
  platform: string | null;
  settings: ContentSettings | null;
  /** Metrics over the piece's first `horizonDays`, or null if unpublished. */
  metrics: PieceMetrics | null;
};

export type Evidence = "collecting" | "insufficient" | "no-detectable-difference" | "supported";
export type Decision = "continue" | "expand" | "revise" | "stop" | "insufficient_evidence";

export type ArmResult = {
  key: string;
  planned: number;
  published: number;
  matured: number;
  pieces: { contentId: string; publishedAt: string | null; matured: boolean; value: number | null }[];
  pooled: PieceMetrics;
  /** Mean of per-piece primary values, over matured pieces with a value. */
  primaryMean: number | null;
  /** Pooled rates with Wilson intervals, for description only. */
  pooledRates: { metric: MetricId; rate: number; low: number; high: number; n: number }[];
};

export type Comparison = {
  treatment: string;
  metric: MetricId;
  diff: number;
  pValue: number;
  exact: boolean;
  relabellings: number;
  alpha: number;
  significant: boolean;
  treatmentBetter: boolean;
};

export type GuardrailCheck = {
  metric: MetricId;
  treatment: string;
  diff: number;
  low: number;
  high: number;
  breached: boolean;
};

export type ExperimentResults = {
  evaluatedAt: string;
  arms: ArmResult[];
  ready: boolean;
  readinessNotes: string[];
  comparisons: Comparison[];
  guardrails: GuardrailCheck[];
  confounders: string[];
  evidence: Evidence;
  decision: Decision;
  decisionReason: string;
  learning: string | null;
};

const DAY = 24 * 60 * 60 * 1000;

/** Metrics where a lower value is the better outcome. */
const LOWER_IS_BETTER = new Set<MetricId>(["refund_rate"]);

/** A guardrail is only judged once each arm has this many in its denominator. */
const MIN_GUARDRAIL_N = 30;

export const STANDING_CONFOUNDER =
  "Organic distribution: each platform chose who saw each piece, so arms were not shown to randomised audiences. Publication order was randomised within pairs; the test compares pieces and supports claims about these pieces under these conditions, not about every viewer.";

export function evaluateExperiment(
  experiment: ExperimentRecord,
  pieces: ExperimentPiece[],
  now: Date,
): ExperimentResults {
  const { plan } = experiment;
  const primary = experiment.primary_metric;
  const matured = (piece: ExperimentPiece) =>
    piece.publishedAt !== null && Date.parse(piece.publishedAt) + plan.horizonDays * DAY <= now.getTime();

  const reportedMetrics: MetricId[] = [
    primary,
    ...experiment.secondary_metrics,
    ...experiment.guardrail_metrics,
  ].filter((m, i, all) => all.indexOf(m) === i);

  const arms: ArmResult[] = experiment.variants.map((variant) => {
    const mine = pieces.filter((piece) => piece.variant === variant.key);
    // A post scheduled for later is not yet published.
    const published = mine.filter(
      (piece) => piece.publishedAt !== null && piece.status === "published" && Date.parse(piece.publishedAt) <= now.getTime(),
    );
    const ripe = published.filter(matured);
    const values = ripe
      .map((piece) => (piece.metrics ? metricValue(primary, piece.metrics) : null))
      .filter((v): v is number => v !== null);
    const pooled = sumMetrics(ripe.map((piece) => piece.metrics).filter((m): m is PieceMetrics => m !== null));
    return {
      key: variant.key,
      planned: Math.max(plan.piecesPerArm, mine.length),
      published: published.length,
      matured: ripe.length,
      pieces: mine.map((piece) => ({
        contentId: piece.contentId,
        publishedAt: piece.publishedAt,
        matured: matured(piece),
        value: piece.metrics ? metricValue(primary, piece.metrics) : null,
      })),
      pooled,
      primaryMean: values.length > 0 ? values.reduce((s, v) => s + v, 0) / values.length : null,
      pooledRates: reportedMetrics.flatMap((metric) => {
        const ratio = metricRatio(metric, pooled);
        if (!ratio) return [];
        const interval = wilson(Math.min(ratio[0], ratio[1]), ratio[1]);
        return [{ metric, rate: interval.rate, low: interval.low, high: interval.high, n: ratio[1] }];
      }),
    };
  });

  // --- Readiness -----------------------------------------------------------
  const readinessNotes: string[] = [];
  for (const arm of arms) {
    if (arm.matured < plan.piecesPerArm) {
      readinessNotes.push(
        `${arm.key}: ${arm.matured} of ${plan.piecesPerArm} pieces have completed the ${plan.horizonDays}-day horizon (${arm.published} published).`,
      );
    }
    const usable = arm.pieces.filter((p) => p.matured && p.value !== null).length;
    if (arm.matured >= plan.piecesPerArm && usable < plan.piecesPerArm) {
      readinessNotes.push(
        needsImpressions(primary)
          ? `${arm.key}: ${arm.matured - usable} matured piece(s) have no imported impressions.`
          : `${arm.key}: ${arm.matured - usable} matured piece(s) have no ${metricLabels[primary].toLowerCase()} denominator.`,
      );
    }
    const ratio = metricRatio(primary, arm.pooled);
    if (ratio && arm.matured >= plan.piecesPerArm && ratio[1] < plan.minDenominatorPerArm) {
      readinessNotes.push(
        `${arm.key}: pooled denominator ${ratio[1]} is below the planned ${plan.minDenominatorPerArm}.`,
      );
    }
  }
  const ready = readinessNotes.length === 0 && arms.length >= 2;

  // --- Confounders ---------------------------------------------------------
  const confounders = [STANDING_CONFOUNDER, ...detectConfounders(experiment, pieces)];

  // --- Comparisons (only when ready) ----------------------------------------
  const control = arms[0];
  const treatments = arms.slice(1);
  const alpha = plan.alpha / Math.max(1, treatments.length);
  const comparisons: Comparison[] = ready
    ? treatments.map((arm) => {
        const values = (a: ArmResult) =>
          a.pieces.filter((p) => p.matured && p.value !== null).map((p) => p.value as number);
        const test = permutationTest(values(control), values(arm), `${experiment.id}:${arm.key}`);
        const better = LOWER_IS_BETTER.has(primary) ? test.diff < 0 : test.diff > 0;
        return {
          treatment: arm.key,
          metric: primary,
          diff: test.diff,
          pValue: test.pValue,
          exact: test.exact,
          relabellings: test.relabellings,
          alpha,
          significant: test.pValue <= alpha,
          treatmentBetter: better,
        };
      })
    : [];

  const guardrails: GuardrailCheck[] = ready
    ? treatments.flatMap((arm) =>
        experiment.guardrail_metrics.flatMap((metric) => {
          const c = metricRatio(metric, control.pooled);
          const t = metricRatio(metric, arm.pooled);
          if (!c || !t || c[1] < MIN_GUARDRAIL_N || t[1] < MIN_GUARDRAIL_N) return [];
          const interval = differenceInterval(Math.min(c[0], c[1]), c[1], Math.min(t[0], t[1]), t[1]);
          const breached = LOWER_IS_BETTER.has(metric) ? interval.low > 0 : interval.high < 0;
          return [{ metric, treatment: arm.key, ...interval, breached }];
        }),
      )
    : [];

  // --- Decision ------------------------------------------------------------
  const pastDeadline = now.getTime() > Date.parse(experiment.started_at) + plan.deadlineDays * DAY;
  let evidence: Evidence;
  let decision: Decision;
  let decisionReason: string;
  let learning: string | null = null;
  const factorName = experiment.factors.join(" × ");
  const level = (key: string) =>
    describeVariant(experiment.variants.find((v) => v.key === key) ?? { key, settings: {} });

  if (!ready) {
    if (pastDeadline) {
      evidence = "insufficient";
      decision = "insufficient_evidence";
      decisionReason = `Deadline of ${plan.deadlineDays} days passed before the plan's sample was reached. ${readinessNotes.join(" ")}`;
      learning = `No conclusion on ${factorName}: the test did not reach its planned sample. Interim numbers are not evidence.`;
    } else {
      evidence = "collecting";
      decision = "continue";
      decisionReason = readinessNotes.join(" ") || "Waiting for pieces.";
    }
  } else if (guardrails.some((g) => g.breached)) {
    const breached = guardrails.filter((g) => g.breached).map((g) => metricLabels[g.metric]);
    evidence = comparisons.some((c) => c.significant) ? "supported" : "no-detectable-difference";
    decision = "revise";
    decisionReason = `Guardrail breached: ${breached.join(", ")} fell in the treatment arm.`;
    learning = `${level(treatments[0].key)} hurt ${breached.join(", ")} relative to ${level(control.key)}; revise before re-testing.`;
  } else {
    const winner = comparisons.find((c) => c.significant);
    if (winner) {
      evidence = "supported";
      decision = winner.treatmentBetter ? "expand" : "stop";
      decisionReason = `Permutation test on ${metricLabels[primary].toLowerCase()} per piece: p = ${winner.pValue.toFixed(3)} (alpha ${winner.alpha}). ${winner.treatmentBetter ? "Treatment" : "Control"} was higher on this sample.`;
      learning = winner.treatmentBetter
        ? `${level(winner.treatment)} outperformed ${level(control.key)} on ${metricLabels[primary].toLowerCase()} in ${experiment.kind === "replication" ? "a replication" : "one test"}. ${experiment.kind === "replication" ? "Replicated: adopt as the baseline." : "Replicate on fresh examples before adopting it."}`
        : `${level(control.key)} outperformed ${level(winner.treatment)} on ${metricLabels[primary].toLowerCase()}. Keep the baseline.`;
    } else if (inconclusive(arms, comparisons, plan.minimumEffect ?? DEFAULT_MINIMUM_EFFECT)) {
      const best = comparisons[0];
      const control = arms[0].primaryMean ?? 0;
      const treatment = arms.find((a) => a.key === best.treatment)?.primaryMean ?? 0;
      const relative = control > 0 ? ((treatment - control) / control) * 100 : null;
      evidence = "insufficient";
      decision = "insufficient_evidence";
      decisionReason = `Permutation test on ${metricLabels[primary].toLowerCase()} per piece: p = ${best.pValue.toFixed(3)}, above alpha ${alpha}. The observed difference (${relative === null ? "from a zero baseline" : `${relative > 0 ? "+" : ""}${relative.toFixed(0)}%`} for ${best.treatment}) is at least the pre-registered minimum effect of ${((plan.minimumEffect ?? DEFAULT_MINIMUM_EFFECT) * 100).toFixed(0)}%, but this sample cannot tell it from chance.`;
      learning = `Inconclusive: no winner declared between ${experiment.variants.map((v) => level(v.key)).join(" and ")}. The difference is large enough to matter if real, so re-test the same comparison on fresh examples.`;
    } else {
      evidence = "no-detectable-difference";
      decision = "stop";
      const best = comparisons[0];
      decisionReason = `Permutation test on ${metricLabels[primary].toLowerCase()} per piece: p = ${best ? best.pValue.toFixed(3) : "n/a"}, above alpha ${alpha}.`;
      learning = `No difference between ${experiment.variants.map((v) => level(v.key)).join(" and ")} large enough for ${plan.piecesPerArm} pieces per arm to detect. This is not evidence that they are equal; keep the baseline and spend the next test elsewhere.`;
    }
  }

  return {
    evaluatedAt: now.toISOString(),
    arms,
    ready,
    readinessNotes,
    comparisons,
    guardrails,
    confounders,
    evidence,
    decision,
    decisionReason,
    learning,
  };
}

/**
 * A non-significant comparison whose observed relative difference is at
 * least the minimum effect: worth more data, not a verdict either way.
 */
function inconclusive(arms: ArmResult[], comparisons: Comparison[], minimumEffect: number): boolean {
  const control = arms[0]?.primaryMean;
  return comparisons.some((c) => {
    const treatment = arms.find((a) => a.key === c.treatment)?.primaryMean;
    if (control === null || control === undefined || treatment === null || treatment === undefined) return false;
    if (control === 0) return treatment !== 0;
    return Math.abs(treatment - control) / Math.abs(control) >= minimumEffect;
  });
}

export function describeVariant(variant: Variant): string {
  const parts = Object.entries(variant.settings).map(([k, v]) => `${k}=${v}`);
  return parts.length > 0 ? `${variant.key} (${parts.join(", ")})` : variant.key;
}

function detectConfounders(experiment: ExperimentRecord, pieces: ExperimentPiece[]): string[] {
  const notes: string[] = [];
  const published = pieces.filter((p) => p.publishedAt !== null);

  const platforms = new Set(published.map((p) => p.platform ?? "unknown"));
  if (platforms.size > 1) {
    notes.push(`Pieces were published on more than one platform (${[...platforms].join(", ")}).`);
  }

  for (const piece of pieces) {
    if (!piece.settings) continue;
    for (const [key, value] of Object.entries(experiment.held_constant)) {
      if (piece.settings[key as keyof ContentSettings] !== value) {
        notes.push(`${piece.contentId}: held-constant ${key} is ${piece.settings[key as keyof ContentSettings]}, planned ${value}.`);
      }
    }
    const variant = experiment.variants.find((v) => v.key === piece.variant);
    for (const [key, value] of Object.entries(variant?.settings ?? {})) {
      if (piece.settings[key as keyof ContentSettings] !== value) {
        notes.push(`${piece.contentId}: ${key} is ${piece.settings[key as keyof ContentSettings]}, but its arm specifies ${value}.`);
      }
    }
  }

  const meanTime = (key: string) => {
    const times = published.filter((p) => p.variant === key).map((p) => Date.parse(p.publishedAt as string));
    return times.length > 0 ? times.reduce((s, t) => s + t, 0) / times.length : null;
  };
  const [first, ...rest] = experiment.variants.map((v) => meanTime(v.key));
  for (const other of rest) {
    if (first !== null && other !== null && Math.abs(first - other) > 2 * DAY) {
      notes.push("Arms were published at different times on average (more than two days apart); a trend in reach over time could masquerade as an effect.");
      break;
    }
  }
  return notes;
}
