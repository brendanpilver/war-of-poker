# War of Poker — River Potter Shorts: Content Format

> **Status: implementation record, not doctrine.**
> This document describes the intended shape of future short-form River Potter
> video content, so the product and marketing stay aligned when that format is
> built. It records a direction, not a decision already executed — no video
> system exists yet. It does **not** define brand, WARPLAN, or product
> doctrine — those live in the five canonical files listed in
> [`AGENTS.md`](../AGENTS.md), and nothing here overrides them. In particular,
> this document does not rename, extend, or reinterpret WARPLAN, and the
> reasoning structure below is Short Stack PLO's own four-question lens, not a
> substitute for or version of WARPLAN.

---

## What this is for

Short Stack PLO, the Field Kit, and the 10-Hand Challenge already teach and
test one reasoning sequence: **Hand → SPR → Player → Equity → Decision** (see
`src/lib/quiz/hands.ts` and the Field Kit's Full-Hand Decision Map). Future
short-form video ("Shorts") should demonstrate that same sequence rather than
introduce a different one, so a viewer who later buys the book or takes the
Challenge recognizes the reasoning instead of meeting it cold.

**The framework is a visual reasoning structure, not a slogan.** It should
feel like the natural way River Potter looks at a hand — a recurring, subtle
on-screen progression — not a branded overlay, a countdown gimmick, or a
catchphrase spoken at the viewer. No acronym, tagline, or product name is
attached to it here or anywhere else in the product, and Shorts should not
invent one.

---

## The on-screen structure

A subtle, recurring visual indicator tracks the same four questions used
everywhere else in the product:

```
HAND → SPR → PLAYER → EQUITY → DECISION
```

`DECISION` is the outcome the first four produce, not a fifth question asked
of the viewer — consistent with how the book, Field Kit, and Challenge already
treat it (fold, check, call, bet, or raise).

## The six-beat format

1. **Present a novel hand.** Cards, board, stacks, and a live-relevant read on
   the opponent — enough to make the decision real, not a puzzle.
2. **Ask the viewer for a decision.** Fold, check, call, bet, or raise — stated
   plainly, before any reasoning is shown.
3. **Brief countdown.** A short pause that invites an answer before the reveal.
4. **Work through the relevant factors.** Not mechanically all four every
   time — the same selective-labeling discipline the Capstone Quiz and the
   Challenge already use. Show whichever of Hand, SPR, Player, and Equity
   actually explains this decision, in that order when more than one appears.
5. **Reveal and explain the decision.** State the action and tie it back to
   whichever factors were shown.
6. **Point toward the 10-Hand Challenge, where it fits.** Not every Short
   needs a CTA cut awkwardly into six seconds of video, but the natural close
   is the free Challenge at `/plo-challenge`, which tests the same reasoning
   at greater length.

## Hand sourcing — the same rule the Challenge already follows

**Every hand used in a Short must be new.** It must not reproduce or closely
adapt a hand from:

- the published manuscript (including Chapter 12's ten worked hands and every
  worked example inside Chapters 1–11),
- the Field Kit (including the 20-Hand Capstone Quiz),
- the 10-Hand Challenge (`src/lib/quiz/hands.ts`), or
- any previously published Short.

This is the same separation `src/lib/quiz/hands.ts` already documents and
`tests/challenge-hands.test.ts` already guards for the Challenge: **the paid
product teaches concepts; marketing content creates new situations in which
those concepts can be applied.** A Short should illustrate a concept from the
book — nuttiness, SPR zones, dirty outs, thin value, whatever the beat calls
for — using cards, boards, and a read that do not appear anywhere else in the
product. Whatever mechanism eventually generates or reviews Short hands should
check new hands against the existing paid and free inventory the same way the
Challenge's own test suite does, before publication.

## Voice

The established River Potter voice governs Shorts exactly as it governs
everything else: calm, analytical, practical, concise, live-poker focused,
anti-hype. A Short should sound like a player thinking clearly under time
pressure, not a solver printing a citation or a marketer selling a system.

## Poker accuracy

Every Short hand needs the same technical checks any other new hand gets:
legal card construction, no duplicates, correct pot and pot-limit raise
arithmetic, correct SPR, and a strategic claim qualified by whatever
opponent/range assumption it depends on. Nothing here relaxes that; a fifteen
second video is not a reason to publish an unverified number.

## Still undecided

This document sets the format's shape, not its production plan. Left for
explicit direction when the video system itself is built: platform(s) and
cadence, who or what drafts a Short's hand and script, the review gate before
publication, on-screen visual treatment of the HAND → SPR → PLAYER → EQUITY →
DECISION indicator (colors, typography, motion — subject to `docs/BRAND.md`
once it is no longer `TODO`), captioning/accessibility, and performance
measurement. None of these should be decided by inference from this document.
