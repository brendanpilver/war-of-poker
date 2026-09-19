-- War of Poker growth loop schema.
--
-- Run this in the Supabase SQL editor (or `supabase db push`) before the funnel
-- goes live. See docs/GROWTH-ARCHITECTURE.md for how the application uses it.
--
-- Security model: every table has RLS enabled with no permissive policy, so the
-- anon and authenticated roles can read nothing. All access is through the
-- service-role key from server route handlers, which bypasses RLS. That keeps
-- subscriber email addresses and purchase records off the browser entirely.

create extension if not exists "pgcrypto";
create extension if not exists "citext";

-- ---------------------------------------------------------------------------
-- Content pieces: one row per published River Potter piece.
-- `content_id` is the human-readable ID carried in tracked links (?src=EPM-001).
-- ---------------------------------------------------------------------------
create table if not exists content_pieces (
  content_id        text primary key,
  series            text not null,
  status            text not null default 'draft',

  -- Provenance: which approved doctrine/source this piece derives from.
  source_material   text,
  source_location   text,
  approved_lesson   text,

  -- The piece itself.
  hook              text,
  hand_details      jsonb,
  dollars_at_risk   numeric(10, 2),
  script            text,
  on_screen_text    text,
  caption           text,
  cta               text,

  -- Distribution.
  platform          text,
  published_url     text,
  published_at      timestamptz,

  -- Platform-reported performance, filled in by hand or by a later automation.
  views             integer not null default 0,
  engagement        integer not null default 0,

  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),

  constraint content_pieces_series_check
    check (series in ('EPM', 'PRC', 'HIPR', 'HSEP')),
  constraint content_pieces_status_check
    check (status in ('draft', 'in_review', 'approved', 'published', 'retired'))
);

create index if not exists content_pieces_status_idx on content_pieces (status);
create index if not exists content_pieces_series_idx on content_pieces (series);

-- ---------------------------------------------------------------------------
-- Subscribers: one row per captured email address.
-- ---------------------------------------------------------------------------
create table if not exists subscribers (
  id                 uuid primary key default gen_random_uuid(),
  email              citext not null unique,
  created_at         timestamptz not null default now(),

  -- Where this address came from, e.g. 'quiz' or 'survival-card'.
  source             text,
  -- Anonymous browser ID, used to stitch pre-email events to this subscriber.
  session_id         text,

  -- Acquisition attribution, captured on first visit and carried through.
  -- Deliberately not a foreign key: a tracked link can go out before its
  -- content_pieces row is registered, and attribution must never be the reason
  -- a signup fails.
  content_id         text,
  utm_source         text,
  utm_medium         text,
  utm_campaign       text,
  platform           text,
  landing_page       text,
  referrer           text,

  -- Quiz state.
  quiz_completed     boolean not null default false,
  quiz_score         integer,
  quiz_answers       jsonb,

  -- Offer and customer state.
  offer_shown        text,
  customer_status    text not null default 'lead',
  purchased_product  text,

  updated_at         timestamptz not null default now(),

  constraint subscribers_quiz_score_check
    check (quiz_score is null or (quiz_score between 0 and 3)),
  constraint subscribers_customer_status_check
    check (customer_status in ('lead', 'customer'))
);

create index if not exists subscribers_content_id_idx on subscribers (content_id);
create index if not exists subscribers_session_id_idx on subscribers (session_id);
create index if not exists subscribers_created_at_idx on subscribers (created_at desc);

-- ---------------------------------------------------------------------------
-- Events: the funnel's raw event log. Everything in the dashboard is derived
-- from here, so adding a metric later never needs a new table.
-- ---------------------------------------------------------------------------
create table if not exists events (
  id            bigserial primary key,
  created_at    timestamptz not null default now(),
  name          text not null,
  session_id    text,
  subscriber_id uuid references subscribers (id) on delete set null,

  -- Attribution, denormalised onto every event so a funnel step can be grouped
  -- by source without joining back through the subscriber (who may not exist
  -- yet at the top of the funnel).
  content_id    text,
  utm_source    text,
  utm_medium    text,
  utm_campaign  text,
  platform      text,
  landing_page  text,
  referrer      text,

  props         jsonb not null default '{}'::jsonb
);

create index if not exists events_name_created_at_idx on events (name, created_at desc);
create index if not exists events_session_id_idx on events (session_id);
create index if not exists events_content_id_idx on events (content_id);
create index if not exists events_created_at_idx on events (created_at desc);

-- ---------------------------------------------------------------------------
-- Purchases: written only by the Stripe webhook, after signature verification.
-- Never written from a client-supplied success redirect.
-- ---------------------------------------------------------------------------
create table if not exists purchases (
  id                        uuid primary key default gen_random_uuid(),
  created_at                timestamptz not null default now(),

  -- Idempotency key: Stripe retries webhooks, so a repeated delivery must
  -- update this row rather than insert a second sale.
  stripe_checkout_session_id text not null unique,
  stripe_payment_intent_id   text,

  email             citext not null,
  subscriber_id     uuid references subscribers (id) on delete set null,

  -- Which offer was bought, and what it entitles them to download.
  offer_id          text not null,
  product           text not null,
  amount_cents      integer not null,
  currency          text not null default 'usd',
  status            text not null default 'paid',

  -- Attribution carried through Stripe Checkout metadata.
  session_id        text,
  content_id        text,
  utm_source        text,
  utm_medium        text,
  utm_campaign      text,
  platform          text,
  landing_page      text,

  constraint purchases_offer_id_check
    check (offer_id in ('book', 'system', 'system-quiz')),
  constraint purchases_product_check
    check (product in ('book', 'complete-system')),
  constraint purchases_status_check
    check (status in ('paid', 'refunded')),
  constraint purchases_amount_cents_check check (amount_cents >= 0)
);

create index if not exists purchases_content_id_idx on purchases (content_id);
create index if not exists purchases_email_idx on purchases (email);
create index if not exists purchases_created_at_idx on purchases (created_at desc);

-- ---------------------------------------------------------------------------
-- Email sends: which sequence step each subscriber has received, so a resend or
-- a retry never double-sends.
-- ---------------------------------------------------------------------------
create table if not exists email_sends (
  id            bigserial primary key,
  subscriber_id uuid not null references subscribers (id) on delete cascade,
  sequence_key  text not null,
  sent_at       timestamptz not null default now(),
  provider_id   text,

  unique (subscriber_id, sequence_key)
);

-- ---------------------------------------------------------------------------
-- Lock everything down. No policies are created, so only the service-role key
-- (used exclusively server-side) can read or write.
-- ---------------------------------------------------------------------------
alter table content_pieces enable row level security;
alter table subscribers    enable row level security;
alter table events         enable row level security;
alter table purchases      enable row level security;
alter table email_sends    enable row level security;
