import { createHmac } from "node:crypto";
import { openPayload, sealPayload } from "./delivery";
import { env } from "./env";
import { siteUrl } from "./site";
import { supabaseAdmin } from "./supabase";

/**
 * The upgrade entitlement: proof that a purchase qualifies its buyer for the
 * $15 Field Kit upgrade.
 *
 * Every paid book purchase gets one, separate from its download link. It
 * authorises exactly one thing -- starting a `field-kit-upgrade` checkout --
 * and grants no downloads. It carries no expiry, because a reader may decide
 * months later that they want the Field Kit.
 *
 * **Signed, but never trusted alone.** The token is the existing HMAC-SHA256
 * scheme from `src/lib/delivery.ts`, signed with a key derived from
 * DELIVERY_SECRET for this purpose only. A download token therefore cannot pass
 * as an entitlement, nor an entitlement as a download token. The signature
 * only says which purchase the bearer is pointing at; every use then reads that
 * purchase back from the database and requires that it was the `book` offer,
 * is still `paid` (a refund revokes the entitlement), and has not already been
 * upgraded. The buyer's email comes from that row, never from the browser, and
 * the upgrade is delivered to it.
 *
 * An email address alone is deliberately not accepted as proof.
 *
 * The token is deterministic -- the same purchase always yields the same
 * entitlement -- so one can be re-issued from the purchase record at any time,
 * including for purchases made before entitlements existed.
 */

const ENTITLEMENT_KIND = "field-kit-upgrade";
const ENTITLEMENT_VERSION = 1;

export const UPGRADE_PATH = "/upgrade";

/** A key used only for entitlements, so it can never verify a download token. */
function entitlementKey(): Buffer | null {
  const secret = env.deliverySecret;
  if (!secret) return null;
  return createHmac("sha256", secret)
    .update(`war-of-poker:${ENTITLEMENT_KIND}-entitlement:v${ENTITLEMENT_VERSION}`)
    .digest();
}

/** Mints the entitlement for a book purchase. Null when DELIVERY_SECRET is unset. */
export function createUpgradeEntitlement(purchaseId: string): string | null {
  const key = entitlementKey();
  if (!key) return null;
  return sealPayload(
    { kind: ENTITLEMENT_KIND, v: ENTITLEMENT_VERSION, purchaseId, offerId: "book" },
    key,
  );
}

/** The page a book owner opens to buy the upgrade. */
export function upgradeUrl(entitlement: string): string {
  return `${siteUrl}${UPGRADE_PATH}?entitlement=${encodeURIComponent(entitlement)}`;
}

/**
 * Checks the signature and shape only, returning the purchase it names. This
 * does not establish ownership -- `verifyUpgradeEntitlement` does.
 */
export function readUpgradeEntitlement(token: unknown): { purchaseId: string } | null {
  const key = entitlementKey();
  if (!key || typeof token !== "string") return null;

  const payload = openPayload(token, key);
  if (
    !payload ||
    payload.kind !== ENTITLEMENT_KIND ||
    payload.v !== ENTITLEMENT_VERSION ||
    payload.offerId !== "book" ||
    typeof payload.purchaseId !== "string"
  ) {
    return null;
  }
  return { purchaseId: payload.purchaseId };
}

export type BookOwner = { purchaseId: string; email: string };

export type OwnershipResult =
  | { ok: true; owner: BookOwner }
  | { ok: false; reason: "invalid" | "already-upgraded" | "unavailable" };

export type BookPurchaseRecord = {
  email: string;
  offerId: string;
  product: string;
  status: string;
  /** A paid upgrade already names this purchase as its `upgrade_of`. */
  upgraded: boolean;
};

/** Reads one purchase by id. `undefined` means storage could not be reached. */
export type PurchaseLookup = (
  purchaseId: string,
) => Promise<BookPurchaseRecord | null | undefined>;

const lookupPurchase: PurchaseLookup = async (purchaseId) => {
  const db = supabaseAdmin();
  if (!db) return undefined;

  const { data, error } = await db
    .from("purchases")
    .select("email, offer_id, product, status")
    .eq("id", purchaseId)
    .maybeSingle();

  if (error) {
    console.error("[book-ownership] lookup failed", error.message);
    return undefined;
  }
  if (!data) return null;

  const { count, error: upgradeError } = await db
    .from("purchases")
    .select("id", { count: "exact", head: true })
    .eq("upgrade_of", purchaseId)
    .eq("status", "paid");

  if (upgradeError) {
    console.error("[book-ownership] upgrade lookup failed", upgradeError.message);
    return undefined;
  }

  const row = data as { email: string; offer_id: string; product: string; status: string };
  return {
    email: row.email,
    offerId: row.offer_id,
    product: row.product,
    status: row.status,
    upgraded: (count ?? 0) > 0,
  };
};

/** True when a purchase record is a paid, unrefunded book sale. */
export function isQualifyingBookPurchase(
  record: BookPurchaseRecord | null | undefined,
): record is BookPurchaseRecord {
  return Boolean(
    record &&
      record.offerId === "book" &&
      record.product === "book" &&
      record.status === "paid",
  );
}

/**
 * Establishes that the bearer of an entitlement may buy the upgrade, and whose
 * address it is delivered to.
 */
export async function verifyUpgradeEntitlement(
  token: unknown,
  lookup: PurchaseLookup = lookupPurchase,
): Promise<OwnershipResult> {
  const entitlement = readUpgradeEntitlement(token);
  if (!entitlement) return { ok: false, reason: "invalid" };

  const purchase = await lookup(entitlement.purchaseId);
  if (purchase === undefined) return { ok: false, reason: "unavailable" };
  if (!isQualifyingBookPurchase(purchase)) return { ok: false, reason: "invalid" };
  if (purchase.upgraded) return { ok: false, reason: "already-upgraded" };

  return {
    ok: true,
    owner: { purchaseId: entitlement.purchaseId, email: purchase.email },
  };
}

/**
 * The original book purchase behind a paid upgrade, for the webhook: the
 * upgrade is delivered to the address that bought the book. Unlike checkout,
 * an existing upgrade is not a reason to refuse -- the sale has already
 * happened and must still be delivered.
 */
export async function findBookOwner(
  purchaseId: string,
  lookup: PurchaseLookup = lookupPurchase,
): Promise<BookOwner | null | undefined> {
  const purchase = await lookup(purchaseId);
  if (purchase === undefined) return undefined;
  return isQualifyingBookPurchase(purchase)
    ? { purchaseId, email: purchase.email }
    : null;
}
