import assert from "node:assert/strict";
import { before, describe, it } from "node:test";

/**
 * `/api/upgrade-links` hands out permanent upgrade entitlements, so it must
 * only ever answer a specific lookup, never list every customer, and never be
 * cached. Supabase is unset, so every case stops before a query would run.
 */

process.env.GROWTH_DASHBOARD_TOKEN = "test-operator-token";
process.env.DELIVERY_SECRET = "test-delivery-secret-value";
delete process.env.SUPABASE_URL;
delete process.env.SUPABASE_SERVICE_ROLE_KEY;

let GET: (request: Request) => Promise<Response>;

before(async () => {
  ({ GET } = await import("../src/app/api/upgrade-links/route"));
});

function get(query: string, token: string | null = "test-operator-token"): Request {
  return new Request(`http://localhost/api/upgrade-links${query}`, {
    headers: token ? { authorization: `Bearer ${token}` } : {},
  });
}

async function check(request: Request, status: number) {
  const response = await GET(request);
  assert.equal(response.status, status);
  assert.match(response.headers.get("cache-control") ?? "", /no-store/);
  return response;
}

describe("upgrade link lookup", () => {
  it("refuses a caller without the operator token, uncached", async () => {
    await check(get("?email=reader@example.com", null), 401);
    await check(get("?email=reader@example.com", "wrong-token"), 401);
  });

  it("has no unfiltered form that could export the customer list", async () => {
    await check(get(""), 400);
    await check(get("?all=1"), 400);
  });

  it("takes exactly one of a purchase id or an email", async () => {
    await check(
      get("?email=reader@example.com&purchaseId=7c9e6679-7425-40de-944b-e07fc1f90ae7"),
      400,
    );
  });

  it("rejects a malformed purchase id or email", async () => {
    await check(get("?purchaseId=not-a-uuid"), 400);
    await check(get("?purchaseId="), 400);
    await check(get("?email=not-an-email"), 400);
  });

  it("accepts a well-formed lookup, and still sends no-store when storage is down", async () => {
    await check(get("?email=reader@example.com"), 503);
    await check(get("?purchaseId=7c9e6679-7425-40de-944b-e07fc1f90ae7"), 503);
  });
});
