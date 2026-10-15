import type { ExperimentPlan, ExperimentRecord, Variant } from "./evaluate";
import { supportsHook, type MarketingExample } from "./examples";
import {
  factorSummaries,
  metricLabels,
  type MetricId,
  type PieceMetrics,
  type PieceRecord,
} from "./metrics";
import { buildTimeline } from "./script";
import {
  ENGINE_VERSION,
  SPEC_VERSION,
  ctas,
  experimentalFactors,
  factorLabels,
  factorLevels,
  levelKey,
  seriesForHook,
  type ContentSettings,
  type ContentSpec,
  type ExperimentalFactor,
} from "./spec";
import { minPiecesPerArm, seededRandom, seededShuffle } from "./stats";

/**
 * The next-generation planner.
 *
 * Deterministic and rules-based. It proposes at most one experiment at a
 * time per platform, because two concurrent tests on one audience confound
 * each other. Its job is to choose *what to learn next* and lay out a batch
 * that can actually answer it:
 *
 * 1. A supported result is replicated on fresh examples before it is adopted.
 * 2. Otherwise the highest-priority factor with an untested level is tested
 *    against the current baseline, everything else held constant.
 * 3. Lessons are matched across arms (one example per lesson per arm), arm
 *    assignment within each pair is a seeded coin flip, and publication order
 *    is randomised within pairs so neither arm owns the good days.
 * 4. The batch is sized so the pre-registered test can succeed at all
 *    (`minPiecesPerArm`), and the primary metric is chosen from what we can
 *    really measure: impressions-based only when impressions are being
 *    imported, purchases only for a factor that acts after the click.
 *
 * Observational data steers which level to try next; it is never presented
 * as a result. The operator's review is recorded and respected (a rejected
 * topic is not re-proposed for 30 days) but never counted as evidence.
 */

export const DEFAULT_BASELINE: ContentSettings = {
  hook: "challenge",
  lesson: "spr",
  durationSec: 25,
  countdownSec: 3,
  pacing: "measured",
  visual: "table",
  cta: "challenge",
  platform: "youtube-shorts",
  template: "short-v1",
};

export const DEFAULT_PLAN: Omit<ExperimentPlan, "piecesPerArm" | "minDenominatorPerArm"> = {
  alpha: 0.05,
  horizonDays: 7,
  deadlineDays: 42,
};

const REJECTION_COOLDOWN_DAYS = 30;
const DAY = 24 * 60 * 60 * 1000;

export type PlannerExperiment = ExperimentRecord & {
  variants: Variant[];
  learning: string | null;
};

export type PlannerPiece = {
  contentId: string;
  status: string;
  exampleId: string | null;
  settings: ContentSettings | null;
  publishedAt: string | null;
  platform: string | null;
  /** Lifetime-to-date metrics, for observational steering. */
  metrics: PieceMetrics;
};

export type PlannerReview = {
  topicKey: string;
  factor: string | null;
  status: "accepted" | "rejected" | "revised";
  reviewedAt: string;
  reason: string | null;
};

export type PlannerInput = {
  now: Date;
  experiments: PlannerExperiment[];
  pieces: PlannerPiece[];
  examples: MarketingExample[];
  reviews: PlannerReview[];
};

export type EvidenceStrength = "none" | "weak" | "moderate" | "strong";

export type ProposedExperiment = {
  kind: "exploration" | "replication";
  replicates: string | null;
  factors: ExperimentalFactor[];
  variants: Variant[];
  heldConstant: Partial<ContentSettings>;
  primaryMetric: MetricId;
  secondaryMetrics: MetricId[];
  guardrailMetrics: MetricId[];
  plan: ExperimentPlan;
  platform: string;
  hypothesis: string;
};

export type Recommendation = {
  kind: "experiment" | "needs-examples";
  topicKey: string;
  dedupeKey: string;
  engineVersion: string;
  title: string;
  summary: string;
  evidenceStrength: EvidenceStrength;
  evidenceNotes: string[];
  rationale: string[];
  experiment: ProposedExperiment;
  /** Ready-to-render specs, in publication order. Empty when blocked. */
  items: ContentSpec[];
  blockers: string[];
  /** The operator's earlier notes on this factor. Context, not evidence. */
  editorialNotes: string[];
};

export type PlannerOutput = {
  baseline: ContentSettings;
  recommendations: Recommendation[];
  /** One line per thing that is holding the planner back. */
  status: string[];
};

/** The baseline after adopting every replicated improvement, oldest first. */
export function currentBaseline(experiments: PlannerExperiment[]): ContentSettings {
  const baseline = { ...DEFAULT_BASELINE };
  const ordered = [...experiments].sort((a, b) => a.started_at.localeCompare(b.started_at));
  for (const experiment of ordered) {
    if (experiment.kind !== "replication" || experiment.decision !== "expand") continue;
    const treatment = experiment.variants.find((v) => v.key !== "control");
    if (treatment) Object.assign(baseline, treatment.settings);
  }
  return baseline;
}

type Candidate = {
  kind: "exploration" | "replication";
  replicates: string | null;
  factor: ExperimentalFactor;
  control: string | number;
  treatment: string | number;
};

function topicKeyOf(candidate: Candidate, platform: string): string {
  return `${candidate.kind}:${candidate.factor}:${candidate.control}->${candidate.treatment}:${platform}`;
}

function variantLevel(experiment: PlannerExperiment, key: string, factor: string) {
  const variant = experiment.variants.find((v) => v.key === key);
  return variant ? (variant.settings as Record<string, unknown>)[factor] : undefined;
}

function candidates(
  input: PlannerInput,
  baseline: ContentSettings,
  observational: ReturnType<typeof factorSummaries>,
): Candidate[] {
  const out: Candidate[] = [];

  // 1. Replicate supported improvements that have not been replicated yet.
  for (const experiment of input.experiments) {
    if (experiment.kind !== "exploration" || experiment.decision !== "expand") continue;
    if (input.experiments.some((other) => other.replicates === experiment.id)) continue;
    const factor = experiment.factors[0] as ExperimentalFactor;
    const control = variantLevel(experiment, "control", factor);
    const treatment = variantLevel(experiment, "treatment", factor);
    if (control === undefined || treatment === undefined) continue;
    out.push({
      kind: "replication",
      replicates: experiment.id,
      factor,
      control: control as string | number,
      treatment: treatment as string | number,
    });
  }

  // 2. Untested levels, highest-priority factor first.
  for (const factor of experimentalFactors) {
    const control = baseline[factor];
    const tested = new Set(
      input.experiments
        .filter(
          (e) =>
            e.factors.includes(factor) &&
            variantLevel(e, "control", factor) === control &&
            e.decision !== "insufficient_evidence",
        )
        .map((e) => levelKey(variantLevel(e, "treatment", factor) as string | number)),
    );
    const remaining = factorLevels[factor].filter(
      (level) => level !== control && !tested.has(levelKey(level)),
    );
    if (remaining.length === 0) continue;

    // Prefer the level whose observational start rate looks best, but only
    // when it has at least two pieces behind it; otherwise list order.
    const summary = observational.find((s) => s.factor === factor);
    const ranked = [...remaining].sort((a, b) => {
      const score = (level: string | number) => {
        const row = summary?.levels.find((l) => l.level === levelKey(level));
        return row && row.pieces >= 2 ? row.startRate.rate : -1;
      };
      return score(b) - score(a);
    });
    for (const treatment of ranked) {
      out.push({ kind: "exploration", replicates: null, factor, control, treatment });
    }
  }
  return out;
}

function chooseMetrics(
  factor: ExperimentalFactor,
  impressionsCoverage: number,
): { primary: MetricId; secondary: MetricId[]; guardrails: MetricId[]; note: string } {
  if (factor === "cta") {
    return {
      primary: "purchase_rate",
      secondary: ["net_revenue_per_visitor", "checkout_rate"],
      guardrails: ["refund_rate"],
      note: "The call to action acts after the click, so the test is judged on purchases per visitor. Challenge starts are not comparable across these arms: one sends viewers to the Challenge and the other does not.",
    };
  }
  const upstream: MetricId =
    impressionsCoverage >= 0.5 ? "visitors_per_1k_impressions" : "visitors";
  return {
    primary: upstream,
    secondary: ["challenge_start_rate", "purchase_rate", "net_revenue_per_visitor"],
    guardrails: ["challenge_completion_rate", "refund_rate"],
    note:
      upstream === "visitors_per_1k_impressions"
        ? `${factorLabels[factor]} acts before the click, so the primary metric is visitors per 1,000 impressions. Purchases are tracked as secondary: at current volumes there will be too few per arm to establish a conversion difference.`
        : `${factorLabels[factor]} acts before the click, but impressions are not being imported for this platform, so the primary metric falls back to visitors per piece. That mixes the setting's pull with how far the platform spread each piece; importing impressions would make this test sharper.`,
  };
}

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

function specFor(
  example: MarketingExample,
  settings: ContentSettings,
  variant: string,
): ContentSpec {
  return {
    specVersion: SPEC_VERSION,
    engineVersion: ENGINE_VERSION,
    contentId: null,
    series: seriesForHook[settings.hook],
    exampleId: example.id,
    settings: { ...settings, lesson: example.lesson },
    experimentId: null,
    variant,
    recommendationId: null,
    publishOrder: null,
  };
}

function eligible(example: MarketingExample, settings: ContentSettings): boolean {
  if (!supportsHook(example, settings.hook)) return false;
  if (!ctas[settings.cta].available) return false;
  return buildTimeline(specFor(example, settings, "check"), example).ok;
}

export function planNextBatch(input: PlannerInput): PlannerOutput {
  const baseline = currentBaseline(input.experiments);
  const platform = baseline.platform;
  const status: string[] = [];

  const running = input.experiments.filter((e) => e.status === "running" && (e.platform ?? platform) === platform);
  if (running.length > 0) {
    for (const experiment of running) {
      status.push(
        `${experiment.id} is running on ${platform}; no new experiment is proposed until it concludes. ${experiment.evidence === "collecting" ? "Still collecting." : ""}`.trim(),
      );
    }
    return { baseline, recommendations: [], status };
  }

  const records: PieceRecord[] = input.pieces
    .filter((p) => p.publishedAt !== null)
    .map((p) => ({ contentId: p.contentId, settings: p.settings, metrics: p.metrics }));
  const observational = factorSummaries(records);

  const onPlatform = input.pieces.filter((p) => p.publishedAt !== null && (p.platform ?? platform) === platform);
  const impressionsCoverage =
    onPlatform.length > 0 ? onPlatform.filter((p) => p.metrics.impressions !== null).length / onPlatform.length : 0;
  const visitorsPerPiece = median(onPlatform.map((p) => p.metrics.visitors));
  const totals = onPlatform.reduce(
    (acc, p) => ({ visitors: acc.visitors + p.metrics.visitors, purchases: acc.purchases + p.metrics.purchases }),
    { visitors: 0, purchases: 0 },
  );
  const purchasesPerVisitor = totals.visitors > 0 ? totals.purchases / totals.visitors : 0;

  const rejectedRecently = new Set(
    input.reviews
      .filter(
        (r) =>
          r.status === "rejected" &&
          input.now.getTime() - Date.parse(r.reviewedAt) < REJECTION_COOLDOWN_DAYS * DAY,
      )
      .map((r) => r.topicKey),
  );

  const usedExamples = new Set(input.pieces.map((p) => p.exampleId).filter((id): id is string => id !== null));
  const approved = input.examples.filter((e) => e.status === "approved");
  const unused = approved.filter((e) => !usedExamples.has(e.id));

  const piecesPerArm = minPiecesPerArm(DEFAULT_PLAN.alpha);
  let blocked: Recommendation | null = null;

  for (const candidate of candidates(input, baseline, observational)) {
    const topicKey = topicKeyOf(candidate, platform);
    if (rejectedRecently.has(topicKey)) {
      status.push(`Skipped ${topicKey}: rejected in review within ${REJECTION_COOLDOWN_DAYS} days.`);
      continue;
    }

    const { factor } = candidate;
    const armSettings = {
      control: { ...baseline, [factor]: candidate.control } as ContentSettings,
      treatment: { ...baseline, [factor]: candidate.treatment } as ContentSettings,
    };
    const heldConstant: Partial<ContentSettings> = { ...baseline };
    delete heldConstant[factor];
    delete heldConstant.lesson;

    // --- Matched example pairs -------------------------------------------
    const pairable = unused.filter(
      (e) => eligible(e, armSettings.control) && eligible(e, armSettings.treatment),
    );
    const byLesson = new Map<string, MarketingExample[]>();
    for (const example of [...pairable].sort((a, b) => a.id.localeCompare(b.id))) {
      const list = byLesson.get(example.lesson) ?? [];
      list.push(example);
      byLesson.set(example.lesson, list);
    }
    const lessons = [...byLesson.keys()].sort(
      (a, b) => (byLesson.get(b)?.length ?? 0) - (byLesson.get(a)?.length ?? 0) || a.localeCompare(b),
    );
    const pairs: [MarketingExample, MarketingExample][] = [];
    let progress = true;
    while (pairs.length < piecesPerArm && progress) {
      progress = false;
      for (const lesson of lessons) {
        const list = byLesson.get(lesson) ?? [];
        if (list.length >= 2 && pairs.length < piecesPerArm) {
          pairs.push([list.shift() as MarketingExample, list.shift() as MarketingExample]);
          progress = true;
        }
      }
    }

    const metrics = chooseMetrics(factor, impressionsCoverage);
    const minDenominatorPerArm =
      metrics.primary === "purchase_rate" ? 200 : metrics.primary === "visitors" ? 0 : 100;
    const plan: ExperimentPlan = { ...DEFAULT_PLAN, piecesPerArm, minDenominatorPerArm };
    const levelName = (level: string | number) =>
      factor === "durationSec" || factor === "countdownSec" ? `${level}s` : String(level);
    const hypothesis = `Changing ${factorLabels[factor].toLowerCase()} from ${levelName(candidate.control)} to ${levelName(candidate.treatment)}, with lessons matched across arms and every other setting held constant on ${platform}, changes ${metricLabels[metrics.primary].toLowerCase()}.`;

    const experiment: ProposedExperiment = {
      kind: candidate.kind,
      replicates: candidate.replicates,
      factors: [factor],
      variants: [
        { key: "control", settings: { [factor]: candidate.control } as Partial<ContentSettings> },
        { key: "treatment", settings: { [factor]: candidate.treatment } as Partial<ContentSettings> },
      ],
      heldConstant,
      primaryMetric: metrics.primary,
      secondaryMetrics: metrics.secondary,
      guardrailMetrics: metrics.guardrails,
      plan,
      platform,
      hypothesis,
    };

    // --- Evidence behind the choice -------------------------------------
    const summary = observational.find((s) => s.factor === factor);
    const evidenceNotes: string[] = [];
    let evidenceStrength: EvidenceStrength = "none";
    if (candidate.kind === "replication") {
      evidenceStrength = "moderate";
      const original = input.experiments.find((e) => e.id === candidate.replicates);
      evidenceNotes.push(
        `${candidate.replicates} found a difference at its pre-registered threshold. One test is not enough to change the baseline; this replication uses fresh examples.`,
      );
      if (original?.learning) evidenceNotes.push(original.learning);
    } else if (summary && summary.levels.filter((l) => l.pieces >= 3).length >= 2) {
      evidenceStrength = "weak";
    }
    for (const level of summary?.levels ?? []) {
      evidenceNotes.push(
        `Observational, ${level.level}: ${level.pieces} piece(s), ${level.visitors} visitors, challenge start rate ${(level.startRate.rate * 100).toFixed(1)}% (${(level.startRate.low * 100).toFixed(1)}–${(level.startRate.high * 100).toFixed(1)}%), ${level.purchases} purchase(s).`,
      );
    }
    if (summary) {
      evidenceNotes.push(
        "These levels were not randomised: the comparison mixes the setting with publish date, example and distribution, and pooled intervals understate the uncertainty.",
      );
      const purchases = summary.levels.reduce((s, l) => s + l.purchases, 0);
      if (purchases < 20) {
        evidenceNotes.push(`${purchases} attributed purchase(s) across these levels: far too few to compare conversion.`);
      }
    } else {
      evidenceNotes.push(`No published pieces carry a ${factorLabels[factor].toLowerCase()} setting yet; this batch is information-gathering.`);
    }
    const expectedPurchasesPerArm = visitorsPerPiece * piecesPerArm * purchasesPerVisitor;
    if (metrics.primary === "purchase_rate" && expectedPurchasesPerArm < 10) {
      evidenceNotes.push(
        `Power warning: at the median ${visitorsPerPiece} visitors per piece and ${(purchasesPerVisitor * 100).toFixed(2)}% purchase rate, expect about ${expectedPurchasesPerArm.toFixed(1)} purchases per arm. A difference would need to be very large to show.`,
      );
    }

    const rationale = [
      candidate.kind === "replication"
        ? `Replicates ${candidate.replicates}: ${levelName(candidate.treatment)} against ${levelName(candidate.control)}, on examples not used before.`
        : `${factorLabels[factor]} is the highest-priority setting with an untested level against the current baseline (${levelName(candidate.control)}).`,
      `Varies only ${factorLabels[factor].toLowerCase()}. Held constant: ${Object.entries(heldConstant).map(([k, v]) => `${k}=${v}`).join(", ")}.`,
      `Lessons are matched: each pair is two different approved examples on the same lesson, one per arm, assigned by a seeded coin flip.`,
      `${piecesPerArm} pieces per arm is the smallest batch for which the per-piece permutation test can reach alpha ${plan.alpha} at all.`,
      `Publish one piece per day, in the listed order, on ${platform} only. Each piece is judged on its first ${plan.horizonDays} days; the decision waits until every piece has had them.`,
      metrics.note,
    ];

    const editorialNotes = input.reviews
      .filter((r) => r.factor === factor && r.reason)
      .map((r) => `${r.status} ${r.reviewedAt.slice(0, 10)}: ${r.reason}`);

    if (pairs.length < piecesPerArm) {
      const missingPairs = piecesPerArm - pairs.length;
      const hooks = [...new Set([armSettings.control.hook, armSettings.treatment.hook])];
      const blockers = [
        `Needs ${missingPairs * 2} more approved, unused examples (${missingPairs} lesson pair(s)) before this test can run: two per lesson, each supporting the ${hooks.join(" and ")} hook(s) and readable in ${armSettings.treatment.durationSec}s at ${baseline.pacing} pacing.`,
        `Approved examples: ${approved.length}. Unused: ${unused.length}. Usable for this test: ${pairable.length}. Candidates awaiting review: ${input.examples.filter((e) => e.status === "candidate").length}.`,
      ];
      blocked ??= {
            kind: "needs-examples",
            topicKey,
            dedupeKey: `${topicKey}:needs:${pairable.map((e) => e.id).sort().join(",")}`,
            engineVersion: ENGINE_VERSION,
            title: `Approve examples to test ${factorLabels[factor].toLowerCase()}: ${levelName(candidate.treatment)} vs ${levelName(candidate.control)}`,
            summary: `The next test is ${factorLabels[factor].toLowerCase()} (${levelName(candidate.treatment)} against ${levelName(candidate.control)}), but there are not enough approved, unused examples to run it as a matched batch. ${blockers[0]}`,
            evidenceStrength,
            evidenceNotes,
            rationale,
            experiment,
            items: [],
            blockers,
            editorialNotes,
          };
      continue;
    }

    // --- Lay out the batch ------------------------------------------------
    const seed = `${topicKey}:${pairs.flat().map((e) => e.id).join(",")}`;
    const coin = seededRandom(seed);
    const orderedPairs = seededShuffle(pairs, `${seed}:order`);
    const items: ContentSpec[] = [];
    for (const [first, second] of orderedPairs) {
      const flip = coin() < 0.5;
      const controlExample = flip ? first : second;
      const treatmentExample = flip ? second : first;
      const pair = [
        specFor(controlExample, armSettings.control, "control"),
        specFor(treatmentExample, armSettings.treatment, "treatment"),
      ];
      items.push(...(coin() < 0.5 ? pair : pair.reverse()));
    }
    items.forEach((item, i) => {
      item.publishOrder = i + 1;
    });

    const lessonsUsed = [...new Set(pairs.map(([e]) => e.lesson))];
    return {
      baseline,
      status,
      recommendations: [
        {
          kind: "experiment",
          topicKey,
          dedupeKey: `${topicKey}:${pairs.flat().map((e) => e.id).sort().join(",")}`,
          engineVersion: ENGINE_VERSION,
          title: `${candidate.kind === "replication" ? "Replicate" : "Test"} ${factorLabels[factor].toLowerCase()}: ${levelName(candidate.treatment)} vs ${levelName(candidate.control)} (${items.length} Shorts)`,
          summary: `Generate ${piecesPerArm} ${levelName(candidate.treatment)} and ${piecesPerArm} ${levelName(candidate.control)} ${factorLabels[factor].toLowerCase()} Shorts on matched lessons (${lessonsUsed.join(", ")}), everything else identical. Judged on ${metricLabels[metrics.primary].toLowerCase()} per piece after ${plan.horizonDays} days each.`,
          evidenceStrength,
          evidenceNotes,
          rationale,
          experiment,
          items,
          blockers: [],
          editorialNotes,
        },
        // A higher-priority test that could not run is still worth surfacing:
        // it says which examples to approve next.
        ...(blocked ? [blocked] : []),
      ],
    };
  }

  if (blocked) return { baseline, status, recommendations: [blocked] };
  status.push("Every experimental setting has been tested against the current baseline. Add levels or examples to continue.");
  return { baseline, recommendations: [], status };
}
