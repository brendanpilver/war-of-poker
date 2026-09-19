import { createHmac, timingSafeEqual } from "node:crypto";
import { env } from "./env";
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

/**
 * The Field Kit asset names are the ones used in the published product set, not
 * paraphrases of them.
 */
const bookAsset: Asset = {
  id: "book",
  name: "Short Stack PLO (PDF)",
  objectPath: "short-stack-plo/Short_Stack_PLO.pdf",
};

const fieldKitAssets: Asset[] = [
  {
    id: "field-kit-01",
    name: "Full-Hand Decision Map",
    objectPath: "short-stack-plo/field-kit/01_Full-Hand_Decision_Map.pdf",
  },
  {
    id: "field-kit-02",
    name: "60 BB Preflop + Pot Geometry Guide",
    objectPath: "short-stack-plo/field-kit/02_60BB_Preflop_and_Pot_Geometry_Guide.pdf",
  },
  {
    id: "field-kit-03",
    name: "Flop + Draw Quality Card",
    objectPath: "short-stack-plo/field-kit/03_Flop_and_Draw_Quality_Card.pdf",
  },
  {
    id: "field-kit-04",
    name: "River Decision Card",
    objectPath: "short-stack-plo/field-kit/04_River_Decision_Card.pdf",
  },
  {
    id: "field-kit-05",
    name: "Player Read + Live Exploit Card",
    objectPath: "short-stack-plo/field-kit/05_Player_Read_and_Live_Exploit_Card.pdf",
  },
  {
    id: "field-kit-06",
    name: "Session + Hand Review Workbook",
    objectPath: "short-stack-plo/field-kit/06_Session_and_Hand_Review_Workbook.pdf",
  },
  {
    id: "field-kit-07",
    name: "20-Hand Capstone Quiz + Answer Key",
    objectPath:
      "short-stack-plo/field-kit/07_20-Hand_Capstone_Quiz_and_Answer_Key.pdf",
  },
];

export const productAssets: Record<ProductId, Asset[]> = {
  book: [bookAsset],
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

function sign(body: string, secret: string): string {
  return base64url(createHmac("sha256", secret).update(body).digest());
}

/** Mints a download token. Returns null when DELIVERY_SECRET is unset. */
export function createDeliveryToken(
  payload: Omit<DeliveryPayload, "exp">,
  now = Date.now(),
): string | null {
  const secret = env.deliverySecret;
  if (!secret) return null;

  const body = base64url(
    JSON.stringify({ ...payload, exp: now + TOKEN_TTL_MS } satisfies DeliveryPayload),
  );
  return `${body}.${sign(body, secret)}`;
}

/**
 * Verifies a token and returns its payload, or null if it is malformed, has a
 * bad signature, or has expired. Signature comparison is constant-time.
 */
export function verifyDeliveryToken(
  token: string | null | undefined,
  now = Date.now(),
): DeliveryPayload | null {
  const secret = env.deliverySecret;
  if (!secret || !token) return null;

  const parts = token.split(".");
  if (parts.length !== 2) return null;
  const [body, signature] = parts;

  const expected = sign(body, secret);
  const given = Buffer.from(signature);
  const want = Buffer.from(expected);
  if (given.length !== want.length || !timingSafeEqual(given, want)) return null;

  let payload: DeliveryPayload;
  try {
    payload = JSON.parse(fromBase64url(body).toString("utf8")) as DeliveryPayload;
  } catch {
    return null;
  }

  if (
    typeof payload?.purchaseId !== "string" ||
    typeof payload?.exp !== "number" ||
    !(payload.product in productAssets)
  ) {
    return null;
  }

  return payload.exp > now ? payload : null;
}

export { SIGNED_URL_TTL_SECONDS };
