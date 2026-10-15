import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { ADMIN_COOKIE, isAuthorized, isAuthorizedToken } from "@/lib/admin-auth";
import { parseContentSpec, type ContentSpec } from "@/lib/experiments/spec";
import { supabaseAdmin } from "@/lib/supabase";

/**
 * GET /growth/specs?experiment=EXP-001   the specs of an accepted batch
 * GET /growth/specs?recommendation=<id>  the specs a proposal would create
 *
 * Returns `{ "specs": [...] }`, which `npm run render:short` reads directly.
 * Under /growth so the operator's cookie reaches it from the dashboard; an
 * automation can use the operator bearer token instead.
 */

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const cookieToken = (await cookies()).get(ADMIN_COOKIE)?.value;
  if (!isAuthorized(request) && !isAuthorizedToken(cookieToken)) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  const db = supabaseAdmin();
  if (!db) return NextResponse.json({ error: "Storage unavailable." }, { status: 503 });

  const params = new URL(request.url).searchParams;
  const experiment = params.get("experiment");
  const recommendation = params.get("recommendation");
  let raw: unknown[] = [];

  if (experiment && /^EXP-\d{3,}$/.test(experiment)) {
    const { data, error } = await db
      .from("content_pieces")
      .select("spec")
      .eq("experiment_id", experiment)
      .not("spec", "is", null);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    raw = (data ?? []).map((row) => row.spec);
  } else if (recommendation && /^[0-9a-f-]{36}$/i.test(recommendation)) {
    const { data, error } = await db
      .from("recommendations")
      .select("body, accepted_body")
      .eq("id", recommendation)
      .maybeSingle();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    const body = (data?.accepted_body ?? data?.body) as { items?: unknown[] } | null;
    raw = body?.items ?? [];
  } else {
    return NextResponse.json({ error: "Pass ?experiment=EXP-001 or ?recommendation=<id>." }, { status: 400 });
  }

  const specs: ContentSpec[] = raw.flatMap((item) => {
    const parsed = parseContentSpec(item);
    return parsed.ok ? [parsed.spec] : [];
  });
  specs.sort((a, b) => (a.publishOrder ?? 0) - (b.publishOrder ?? 0));

  return NextResponse.json(
    { specs },
    {
      headers: {
        "Cache-Control": "no-store",
        "Content-Disposition": `inline; filename="${experiment ?? "proposal"}-specs.json"`,
      },
    },
  );
}
