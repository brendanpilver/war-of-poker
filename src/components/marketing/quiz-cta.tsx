import { TrackedCta } from "@/components/analytics/tracked-cta";
import { QUIZ_PATH } from "@/lib/short-stack-plo";
import { Section } from "./section";

/**
 * The free Reality Check.
 *
 * `location` distinguishes each placement in reporting, so we can tell which
 * page actually sends people into the funnel.
 */
export function QuizCta({ location }: { location: string }) {
  const headingId = `quiz-cta-${location}`;

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
            Not ready to buy? Take the 3-Hand PLO Reality Check.
          </h2>
          <p className="mt-3 leading-relaxed text-pretty text-bone-muted">
            Three spots where Hold&apos;em instincts get expensive. Answer, then
            see the full reasoning immediately.
          </p>
        </div>

        <TrackedCta
          href={QUIZ_PATH}
          location={location}
          label="Take the Reality Check"
          className="inline-flex shrink-0 items-center justify-center rounded-[2px] border border-gold px-6 py-3.5 text-center font-semibold whitespace-nowrap text-gold transition-colors duration-150 hover:bg-gold hover:text-ink active:translate-y-px"
        >
          Take the Reality Check
        </TrackedCta>
      </div>
    </Section>
  );
}
