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
- **Avoid unnecessary dependencies.** The stack is deliberately minimal: Next.js
  (App Router), TypeScript, Tailwind CSS, ESLint, pnpm. Supabase, Stripe,
  shadcn/ui, analytics, AI APIs, and CMS systems are **deliberately absent** and
  are added only on explicit direction. Propose, don't install.
- **Avoid premature abstraction.** Do not build layers, registries, or generic
  systems for a single caller. Do not create speculative directories, components,
  or types.
- **Avoid generic AI-generated design.** No default gradient-hero, glassmorphism,
  emoji-bullet, three-feature-card output. Design comes from `docs/BRAND.md`, and
  where the brand is not yet defined, keep it plain rather than inventing a look.
- **TypeScript stays strict.** `strict: true` is not to be relaxed, and `any`,
  non-null assertions, and `@ts-expect-error` need a real justification.
- **Tests accompany meaningful logic once implementation begins.** No test
  framework is installed yet; adding one is a deliberate decision, not a drive-by.
- **Document substantial architectural decisions.** A meaningful choice — data
  layer, auth model, rendering strategy, content storage — gets written down in
  `docs/` (and reflected in `docs/WAR-OF-POKER-SPEC.md` § Technical Architecture)
  as part of the same change.

---

## Security

- **Never commit security-sensitive information**: API keys, tokens, secrets,
  credentials, private URLs, or personal data.
- **`.env*` files stay ignored.** They are in `.gitignore`; do not un-ignore them,
  do not force-add them, and do not paste their contents into code, docs, or
  commit messages.
- Do not add analytics, tracking, or third-party scripts without explicit
  direction.

---

## Current project status

The repository is a **foundation only**: scaffolded application, canonical
documentation structure, asset directories, and agent governance. The homepage is
an intentional minimal placeholder.

**Do not begin product development** — homepage design, Supabase, authentication,
database schema, AI content generation, blog, Field Manual, player characters,
ecommerce, newsletters, dashboards, analytics, Stripe, APIs, or admin systems —
until `docs/WAR-OF-POKER-SPEC.md` and `docs/BRAND.md` are completed by the project
owner.

---

## Working commands

```bash
pnpm install    # install dependencies
pnpm dev        # local development server
pnpm lint       # ESLint
pnpm build      # production build — must pass before a change is done
```

Run `pnpm lint` and `pnpm build` before declaring work complete.

Do not push to a remote or create a GitHub repository without explicit direction.
