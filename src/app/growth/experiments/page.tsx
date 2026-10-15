import type { Metadata } from "next";
import { cookies } from "next/headers";
import Link from "next/link";
import { ADMIN_COOKIE, isAuthorizedToken } from "@/lib/admin-auth";
import type { ExperimentResults } from "@/lib/experiments/evaluate";
import { exampleById } from "@/lib/experiments/examples";
import { IMPORT_COLUMNS } from "@/lib/experiments/imports";
import {
  metricLabels,
  type FactorSummary,
  type FunnelStep,
  type MetricId,
  type PeriodChange,
  type PieceMetrics,
} from "@/lib/experiments/metrics";
import type { Recommendation } from "@/lib/experiments/planner";
import { specTrackedPath, type ContentSettings, type ContentSpec } from "@/lib/experiments/spec";
import { formatPrice } from "@/lib/offers";
import { siteUrl } from "@/lib/site";
import { supabaseAdmin } from "@/lib/supabase";
import { importAction, pieceStatusAction, reviewAction } from "./actions";

/**
 * The content experiment dashboard: operational health, the review queue,
 * running experiments, what each piece is earning, and the history of
 * decisions. See docs/CONTENT-EXPERIMENTS.md.
 *
 * Everything shown is read from what the six-hour job wrote; this page
 * computes nothing of its own, so it shows exactly what the engine saw.
 */

export const metadata: Metadata = {
  title: "Experiments | War of Poker",
  robots: { index: false, follow: false, nocache: true },
};

export const dynamic = "force-dynamic";

const percent = (x: number) => `${(x * 100).toFixed(1)}%`;
const number = new Intl.NumberFormat("en-US");
const date = (iso: string | null) => (iso ? iso.slice(0, 16).replace("T", " ") : "—");

const h2 = "font-mono text-[11px] tracking-[0.18em] text-gold uppercase";
const th = "py-2 pr-4 text-left font-mono text-[10px] tracking-[0.16em] text-bone-faint uppercase";
const td = "py-2 pr-4 align-top";
const card = "border border-line bg-ink p-5";
const button =
  "rounded-[2px] border border-line bg-ink-card px-4 py-2 text-sm font-semibold text-bone transition-colors hover:border-gold hover:text-gold";
const input = "w-full rounded-[2px] border border-line bg-ink-raised px-3 py-2 text-sm text-bone";

type RunRow = { run_key: string; status: string; started_at: string; finished_at: string | null; attempts: number; error: string | null };
type RecRow = { id: string; created_at: string; status: string; title: string; evidence_strength: string; body: Recommendation; review_reason: string | null; reviewed_at: string | null; experiment_id: string | null };
type ExperimentRow = { id: string; status: string; kind: string; hypothesis: string; primary_metric: MetricId; started_at: string; ended_at: string | null; evidence: string | null; decision: string | null; decision_reason: string | null; learning: string | null; results: ExperimentResults | null; platform: string | null };
type PieceRow = { content_id: string; status: string; experiment_id: string | null; variant: string | null; example_id: string | null; published_at: string | null; published_url: string | null; spec: ContentSpec | null };
type ContentRow = { contentId: string; status: string; settings: ContentSettings | null; metrics: PieceMetrics; netRevenuePerVisitor: number | null; visitorsPer1kImpressions: number | null; smallSample: boolean };
type Snapshot = { data: { site?: PieceMetrics; steps?: FunnelStep[]; bottleneck?: FunnelStep | null; content?: ContentRow[]; factors?: FactorSummary[]; changes?: PeriodChange[]; dataQuality?: Record<string, unknown> } };

async function load() {
  const db = supabaseAdmin();
  if (!db) return null;
  const [runs, recs, experiments, pieces, snap30, snap7] = await Promise.all([
    db.from("analytics_runs").select("run_key, status, started_at, finished_at, attempts, error").order("started_at", { ascending: false }).limit(8),
    db.from("recommendations").select("id, created_at, status, title, evidence_strength, body, review_reason, reviewed_at, experiment_id").order("created_at", { ascending: false }).limit(30),
    db.from("experiments").select("id, status, kind, hypothesis, primary_metric, started_at, ended_at, evidence, decision, decision_reason, learning, results, platform").order("started_at", { ascending: false }).limit(30),
    db.from("content_pieces").select("content_id, status, experiment_id, variant, example_id, published_at, published_url, spec").not("experiment_id", "is", null).order("content_id").limit(200),
    db.from("analytics_snapshots").select("data").eq("window_days", 30).order("created_at", { ascending: false }).limit(1).maybeSingle(),
    db.from("analytics_snapshots").select("data").eq("window_days", 7).order("created_at", { ascending: false }).limit(1).maybeSingle(),
  ]);
  if (runs.error) return { error: runs.error.message };
  return {
    loadedAt: Date.now(),
    runs: (runs.data ?? []) as RunRow[],
    recs: (recs.data ?? []) as RecRow[],
    experiments: (experiments.data ?? []) as ExperimentRow[],
    pieces: (pieces.data ?? []) as PieceRow[],
    snap30: (snap30.data ?? null) as Snapshot | null,
    snap7: (snap7.data ?? null) as Snapshot | null,
  };
}

function Health({ runs, now }: { runs: RunRow[]; now: number }) {
  const lastSuccess = runs.find((r) => r.status === "succeeded");
  const ageHours = lastSuccess ? (now - Date.parse(lastSuccess.started_at)) / 3_600_000 : null;
  const stale = ageHours === null || ageHours > 8;
  return (
    <section className="mt-12">
      <h2 className={h2}>Operational health</h2>
      <p className={`mt-3 text-sm ${stale ? "text-gold" : "text-bone-muted"}`}>
        {lastSuccess
          ? `Last successful run ${lastSuccess.run_key}, ${ageHours?.toFixed(1)} hours ago.`
          : "No successful run recorded."}
        {stale && " The job runs every six hours; check the Hostinger cron job and the external monitor."}
      </p>
      {runs.length > 0 && (
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[34rem] border-collapse text-sm">
            <thead><tr className="border-y border-line"><th className={th}>Slot</th><th className={th}>Status</th><th className={th}>Started</th><th className={th}>Attempts</th><th className={th}>Error</th></tr></thead>
            <tbody>
              {runs.map((run) => (
                <tr key={run.run_key} className="border-b border-line/60">
                  <td className={`${td} font-mono text-bone`}>{run.run_key}</td>
                  <td className={`${td} ${run.status === "failed" ? "text-gold" : "text-bone-muted"}`}>{run.status}</td>
                  <td className={`${td} text-bone-muted`}>{date(run.started_at)}</td>
                  <td className={`${td} text-bone-muted tabular-nums`}>{run.attempts}</td>
                  <td className={`${td} text-bone-faint`}>{run.error ?? ""}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function ProposalCard({ rec }: { rec: RecRow }) {
  const body = rec.body;
  return (
    <article className={`${card} mt-4`}>
      <p className="font-mono text-[10px] tracking-[0.16em] text-bone-faint uppercase">
        {body.kind} · evidence {rec.evidence_strength} · {date(rec.created_at)}
      </p>
      <h3 className="mt-2 text-lg font-semibold text-bone">{rec.title}</h3>
      <p className="mt-2 text-sm text-bone-muted">{body.summary}</p>
      <p className="mt-3 text-sm text-bone"><span className="text-bone-faint">Hypothesis.</span> {body.experiment.hypothesis}</p>
      <p className="mt-1 text-sm text-bone"><span className="text-bone-faint">Primary metric.</span> {metricLabels[body.experiment.primaryMetric]}. Guardrails: {body.experiment.guardrailMetrics.map((m) => metricLabels[m]).join(", ")}.</p>

      {body.blockers.length > 0 && (
        <ul className="mt-3 list-disc pl-5 text-sm text-gold">{body.blockers.map((b) => <li key={b}>{b}</li>)}</ul>
      )}

      <details className="mt-3 text-sm">
        <summary className="cursor-pointer text-bone-muted">Why this, and the evidence behind it</summary>
        <ul className="mt-2 list-disc pl-5 text-bone-muted">{body.rationale.map((r) => <li key={r}>{r}</li>)}</ul>
        <ul className="mt-2 list-disc pl-5 text-bone-faint">{body.evidenceNotes.map((r) => <li key={r}>{r}</li>)}</ul>
        {body.editorialNotes.length > 0 && (
          <>
            <p className="mt-2 text-bone-faint">Your earlier review notes (context, not evidence):</p>
            <ul className="list-disc pl-5 text-bone-faint">{body.editorialNotes.map((r) => <li key={r}>{r}</li>)}</ul>
          </>
        )}
      </details>

      {body.items.length > 0 && (
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[40rem] border-collapse text-sm">
            <thead><tr className="border-y border-line"><th className={th}>Order</th><th className={th}>Arm</th><th className={th}>Example</th><th className={th}>Lesson</th><th className={th}>Hook</th><th className={th}>Duration</th><th className={th}>CTA</th></tr></thead>
            <tbody>
              {body.items.map((item) => (
                <tr key={item.exampleId} className="border-b border-line/60">
                  <td className={`${td} tabular-nums text-bone`}>{item.publishOrder}</td>
                  <td className={`${td} text-bone`}>{item.variant}</td>
                  <td className={`${td} font-mono text-bone-muted`}>{item.exampleId}</td>
                  <td className={`${td} text-bone-muted`}>{item.settings.lesson}</td>
                  <td className={`${td} text-bone-muted`}>{item.settings.hook}</td>
                  <td className={`${td} text-bone-muted`}>{item.settings.durationSec}s</td>
                  <td className={`${td} text-bone-muted`}>{item.settings.cta}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="mt-2 text-xs text-bone-faint">
            Specs: <a className="underline" href={`/growth/specs?recommendation=${rec.id}`}>/growth/specs?recommendation={rec.id}</a>
          </p>
        </div>
      )}

      <form action={reviewAction} className="mt-5 grid gap-3">
        <input type="hidden" name="id" value={rec.id} />
        <fieldset className="flex flex-wrap gap-4 text-sm text-bone">
          <label><input type="radio" name="decision" value="accept" required /> Accept</label>
          <label><input type="radio" name="decision" value="revise" /> Revise (edit JSON below)</label>
          <label><input type="radio" name="decision" value="reject" /> Reject</label>
        </fieldset>
        <textarea name="reason" required rows={2} maxLength={1000} placeholder="Reason (required). Recorded as editorial context, never as evidence." className={input} />
        {body.kind === "experiment" && (
          <details>
            <summary className="cursor-pointer text-sm text-bone-muted">Revise: edit the proposal JSON</summary>
            <textarea name="revision" rows={14} defaultValue={JSON.stringify({ kind: body.kind, experiment: body.experiment, items: body.items }, null, 2)} className={`${input} mt-2 font-mono text-xs`} />
            <p className="mt-1 text-xs text-bone-faint">Only read when “Revise” is chosen. Revisions are re-validated: approved, unused examples only, one factor, every piece readable in its duration.</p>
          </details>
        )}
        <div><button type="submit" className={button}>Record review</button></div>
      </form>
    </article>
  );
}

function ExperimentCard({ e, pieces }: { e: ExperimentRow; pieces: PieceRow[] }) {
  const r = e.results;
  return (
    <article className={`${card} mt-4`}>
      <p className="font-mono text-[10px] tracking-[0.16em] text-bone-faint uppercase">
        {e.id} · {e.kind} · {e.status} · started {date(e.started_at)} · {e.platform ?? "—"}
      </p>
      <p className="mt-2 text-bone">{e.hypothesis}</p>
      <p className="mt-2 text-sm text-bone-muted">
        Evidence: <span className="text-gold">{e.evidence ?? "not evaluated yet"}</span> · Decision: <span className="text-gold">{e.decision ?? "—"}</span>
      </p>
      {e.decision_reason && <p className="mt-1 text-sm text-bone-muted">{e.decision_reason}</p>}
      {e.learning && <p className="mt-1 text-sm text-bone">Learning: {e.learning}</p>}

      {r && (
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[36rem] border-collapse text-sm">
            <thead><tr className="border-y border-line"><th className={th}>Arm</th><th className={th}>Matured / planned</th><th className={th}>Mean {metricLabels[e.primary_metric]}</th><th className={th}>Visitors</th><th className={th}>Purchases</th><th className={th}>Net revenue</th></tr></thead>
            <tbody>
              {r.arms.map((arm) => (
                <tr key={arm.key} className="border-b border-line/60">
                  <td className={`${td} text-bone`}>{arm.key}</td>
                  <td className={`${td} tabular-nums text-bone-muted`}>{arm.matured} / {arm.planned}</td>
                  <td className={`${td} tabular-nums text-bone`}>{arm.primaryMean === null ? "—" : arm.primaryMean.toFixed(3)}</td>
                  <td className={`${td} tabular-nums text-bone-muted`}>{number.format(arm.pooled.visitors)}</td>
                  <td className={`${td} tabular-nums text-bone-muted`}>{arm.pooled.purchases}</td>
                  <td className={`${td} tabular-nums text-bone-muted`}>{formatPrice(arm.pooled.netRevenueCents)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {r.comparisons.map((c) => (
            <p key={c.treatment} className="mt-2 text-sm text-bone-muted">
              Permutation test ({c.exact ? `exact, ${c.relabellings} relabellings` : "Monte Carlo"}): difference {c.diff.toFixed(3)}, p = {c.pValue.toFixed(3)}, alpha {c.alpha}.
            </p>
          ))}
          {!r.ready && <p className="mt-2 text-sm text-bone-faint">Interim numbers only: the test is evaluated once every planned piece has completed its horizon.</p>}
          <ul className="mt-2 list-disc pl-5 text-xs text-bone-faint">
            {[...r.readinessNotes, ...r.confounders].map((note) => <li key={note}>{note}</li>)}
          </ul>
        </div>
      )}

      {pieces.length > 0 && (
        <p className="mt-3 text-xs text-bone-faint">
          Pieces: {pieces.map((p) => `${p.content_id} (${p.variant}, ${p.status})`).join(" · ")} ·{" "}
          <a className="underline" href={`/growth/specs?experiment=${e.id}`}>specs</a>
        </p>
      )}
    </article>
  );
}

function PieceQueue({ pieces }: { pieces: PieceRow[] }) {
  const open = pieces
    .filter((p) => p.status !== "published" && p.status !== "retired")
    .sort((a, b) => (a.spec?.publishOrder ?? 0) - (b.spec?.publishOrder ?? 0));
  if (open.length === 0) return null;
  return (
    <section className="mt-12">
      <h2 className={h2}>Pieces awaiting publication</h2>
      <p className="mt-3 max-w-2xl text-sm text-bone-muted">
        Render each with <code className="font-mono text-bone">npm run render:short</code>, review the video, then move it along.
        Approval requires an approved example; publishing requires approval and the post&apos;s URL. Publish in the listed order, one a day.
      </p>
      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[48rem] border-collapse text-sm">
          <thead><tr className="border-y border-line"><th className={th}>Piece</th><th className={th}>Order</th><th className={th}>Arm</th><th className={th}>Example</th><th className={th}>Status</th><th className={th}>Tracked link</th><th className={th}>Move to</th></tr></thead>
          <tbody>
            {open.map((p) => {
              const example = p.example_id ? exampleById(p.example_id) : null;
              const path = p.spec ? specTrackedPath(p.spec) : null;
              return (
                <tr key={p.content_id} className="border-b border-line/60">
                  <td className={`${td} font-mono text-bone`}>{p.content_id}</td>
                  <td className={`${td} tabular-nums text-bone-muted`}>{p.spec?.publishOrder ?? "—"}</td>
                  <td className={`${td} text-bone-muted`}>{p.variant}</td>
                  <td className={`${td} text-bone-muted`}>{p.example_id} {example && example.status !== "approved" && <span className="text-gold">({example.status})</span>}</td>
                  <td className={`${td} text-bone`}>{p.status}</td>
                  <td className={`${td} font-mono text-xs text-bone-faint`}>{path ? `${siteUrl}${path}` : "—"}</td>
                  <td className={td}>
                    <form action={pieceStatusAction} className="flex flex-wrap items-center gap-2">
                      <input type="hidden" name="contentId" value={p.content_id} />
                      <select name="status" className={`${input} w-auto`} defaultValue="">
                        <option value="" disabled>status…</option>
                        <option value="in_review">in review</option>
                        <option value="approved">approved</option>
                        <option value="published">published</option>
                        <option value="draft">draft</option>
                        <option value="retired">retired</option>
                      </select>
                      <input name="publishedUrl" type="url" placeholder="post URL (to publish)" className={`${input} w-44`} />
                      <input name="publishedOn" type="date" className={`${input} w-36`} />
                      <button type="submit" className={button}>Save</button>
                    </form>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function Performance({ snap30, snap7 }: { snap30: Snapshot | null; snap7: Snapshot | null }) {
  const content = snap30?.data.content ?? [];
  const steps = snap30?.data.steps ?? [];
  const neck = snap30?.data.bottleneck ?? null;
  const changes = snap7?.data.changes ?? [];
  return (
    <section className="mt-12">
      <h2 className={h2}>Funnel · last 30 days</h2>
      {steps.length === 0 ? (
        <p className={`${card} mt-4 text-bone-muted`}>No snapshot yet. The first analytics run writes one.</p>
      ) : (
        <>
          <ul className="mt-4 divide-y divide-line border-y border-line text-sm">
            {steps.map((s) => (
              <li key={s.to} className="flex flex-wrap justify-between gap-2 py-2">
                <span className="text-bone">{s.from} → {s.to}</span>
                <span className="text-bone-muted tabular-nums">
                  {number.format(s.advanced)} of {number.format(s.entered)} · {percent(s.rate)} ({percent(s.low)}–{percent(s.high)})
                </span>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-sm text-bone-muted">
            {neck
              ? `Largest drop-off: ${neck.from} → ${neck.to}. There is no external benchmark; this is where the leak is largest, not proof it is abnormal. The checkout step can be reached without the challenge, so the chain is approximate.`
              : "Too little traffic to name a bottleneck (each step needs 20 entrants)."}
          </p>
          {changes.some((c) => c.notable) && (
            <ul className="mt-3 list-disc pl-5 text-sm text-gold">
              {changes.filter((c) => c.notable).map((c) => (
                <li key={c.metric}>{c.metric}: {percent(c.previous.rate)} → {percent(c.current.rate)} week on week (99% interval excludes zero).</li>
              ))}
            </ul>
          )}
        </>
      )}

      <h2 className={`${h2} mt-12`}>Content by commercial result · last 30 days</h2>
      <p className="mt-3 max-w-2xl text-sm text-bone-muted">
        Ranked by net (refund-adjusted) revenue, then purchases, challenge starts and visitors. Visitors are distinct browsers, not people.
        Rows marked * have fewer than 30 visitors: read them as anecdotes. Impressions appear only where they were imported and the piece&apos;s whole life is inside the window.
      </p>
      {content.length === 0 ? (
        <p className={`${card} mt-4 text-bone-muted`}>No attributed traffic in the window.</p>
      ) : (
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[52rem] border-collapse text-sm">
            <thead><tr className="border-y border-line"><th className={th}>Content</th><th className={th}>Hook</th><th className={th}>Visitors</th><th className={th}>Starts</th><th className={th}>Done</th><th className={th}>Checkouts</th><th className={th}>Sales</th><th className={th}>Refunds</th><th className={th}>Net</th><th className={th}>Net / visitor</th><th className={th}>Visitors / 1k impr.</th></tr></thead>
            <tbody>
              {content.map((row) => (
                <tr key={row.contentId} className="border-b border-line/60">
                  <td className={`${td} font-mono text-bone`}>{row.contentId}{row.smallSample ? "*" : ""}</td>
                  <td className={`${td} text-bone-muted`}>{row.settings?.hook ?? "—"}</td>
                  <td className={`${td} tabular-nums text-bone-muted`}>{number.format(row.metrics.visitors)}</td>
                  <td className={`${td} tabular-nums text-bone-muted`}>{row.metrics.challengeStarts}</td>
                  <td className={`${td} tabular-nums text-bone-muted`}>{row.metrics.challengeCompletions}</td>
                  <td className={`${td} tabular-nums text-bone-muted`}>{row.metrics.checkoutStarts}</td>
                  <td className={`${td} tabular-nums text-bone`}>{row.metrics.purchases}</td>
                  <td className={`${td} tabular-nums text-bone-muted`}>{row.metrics.refunds}</td>
                  <td className={`${td} tabular-nums font-semibold text-gold`}>{formatPrice(row.metrics.netRevenueCents)}</td>
                  <td className={`${td} tabular-nums text-bone-muted`}>{row.netRevenuePerVisitor === null ? "—" : formatPrice(Math.round(row.netRevenuePerVisitor))}</td>
                  <td className={`${td} tabular-nums text-bone-muted`}>{row.visitorsPer1kImpressions === null ? "—" : row.visitorsPer1kImpressions.toFixed(1)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {(snap30?.data.factors ?? []).length > 0 && (
        <>
          <h2 className={`${h2} mt-12`}>By setting · observational</h2>
          <p className="mt-3 max-w-2xl text-sm text-bone-muted">
            Not experiments. These pieces were not randomised across settings, so each comparison mixes the setting with publish date, example and
            distribution, and the intervals treat visitors as independent, which understates the uncertainty. Use it to choose what to test.
          </p>
          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            {(snap30?.data.factors ?? []).map((f) => (
              <div key={f.factor} className={card}>
                <p className="font-mono text-[10px] tracking-[0.16em] text-bone-faint uppercase">{f.factor}</p>
                <ul className="mt-2 text-sm">
                  {f.levels.map((l) => (
                    <li key={l.level} className="flex justify-between gap-2 py-1">
                      <span className="text-bone">{l.level} <span className="text-bone-faint">({l.pieces})</span></span>
                      <span className="text-bone-muted tabular-nums">
                        {l.visitors} vis · start {percent(l.startRate.rate)} ({percent(l.startRate.low)}–{percent(l.startRate.high)}) · {l.purchases} sales
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </>
      )}
    </section>
  );
}

function ImportForm() {
  return (
    <section className="mt-12">
      <h2 className={h2}>Import platform metrics</h2>
      <p className="mt-3 max-w-2xl text-sm text-bone-muted">
        Impressions, views and watch time are only visible inside each platform. Paste them from the platform&apos;s analytics as CSV;
        blank cells stay blank and nothing is estimated. Re-importing the same piece, platform and date replaces that row.
      </p>
      <form action={importAction} className="mt-4 grid gap-3">
        <textarea name="csv" rows={6} className={`${input} font-mono text-xs`} placeholder={`${IMPORT_COLUMNS.join(",")}\nEPM-004,youtube-shorts,2026-10-22,5120,1830,11.4,`} />
        <div><button type="submit" className={button}>Import</button></div>
      </form>
    </section>
  );
}

export default async function ExperimentsPage({ searchParams }: PageProps<"/growth/experiments">) {
  const params = await searchParams;
  const token = (await cookies()).get(ADMIN_COOKIE)?.value;
  if (!isAuthorizedToken(token)) {
    return (
      <main className="flex flex-1 items-center justify-center px-5 py-24">
        <div className="max-w-md">
          <h1 className="text-2xl font-semibold text-bone">Experiments</h1>
          <p className="mt-4 leading-relaxed text-bone-muted">
            Sign in on <Link href="/growth" className="underline">/growth</Link> with “Remember me on this device” first.
          </p>
        </div>
      </main>
    );
  }

  const notice = typeof params.notice === "string" ? params.notice : null;
  const isError = params.error === "1";
  const data = await load();

  return (
    <main className="flex-1">
      <div className="mx-auto max-w-6xl px-5 pt-14 pb-20 sm:px-8">
        <p className="text-sm text-bone-faint"><Link href="/growth" className="underline">Growth</Link> /</p>
        <h1 className="mt-1 text-3xl font-bold text-bone uppercase sm:text-4xl">Experiments</h1>
        <p className="mt-3 max-w-2xl text-bone-muted">
          Proposals from the six-hour analytics job, the experiments you accepted, and what each piece earned. Your reviews are editorial
          decisions and are kept apart from the evidence.
        </p>
        {notice && <p className={`mt-6 border p-4 text-sm ${isError ? "border-gold text-gold" : "border-line text-bone"}`}>{notice}</p>}

        {!data ? (
          <p className={`${card} mt-10 text-bone-muted`}>Supabase is not configured.</p>
        ) : "error" in data ? (
          <p className={`${card} mt-10 text-bone-muted`}>
            Could not read the experiment tables ({data.error}). Run <code className="font-mono">supabase/migrations/0005_content_experiments.sql</code>.
          </p>
        ) : (
          <>
            <Health runs={data.runs} now={data.loadedAt} />

            <section className="mt-12">
              <h2 className={h2}>Review queue</h2>
              {data.recs.filter((r) => r.status === "proposed").length === 0 ? (
                <p className={`${card} mt-4 text-bone-muted`}>Nothing awaiting review.</p>
              ) : (
                data.recs.filter((r) => r.status === "proposed").map((rec) => <ProposalCard key={rec.id} rec={rec} />)
              )}
            </section>

            <section className="mt-12">
              <h2 className={h2}>Running experiments</h2>
              {data.experiments.filter((e) => e.status === "running").length === 0 ? (
                <p className={`${card} mt-4 text-bone-muted`}>No experiment running.</p>
              ) : (
                data.experiments
                  .filter((e) => e.status === "running")
                  .map((e) => <ExperimentCard key={e.id} e={e} pieces={data.pieces.filter((p) => p.experiment_id === e.id)} />)
              )}
            </section>

            <PieceQueue pieces={data.pieces} />
            <Performance snap30={data.snap30} snap7={data.snap7} />

            <section className="mt-12">
              <h2 className={h2}>Decision history</h2>
              {data.experiments.filter((e) => e.status !== "running").map((e) => (
                <ExperimentCard key={e.id} e={e} pieces={data.pieces.filter((p) => p.experiment_id === e.id)} />
              ))}
              <ul className="mt-4 divide-y divide-line border-y border-line text-sm">
                {data.recs.filter((r) => r.status !== "proposed").map((r) => (
                  <li key={r.id} className="py-2">
                    <span className="text-bone">{r.title}</span>{" "}
                    <span className="text-bone-faint">— {r.status} {date(r.reviewed_at)}{r.experiment_id ? ` → ${r.experiment_id}` : ""}{r.review_reason ? `: ${r.review_reason}` : ""}</span>
                  </li>
                ))}
              </ul>
            </section>

            <ImportForm />
          </>
        )}
      </div>
    </main>
  );
}
