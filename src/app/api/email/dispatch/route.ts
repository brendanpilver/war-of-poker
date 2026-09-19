import { NextResponse } from "next/server";
import { isAuthorized } from "@/lib/admin-auth";
import { sendEmail } from "@/lib/email/client";
import { renderHtml, renderText, sequence } from "@/lib/email/templates";
import { supabaseAdmin } from "@/lib/supabase";

/**
 * Sends whichever sequence emails are due.
 *
 * Designed to be called on a schedule (a Vercel cron, or any scheduler that can
 * send a bearer token) rather than to run continuously. Idempotent: a send is
 * recorded in `email_sends`, and a subscriber who already has a row for a step
 * is skipped, so calling this twice in a minute sends nothing twice.
 *
 * The two offer-led emails are skipped for customers. Someone who has already
 * bought should not be sold to again.
 */

/** Steps that should not go to people who have already purchased. */
const OFFER_STEPS = new Set(["inside-the-system", "offer-reminder"]);

/** Bounds the work of one invocation so a backlog cannot time out the request. */
const BATCH_LIMIT = 100;

type Candidate = {
  id: string;
  email: string;
  customer_status: string;
};

export async function POST(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const db = supabaseAdmin();
  if (!db) {
    return NextResponse.json({ error: "Storage unavailable." }, { status: 503 });
  }

  const results: { step: string; sent: number; failed: number }[] = [];

  for (const step of sequence) {
    const dueBefore = new Date(
      Date.now() - step.delayDays * 24 * 60 * 60 * 1000,
    ).toISOString();

    const { data: candidates, error } = await db
      .from("subscribers")
      .select("id, email, customer_status")
      .lte("created_at", dueBefore)
      .limit(BATCH_LIMIT);

    if (error) {
      console.error("[email] candidate query failed", step.key, error.message);
      continue;
    }

    const eligible = (candidates ?? []).filter(
      (row) =>
        !(OFFER_STEPS.has(step.key) && (row as Candidate).customer_status === "customer"),
    ) as Candidate[];

    if (eligible.length === 0) {
      results.push({ step: step.key, sent: 0, failed: 0 });
      continue;
    }

    // Anti-join in the application: Supabase's client has no clean NOT EXISTS,
    // and the candidate set is already bounded by BATCH_LIMIT.
    const { data: alreadySent } = await db
      .from("email_sends")
      .select("subscriber_id")
      .eq("sequence_key", step.key)
      .in(
        "subscriber_id",
        eligible.map((row) => row.id),
      );

    const sentIds = new Set((alreadySent ?? []).map((row) => row.subscriber_id));
    const pending = eligible.filter((row) => !sentIds.has(row.id));

    let sent = 0;
    let failed = 0;

    for (const subscriber of pending) {
      const result = await sendEmail({
        to: subscriber.email,
        subject: step.content.subject,
        html: renderHtml(step.content),
        text: renderText(step.content),
      });

      if (!result.ok) {
        failed += 1;
        continue;
      }

      const { error: recordError } = await db.from("email_sends").upsert(
        {
          subscriber_id: subscriber.id,
          sequence_key: step.key,
          provider_id: result.id,
        },
        { onConflict: "subscriber_id,sequence_key" },
      );

      if (recordError) {
        // The email went out but we failed to record it. Log loudly: the next
        // run would otherwise send it again.
        console.error(
          "[email] sent but not recorded",
          step.key,
          subscriber.id,
          recordError.message,
        );
      }
      sent += 1;
    }

    results.push({ step: step.key, sent, failed });
  }

  return NextResponse.json({ results });
}
