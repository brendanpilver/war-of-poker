import { timingSafeEqual } from "node:crypto";

/**
 * The cron job's bearer token. Kept apart from the operator token so the
 * command saved in Hostinger's cron settings can trigger the analytics job and
 * reach nothing else -- not the dashboard, the content API, or upgrade links.
 */
export function isCronAuthorized(request: Request, secret: string | null): boolean {
  if (!secret) return false;
  const header = request.headers.get("authorization");
  if (!header?.startsWith("Bearer ")) return false;
  const given = Buffer.from(header.slice(7));
  const expected = Buffer.from(secret);
  return given.length === expected.length && timingSafeEqual(given, expected);
}
