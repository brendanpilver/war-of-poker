import { shortStackPlo } from "@/lib/short-stack-plo";
import { BookCover } from "./book-cover";
import { BookSubtitle } from "./book-subtitle";
import { BuyButton } from "./buy-button";
import { Eyebrow } from "./section-intro";

const outcomes = [
  "Choose four-card hands that hold up when money goes in early.",
  "Plan the stack-to-pot ratio before the flop instead of reacting to it.",
  "Spot the repeatable mistakes live players make, and adjust to them.",
];

export function Hero() {
  return (
    <section aria-labelledby="hero-title" className="border-b border-line">
      <div className="mx-auto grid max-w-6xl gap-x-16 gap-y-12 px-5 pt-12 pb-16 sm:px-8 sm:pt-16 lg:grid-cols-12 lg:items-center lg:pt-20 lg:pb-24">
        <div className="lg:col-span-7">
          <Eyebrow>From War of Poker</Eyebrow>
          <h1
            id="hero-title"
            className="mt-5 text-[2.6rem] leading-[0.95] font-bold tracking-[-0.02em] text-bone uppercase sm:text-7xl lg:text-[4.25rem] xl:text-[4.75rem]"
          >
            <span className="block">Short Stack</span>
            <span className="block text-gold">PLO</span>
          </h1>
          <p className="mt-5 max-w-xl text-xl leading-snug text-pretty text-gold-light sm:text-2xl">
            <BookSubtitle />
          </p>
          <p className="mt-3 text-sm text-bone-faint">By {shortStackPlo.author}</p>

          <p className="mt-6 max-w-xl text-lg leading-relaxed text-pretty text-bone-muted">
            A practical system for navigating live PLO with a shallower stack —
            from starting-hand construction and SPR to equity, commitment,
            player reads, turn decisions, river play, and live exploits.
          </p>

          <ul className="mt-7 max-w-xl space-y-3">
            {outcomes.map((outcome) => (
              <li key={outcome} className="flex gap-3 leading-snug text-pretty text-bone">
                <span aria-hidden className="text-gold">
                  —
                </span>
                {outcome}
              </li>
            ))}
          </ul>

          <div className="mt-9 flex flex-col items-start gap-5 sm:flex-row sm:items-center sm:gap-7">
            <BuyButton />
            <a
              href="#inside"
              className="text-sm font-medium text-bone underline decoration-bone/30 underline-offset-[6px] transition-colors duration-150 hover:decoration-gold"
            >
              See What’s Inside
            </a>
          </div>
          <p className="mt-4 font-mono text-[11px] uppercase tracking-[0.18em] text-bone-faint">
            {shortStackPlo.format} · {shortStackPlo.access}
          </p>
        </div>

        <div className="lg:col-span-5">
          <BookCover
            sizes="(min-width: 1024px) 384px, 256px"
            loading="eager"
            className="mx-auto w-full max-w-[14rem] sm:max-w-xs lg:max-w-sm"
          />
        </div>
      </div>
    </section>
  );
}
