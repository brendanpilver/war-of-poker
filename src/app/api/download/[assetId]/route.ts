import { NextResponse } from "next/server";
import {
  findAsset,
  PRODUCT_BUCKET,
  SIGNED_URL_TTL_SECONDS,
  verifyDeliveryToken,
} from "@/lib/delivery";
import { supabaseAdmin } from "@/lib/supabase";

/**
 * Serves one paid file to a verified purchaser.
 *
 * The token proves the purchase and names the product; the asset must belong to
 * that product, so a book-only buyer cannot reach a Field Kit object by editing
 * the URL. The object itself lives in a private bucket and is handed over as a
 * short-lived signed URL rather than being proxied or made public.
 */

export async function GET(
  request: Request,
  { params }: RouteContext<"/api/download/[assetId]">,
) {
  const { assetId } = await params;
  const token = new URL(request.url).searchParams.get("token");

  const payload = verifyDeliveryToken(token);
  if (!payload) {
    return NextResponse.json(
      { error: "This download link is invalid or has expired." },
      { status: 403 },
    );
  }

  const asset = findAsset(payload.product, assetId);
  if (!asset) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  const db = supabaseAdmin();
  if (!db) {
    return NextResponse.json({ error: "Downloads unavailable." }, { status: 503 });
  }

  const { data, error } = await db.storage
    .from(PRODUCT_BUCKET)
    .createSignedUrl(asset.objectPath, SIGNED_URL_TTL_SECONDS, {
      download: true,
    });

  if (error || !data?.signedUrl) {
    console.error("[download] could not sign", asset.objectPath, error?.message);
    return NextResponse.json(
      { error: "That file isn't available yet. Please contact us." },
      { status: 502 },
    );
  }

  return NextResponse.redirect(data.signedUrl, 303);
}
