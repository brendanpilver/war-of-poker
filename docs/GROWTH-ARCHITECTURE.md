# War of Poker — Growth Architecture

> **Status: implementation record, not doctrine.**
> This document describes how the customer-acquisition system is built and what
> still needs doing to operate it. It records decisions made under explicit
> direction from the project owner. It does **not** define brand, WARPLAN, or
> product doctrine — those live in the five canonical files listed in
> [`AGENTS.md`](../AGENTS.md), and nothing here overrides them.

---

## The loop

```
CONTENT → CHALLENGE → EMAIL → PRODUCT PAGE → PURCHASE → DELIVERY → ANALYTICS → BETTER CONTENT
```

The system exists to answer one question: **which content creates customers.**
Everything below serves that.

---

## Routes

| Route | Purpose |
| ----- | ------- |
| `/` | War of Poker homepage. Leads with checkout, same order as `Pricing`: $39 Complete System, then the challenge to unlock everything for $29, then one quiet line for the $25 book. |
| `/short-stack-plo` | The sales page. Primary CTA is checkout: $39 Complete System dominant, the $29 Player Price beside it, and the $25 book, $19 Field Kit and $15 upgrade in a quiet row beneath. `?offer=player` shows the earned price. |
| `/plo-challenge` | The free 10-Hand Short Stack PLO Challenge. **The primary acquisition asset.** |
| `/plo-reality-check` | Permanent redirect to `/plo-challenge`, query string preserved (`next.config.mjs`). |
| `/learn`, `/learn/[slug]` | Article index and template. |
| `/river-potter` | Minimal author page. |
| `/thank-you` | Post-purchase. Verifies payment with Stripe. |
| `/downloads` | Purchaser's file list, gated by a signed token. A book-only token also offers the $15 Field Kit upgrade. |
| `/upgrade` | Where a book owner's permanent upgrade link lands. Verifies the entitlement; grants no downloads. |
| `/api/upgrade-links` | Operator only. Regenerates one customer's upgrade link(s) by `purchaseId` or `email` — never a bulk list. `no-store`. Sends nothing. |
| `/growth` | Internal dashboard. Operator token only. |
| `/contact`, `/privacy`, `/terms` | Pre-existing legal pages. |

### API

| Route | Auth | Purpose |
| ----- | ---- | ------- |
| `POST /api/events` | none (public) | Analytics ingest. Re-validates everything. |
| `POST /api/subscribe` | none (public) | Email capture + Survival Card send. |
| `POST /api/checkout` | none (public) | Creates a Stripe Checkout session. |
| `POST /api/stripe/webhook` | Stripe signature | **The only place a purchase is recorded.** |
| `GET /api/download/[assetId]` | signed delivery token | Signs a short-lived Storage URL. |
| `GET/POST /api/content` | operator bearer token | Content pipeline for automation. |
| `POST /api/email/dispatch` | operator bearer token | Sends due sequence emails. |
| `POST /api/growth/session` | operator token in body | Exchanges token for an httpOnly cookie. |

---

## Attribution — the spine

A **content ID** identifies one published piece: `EPM-001`, `PRC-012`,
`HIPR-007`, `HSEP-015`. The four series are defined in
[`src/lib/content/series.ts`](../src/lib/content/series.ts).

A published piece links to `/plo-challenge?src=EPM-001`. From there:

1. **Capture.** `AnalyticsTracker` reads `?src` (and any `utm_*`, `platform`) on
   first paint and stores it in `localStorage`.
2. **First touch wins.** A later anonymous visit never overwrites a credited
   one, and a second tracked link does not steal credit from the first. The
   question is which content *produced* the customer, not which link they
   happened to click last.
3. **Every event carries it.** Attribution is denormalised onto each row in
   `events`, so a funnel step can be grouped by source without joining through a
   subscriber who may not exist yet.
4. **Through signup.** Written to the `subscribers` row on first insert only.
5. **Through Stripe.** Flattened into Checkout session metadata, and mirrored
   onto the PaymentIntent so a dashboard refund still shows the source.
6. **Onto the sale.** The webhook reads it back onto the `purchases` row.
7. **Into reporting.** `/growth` groups purchases and revenue by content ID.

---

## The 10-Hand Challenge

`/plo-challenge` replaced the 3-Hand PLO Reality Check as the primary
acquisition asset. Content and social links point at it, and it is the CTA in
`ChallengeCta` and `ExpensiveDecision`.

**Both heroes now lead with checkout.** The homepage originally led with the
challenge and kept the offer underneath; it was reversed under explicit
direction, so `/` and `/short-stack-plo` present the same three steps in the
same order — the Complete System at $39, the challenge as the way to unlock
everything for $29, then the $25 book as a single quiet line. Social and content traffic still lands on `/plo-challenge`
directly, which is where most of it goes.

The trade is deliberate and worth restating: a visitor who was ready to pay $39
now sees the cheaper route on the same screen and may take it. What they cannot
do is buy at $29 without finishing — the middle column and the hero's second
step both send them to the challenge, and only `PlayerPriceNotice` and the
results screen carry a buy button at that price.

Buying is never gated behind the challenge anywhere: `Pricing` is high on both
pages, and the results screen puts the buy button ahead of the email form.

### Nothing on the results screen is gated

Finishing the challenge is what earns the player price, so the score, the
hand-by-hand diagnostic, the price, the buy button and checkout are all
reachable without an address. There is no modal, no confirmation step, and no
signup between completion and Stripe.

The email form sits *below* the purchase CTA and is a retention offer, not a
lead gate: a reader who is not buying today can send themselves their results,
the Survival Card, and the link back to their player price. The order on the
page is the order of the objectives — convert, then retain, then accept the
loss. Exit-intent capture was considered and deliberately not built: the inline
form is the requirement, and an interstitial on a phone would cost more than it
retains.

A buyer is never asked for an address twice. Stripe Checkout collects it, the
webhook writes the subscriber row, and `markCustomer` promotes them — so a
challenge completer who buys immediately never sees the retention form's work
duplicated.

| Piece | File |
| ----- | ---- |
| The ten hands | [`src/lib/quiz/hands.ts`](../src/lib/quiz/hands.ts) |
| Concept → Field Kit mapping | [`src/lib/quiz/concepts.ts`](../src/lib/quiz/concepts.ts) |
| Scoring and diagnostic | [`src/lib/quiz/scoring.ts`](../src/lib/quiz/scoring.ts) |
| State machine | [`src/components/quiz/challenge.tsx`](../src/components/quiz/challenge.tsx) |

**Sourcing rule.** Challenge strategy principles must be grounded in the
approved Short Stack PLO manuscript, but challenge hand examples must be
original applications of those principles and should not reproduce paid-book
or paid-Field-Kit worked examples. No challenge hand introduces doctrine that
contradicts or extends beyond the book.

This replaced the earlier rule that hands be staged from the book's own
examples. The first version of the challenge did exactly that, and an audit on
2026-09-21 found every one of its ten hands was paid inventory: Chapter 12
worked hands, the book's example tables and review questions, or questions from
the Field Kit's 20-Hand Capstone Quiz. All ten were replaced with original
hands. A reader who takes the challenge and then buys should meet the book's
worked hands for the first time.

`tests/challenge-hands.test.ts` enforces both halves. It checks every hand's
holding and flop against every card combination printed in the paid book and
Capstone Quiz (`tests/paid-examples.fixture.ts`). It also recomputes each
hand's card facts with a test-only Omaha evaluator
(`tests/plo-eval.ts`, exactly two hole cards and three board cards): best
hand, nut status, straight cards, and every equity quoted against a study
holding.

**The free 3-Hand Reality Check is deprecated.** Its three questions were
Capstone Quiz questions (Hands 7, 8 and 11), so
`FREE_3_HAND_PLO_QUIZ_RELEASE.md`, which lives outside this repository, should
no longer be distributed now that the 10-Hand Challenge is the active funnel.
`/plo-reality-check` already redirects to the challenge.

**Progress survives a reload.** Answers are written to `sessionStorage` after
each one. A returning run is *offered* rather than applied — reading storage
during the first render would make the server's HTML disagree with the
client's, and dropping somebody back on hand 7 without asking is disorienting.

**Concepts are one-to-one with hands.** That is what keeps the results
diagnostic honest: it reports which decision was missed, not a competence
score inferred from a single answer. A test enforces the mapping, and another
enforces that every concept names a Field Kit piece that really exists.

---

## What the challenge funnel measures

Every step is one event name in
[`src/lib/analytics/events.ts`](../src/lib/analytics/events.ts):

| Step | Event |
| ---- | ----- |
| Challenge visit | `page_view` |
| Challenge start | `quiz_started` |
| Question reached / answered | `quiz_question_viewed` / `quiz_question_answered` |
| Challenge completed | `quiz_completed` |
| Results viewed | `quiz_results_viewed` |
| Player price unlocked | `quiz_discount_unlocked` |
| Complete System CTA clicked | `product_selected` + `checkout_started` (`location`) |
| Checkout initiated | `checkout_started` with `source: "server"` |
| Purchase | `purchase_completed`, and the `purchases` row the webhook writes |
| Results-email form viewed | `results_email_viewed` |
| Results-email submitted | `email_submitted` with `source: "challenge"` |

`results_email_viewed` fires when the form scrolls into view rather than on
mount, so it means "saw the offer" and not "reached the results".

**The three outcomes** are reported by `challengeOutcomes` in
[`src/lib/growth-metrics.ts`](../src/lib/growth-metrics.ts):

- **Immediate buyers** — a paid `system-quiz` purchase with no subscriber row
  from the challenge.
- **Retained non-buyers** — a subscriber whose `source` is `challenge` and whose
  `customer_status` is still `lead`.
- **Anonymous exits** — completions minus the two above.

Which of the three prices a sale was made at is the `offer_id` on the purchase:
`book` ($25), `field-kit` ($19), `system` ($39), `system-quiz` ($29),
`field-kit-upgrade` ($15). Completions count *runs*
rather than people — one player taking the challenge twice completes twice — so
the split is a shape, not a census. That is stated on the dashboard.

---

## Data model

`supabase/migrations/0001_growth_loop.sql`.

- **`content_pieces`** — one row per published piece, keyed on `content_id`.
- **`subscribers`** — one row per email address. Attribution on insert only;
  challenge state refreshed on every upsert. `quiz_score` is bounded 0–10 by
  `supabase/migrations/0002_ten_hand_challenge.sql`.
- **`events`** — the raw funnel log. Every dashboard number is derived from
  here, so a metric added later can be computed from history.
- **`purchases`** — keyed on `stripe_checkout_session_id` for idempotency,
  because Stripe retries.
- **`email_sends`** — unique on `(subscriber_id, sequence_key)`, so a retry
  cannot double-send.

**RLS is enabled on every table with no policies.** The anon and authenticated
roles can read nothing. All access is via the service-role key from server
route handlers. Subscriber emails and purchase records never reach a browser.

---

## Security decisions

- **Prices are never accepted from the browser.** `/api/checkout` takes an
  offer *id* and resolves the amount, currency, and product from
  [`src/lib/offers.ts`](../src/lib/offers.ts). A tampered request can select a
  different real offer, not invent a cheaper one.
- **Purchases are recorded only by the webhook**, after
  `constructEventAsync` verifies the signature against the raw body.
  `/thank-you` re-retrieves the session from Stripe rather than trusting the
  redirect; a visitor cannot manufacture a purchase by guessing a URL.
- **Paid files are never publicly addressable.** They live in a private
  Supabase Storage bucket. A purchase mints an HMAC-signed token naming the
  product and an expiry; `/api/download/[assetId]` verifies it (constant-time)
  and refuses an asset outside that product, so a book-only token cannot reach a
  Field Kit file, and a Field Kit-only token cannot reach the book.
- **The $15 upgrade requires a book owner's upgrade entitlement.** Every paid
  book purchase gets one, separate from its download link
  (`src/lib/book-ownership.ts`). It is signed with the same HMAC-SHA256 scheme
  as download tokens, under a key derived from `DELIVERY_SECRET` for this
  purpose only, so neither token can pass as the other: an entitlement grants
  no downloads, and a download token is not accepted at checkout. It carries
  the purchase id and the `book` offer, and **no expiry**. Each use re-reads the
  purchase and requires a paid, unrefunded `book` sale that has not already
  been upgraded; the checkout is locked to that purchase's email. An email
  address alone is never accepted.
- **A full refund marks the purchase `refunded`.** The webhook handles
  `charge.refunded` (full refunds only) by updating the row found by its
  PaymentIntent; that revokes the entitlement. The Stripe webhook endpoint must
  be subscribed to `charge.refunded` as well as `checkout.session.completed`.
- **An upgrade is delivered only to the book buyer.** The webhook records and
  delivers a `field-kit-upgrade` to the email on the original book purchase
  (`purchases.upgrade_of`), and `/thank-you` never shows an upgrade's download
  link. Someone holding a leaked upgrade link can at most pay $15 to send the
  Field Kit to its rightful owner.
- **Analytics never break the funnel.** A failed event is logged and swallowed.
  Losing an event is bad; losing a sale because the event log was down is worse.
- **No third-party tracking scripts.** Events go to our own route. Nothing to
  consent to, and nothing leaves our database.

---

## Email

Resend sends; **our database owns the list and the sequence state**, so the
nurture sequence can move to a broadcast platform later without the funnel
changing.

| Key | When | Subject |
| --- | ---- | ------- |
| `welcome` | immediately | Your challenge results and PLO Survival Card |
| `expensive-mistake` | day 1 | An overpair is a strong made hand (in the other game) |
| `draw-quality` | day 3 | Clean outs, dirty outs, and the straight that loses |
| `worked-hand` | day 5 | When the turn changes the board, start over |
| `inside-the-system` | day 7 | What's inside the Complete System |
| `offer-reminder` | day 10 | Your player price is still on |

`welcome` is transactional and fires from `/api/subscribe`. It is the retention
half of the results screen and carries what the player just earned: their score,
the concepts they had and the ones worth reviewing, the Survival Card, and the
link back to their player price. The concept lists are re-derived from the
submitted answers on the server, so the email can only ever name a real concept
of a real hand. Someone who asks for the Survival Card without finishing the
challenge gets no player-price block at all.

The rest are sent by `POST /api/email/dispatch`, which is idempotent and skips
the two offer-led steps for existing customers. Those two link to
`?offer=player`: the challenge is the only way onto this list, so everyone
receiving them earned that price.

**Every strategic principle in these emails is drawn from the approved
publication set** — the book and the Survival Card's eight translation errors.
No new strategy is introduced in marketing copy.

**Each layer of the funnel carries its own examples.** An email introduces an
idea with a small example of its own; the 10-Hand Challenge tests it through a
different situation; the book develops it with its worked hands; the Capstone
Quiz tests it again with still different ones. The principle repeats across the
funnel, the worked example does not. `draw-quality` and `worked-hand` were
rewritten on that basis on 2026-09-21: they previously retaught two Capstone
questions.

---

## Offers

| Offer id | Product | Price | Notes |
| -------- | ------- | ----- | ----- |
| `system` | `complete-system` | $39 | The main offer: the book plus the complete Field Kit. |
| `system-quiz` | `complete-system` | $29 | Player Price, earned by finishing the challenge. `NEXT_PUBLIC_QUIZ_OFFER_CENTS`. |
| `book` | `book` | $25 | The book alone, for a reader who wants to start there. |
| `field-kit` | `field-kit` | $19 | The Field Kit alone. Available, never a headline CTA. |
| `field-kit-upgrade` | `complete-system` | $15 | Book owners only, against the purchase's permanent upgrade entitlement. |

Set under explicit direction on 2026-09-21, replacing the earlier $19 book /
$39 system / $29 Player Price catalogue.

**The Complete System is now presented as a bundle with a visible saving.**
This reverses the earlier rule that no surface broke the system's price into
parts. Bought separately the book and the kit are $25 + $19 = $44
(`SEPARATE_TOTAL_CENTS`), so the $39 system saves $5, and the sales page says
so. A book-first buyer who later upgrades pays $25 + $15 = $40 — one dollar
more than the system upfront. That gap is intentional.

**The upgrade entitles the buyer to `complete-system`**, not to `field-kit`, so
the new download link carries the book they already own alongside the kit.
Their original book link is untouched.

**The upgrade stays available indefinitely.** The book purchase email carries
a secondary "Want the Field Kit later?" link to `/upgrade`, beneath the download
button; `/downloads` and `/thank-you` offer it too. Entitlements are
deterministic, so when support needs one -- a book bought before entitlements
existed, or a lost email -- it is regenerated from the purchase record with
`GET /api/upgrade-links?email=…` or `?purchaseId=…` (operator bearer token).
Exactly one of the two is required; the route returns only that customer's
paid, unrefunded book purchases, marks any already upgraded, and sends nothing.

**There is deliberately no bulk export.** An entitlement is a permanent signed
bearer capability, so no request returns every customer's link at once, every
response carries `Cache-Control: no-store`, and neither the query nor the links
are written to application logs. There is no current need to email all
historical book buyers; if that need arises, it should be a one-off job rather
than an endpoint.

Rotating `DELIVERY_SECRET` invalidates every entitlement along with every
download link. After a rotation, links are regenerated per customer the same
way, on request.

**The hierarchy is two offers and a quiet row.** `Pricing` gives the Complete
System and the Player Price a card each; the book, the Field Kit and the
upgrade share one understated row beneath them so none competes with the main
path. The hero states the system, then the Player Price, then one line for the
book.

**The Player Price is earned, not discounted stock.** It is presented as
`Regular price $39 / Your Player Price $29`, never as a percentage, a promo
code, a sale or a struck-through number. Every surface that promotes the
challenge says what $29 buys — the book **and** the complete Field Kit, everything
for $29, only $4 more than the book alone — so nobody has to work it out. None
of those surfaces sells at $29: each one's call to action is the challenge. See
§ The 10-Hand Challenge for the trade that comes with it.

`system-quiz` is a separate offer rather than a discount on `system` so
reporting can distinguish an earned sale from a full-price one, and so the
earned amount can move without touching a component. **The id keeps its
original name** although the 3-Hand Reality Check it referred to is gone: it is
written into `purchases.offer_id`, into that column's check constraint, and into
every historical sale. Renaming it would need a migration and would split the
sales history — the same trade already made for the `quiz_*` event names.

The two new offer ids and the `field-kit` product are admitted to the
`purchases` check constraints, and `purchases.upgrade_of` is added, by
`supabase/migrations/0003_pricing_architecture.sql`, which must run before
deploy.

**The unlock is presentation, not a security boundary.** `/api/checkout` takes
an offer id and resolves the amount server-side, so nothing chargeable is
decided in the browser and a tampered request can only select a different real
offer. But `system-quiz` is a real offer id, so someone who reads the page
source — or who constructs `/short-stack-plo?offer=player` themselves — can
select the $29 price without finishing the challenge. That has been true since
the offer was introduced and the exposure is $10 per sale. It is accepted
deliberately for this version, whose purpose is conversion testing rather than
protecting a digital-product price from technically sophisticated readers.
Closing it means minting an HMAC-signed completion token when `quiz_completed`
fires and having `/api/checkout` require one for any `quizCompleterOnly` offer —
`src/lib/delivery.ts` already has the signing pattern to copy.

### Returning to the player price

A completer who leaves an address instead of buying is emailed
`/short-stack-plo?src=results-email&offer=player`, and the two offer-led
sequence steps carry the same parameter.
[`PlayerPriceNotice`](../src/components/marketing/player-price-notice.tsx)
renders the earned price for that visitor and nothing at all for anyone else, so
the public page keeps its public price. It reads the query string in a client
component behind a `Suspense` boundary, which is what keeps `/short-stack-plo`
prerendered.

This is the simplest mechanism that works with what already exists, and it is
**not** an exclusivity guarantee — see the security note above. There is no
expiry, no countdown, and no fabricated scarcity: the price is theirs because
they finished the challenge.

---

## Site origin

`siteUrl` ([`src/lib/site.ts`](../src/lib/site.ts)) is not cosmetic: Stripe's
success and cancel URLs, every link in every email, canonical tags, OpenGraph
URLs, and the sitemap are all built from it.

It defaults to `https://warofpoker.com`, so **production needs no configuration
to be correct**. Any other host overrides it with `NEXT_PUBLIC_SITE_URL`; on
Vercel this is detected automatically. A deploy whose origin is not the
production domain is served `noindex` and a `Disallow: /` robots.txt, so a
staging copy never competes with the real site in search.

---

## Required external setup

Nothing below is done. The application builds and runs without any of it; each
step turns on one capability.

### 1. Supabase

1. Create a project.
2. Run `supabase/migrations/0001_growth_loop.sql` in the SQL editor.
3. Create a **private** Storage bucket named `products`.
4. Copy the project URL and the **service-role** key into `SUPABASE_URL` and
   `SUPABASE_SERVICE_ROLE_KEY`.

### 2. Upload the product files

The final files are not in this repository. Upload them to the `products`
bucket at exactly these paths — they are what
[`src/lib/delivery.ts`](../src/lib/delivery.ts) and
[`src/lib/field-kit.ts`](../src/lib/field-kit.ts) request:

```
short-stack-plo/Short_Stack_PLO.pdf
short-stack-plo/field-kit/01_Full-Hand_Decision_Map.pdf
short-stack-plo/field-kit/02_60BB_Preflop_and_Pot_Geometry_Guide.pdf
short-stack-plo/field-kit/03_Flop_and_Draw_Quality_Card.pdf
short-stack-plo/field-kit/04_River_Decision_Card.pdf
short-stack-plo/field-kit/05_Player_Read_and_Live_Exploit_Card.pdf
short-stack-plo/field-kit/06_Session_and_Hand_Review_Workbook.pdf
short-stack-plo/field-kit/07_20-Hand_Capstone_Quiz_and_Answer_Key.pdf
```

The free Survival Card is served publicly from
`public/downloads/nlh-to-plo-survival-card.pdf` — **this file does not exist
yet** and must be added before the quiz's email exchange delivers anything.

### 3. Stripe

1. Use **test mode** first. Copy the secret key into `STRIPE_SECRET_KEY`.
2. Locally: `stripe listen --forward-to localhost:3000/api/stripe/webhook`,
   then copy the printed `whsec_…` into `STRIPE_WEBHOOK_SECRET`.
3. In production: add an endpoint at `https://<domain>/api/stripe/webhook`
   subscribed to `checkout.session.completed`, and copy its signing secret.

No Stripe Products need creating: line items are built inline from the offer
catalogue.

### 4. Resend

1. Verify a sending domain.
2. `RESEND_API_KEY`, and `EMAIL_FROM` as e.g.
   `River Potter <river@warofpoker.com>`.

### 5. Secrets

```bash
openssl rand -base64 48   # DELIVERY_SECRET
openssl rand -base64 32   # GROWTH_DASHBOARD_TOKEN
```

Rotating `DELIVERY_SECRET` invalidates every outstanding download link.

### 6. Schedule the sequence

Call `POST /api/email/dispatch` a few times a day with
`Authorization: Bearer $GROWTH_DASHBOARD_TOKEN`. On Vercel, a cron entry in
`vercel.json` plus a scheduled function; anything that can send a bearer token
works.

---

## Open items

- **Hosting is not yet Node-capable.** This app cannot be statically exported:
  the Stripe webhook, checkout, signed downloads, and `/growth` all render on
  demand and need a Node runtime running `next start` behind a reverse proxy.
  The production target is Hostinger, replacing the current PHP site at
  `warofpoker.com` at launch — confirm the plan runs Node well before then.
- The contact inbox and the Terms' governing law are still unconfirmed
  defaults — see `src/lib/legal.ts`.
- `/learn` has no articles. This is deliberate; the queued topics are listed in
  [`src/lib/content/articles.ts`](../src/lib/content/articles.ts).
- No refund handling. `purchases.status` allows `refunded`, but no
  `charge.refunded` webhook handler writes it.
