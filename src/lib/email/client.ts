import { Resend } from "resend";
import { env } from "@/lib/env";

/**
 * Transactional email.
 *
 * Resend owns delivery; the subscriber list and the sequence state stay in our
 * own database, so the nurture sequence can move to a broadcast platform later
 * without the funnel needing to change. See docs/GROWTH-ARCHITECTURE.md.
 *
 * Returns `null` when unconfigured. Callers treat a failed send as non-fatal:
 * an email that did not go out must not lose us the subscriber row that records
 * who to send it to.
 */

let cached: Resend | null = null;

function resendClient(): Resend | null {
  const { resendApiKey } = env;
  if (!resendApiKey) return null;
  cached ??= new Resend(resendApiKey);
  return cached;
}

export type SendResult = { ok: true; id: string | null } | { ok: false; reason: string };

export async function sendEmail(options: {
  to: string;
  subject: string;
  html: string;
  text: string;
}): Promise<SendResult> {
  const client = resendClient();
  const from = env.emailFrom;

  if (!client || !from) {
    console.warn("[email] not configured; skipped send to", options.to);
    return { ok: false, reason: "email_not_configured" };
  }

  try {
    const { data, error } = await client.emails.send({
      from,
      to: options.to,
      subject: options.subject,
      html: options.html,
      text: options.text,
    });

    if (error) {
      console.error("[email] send failed", error.message);
      return { ok: false, reason: error.message };
    }
    return { ok: true, id: data?.id ?? null };
  } catch (error) {
    console.error("[email] send threw", error);
    return { ok: false, reason: "send_failed" };
  }
}
