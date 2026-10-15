# War of Poker — Content Experiment Engine

> **Status: implementation record, not doctrine.**
> This describes the closed-loop content system built on 2026-10-15 under the
> owner's explicit direction. It does **not** define brand, WARPLAN, or product
> doctrine — those live in the five canonical files listed in
> [`AGENTS.md`](../AGENTS.md), and nothing here overrides them. Short-form
> format rules come from [`SHORTS-CONTENT-FORMAT.md`](./SHORTS-CONTENT-FORMAT.md);
> the funnel it measures is described in
> [`GROWTH-ARCHITECTURE.md`](./GROWTH-ARCHITECTURE.md).
>
> **Not deployed.** The engine lives on the `feature/content-experiment-engine`
> branch and has been validated only against an isolated local database with
> synthetic data (§ Validation). It is not merged, not on staging, and not in
> production; activation waits until after the Short Stack PLO launch.

---

## The loop

```
DESIGN → GENERATE → PUBLISH → MEASURE → ANALYZE → LEARN → DESIGN NEXT GENERATION
```

| Stage | What does it | Where |
| ----- | ------------ | ----- |
| Design | The planner proposes the next batch as structured specs | `src/lib/experiments/planner.ts` |
| Approve | The operator accepts, revises or rejects, with a reason | `/growth/experiments`, `src/lib/experiments/review.ts` |
| Generate | Spec + approved example → timed script → frames → video | `script.ts`, `render.ts`, `scripts/render-short.ts` |
| Publish | A person posts it and marks it published with the URL | `/growth/experiments` |
| Measure | First-party events, purchases, refunds; imported platform numbers | existing funnel + `content_metric_imports` |
| Analyze | Six-hour job: snapshots, experiment evaluation | `src/lib/experiments/job.ts` via `POST /api/analytics/run` |
| Learn | Fixed-horizon decisions and carried-forward learnings | `experiments.decision`, `experiments.learning` |

Nothing in the loop publishes, changes a price, or writes poker. The engine
proposes; a person approves every batch, every example, and every video.

---

## The content spec

One JSON document per Short (`src/lib/experiments/spec.ts`), stored on the
piece as `content_pieces.spec` and read directly by the renderer:

```json
{
  "specVersion": 1,
  "engineVersion": "content-engine-1",
  "contentId": "EPM-004",
  "series": "EPM",
  "exampleId": "mx-001",
  "settings": {
    "hook": "financial-consequence",
    "lesson": "spr",
    "durationSec": 25,
    "countdownSec": 3,
    "pacing": "measured",
    "visual": "table-timeline",
    "cta": "challenge",
    "platform": "youtube-shorts",
    "template": "short-v1"
  },
  "experimentId": "EXP-001",
  "variant": "treatment",
  "recommendationId": "…",
  "publishOrder": 3
}
```

| Setting | Levels | Notes |
| ------- | ------ | ----- |
| `hook` | challenge, financial-consequence, common-mistake, curiosity | The first two are claim-free templates filled from the example's numbers. The last two use lines written into the example by a person; an example without one cannot take that hook. |
| `lesson` | the ten Challenge concepts + position, player-read | Matched across arms, never tested as a factor in V1. |
| `durationSec` | 15, 25, 40 | An example that cannot be read in the time is refused, not rushed. |
| `countdownSec` | 3, 5 | The reveal-timing setting. Beat order is fixed by the six-beat format. |
| `pacing` | brisk (default), measured | Caption speed (3.4 / 2.8 words a second) and narration speed (about 205 / 180 words a minute). The voice itself is not a variable. Brisk is the baseline because a narrated six-beat Short only fits 25 seconds at that pace. |
| `visual` | table, table-timeline | Cards, board, pot and stack always; the action timeline optionally. |
| `cta` | challenge, product-page, survival-card | **survival-card is unavailable**: the card is delivered only from the Challenge results screen, so there is no page a Survival Card Short could honestly send a viewer to. The engine never selects it. |
| `platform` | youtube-shorts, tiktok, instagram-reels | A blocking variable: one experiment runs on one platform. |
| `template` | short-v1 | Versioned so a template change is visible in the data. |

**Series and hook are independent.** The series is the existing editorial
line a piece belongs to (EPM, PRC, HIPR, HSEP in `src/lib/content/series.ts`,
unchanged) and the first part of its content ID; the hook is how its first
seconds are framed. An experiment holds the series constant across arms, so
a hook test never doubles as a series comparison. Engine batches publish
under **PRC** ("a single decision, answered and explained", the series whose
premise matches the six-beat format) — one constant, `DEFAULT_SERIES` in
`planner.ts`. A revised proposal may set a different series.

---

## Poker content: the example library

A spec never carries poker. It names an example in
`src/lib/experiments/examples.ts`, and every card, number, explanation and
principle on screen comes from there — or from a claim-free template filled
with that example's numbers (`hookLine`, the CTA).

- **Original hands only.** `tests/marketing-examples.test.ts` rejects any
  holding or flop that appears in the paid book or Capstone Quiz
  (`tests/paid-examples.fixture.ts`), the 10-Hand Challenge, or another
  example, and recomputes every card fact with the Omaha evaluator.
- **One Short per example.** The planner never assigns an example already
  attached to a piece, as the format rule forbids reusing a published hand.
- **Approval.** An example is `candidate` until the owner checks it, then
  `approved` with `reviewedBy` and `reviewedOn` filled in (a test enforces
  that pairing). The planner uses approved examples only, piece approval
  requires an approved example, and the renderer will draw a candidate only
  as a watermarked draft.
- **Principles cite the book.** `provenance.source` names the passage.

The library holds **nine candidates, none approved**:

| Id | Lesson | Spot | Decision |
| -- | ------ | ---- | -------- |
| mx-001 | spr | Top set, 3-bet pot, SPR ≈ 2 | Raise all-in |
| mx-002 | spr | Bare aces, three-way, SPR ≈ 5 | Fold |
| mx-003 | spr | Nut flush draw + wrap, 3-bet pot, SPR ≈ 2 | Raise all-in |
| mx-004 | nuttiness | Jack-high flush draw, four-way | Fold |
| mx-005 | nuttiness | Low straight facing bet and pot raise | Fold |
| mx-006 | draw-quality | Straight draw, ten nut rivers vs 33% price | Fold |
| mx-007 | draw-quality | Wrap, fourteen nut rivers vs 25% price | Call |
| mx-008 | price | Bluff-catcher vs a third-pot river bet | Call |
| mx-009 | price | Missed nut flush draw, five nut rivers vs 33% | Fold |

mx-002 to mx-009 are the first experiment's batch: four lessons, two hands
each. Each cites its book passage, and every card fact, out count, equity
and price is checked by `tests/marketing-examples.test.ts`. The approval
sheet is generated from the same data: `npm run approval:batch` writes
`renders/approval-batch.html`. **Until eight are approved, the engine can only
propose "approve examples"** — the correct behaviour, not a fault.

---

## Rendering

```bash
npm run render:short -- path/to/specs.json --out renders
```

Add `--draft` to render a candidate example (every frame watermarked),
`--silent` to skip narration, and `--frames-only` to skip the video.
`specs.json` may be one spec, an array, or the `{ "specs": [...] }` that
`/growth/specs?experiment=EXP-001` returns.

Per spec it writes `renders/<content id>/`: `spec.json`, `frames/*.svg`,
`narration/*.wav`, `captions.srt`, `copy.md` (description with the tracked
link, social post, timed narration script, article draft), `video.mp4`, and
`sync.json`.

**How** (`scripts/render-pipeline.ts`):

1. Each beat's line is turned into speech text (`spokenText`: "K-7-2" →
   "king, seven, two", "$246" → "two forty-six") and synthesised with macOS
   `say`, voice *Reed (English (US))*.
2. Each clip's speech is measured, and the timeline gives every beat at least
   its caption's reading time and its narration plus a breath. A spec that
   cannot be narrated in its duration is refused, not rushed.
3. `render.ts` draws one 1080 × 1920 SVG per beat — cuts, not animation.
4. Headless Google Chrome paints the frames to a canvas and plays the
   narration (plus a quiet tick each countdown second) on one AudioContext
   clock, recording both with the browser's own MediaRecorder: an H.264 + AAC
   MP4.
5. The finished file's audio is decoded and measured per beat; `sync.json`
   records each narrated beat's loudness, the silence after it, and how late
   any frame appeared after its line began.

**No dependency was added**: no Remotion, no ffmpeg, no npm package, no paid
API. The engine's own fit check uses an estimate of speaking time
(`speakingTime`, calibrated against this voice so that it errs long); the
`say` rate settings were measured, because the engine's rate is not linear.

**Where it runs.** On a Mac with Google Chrome — an operator laptop today.
**Not on Hostinger:** the production runtime is a managed Node.js web app with
no Chrome and no speech engine, and rendering is CPU work that has no place
beside checkout. Nothing in `src/` imports the renderer
(`tests/experiment-boundaries.test.ts`). Cost per Short: about 30–50 seconds
of one machine and nothing else, so a batch of eight takes under ten minutes.
A Linux runner would need Chrome plus a Linux speech engine (for example
Piper) — a dependency decision for the owner, not made here.

**Limits, stated plainly:** the voice is a stock synthetic voice, not River
Potter's; whether to keep it, record a human voice-over against the timed
narration script, or license a voice is open. The look is provisional: the
site's palette (sampled from the real logo and cover) and system fonts,
because `BRAND.md` has not chosen typefaces or colours.

---

## Measurement

Counting rules (`src/lib/experiments/metrics.ts`):

- **Funnel steps count browsers.** Distinct `session_id` per step — a
  `localStorage` id, so one browser on one device. Closer to people than page
  views; not people.
- **Checkouts** are the server's `checkout_started` only.
- **Sales** come from `purchases` (webhook-written), never from events.
  **Net revenue** excludes refunded purchases; refunds stay in the count of
  purchases made and feed the refund-rate guardrail.
- **Attribution is first touch**, as recorded. Non-content sources such as
  `email-welcome` are never credited to a piece.

What we can and cannot see:

| Metric | Source | Status |
| ------ | ------ | ------ |
| Visitors, challenge starts/completions, email captures, checkouts | `events`, `subscribers` | Automatic |
| Purchases, revenue, refunds, AOV | `purchases` | Automatic |
| Impressions, views, average view duration, link clicks | Each platform's analytics | **Manual CSV import** on `/growth/experiments`. YouTube needs an OAuth app (YouTube Analytics API); TikTok and Instagram need app review. Not built. |
| Retention curves | Platform only | Not collected |
| Cost, contribution profit | Nowhere yet | Not computed. No cost data exists, and nothing is estimated. |

A metric that needs missing data reports "no data", never zero. Revenue per
1,000 impressions appears only where impressions were imported.

**Known attribution leak:** an on-screen URL typed by hand carries no
`?src=`. Only the description or link-in-bio link credits a piece.

---

## Experiments

**The unit is the piece, not the viewer.** A platform decides how far each
video travels, so visitors from one video are not independent. The decision
test is an **exact permutation test on per-piece values** (`stats.ts`), which
assumes only that arm labels were assigned at random. Pooled Wilson intervals
are shown as description, never as proof.

Design rules the planner follows:

1. **One factor per experiment, two arms, one platform.** Everything else is
   held constant and listed.
2. **Lessons matched across arms.** Each pair is two different approved
   examples on one lesson; a seeded coin assigns them to arms.
3. **Randomised publication order within pairs**, one piece a day, so a
   trend in reach cannot line up with one arm.
4. **Four pieces per arm minimum.** With three, the smallest possible
   two-sided p-value is 0.1, so the test could never succeed at 0.05.
5. **Pre-registered, fixed horizon.** Each piece is judged on its first 7
   days. Nothing is evaluated until every planned piece has had them;
   interim numbers are labelled as such.
6. **Primary metric from what is measurable.** For settings that act before
   the click: visitors per 1,000 impressions when impressions are imported,
   otherwise visitors per piece (with a warning). For the CTA: purchases per
   visitor, with a power warning when too few purchases are expected.

Decisions (`evaluate.ts`):

| Outcome | Evidence | Decision |
| ------- | -------- | -------- |
| Not every piece matured yet | collecting | continue |
| Deadline (42 days) passed first | insufficient | insufficient_evidence |
| Guardrail breached (completion rate fell, or refund rate rose) | — | revise |
| p ≤ alpha, treatment better | supported | expand → replicate on fresh examples |
| p ≤ alpha, control better | supported | stop |
| p > alpha, observed difference ≥ the pre-registered minimum effect (20%) | insufficient | insufficient_evidence → **re-test** on fresh examples |
| p > alpha, observed difference below it | no-detectable-difference | stop (which is *not* evidence of equality) |

An inconclusive comparison is re-tested **once**, as its own experiment under
the same rule — never pooled with the first, which would turn two looks into
one result. Two inconclusive tests of the same pair retire it: any difference
is too small for this batch size. A replication is judged on the original
test's primary metric, so the two results are comparable.

**A level becomes the baseline only after a replication also supports it.**
Every experiment carries a standing confounder note (organic distribution;
audiences were not randomised), plus any detected ones: mixed platforms, a
drifted held-constant setting, arms published at different times.

Factorial designs, Bayesian adaptive allocation and bandits are deliberately
not built. The schema stores `factors` as an array so a 2×2 can be added once
volume justifies it.

---

## Review and publication gates

On `/growth/experiments` (operator cookie from `/growth`):

- **Accept** registers the experiment (`EXP-###`), allocates content IDs,
  and creates draft pieces with their specs and tracked links.
- **Revise** accepts an edited JSON version, re-validated: one factor, two
  arms, approved and unused examples, every piece readable in its duration.
- **Reject** rests the topic for 30 days.
- Every review needs a reason. Reasons are shown back to the planner as
  editorial context and **never counted as evidence.**
- Pieces move `draft → in_review → approved → published`. Approval requires
  an approved example; publishing requires approval plus the post's https
  URL (and optionally the date it went up).

---

## The six-hour job

`POST /api/analytics/run` with `Authorization: Bearer <CRON_SECRET>`.

1. Checks the database answers (a failure returns 503 and pings the monitor).
2. Claims the six-hour slot (`2026-10-15T12`). A slot succeeds once; a repeat
   call returns 200 with `skipped`. A run stuck "running" for 20 minutes may
   be retried. `?force=1` with the operator token reruns a slot.
3. Reads events, purchases, subscribers, pieces, experiments and imports —
   paged in 1,000-row requests and capped.
4. Upserts 24-hour, 7-day and 30-day snapshots for the slot.
5. Re-evaluates every running experiment and records its decision.
6. Plans the next batch; files new proposals and supersedes stale ones.
7. Prunes snapshots and runs older than 120 days.
8. Writes the daily report (first run after 12:00 UTC) and the weekly review
   (Mondays after 12:00 UTC), and emails them to `OPERATOR_EMAIL`.

It only **reads** purchases, subscribers and events. It cannot affect
checkout, the webhook, delivery emails or downloads.

**Supabase pausing.** Each run makes real queries, which counts as activity
and may keep a Free project from pausing for inactivity. That is not
guaranteed. Production should still be on Pro, as already decided.

### Schedule it on Hostinger

1. Generate a secret: run `openssl rand -base64 32`.
2. In hPanel, open the web app → **Environment variables**. Add
   `CRON_SECRET` (the value from step 1) and `OPERATOR_EMAIL` (where reports
   go). Redeploy.
3. Run `supabase/migrations/0005_content_experiments.sql` in the Supabase SQL
   editor for that environment.
4. In hPanel, open **Advanced → Cron Jobs** and add a custom command, every
   six hours (`0 */6 * * *`):
   `curl -fsS -X POST -H "Authorization: Bearer <CRON_SECRET>" https://warofpoker.com/api/analytics/run`
5. Set up external monitoring (next section).
6. After the first scheduled time, open `/growth/experiments` and check that
   **Operational health** shows a succeeded run.

### External failure monitoring

A database that is down cannot record its own outage, and a cron job that
never fires records nothing at all. So:

1. Create a check at a dead-man's-switch service that uses the
   healthchecks.io ping convention (healthchecks.io itself has a free tier),
   with a 6-hour period and about 1 hour of grace.
2. Put its ping URL in `HEALTHCHECK_PING_URL` and redeploy.

The job pings the URL after each successful run and `<url>/fail` after a
failed one. The service alerts when a failure ping arrives or when pings stop.
Hostinger's cron also reports a non-zero `curl -f` exit when its output email
is enabled.

---

## Reports

Sent through the existing Resend client and email renderer.

- **Daily:** last 24 hours and 7 days of the funnel, the largest drop-off,
  notable week-on-week changes (99% interval), running experiments,
  proposals waiting, failed runs.
- **Weekly:** organised around five questions, in order: *What did we test?
  What happened? What do the results actually support? What remains
  uncertain? What should we test next?*

Each report is stored in `operator_reports` (one per period, so a rerun never
resends) whether or not email is configured.

---

## Data model

`supabase/migrations/0005_content_experiments.sql` — additive, idempotent,
RLS on with no policies:

- `content_pieces` gains `spec`, `spec_version`, `example_id`,
  `experiment_id`, `variant`.
- `experiments` — the registry: hypothesis, factors, variants, held-constant
  settings, metrics, pre-registered plan, results, evidence, decision,
  learning.
- `analytics_runs` — one per six-hour slot, unique on `run_key`.
- `analytics_snapshots` — unique on `(run_key, window_days)`.
- `recommendations` — proposals and their reviews; one open proposal per
  `dedupe_key`.
- `content_metric_imports` — platform numbers, unique per piece, platform and
  capture date.
- `operator_reports` — unique per kind and period.

---

## Validation (2026-10-15)

An isolated test environment lives in `scripts/experiment-demo/`: Postgres 16
and PostgREST 12 (Supabase's API layer, with its 1,000-row response cap)
behind a gateway at Supabase's `/rest/v1` path, in Docker, bound to
`127.0.0.1`. The application's own Supabase client talks to it unchanged.

```bash
docker compose -f scripts/experiment-demo/docker-compose.yml up -d
scripts/experiment-demo/apply-migrations.sh
npm run demo:experiments
docker compose -f scripts/experiment-demo/docker-compose.yml down -v
```

`npm run demo:experiments` drives the real job, planner, evaluation, review
functions and renderer through simulated time with **synthetic, labelled
data** (sessions `synthetic-…`, `@example.invalid` emails, `cs_synthetic_…`
Stripe ids, example.invalid post URLs), on copies of the candidate hands
approved *for the demo only*. It writes `renders/experiment-demo/report.md`.

What it showed, against a real database:

| Gen | Engine proposed | Synthetic result | What changed next |
| --- | --------------- | ---------------- | ----------------- |
| 1 | Hook: financial-consequence vs challenge, primary = visitors (no impressions yet) | Interim look: *collecting*, no verdict. At horizon: p = 0.029, supported → **replicate** | Same comparison on fresh examples, same metric |
| 2 | Replication | p = 0.029, supported → **adopt** | Baseline hook becomes financial-consequence |
| 3 | Hook: common-mistake vs the new baseline, primary = visitors per 1,000 impressions (now imported) | +23% for treatment, p = 0.343 → **inconclusive** | No winner declared |
| 4 | **Re-test** of the same pair on fresh examples | — | A revised 25-second narrated video rendered from this spec |

Also verified against that database: migrations 0001–0005 apply in order and
0005 re-applies as a no-op; RLS is on for all eleven tables, and the anon key
sees zero rows and cannot write; a repeat call in the same slot is skipped,
a forced rerun keeps one snapshot per window and one open proposal; daily and
weekly reports are stored once per period; with the database unreachable the
job returns 503 and the monitor receives a `/fail` ping; the dashboard renders
experiments, results, proposals and their reasons. Over HTTP on a local
server: no token and a wrong token get 401, the cron secret runs the job,
and `?force=1` is honoured only for the operator token.

**Not tested against a real database:** a Supabase-hosted project (the test
used Supabase's API layer, not its hosting), the Hostinger cron trigger, a
real healthchecks.io check, Resend delivery of the reports, and any real
platform data.

---

## Production operational bridge (documented, not built)

The validated loop has three manual joints: an operator renders accepted
specs on a Mac, posts the videos, and pastes platform numbers back in. To
run without depending on one laptop, four pieces are needed. **None is built;
building them waits until Short Stack PLO is live and the owner directs it.**

1. **Accepted proposals create render jobs.** The accept action already
   creates one draft `content_pieces` row per spec. It would also insert one
   `render_jobs` row per piece: the frozen spec, its hash, status
   (`queued → claimed → rendered | failed`), attempts, renderer version,
   voice and calibration, and the output location. Unique on
   `(content_id, spec hash)`, so a retried accept cannot queue twice. **A spec
   is immutable once queued**; a change is a new content ID, so every result
   stays attached to exactly what was published.
2. **A separate render worker produces the videos.** Not the Hostinger web
   app (no Chrome, no speech engine, and rendering must never compete with
   checkout). Candidates: a scheduled GitHub Actions job (Linux runners ship
   Chrome; narration would need a Linux speech engine such as Piper, or a
   hosted voice), or a small always-on VPS. The worker claims queued jobs
   with its own narrowly scoped credential, renders with
   `scripts/render-pipeline.ts`, uploads the MP4, captions, copy and
   `sync.json` to a **private** storage bucket, and marks the job. It holds no
   Stripe or email credentials, and it refuses any spec whose example is not
   approved.
3. **Publication is recorded against the original spec.** Each rendered
   video is reviewed on `/growth/experiments` (signed, expiring preview URL)
   and approved before it can be published — **human approval before
   publication stays mandatory, automated or not.** Posting stays manual at
   first; platform upload APIs could come later, but only for approved
   pieces. Either way the post URL, platform post id and publish time are
   written to the piece, whose spec and tracked link are already fixed.
4. **Platform metrics flow back automatically.** Today's CSV import writes
   `content_metric_imports` with `source = 'manual'`. An API puller (YouTube
   Analytics first, others after app review) would write the same rows with
   `source = 'api'`, keyed by content ID, platform and capture date. The
   six-hour job, the evaluator and the planner already consume these rows
   unchanged, so the next batch is planned from them with no further work.

Invariants to keep: the analytics job, the render worker and the payment
system stay separate processes with separate credentials; nothing publishes
without approval; renders stay private until posted; a failed render or
import is visible on the dashboard rather than silent.

Open decisions for that work: where the worker runs, the narration voice
and engine, the storage bucket, and which platform APIs to connect.

---

## Activation (after launch, on direction)

1. Approve examples (eight or more, in matched lesson pairs).
2. Merge the branch; deploy through staging as usual.
3. Run migration 0005 on staging, then production.
4. Set `CRON_SECRET`, `OPERATOR_EMAIL`, `HEALTHCHECK_PING_URL` (and
   `GROWTH_DASHBOARD_TOKEN` if not set) on each environment.
5. Create the six-hour Hostinger cron job and the external check
   (§ Schedule it on Hostinger).
6. Confirm a succeeded run on `/growth/experiments`, then review the first
   proposal.

---

## Open questions for the owner

- **Approve examples.** mx-002 to mx-009 are the first batch; mx-001 is spare.
- **Voice.** Stock synthetic narration, a recorded voice-over, or a licensed
  voice.
- **Survival Card CTA.** Disabled until it has its own landing page; tests use
  the 10-Hand Challenge.
- **Visual identity.** Frames use the site palette and system fonts pending
  `BRAND.md`.
- **Platform API connections.** Manual import until one is directed.
- **`WAR-OF-POKER-SPEC.md`** § Data Architecture and § Analytics are still
  stale ("No database has been chosen", "Nothing is installed"); only
  § Technical Architecture was updated, as directed.
