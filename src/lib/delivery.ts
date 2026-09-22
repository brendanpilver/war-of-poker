import { createHmac, timingSafeEqual } from "node:crypto";
import { env } from "./env";
import { fieldKit } from "./field-kit";
import type { ProductId } from "./offers";

/**
 * Protected delivery of the paid files.
 *
 * Nothing purchasable is served from a public URL. A purchase mints an
 * HMAC-signed, expiring token that names the product; the download route
 * verifies the token and only then asks Supabase Storage for a short-lived
 * signed URL to the object. The files live in a private bucket, so a leaked
 * object path is not itself access.
 *
 * The final files are not in this repository -- see docs/GROWTH-ARCHITECTURE.md
 * for exactly where each one must be uploaded before launch.
 */

/** Private Supabase Storage bucket holding the paid files. */
export const PRODUCT_BUCKET = "products";

/** How long a signed Storage URL lives once the token has been verified. */
const SIGNED_URL_TTL_SECONDS = 60 * 10;

/** How long a purchaser's download link stays valid. */
const TOKEN_TTL_MS = 1000 * 60 * 60 * 24 * 30;
export const TOKEN_TTL_LABEL = "30 days";

export type Asset = {
  id: string;
  name: string;
  /** Object path inside PRODUCT_BUCKET. Upload the final file to exactly this. */
  objectPath: string;
};

/** The Field Kit assets are derived from the catalogue so the names a buyer
 * sees on the sales page and the files they receive cannot drift apart. */
const fieldKitAssets: Asset[] = fieldKit.map((piece) => ({
  id: piece.id,
  name: piece.name,
  objectPath: piece.objectPath,
}));

const bookAsset: Asset = {
  id: "book",
  name: "Short Stack PLO (PDF)",
  objectPath: "short-stack-plo/Short_Stack_PLO.pdf",
};

export const productAssets: Record<ProductId, Asset[]> = {
  book: [bookAsset],
  "field-kit": fieldKitAssets,
  "complete-system": [bookAsset, ...fieldKitAssets],
};

export function assetsFor(product: ProductId): Asset[] {
  return productAssets[product];
}

export function findAsset(product: ProductId, assetId: string): Asset | null {
  return assetsFor(product).find((asset) => asset.id === assetId) ?? null;
}

// ---------------------------------------------------------------------------
// Tokens
// ---------------------------------------------------------------------------

export type DeliveryPayload = {
  /** Purchase row id, so a download can be traced to a verified sale. */
  purchaseId: string;
  product: ProductId;
  /** Expiry, epoch milliseconds. */
  exp: number;
};

function base64url(input: Buffer | string): string {
  return Buffer.from(input)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function fromBase64url(value: string): Buffer {
  return Buffer.from(value.replace(/-/g, "+").replace(/_/g, "/"), "base64");
}

function sign(body: string, key: string | Buffer): string {
  return base64url(createHmac("sha256", key).update(body).digest());
}

/**
 * `body.signature`: the JSON payload, base64url-encoded, HMAC-SHA256 signed.
 * Shared by download tokens and upgrade entitlements, which sign with
 * different keys so neither can ever be accepted as the other.
 */
export function sealPayload(payload: object, key: string | Buffer): string {
  const body = base64url(JSON.stringify(payload));
  return `${body}.${sign(body, key)}`;
}

/**
 * Returns the payload of a correctly signed token, or null if it is malformed
 * or the signature does not match. Signature comparison is constant-time.
 * The caller validates the payload's shape.
 */
export function openPayload(
  token: string | null | undefined,
  key: string | Buffer,
): Record<string, unknown> | null {
  if (!token) return null;

  const parts = token.split(".");
  if (parts.length !== 2) return null;
  const [body, signature] = parts;

  const given = Buffer.from(signature);
  const want = Buffer.from(sign(body, key));
  if (given.length !== want.length || !timingSafeEqual(given, want)) return null;

  try {
    const payload: unknown = JSON.parse(fromBase64url(body).toString("utf8"));
    return typeof payload === "object" && payload !== null
      ? (payload as Record<string, unknown>)
      : null;
  } catch {
    return null;
  }
}

/** Mints a download token. Returns null when DELIVERY_SECRET is unset. */
export function createDeliveryToken(
  payload: Omit<DeliveryPayload, "exp">,
  now = Date.now(),
): string | null {
  const secret = env.deliverySecret;
  if (!secret) return null;

  return sealPayload(
    { ...payload, exp: now + TOKEN_TTL_MS } satisfies DeliveryPayload,
    secret,
  );
}

/**
 * Verifies a token and returns its payload, or null if it is malformed, has a
 * bad signature, or has expired.
 */
export function verifyDeliveryToken(
  token: string | null | undefined,
  now = Date.now(),
): DeliveryPayload | null {
  const secret = env.deliverySecret;
  if (!secret) return null;

  const payload = openPayload(token, secret);
  if (
    !payload ||
    typeof payload.purchaseId !== "string" ||
    typeof payload.exp !== "number" ||
    typeof payload.product !== "string" ||
    !Object.hasOwn(productAssets, payload.product)
  ) {
    return null;
  }

  return payload.exp > now
    ? {
        purchaseId: payload.purchaseId,
        product: payload.product as ProductId,
        exp: payload.exp,
      }
    : null;
}

export { SIGNED_URL_TTL_SECONDS };
