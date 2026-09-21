import { TrackedCta } from "@/components/analytics/tracked-cta";
import { formatPrice, offers } from "@/lib/offers";
import { totalHands } from "@/lib/quiz/hands";
import { CHALLENGE_PATH } from "@/lib/short-stack-plo";
import { Section } from "./section";

/**
 * The free 10-Hand Challenge, offered mid-page.
 *
 * `location` distinguishes each placement in reporting, so we can tell which
 * page actually sends people into the funnel.
 */
export function ChallengeCta({ location }: { location: string }) {
  const headingId = `challenge-cta-${location}`;

  return (
    <Section tone="raised" size="compact" aria-labelledby={headingId}>
      <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between lg:gap-12">
        <div className="max-w-xl">
          <p className="font-mono text-[11px] tracking-[0.18em] text-gold uppercase">
            Free · No email needed to see the answers
          </p>
          <h2
            id={headingId}
            className="mt-4 text-2xl leading-snug font-semibold text-balance text-bone sm:text-3xl"
          >
            Ten hands. Ten decisions. See how your Hold&apos;em instincts
            translate to shallow-stack PLO.
          </h2>
          <p className="mt-3 leading-relaxed text-pretty text-bone-muted">
            Each hand shows you the reasoning the moment you answer. Take the
            free {totalHands}-Hand Challenge and unlock the complete{" "}
            {formatPrice(offers.system.amountCents)} system for{" "}
            <span className="font-semibold text-bone">
              {formatPrice(offers["system-quiz"].amountCents)}
            </span>{" "}
            — the book and the complete Field Kit. Everything for{" "}
            {formatPrice(offers["system-quiz"].amountCents)}, only{" "}
            {formatPrice(offers["system-quiz"].amountCents - offers.book.amountCents)}{" "}
            more than the book alone.
          </p>
        </div>

        <TrackedCta
          href={CHALLENGE_PATH}
          location={location}
          label={`Take the ${totalHands}-Hand Challenge`}
          className="inline-flex shrink-0 items-center justify-center rounded-[2px] border border-gold px-6 py-3.5 text-center font-semibold whitespace-nowrap text-gold transition-colors duration-150 hover:bg-gold hover:text-ink active:translate-y-px"
        >
          Take the {totalHands}-Hand Challenge
        </TrackedCta>
      </div>
    </Section>
  );
}
