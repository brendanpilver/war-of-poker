# War of Poker — Content Experiment Engine

> **Status: implementation record, not doctrine.**
> This describes the closed-loop content system built on 2026-10-15 under the
> owner's explicit direction. It does **not** define brand, WARPLAN, or product
> doctrine — those live in the five canonical files listed in
> [`AGENTS.md`](../AGENTS.md), and nothing here overrides them. Short-form
> format rules come from [`SHORTS-CONTENT-FORMAT.md`](./SHORTS-CONTENT-FORMAT.md);
> the funnel it measures is described in
> [`GROWTH-ARCHITECTURE.md`](./GROWTH-ARCHITECTURE.md).

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
| `pacing` | measured (2.8 words/s), brisk (3.4) | Caption speed only. The River Potter voice is not a variable. |
| `visual` | table, table-timeline | Cards, board, pot and stack always; the action timeline optionally. |
| `cta` | challenge, product-page, survival-card | **survival-card is unavailable**: the card is delivered only from the Challenge results screen, so there is no page a Survival Card Short could honestly send a viewer to. The engine never selects it. |
| `platform` | youtube-shorts, tiktok, instagram-reels | A blocking variable: one experiment runs on one platform. |
| `template` | short-v1 | Versioned so a template change is visible in the data. |

**Series follow the hook** (`seriesForHook`): financial-consequence → EPM,
challenge → PRC, common-mistake → HIPR, curiosity → HSEP. Content IDs already
require a series, and each series' premise matches one hook. The consequence:
for engine-generated content a series comparison *is* a hook comparison.
`curiosity` → HSEP is the loosest fit. **Owner to confirm.**

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

The library currently holds **one candidate**, `mx-001` (top set at SPR ≈ 2,
grounded in Chapter 5's SPR zones and Chapter 6's "At low SPR, top set is
often happy to play for stacks"). It was drafted by Claude Code for review;
its notes explain the judgement call (calling is close; the example teaches
the SPR arithmetic). **Until at least eight examples are approved, the engine
can only propose "approve examples" items** — which is the correct behaviour,
not a fault.

---

## Rendering

```bash
npm run render:short -- path/to/specs.json --out renders
```

Add `--draft` to render a candidate example (every frame watermarked) and
`--frames-only` to skip the video. `specs.json` may be one spec, an array, or
the `{ "specs": [...] }` that `/growth/specs?experiment=EXP-001` returns.

Per spec it writes `renders/<content id>/`: `spec.json`, `frames/*.svg`,
`captions.srt`, `copy.md` (description with the tracked link, social post,
narration script, article draft), and `video.mp4`.

**How:** `render.ts` draws one 1080 × 1920 SVG per beat — cuts, not
animation. The script paints those frames to a canvas in headless Google
Chrome and records them with the browser's own MediaRecorder (H.264 MP4 on
Chrome 155; WebM where MP4 is unavailable). Recording is real time, so a
25-second Short takes about 30 seconds. **No dependency was added**: neither
Remotion nor ffmpeg is installed, and this needs neither. Set `CHROME_PATH`
if Chrome is elsewhere.

**Limits, stated plainly:** the video is silent — narration is a script for a
voice-over — and the look is provisional: the site's palette (sampled from
the real logo and cover) and system fonts, because `BRAND.md` has not chosen
typefaces or colours. Remotion would be the natural step up if motion or
audio becomes necessary; it is a dependency decision for the owner.

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
| p > alpha | no-detectable-difference | stop (which is *not* evidence of equality) |

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

## Open questions for the owner

- **Approve examples.** Review `mx-001`; the first experiment needs eight
  approved examples (four lessons × two).
- **Series mapping.** Confirm hook → series, especially curiosity → HSEP.
- **Survival Card CTA.** It needs its own landing page before it can be tested.
- **Visual identity.** Frames use the site palette and system fonts pending
  `BRAND.md`.
- **Platform API connections.** Manual import until one is directed.
- **`WAR-OF-POKER-SPEC.md` § Technical Architecture** still says Supabase,
  Stripe and analytics are not installed. `AGENTS.md` asks for architecture
  to be reflected there, but it is a doctrine file, so it was not edited
  without direction.
