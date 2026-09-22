import { NextResponse } from "next/server";
import { isAuthorized } from "@/lib/admin-auth";
import { createUpgradeEntitlement, upgradeUrl } from "@/lib/book-ownership";
import { supabaseAdmin } from "@/lib/supabase";
import { parseEmail } from "@/lib/validation";

/**
 * Regenerates one book owner's permanent upgrade link, for support.
 *
 * Operator-only (the growth bearer token). Entitlements are deterministic, so
 * this returns exactly the link the purchase email carried -- which is how a
 * book bought before entitlements existed gets one, and how support answers
 * "I lost the email". It sends nothing.
 *
 * **Always a specific lookup, never an export.** An entitlement is a permanent
 * signed bearer capability, so there is deliberately no request that lists
 * every customer. Exactly one of:
 *
 * GET /api/upgrade-links?purchaseId=<uuid>   that purchase, if it qualifies
 * GET /api/upgrade-links?email=<address>     that buyer's qualifying purchases
 *
 * Only paid, unrefunded `book` purchases are returned; one that has already
 * been upgraded is marked, because checkout will refuse it.
 *
 * Every response is `no-store`, and nothing here logs the query or the links.
 */

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function respond(body: unknown, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: {
      "Cache-Control": "no-store, max-age=0",
      Pragma: "no-cache",
    },
  });
}

export async function GET(request: Request) {
  if (!isAuthorized(request)) return respond({ error: "Unauthorized." }, 401);

  const params = new URL(request.url).searchParams;
  const rawPurchaseId = params.get("purchaseId");
  const rawEmail = params.get("email");

  if ((rawPurchaseId === null) === (rawEmail === null)) {
    return respond({ error: "Give exactly one of purchaseId or email." }, 400);
  }

  const purchaseId = rawPurchaseId !== null && UUID.test(rawPurchaseId) ? rawPurchaseId : null;
  const email = rawEmail !== null ? parseEmail(rawEmail) : null;
  if (rawPurchaseId !== null && !purchaseId) {
    return respond({ error: "Invalid purchaseId." }, 400);
  }
  if (rawEmail !== null && !email) {
    return respond({ error: "Invalid email." }, 400);
  }

  const db = supabaseAdmin();
  if (!db) return respond({ error: "Storage unavailable." }, 503);

  let query = db
    .from("purchases")
    .select("id, email, created_at")
    .eq("offer_id", "book")
    .eq("product", "book")
    .eq("status", "paid")
    .order("created_at", { ascending: true })
    .limit(50);
  query = purchaseId ? query.eq("id", purchaseId) : query.eq("email", email as string);

  const { data: books, error } = await query;
  if (error) return respond({ error: "Lookup failed." }, 500);
  if (!books || books.length === 0) return respond({ links: [] });

  const ids = books.map((book) => book.id as string);
  const { data: upgrades, error: upgradeError } = await db
    .from("purchases")
    .select("upgrade_of")
    .eq("offer_id", "field-kit-upgrade")
    .eq("status", "paid")
    .in("upgrade_of", ids);
  if (upgradeError) return respond({ error: "Lookup failed." }, 500);
  const upgraded = new Set((upgrades ?? []).map((row) => row.upgrade_of as string));

  const links = [];
  for (const book of books) {
    const entitlement = createUpgradeEntitlement(book.id as string);
    if (!entitlement) return respond({ error: "DELIVERY_SECRET is unset." }, 503);
    links.push({
      purchaseId: book.id,
      email: book.email,
      purchasedAt: book.created_at,
      alreadyUpgraded: upgraded.has(book.id as string),
      upgradeUrl: upgradeUrl(entitlement),
    });
  }

  return respond({ links });
}
