"use client";

import { useState } from "react";
import { BuyOfferButton } from "@/components/marketing/buy-offer-button";
import { track } from "@/lib/analytics/track";
import { getSessionId, readAttribution } from "@/lib/analytics/attribution";
import { formatPrice, offers } from "@/lib/offers";
import { fourQuestions, survivalCard } from "@/lib/quiz/reality-check";
import { missedLessons, type QuizResult } from "@/lib/quiz/scoring";
import type { QuizAnswers } from "@/lib/quiz/scoring";

/**
 * The result screen: score, what was missed, the four questions the book uses,
 * then the Survival Card exchange.
 *
 * The answers and explanations have already been shown by this point, so the
 * email is asked for in exchange for the Survival Card rather than as the price
 * of seeing whether they were right.
 */

type QuizResultProps = {
  result: QuizResult;
  answers: QuizAnswers;
  onRestart: () => void;
};

type SubmitState = "idle" | "sending" | "done" | "error";

export function QuizResult({ result, answers, onRestart }: QuizResultProps) {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<SubmitState>("idle");
  const [message, setMessage] = useState<string | null>(null);

  const missed = missedLessons(result);
  const promoOffer = offers["system-quiz"];

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (state === "sending") return;
    setState("sending");
    setMessage(null);

    try {
      const response = await fetch("/api/subscribe", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          email,
          source: "quiz",
          sessionId: getSessionId(),
          attribution: readAttribution(),
          quizScore: result.score,
          quizCompleted: true,
          quizAnswers: answers,
        }),
      });

      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as
          | { error?: string }
          | null;
        setMessage(body?.error ?? "That didn't go through. Please try again.");
        setState("error");
        return;
      }

      track("email_submitted", { source: "quiz", quiz_score: result.score });
      track("survival_card_requested", { quiz_score: result.score });
      setState("done");
    } catch {
      setMessage("That didn't go through. Please try again.");
      setState("error");
    }
  }

  return (
    <div>
      <section aria-labelledby="result-title" className="border border-line bg-ink-card">
        <div className="border-b border-line p-6 sm:p-8">
          <p className="font-mono text-[11px] tracking-[0.18em] text-gold uppercase">
            Your result
          </p>
          <h2
            id="result-title"
            className="mt-4 flex items-baseline gap-3 text-bone tabular-nums"
          >
            <span className="text-6xl leading-none font-bold sm:text-7xl">
              {result.score}
            </span>
            <span className="text-2xl leading-none text-bone-faint sm:text-3xl">
              / {result.total}
            </span>
          </h2>
          <p className="mt-5 max-w-xl text-lg leading-relaxed text-pretty text-bone-muted">
            {result.interpretation}
          </p>
        </div>

        {missed.length > 0 && (
          <div className="border-b border-line p-6 sm:p-8">
            <h3 className="font-mono text-[11px] tracking-[0.18em] text-bone-faint uppercase">
              Lessons you missed
            </h3>
            <ul className="mt-4 space-y-4">
              {missed.map((item) => (
                <li key={item.title} className="border-l-2 border-gold pl-4">
                  <p className="text-sm font-semibold text-bone">{item.title}</p>
                  <p className="mt-1.5 leading-relaxed text-pretty text-bone-muted">
                    {item.lesson}
                  </p>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="p-6 sm:p-8">
          <h3 className="font-mono text-[11px] tracking-[0.18em] text-bone-faint uppercase">
            All three come down to the same four questions
          </h3>
          <p className="mt-4 flex flex-wrap items-center gap-x-1 gap-y-2 text-2xl font-bold text-bone uppercase sm:text-3xl">
            {fourQuestions.map((term, index) => (
              <span key={term} className="inline-flex items-center">
                {index > 0 && (
                  <span aria-hidden className="mx-2 font-normal text-gold">
                    ·
                  </span>
                )}
                {term}
              </span>
            ))}
          </p>
          <p className="mt-4 max-w-xl leading-relaxed text-pretty text-bone-muted">
            One lens, used the same way on every street. Update it whenever a new
            card or a new action changes the situation.
          </p>
        </div>
      </section>

      <section
        aria-labelledby="survival-card-title"
        className="mt-8 border border-line bg-ink-raised p-6 sm:p-8"
      >
        <h2
          id="survival-card-title"
          className="text-2xl font-bold text-balance text-bone uppercase sm:text-3xl"
        >
          Get the free {survivalCard.name.replace(/^The /, "")}
        </h2>
        <p className="mt-4 max-w-xl leading-relaxed text-pretty text-bone-muted">
          {survivalCard.summary}
        </p>

        {state === "done" ? (
          <div aria-live="polite" className="mt-6">
            <p className="border-l-2 border-olive-light pl-4 text-bone">
              Sent. Check your inbox for the Survival Card — and your spam folder
              if it isn&apos;t there in a few minutes.
            </p>

            <div className="mt-8 border-t border-line pt-8">
              <p className="font-mono text-[11px] tracking-[0.18em] text-gold uppercase">
                Because you finished the Reality Check
              </p>
              <h3 className="mt-3 text-xl font-semibold text-pretty text-bone sm:text-2xl">
                Short Stack PLO — Complete System
              </h3>
              <p className="mt-2 leading-relaxed text-pretty text-bone-muted">
                {promoOffer.description}
              </p>
              <p className="mt-5 flex items-baseline gap-3">
                <span className="text-4xl font-bold text-bone tabular-nums">
                  {formatPrice(promoOffer.amountCents)}
                </span>
                {promoOffer.compareAtCents && (
                  <span className="text-lg text-bone-faint line-through tabular-nums">
                    {formatPrice(promoOffer.compareAtCents)}
                  </span>
                )}
              </p>
              <BuyOfferButton
                offerId="system-quiz"
                location="quiz-result"
                email={email}
                className="mt-6 w-full sm:w-auto"
              />
              <p className="mt-4 text-sm text-bone-faint">
                Prefer to read first?{" "}
                <a
                  href="/short-stack-plo"
                  className="text-bone underline decoration-bone/30 underline-offset-4 hover:decoration-gold"
                >
                  See everything in the Complete System
                </a>
                .
              </p>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-6 max-w-lg">
            <label
              htmlFor="quiz-email"
              className="font-mono text-[11px] tracking-[0.18em] text-bone-faint uppercase"
            >
              Email address
            </label>
            <div className="mt-2.5 flex flex-col gap-3 sm:flex-row">
              <input
                id="quiz-email"
                type="email"
                name="email"
                required
                autoComplete="email"
                inputMode="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="you@example.com"
                aria-describedby={message ? "quiz-email-error" : undefined}
                className="min-w-0 flex-1 rounded-[2px] border border-line bg-ink px-4 py-3 text-base text-bone placeholder:text-bone-faint focus:border-gold focus:outline-none"
              />
              <button
                type="submit"
                disabled={state === "sending"}
                className="shrink-0 rounded-[2px] bg-gold px-6 py-3 font-semibold whitespace-nowrap text-ink shadow-[inset_0_-2px_0_rgb(0_0_0/0.18)] transition-colors duration-150 hover:bg-gold-light active:translate-y-px disabled:opacity-60"
              >
                {state === "sending" ? "Sending…" : "Send it to me"}
              </button>
            </div>
            {message && (
              <p id="quiz-email-error" aria-live="polite" className="mt-3 text-sm text-gold">
                {message}
              </p>
            )}
            <p className="mt-3 text-sm text-bone-faint">
              The Survival Card, then River Potter&apos;s PLO email course.
              Unsubscribe any time.
            </p>
          </form>
        )}
      </section>

      <button
        type="button"
        onClick={onRestart}
        className="mt-8 text-sm text-bone-muted underline decoration-bone/25 underline-offset-4 transition-colors hover:text-bone"
      >
        Retake the Reality Check
      </button>
    </div>
  );
}
