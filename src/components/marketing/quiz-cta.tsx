import { TrackedCta } from "@/components/analytics/tracked-cta";
import { Eyebrow } from "./section-intro";

/**
 * The free Reality Check.
 *
 * `location` distinguishes each placement in reporting, so we can see which
 * page actually sends people into the quiz.
 */
export function QuizCta({
  location,
  className = "",
}: {
  location: string;
  className?: string;
}) {
  return (
    <section
      aria-labelledby={`quiz-cta-${location}`}
      className={`border-t border-line bg-ink-raised ${className}`}
    >
      <div className="mx-auto max-w-6xl px-5 py-16 sm:px-8 lg:py-20">
        <div className="grid gap-8 lg:grid-cols-12 lg:items-center lg:gap-16">
          <div className="lg:col-span-7">
            <Eyebrow>Free · No email required to see the answers</Eyebrow>
            <h2
              id={`quiz-cta-${location}`}
              className="mt-5 text-3xl leading-[1.08] font-semibold tracking-[-0.02em] text-balance text-bone sm:text-4xl"
            >
              The 3-Hand PLO Reality Check
            </h2>
            <p className="mt-5 max-w-xl text-lg leading-relaxed text-pretty text-bone-muted">
              Three spots where Hold&apos;em instincts get expensive. Pick an
              answer, see the reasoning immediately, and find out which of the
              three catches you.
            </p>
          </div>

          <div className="lg:col-span-5 lg:justify-self-end">
            <TrackedCta
              href="/plo-reality-check"
              location={location}
              label="Take the Reality Check"
              className="inline-flex w-full items-center justify-center rounded-[2px] border border-gold bg-transparent px-6 py-3.5 text-center font-semibold whitespace-nowrap text-gold transition-colors duration-150 hover:bg-gold hover:text-ink active:translate-y-px sm:w-auto"
            >
              Take the Reality Check
            </TrackedCta>
          </div>
        </div>
      </div>
    </section>
  );
}
