import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  evaluateExperiment,
  type ExperimentPiece,
  type ExperimentRecord,
} from "../src/lib/experiments/evaluate";
import { exampleById, type MarketingExample } from "../src/lib/experiments/examples";
import { emptyFunnel, withImport, type PieceMetrics } from "../src/lib/experiments/metrics";
import {
  DEFAULT_BASELINE,
  currentBaseline,
  planNextBatch,
  type PlannerExperiment,
  type PlannerInput,
} from "../src/lib/experiments/planner";
import { validateAcceptance } from "../src/lib/experiments/review";
import type { LessonId } from "../src/lib/experiments/spec";

const DAY = 24 * 60 * 60 * 1000;
const now = new Date("2026-11-30T00:00:00Z");
const daysAgo = (n: number) => new Date(now.getTime() - n * DAY).toISOString();

function metrics(visitors: number, starts = 0, purchases = 0, completions = starts): PieceMetrics {
  return withImport({ ...emptyFunnel(), visitors, challengeStarts: starts, challengeCompletions: completions, purchases }, null);
}

const experiment: ExperimentRecord = {
  id: "EXP-001",
  status: "running",
  kind: "exploration",
  replicates: null,
  factors: ["hook"],
  variants: [
    { key: "control", settings: { hook: "challenge" } },
    { key: "treatment", settings: { hook: "financial-consequence" } },
  ],
  held_constant: { durationSec: 25 },
  primary_metric: "visitors",
  secondary_metrics: ["challenge_start_rate"],
  guardrail_metrics: ["challenge_completion_rate"],
  plan: { alpha: 0.05, piecesPerArm: 4, horizonDays: 7, minDenominatorPerArm: 0, deadlineDays: 42 },
  platform: "youtube-shorts",
  started_at: daysAgo(30),
  decision: null,
  evidence: null,
};

function piece(i: number, variant: string, m: PieceMetrics | null, published: string | null = daysAgo(20 - i)): ExperimentPiece {
  return {
    contentId: `${variant === "control" ? "PRC" : "EPM"}-00${i}`,
    variant,
    status: published ? "published" : "draft",
    publishedAt: published,
    platform: "youtube-shorts",
    settings: { ...DEFAULT_BASELINE, hook: variant === "control" ? "challenge" : "financial-consequence" },
    metrics: m,
  };
}

describe("experiment evaluation", () => {
  it("keeps collecting until every planned piece has had its horizon", () => {
    const pieces = [
      ...[1, 2, 3, 4].map((i) => piece(i, "control", metrics(10))),
      ...[1, 2, 3].map((i) => piece(i + 4, "treatment", metrics(90))),
      piece(8, "treatment", metrics(90), daysAgo(2)),
    ];
    const result = evaluateExperiment(experiment, pieces, now);
    assert.equal(result.ready, false);
    assert.equal(result.decision, "continue");
    assert.equal(result.evidence, "collecting");
    assert.equal(result.comparisons.length, 0, "no test before the horizon");
  });

  it("expands a clear, complete win, and asks for replication first", () => {
    const pieces = [
      ...[1, 2, 3, 4].map((i) => piece(i, "control", metrics(10 + i, 2, 0, 1))),
      ...[1, 2, 3, 4].map((i) => piece(i + 4, "treatment", metrics(80 + i, 8, 0, 4))),
    ];
    const result = evaluateExperiment(experiment, pieces, now);
    assert.equal(result.ready, true);
    assert.equal(result.evidence, "supported");
    assert.equal(result.decision, "expand");
    assert.ok(Math.abs(result.comparisons[0].pValue - 2 / 70) < 1e-9);
    assert.match(result.learning ?? "", /Replicate/);
  });

  it("stops with no detectable difference, and says that is not equality", () => {
    const pieces = [
      ...[1, 2, 3, 4].map((i) => piece(i, "control", metrics([10, 40, 20, 30][i - 1]))),
      ...[1, 2, 3, 4].map((i) => piece(i + 4, "treatment", metrics([35, 15, 25, 12][i - 1]))),
    ];
    const result = evaluateExperiment(experiment, pieces, now);
    assert.equal(result.evidence, "no-detectable-difference");
    assert.equal(result.decision, "stop");
    assert.match(result.learning ?? "", /not evidence that they are equal/);
  });

  it("closes as insufficient evidence after the deadline", () => {
    const late = { ...experiment, started_at: daysAgo(60) };
    const result = evaluateExperiment(late, [piece(1, "control", metrics(5))], now);
    assert.equal(result.decision, "insufficient_evidence");
  });

  it("flags a piece published on another platform and a drifted held-constant setting", () => {
    const pieces = [1, 2, 3, 4].map((i) => piece(i, "control", metrics(10)));
    pieces[0] = { ...pieces[0], platform: "tiktok" };
    pieces[1] = { ...pieces[1], settings: { ...DEFAULT_BASELINE, durationSec: 40 } };
    const result = evaluateExperiment(experiment, pieces, now);
    assert.ok(result.confounders.some((c) => c.includes("more than one platform")));
    assert.ok(result.confounders.some((c) => c.includes("held-constant durationSec")));
    assert.ok(result.confounders[0].startsWith("Organic distribution"));
  });
});

// ---------------------------------------------------------------------------

const base = exampleById("mx-001");
assert.ok(base);

function approvedExample(id: string, lesson: LessonId): MarketingExample {
  return {
    ...base!,
    id,
    lesson,
    status: "approved",
    provenance: { ...base!.provenance, reviewedBy: "owner", reviewedOn: "2026-10-20" },
  };
}

const library = (["spr", "nuttiness", "draw-quality", "price"] as LessonId[]).flatMap((lesson, i) => [
  approvedExample(`mx-1${i}0`, lesson),
  approvedExample(`mx-1${i}1`, lesson),
]);

function input(overrides: Partial<PlannerInput> = {}): PlannerInput {
  return { now, experiments: [], pieces: [], examples: library, reviews: [], ...overrides };
}

describe("next-batch planner", () => {
  it("asks for approved examples when there are not enough to run a matched test", () => {
    const out = planNextBatch(input({ examples: [base!] }));
    assert.equal(out.recommendations.length, 1);
    const [rec] = out.recommendations;
    assert.equal(rec.kind, "needs-examples");
    assert.equal(rec.items.length, 0);
    assert.match(rec.blockers[0], /Needs 8 more approved, unused examples/);
  });

  it("proposes a matched, balanced, reproducible hook test", () => {
    const out = planNextBatch(input());
    const [rec] = out.recommendations;
    assert.equal(rec.kind, "experiment");
    assert.equal(rec.experiment.factors[0], "hook");
    assert.equal(rec.items.length, 8);

    const arms = { control: rec.items.filter((s) => s.variant === "control"), treatment: rec.items.filter((s) => s.variant === "treatment") };
    assert.equal(arms.control.length, 4);
    assert.equal(arms.treatment.length, 4);
    const lessons = (list: typeof rec.items) => list.map((s) => s.settings.lesson).sort();
    assert.deepEqual(lessons(arms.control), lessons(arms.treatment), "lessons matched across arms");

    // Only the factor differs.
    for (const item of rec.items) {
      const { hook, lesson, ...rest } = item.settings;
      void hook;
      void lesson;
      const { hook: _h, lesson: _l, ...baseline } = DEFAULT_BASELINE;
      void _h;
      void _l;
      assert.deepEqual(rest, baseline);
    }
    assert.equal(new Set(rec.items.map((s) => s.exampleId)).size, 8, "no example used twice");
    assert.deepEqual(rec.items.map((s) => s.publishOrder), [1, 2, 3, 4, 5, 6, 7, 8]);
    assert.equal(rec.evidenceStrength, "none");
    assert.equal(rec.experiment.primaryMetric, "visitors", "no impressions imported");

    assert.deepEqual(planNextBatch(input()).recommendations[0], rec, "deterministic");
  });

  it("holds while an experiment is running on the platform", () => {
    const running: PlannerExperiment = { ...experiment, learning: null };
    const out = planNextBatch(input({ experiments: [running] }));
    assert.equal(out.recommendations.length, 0);
    assert.match(out.status[0], /EXP-001 is running/);
  });

  it("skips a topic the operator rejected recently", () => {
    const first = planNextBatch(input()).recommendations[0];
    const out = planNextBatch(
      input({ reviews: [{ topicKey: first.topicKey, factor: "hook", status: "rejected", reviewedAt: daysAgo(3), reason: "not this week" }] }),
    );
    assert.notEqual(out.recommendations[0].topicKey, first.topicKey);
    assert.ok(out.status.some((s) => s.includes("rejected in review")));
  });

  it("never reuses an example already attached to a piece", () => {
    const used = library.slice(0, 2).map((e, i) => ({
      contentId: `PRC-00${i + 1}`, status: "published", exampleId: e.id, settings: DEFAULT_BASELINE,
      publishedAt: daysAgo(10), platform: "youtube-shorts", metrics: metrics(10),
    }));
    const out = planNextBatch(input({ pieces: used }));
    for (const rec of out.recommendations) {
      for (const item of rec.items) assert.ok(!["mx-100", "mx-101"].includes(item.exampleId));
    }
  });

  it("replicates a supported result before adopting it, then adopts it", () => {
    const won: PlannerExperiment = { ...experiment, status: "concluded", decision: "expand", evidence: "supported", learning: "won" };
    const rec = planNextBatch(input({ experiments: [won] })).recommendations[0];
    assert.equal(rec.experiment.kind, "replication");
    assert.equal(rec.experiment.replicates, "EXP-001");
    assert.equal(rec.evidenceStrength, "moderate");
    assert.equal(currentBaseline([won]).hook, "challenge", "one win does not move the baseline");

    const replicated: PlannerExperiment = { ...won, id: "EXP-002", kind: "replication", replicates: "EXP-001", started_at: daysAgo(10) };
    assert.equal(currentBaseline([won, replicated]).hook, "financial-consequence");
  });
});

describe("accepting a proposal", () => {
  const lookup = (id: string) => library.find((e) => e.id === id) ?? exampleById(id);

  it("accepts the planner's own proposal", () => {
    const rec = planNextBatch(input()).recommendations[0];
    const result = validateAcceptance(JSON.parse(JSON.stringify(rec)), new Set(), lookup);
    assert.ok(result.ok, result.ok ? "" : result.error);
    assert.equal(result.items.length, 8);
  });

  it("refuses a revision that swaps in an unapproved, used or mismatched piece", () => {
    const rec = JSON.parse(JSON.stringify(planNextBatch(input()).recommendations[0]));

    const unapproved = structuredClone(rec);
    unapproved.items[0].exampleId = "mx-001";
    unapproved.items[0].settings.lesson = "spr";
    const refused = validateAcceptance(unapproved, new Set(), lookup);
    assert.equal(refused.ok, false);
    if (!refused.ok) assert.match(refused.error, /not approved/);

    const used = validateAcceptance(rec, new Set([rec.items[0].exampleId]), lookup);
    assert.equal(used.ok, false);

    const mismatched = structuredClone(rec);
    const control = mismatched.items.find((i: { variant: string }) => i.variant === "control");
    control.settings.hook = "financial-consequence";
    const result = validateAcceptance(mismatched, new Set(), lookup);
    assert.equal(result.ok, false);
    if (!result.ok) assert.match(result.error, /does not match its arm/);
  });

  it("refuses a needs-examples proposal as a batch", () => {
    const rec = planNextBatch(input({ examples: [base!] })).recommendations[0];
    assert.equal(validateAcceptance(rec, new Set(), lookup).ok, false);
  });
});
