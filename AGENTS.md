<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# War of Poker — Agent Instructions

This file is the single source of agent rules for this repository. It is written
for Claude Code, OpenAI Codex, and any other coding agent. `CLAUDE.md` imports
this file, so the two are always identical in content.

---

## READ THIS FIRST

> **Before planning or implementing substantial War of Poker work, read:**
>
> - `docs/WAR-OF-POKER-SPEC.md`
> - `docs/BRAND.md`
> - `docs/WARPLAN.md`
> - `docs/PLAYER-RANKS.md`
> - `docs/CONTENT-SYSTEM.md`

These five files contain **canonical project doctrine**. They govern the product,
the brand, the WARPLAN system, the character system, and the content pipeline.
They are still being written: much of their content is `TODO`. A `TODO` is an open
question for the project owner — **not an invitation to fill in the answer.**

---

## Brand architecture — do not confuse these

- **WAR OF POKER** is the overall **brand, universe, and world**.
- **WARPLAN** is the **proprietary decision-making system within** that world.
- WARPLAN is **never** used as the name of the brand.

---

## Doctrine rules

1. **Canonical terminology must never be silently renamed**, re-cased,
   abbreviated, translated, pluralized differently, or "clarified." This covers
   the WARPLAN steps and sub-terms, the range buckets (Air, Draw, Medium, Strong,
   Monster), the weights (Dead, Light, Live, Heavy), the actions, the sizes, the
   product-area names, and the canonical phrase
   **"Change the price; change the range."**
2. **Flag conflicts; do not resolve them by changing doctrine.** If the docs
   contradict each other, contradict the code, or contradict outside poker theory,
   say so and stop.
3. **Doctrine changes require explicit user direction.** Never edit a doctrine file
   as a side effect of an implementation task.
4. **Do not automatically edit canonical doctrine merely because implementation
   would be easier if the doctrine changed.** Difficulty is a reason to raise the
   issue, not to rewrite the source of truth.
5. **Never invent War of Poker intellectual property.** No new ranks, characters,
   archetypes, WARPLAN terms, product names, taglines, or canonical phrases — not
   even as illustrative examples or temporary placeholders. Write `TODO` and ask.
6. **Never generate placeholder or filler artwork** and commit it as a brand asset.

---

## Engineering rules

- **Inspect existing code before changing architecture.** Read what is there;
  match its conventions rather than importing your own.
- **Favor maintainability over cleverness.** Boring, obvious code wins.
- **Avoid unnecessary dependencies.** The stack is deliberately small: Next.js 16
  (App Router), React 19, TypeScript, Tailwind CSS, ESLint, npm — plus Supabase,
  Stripe, and Resend, each added under explicit direction to build the Short Stack
  PLO funnel. **shadcn/ui, AI APIs, CMS systems, and third-party analytics remain
  deliberately absent.** The rule is unchanged: anything new is added only on
  explicit direction. Propose, don't install.
- **Avoid premature abstraction.** Do not build layers, registries, or generic
  systems for a single caller. Do not create speculative directories, components,
  or types.
- **Avoid generic AI-generated design.** No default gradient-hero, glassmorphism,
  emoji-bullet, three-feature-card output. Design comes from `docs/BRAND.md`, and
  where the brand is not yet defined, keep it plain rather than inventing a look.
- **TypeScript stays strict.** `strict: true` is not to be relaxed, and `any`,
  non-null assertions, and `@ts-expect-error` need a real justification.
- **Tests accompany meaningful logic.** No test framework is installed and none
  should be: the runner is Node's built-in `node --test`, relying on Node
  stripping TypeScript natively, with `tests/register.mjs` supplying the `@/`
  alias. Business-critical paths are covered — quiz scoring, attribution,
  input validation, delivery tokens, and Stripe webhook signature verification.
  Changes to those come with tests.
- **Document substantial architectural decisions.** A meaningful choice — data
  layer, auth model, rendering strategy, content storage — gets written down in
  `docs/` (and reflected in `docs/WAR-OF-POKER-SPEC.md` § Technical Architecture)
  as part of the same change.

---

## Security

- **Never commit security-sensitive information**: API keys, tokens, secrets,
  credentials, private URLs, or personal data.
- **Real `.env*` files stay ignored.** Do not un-ignore them, do not force-add
  them, and do not paste their contents into code, docs, or commit messages. The
  single exception is `.env.example`, which is tracked deliberately: it documents
  every required variable and contains no values.
- **No third-party analytics, tracking, or marketing scripts.** Measurement is
  first-party by design: events post to `/api/events` and are stored in our own
  database. Adding an external tag, tracker, or pixel needs explicit direction.

### Payment and delivery invariants

These hold the funnel's money and files safe. Do not relax one for convenience.

- **Never trust a price from the browser.** `/api/checkout` accepts an offer id
  and resolves the amount server-side from `src/lib/offers.ts`.
- **A purchase is recorded only by the Stripe webhook**, after the signature is
  verified against the raw request body. The success redirect is not proof of
  payment.
- **The Supabase service-role key is server-side only.** Row Level Security is on
  with no policies, so every table is unreachable from a browser.
- **Paid files are never publicly addressable.** They live in a private bucket
  behind signed, expiring tokens, and a token is valid only for its own product.

---

## Current project status

War of Poker is in **active product development.** The first commercial product,
**Short Stack PLO** by River Potter, is built, and its customer-acquisition funnel
is implemented end to end:

```
CONTENT -> QUIZ -> EMAIL -> PRODUCT PAGE -> PURCHASE -> DELIVERY -> ANALYTICS
```

**What now exists:**

- Routes: the homepage, the `/short-stack-plo` sales page, the free
  `/plo-challenge` 10-Hand Challenge (`/plo-reality-check` redirects to it),
  `/learn`, `/river-potter`, `/thank-you`, `/downloads`, and a token-gated
  `/growth` dashboard.
- **Supabase** — subscribers, events, purchases, content pieces, email sends.
- **Stripe Checkout** — the $19 book and the $39 Complete System, plus the $29
  player price earned by finishing the 10-Hand Challenge.
- **Resend** — the challenge results email (score, concepts, Survival Card,
  player price) and the five-step sequence that follows it.
- **First-party analytics** — content-ID attribution carried from a published
  piece through quiz, signup, and checkout onto the recorded sale.
- **Protected delivery** — paid files behind signed, expiring tokens.

Architecture, security decisions, and the external setup still outstanding are
recorded in [`docs/GROWTH-ARCHITECTURE.md`](docs/GROWTH-ARCHITECTURE.md), which is
an implementation record, **not** doctrine.

**Still not started, and still needing explicit direction:** WARPLAN as a
product, the Field Manual, War Report, Arsenal, player characters and the ranks
roster, the training system, user accounts or authentication, AI content
generation, and merchandise.

**The five canonical files in `docs/` remain largely `TODO`.** Building this
funnel did not resolve them, and they still govern brand, WARPLAN, characters,
and content. A `TODO` is still an open question for the project owner — not an
invitation to fill it in.

---

## Working commands

```bash
npm install       # install dependencies
npm ci            # install exactly the lockfile (CI and deploys)
npm run dev       # local development server
npm run lint      # ESLint
npm run typecheck # tsc --noEmit
npm test          # unit tests
npm run build     # production build — must pass before a change is done
```

Run `npm run lint`, `npm run typecheck`, `npm test`, and `npm run build` before
declaring work complete.

Do not push to a remote or create a GitHub repository without explicit direction.
