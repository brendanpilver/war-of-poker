import { NextResponse } from "next/server";
import { recordEvent } from "@/lib/analytics/record";
import { sendEmail } from "@/lib/email/client";
import { renderHtml, renderText, welcomeEmail } from "@/lib/email/templates";
import { siteUrl } from "@/lib/site";
import { upsertSubscriber } from "@/lib/subscribers";
import { concepts } from "@/lib/quiz/concepts";
import { totalHands } from "@/lib/quiz/hands";
import { scoreChallenge, type ChallengeAnswers } from "@/lib/quiz/scoring";
import { supabaseAdmin } from "@/lib/supabase";
import { parseAttributionInput, parseEmail, parseText } from "@/lib/validation";

/**
 * Email capture, and the results send that follows it.
 *
 * This is the funnel's retention path, not its gate: a challenge completer
 * reaches checkout without ever coming here (see
 * `src/components/quiz/challenge-result.tsx`). What arrives on this route is
 * someone who chose to be kept in touch with instead.
 *
 * Order matters: the subscriber row is written first and the email second, so a
 * mail-provider outage costs us a delivery we can retry, not the address
 * itself.
 */

/** Where the Survival Card is served from. Free, so no signed token. */
const SURVIVAL_CARD_PATH = "/downloads/nlh-to-plo-survival-card.pdf";

/** The sales page showing the earned price. `src=results-email` attributes the click. */
const PLAYER_PRICE_PATH = "/short-stack-plo?src=results-email&offer=player";

/**
 * Re-scores the submitted answers here rather than trusting the browser's
 * concept lists, so the email can only ever name a real concept of a real hand.
 * Unrecognised answers simply score as missed.
 */
function conceptLabels(answers: unknown): { strong: string[]; watch: string[] } {
  if (typeof answers !== "object" || answers === null) {
    return { strong: [], watch: [] };
  }
  const result = scoreChallenge(answers as ChallengeAnswers);
  return {
    strong: result.strongConceptIds.map((id) => concepts[id].label),
    watch: result.watchConceptIds.map((id) => concepts[id].label),
  };
}

/** Bounded by the challenge's length; see `subscribers_quiz_score_check`. */
function parseQuizScore(value: unknown): number | null {
  if (typeof value !== "number" || !Number.isInteger(value)) return null;
  return value >= 0 && value <= totalHands ? value : null;
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
    // Stored as given; the shape is our own challenge's answers, already
    // bounded by the ten hands it can contain.
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

  const { strong, watch } = quizCompleted
    ? conceptLabels(input.quizAnswers)
    : { strong: [], watch: [] };

  const content = welcomeEmail({
    quizScore,
    strongConcepts: strong,
    watchConcepts: watch,
    survivalCardUrl: `${siteUrl}${SURVIVAL_CARD_PATH}`,
    playerPriceUrl: `${siteUrl}${PLAYER_PRICE_PATH}`,
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
