import { NextResponse } from "next/server";
import { recordEvent } from "@/lib/analytics/record";
import { sendEmail } from "@/lib/email/client";
import { renderHtml, renderText, welcomeEmail } from "@/lib/email/templates";
import { siteUrl } from "@/lib/site";
import { upsertSubscriber } from "@/lib/subscribers";
import { supabaseAdmin } from "@/lib/supabase";
import { parseAttributionInput, parseEmail, parseText } from "@/lib/validation";

/**
 * Email capture, and the Survival Card send that follows it.
 *
 * Order matters: the subscriber row is written first and the email second, so a
 * mail-provider outage costs us a delivery we can retry, not the address
 * itself.
 */

/** Where the Survival Card is served from. Free, so no signed token. */
const SURVIVAL_CARD_PATH = "/downloads/nlh-to-plo-survival-card.pdf";

function parseQuizScore(value: unknown): number | null {
  if (typeof value !== "number" || !Number.isInteger(value)) return null;
  return value >= 0 && value <= 3 ? value : null;
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const input = (body ?? {}) as Record<string, unknown>;
  const email = parseEmail(input.email);

  if (!email) {
    return NextResponse.json(
      { error: "That email address doesn't look right." },
      { status: 400 },
    );
  }

  if (!supabaseAdmin()) {
    return NextResponse.json(
      { error: "Signups aren't available right now." },
      { status: 503 },
    );
  }

  const attribution = parseAttributionInput(input.attribution);
  const sessionId = parseText(input.sessionId, 64);
  const quizScore = parseQuizScore(input.quizScore);
  const quizCompleted = input.quizCompleted === true;

  const subscriber = await upsertSubscriber({
    email,
    source: parseText(input.source, 32) ?? "unknown",
    sessionId,
    attribution,
    quizScore,
    quizCompleted,
    // Stored as given; the shape is our own quiz's answers, already bounded by
    // the three questions it can contain.
    quizAnswers: quizCompleted ? input.quizAnswers : null,
    offerShown: quizCompleted ? "system-quiz" : null,
  });

  if (!subscriber) {
    return NextResponse.json(
      { error: "We couldn't save that. Please try again." },
      { status: 500 },
    );
  }

  await recordEvent({
    name: "email_submitted",
    sessionId,
    subscriberId: subscriber.id,
    attribution,
    props: {
      source: parseText(input.source, 32) ?? "unknown",
      quiz_score: quizScore,
      quiz_completed: quizCompleted,
    },
  });

  const content = welcomeEmail({
    quizScore,
    survivalCardUrl: `${siteUrl}${SURVIVAL_CARD_PATH}`,
  });

  const sent = await sendEmail({
    to: email,
    subject: content.subject,
    html: renderHtml(content),
    text: renderText(content),
  });

  if (sent.ok) {
    const db = supabaseAdmin();
    // Records that email 0 has gone out, so the sequence dispatcher starts at
    // email 1 and a retry never double-sends.
    await db?.from("email_sends").upsert(
      {
        subscriber_id: subscriber.id,
        sequence_key: "welcome",
        provider_id: sent.id,
      },
      { onConflict: "subscriber_id,sequence_key" },
    );

    await recordEvent({
      name: "survival_card_requested",
      sessionId,
      subscriberId: subscriber.id,
      attribution,
      props: { quiz_score: quizScore },
    });
  }

  // The address is stored either way; a failed send is ours to retry, not
  // something to make the reader solve.
  return NextResponse.json({ ok: true, emailed: sent.ok });
}
