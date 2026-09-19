import { timingSafeEqual } from "node:crypto";
import { env } from "./env";

/**
 * Shared-secret authorisation for the operator surfaces: the growth dashboard
 * and the content API that an automation such as n8n calls.
 *
 * A bearer token rather than user accounts, because there is exactly one
 * operator and adding an auth provider would be a larger decision than this
 * needs. If more than one person ever needs access, replace this rather than
 * handing the token around.
 */

function constantTimeEqual(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  // Comparing different lengths would throw, and returning early on length is
  // not a meaningful leak for a high-entropy token.
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}

/** True when the request carries the operator token. */
export function isAuthorized(request: Request): boolean {
  const expected = env.growthDashboardToken;
  if (!expected) return false;

  const header = request.headers.get("authorization");
  if (header?.startsWith("Bearer ")) {
    return constantTimeEqual(header.slice(7), expected);
  }
  return false;
}

/** True when a token — from a cookie or a query string — matches. */
export function isAuthorizedToken(token: string | null | undefined): boolean {
  const expected = env.growthDashboardToken;
  if (!expected || !token) return false;
  return constantTimeEqual(token, expected);
}

export const ADMIN_COOKIE = "wop_admin";
