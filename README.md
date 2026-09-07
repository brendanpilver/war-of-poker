# War of Poker

**Poker is a battle of decisions. Have a plan.**

The codebase for [WarOfPoker.com](https://warofpoker.com).

## War of Poker vs. WARPLAN

These are not the same thing, and the distinction is canonical:

- **War of Poker** is the overall **brand, universe, and world** — poker strategy,
  the Field Manual, training material, ranked cartoon army player archetypes,
  articles, hand breakdowns, quizzes, drills, newsletters, software tools,
  merchandise, videos, and social content.
- **WARPLAN** is the **proprietary poker decision-making system inside** that
  world. It is one system within the brand, never the name of the brand.

## Project status

**Foundation only.** This repository currently contains the scaffolded
application, the canonical documentation framework, asset directories, and agent
governance files. The homepage is a deliberate minimal placeholder.

Substantive product work is intentionally not started. It begins after
`docs/WAR-OF-POKER-SPEC.md` and `docs/BRAND.md` are completed.

## Stack

- [Next.js](https://nextjs.org) (App Router)
- TypeScript (strict)
- Tailwind CSS
- ESLint
- pnpm

No database, auth, payments, CMS, analytics, component library, or AI integration
is installed. Each will be added deliberately when it is needed.

## Run locally

Requires Node.js and [pnpm](https://pnpm.io).

```bash
pnpm install
pnpm dev        # http://localhost:3000
```

Other commands:

```bash
pnpm lint       # ESLint
pnpm build      # production build
pnpm start      # serve the production build
```

## Canonical documentation

The five doctrine files in [`docs/`](./docs) are the source of truth for the
product, the brand, and the content. They are in progress; unresolved points are
marked `TODO`.

| File | Purpose |
| ---- | ------- |
| [`docs/WAR-OF-POKER-SPEC.md`](./docs/WAR-OF-POKER-SPEC.md) | Master product specification |
| [`docs/BRAND.md`](./docs/BRAND.md) | Brand guide — positioning, voice, visual world |
| [`docs/WARPLAN.md`](./docs/WARPLAN.md) | The WARPLAN decision-making system |
| [`docs/PLAYER-RANKS.md`](./docs/PLAYER-RANKS.md) | Ranked cartoon player archetype system |
| [`docs/CONTENT-SYSTEM.md`](./docs/CONTENT-SYSTEM.md) | How on-brand content gets made |

## Repository layout

```text
docs/          canonical doctrine
public/        static assets — see public/README.md
src/app/       Next.js App Router routes
src/components/  ui, layout, marketing, warplan, characters, poker
src/lib/       shared utilities
src/types/     shared types
```

## Contributing & agent workflow

Human and AI contributors follow the same rules, written in
[`AGENTS.md`](./AGENTS.md) (imported by [`CLAUDE.md`](./CLAUDE.md)). The essentials:

1. **Read the doctrine files** before planning substantial work.
2. **Never silently rename canonical terminology**, and never treat WARPLAN as the
   brand.
3. **Never invent War of Poker intellectual property** to fill a gap — new ranks,
   characters, WARPLAN terms, taglines, or product names. Mark it `TODO` and ask.
4. **Flag conflicts instead of resolving them by editing doctrine.** Doctrine
   changes require explicit direction from the project owner.
5. **Keep the stack minimal**; propose dependencies rather than installing them.
6. **Run `pnpm lint` and `pnpm build`** before considering a change complete.
7. **Never commit secrets.** `.env*` stays ignored.
