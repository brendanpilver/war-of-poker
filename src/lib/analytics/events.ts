/**
 * The analytics event contract, shared by the browser tracker and the server
 * ingest route. Both sides import these names so a typo in a component becomes
 * a type error rather than a silently dropped event.
 */

export const eventNames = [
  "page_view",
  "cta_clicked",
  "quiz_started",
  "quiz_question_answered",
  "quiz_completed",
  "email_submitted",
  "survival_card_requested",
  "product_viewed",
  "product_selected",
  "checkout_started",
  "purchase_completed",
  "promo_offer_used",
] as const;

export type EventName = (typeof eventNames)[number];

export function isEventName(value: unknown): value is EventName {
  return typeof value === "string" && (eventNames as readonly string[]).includes(value);
}

/**
 * Free-form per-event detail. Kept deliberately narrow: attribution fields are
 * not repeated here because they are attached from the stored attribution on
 * every event, and duplicating them invites the two copies to disagree.
 */
export type EventProps = Record<string, string | number | boolean | null>;

/** The wire shape posted to `/api/events`. */
export type EventPayload = {
  name: EventName;
  sessionId: string;
  attribution: Attribution;
  props?: EventProps;
};

/**
 * Where a visitor came from. `src` is the War of Poker content ID carried by a
 * published piece (`?src=EPM-001`); the UTM fields are whatever the platform
 * appended. Every field is optional because most visits carry none of them.
 */
export type Attribution = {
  /** Content ID, e.g. "EPM-001". */
  src?: string;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  /** Social platform, when a link declares one (`?platform=youtube`). */
  platform?: string;
  /** First page of the visit, e.g. "/plo-reality-check". */
  landingPage?: string;
  referrer?: string;
};

export const attributionKeys = [
  "src",
  "utmSource",
  "utmMedium",
  "utmCampaign",
  "platform",
  "landingPage",
  "referrer",
] as const satisfies readonly (keyof Attribution)[];
