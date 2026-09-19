import { NextResponse } from "next/server";
import { isAuthorized } from "@/lib/admin-auth";
import {
  isContentId,
  isContentStatus,
  isSeriesCode,
  parseContentId,
  trackedLink,
} from "@/lib/content/series";
import { supabaseAdmin } from "@/lib/supabase";
import { parseText } from "@/lib/validation";

/**
 * The content pipeline's API.
 *
 * Built for an automation (n8n or similar) to post drafts and later report
 * platform metrics, with a human approval step in between. Deliberately not
 * autonomous: nothing here publishes anything. A piece moves to `approved` only
 * because an authorised caller says so, which keeps the doctrine rule that no
 * content ships without the owner's approval enforceable in the data.
 *
 * Authorisation is the operator bearer token. See src/lib/admin-auth.ts.
 */

const MAX_LONG_TEXT = 4000;

function unauthorized() {
  return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
}

/** GET /api/content?status=draft&series=EPM */
export async function GET(request: Request) {
  if (!isAuthorized(request)) return unauthorized();

  const db = supabaseAdmin();
  if (!db) {
    return NextResponse.json({ error: "Storage unavailable." }, { status: 503 });
  }

  const params = new URL(request.url).searchParams;
  let query = db
    .from("content_pieces")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(200);

  const status = params.get("status");
  if (isContentStatus(status)) query = query.eq("status", status);

  const seriesCode = params.get("series");
  if (isSeriesCode(seriesCode)) query = query.eq("series", seriesCode);

  const { data, error } = await query;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    pieces: (data ?? []).map((piece) => ({
      ...piece,
      tracked_link: trackedLink(piece.content_id as string),
    })),
  });
}

/**
 * POST /api/content — create or update a piece.
 *
 * Upserts on content_id so an automation can re-post a piece with refreshed
 * metrics without first checking whether it exists.
 */
export async function POST(request: Request) {
  if (!isAuthorized(request)) return unauthorized();

  const db = supabaseAdmin();
  if (!db) {
    return NextResponse.json({ error: "Storage unavailable." }, { status: 503 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  const input = (body ?? {}) as Record<string, unknown>;
  const contentId = input.content_id;

  if (!isContentId(contentId)) {
    return NextResponse.json(
      { error: "content_id must look like EPM-001." },
      { status: 400 },
    );
  }

  const parsed = parseContentId(contentId);
  if (!parsed) {
    return NextResponse.json({ error: "Unparseable content_id." }, { status: 400 });
  }

  const status = isContentStatus(input.status) ? input.status : "draft";

  // A piece can only be marked published with somewhere to point at.
  const publishedUrl = parseText(input.published_url, 500);
  if (status === "published" && !publishedUrl) {
    return NextResponse.json(
      { error: "published_url is required to set status=published." },
      { status: 400 },
    );
  }

  const row = {
    content_id: contentId,
    series: parsed.series,
    status,
    source_material: parseText(input.source_material, MAX_LONG_TEXT),
    source_location: parseText(input.source_location, 500),
    approved_lesson: parseText(input.approved_lesson, MAX_LONG_TEXT),
    hook: parseText(input.hook, 500),
    hand_details: input.hand_details ?? null,
    dollars_at_risk:
      typeof input.dollars_at_risk === "number" && Number.isFinite(input.dollars_at_risk)
        ? input.dollars_at_risk
        : null,
    script: parseText(input.script, MAX_LONG_TEXT),
    on_screen_text: parseText(input.on_screen_text, MAX_LONG_TEXT),
    caption: parseText(input.caption, MAX_LONG_TEXT),
    cta: parseText(input.cta, 500),
    platform: parseText(input.platform, 60),
    published_url: publishedUrl,
    published_at: parseText(input.published_at, 40),
    views: typeof input.views === "number" ? Math.max(0, Math.trunc(input.views)) : 0,
    engagement:
      typeof input.engagement === "number" ? Math.max(0, Math.trunc(input.engagement)) : 0,
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await db
    .from("content_pieces")
    .upsert(row, { onConflict: "content_id" })
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    piece: data,
    tracked_link: trackedLink(contentId),
  });
}
