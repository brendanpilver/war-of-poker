import type { Metadata } from "next";
import { ADMIN_COOKIE, isAuthorizedToken } from "@/lib/admin-auth";
import { env } from "@/lib/env";
import { loadGrowthMetrics, type GrowthMetrics } from "@/lib/growth-metrics";
import { formatPrice, offerIds, offers } from "@/lib/offers";
import { cookies } from "next/headers";

/**
 * The internal growth dashboard.
 *
 * One question above all others: which content creates customers. The top
 * sources table answers it; everything above is the funnel that explains why.
 *
 * Access is the operator token, supplied as `?token=` once and then kept in an
 * httpOnly cookie. Never indexed.
 */

export const metadata: Metadata = {
  title: "Growth | War of Poker",
  robots: { index: false, follow: false, nocache: true },
};

export const dynamic = "force-dynamic";

const percent = new Intl.NumberFormat("en-US", {
  style: "percent",
  maximumFractionDigits: 1,
});
const number = new Intl.NumberFormat("en-US");

function Stat({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="bg-ink p-5">
      <p className="font-mono text-[10px] tracking-[0.16em] text-bone-faint uppercase">
        {label}
      </p>
      <p className="mt-2 text-3xl font-semibold text-bone tabular-nums">{value}</p>
      {hint && <p className="mt-1 text-xs text-bone-faint">{hint}</p>}
    </div>
  );
}

function Dashboard({ metrics }: { metrics: GrowthMetrics }) {
  const { funnel, purchases, rates, challengeOutcomes } = metrics;

  return (
    <>
      <section aria-labelledby="funnel-title" className="mt-12">
        <h2
          id="funnel-title"
          className="font-mono text-[11px] tracking-[0.18em] text-gold uppercase"
        >
          Funnel · last 30 days
        </h2>
        <div className="mt-5 grid gap-px border border-line bg-line sm:grid-cols-2 lg:grid-cols-3">
          <Stat label="Page views" value={number.format(funnel.pageViews)} />
          <Stat label="Product page views" value={number.format(funnel.productViews)} />
          <Stat label="Challenge starts" value={number.format(funnel.quizStarts)} />
          <Stat
            label="Challenge completions"
            value={number.format(funnel.quizCompletions)}
            hint={`${percent.format(rates.quizCompletion)} completion rate`}
          />
          <Stat
            label="Player price unlocked"
            value={number.format(funnel.discountsUnlocked)}
            hint={`${number.format(funnel.resultsViewed)} results screens viewed`}
          />
          <Stat
            label="Emails captured"
            value={number.format(funnel.emailsCaptured)}
            hint={`${percent.format(rates.emailCapture)} of completions · ${number.format(funnel.resultsEmailViews)} saw the form`}
          />
          <Stat
            label="Checkouts started"
            value={number.format(funnel.checkoutsStarted)}
            hint={`${percent.format(rates.productToCheckout)} of product views · ${percent.format(rates.resultToCheckout)} of results`}
          />
        </div>
      </section>

      <section aria-labelledby="outcomes-title" className="mt-12">
        <h2
          id="outcomes-title"
          className="font-mono text-[11px] tracking-[0.18em] text-gold uppercase"
        >
          What challenge completers did
        </h2>
        <p className="mt-3 max-w-2xl text-sm text-bone-muted">
          Completions count runs, not people, so treat these as a shape rather
          than a census. Buyers are paid player-price sales; retained leads are
          subscribers whose address came from the results screen. Anonymous
          exits are what is left.
        </p>
        <div className="mt-5 grid gap-px border border-line bg-line sm:grid-cols-2 lg:grid-cols-4">
          <Stat
            label="Completions"
            value={number.format(challengeOutcomes.completions)}
          />
          <Stat
            label="Bought at the player price"
            value={number.format(challengeOutcomes.playerPricePurchases)}
            hint={`${number.format(challengeOutcomes.immediateBuyers)} without leaving an address · ${number.format(challengeOutcomes.retainedThenBought)} after`}
          />
          <Stat
            label="Retained, not yet buying"
            value={number.format(challengeOutcomes.retainedNonBuyers)}
            hint="Gave an address on the results screen"
          />
          <Stat
            label="Anonymous exits"
            value={number.format(challengeOutcomes.anonymousExits)}
            hint="Finished, then left without either"
          />
        </div>
      </section>

      <section aria-labelledby="hands-title" className="mt-12">
        <h2
          id="hands-title"
          className="font-mono text-[11px] tracking-[0.18em] text-gold uppercase"
        >
          Where the challenge loses people
        </h2>
        <p className="mt-3 max-w-2xl text-sm text-bone-muted">
          Reached is how many times a hand was shown; answered is how many of
          those produced an answer. The gap between one hand&apos;s reached and
          the next hand&apos;s is where the drop-off is.
        </p>
        <div className="mt-5 overflow-x-auto">
          <table className="w-full min-w-[34rem] border-collapse text-sm">
            <thead>
              <tr className="border-y border-line text-left">
                <th className="py-3 pr-4 font-mono text-[10px] tracking-[0.16em] text-bone-faint uppercase">
                  Hand
                </th>
                <th className="py-3 pr-4 font-mono text-[10px] tracking-[0.16em] text-bone-faint uppercase">
                  Concept
                </th>
                <th className="py-3 pr-4 text-right font-mono text-[10px] tracking-[0.16em] text-bone-faint uppercase">
                  Reached
                </th>
                <th className="py-3 pr-4 text-right font-mono text-[10px] tracking-[0.16em] text-bone-faint uppercase">
                  Answered
                </th>
                <th className="py-3 text-right font-mono text-[10px] tracking-[0.16em] text-bone-faint uppercase">
                  Missed
                </th>
              </tr>
            </thead>
            <tbody>
              {metrics.challengeHands.map((row) => (
                <tr key={row.handId} className="border-b border-line/60">
                  <td className="py-3 pr-4 font-mono text-bone tabular-nums">
                    {row.number}
                  </td>
                  <td className="py-3 pr-4 text-bone-muted">{row.concept}</td>
                  <td className="py-3 pr-4 text-right text-bone tabular-nums">
                    {number.format(row.reached)}
                  </td>
                  <td className="py-3 pr-4 text-right text-bone-muted tabular-nums">
                    {number.format(row.answered)}
                  </td>
                  <td className="py-3 text-right text-gold tabular-nums">
                    {row.answered > 0
                      ? `${number.format(row.missed)} · ${percent.format(row.missed / row.answered)}`
                      : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section aria-labelledby="revenue-title" className="mt-12">
        <h2
          id="revenue-title"
          className="font-mono text-[11px] tracking-[0.18em] text-gold uppercase"
        >
          Sales
        </h2>
        <div className="mt-5 grid gap-px border border-line bg-line sm:grid-cols-2 lg:grid-cols-4">
          <Stat
            label="Purchases"
            value={number.format(purchases.count)}
            hint={`${percent.format(rates.checkoutToPurchase)} of checkouts`}
          />
          <Stat label="Revenue" value={formatPrice(purchases.revenueCents)} />
          <Stat
            label="Average order value"
            value={formatPrice(metrics.averageOrderValueCents)}
          />
          <Stat
            label="Visitor → customer"
            value={percent.format(rates.visitorToCustomer)}
          />
        </div>

        <div className="mt-px grid gap-px border border-line bg-line sm:grid-cols-3 lg:grid-cols-5">
          {offerIds.map((offerId) => {
            const entry = purchases.byOffer[offerId];
            const offer = offers[offerId];
            return (
              <Stat
                key={offerId}
                label={`${offer.name} · ${formatPrice(offer.amountCents)}${offer.quizCompleterOnly ? " (player price)" : ""}`}
                value={number.format(entry.count)}
                hint={formatPrice(entry.revenueCents)}
              />
            );
          })}
        </div>
      </section>

      <section aria-labelledby="sources-title" className="mt-12">
        <h2
          id="sources-title"
          className="font-mono text-[11px] tracking-[0.18em] text-gold uppercase"
        >
          Which content creates customers
        </h2>

        {metrics.topSources.length === 0 ? (
          <p className="mt-5 border border-line bg-ink p-5 text-bone-muted">
            No attributed traffic yet. Publish a piece with a tracked link —
            <code className="mx-1 font-mono text-bone">?src=EPM-001</code>— and
            it will appear here.
          </p>
        ) : (
          <div className="mt-5 overflow-x-auto">
            <table className="w-full min-w-[34rem] border-collapse text-sm">
              <thead>
                <tr className="border-y border-line text-left">
                  <th className="py-3 pr-4 font-mono text-[10px] tracking-[0.16em] text-bone-faint uppercase">
                    Content ID
                  </th>
                  <th className="py-3 pr-4 text-right font-mono text-[10px] tracking-[0.16em] text-bone-faint uppercase">
                    Challenge starts
                  </th>
                  <th className="py-3 pr-4 text-right font-mono text-[10px] tracking-[0.16em] text-bone-faint uppercase">
                    Purchases
                  </th>
                  <th className="py-3 text-right font-mono text-[10px] tracking-[0.16em] text-bone-faint uppercase">
                    Revenue
                  </th>
                </tr>
              </thead>
              <tbody>
                {metrics.topSources.map((row) => (
                  <tr key={row.contentId} className="border-b border-line/60">
                    <td className="py-3 pr-4 font-mono text-bone">{row.contentId}</td>
                    <td className="py-3 pr-4 text-right text-bone-muted tabular-nums">
                      {number.format(row.quizStarts)}
                    </td>
                    <td className="py-3 pr-4 text-right text-bone tabular-nums">
                      {number.format(row.purchases)}
                    </td>
                    <td className="py-3 text-right font-semibold text-gold tabular-nums">
                      {formatPrice(row.revenueCents)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {metrics.topUtmSources.length > 0 && (
        <section aria-labelledby="utm-title" className="mt-12">
          <h2
            id="utm-title"
            className="font-mono text-[11px] tracking-[0.18em] text-gold uppercase"
          >
            Top UTM sources
          </h2>
          <ul className="mt-5 divide-y divide-line border-y border-line">
            {metrics.topUtmSources.map((row) => (
              <li key={row.source} className="flex justify-between py-3">
                <span className="text-bone">{row.source}</span>
                <span className="text-bone-muted tabular-nums">
                  {number.format(row.count)}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  );
}

export default async function GrowthPage({ searchParams }: PageProps<"/growth">) {
  const params = await searchParams;
  const queryToken = typeof params.token === "string" ? params.token : null;
  const cookieToken = (await cookies()).get(ADMIN_COOKIE)?.value ?? null;

  const authorized =
    isAuthorizedToken(queryToken) || isAuthorizedToken(cookieToken);

  if (!authorized) {
    return (
      <main className="flex flex-1 items-center justify-center px-5 py-24">
        <div className="max-w-md">
          <h1 className="text-2xl font-semibold text-bone">Growth dashboard</h1>
          <p className="mt-4 leading-relaxed text-bone-muted">
            {env.growthDashboardToken
              ? "Append ?token=… to this URL to sign in."
              : "GROWTH_DASHBOARD_TOKEN is not set, so this dashboard is disabled."}
          </p>
        </div>
      </main>
    );
  }

  const metrics = await loadGrowthMetrics(30);

  return (
    <main className="flex-1">
      <div className="mx-auto max-w-5xl px-5 pt-14 pb-20 sm:px-8">
        <h1 className="text-3xl font-bold text-bone uppercase sm:text-4xl">
          Growth
        </h1>
        <p className="mt-3 text-bone-muted">
          War of Poker · Short Stack PLO acquisition funnel
        </p>

        {metrics ? (
          <Dashboard metrics={metrics} />
        ) : (
          <p className="mt-10 border border-line bg-ink p-5 text-bone-muted">
            No data source configured. Set <code className="font-mono">SUPABASE_URL</code>{" "}
            and <code className="font-mono">SUPABASE_SERVICE_ROLE_KEY</code>, then
            run the migration in <code className="font-mono">supabase/migrations/</code>.
          </p>
        )}

        {queryToken && (
          <form action="/api/growth/session" method="post" className="mt-14">
            <input type="hidden" name="token" value={queryToken} />
            <button
              type="submit"
              className="rounded-[2px] border border-line bg-ink-card px-5 py-2.5 text-sm font-semibold text-bone transition-colors hover:border-gold hover:text-gold"
            >
              Remember me on this device
            </button>
            <p className="mt-2 text-xs text-bone-faint">
              Stores the token in an httpOnly cookie so it stays out of your
              browser history.
            </p>
          </form>
        )}
      </div>
    </main>
  );
}
