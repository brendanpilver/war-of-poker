import { SectionIntro } from "./section-intro";

const audiences = [
  "No-Limit Hold’em players moving into PLO",
  "Low- and mid-stakes live PLO players",
  "Players who want to limit deep-stack exposure",
  "Players who want a repeatable decision framework",
  "Players who prefer practical live strategy to solver-heavy theory",
];

const notFor = [
  "A promise of easy profit. No stack depth guarantees results.",
  "Solver charts and theory-heavy analysis.",
  "A deep-stack PLO playbook.",
];

const listHeadingClass =
  "font-mono text-xs uppercase tracking-[0.18em] text-bone-faint";

export function LivePlayers() {
  return (
    <section
      id="for-live-players"
      aria-labelledby="live-players-title"
      className="border-t border-line py-20 lg:py-28"
    >
      <div className="mx-auto grid max-w-6xl gap-12 px-5 sm:px-8 lg:grid-cols-12 lg:gap-16">
        <div className="lg:col-span-6">
          <SectionIntro
            index="05"
            label="Who It’s For"
            titleId="live-players-title"
            title="Built for Live Players"
          >
            <p>
              Short Stack PLO is written for the game as it is played in card
              rooms: real stacks, real opponents, and decisions made in real
              time.
            </p>
          </SectionIntro>

          <div className="reveal mt-10 border border-line bg-ink-card p-6 sm:p-8">
            <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
              <p className="font-mono text-4xl font-medium tracking-tight text-olive-light tabular-nums sm:text-5xl">
                60 BB
              </p>
              <p className="font-mono text-xs uppercase tracking-[0.18em] text-bone-faint">
                Working baseline
              </p>
            </div>
            <h3 className="mt-5 text-lg font-semibold text-bone">
              A baseline, not a requirement.
            </h3>
            <p className="mt-2 leading-relaxed text-pretty text-bone-muted">
              The book uses roughly 60 big blinds — $300 in a $2/$5 game — as
              its main example depth. The principles apply across shallow-stack
              live PLO: what drives each decision is the effective stack and the
              SPR it creates, not one exact number.
            </p>
          </div>
        </div>

        <div className="lg:col-span-6 lg:pt-12">
          <h3 className={listHeadingClass}>Especially relevant for</h3>
          <ul className="reveal mt-5 divide-y divide-line border-y border-line">
            {audiences.map((audience) => (
              <li
                key={audience}
                className="flex gap-4 py-5 text-lg leading-snug text-pretty text-bone"
              >
                <span aria-hidden className="text-gold">
                  —
                </span>
                {audience}
              </li>
            ))}
          </ul>

          <h3 className={`mt-12 ${listHeadingClass}`}>Not the right book if you want</h3>
          <ul className="mt-5 space-y-3">
            {notFor.map((item) => (
              <li
                key={item}
                className="flex gap-4 leading-snug text-pretty text-bone-muted"
              >
                <span aria-hidden className="text-bone-faint">
                  ×
                </span>
                {item}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
