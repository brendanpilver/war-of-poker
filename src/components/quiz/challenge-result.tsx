"use client";

import { useEffect, useRef, useState } from "react";
import { BuyOfferButton } from "@/components/marketing/buy-offer-button";
import { getSessionId, readAttribution } from "@/lib/analytics/attribution";
import { track } from "@/lib/analytics/track";
import { formatPrice, offers } from "@/lib/offers";
import { concepts, materialsFor, type ConceptId } from "@/lib/quiz/concepts";
import { fourQuestions, survivalCard, totalHands } from "@/lib/quiz/hands";
import { PRODUCT_PATH, shortStackPlo } from "@/lib/short-stack-plo";
import { missedPrinciples, type ChallengeAnswers, type ChallengeResult as Result } from "@/lib/quiz/scoring";

/**
 * The results screen.
 *
 * The score is reported but deliberately not the headline: what the player
 * demonstrated, and which concepts gave them trouble, is the useful output.
 * Nothing here tells anyone their score proves they need the book.
 *
 * **Nothing is gated.** The score, the hand-by-hand diagnostic, the player
 * price, the buy button and checkout are all reachable without an address.
 * Finishing the challenge is what earns the price, so making an email the real
 * gate would turn a reward into a toll — and would put a form in front of the
 * one person on the page who is already ready to spend money.
 *
 * The email form is therefore second, and it is a retention offer rather than a
 * lead gate: a reader who is not buying today can send themselves their results,
 * the Survival Card, and the link back to their player price. The order on the
 * page is the order of the objectives — convert, then retain, and only then
 * accept that they leave.
 *
 * The unlock is presentation, not a security boundary: `/api/checkout` accepts
 * an offer id and resolves the price server-side from the offer catalogue, so
 * nothing chargeable is decided in this component. Making the player price
 * genuinely unforgeable would need a signed completion token -- see
 * docs/GROWTH-ARCHITECTURE.md.
 */

type ChallengeResultProps = {
  result: Result;
  answers: ChallengeAnswers;
  onRestart: () => void;
};

type SubmitState = "idle" | "sending" | "done" | "error";

function ConceptList({
  title,
  conceptIds,
  tone,
}: {
  title: string;
  conceptIds: ConceptId[];
  tone: "strong" | "watch";
}) {
  if (conceptIds.length === 0) return null;
  const accent = tone === "strong" ? "text-olive-light" : "text-gold";

  return (
    <div>
      <h3 className="font-mono text-[11px] tracking-[0.18em] text-bone-faint uppercase">
        {title}
      </h3>
      <ul className="mt-4 space-y-3">
        {conceptIds.map((id) => (
          <li key={id} className="flex gap-3">
            <span aria-hidden className={`${accent} shrink-0`}>
              —
            </span>
            <span>
              <span className="block leading-snug text-bone">{concepts[id].label}</span>
              <span className="mt-1 block text-sm leading-snug text-pretty text-bone-muted">
                {concepts[id].summary}
              </span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function ChallengeResult({ result, answers, onRestart }: ChallengeResultProps) {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<SubmitState>("idle");
  const [message, setMessage] = useState<string | null>(null);
  const reported = useRef(false);
  const retentionRef = useRef<HTMLElement>(null);

  const missed = missedPrinciples(result);
  const playerOffer = offers["system-quiz"];
  const publicPriceCents = playerOffer.compareAtCents ?? offers.system.amountCents;

  useEffect(() => {
    if (reported.current) return;
    reported.current = true;
    track("quiz_results_viewed", { score: result.score, total: result.total });
    track("quiz_discount_unlocked", {
      offer: playerOffer.id,
      price_cents: playerOffer.amountCents,
      score: result.score,
    });
  }, [result.score, result.total, playerOffer.id, playerOffer.amountCents]);

  useEffect(() => {
    // The retention form sits well below the fold. Recording it on mount would
    // just be a second copy of `quiz_results_viewed`; what we need to know is
    // whether a completer who left without an address ever saw the offer.
    const section = retentionRef.current;
    if (!section || typeof IntersectionObserver === "undefined") return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) return;
        observer.disconnect();
        track("results_email_viewed", { score: result.score });
      },
      { threshold: 0.4 },
    );
    observer.observe(section);
    return () => observer.disconnect();
  }, [result.score]);

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
          source: "challenge",
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

      track("email_submitted", { source: "challenge", quiz_score: result.score });
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
            Challenge complete
          </p>
          <h2
            id="result-title"
            className="mt-4 text-xl leading-relaxed text-pretty text-bone sm:text-2xl sm:leading-relaxed"
          >
            {result.interpretation}
          </h2>
          <p className="mt-6 flex items-baseline gap-2 font-mono text-[11px] tracking-[0.18em] text-bone-faint uppercase">
            <span>Decisions matched</span>
            <span className="text-lg tracking-normal text-bone tabular-nums">
              {result.score}/{result.total}
            </span>
          </p>
        </div>

        <div className="grid gap-8 border-b border-line p-6 sm:grid-cols-2 sm:gap-10 sm:p-8">
          <ConceptList
            title="Strongest decisions"
            conceptIds={result.strongConceptIds}
            tone="strong"
          />
          <ConceptList
            title="Watch these spots"
            conceptIds={result.watchConceptIds}
            tone="watch"
          />
        </div>

        {missed.length > 0 && (
          <div className="border-b border-line p-6 sm:p-8">
            <h3 className="font-mono text-[11px] tracking-[0.18em] text-bone-faint uppercase">
              The principles behind the hands you missed
            </h3>
            <ul className="mt-4 space-y-4">
              {missed.map((item) => (
                <li key={item.title} className="border-l-2 border-gold pl-4">
                  <p className="text-sm font-semibold text-bone">{item.title}</p>
                  <p className="mt-1.5 leading-relaxed text-pretty text-bone-muted">
                    {item.principle}
                  </p>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="p-6 sm:p-8">
          <h3 className="font-mono text-[11px] tracking-[0.18em] text-bone-faint uppercase">
            All ten come down to the same four questions
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
        aria-labelledby="materials-title"
        className="mt-8 border border-line bg-ink-raised p-6 sm:p-8"
      >
        <h2
          id="materials-title"
          className="text-2xl font-bold text-balance text-bone uppercase sm:text-3xl"
        >
          What you just used, and where it lives
        </h2>
        <p className="mt-4 max-w-xl leading-relaxed text-pretty text-bone-muted">
          Every hand in the challenge came out of the {shortStackPlo.title} system.
          Each concept below is covered in the book, and worked onto a printable
          card in the Field Kit.
        </p>

        <dl className="mt-7 grid gap-px border border-line bg-line sm:grid-cols-2">
          {Object.values(concepts).map((concept) => (
            <div key={concept.id} className="bg-ink-raised p-4 sm:p-5">
              <dt className="leading-snug font-semibold text-pretty text-bone">
                {concept.label}
              </dt>
              <dd className="mt-2 text-sm leading-snug text-pretty text-bone-muted">
                {materialsFor(concept.id)
                  .map((piece) => piece.name)
                  .join(" · ")}
              </dd>
            </div>
          ))}
        </dl>
      </section>

      <section
        aria-labelledby="player-price-title"
        className="mt-8 border-t-2 border-gold bg-ink-card p-6 sm:p-8"
      >
        <p className="text-lg leading-relaxed text-pretty text-bone sm:text-xl">
          You just used pieces of the {shortStackPlo.title} system. The challenge
          gave you ten decisions. The Complete System gives you the framework and
          the tools for the thousands that come next.
        </p>

        <div className="mt-8 border-t border-line pt-7">
          <p className="font-mono text-[11px] tracking-[0.18em] text-gold uppercase">
            Challenge complete. Your player price is unlocked.
          </p>
          <h2
            id="player-price-title"
            className="mt-3 text-2xl font-bold text-bone uppercase sm:text-3xl"
          >
            {shortStackPlo.title} — Complete System
          </h2>
          <p className="mt-3 max-w-xl leading-relaxed text-pretty text-bone-muted">
            {playerOffer.description}
          </p>

          <dl className="mt-6 flex flex-wrap items-baseline gap-x-10 gap-y-3">
            <div className="flex items-baseline gap-2.5">
              <dt className="text-sm text-bone-faint">Regular price</dt>
              <dd className="text-lg text-bone-muted tabular-nums">
                {formatPrice(publicPriceCents)}
              </dd>
            </div>
            <div className="flex items-baseline gap-2.5">
              <dt className="text-sm text-gold">Your player price</dt>
              <dd className="text-4xl font-bold text-bone tabular-nums">
                {formatPrice(playerOffer.amountCents)}
              </dd>
            </div>
          </dl>

          <BuyOfferButton
            offerId="system-quiz"
            location="challenge-result"
            email={email || undefined}
            className="mt-6 w-full sm:w-auto"
            label={`Get the Complete System — ${formatPrice(playerOffer.amountCents)}`}
          />
          <p className="mt-4 text-sm text-bone-faint">
            Prefer to read the detail first?{" "}
            <a
              href={PRODUCT_PATH}
              className="text-bone underline decoration-bone/30 underline-offset-4 hover:decoration-gold"
            >
              See everything in the Complete System
            </a>
            . The book on its own is {formatPrice(offers.book.amountCents)}.
          </p>
        </div>
      </section>

      <section
        ref={retentionRef}
        aria-labelledby="results-email-title"
        className="mt-8 border border-line bg-ink-raised p-6 sm:p-8"
      >
        <h2
          id="results-email-title"
          className="text-2xl font-bold text-balance text-bone uppercase sm:text-3xl"
        >
          Not ready to buy yet?
        </h2>
        <p className="mt-4 max-w-xl leading-relaxed text-pretty text-bone-muted">
          Send yourself your challenge results and the{" "}
          {survivalCard.name.replace(/^The /, "")}. Your player-price link comes
          with them, so you can pick this back up whenever you want.
        </p>

        {state === "done" ? (
          <p aria-live="polite" className="mt-6 border-l-2 border-olive-light pl-4 text-bone">
            Sent. Your results, the Survival Card and your player-price link are
            in your inbox — check your spam folder if they aren&apos;t there in a
            few minutes.
          </p>
        ) : (
          <form onSubmit={handleSubmit} className="mt-6 max-w-lg">
            <label
              htmlFor="challenge-email"
              className="font-mono text-[11px] tracking-[0.18em] text-bone-faint uppercase"
            >
              Email address
            </label>
            <div className="mt-2.5 flex flex-col gap-3 sm:flex-row">
              <input
                id="challenge-email"
                type="email"
                name="email"
                required
                autoComplete="email"
                inputMode="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="you@example.com"
                aria-describedby={message ? "challenge-email-error" : undefined}
                className="min-w-0 flex-1 rounded-[2px] border border-line bg-ink px-4 py-3 text-base text-bone placeholder:text-bone-faint focus:border-gold focus:outline-none"
              />
              <button
                type="submit"
                disabled={state === "sending"}
                className="shrink-0 rounded-[2px] bg-gold px-6 py-3 font-semibold whitespace-nowrap text-ink shadow-[inset_0_-2px_0_rgb(0_0_0/0.18)] transition-colors duration-150 hover:bg-gold-light active:translate-y-px disabled:opacity-60"
              >
                {state === "sending" ? "Sending…" : "Send My Results"}
              </button>
            </div>
            {message && (
              <p
                id="challenge-email-error"
                aria-live="polite"
                className="mt-3 text-sm text-gold"
              >
                {message}
              </p>
            )}
            <p className="mt-3 text-sm text-bone-faint">
              Then River Potter&apos;s PLO email course — the reasoning behind
              these hands, continued. Unsubscribe any time.
            </p>
          </form>
        )}
      </section>

      <button
        type="button"
        onClick={onRestart}
        className="mt-8 text-sm text-bone-muted underline decoration-bone/25 underline-offset-4 transition-colors hover:text-bone"
      >
        Take the {totalHands}-Hand Challenge again
      </button>
    </div>
  );
}
