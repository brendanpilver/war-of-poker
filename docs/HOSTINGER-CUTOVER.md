# Hostinger production cutover runbook

Implementation record, **not** doctrine. Written 2026-10-13 after the staging
release milestone. Nothing here has been executed against production yet.

## Decisions this plan implements

- Production is **Hostinger** at `https://warofpoker.com`. Vercel is obsolete.
- The Next.js app replaces WordPress at `warofpoker.com`. WordPress and
  WooCommerce move, intact, to `shop.warofpoker.com`.
- Production gets its **own** Supabase project on a plan that never pauses.
  Staging keeps its own project and Stripe **test** mode. Stripe **live** mode
  exists only in production.
- GA4 and Search Console are kept; first-party funnel tracking stays.
- Publication assets and the canonical cover are frozen.

## Where things stand (verified 2026-10-13)

| Component | State |
|---|---|
| Hostinger plan | Cloud Startup, renews 2030-06-29. Web apps 1 / 10. |
| Staging app | `staging.warofpoker.com`, GitHub `brendanpilver/war-of-poker`, branch `main`, Node 22.x, Next.js 16.3.4, default build settings. Running `f225be4`. |
| Staging env | `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `STRIPE_SECRET_KEY` (test), `STRIPE_WEBHOOK_SECRET`, `RESEND_API_KEY`, `EMAIL_FROM`, `DELIVERY_SECRET`, `NEXT_PUBLIC_SITE_URL=https://staging.warofpoker.com`. Missing (optional): `GROWTH_DASHBOARD_TOKEN`. |
| Staging Supabase | Project `lxgygfljxprijpakxdvg`, Free plan, migrations 0001–0003 applied, RLS on, private `products` bucket with all nine PDFs. Test data only. |
| End-to-end test | $29 test purchase passed: payment, webhook (once), purchase row, email, nine byte-identical downloads, tampered/absent tokens rejected. |
| WordPress | `warofpoker.com` on the same Hostinger plan (31.97.97.15): WooCommerce (8 merch products, PayPal, WooPay, WooCommerce Shipping), MailPoet, Jetpack, Site Kit, Google Listings & Ads, Pinterest, CookieYes. 39 sitemap URLs. |
| DNS | Hosted at Hostinger (`dns-parking.com`); registrar is external. MX → Hostinger Mail; SPF `include:_spf.mail.hostinger.com`; DKIM `hostingermail-a._domainkey`; DMARC `p=none`; Resend DKIM `resend._domainkey`; Resend `send` subdomain. |

### Defect fixed before launch: webhook replays (commit `4ffda7c`)

The webhook upserted the purchase on `stripe_checkout_session_id`, so a retried
`checkout.session.completed` never created a second row. But every delivery
also recorded a `purchase_completed` event, sent the purchase email and
rewrote `status` to `paid`, so a Stripe retry would have sent a second email,
counted a second conversion and, after a refund, flipped the purchase back
to `paid` and re-granted the book owner's upgrade entitlement.

Fixed in `src/lib/purchases.ts`: the session is recorded with ON CONFLICT DO
NOTHING, and only the delivery that creates the row records the conversion
and emails the buyer. A replay returns `200 {received: true, duplicate: true}`.
Covered by `tests/purchases.test.ts`, then by the staging replay test (§3).
Accepted trade-off: if the first delivery records the row and then fails
before emailing, a retry won't email either. The buyer still has /thank-you,
which mints the same link from the verified session, and support can resend.

---

## 1 · Production environment (Hostinger)

**Approach:** a second Hostinger web app built from the same repository and
branch as staging, with production environment variables. No new branch, no
code fork.

**Release rule: production only ever runs a commit that has passed on staging.**
Verified 2026-10-14: a Hostinger web app deploys automatically on every push to
the branch chosen when it is created ("From pushes to war-of-poker"), and
offers **Redeploy** but no switch to turn automatic deploys off (Hostinger's
[GitHub deploy docs](https://docs.hostinger.com/node.js/github)). So production
tracks a **`production` branch used only as a release pointer**:

- Staging tracks `main`, as now.
- Releasing = fast-forwarding `production` to a commit already verified on
  staging: `git push origin <verified-sha>:production`. No commits are ever
  made on `production`, so there is still one codebase.
- Rolling back the code = pushing the previous verified sha to `production`
  (a non-fast-forward push, made deliberately).

**Two production apps, same code and same production services.**

- **`launch.warofpoker.com`** is created first. It gets the real production
  services (its own Supabase, live Stripe, production Resend key), so live
  payments are proven before the domain moves. Its site URL isn't the
  production domain, so it's automatically `noindex`. After cutover it stays
  running as the **standby** for rollback, so rollback never has to move an
  app between domains.
- **`warofpoker.com`** is created at cutover with identical settings and
  environment variables, except `NEXT_PUBLIC_SITE_URL=https://warofpoker.com`.

Both use the same Supabase project, Stripe account and `DELIVERY_SECRET`, so a
download link emailed by either one works on either host, and a purchase
recorded through either one is the same record.

Settings (copy staging exactly):

| Setting | Value |
|---|---|
| Repository / branch | `brendanpilver/war-of-poker` / **`production`** (release pointer, see above) |
| Root directory | `./` |
| Framework | Next.js |
| Build and output | Default (staging's, which run `npm ci`/`npm run build`/`npm start`) |
| Node version | 22.x (`npm test` needs 22.18+; Next 16 needs 20.9+) |
| Deploys | Automatic on push to `production` only |
| SSL | Hostinger's free certificate on each app's domain (`launch`, then `warofpoker.com` and `www`) |

Production environment variables (values never committed or pasted in chat):

| Variable | Production value |
|---|---|
| `SUPABASE_URL` | production project URL (§2) |
| `SUPABASE_SERVICE_ROLE_KEY` | production service-role (secret) key |
| `STRIPE_SECRET_KEY` | **live** secret key `sk_live_…` |
| `STRIPE_WEBHOOK_SECRET` | signing secret of the **live** endpoint (§3) |
| `RESEND_API_KEY` | a new, production-only Resend key |
| `EMAIL_FROM` | `River Potter <river@warofpoker.com>` (same as staging) |
| `DELIVERY_SECRET` | **new** value: `openssl rand -base64 48`. Never reuse staging's. |
| `GROWTH_DASHBOARD_TOKEN` | new value: `openssl rand -base64 32` |
| `NEXT_PUBLIC_SITE_URL` | `https://launch.warofpoker.com` on the launch app; `https://warofpoker.com` on the main app (set explicitly rather than relying on the default) |
| `NEXT_PUBLIC_GA_MEASUREMENT_ID` | the existing GA4 ID, only if GA4 is added (§5) |

`NEXT_PUBLIC_*` values are compiled into the build. Changing or deleting one
requires a **Redeploy**, not just a save.

**Verified 2026-10-13:** a local production build with
`NEXT_PUBLIC_SITE_URL=https://warofpoker.com` produced canonical URLs,
`og:url`, `og:image`, the sitemap (8 URLs) and robots (`Allow: /`, no
`noindex`) all on `https://warofpoker.com`, with no `staging`, `launch` or
`vercel.app` host anywhere in the server build. Checkout success and cancel
URLs, the purchase email's download link, the upgrade link and the welcome
email's links are all built from the same value at runtime
(`src/app/api/checkout/route.ts`, `src/app/api/stripe/webhook/route.ts`,
`src/lib/book-ownership.ts`, `src/app/api/subscribe/route.ts`). They are
confirmed on the real host in §6.

## 2 · Supabase production

**Plan:** a **new organization** (e.g. "War of Poker — Production") on
**Supabase Pro** (about $25/month; it includes compute credit that covers one
small project, and Pro projects never pause). Leave staging in the existing
Free organization. Upgrading the existing org instead would also bill
staging's compute. Confirm current pricing on Supabase's pricing page before
paying.

Steps:

1. Create the organization on Pro, then a project: name `war-of-poker-production`,
   region **East US (North Virginia)** (same as staging), strong database
   password saved in your password manager.
2. SQL editor → run, in order, the files in `supabase/migrations/`:
   `0001_growth_loop.sql`, `0002_ten_hand_challenge.sql`,
   `0003_pricing_architecture.sql`, `0004_delivery_email_state.sql`. They are
   the exact schema validated on staging.
3. Verify with the same read-only checks used on staging: five tables, the
   three check constraints, `purchases.upgrade_of`,
   `purchases.delivery_emailed_at` and `delivery_email_claimed_at`, RLS on all
   five tables.
4. Create the bucket (SQL editor):
   `insert into storage.buckets (id, name, public) values ('products', 'products', false);`
   Confirm `public = false` and that `pg_policies` has no storage policies.
5. Upload `publication_final/supabase_upload_2026-10-13/short-stack-plo` into
   `products` (same method as staging). Verify nine objects, exact paths and
   byte sizes.
6. Project Settings → API keys: copy the project URL and the service-role /
   secret key into the Hostinger production env vars. Never into the browser,
   repo or chat.

**Migrate nothing from staging.** Staging data is all test data (four Sept 24
book test purchases, one $29 test purchase, test subscribers). Production
starts empty. The only shared things are the schema (from migrations) and the
nine files (from the publication set).

## 3 · Stripe and fulfillment

### Live Stripe

1. **Done (owner, 2026-10-14):** the Stripe account is activated for live
   payments. "War of Poker sandbox" stays the staging environment.
2. Set the statement descriptor (e.g. `WAR OF POKER`) and support email.
3. Developers → API keys (live) → copy the secret key into production
   `STRIPE_SECRET_KEY`.
4. Developers → Webhooks (live) → Add endpoint
   `https://launch.warofpoker.com/api/stripe/webhook`, events
   **`checkout.session.completed`** and **`charge.refunded`**. Copy its signing
   secret into `STRIPE_WEBHOOK_SECRET` on **both** production apps. At cutover
   the endpoint URL is edited to the main domain (§5). Editing an endpoint's
   URL keeps its signing secret.

**Stripe does not follow redirects; a 3xx is a failed delivery.** Before any
endpoint is created or edited, check the exact URL with
`curl -sS -o /dev/null -w "%{http_code} %{redirect_url}\n" -X POST <url>`. It
must return **400** (the app's "Missing signature.") with no redirect URL. A
301/302/307/308 means the host, `www`/apex choice, scheme or trailing slash is
wrong.
5. No Products or Prices need creating: checkout builds line items from
   `src/lib/offers.ts` server-side.

Offers that must behave exactly as on staging:

| Offer id | Price | Delivers |
|---|---|---|
| `system` | $39 | book + Start Here + Field Kit 01–07 |
| `system-quiz` | $29 (`NEXT_PUBLIC_QUIZ_OFFER_CENTS` unset → 2900) | same nine |
| `book` | $25 | book, plus the upgrade link in the email |
| `field-kit` | $19 | Start Here + Field Kit 01–07 |
| `field-kit-upgrade` | $15, book owners only | same nine (book kept on the same link) |

### Refunds, downloads and email recovery (commit `f469aa6`)

- **Refund policy:** a confirmed **full** refund closes the purchase's
  downloads (download route, downloads page and thank-you page all check the
  purchase status) and revokes a book's upgrade entitlement. A **partial**
  refund leaves the purchase `paid`, so access continues.
- **Refund before purchase:** if `charge.refunded` arrives before
  `checkout.session.completed`, there is no row to mark; it is acknowledged and
  logged. The completed handler asks Stripe whether the payment is already
  fully refunded and, if so, records it as `refunded` with no conversion and no
  delivery.
- **Purchase email recovery:** one webhook delivery claims the send
  (`delivery_email_claimed_at`) and marks success (`delivery_emailed_at`). On
  failure the claim is released and the webhook returns 500, so Stripe's
  redelivery sends it. Purchases still owed an email:
  `select id, email, created_at from purchases where status = 'paid' and delivery_emailed_at is null and created_at < now() - interval '15 minutes';`
  To resend one: Stripe → the endpoint → find that session's
  `checkout.session.completed` delivery → **Resend**.

### Resend

The `warofpoker.com` domain already sends (staging's mail reached a Gmail inbox
from `river@warofpoker.com`). Create a second API key named "production" with
sending access only, and use it in production. Revoking one environment's key
then never affects the other.

### Sequence emails

`POST /api/email/dispatch` sends the five follow-up emails. It has never been
scheduled. After launch, add a Hostinger cron job (website → Advanced → Cron
Jobs) running a few times a day:
`curl -fsS -X POST -H "Authorization: Bearer <GROWTH_DASHBOARD_TOKEN>" https://warofpoker.com/api/email/dispatch`.
This doesn't block sales.

### Analytics job (not part of launch)

The content experiment engine is built on the `feature/content-experiment-engine`
branch and is **not** part of the cutover. It is activated after launch, on
direction, through staging first. Its steps are in
[`CONTENT-EXPERIMENTS.md` § Activation](./CONTENT-EXPERIMENTS.md#activation-after-launch-on-direction).
When active it only reads purchases and events, and doesn't block sales.

### Staging-only replay test (before cutover)

Run on `f469aa6`. Setup: the 2026-10-13 $29 test purchase
(`b83645cf…`) has its email marked owed, as if the original send failed.

| Step (Stripe sandbox) | Expected |
|---|---|
| 1. Resend that purchase's `checkout.session.completed` to the staging endpoint | One recovery purchase email arrives; `delivery_emailed_at` set; still 1 row, 1 conversion |
| 2. Resend it again | No email; nothing changes |
| 3. Refund the $29 payment in full | Row → `refunded`; its download links → 403; downloads page says refunded |
| 4. Resend `checkout.session.completed` once more | Row stays `refunded`; no email; 1 conversion |
| 5. Optional, refund-first ordering: disable the staging endpoint, make a new $29 test purchase and refund it, re-enable, then resend `charge.refunded` first and `checkout.session.completed` second | Row created as `refunded`; no conversion; no email |

**Result, 2026-10-14/15 — passed. Release commit: `f469aa6`.** Replays: one row,
one conversion, exactly one recovery email (claimed and sent once). The full
refund was delivered as `charge.refunded` → row `refunded`; all nine downloads
return 403 "This purchase was refunded, so its downloads are closed."; the
downloads page shows the refund message and no links. (The first refund attempt
on 10/14 had not actually been made in Stripe, which is why nothing was
delivered then.) Step 5 is covered by unit tests and was not run.

## 4 · WordPress preservation — copy, never move

### Why the WordPress site is copied, not moved

Hostinger's documentation on **Change domain** says it deletes email data tied
to the domain, resets the domain's DNS records, removes subdomains (their
files are kept), and makes the site's existing backups inaccessible. Sources:
[change a website's domain](https://www.hostinger.com/support/6807580-connecting-a-different-domain-to-your-existing-website-at-hostinger/),
[temporary domain](https://www.hostinger.com/support/how-to-switch-to-a-temporary-domain-in-hpanel/).
Verified 2026-10-13: this account has **no Hostinger mailboxes** (hPanel →
Emails shows only the free-email offer), but the DNS zone (MX, SPF, DKIM,
DMARC, Resend, `staging`) is still at risk. So the live WordPress site is never
moved. It's **copied** to `shop.warofpoker.com` with Hostinger's
[Copy Website](https://docs.hostinger.com/wordpress/copy-website) tool, which
clones files and database and rewrites URLs to the new address. Email, FTP and
SSH settings are not copied; none are in use.

The original site stays untouched until cutover, then stays frozen as the
rollback source.

### 4.1 Backups (before anything else)

1. hPanel → `warofpoker.com` → Files → Backups → create a backup, then
   **download** the files and the database archives to your computer.
2. WP Admin → WooCommerce → Orders → export all orders (CSV). Export customers
   too. Note the **highest order number**.
3. Screenshot: WP Admin → Plugins; WooCommerce → Settings → Payments;
   WooCommerce → Settings → Advanced → REST API and Webhooks (this shows the
   fulfillment app, e.g. Printful); Google Listings & Ads; Pinterest; MailPoet
   sending settings; Site Kit.
4. hPanel → Domains → DNS → `warofpoker.com`: copy the **entire zone** into a
   file (type, name, value, TTL). This is the restore list for §5.

### 4.2 Validation copy (days before cutover)

1. Create `shop.warofpoker.com` as its **own website** in hPanel, the way
   `staging.warofpoker.com` is its own website, so it doesn't depend on the
   original site's subdomain list. Afterwards, compare the DNS zone with
   §4.1 step 4: only a new `shop` record may appear.
2. hPanel → `warofpoker.com` → WordPress → **Copy Website** → destination
   `shop.warofpoker.com`. The copy takes up to about 15 minutes. If Copy Website
   isn't offered on this plan, use a migration plugin (Duplicator or All-in-One
   WP Migration) from the original to the new site instead.
3. On the **copy only**: WooCommerce → Settings → Site visibility → **Coming
   soon**, and disable every payment gateway, so the copy can't take orders or
   send gateway callbacks while the original is still live.
4. Validate the copy: pages, the 8 products and images (URLs now `shop.…`),
   a customer log-in, order history in WP Admin (highest order number matches
   the original), Terms of Sale and Privacy pages.
5. **Simulated rollback for download links** (§6.3): add the rollback rewrite
   rules to the copy's `.htaccess`, then open
   `https://shop.warofpoker.com/downloads?token=<a real launch-rehearsal token>`.
   It must arrive at `https://launch.warofpoker.com/downloads?token=<same token>`,
   list the files and download them. Remove the rules afterwards.

### 4.3 Order freeze and final copy (cutover day, first step)

1. On the **original**: WooCommerce → Settings → Site visibility → **Coming
   soon** (the store stops taking orders). Note the final highest order number.
2. Run **Copy Website** again, original → `shop.warofpoker.com`. It overwrites
   the validation copy with the current store, including every order placed
   since §4.2.
3. Check the copy's highest order number equals the original's final number.
4. On the copy, reconnect the domain-bound integrations to
   `shop.warofpoker.com`: payment gateways (PayPal/WooPay webhook and return
   URLs), the fulfillment app's store URL (Printful or whatever §4.1 shows),
   Google Listings & Ads / Merchant Center, Pinterest, Jetpack, Site Kit (same
   GA4 property), MailPoet. Re-enable the payment gateways.
5. Place one cheap test order end to end on the copy, then refund it.
6. Set the copy to **Live**. From here on, orders exist only on
   `shop.warofpoker.com`. The original stays in Coming soon, so orders can
   never split between two databases.

### 4.4 Legacy URL redirects (in the Next.js app, tested on staging first)

| Old `warofpoker.com` URL | New home |
|---|---|
| `/privacy-policy/` | `/privacy` |
| `/terms-of-use/` | `/terms` |
| `/terms-of-sale/` | `https://shop.warofpoker.com/terms-of-sale/` (merch sales terms stay with the shop) |
| `/about/` | `/river-potter` **(owner to confirm, or `/`)** |
| 5 strategy articles, `/posts/`, `/category/*`, `/author/*` | same path on `shop.warofpoker.com`. No equivalent pages exist on the new site yet; redirecting articles to a sales page would lose their content. |
| `/shop/`, `/product/*`, `/product-category/*`, `/cart/`, `/checkout/`, `/my-account/` | same path on `shop.warofpoker.com` (old order and account links keep working) |
| `/?mailpoet_page=…` (unsubscribe links in past emails) | `https://shop.warofpoker.com/?mailpoet_page=…` |
| `/wp-content/*`, `/wp-sitemap*.xml`, `/feed/`, `/wp-admin/*`, `/wp-login.php`, `/wp-json/*` | same path on `shop.warofpoker.com` |

Paths and query strings are preserved. Redirects don't fix server-to-server
callbacks (payment webhooks, fulfillment APIs); those are reconnected at the
source in §4.3.

## 5 · Domain cutover

### 5.1 To resolve before authorizing: how Hostinger hands over the apex

The original WordPress website currently owns `warofpoker.com` in hPanel. A web
app can only take the domain once that website releases it, and every release
path visible in hPanel (Change domain, temporary domain, Delete) runs through
the flow that Hostinger says resets DNS records and removes subdomains.
**Ask Hostinger support for their supported procedure, in writing:**

> On Cloud Startup, how do I move the primary domain `warofpoker.com` from my
> existing WordPress website to a new Node.js web app on the same plan, while
> keeping (a) the DNS zone (MX, SPF, DKIM, DMARC, other TXT records and the
> `staging` and `shop` subdomain records) unchanged, (b) the separate
> `staging.warofpoker.com` and `shop.warofpoker.com` websites untouched, and
> (c) the WordPress site's files and database intact on a temporary domain?

Whatever the answer, the §4.1 zone export is the restore list. Every record in
it is checked after the handover.

### 5.2 Cutover sequence (one sitting, quiet hour)

The launch app keeps running throughout, and the live Stripe webhook keeps
pointing at it until step 8, so checkouts and webhooks keep working while the
apex is between owners.

1. **Freeze:** no pushes to `main`. Confirm the launch app runs the release
   commit.
2. **Shop:** §4.3 order freeze, final copy and reopen on `shop.warofpoker.com`.
3. **DNS snapshot:** re-export the zone (it now includes `shop`).
4. **Release the apex** from the original WordPress site by Hostinger's
   confirmed procedure (expected: Change domain → temporary domain). The
   original stays intact and frozen on the temporary domain.
5. **Restore DNS:** compare the zone with step 3 and re-create anything reset
   or removed (MX, SPF, DMARC, `hostingermail-a._domainkey`,
   `resend._domainkey`, `send`, `staging`, `shop`, `www`). Check with `dig`.
6. **Create the main app** on `warofpoker.com`: identical settings and
   environment variables to the launch app, with
   `NEXT_PUBLIC_SITE_URL=https://warofpoker.com` and automatic deploys off.
   Deploy the release commit (about 2 minutes).
7. **SSL and canonical host:** certificates active for `warofpoker.com` and
   `www.warofpoker.com`; `http://` and `www` redirect to
   `https://warofpoker.com`.
8. **Webhook switch:**
   1. Validate the target with the §3 check:
      `https://warofpoker.com/api/stripe/webhook` → `400`, no redirect.
   2. Stripe (live) → the endpoint → edit its URL to that address.
   3. Stripe → the endpoint → Event deliveries: confirm the next event
      returns 2xx, and that nothing is pending or failed. Resend anything that
      failed; replays are now harmless.
9. **Run §6.2.**

The apex is dark from step 4 to step 7, roughly 10–30 minutes plus DNS and
SSL issuance. Sales still work on the launch app during that window.

## 6 · Production validation and rollback

### 6.1 Rehearsal on `launch.warofpoker.com` (before cutover)

- One **live** $29 purchase with a real card → purchase row `paid` 2900,
  webhook delivered once, email received, nine downloads byte-identical →
  **refund** in Stripe → row becomes `refunded`, and the refund delivery shows
  2xx in Stripe.
- One live $39 purchase (`/short-stack-plo`, no challenge) → same checks →
  refund.
- Optional: a $25 book purchase, its email's upgrade link opening the $15
  checkout, then refund both. Check that the refunded book's upgrade link now
  refuses checkout (entitlement revoked).
- Keep one rehearsal purchase email for §6.2 step 7 and the §4.2 simulated
  rollback.

### 6.2 Smoke test after cutover (on `warofpoker.com`)

1. `/`, `/short-stack-plo`, `/river-potter`, `/learn`, `/privacy`, `/terms`,
   `/contact` load on desktop and on a phone; the canonical cover shows.
2. View source on `/short-stack-plo`: canonical, `og:url` and `og:image` are
   `https://warofpoker.com/…`, and there's no `noindex`. `robots.txt` says
   `Allow: /`; `sitemap.xml` lists `https://warofpoker.com/…`.
3. `/plo-challenge`: play ten hands; the result shows the $29 player price.
4. $29 checkout opens Stripe **live** at $29.00; `/short-stack-plo` checkout
   opens at $39.00. Cancel returns to `https://warofpoker.com/short-stack-plo`.
5. One real $29 purchase on the main domain (recommended): Stripe success
   returns to `https://warofpoker.com/thank-you`; the webhook delivery shows
   2xx; one purchase row and one `purchase_completed` event; the email's link
   is `https://warofpoker.com/downloads?token=…`; all nine downloads work;
   then refund it and confirm the row becomes `refunded`.
6. `/api/download/book` with no token and with an altered token → 403.
7. **Already-emailed links:** the rehearsal email's
   `https://launch.warofpoker.com/downloads?token=…` link still works (the
   launch app keeps running), and so does the step-5 main-domain link.
8. `/downloads/nlh-to-plo-survival-card.pdf` → 200, the release PDF. The
   Survival Card's link and QR code → `warofpoker.com/short-stack-plo` loads.
9. `https://shop.warofpoker.com`: shop, product page, cart, customer log-in
   and order history. The §4.3 test order already proved checkout.
10. Old URLs: one sample from every redirect-table row lands correctly.
11. GA4 Realtime shows the visit (if GA4 was added). Search Console accepts
    `https://warofpoker.com/sitemap.xml` and
    `https://shop.warofpoker.com/wp-sitemap.xml`.

### 6.3 Reconciliation checks (after cutover, and after any rollback)

Run for the window from the order freeze to now:

1. **Payments vs purchases:** Stripe (live) → Payments, filtered to the
   window. Every succeeded Checkout payment has exactly one `purchases` row
   with the same session id and amount (I run the SQL). For a payment with no
   row: Stripe → Webhooks → the endpoint → find the delivery → **Resend**. It's
   idempotent, so resending is safe.
2. **Refunds:** every refunded payment's row says `refunded`. If not, resend
   that `charge.refunded` event.
3. **Webhook health:** the live endpoint has no failed or pending deliveries in
   the window.
4. **Entitlements:** no refunded book purchase still has a live upgrade (no
   paid `upgrade_of` pointing at a refunded book). Complete System and Field
   Kit rows have their nine or eight files available through the emailed link.
5. **Shop:** the highest order number on `shop.warofpoker.com` is at least the
   original's final number, and the original took no orders after the freeze.

### 6.4 Rollback

Rollback is a procedure, not an instant switch: re-attaching the apex to the
original WordPress site goes through the same Hostinger flow as the cutover,
then DNS and SSL. Prefer fixing forward for content or layout problems.
**Roll back only if purchasing or delivery fails on the main domain and can't
be fixed within about 30 minutes.**

1. **Payments first:** validate `https://launch.warofpoker.com/api/stripe/webhook`
   (`400`, no redirect), then point the live Stripe endpoint back to it. The
   launch app is already running with the same database and secrets, so
   checkouts and webhooks continue without interruption.
2. **Apex:** re-attach `warofpoker.com` to the original, frozen WordPress site
   by Hostinger's procedure, then restore any reset DNS records from the zone
   export.
3. **Shop stays on `shop.warofpoker.com`.** Don't reopen the original's
   checkout. Keep it in Coming soon and point its shop pages to
   `shop.warofpoker.com`, so orders never split between two databases.
4. **Keep emailed download links working:** on the original, enable the
   `.htaccess` rules tested in §4.2. They send `/downloads`, `/thank-you` and
   `/api/download/*` to the same path on `launch.warofpoker.com`, with the
   query string preserved (`[R=302,L,QSA]`). Test one real link.
5. **Reconcile** (§6.3) for the whole window, and resend any failed
   deliveries.
6. Find and fix the fault on the main app, then repeat §5.2 from step 4.

Where things can still go wrong, and the check that catches it:

| Risk | Check / recovery |
|---|---|
| Webhook deliveries fail while an endpoint points at a host that isn't serving | Endpoint delivery log; Stripe also retries automatically for days; resend manually (idempotent). |
| A buyer pays twice, e.g. a double-click opens two Checkout sessions | Not caused by rollback, but visible in reconciliation as two rows; refund one. |
| An email sent during rollback links to a host in transition | The §4.2-tested rewrite rules; the §6.2 step 7 link test. |
| A refund lands mid-switch | Reconciliation step 2; resend `charge.refunded`. |
| WordPress orders split between databases | Original stays in Coming soon; reconciliation step 5. |

## 7 · Decommissioning Vercel

After production has passed §6 and run cleanly for a few days:

1. Vercel → project `war-of-poker` → Settings → Git → **Disconnect**, so
   pushes stop building there.
2. **Optional redirect:** Settings → Domains → `war-of-poker.vercel.app` →
   Edit → Redirect to `https://warofpoker.com`. Vercel's docs cover domain
   redirects generally; redirecting the default `vercel.app` domain is
   described by a third-party guide but not explicitly in Vercel's docs. If the
   option is offered, verify it with
   `curl -sI https://war-of-poker.vercel.app/` (expect a 3xx to
   `warofpoker.com`). If it isn't, skip it.
3. Delete the project after two to four weeks.

Nothing depends on the Vercel copy: it was always `noindex`, it was never
configured with Stripe, Supabase or Resend (checkout and webhook returned
503), and no email or document links to it.

## 8 · Go / no-go

Maintained in the session report; summary of the conditions:

- **Verified:** staging end to end (payment, webhook once, record, email, nine
  downloads, token rejection); the webhook idempotency fix (unit tests, then
  the staging replay test); the production-URL build output.
- **Support mail, resolved 2026-10-14:** mail to `@warofpoker.com` was not
  received at all (Hostinger's MX answered `554 Relay access denied` for every
  address). The owner set up Hostinger email for the domain (Starter Business,
  free trial to 2027-10-14 with auto-renewal on), created the mailbox
  `river@warofpoker.com`, and made `contact@warofpoker.com` an alias of it. Both
  are now accepted by `mx1.hostinger.com` (`250 Ok`); unknown addresses are
  still rejected. MX records are unchanged.
- **Must be true before authorization:** release commit verified on staging;
  production Supabase on Pro with nine files verified; live rehearsal passed
  and refunded; production app auto-deploy off; validation copy of the shop
  checked, including the simulated-rollback link test; backups and the zone
  export downloaded; Hostinger's written procedure for releasing the apex;
  redirects verified on staging; mail to `river@` and `contact@` confirmed
  deliverable.
