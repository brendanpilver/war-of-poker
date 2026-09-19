import type { Attribution, EventProps } from "@/lib/analytics/events";
import { attributionKeys } from "@/lib/analytics/events";

/**
 * Validation for anything that arrives from a browser.
 *
 * Every function here is pure and total: it returns a normalised value or
 * `null`, and never throws. Route handlers stay readable, and the rules are
 * unit-testable without spinning up a request.
 */

const MAX_TEXT = 120;
const MAX_EMAIL = 254; // RFC 5321 maximum length of a forward path.

/**
 * Deliberately conservative: one @, no whitespace, a dotted domain, and no
 * consecutive dots. This rejects a small number of technically legal addresses
 * in exchange for rejecting the far larger number of typos and injection
 * attempts. Delivery is the real test of an address, not a regular expression.
 */
const EMAIL_PATTERN =
  /^[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*@(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z]{2,}$/i;

const CONTROL_CHARS = /[\p{Cc}]/gu;

/** Trim, strip control characters, and bound the length. */
export function parseText(value: unknown, maxLength = MAX_TEXT): string | null {
  if (typeof value !== "string") return null;
  const cleaned = value.replace(CONTROL_CHARS, "").trim();
  return cleaned.length === 0 ? null : cleaned.slice(0, maxLength);
}

/**
 * Normalise and validate an email address. Lowercases it so the same person
 * cannot become two subscriber rows, matching the `citext` column.
 */
export function parseEmail(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.replace(CONTROL_CHARS, "").trim().toLowerCase();
  if (trimmed.length === 0 || trimmed.length > MAX_EMAIL) return null;
  if (trimmed.includes("..")) return null;
  return EMAIL_PATTERN.test(trimmed) ? trimmed : null;
}

/** Keep only known attribution keys, each a bounded string. */
export function parseAttributionInput(value: unknown): Attribution {
  if (typeof value !== "object" || value === null) return {};
  const input = value as Record<string, unknown>;
  const result: Attribution = {};
  for (const key of attributionKeys) {
    const parsed = parseText(input[key]);
    if (parsed !== null) result[key] = parsed;
  }
  return result;
}

/** Cap on event properties, so one caller cannot write an unbounded blob. */
const MAX_PROPS = 24;

/** Keep scalar properties only, bounded in count and in string length. */
export function parseEventProps(value: unknown): EventProps {
  if (typeof value !== "object" || value === null) return {};
  const result: EventProps = {};
  for (const [key, raw] of Object.entries(value as Record<string, unknown>)) {
    if (Object.keys(result).length >= MAX_PROPS) break;
    const name = parseText(key, 48);
    if (name === null) continue;

    if (typeof raw === "number" && Number.isFinite(raw)) result[name] = raw;
    else if (typeof raw === "boolean" || raw === null) result[name] = raw;
    else if (typeof raw === "string") {
      const text = parseText(raw, 200);
      if (text !== null) result[name] = text;
    }
  }
  return result;
}
