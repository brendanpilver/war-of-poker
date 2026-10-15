/**
 * End-to-end demonstration of the content experiment engine, on the isolated
 * Docker database in this folder, with SYNTHETIC data only.
 *
 *   docker compose -f scripts/experiment-demo/docker-compose.yml up -d
 *   scripts/experiment-demo/apply-migrations.sh
 *   npm run demo:experiments
 *
 * It runs the real job, planner, evaluation, review and renderer -- nothing
 * here re-implements them -- over simulated time:
 *
 *   gen 1  engine proposes a hook test → accepted → 8 pieces "published" →
 *          interim run (no peeking) → evaluation: supported → replicate
 *   gen 2  replication → supported → financial hook adopted as baseline
 *   gen 3  next proposal holds the new baseline and tests a new hook level,
 *          judged on impressions now that they are imported → inconclusive
 *   gen 4  engine proposes a re-test, not a winner → revised video rendered
 *
 * Plus: idempotency, Row Level Security, and failure monitoring checks.
 *
 * Every synthetic row is labelled: sessions `synthetic-…`, emails
 * `synthetic+…@example.invalid`, Stripe ids `cs_synthetic_…`, post URLs on
 * example.invalid. The demo's examples are copies of the eight candidate
 * hands marked approved *for the demo only*; no real approval is implied, and
 * every rendered frame is watermarked DRAFT.
 *
 * Output: renders/experiment-demo/ (report.md, results.json, videos).
 */

import { createHmac } from "node:crypto";
import { execFileSync } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { createServer } from "node:http";
import { join, resolve } from "node:path";

const GATEWAY = "http://127.0.0.1:54399";
const JWT_SECRET = "demo-only-jwt-secret-not-for-any-real-project-0001";
const OUT = resolve("renders/experiment-demo");
const COMPOSE = ["compose", "-f", "scripts/experiment-demo/docker-compose.yml"];

function jwt(role: string): string {
  const b64 = (v: object) => Buffer.from(JSON.stringify(v)).toString("base64url");
  const body = `${b64({ alg: "HS256", typ: "JWT" })}.${b64({ role, iss: "wop-demo", exp: 4102444800 })}`;
  return `${body}.${createHmac("sha256", JWT_SECRET).update(body).digest("base64url")}`;
}

// --- External monitor stand-in: records every ping the job sends ----------
const pings: { at: string; path: string; body: string }[] = [];
const monitor = createServer((req, res) => {
  let body = "";
  req.on("data", (c) => (body += c));
  req.on("end", () => {
    pings.push({ at: new Date().toISOString(), path: req.url ?? "", body: body.slice(0, 200) });
    res.end("OK");
  });
});
await new Promise<void>((r) => monitor.listen(0, "127.0.0.1", r));
const monitorPort = (monitor.address() as { port: number }).port;

// The application reads its configuration at import, so set it first.
process.env.SUPABASE_URL = GATEWAY;
process.env.SUPABASE_SERVICE_ROLE_KEY = jwt("service_role");
process.env.HEALTHCHECK_PING_URL = `http://127.0.0.1:${monitorPort}/demo-check`;
delete process.env.OPERATOR_EMAIL;

const { supabaseAdmin } = await import("../../src/lib/supabase");
const { runAnalyticsJob } = await import("../../src/lib/experiments/job");
const { reviewRecommendation, setPieceStatus, importMetrics } = await import("../../src/lib/experiments/review");
const { marketingExamples } = await import("../../src/lib/experiments/examples");
const { renderShort, DEFAULT_NARRATION } = await import("../render-pipeline");
type MarketingExample = (typeof marketingExamples)[number];

const db = supabaseAdmin();
if (!db) throw new Error("Supabase client not configured");

const log: string[] = [];
const say = (line = "") => {
  log.push(line);
  console.log(line);
};

// --- Demo examples: copies of the eight candidates, approved for the demo --
const candidates = marketingExamples.filter((e) => /^mx-00[2-9]$/.test(e.id));
const demoExamples: MarketingExample[] = [1, 2, 3, 4].flatMap((gen) =>
  candidates.map((e) => ({
    ...e,
    id: `demo-g${gen}-${e.id}`,
    status: "approved" as const,
    provenance: { ...e.provenance, reviewedBy: "SYNTHETIC DEMO ONLY — not an editorial approval", reviewedOn: "2026-10-15" },
  })),
);
const lookup = (id: string) => demoExamples.find((e) => e.id === id) ?? null;

// --- Reset the demo database ------------------------------------------------
async function reset() {
  for (const table of ["operator_reports", "recommendations", "analytics_snapshots", "analytics_runs", "content_metric_imports", "events", "purchases", "subscribers", "content_pieces", "experiments"]) {
    const { error } = await db!.from(table).delete().not(table === "content_pieces" ? "content_id" : "id", "is", null);
    if (error) throw new Error(`reset ${table}: ${error.message}`);
  }
}

// --- Synthetic traffic ------------------------------------------------------
type Outcome = { visitors: number; impressions: number };

async function insertAll(table: string, rows: object[]) {
  for (let i = 0; i < rows.length; i += 500) {
    const { error } = await db!.from(table).insert(rows.slice(i, i + 500));
    if (error) throw new Error(`${table}: ${error.message}`);
  }
}

const HOUR = 3_600_000;
const DAY = 24 * HOUR;

/**
 * One piece's first week: page views (with reloads), challenge starts and
 * completions, server checkouts, purchases, captures, and a platform import.
 */
async function simulate(contentId: string, publishedAt: string, o: Outcome, refundOne = false) {
  const t0 = Date.parse(publishedAt);
  const events: object[] = [];
  const at = (n: number, extra = 0) => new Date(t0 + (n % 6) * DAY + (n % 11) * HOUR + extra * 60_000).toISOString();
  const starts = Math.round(o.visitors * 0.45);
  const completions = Math.round(starts * 0.6);
  const checkouts = Math.round(completions * 0.25);
  const purchases = Math.round(checkouts * 0.6);
  for (let n = 0; n < o.visitors; n++) {
    const session = `synthetic-${contentId}-${n}`;
    const base = { session_id: session, content_id: contentId, platform: "youtube-shorts", props: { synthetic: true } };
    for (let r = 0; r <= n % 3; r++) events.push({ ...base, name: "page_view", created_at: at(n, r) });
    if (n < starts) events.push({ ...base, name: "quiz_started", created_at: at(n, 5) });
    if (n < completions) events.push({ ...base, name: "quiz_completed", created_at: at(n, 9) });
    if (n < checkouts) {
      events.push({ ...base, name: "checkout_started", created_at: at(n, 11), props: { synthetic: true, source: "browser" } });
      events.push({ ...base, name: "checkout_started", created_at: at(n, 11), props: { synthetic: true, source: "server" } });
    }
  }
  await insertAll("events", events);
  await insertAll(
    "purchases",
    Array.from({ length: purchases }, (_, n) => ({
      stripe_checkout_session_id: `cs_synthetic_${contentId}_${n}`,
      email: `synthetic+${contentId.toLowerCase()}-${n}@example.invalid`,
      offer_id: n % 3 === 2 ? "system" : "system-quiz",
      product: "complete-system",
      amount_cents: n % 3 === 2 ? 3900 : 2900,
      status: refundOne && n === 0 ? "refunded" : "paid",
      session_id: `synthetic-${contentId}-${n}`,
      content_id: contentId,
      created_at: at(n, 13),
      delivery_emailed_at: at(n, 14),
    })),
  );
  await insertAll(
    "subscribers",
    Array.from({ length: Math.round(completions * 0.3) }, (_, n) => ({
      email: `synthetic+lead-${contentId.toLowerCase()}-${n}@example.invalid`,
      source: "challenge",
      content_id: contentId,
      created_at: at(n, 10),
    })),
  );
  const captured = new Date(t0 + 7 * DAY).toISOString().slice(0, 10);
  const imported = await importMetrics(
    db!,
    `content_id,platform,captured_on,impressions,views\n${contentId},youtube-shorts,${captured},${o.impressions},${Math.round(o.impressions * 0.4)}`,
    new Date(t0 + 7 * DAY + HOUR),
  );
  if (!imported.ok) throw new Error(imported.message);
}

/** Unattributed background traffic, so site-wide numbers are not all content. */
async function background(from: Date, days: number) {
  const events: object[] = [];
  for (let n = 0; n < 40 * days; n++) {
    const created_at = new Date(from.getTime() + (n / 40) * DAY).toISOString();
    const base = { session_id: `synthetic-direct-${from.getTime()}-${n}`, content_id: null, props: { synthetic: true } };
    events.push({ ...base, name: "page_view", created_at });
    if (n % 4 === 0) events.push({ ...base, name: "quiz_started", created_at });
  }
  await insertAll("events", events);
}

// --- Steps --------------------------------------------------------------------
type Rec = { id: string; title: string; kind: string; body: Record<string, unknown> & { items: { variant: string; settings: Record<string, unknown>; exampleId: string; publishOrder: number; series: string }[]; rationale: string[]; evidenceNotes: string[]; experiment: Record<string, unknown> } };

async function job(when: string, label: string, force = false) {
  const result = await runAnalyticsJob({ now: new Date(when), force, examples: demoExamples });
  say(`- **${label}** — job at ${when}: HTTP ${result.status}${result.skipped ? `, skipped: ${result.skipped}` : ""}${result.error ? `, error: ${result.error}` : ""}`);
  return result;
}

async function openProposals(): Promise<Rec[]> {
  const { data, error } = await db!.from("recommendations").select("id, title, kind, body").eq("status", "proposed").order("created_at");
  if (error) throw new Error(error.message);
  return (data ?? []) as Rec[];
}

function describeProposal(rec: Rec) {
  const e = rec.body.experiment as { variants: { key: string; settings: object }[]; heldConstant: object; primaryMetric: string; hypothesis: string };
  say(`  - Proposal: **${rec.title}** (${rec.kind})`);
  say(`    - Arms: ${e.variants.map((v) => `${v.key} ${JSON.stringify(v.settings)}`).join(" vs ")}`);
  say(`    - Held constant: ${JSON.stringify(e.heldConstant)}; series ${[...new Set(rec.body.items.map((i) => i.series))].join(",") || "—"}`);
  say(`    - Primary metric: ${e.primaryMetric}`);
  for (const line of rec.body.rationale) say(`    - Why: ${line}`);
  for (const line of rec.body.evidenceNotes.slice(0, 4)) say(`    - Evidence: ${line}`);
}

async function accept(rec: Rec, when: string) {
  const outcome = await reviewRecommendation(
    db!,
    { id: rec.id, decision: "accept", reason: "SYNTHETIC DEMO: accepted to exercise the loop. Not an editorial decision.", revision: null },
    new Date(when),
    lookup,
  );
  say(`  - Review: ${outcome.message}`);
  if (!outcome.ok) throw new Error(outcome.message);
  const { data } = await db!.from("recommendations").select("experiment_id").eq("id", rec.id).single();
  return data?.experiment_id as string;
}

/** Moves each piece through review to published, one a day, then simulates its week. */
async function publish(experimentId: string, firstDay: string, outcomes: Record<string, Outcome[]>, refund = false) {
  const { data } = await db!.from("content_pieces").select("content_id, variant, spec").eq("experiment_id", experimentId);
  const pieces = (data ?? []).sort((a, b) => a.spec.publishOrder - b.spec.publishOrder);
  const used: Record<string, number> = {};
  for (const [i, piece] of pieces.entries()) {
    const day = new Date(Date.parse(`${firstDay}T15:00:00Z`) + i * DAY);
    const date = day.toISOString().slice(0, 10);
    for (const status of ["in_review", "approved", "published"]) {
      const r = await setPieceStatus(
        db!,
        { contentId: piece.content_id, status, publishedUrl: `https://example.invalid/synthetic/${piece.content_id}`, publishedOn: date },
        day,
        lookup,
      );
      if (!r.ok) throw new Error(r.message);
    }
    const k = used[piece.variant] ?? 0;
    used[piece.variant] = k + 1;
    await simulate(piece.content_id, `${date}T12:00:00.000Z`, outcomes[piece.variant][k], refund && piece.variant === "treatment" && k === 0);
  }
  say(`  - Published ${pieces.length} pieces of ${experimentId}, one a day from ${firstDay} (synthetic posts), and simulated each piece's first week.`);
  await background(new Date(`${firstDay}T00:00:00Z`), pieces.length + 7);
}

async function experimentSummary(id: string) {
  const { data } = await db!.from("experiments").select("id, status, evidence, decision, decision_reason, learning, primary_metric, results").eq("id", id).single();
  const r = data?.results as { arms: { key: string; matured: number; planned: number; primaryMean: number | null; pieces: { value: number | null }[] }[]; comparisons: { pValue: number; diff: number; exact: boolean }[] } | null;
  say(`  - ${id}: status **${data?.status}**, evidence **${data?.evidence}**, decision **${data?.decision}** (primary: ${data?.primary_metric})`);
  for (const arm of r?.arms ?? []) {
    say(`    - ${arm.key}: ${arm.matured}/${arm.planned} matured; per-piece values ${arm.pieces.map((p) => (p.value === null ? "—" : p.value.toFixed(2))).join(", ")}; mean ${arm.primaryMean?.toFixed(2) ?? "—"}`);
  }
  for (const c of r?.comparisons ?? []) say(`    - Permutation test (${c.exact ? "exact" : "Monte Carlo"}): difference ${c.diff.toFixed(2)}, p = ${c.pValue.toFixed(3)}`);
  say(`    - Reason: ${data?.decision_reason}`);
  if (data?.learning) say(`    - Learning: ${data.learning}`);
  return data;
}

const generations: { gen: string; experiment: string; arms: string; held: string; primary: string; why: string }[] = [];
function recordGeneration(gen: string, experimentId: string, rec: Rec) {
  const e = rec.body.experiment as { variants: { key: string; settings: object }[]; heldConstant: Record<string, unknown>; primaryMetric: string };
  generations.push({
    gen,
    experiment: experimentId,
    arms: e.variants.map((v) => `${v.key}: ${Object.values(v.settings).join(",")}`).join(" / "),
    held: `hook=${e.heldConstant.hook ?? "(varied)"}, ${e.heldConstant.durationSec}s, ${e.heldConstant.pacing}, cta=${e.heldConstant.cta}`,
    primary: e.primaryMetric,
    why: rec.body.rationale[0],
  });
}

// =============================================================================
await mkdir(OUT, { recursive: true });
say("# Content experiment engine — synthetic end-to-end demonstration");
say();
say(`Run ${new Date().toISOString()} against the isolated Docker database (Postgres 16 + PostgREST 12, max 1,000 rows per response). **All data below is synthetic.**`);
say();
await reset();

say("## Generation 1 — the engine's first proposal");
await job("2026-11-02T12:05:00Z", "R1 (Monday)");
let [rec] = (await openProposals()).filter((r) => r.kind === "experiment");
describeProposal(rec);
const exp1 = await accept(rec, "2026-11-02T13:00:00Z");
recordGeneration("1", exp1, rec);
const firstSpecs = rec.body.items;
await publish(exp1, "2026-11-03", {
  control: [22, 25, 19, 24].map((v, i) => ({ visitors: v, impressions: [3800, 4200, 3600, 4100][i] })),
  treatment: [41, 37, 45, 39].map((v, i) => ({ visitors: v, impressions: [4000, 3900, 4300, 3700][i] })),
}, true);

say();
say("### Interim look (no peeking)");
await job("2026-11-07T06:05:00Z", "R2 (interim, day 5)");
await experimentSummary(exp1);

say();
say("### Evaluation");
await job("2026-11-18T12:05:00Z", "R3 (all pieces past their 7-day horizon)");
await experimentSummary(exp1);

say();
say("## Generation 2 — replication before adoption");
[rec] = (await openProposals()).filter((r) => r.kind === "experiment");
describeProposal(rec);
const exp2 = await accept(rec, "2026-11-18T13:00:00Z");
recordGeneration("2", exp2, rec);
await publish(exp2, "2026-11-19", {
  control: [20, 26, 23, 21].map((v, i) => ({ visitors: v, impressions: [4100, 4500, 3900, 4300][i] })),
  treatment: [38, 44, 35, 40].map((v, i) => ({ visitors: v, impressions: [4200, 4000, 4400, 3800][i] })),
});
await job("2026-12-04T12:05:00Z", "R4");
await experimentSummary(exp2);

say();
say("## Generation 3 — new baseline, new question");
[rec] = (await openProposals()).filter((r) => r.kind === "experiment");
describeProposal(rec);
const exp3 = await accept(rec, "2026-12-04T13:00:00Z");
recordGeneration("3", exp3, rec);
await publish(exp3, "2026-12-05", {
  control: [36, 41, 33, 44].map((v, i) => ({ visitors: v, impressions: [4200, 4000, 3900, 4400][i] })),
  treatment: [56, 34, 58, 41].map((v, i) => ({ visitors: v, impressions: [4100, 4300, 4000, 4200][i] })),
});
await job("2026-12-21T18:05:00Z", "R5 (Monday)");
await experimentSummary(exp3);

say();
say("## Generation 4 — what the engine proposes after an inconclusive test");
const finalProposals = await openProposals();
[rec] = finalProposals.filter((r) => r.kind === "experiment");
describeProposal(rec);
recordGeneration("4 (proposed)", "—", rec);

say();
say("## How feedback changed the configuration");
say();
say("| Gen | Experiment | Arms (varied setting) | Held constant | Primary metric | Why the engine chose it |");
say("| --- | --- | --- | --- | --- | --- |");
for (const g of generations) say(`| ${g.gen} | ${g.experiment} | ${g.arms} | ${g.held} | ${g.primary} | ${g.why} |`);

// --- Idempotency ----------------------------------------------------------
say();
say("## Idempotency");
const again = await job("2026-12-21T19:30:00Z", "Same slot again");
const forced = await job("2026-12-21T19:31:00Z", "Same slot, forced rerun", true);
const { count: snapCount } = await db.from("analytics_snapshots").select("id", { count: "exact", head: true }).eq("run_key", "2026-12-21T18");
const { count: openCount } = await db.from("recommendations").select("id", { count: "exact", head: true }).eq("status", "proposed");
const { data: runRow } = await db.from("analytics_runs").select("attempts, status").eq("run_key", "2026-12-21T18").single();
say(`  - Repeat call: ${again.skipped ?? "not skipped"} Forced rerun: HTTP ${forced.status}. Slot 2026-12-21T18 now has ${snapCount} snapshots (one per window), ${runRow?.attempts} attempts, status ${runRow?.status}; ${openCount} open proposal(s) (no duplicates).`);
const { data: reports } = await db.from("operator_reports").select("kind, period_key, sent_at, body_text").order("created_at");
say(`  - Reports stored: ${(reports ?? []).map((r) => `${r.kind} ${r.period_key}`).join(", ")} (OPERATOR_EMAIL unset, so stored, not sent).`);

// --- Row Level Security --------------------------------------------------
say();
say("## Row Level Security (anon key)");
for (const table of ["purchases", "experiments", "recommendations", "analytics_snapshots"]) {
  const res = await fetch(`${GATEWAY}/rest/v1/${table}?select=*`, { headers: { Authorization: `Bearer ${jwt("anon")}` } });
  say(`  - anon GET ${table}: HTTP ${res.status}, ${(await res.json() as unknown[]).length} rows visible`);
}
const anonWrite = await fetch(`${GATEWAY}/rest/v1/experiments`, {
  method: "POST",
  headers: { Authorization: `Bearer ${jwt("anon")}`, "Content-Type": "application/json" },
  body: JSON.stringify({ id: "EXP-999", hypothesis: "x", factors: ["hook"], variants: [], held_constant: {}, primary_metric: "visitors", plan: {} }),
});
say(`  - anon POST experiments: HTTP ${anonWrite.status} (refused)`);

// --- Monitoring -----------------------------------------------------------
say();
say("## External monitoring");
execFileSync("docker", [...COMPOSE, "stop", "gateway"], { stdio: "ignore" });
const down = await job("2026-12-22T00:05:00Z", "Database unreachable");
execFileSync("docker", [...COMPOSE, "start", "gateway"], { stdio: "ignore" });
for (let i = 0; i < 30; i++) {
  try { if ((await fetch(`${GATEWAY}/rest/v1/`)).status < 500) break; } catch { /* starting */ }
  await new Promise((r) => setTimeout(r, 500));
}
say(`  - With the database unreachable the job returned HTTP ${down.status} — which makes \`curl -f\` fail in cron — and could not record anything itself.`);
say(`  - Pings received by the stand-in monitor: ${pings.filter((p) => p.path.endsWith("/fail")).length} failure, ${pings.filter((p) => !p.path.endsWith("/fail")).length} success.`);
say(`  - Last ping: ${pings.at(-1)?.path} — ${pings.at(-1)?.body}`);

// --- Videos ----------------------------------------------------------------
say();
say("## Videos");
const logo = await readFile(resolve("public/brand/war-of-poker-stencil-logo.png"));
const logoHref = `data:image/png;base64,${logo.toString("base64")}`;
// The original baseline (generation 1's control arm) against the revised
// baseline the engine now proposes (generation 4's control arm).
const { data: firstPieces } = await db.from("content_pieces").select("spec").eq("experiment_id", exp1);
const original = (firstPieces ?? [])
  .map((r) => r.spec)
  .filter((s) => s.variant === "control")
  .sort((a, b) => a.publishOrder - b.publishOrder)[0] ?? firstSpecs[0];
const revised = { ...rec.body.items.filter((i) => i.variant === "control").sort((a, b) => a.publishOrder - b.publishOrder)[0], contentId: null };
for (const [label, spec] of [["generation-1", original], ["generation-4-revised", revised]] as const) {
  const example = lookup(spec.exampleId);
  if (!example) throw new Error(`no demo example ${spec.exampleId}`);
  const result = await renderShort({ ...spec, contentId: spec.contentId }, example, {
    outDir: join(OUT, label),
    draft: true,
    framesOnly: false,
    narration: DEFAULT_NARRATION,
    logoHref,
  });
  say(`  - ${label}: ${spec.exampleId}, hook **${spec.settings.hook}**, ${spec.settings.durationSec}s ${spec.settings.pacing}, series ${spec.series} → ${result.video?.replace(`${resolve(".")}/`, "")} (${result.mimeType}); frame lag ≤ ${((result.sync?.maxFrameLagSec ?? 0) * 1000).toFixed(0)} ms; narrated beats voiced: ${result.sync?.beats.filter((b) => b.voicedRms > 0.02).length}/${result.sync?.beats.length}`);
}

const weekly = (reports ?? []).filter((r) => r.kind === "weekly").at(-1);
if (weekly) {
  say();
  say(`## Weekly review generated at R5 (${weekly.period_key})`);
  say();
  say("```");
  say(weekly.body_text.trim());
  say("```");
}

await writeFile(join(OUT, "report.md"), `${log.join("\n")}\n`);
await writeFile(join(OUT, "results.json"), JSON.stringify({ generations, pings }, null, 2));
monitor.close();
console.log(`\nWrote ${join(OUT, "report.md")}`);
