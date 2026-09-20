import { offers, type OfferId } from "./offers";
import { hands } from "./quiz/hands";
import { supabaseAdmin } from "./supabase";

/**
 * The growth dashboard's numbers.
 *
 * Counts are derived from the raw `events` log and the `purchases` table rather
 * than from maintained counters, so a metric added later can be backfilled from
 * history instead of only counting forward.
 *
 * Purchases come from `purchases` (written by the verified webhook), never from
 * `purchase_completed` events, which include a client-side copy.
 */

export type FunnelCounts = {
  pageViews: number;
  productViews: number;
  quizStarts: number;
  quizCompletions: number;
  resultsViewed: number;
  discountsUnlocked: number;
  resultsEmailViews: number;
  emailsCaptured: number;
  checkoutsStarted: number;
};

/**
 * What happened to the people who finished the challenge: the funnel's real
 * question, split three ways.
 *
 * `completions` counts `quiz_completed` events rather than people -- one player
 * who takes the challenge twice completes twice -- so the three outcomes below
 * are a shape, not a census. The outcomes themselves are counted from rows:
 * a paid `system-quiz` purchase, or a subscriber whose source was the
 * challenge. `anonymousExits` is what is left over.
 */
export type ChallengeOutcomes = {
  completions: number;
  /** Paid `system-quiz` sales: every purchase made at the earned price. */
  playerPricePurchases: number;
  /** Bought at the player price without ever leaving an address. */
  immediateBuyers: number;
  /** Left an address and bought afterwards. */
  retainedThenBought: number;
  /** Left an address and has not bought. */
  retainedNonBuyers: number;
  /** Finished, then left without buying or subscribing. */
  anonymousExits: number;
};

export type PurchaseTotals = {
  count: number;
  revenueCents: number;
  byOffer: Record<OfferId, { count: number; revenueCents: number }>;
};

/** One hand of the challenge, as the funnel sees it. */
export type ChallengeHandRow = {
  handId: string;
  number: number;
  concept: string;
  reached: number;
  answered: number;
  missed: number;
};

export type SourceRow = {
  contentId: string;
  quizStarts: number;
  purchases: number;
  revenueCents: number;
};

export type GrowthMetrics = {
  since: string;
  funnel: FunnelCounts;
  challengeOutcomes: ChallengeOutcomes;
  /** Per-hand reach, answers and misses, so abandonment has a shape. */
  challengeHands: ChallengeHandRow[];
  purchases: PurchaseTotals;
  rates: {
    quizCompletion: number;
    emailCapture: number;
    resultToCheckout: number;
    productToCheckout: number;
    checkoutToPurchase: number;
    visitorToCustomer: number;
  };
  averageOrderValueCents: number;
  topSources: SourceRow[];
  topUtmSources: { source: string; count: number }[];
};

function rate(numerator: number, denominator: number): number {
  return denominator > 0 ? numerator / denominator : 0;
}

const emptyByOffer = (): PurchaseTotals["byOffer"] => ({
  book: { count: 0, revenueCents: 0 },
  system: { count: 0, revenueCents: 0 },
  "system-quiz": { count: 0, revenueCents: 0 },
});

/** Rows we read out of the events log for a window. */
type EventRow = {
  name: string;
  content_id: string | null;
  utm_source: string | null;
  props: Record<string, unknown> | null;
};
type PurchaseRow = {
  offer_id: string;
  amount_cents: number;
  content_id: string | null;
};

export async function loadGrowthMetrics(days = 30): Promise<GrowthMetrics | null> {
  const db = supabaseAdmin();
  if (!db) return null;

  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

  const [
    eventsResult,
    purchasesResult,
    subscribersResult,
    challengeLeadsResult,
    challengeCustomersResult,
  ] = await Promise.all([
    db
      .from("events")
      .select("name, content_id, utm_source, props")
      .gte("created_at", since)
      .limit(50000),
    db
      .from("purchases")
      .select("offer_id, amount_cents, content_id")
      .eq("status", "paid")
      .gte("created_at", since),
    db
      .from("subscribers")
      .select("id", { count: "exact", head: true })
      .gte("created_at", since),
    // `source` is written on insert only, so it still names the form that
    // captured the address however many times the row is later updated.
    db
      .from("subscribers")
      .select("id", { count: "exact", head: true })
      .eq("source", "challenge")
      .eq("customer_status", "lead")
      .gte("created_at", since),
    db
      .from("subscribers")
      .select("id", { count: "exact", head: true })
      .eq("source", "challenge")
      .eq("customer_status", "customer")
      .gte("created_at", since),
  ]);

  if (eventsResult.error) {
    console.error("[growth] events query failed", eventsResult.error.message);
    return null;
  }

  const events = (eventsResult.data ?? []) as EventRow[];
  const purchaseRows = (purchasesResult.data ?? []) as PurchaseRow[];

  const countOf = (name: string) => events.filter((e) => e.name === name).length;

  const funnel: FunnelCounts = {
    pageViews: countOf("page_view"),
    productViews: countOf("product_viewed"),
    quizStarts: countOf("quiz_started"),
    quizCompletions: countOf("quiz_completed"),
    resultsViewed: countOf("quiz_results_viewed"),
    discountsUnlocked: countOf("quiz_discount_unlocked"),
    resultsEmailViews: countOf("results_email_viewed"),
    // Subscriber rows rather than events: one person submitting twice is one
    // captured email.
    emailsCaptured: subscribersResult.count ?? 0,
    // Both the browser and the checkout route emit `checkout_started`. Only the
    // route's is tagged `source: "server"`, and only it means a Stripe session
    // was actually created -- so count that one and ignore the browser's.
    checkoutsStarted: events.filter(
      (e) => e.name === "checkout_started" && e.props?.source === "server",
    ).length,
  };

  const purchases: PurchaseTotals = {
    count: purchaseRows.length,
    revenueCents: purchaseRows.reduce((sum, row) => sum + row.amount_cents, 0),
    byOffer: emptyByOffer(),
  };

  for (const row of purchaseRows) {
    const offerId = row.offer_id as OfferId;
    if (!(offerId in offers)) continue;
    purchases.byOffer[offerId].count += 1;
    purchases.byOffer[offerId].revenueCents += row.amount_cents;
  }

  const retainedNonBuyers = challengeLeadsResult.count ?? 0;
  const retainedThenBought = challengeCustomersResult.count ?? 0;
  const playerPricePurchases = purchases.byOffer["system-quiz"].count;

  const challengeOutcomes: ChallengeOutcomes = {
    completions: funnel.quizCompletions,
    playerPricePurchases,
    immediateBuyers: Math.max(0, playerPricePurchases - retainedThenBought),
    retainedThenBought,
    retainedNonBuyers,
    anonymousExits: Math.max(
      0,
      funnel.quizCompletions - playerPricePurchases - retainedNonBuyers,
    ),
  };

  // Per-hand funnel. `reached` and `answered` come from the two events the
  // challenge emits per hand, and `missed` from the `correct` flag on the
  // answer -- which is what makes "which hand loses people" answerable.
  const challengeHands: ChallengeHandRow[] = hands.map((hand) => ({
    handId: hand.id,
    number: hand.number,
    concept: hand.concept,
    reached: 0,
    answered: 0,
    missed: 0,
  }));
  const byHandId = new Map(challengeHands.map((row) => [row.handId, row]));

  for (const event of events) {
    if (event.name !== "quiz_question_viewed" && event.name !== "quiz_question_answered") {
      continue;
    }
    const handId = event.props?.hand_id;
    if (typeof handId !== "string") continue;
    const row = byHandId.get(handId);
    if (!row) continue;

    if (event.name === "quiz_question_viewed") {
      row.reached += 1;
    } else {
      row.answered += 1;
      if (event.props?.correct === false) row.missed += 1;
    }
  }

  // Attribution by content ID: quiz starts from events, sales from purchases.
  const bySource = new Map<string, SourceRow>();
  const ensure = (contentId: string): SourceRow => {
    let row = bySource.get(contentId);
    if (!row) {
      row = { contentId, quizStarts: 0, purchases: 0, revenueCents: 0 };
      bySource.set(contentId, row);
    }
    return row;
  };

  for (const event of events) {
    if (event.name === "quiz_started" && event.content_id) {
      ensure(event.content_id).quizStarts += 1;
    }
  }
  for (const row of purchaseRows) {
    if (!row.content_id) continue;
    const entry = ensure(row.content_id);
    entry.purchases += 1;
    entry.revenueCents += row.amount_cents;
  }

  const topSources = [...bySource.values()]
    .sort((a, b) => b.revenueCents - a.revenueCents || b.quizStarts - a.quizStarts)
    .slice(0, 15);

  const utmCounts = new Map<string, number>();
  for (const event of events) {
    if (!event.utm_source) continue;
    utmCounts.set(event.utm_source, (utmCounts.get(event.utm_source) ?? 0) + 1);
  }
  const topUtmSources = [...utmCounts.entries()]
    .map(([source, count]) => ({ source, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  return {
    since,
    funnel,
    challengeOutcomes,
    challengeHands,
    purchases,
    rates: {
      quizCompletion: rate(funnel.quizCompletions, funnel.quizStarts),
      emailCapture: rate(funnel.emailsCaptured, funnel.quizCompletions),
      resultToCheckout: rate(funnel.checkoutsStarted, funnel.resultsViewed),
      productToCheckout: rate(funnel.checkoutsStarted, funnel.productViews),
      checkoutToPurchase: rate(purchases.count, funnel.checkoutsStarted),
      visitorToCustomer: rate(purchases.count, funnel.pageViews),
    },
    averageOrderValueCents:
      purchases.count > 0 ? Math.round(purchases.revenueCents / purchases.count) : 0,
    topSources,
    topUtmSources,
  };
}

export { rate };
