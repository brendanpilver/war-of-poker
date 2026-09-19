"use client";

import { captureAttribution, getSessionId, readAttribution } from "./attribution";
import type { EventName, EventProps } from "./events";

/**
 * Browser-side event tracking.
 *
 * Events are posted to our own `/api/events` route rather than a third-party
 * script: no external tag, nothing to consent to, and the attribution stays in
 * one database we can query. Delivery is best-effort -- a failed event must
 * never surface to a visitor mid-funnel.
 */

export function track(name: EventName, props?: EventProps): void {
  if (typeof window === "undefined") return;

  const body = JSON.stringify({
    name,
    sessionId: getSessionId(),
    attribution: readAttribution(),
    props,
  });

  // sendBeacon survives the page unload that follows a checkout redirect, which
  // is exactly when `checkout_started` fires.
  try {
    if (navigator.sendBeacon?.(
      "/api/events",
      new Blob([body], { type: "application/json" }),
    )) {
      return;
    }
  } catch {
    // Fall through to fetch.
  }

  void fetch("/api/events", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body,
    keepalive: true,
  }).catch(() => {
    // Best-effort by design.
  });
}

/** Records the landing attribution for this visit. Call once, on first paint. */
export function initAttribution(): void {
  if (typeof window === "undefined") return;
  captureAttribution(window.location.href, document.referrer || undefined);
}
