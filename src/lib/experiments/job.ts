import type { SupabaseClient } from "@supabase/supabase-js";
import { sendEmail } from "@/lib/email/client";
import { renderHtml, renderText } from "@/lib/email/templates";
import { env } from "@/lib/env";
import { supabaseAdmin } from "@/lib/supabase";
import { fetchAllRows } from "@/lib/supabase-pages";
import {
  evaluateExperiment,
  type ExperimentPiece,
  type ExperimentRecord,
  type ExperimentResults,
} from "./evaluate";
import { marketingExamples, type MarketingExample } from "./examples";
import { dailyReportKey, slotKey, weeklyReportKey } from "./job-schedule";
import {
  aggregateFunnel,
  allTraffic,
  bottleneck,
  byContentId,
  emptyFunnel,
  factorSummaries,
  funnelSteps,
  metricValue,
  periodChanges,
  pickImport,
  withImport,
  type EventRow,
  type FunnelMetrics,
  type MetricImportRow,
  type PieceMetrics,
  type PurchaseRow,
  type SubscriberRow,
  type Window,
} from "./metrics";
import { planNextBatch, type PlannerExperiment, type PlannerPiece, type PlannerReview } from "./planner";
import { buildDailyReport, buildWeeklyReport, type ReportContext } from "./report";
import { parseSettings, type ContentSettings } from "./spec";

/**
 * The six-hour analytics job.
 *
 * 1. Check the database answers.
 * 2. Claim this six-hour slot (idempotent: a slot succeeds once).
 * 3. Read events, purchases, subscribers, pieces, experiments and imports.
 * 4. Write 24-hour, 7-day and 30-day snapshots (upserted per slot).
 * 5. Re-evaluate every running experiment.
 * 6. Plan the next batch and file proposals for review.
 * 7. Prune old history; send any report that is due.
 * 8. Record the outcome, and ping the external monitor.
 *
 * It only ever **reads** purchases, subscribers and events, and writes only
 * to its own tables and `experiments`. Every read is paged and capped. Nothing
 * here can affect checkout, the webhook, delivery or downloads.
 */

const DAY = 24 * 60 * 60 * 1000;
/** Longest an experiment's pieces are looked back for. */
const MAX_LOOKBACK_DAYS = 120;
/** History kept for snapshots and runs. */
const RETENTION_DAYS = 120;
/** A run still "running" after this long is presumed dead and may be retried. */
const STALE_RUN_MINUTES = 20;
const MAX_EVENTS = 250_000;

export type JobResult = {
  ok: boolean;
  status: number;
  runKey: string;
  skipped?: string;
  error?: string;
  summary?: Record<string, unknown>;
};

async function ping(suffix: "" | "/fail", body?: string) {
  const url = env.healthcheckPingUrl;
  if (!url) return;
  try {
    await fetch(`${url.replace(/\/+$/, "")}${suffix}`, {
      method: "POST",
      body: body?.slice(0, 2000),
      signal: AbortSignal.timeout(10_000),
    });
  } catch (error) {
    console.error("[analytics] healthcheck ping failed", error);
  }
}

type PieceRow = {
  content_id: string;
  status: string;
  platform: string | null;
  published_at: string | null;
  example_id: string | null;
  experiment_id: string | null;
  variant: string | null;
  spec: { settings?: unknown } | null;
};

type ExperimentRow = ExperimentRecord & {
  learning: string | null;
  ended_at: string | null;
  hypothesis: string;
  results: ExperimentResults | null;
};

function settingsOf(row: PieceRow): ContentSettings | null {
  const parsed = parseSettings(row.spec?.settings);
  return parsed.ok ? parsed.settings : null;
}

/**
 * The job, end to end. Never throws.
 *
 * `examples` replaces the example library for the planner. Only the
 * synthetic demonstration (scripts/experiment-demo/) passes it; production
 * always plans from `marketingExamples`.
 */
export async function runAnalyticsJob(
  options: { now?: Date; force?: boolean; examples?: MarketingExample[] } = {},
): Promise<JobResult> {
  const now = options.now ?? new Date();
  const runKey = slotKey(now);
  const db = supabaseAdmin();
  if (!db) {
    return { ok: false, status: 503, runKey, error: "Supabase is not configured." };
  }

  // 1. Is the database there at all? If not, nothing below can be recorded,
  // so the failure goes to the caller (curl -f) and the external monitor.
  const health = await db.from("analytics_runs").select("id", { head: true, count: "exact" }).limit(1);
  if (health.error) {
    const error = `Database check failed: ${health.error.message}`;
    await ping("/fail", error);
    return { ok: false, status: 503, runKey, error };
  }

  // 2. Claim the slot.
  const existing = await db.from("analytics_runs").select("status, started_at, attempts").eq("run_key", runKey).maybeSingle();
  if (existing.data) {
    const startedAgo = now.getTime() - Date.parse(existing.data.started_at as string);
    if (existing.data.status === "succeeded" && !options.force) {
      await ping("");
      return { ok: true, status: 200, runKey, skipped: "This slot already succeeded." };
    }
    if (existing.data.status === "running" && startedAgo < STALE_RUN_MINUTES * 60_000) {
      return { ok: true, status: 202, runKey, skipped: "This slot is already running." };
    }
  }
  const claim = await db.from("analytics_runs").upsert(
    {
      run_key: runKey,
      status: "running",
      started_at: now.toISOString(),
      finished_at: null,
      error: null,
      attempts: ((existing.data?.attempts as number | undefined) ?? 0) + 1,
    },
    { onConflict: "run_key" },
  );
  if (claim.error) {
    await ping("/fail", claim.error.message);
    return { ok: false, status: 500, runKey, error: claim.error.message };
  }

  try {
    const summary = await analyse(db, now, runKey, options.examples ?? marketingExamples);
    await db
      .from("analytics_runs")
      .update({ status: "succeeded", finished_at: new Date().toISOString(), summary })
      .eq("run_key", runKey);
    await ping("", JSON.stringify(summary));
    return { ok: true, status: 200, runKey, summary };
  } catch (caught) {
    const error = caught instanceof Error ? caught.message : String(caught);
    console.error("[analytics] run failed", runKey, error);
    await db
      .from("analytics_runs")
      .update({ status: "failed", finished_at: new Date().toISOString(), error: error.slice(0, 2000) })
      .eq("run_key", runKey);
    await ping("/fail", error);
    return { ok: false, status: 500, runKey, error };
  }
}

function must<T>(result: { data: T | null; error: { message: string } | null }, what: string): T {
  if (result.error) throw new Error(`${what}: ${result.error.message}`);
  return result.data as T;
}

async function analyse(
  db: SupabaseClient,
  now: Date,
  runKey: string,
  examples: MarketingExample[],
): Promise<Record<string, unknown>> {
  // 3. Read. --------------------------------------------------------------
  const pieces = must(
    await db
      .from("content_pieces")
      .select("content_id, status, platform, published_at, example_id, experiment_id, variant, spec")
      .order("created_at", { ascending: false })
      .limit(1000),
    "content_pieces",
  ) as PieceRow[];
  const experiments = must(
    await db.from("experiments").select("*").order("started_at", { ascending: false }).limit(200),
    "experiments",
  ) as ExperimentRow[];

  const runningIds = new Set(experiments.filter((e) => e.status === "running").map((e) => e.id));
  const earliestRunningPiece = pieces
    .filter((p) => p.experiment_id && runningIds.has(p.experiment_id) && p.published_at)
    .map((p) => Date.parse(p.published_at as string))
    .reduce((min, t) => Math.min(min, t), now.getTime());
  const lookbackStart = Math.max(
    now.getTime() - MAX_LOOKBACK_DAYS * DAY,
    Math.min(now.getTime() - 30 * DAY, earliestRunningPiece),
  );
  const since = new Date(lookbackStart).toISOString();

  const [eventsRead, purchasesRead, subscribersRead, importsRead, reviewsRead] = await Promise.all([
    fetchAllRows<EventRow>(
      (from, to) =>
        db
          .from("events")
          .select("name, session_id, content_id, platform, created_at, props")
          .in("name", ["page_view", "quiz_started", "quiz_completed", "checkout_started"])
          .gte("created_at", since)
          .order("id")
          .range(from, to),
      MAX_EVENTS,
    ),
    fetchAllRows<PurchaseRow>(
      (from, to) =>
        db.from("purchases").select("content_id, amount_cents, status, created_at").gte("created_at", since).order("id").range(from, to),
      50_000,
    ),
    fetchAllRows<SubscriberRow>(
      (from, to) => db.from("subscribers").select("content_id, created_at").gte("created_at", since).order("id").range(from, to),
      50_000,
    ),
    fetchAllRows<MetricImportRow>(
      (from, to) =>
        db
          .from("content_metric_imports")
          .select("content_id, platform, captured_on, impressions, views, avg_view_seconds, link_clicks")
          .order("id")
          .range(from, to),
      20_000,
    ),
    db
      .from("recommendations")
      .select("topic_key, status, reviewed_at, review_reason, body")
      .in("status", ["accepted", "rejected", "revised"])
      .gte("reviewed_at", new Date(now.getTime() - 90 * DAY).toISOString())
      .limit(200),
  ]);
  for (const [what, read] of [
    ["events", eventsRead],
    ["purchases", purchasesRead],
    ["subscribers", subscribersRead],
    ["imports", importsRead],
  ] as const) {
    if (read.error) throw new Error(`${what}: ${read.error}`);
  }
  const rows = { events: eventsRead.rows, purchases: purchasesRead.rows, subscribers: subscribersRead.rows };
  const imports = importsRead.rows;

  const dataWarnings: string[] = [];
  if (eventsRead.truncated) dataWarnings.push(`Event read hit its ${MAX_EVENTS}-row ceiling; counts are a floor.`);

  const pieceById = new Map(pieces.map((p) => [p.content_id, p]));

  // 4. Snapshots. -----------------------------------------------------------
  const windowOf = (days: number): Window => ({ from: new Date(now.getTime() - days * DAY), to: now });
  const snapshotSummary: Record<string, number> = {};
  let day: FunnelMetrics = emptyFunnel();
  let week: FunnelMetrics = emptyFunnel();
  let weekChanges: ReturnType<typeof periodChanges> = [];

  for (const days of [1, 7, 30] as const) {
    const window = windowOf(days);
    const site = aggregateFunnel(rows, window, allTraffic);
    const siteTotals = site.byKey.get("all") ?? emptyFunnel();
    const byContent = aggregateFunnel(rows, window, byContentId).byKey;
    const steps = funnelSteps(siteTotals);

    const content = [...byContent.entries()]
      .map(([contentId, funnel]) => {
        const piece = pieceById.get(contentId);
        // Impressions are lifetime totals, so they only pair with a window
        // that contains the piece's whole life.
        const wholeLife = piece?.published_at ? Date.parse(piece.published_at) >= window.from.getTime() : false;
        const metrics: PieceMetrics = withImport(funnel, wholeLife ? pickImport(imports, contentId, now) : null);
        return {
          contentId,
          status: piece?.status ?? "unregistered",
          platform: piece?.platform ?? null,
          settings: piece ? settingsOf(piece) : null,
          metrics,
          netRevenuePerVisitor: metricValue("net_revenue_per_visitor", metrics),
          visitorsPer1kImpressions: metricValue("visitors_per_1k_impressions", metrics),
          smallSample: funnel.visitors < 30,
        };
      })
      .sort(
        (a, b) =>
          b.metrics.netRevenueCents - a.metrics.netRevenueCents ||
          b.metrics.purchases - a.metrics.purchases ||
          b.metrics.challengeStarts - a.metrics.challengeStarts ||
          b.metrics.visitors - a.metrics.visitors,
      );

    const data: Record<string, unknown> = {
      window: { days, from: window.from.toISOString(), to: window.to.toISOString() },
      site: siteTotals,
      attributedVisitors: content.reduce((s, c) => s + c.metrics.visitors, 0),
      steps,
      bottleneck: bottleneck(steps),
      content: content.slice(0, 50),
      dataQuality: {
        eventsRead: eventsRead.rows.length,
        truncated: eventsRead.truncated,
        sessionlessEvents: site.sessionlessEvents,
        importsAvailable: imports.length,
      },
    };
    if (days === 7) {
      const prior = aggregateFunnel(rows, { from: new Date(now.getTime() - 14 * DAY), to: window.from }, allTraffic);
      weekChanges = periodChanges(siteTotals, prior.byKey.get("all") ?? emptyFunnel());
      data.changes = weekChanges;
      week = siteTotals;
    }
    if (days === 1) day = siteTotals;
    if (days === 30) {
      data.factors = factorSummaries(content.map((c) => ({ contentId: c.contentId, settings: c.settings, metrics: c.metrics })));
    }

    const write = await db.from("analytics_snapshots").upsert(
      {
        run_key: runKey,
        window_days: days,
        window_start: window.from.toISOString(),
        window_end: window.to.toISOString(),
        data,
      },
      { onConflict: "run_key,window_days" },
    );
    if (write.error) throw new Error(`snapshot ${days}d: ${write.error.message}`);
    snapshotSummary[`${days}d_visitors`] = siteTotals.visitors;
  }

  // 5. Experiments. ---------------------------------------------------------
  const evaluated: Record<string, string> = {};
  for (const experiment of experiments.filter((e) => e.status === "running")) {
    const members = pieces.filter((p) => p.experiment_id === experiment.id);
    const experimentPieces: ExperimentPiece[] = members.map((p) => {
      let metrics: PieceMetrics | null = null;
      if (p.published_at) {
        const from = new Date(p.published_at);
        const to = new Date(Math.min(now.getTime(), from.getTime() + experiment.plan.horizonDays * DAY));
        const funnel = aggregateFunnel(rows, { from, to }, (c) => (c === p.content_id ? c : null)).byKey.get(p.content_id) ?? emptyFunnel();
        metrics = withImport(funnel, pickImport(imports, p.content_id, to));
      }
      return {
        contentId: p.content_id,
        variant: p.variant,
        status: p.status,
        publishedAt: p.published_at,
        platform: p.platform,
        settings: settingsOf(p),
        metrics,
      };
    });
    const results = evaluateExperiment(experiment, experimentPieces, now);
    const concluded = results.decision !== "continue";
    const update = await db
      .from("experiments")
      .update({
        results,
        results_updated_at: now.toISOString(),
        evidence: results.evidence,
        decision: results.decision,
        decision_reason: results.decisionReason,
        learning: results.learning,
        confounders: results.confounders,
        updated_at: now.toISOString(),
        ...(concluded ? { status: "concluded", ended_at: now.toISOString() } : {}),
      })
      .eq("id", experiment.id)
      .eq("status", "running");
    if (update.error) throw new Error(`experiment ${experiment.id}: ${update.error.message}`);
    Object.assign(experiment, {
      results,
      evidence: results.evidence,
      decision: results.decision,
      learning: results.learning,
      ...(concluded ? { status: "concluded", ended_at: now.toISOString() } : {}),
    });
    evaluated[experiment.id] = results.decision;
  }

  // 6. Plan the next batch. -------------------------------------------------
  const lifetime = aggregateFunnel(rows, { from: new Date(lookbackStart), to: now }, byContentId).byKey;
  const plannerPieces: PlannerPiece[] = pieces.map((p) => ({
    contentId: p.content_id,
    status: p.status,
    exampleId: p.example_id,
    settings: settingsOf(p),
    publishedAt: p.published_at,
    platform: p.platform,
    metrics: withImport(lifetime.get(p.content_id) ?? emptyFunnel(), pickImport(imports, p.content_id, now)),
  }));
  const reviews: PlannerReview[] = ((reviewsRead.data ?? []) as {
    topic_key: string;
    status: PlannerReview["status"];
    reviewed_at: string;
    review_reason: string | null;
    body: { experiment?: { factors?: string[] } } | null;
  }[]).map((r) => ({
    topicKey: r.topic_key,
    factor: r.body?.experiment?.factors?.[0] ?? null,
    status: r.status,
    reviewedAt: r.reviewed_at,
    reason: r.review_reason,
  }));
  const plan = planNextBatch({
    now,
    experiments: experiments as PlannerExperiment[],
    pieces: plannerPieces,
    examples,
    reviews,
  });

  const keep = plan.recommendations.map((r) => r.dedupeKey);
  const supersede = db
    .from("recommendations")
    .update({ status: "superseded", updated_at: now.toISOString() })
    .eq("status", "proposed");
  const superseded = keep.length > 0
    ? await supersede.not("dedupe_key", "in", `(${keep.map((k) => `"${k.replace(/"/g, "")}"`).join(",")})`)
    : await supersede;
  if (superseded.error) throw new Error(`supersede: ${superseded.error.message}`);

  for (const rec of plan.recommendations) {
    const insert = await db.from("recommendations").insert({
      run_key: runKey,
      engine_version: rec.engineVersion,
      kind: rec.kind,
      topic_key: rec.topicKey,
      dedupe_key: rec.dedupeKey,
      status: "proposed",
      title: rec.title,
      evidence_strength: rec.evidenceStrength,
      body: rec,
    });
    // The open proposal is unique per dedupe key (a partial index, which an
    // upsert cannot target). A unique violation means it is already filed.
    if (insert.error && insert.error.code !== "23505") {
      throw new Error(`recommendation: ${insert.error.message}`);
    }
  }

  // 7. Prune and report. ---------------------------------------------------
  const cutoff = new Date(now.getTime() - RETENTION_DAYS * DAY).toISOString();
  await db.from("analytics_snapshots").delete().lt("created_at", cutoff);
  await db.from("analytics_runs").delete().lt("started_at", cutoff);

  const failed = await db
    .from("analytics_runs")
    .select("id", { head: true, count: "exact" })
    .eq("status", "failed")
    .gte("started_at", new Date(now.getTime() - DAY).toISOString());

  const proposals = must(
    await db.from("recommendations").select("title, body, evidence_strength").eq("status", "proposed").limit(20),
    "proposals",
  ) as { title: string; evidence_strength: string; body: { summary?: string; blockers?: string[] } }[];

  const reportContext: ReportContext = {
    now,
    day,
    week,
    bottleneck: bottleneck(funnelSteps(week)),
    changes: weekChanges,
    experiments: experiments.map((e) => ({
      id: e.id,
      status: e.status,
      hypothesis: e.hypothesis,
      primaryMetric: e.primary_metric,
      startedAt: e.started_at,
      endedAt: e.ended_at,
      results: e.results,
    })),
    proposals: proposals.map((p) => ({
      title: p.title,
      summary: p.body.summary ?? "",
      evidenceStrength: p.evidence_strength,
      blockers: p.body.blockers ?? [],
    })),
    plannerStatus: plan.status,
    dataWarnings,
    failedRunsLastDay: failed.count ?? 0,
  };

  const reports: string[] = [];
  for (const [kind, key, build] of [
    ["daily", dailyReportKey(now), buildDailyReport],
    ["weekly", weeklyReportKey(now), buildWeeklyReport],
  ] as const) {
    if (!key) continue;
    const content = build(reportContext);
    // Claim the period first: the unique (kind, period_key) row is what stops
    // a rerun from sending the same report twice.
    const claimed = await db
      .from("operator_reports")
      .upsert(
        { kind, period_key: key, subject: content.subject, body_text: renderText(content) },
        { onConflict: "kind,period_key", ignoreDuplicates: true },
      )
      .select("id");
    if (claimed.error) throw new Error(`report ${kind}: ${claimed.error.message}`);
    if (!claimed.data || claimed.data.length === 0) continue;
    reports.push(`${kind}:${key}`);
    if (!env.operatorEmail) continue;
    const sent = await sendEmail({ to: env.operatorEmail, subject: content.subject, html: renderHtml(content), text: renderText(content) });
    if (sent.ok) {
      await db.from("operator_reports").update({ sent_at: new Date().toISOString(), provider_id: sent.id }).eq("id", claimed.data[0].id);
    }
  }

  return {
    since,
    rows: { events: eventsRead.rows.length, purchases: purchasesRead.rows.length, subscribers: subscribersRead.rows.length, imports: imports.length },
    snapshots: snapshotSummary,
    evaluated,
    proposals: plan.recommendations.map((r) => r.title),
    plannerStatus: plan.status,
    reports,
    warnings: dataWarnings,
  };
}
