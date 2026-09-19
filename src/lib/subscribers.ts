import type { Attribution } from "./analytics/events";
import { supabaseAdmin } from "./supabase";

/**
 * Subscriber records: the funnel's join between an anonymous visit and a person.
 *
 * Writes are upserts on the email address, because the same person legitimately
 * arrives more than once -- retaking the quiz, or buying after subscribing.
 * Acquisition attribution is only written on first insert so a later visit
 * cannot overwrite the content ID that originally earned the lead.
 */

export type UpsertSubscriberInput = {
  email: string;
  source: string;
  sessionId?: string | null;
  attribution?: Attribution;
  quizScore?: number | null;
  quizCompleted?: boolean;
  quizAnswers?: unknown;
  offerShown?: string | null;
};

export type SubscriberRecord = {
  id: string;
  email: string;
  quiz_score: number | null;
  created_at: string;
};

/** Returns the subscriber, or null when Supabase is unconfigured or errored. */
export async function upsertSubscriber(
  input: UpsertSubscriberInput,
): Promise<SubscriberRecord | null> {
  const db = supabaseAdmin();
  if (!db) return null;

  const attribution = input.attribution ?? {};

  const { data: existing, error: lookupError } = await db
    .from("subscribers")
    .select("id, email, quiz_score, created_at")
    .eq("email", input.email)
    .maybeSingle();

  if (lookupError) {
    console.error("[subscribers] lookup failed", lookupError.message);
    return null;
  }

  // Quiz state is always refreshed; attribution is not, so the first credited
  // visit keeps the credit even if they return through a different link.
  const mutableFields = {
    quiz_score: input.quizScore ?? null,
    quiz_completed: input.quizCompleted ?? false,
    quiz_answers: input.quizAnswers ?? null,
    offer_shown: input.offerShown ?? null,
    updated_at: new Date().toISOString(),
  };

  if (existing) {
    const { data, error } = await db
      .from("subscribers")
      .update(mutableFields)
      .eq("id", existing.id)
      .select("id, email, quiz_score, created_at")
      .single();

    if (error) {
      console.error("[subscribers] update failed", error.message);
      return existing as SubscriberRecord;
    }
    return data as SubscriberRecord;
  }

  const { data, error } = await db
    .from("subscribers")
    .insert({
      email: input.email,
      source: input.source,
      session_id: input.sessionId ?? null,
      content_id: attribution.src ?? null,
      utm_source: attribution.utmSource ?? null,
      utm_medium: attribution.utmMedium ?? null,
      utm_campaign: attribution.utmCampaign ?? null,
      platform: attribution.platform ?? null,
      landing_page: attribution.landingPage ?? null,
      referrer: attribution.referrer ?? null,
      ...mutableFields,
    })
    .select("id, email, quiz_score, created_at")
    .single();

  if (error) {
    console.error("[subscribers] insert failed", error.message);
    return null;
  }
  return data as SubscriberRecord;
}

/**
 * Promotes a subscriber to customer after a verified purchase, creating the row
 * if the buyer never subscribed. Called only from the Stripe webhook.
 */
export async function markCustomer(
  email: string,
  product: string,
  attribution: Attribution = {},
): Promise<string | null> {
  const db = supabaseAdmin();
  if (!db) return null;

  const existing = await upsertSubscriber({
    email,
    source: "purchase",
    attribution,
  });

  const { data, error } = await db
    .from("subscribers")
    .update({
      customer_status: "customer",
      purchased_product: product,
      updated_at: new Date().toISOString(),
    })
    .eq("email", email)
    .select("id")
    .maybeSingle();

  if (error) {
    console.error("[subscribers] markCustomer failed", error.message);
    return existing?.id ?? null;
  }
  return data?.id ?? existing?.id ?? null;
}
