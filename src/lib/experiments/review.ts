import type { SupabaseClient } from "@supabase/supabase-js";
import { formatContentId, parseContentId, type SeriesCode } from "@/lib/content/series";
import { exampleById, type MarketingExample } from "./examples";
import { parseMetricsCsv } from "./imports";
import { isMetricId, type MetricId } from "./metrics";
import type { Recommendation } from "./planner";
import { buildTimeline, companionCopy } from "./script";
import {
  ctas,
  experimentalFactors,
  parseContentSpec,
  type ContentSpec,
  type ExperimentalFactor,
} from "./spec";

/**
 * The operator's side of the loop: reviewing proposals, moving pieces toward
 * publication, and importing platform numbers.
 *
 * Two gates live here, and both are deliberate:
 *
 * - **A batch is created only by the operator accepting it.** The engine
 *   files proposals; nothing it does creates an experiment or a piece.
 * - **A piece is marked published only from `approved`, and approved only
 *   when its example is approved.** No unreviewed poker reaches a platform
 *   through this system.
 *
 * A review's reason is stored with the proposal. It informs later planning
 * (a rejected topic rests for 30 days) and is never read as evidence.
 */

export type ReviewOutcome = { ok: true; message: string } | { ok: false; message: string };

type AcceptedExperiment = Recommendation["experiment"];

/**
 * Validates a proposal as accepted -- as proposed, or as the operator revised
 * it. Revision may change settings, metrics, plan and examples; it may not
 * smuggle in an unapproved or already-used example, or a setting the
 * renderer cannot read in the time.
 */
export function validateAcceptance(
  value: unknown,
  usedExampleIds: Set<string>,
  lookup: (id: string) => MarketingExample | null = exampleById,
): { ok: true; experiment: AcceptedExperiment; items: ContentSpec[] } | { ok: false; error: string } {
  if (typeof value !== "object" || value === null) return { ok: false, error: "Body must be an object." };
  const body = value as { kind?: unknown; experiment?: Partial<AcceptedExperiment>; items?: unknown };
  if (body.kind !== "experiment") return { ok: false, error: "Only an experiment proposal creates a batch." };
  const e = body.experiment;
  if (!e || typeof e !== "object") return { ok: false, error: "experiment is missing." };

  if (typeof e.hypothesis !== "string" || e.hypothesis.trim().length < 10 || e.hypothesis.length > 1000) {
    return { ok: false, error: "experiment.hypothesis must be a sentence." };
  }
  if (!Array.isArray(e.factors) || e.factors.length !== 1 || !(experimentalFactors as readonly string[]).includes(e.factors[0])) {
    return { ok: false, error: "experiment.factors must name one experimental factor (A/B tests only in this version)." };
  }
  const factor = e.factors[0] as ExperimentalFactor;
  if (!isMetricId(e.primaryMetric)) return { ok: false, error: "experiment.primaryMetric is not a known metric." };
  for (const list of [e.secondaryMetrics, e.guardrailMetrics]) {
    if (!Array.isArray(list) || !list.every(isMetricId)) return { ok: false, error: "Secondary and guardrail metrics must be known metrics." };
  }
  const plan = e.plan;
  if (
    !plan ||
    !(plan.alpha > 0 && plan.alpha <= 0.2) ||
    !Number.isInteger(plan.piecesPerArm) || plan.piecesPerArm < 2 || plan.piecesPerArm > 20 ||
    !Number.isInteger(plan.horizonDays) || plan.horizonDays < 1 || plan.horizonDays > 60 ||
    !(plan.deadlineDays >= plan.horizonDays && plan.deadlineDays <= 180) ||
    !(plan.minDenominatorPerArm >= 0)
  ) {
    return { ok: false, error: "experiment.plan is out of range." };
  }
  const variants = e.variants;
  if (!Array.isArray(variants) || variants.length !== 2 || variants[0]?.key !== "control" || variants[1]?.key !== "treatment") {
    return { ok: false, error: "experiment.variants must be [control, treatment]." };
  }
  const levels = variants.map((v) => (v.settings as Record<string, unknown> | undefined)?.[factor]);
  if (levels[0] === undefined || levels[0] === levels[1]) {
    return { ok: false, error: `The arms must set different ${factor} levels.` };
  }

  if (!Array.isArray(body.items) || body.items.length === 0 || body.items.length > 40) {
    return { ok: false, error: "items must list the batch's specs." };
  }
  const items: ContentSpec[] = [];
  const seen = new Set<string>();
  for (const [i, raw] of body.items.entries()) {
    const parsed = parseContentSpec(raw);
    if (!parsed.ok) return { ok: false, error: `Item ${i + 1}: ${parsed.error}` };
    const spec = parsed.spec;
    const where = `Item ${i + 1} (${spec.exampleId})`;
    const arm = variants.findIndex((v) => v.key === spec.variant);
    if (arm < 0) return { ok: false, error: `${where}: variant must be control or treatment.` };
    if (spec.settings[factor] !== levels[arm]) return { ok: false, error: `${where}: ${factor} does not match its arm.` };
    const example = lookup(spec.exampleId);
    if (!example || example.status !== "approved") return { ok: false, error: `${where}: example is not approved.` };
    if (usedExampleIds.has(example.id) || seen.has(example.id)) return { ok: false, error: `${where}: example is already used.` };
    if (!ctas[spec.settings.cta].available) return { ok: false, error: `${where}: that call to action has no page yet.` };
    if (spec.settings.lesson !== example.lesson) return { ok: false, error: `${where}: lesson must be the example's own.` };
    const timeline = buildTimeline(spec, example);
    if (!timeline.ok) return { ok: false, error: `${where}: ${timeline.error}` };
    seen.add(example.id);
    items.push(spec);
  }
  for (const key of ["control", "treatment"]) {
    if (items.filter((s) => s.variant === key).length < plan.piecesPerArm) {
      return { ok: false, error: `The ${key} arm has fewer pieces than plan.piecesPerArm.` };
    }
  }

  return {
    ok: true,
    experiment: {
      kind: e.kind === "replication" ? "replication" : "exploration",
      replicates: typeof e.replicates === "string" ? e.replicates : null,
      factors: [factor],
      variants,
      heldConstant: e.heldConstant ?? {},
      primaryMetric: e.primaryMetric as MetricId,
      secondaryMetrics: e.secondaryMetrics as MetricId[],
      guardrailMetrics: e.guardrailMetrics as MetricId[],
      plan,
      platform: typeof e.platform === "string" ? e.platform : items[0].settings.platform,
      hypothesis: e.hypothesis.trim(),
    },
    items: items.sort((a, b) => (a.publishOrder ?? 0) - (b.publishOrder ?? 0)),
  };
}

function nextNumber(ids: string[], pattern: RegExp): number {
  return ids.reduce((max, id) => {
    const match = pattern.exec(id);
    return match ? Math.max(max, Number.parseInt(match[1], 10)) : max;
  }, 0) + 1;
}

export async function reviewRecommendation(
  db: SupabaseClient,
  input: { id: string; decision: "accept" | "reject" | "revise"; reason: string; revision: string | null },
  now = new Date(),
  lookup: (id: string) => MarketingExample | null = exampleById,
): Promise<ReviewOutcome> {
  const { data: rec, error } = await db
    .from("recommendations")
    .select("id, kind, status, body")
    .eq("id", input.id)
    .maybeSingle();
  if (error || !rec) return { ok: false, message: "Proposal not found." };
  if (rec.status !== "proposed") return { ok: false, message: `Proposal is already ${rec.status}.` };

  const reviewed = { reviewed_at: now.toISOString(), review_reason: input.reason, updated_at: now.toISOString() };

  if (input.decision === "reject") {
    await db.from("recommendations").update({ ...reviewed, status: "rejected" }).eq("id", rec.id).eq("status", "proposed");
    return { ok: true, message: "Rejected. The engine will not re-propose this topic for 30 days." };
  }

  if (rec.kind === "needs-examples") {
    await db.from("recommendations").update({ ...reviewed, status: "accepted", accepted_body: rec.body }).eq("id", rec.id).eq("status", "proposed");
    return { ok: true, message: "Noted. Approve the examples it asks for; the engine proposes the batch once they exist." };
  }

  let body: unknown = rec.body;
  if (input.decision === "revise") {
    if (!input.revision) return { ok: false, message: "A revision needs the edited JSON." };
    try {
      body = JSON.parse(input.revision);
    } catch {
      return { ok: false, message: "The revision is not valid JSON." };
    }
  }

  const { data: usedRows } = await db.from("content_pieces").select("example_id").not("example_id", "is", null);
  const used = new Set((usedRows ?? []).map((row) => row.example_id as string));
  const valid = validateAcceptance(body, used, lookup);
  if (!valid.ok) return { ok: false, message: valid.error };

  // Allocate ids. One operator, one review at a time: a collision fails the
  // insert loudly rather than overwriting anything.
  const { data: experimentIds } = await db.from("experiments").select("id");
  const experimentId = `EXP-${String(nextNumber((experimentIds ?? []).map((r) => r.id as string), /^EXP-(\d+)$/)).padStart(3, "0")}`;
  const { data: contentRows } = await db.from("content_pieces").select("content_id");
  const existing = (contentRows ?? []).map((r) => r.content_id as string);
  const counters = new Map<SeriesCode, number>();
  const nextContentId = (series: SeriesCode) => {
    const n = counters.get(series) ?? nextNumber(existing.filter((id) => parseContentId(id)?.series === series), /-(\d+)$/);
    counters.set(series, n + 1);
    return formatContentId(series, n);
  };

  const specs = valid.items.map((spec) => ({
    ...spec,
    contentId: nextContentId(spec.series),
    experimentId,
    recommendationId: rec.id as string,
  }));
  const { experiment } = valid;

  const created = await db.from("experiments").insert({
    id: experimentId,
    status: "running",
    kind: experiment.kind,
    replicates: experiment.replicates,
    hypothesis: experiment.hypothesis,
    factors: experiment.factors,
    variants: experiment.variants,
    held_constant: experiment.heldConstant,
    primary_metric: experiment.primaryMetric,
    secondary_metrics: experiment.secondaryMetrics,
    guardrail_metrics: experiment.guardrailMetrics,
    plan: experiment.plan,
    platform: experiment.platform,
    started_at: now.toISOString(),
    recommendation_id: rec.id,
  });
  if (created.error) return { ok: false, message: `Could not register the experiment: ${created.error.message}` };

  const rows = specs.map((spec) => {
    const example = lookup(spec.exampleId) as MarketingExample;
    const timeline = buildTimeline(spec, example);
    const copy = timeline.ok ? companionCopy(spec, example, timeline.timeline) : null;
    return {
      content_id: spec.contentId,
      series: spec.series,
      status: "draft",
      source_material: example.provenance.source,
      source_location: `src/lib/experiments/examples.ts#${example.id}`,
      approved_lesson: example.principle,
      hook: timeline.ok ? timeline.timeline.beats[0].text : null,
      hand_details: {
        hand: example.hand.map((c) => `${c.rank}${c.suit}`),
        board: example.board.map((c) => `${c.rank}${c.suit}`),
        pot: example.pot,
        behind: example.behind,
      },
      script: copy?.narration ?? null,
      caption: copy?.description ?? null,
      cta: ctas[spec.settings.cta].line,
      platform: spec.settings.platform,
      spec,
      spec_version: spec.specVersion,
      example_id: spec.exampleId,
      experiment_id: experimentId,
      variant: spec.variant,
    };
  });
  const inserted = await db.from("content_pieces").insert(rows);
  if (inserted.error) {
    await db.from("experiments").delete().eq("id", experimentId);
    return { ok: false, message: `Could not create the pieces: ${inserted.error.message}` };
  }

  await db
    .from("recommendations")
    .update({
      ...reviewed,
      status: input.decision === "revise" ? "revised" : "accepted",
      accepted_body: { ...(body as object), items: specs },
      experiment_id: experimentId,
    })
    .eq("id", rec.id);

  return {
    ok: true,
    message: `${experimentId} registered with ${specs.length} draft pieces (${specs[0].contentId} …). Render them, review each video, then approve and publish in the listed order.`,
  };
}

const TRANSITIONS: Record<string, string[]> = {
  draft: ["in_review", "retired"],
  in_review: ["approved", "draft", "retired"],
  approved: ["published", "in_review", "retired"],
  published: ["retired"],
  retired: [],
};

export async function setPieceStatus(
  db: SupabaseClient,
  input: { contentId: string; status: string; publishedUrl: string | null; publishedOn: string | null },
  now = new Date(),
  lookup: (id: string) => MarketingExample | null = exampleById,
): Promise<ReviewOutcome> {
  const { data: piece } = await db
    .from("content_pieces")
    .select("content_id, status, example_id")
    .eq("content_id", input.contentId)
    .maybeSingle();
  if (!piece) return { ok: false, message: "Piece not found." };
  if (!(TRANSITIONS[piece.status as string] ?? []).includes(input.status)) {
    return { ok: false, message: `${piece.content_id} cannot move from ${piece.status} to ${input.status}.` };
  }

  const update: Record<string, unknown> = { status: input.status, updated_at: now.toISOString() };
  if (input.status === "approved" && piece.example_id) {
    const example = lookup(piece.example_id as string);
    if (example?.status !== "approved") {
      return { ok: false, message: `${piece.content_id} uses example ${piece.example_id}, which is not approved.` };
    }
  }
  if (input.status === "published") {
    let url: URL;
    try {
      url = new URL(input.publishedUrl ?? "");
    } catch {
      return { ok: false, message: "Publishing needs the post's URL." };
    }
    if (url.protocol !== "https:") return { ok: false, message: "The post URL must be https." };
    const day = input.publishedOn && /^\d{4}-\d{2}-\d{2}$/.test(input.publishedOn) ? new Date(`${input.publishedOn}T12:00:00Z`) : now;
    if (Number.isNaN(day.getTime()) || day.getTime() > now.getTime()) return { ok: false, message: "The publication date cannot be in the future." };
    update.published_url = url.toString().slice(0, 500);
    update.published_at = (input.publishedOn ? day : now).toISOString();
  }

  const { error } = await db.from("content_pieces").update(update).eq("content_id", piece.content_id).eq("status", piece.status);
  return error ? { ok: false, message: error.message } : { ok: true, message: `${piece.content_id} is now ${input.status}.` };
}

export async function importMetrics(db: SupabaseClient, csv: string, now = new Date()): Promise<ReviewOutcome> {
  const { rows, errors } = parseMetricsCsv(csv, now);
  if (errors.length > 0) return { ok: false, message: errors.slice(0, 5).join(" ") };
  const { error } = await db
    .from("content_metric_imports")
    .upsert(rows.map((row) => ({ ...row, source: "manual", imported_at: now.toISOString() })), {
      onConflict: "content_id,platform,captured_on",
    });
  return error ? { ok: false, message: error.message } : { ok: true, message: `Imported ${rows.length} row(s).` };
}
