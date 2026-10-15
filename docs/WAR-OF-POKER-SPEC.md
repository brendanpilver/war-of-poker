# War of Poker — Master Product Specification

> **Status: OUTLINE ONLY.**
> This document will become the master product specification for WarOfPoker.com.
> **Once completed it is canonical**, and everything in the application, content,
> and brand must conform to it. Right now it contains only established facts plus
> `TODO` markers. Do not fill a `TODO` by inference, and do not make product
> decisions here without explicit direction from the project owner.

---

## Vision

TODO: The long-term vision for War of Poker.

Established: War of Poker is a brand, universe, and world built around poker
decision-making, expressed through a poker + military motif.

---

## Brand Architecture

**Canonical and settled:**

- **War of Poker** is the overall **brand, universe, and world**.
- **WARPLAN** is the **proprietary poker decision-making system inside** the War of
  Poker universe.
- WARPLAN is **not** the name of the brand and must never be treated as such.
- WARPLAN terminology must never be renamed or reinterpreted.

The War of Poker universe can eventually contain:

- poker strategy
- WARPLAN
- Field Manual
- training material
- player archetypes
- articles
- hand breakdowns
- quizzes
- drills
- newsletters
- software tools
- merchandise
- videos
- social content

See [`BRAND.md`](./BRAND.md) and [`WARPLAN.md`](./WARPLAN.md).

---

## Target Users

TODO: Who War of Poker is for — skill levels, game types, stakes, live vs. online,
and which of these are explicitly out of scope.

---

## Core Value Proposition

TODO: The single sentence that says why a player chooses War of Poker.

Working placeholder in use on the site: *"Poker is a battle of decisions. Have a
plan."* TODO: Confirm whether this is canonical positioning copy or temporary.

---

## WARPLAN's Role

Established: WARPLAN is the proprietary decision-making system within the War of
Poker universe. The wider world may be playful; WARPLAN itself must remain a
credible poker-thinking framework.

TODO: How WARPLAN functions in the product — is it the spine of all content, a
product in its own right, a funnel, a paid system, or several of these?

---

## War of Poker Universe

TODO: How the world holds together — setting, conceit, and the rules the universe
obeys.

Established elements: ranked cartoon army characters playing poker, military ranks
representing poker player archetypes, field manuals, field cards, insignia,
war-room imagery, tactical diagrams.

---

## Information Architecture

TODO: Top-level navigation, URL structure, and page hierarchy.

---

## Product Areas

TODO: The definitive list of product areas and what each one is.

Named so far (definitions still required): Field Manual, War Report, Arsenal,
Training System, Player Archetypes.

---

## Content Types

TODO: The full list of content types and the shape of each.

Named so far: articles, hand breakdowns, quizzes, drills, newsletters, videos,
social content.

---

## Website Goals

TODO: What the site must accomplish, in priority order.

---

## Conversion Goals

TODO: What counts as a conversion and how they rank.

---

## Monetization

TODO: How War of Poker makes money, and what stays free. Merchandise and software
tools are listed as possible universe contents; whether they are revenue lines is
undecided.

---

## Field Manual

TODO: Definition, scope, format, and role. Currently established only as a name
and as an aesthetic reference within the brand's visual world.

---

## War Report

TODO: Definition, scope, format, and role. No further information supplied.

---

## Arsenal

TODO: Definition, scope, format, and role. No further information supplied.

---

## Player Archetypes

Established: **WHO = Rank + Style + Situation.** Military rank characters represent
recognizable poker player types.

The archetype system is specified in [`PLAYER-RANKS.md`](./PLAYER-RANKS.md).
The final ranking system and character roster are **not yet defined** and must not
be invented.

---

## Training System

TODO: How training works — drills, quizzes, progression, spaced repetition,
scoring, or none of these. Undecided.

---

## Future Software Tools

TODO: Which tools, for whom, and where they sit relative to the site.

---

## Content Engine

The pipeline is specified in [`CONTENT-SYSTEM.md`](./CONTENT-SYSTEM.md).

Established principle: **AI-generated War of Poker content must derive from
canonical doctrine rather than inventing or silently changing the doctrine.**

---

## Technical Architecture

> Updated 2026-10-15 under explicit direction from the project owner. Detail
> lives in the implementation records: [`GROWTH-ARCHITECTURE.md`](./GROWTH-ARCHITECTURE.md),
> [`HOSTINGER-CUTOVER.md`](./HOSTINGER-CUTOVER.md) and
> [`CONTENT-EXPERIMENTS.md`](./CONTENT-EXPERIMENTS.md).

**Application stack, established:**

- Next.js 16 (App Router), React 19, TypeScript in strict mode, Tailwind CSS,
  ESLint, npm, a `/src` directory layout, Git.
- **Supabase** (Postgres) for subscribers, events, purchases, content and the
  experiment engine's tables. Row Level Security is on with no policies; the
  service-role key is used only on the server.
- **Stripe Checkout** for payment. A purchase is recorded only by the
  signature-verified webhook; prices resolve server-side from an offer id.
- **Resend** for transactional and sequence email.
- **First-party analytics:** events post to `/api/events` and are stored in
  our own database. No third-party analytics, tracking or marketing scripts
  run in the application.
- Paid files sit in a private storage bucket behind signed, expiring tokens.
- Tests run on Node's built-in test runner; there is no test framework.

Deliberately **not** installed: shadcn/ui, AI APIs, CMS systems, third-party
analytics. Anything new is added only on explicit direction.

**Hosting and environments, decided:**

- **Production is Hostinger**, a Node.js web app (`next start`, Node 22.x) at
  `https://warofpoker.com`, replacing the WordPress site, which moves intact to
  `shop.warofpoker.com`. **Vercel is obsolete.**
- **Staging** is a second Hostinger web app at `https://staging.warofpoker.com`,
  built from `main`. Hostinger deploys on every push to a web app's branch, so
  production tracks a `production` branch used only as a fast-forward release
  pointer: **production only ever runs a commit that has passed on staging.**
- Production has its own Supabase project (Free or Pro is an open decision;
  see `HOSTINGER-CUTOVER.md` §2) and Stripe **live** mode. Staging keeps its
  own project and Stripe **test** mode.
- As of 2026-10-15 the cutover has **not** been executed; the runbook and its
  go/no-go list are in `HOSTINGER-CUTOVER.md`.

**Rendering:** marketing pages are prerendered. Checkout, the Stripe webhook,
downloads, `/thank-you`, `/upgrade` and the `/growth` dashboards render on
demand in the Node runtime. Every integration is optional at build time; a
missing variable disables one capability, never a page (`.env.example`).

**Scheduled work:** Hostinger cron calls bearer-token endpoints:
`/api/email/dispatch` for the email sequence and, once activated,
`/api/analytics/run` for the content experiment engine. The analytics job
only reads purchases, subscribers and events, and writes only its own tables.

**Content experiment engine (built, not activated):** spec-driven Shorts, a
reviewed hand library, experiment evaluation and a review queue at
`/growth/experiments`. Video rendering is **not** part of the web app: it
runs as a batch command on an operator machine with Google Chrome and a
speech engine, which the Hostinger runtime does not provide. A test enforces
that no application code imports the renderer.

TODO: image pipeline, caching strategy.

---

## Data Architecture

TODO: What data exists, where it lives, and its shape. No database has been chosen.

---

## Analytics

TODO: What is measured, with what tool, and which decisions the measurements feed.
Nothing is installed.

---

## MVP

TODO: The minimum shippable definition of WarOfPoker.com.

---

## Future Phases

TODO: Ordered phases after MVP.

---

## Non-Goals

TODO: Explicit non-goals.

Established brand non-goals (see [`BRAND.md`](./BRAND.md)) — War of Poker is not:
generic military cosplay, violent warfare propaganda, generic AI-generated poker
branding, casino gambling hype, or macho poker-bro branding.

---

## Canonical Terminology

Terms below are canonical. Spelling and casing are fixed.

| Term | Meaning | Notes |
| ---- | ------- | ----- |
| **War of Poker** | The overall brand, universe, and world | Title case in prose; may be set as `WAR OF POKER` in display type |
| **WARPLAN** | The proprietary poker decision-making system within War of Poker | Always uppercase, always one word. Not the brand name |
| **WHO / ACTION SO FAR / RANGES LIKELY / POSSIBLE RESPONSES / LONG-RANGE IMPLICATIONS / AIM & ACTION / NOTHING ELSE** | The seven WARPLAN steps | Defined in [`WARPLAN.md`](./WARPLAN.md); never renamed |
| **SCALE**, **FIRE**, **TOP** | WARPLAN sub-structures | Defined in [`WARPLAN.md`](./WARPLAN.md) |
| **Air / Draw / Medium / Strong / Monster** | WARPLAN range buckets | Fixed set of five |
| **Dead / Light / Live / Heavy** | WARPLAN range weights | Fixed set of four |
| **"Change the price; change the range."** | Canonical WARPLAN phrase | Quote exactly |
| **Field Manual**, **War Report**, **Arsenal** | Named product areas | TODO: definitions |
| **Rank + Style + Situation** | The composition of WHO | Canonical formula |

TODO: Extend as terminology is established. Terms are added here only by explicit
direction.

---

## Agent Rules

Full rules live in [`../AGENTS.md`](../AGENTS.md) (and `../CLAUDE.md`). In short:

1. Read the five doctrine files in `docs/` before planning or implementing
   substantial War of Poker work.
2. Canonical terminology is never silently renamed or reinterpreted.
3. Flag conflicts; never resolve them by editing doctrine.
4. Doctrine changes require explicit direction from the project owner.
5. Never invent War of Poker intellectual property to fill a gap — mark it `TODO`.
