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
CONTENT → QUIZ → EMAIL → PRODUCT PAGE → PURCHASE → DELIVERY → ANALYTICS → BETTER CONTENT
```

The system exists to answer one question: **which content creates customers.**
Everything below serves that.

---

## Routes

| Route | Purpose |
| ----- | ------- |
| `/` | War of Poker homepage. Flagship + free quiz. |
| `/short-stack-plo` | The sales page. $49 Complete System dominant, $29 book secondary. |
| `/plo-reality-check` | The free 3-Hand PLO Reality Check. |
| `/learn`, `/learn/[slug]` | Article index and template. |
| `/river-potter` | Minimal author page. |
| `/thank-you` | Post-purchase. Verifies payment with Stripe. |
| `/downloads` | Purchaser's file list, gated by a signed token. |
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

A published piece links to `/plo-reality-check?src=EPM-001`. From there:

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

## Data model

`supabase/migrations/0001_growth_loop.sql`.

- **`content_pieces`** — one row per published piece, keyed on `content_id`.
- **`subscribers`** — one row per email address. Attribution on insert only;
  quiz state refreshed on every upsert.
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
  Field Kit file.
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
| `welcome` | immediately | Your PLO Survival Card (+ quiz-completer offer) |
| `expensive-mistake` | day 1 | An overpair is a strong made hand (in the other game) |
| `draw-quality` | day 3 | Clean outs, dirty outs, and the 22 that were really 19 |
| `worked-hand` | day 5 | When the turn changes the board, start over |
| `inside-the-system` | day 7 | What's inside the Complete System |
| `offer-reminder` | day 10 | Your Reality Check price is still on |

`welcome` is transactional and fires from `/api/subscribe`. The rest are sent by
`POST /api/email/dispatch`, which is idempotent and skips the two offer-led
steps for existing customers.

**Every strategic claim in these emails is drawn from the approved publication
set** — the Survival Card's eight translation errors and the three Reality Check
hands. No new strategy is introduced in marketing copy.

---

## Offers

| Offer id | Product | Price | Notes |
| -------- | ------- | ----- | ----- |
| `book` | `book` | $29 | Book only. |
| `system` | `complete-system` | $49 | Book + 7-piece Field Kit + Capstone Quiz. |
| `system-quiz` | `complete-system` | $39 | Quiz-completer price. `NEXT_PUBLIC_QUIZ_OFFER_CENTS`. |

`system-quiz` is a separate offer rather than a discount on `system` so
reporting can distinguish a promotional sale from a full-price one, and so the
promotional amount can move without touching a component.

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
