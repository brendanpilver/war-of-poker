-- Content experiment engine.
--
-- The closed loop described in docs/CONTENT-EXPERIMENTS.md: every published
-- piece carries the machine-readable spec it was generated from, intentional
-- tests are registered as experiments, a scheduled job writes analytical
-- snapshots and evaluates experiments, and the engine's proposals for the next
-- batch wait in a review queue for the operator.
--
-- Nothing here touches purchases, subscribers, events or email_sends: the job
-- reads them and writes only to the tables below. Safe to run on a live
-- database; every statement is additive and idempotent.
--
-- Security model unchanged from 0001: RLS on, no policies, service role only.

-- ---------------------------------------------------------------------------
-- content_pieces: the spec a piece was generated from, and the experiment arm
-- it belongs to. `spec` is the exact document the renderer consumed, so any
-- past video can be reproduced and every result traced to its settings.
-- ---------------------------------------------------------------------------
alter table content_pieces
  add column if not exists spec          jsonb,
  add column if not exists spec_version  integer,
  add column if not exists example_id    text,
  add column if not exists experiment_id text,
  add column if not exists variant       text;

create index if not exists content_pieces_experiment_idx on content_pieces (experiment_id);
create index if not exists content_pieces_example_idx on content_pieces (example_id);

-- ---------------------------------------------------------------------------
-- Experiments: the registry of intentional tests.
-- ---------------------------------------------------------------------------
create table if not exists experiments (
  id                 text primary key,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),

  -- 'running' while collecting; 'concluded' once the engine's fixed-horizon
  -- rule has produced a decision; 'abandoned' when the operator stops it.
  status             text not null default 'running',
  -- 'exploration' tests a new level; 'replication' re-runs a supported result
  -- on fresh examples before the level is adopted as the baseline.
  kind               text not null default 'exploration',
  replicates         text references experiments (id) on delete set null,

  hypothesis         text not null,
  factors            text[] not null,
  -- [{ "key": "control", "settings": { "hook": "challenge" } }, ...]
  variants           jsonb not null,
  held_constant      jsonb not null,
  primary_metric     text not null,
  secondary_metrics  text[] not null default '{}',
  guardrail_metrics  text[] not null default '{}',
  -- Pre-registered evaluation rule: alpha, pieces per arm, horizon days,
  -- minimum denominators, deadline. Written once, at acceptance.
  plan               jsonb not null,
  platform           text,
  confounders        text[] not null default '{}',

  started_at         timestamptz not null default now(),
  ended_at           timestamptz,

  -- Rewritten by every analytics run; never edited by hand.
  results            jsonb,
  results_updated_at timestamptz,
  evidence           text,
  decision           text,
  decision_reason    text,
  learning           text,

  -- The proposal this experiment was accepted from.
  recommendation_id  uuid,

  constraint experiments_id_check check (id ~ '^EXP-[0-9]{3,}$'),
  constraint experiments_status_check
    check (status in ('running', 'concluded', 'abandoned')),
  constraint experiments_kind_check
    check (kind in ('exploration', 'replication')),
  constraint experiments_evidence_check
    check (evidence is null or evidence in
      ('collecting', 'insufficient', 'no-detectable-difference', 'supported')),
  constraint experiments_decision_check
    check (decision is null or decision in
      ('continue', 'expand', 'revise', 'stop', 'insufficient_evidence'))
);

create index if not exists experiments_status_idx on experiments (status);

-- ---------------------------------------------------------------------------
-- Analytics runs: one row per scheduled six-hour slot. `run_key` is the slot
-- ("2026-10-15T12"), which is what makes the job idempotent: a retried or
-- duplicated cron call finds the slot already done.
-- ---------------------------------------------------------------------------
create table if not exists analytics_runs (
  id           uuid primary key default gen_random_uuid(),
  run_key      text not null unique,
  status       text not null default 'running',
  started_at   timestamptz not null default now(),
  finished_at  timestamptz,
  attempts     integer not null default 1,
  error        text,
  summary      jsonb,

  constraint analytics_runs_status_check
    check (status in ('running', 'succeeded', 'failed'))
);

create index if not exists analytics_runs_started_idx on analytics_runs (started_at desc);

-- ---------------------------------------------------------------------------
-- Analytics snapshots: the computed 24-hour, 7-day and 30-day picture for one
-- run. Upserted on (run_key, window_days), so a rerun of a slot replaces its
-- own snapshot instead of adding a second one. Pruned by the job.
-- ---------------------------------------------------------------------------
create table if not exists analytics_snapshots (
  id           bigserial primary key,
  run_key      text not null,
  window_days  integer not null,
  window_start timestamptz not null,
  window_end   timestamptz not null,
  created_at   timestamptz not null default now(),
  data         jsonb not null,

  unique (run_key, window_days),
  constraint analytics_snapshots_window_check check (window_days in (1, 7, 30))
);

create index if not exists analytics_snapshots_created_idx on analytics_snapshots (created_at desc);

-- ---------------------------------------------------------------------------
-- Recommendations: the engine's proposals for the next batch, and the
-- operator's review of each. Editorial review lives here and nowhere else; it
-- is never read as evidence about performance.
-- ---------------------------------------------------------------------------
create table if not exists recommendations (
  id                uuid primary key default gen_random_uuid(),
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  run_key           text,
  engine_version    text not null,

  kind              text not null,
  -- What the proposal is about (factor, levels, platform), so a newer
  -- proposal on the same question can supersede an older one.
  topic_key         text not null,
  -- The exact proposal, so repeated runs do not stack identical copies.
  dedupe_key        text not null,
  status            text not null default 'proposed',
  title             text not null,
  evidence_strength text not null,
  body              jsonb not null,

  -- Review.
  reviewed_at       timestamptz,
  review_reason     text,
  -- What was actually accepted: the body as proposed, or the operator's revision.
  accepted_body     jsonb,
  experiment_id     text references experiments (id) on delete set null,

  constraint recommendations_kind_check
    check (kind in ('experiment', 'needs-examples')),
  constraint recommendations_status_check
    check (status in ('proposed', 'accepted', 'rejected', 'revised', 'superseded', 'expired')),
  constraint recommendations_evidence_check
    check (evidence_strength in ('none', 'weak', 'moderate', 'strong'))
);

create unique index if not exists recommendations_open_dedupe_idx
  on recommendations (dedupe_key) where status = 'proposed';
create index if not exists recommendations_status_idx on recommendations (status, created_at desc);

-- ---------------------------------------------------------------------------
-- Platform metrics we cannot measure ourselves (impressions, views, watch
-- time), imported by hand until an API connection exists. Cumulative values as
-- the platform reported them on `captured_on`.
-- ---------------------------------------------------------------------------
create table if not exists content_metric_imports (
  id                 bigserial primary key,
  content_id         text not null,
  platform           text not null,
  captured_on        date not null,
  impressions        integer,
  views              integer,
  avg_view_seconds   numeric(8, 2),
  link_clicks        integer,
  source             text not null default 'manual',
  imported_at        timestamptz not null default now(),

  unique (content_id, platform, captured_on),
  constraint content_metric_imports_source_check check (source in ('manual', 'api')),
  constraint content_metric_imports_nonnegative_check check (
    coalesce(impressions, 0) >= 0 and coalesce(views, 0) >= 0
    and coalesce(link_clicks, 0) >= 0 and coalesce(avg_view_seconds, 0) >= 0
  )
);

create index if not exists content_metric_imports_content_idx
  on content_metric_imports (content_id, captured_on desc);

-- ---------------------------------------------------------------------------
-- Operator reports: one row per daily or weekly report, unique per period so
-- a rerun never sends the same report twice.
-- ---------------------------------------------------------------------------
create table if not exists operator_reports (
  id           bigserial primary key,
  kind         text not null,
  period_key   text not null,
  created_at   timestamptz not null default now(),
  sent_at      timestamptz,
  provider_id  text,
  subject      text not null,
  body_text    text not null,

  unique (kind, period_key),
  constraint operator_reports_kind_check check (kind in ('daily', 'weekly'))
);

alter table experiments            enable row level security;
alter table analytics_runs         enable row level security;
alter table analytics_snapshots    enable row level security;
alter table recommendations        enable row level security;
alter table content_metric_imports enable row level security;
alter table operator_reports       enable row level security;
