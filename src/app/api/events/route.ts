import { NextResponse } from "next/server";
import { isEventName } from "@/lib/analytics/events";
import { recordEvent } from "@/lib/analytics/record";
import {
  parseAttributionInput,
  parseEventProps,
  parseText,
} from "@/lib/validation";

/**
 * Analytics ingest.
 *
 * Accepts only the event names in our contract, and re-validates every field:
 * this endpoint is public, so the browser's payload is untrusted input.
 * Responds 204 in every non-malformed case -- a visitor's page must not change
 * behaviour based on whether their event was stored.
 */

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return new NextResponse(null, { status: 400 });
  }

  if (typeof body !== "object" || body === null) {
    return new NextResponse(null, { status: 400 });
  }

  const { name, sessionId, attribution, props } = body as Record<string, unknown>;
  if (!isEventName(name)) {
    return new NextResponse(null, { status: 400 });
  }

  await recordEvent({
    name,
    sessionId: parseText(sessionId, 64),
    attribution: parseAttributionInput(attribution),
    props: parseEventProps(props),
  });

  return new NextResponse(null, { status: 204 });
}
