import type { Attribution } from "./events";
import { attributionKeys } from "./events";

/**
 * Acquisition attribution: capture on arrival, keep for the whole funnel.
 *
 * The parsing half is pure so it can be tested without a browser. The storage
 * half is first-touch: the content ID that first brought someone to the site is
 * the one credited with the purchase, even if they later return directly or via
 * a different link. Last-touch would credit whichever link happened to be last,
 * which answers a different and less useful question than "which Short
 * generated this customer?".
 */

const STORAGE_KEY = "wop.attribution";
const SESSION_KEY = "wop.session";

/** Long enough for real campaign names, short enough to bound a hostile URL. */
const MAX_VALUE_LENGTH = 120;

/** Control characters, which have no place in a stored attribution value. */
const CONTROL_CHARS = /[\p{Cc}]/gu;

function clean(value: string | null): string | undefined {
  if (!value) return undefined;
  // Attribution lands in a database and a dashboard, so strip control
  // characters and bound the length rather than storing a URL verbatim.
  const trimmed = value.replace(CONTROL_CHARS, "").trim();
  if (trimmed.length === 0) return undefined;
  return trimmed.slice(0, MAX_VALUE_LENGTH);
}

/**
 * Read attribution out of a landing URL.
 *
 * `src` is the canonical War of Poker parameter; `utm_source` and friends are
 * accepted because platforms and ad tools append them automatically.
 */
export function parseAttribution(url: string, referrer?: string): Attribution {
  let params: URLSearchParams;
  let pathname: string | undefined;
  try {
    const parsed = new URL(url);
    params = parsed.searchParams;
    pathname = parsed.pathname;
  } catch {
    return {};
  }

  return compact({
    src: clean(params.get("src") ?? params.get("content_id")),
    utmSource: clean(params.get("utm_source")),
    utmMedium: clean(params.get("utm_medium")),
    utmCampaign: clean(params.get("utm_campaign")),
    platform: clean(params.get("platform")),
    landingPage: clean(pathname ?? null),
    referrer: clean(referrer ?? null),
  });
}

/** Drop undefined entries so stored and posted attribution stay small. */
export function compact(attribution: Attribution): Attribution {
  const result: Attribution = {};
  for (const key of attributionKeys) {
    const value = attribution[key];
    if (value !== undefined) result[key] = value;
  }
  return result;
}

/** True when the visit carried nothing worth crediting beyond the landing page. */
export function isAnonymousVisit(attribution: Attribution): boolean {
  return !attribution.src && !attribution.utmSource && !attribution.utmCampaign;
}

/**
 * Merge a later visit's attribution over what is already stored, keeping the
 * first credited visit's credit. Pure, so the precedence rule is testable.
 */
export function mergeAttribution(
  stored: Attribution,
  incoming: Attribution,
): Attribution {
  // An anonymous later visit must not overwrite a credited first visit, but a
  // first visit that only recorded a landing page should still be filled in.
  return compact(
    isAnonymousVisit(stored) && !isAnonymousVisit(incoming)
      ? { ...stored, ...incoming }
      : { ...incoming, ...stored },
  );
}

function safeStorage(): Storage | null {
  // Storage throws in private-mode and embedded contexts; attribution is never
  // important enough to break a page over.
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function readStored(storage: Storage): Attribution {
  try {
    const raw = storage.getItem(STORAGE_KEY);
    return raw ? compact(JSON.parse(raw) as Attribution) : {};
  } catch {
    return {};
  }
}

/**
 * Merge this visit's attribution into storage and return the effective value.
 */
export function captureAttribution(url: string, referrer?: string): Attribution {
  const incoming = parseAttribution(url, referrer);
  const storage = safeStorage();
  if (!storage) return incoming;

  const merged = mergeAttribution(readStored(storage), incoming);
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(merged));
  } catch {
    // Non-fatal: the event still carries `merged` for this page view.
  }
  return merged;
}

export function readAttribution(): Attribution {
  const storage = safeStorage();
  return storage ? readStored(storage) : {};
}

/**
 * A stable anonymous ID for this browser. Not a user identity: it exists only
 * to stitch a visitor's events together before they give an email address.
 */
export function getSessionId(): string {
  const storage = safeStorage();
  const existing = storage?.getItem(SESSION_KEY);
  if (existing) return existing;

  const id =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `s_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`;
  try {
    storage?.setItem(SESSION_KEY, id);
  } catch {
    // Falls back to a fresh ID per page, which still groups a single pageload.
  }
  return id;
}

export { SESSION_KEY, STORAGE_KEY };
