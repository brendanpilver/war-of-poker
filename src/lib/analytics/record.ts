import { supabaseAdmin } from "@/lib/supabase";
import type { Attribution, EventName, EventProps } from "./events";

/**
 * Server-side event writing. Used by `/api/events` for browser events and
 * directly by the Stripe webhook for `purchase_completed`, which must be
 * recorded from verified server state rather than trusted from the browser.
 */

export type RecordEventInput = {
  name: EventName;
  sessionId?: string | null;
  subscriberId?: string | null;
  attribution?: Attribution;
  props?: EventProps;
};

/** Maps our camelCase attribution onto the events table's columns. */
function attributionColumns(attribution: Attribution = {}) {
  return {
    content_id: attribution.src ?? null,
    utm_source: attribution.utmSource ?? null,
    utm_medium: attribution.utmMedium ?? null,
    utm_campaign: attribution.utmCampaign ?? null,
    platform: attribution.platform ?? null,
    landing_page: attribution.landingPage ?? null,
    referrer: attribution.referrer ?? null,
  };
}

/**
 * Write one event. Returns false when it could not be stored.
 *
 * Analytics must never break the funnel, so a Supabase outage or an
 * unconfigured environment is logged and swallowed rather than thrown: losing
 * an event is bad, losing a sale because the event log was down is worse.
 */
export async function recordEvent(input: RecordEventInput): Promise<boolean> {
  const db = supabaseAdmin();
  if (!db) return false;

  const { error } = await db.from("events").insert({
    name: input.name,
    session_id: input.sessionId ?? null,
    subscriber_id: input.subscriberId ?? null,
    props: input.props ?? {},
    ...attributionColumns(input.attribution),
  });

  if (error) {
    console.error("[analytics] failed to record event", input.name, error.message);
    return false;
  }
  return true;
}

export { attributionColumns };
