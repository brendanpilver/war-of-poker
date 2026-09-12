import { Eyebrow } from "./section-intro";

const steps = [
  { term: "Hand", question: "How well do the four cards work together?" },
  { term: "SPR", question: "What kind of postflop decision tree are we creating?" },
  {
    term: "Equity",
    question: "How does the complete hand perform against the relevant range?",
  },
  { term: "Player", question: "What does this opponent do too much or too little?" },
];

export function CoreFramework() {
  return (
    <section
      id="framework"
      aria-labelledby="framework-title"
      className="border-y border-line bg-ink-raised py-20 lg:py-28"
    >
      <div className="mx-auto max-w-6xl px-5 sm:px-8">
        <Eyebrow index="02">The Core Framework</Eyebrow>
        <h2
          id="framework-title"
          className="mt-6 text-4xl leading-[1.08] font-bold tracking-[-0.01em] text-bone uppercase sm:text-5xl lg:text-[3.4rem] xl:text-6xl"
        >
          {/* Arrows lead each term so a wrapped line starts with "→", never ends with it. */}
          {steps.map((step, i) => (
            <span key={step.term} className="inline-block whitespace-nowrap">
              {i > 0 && (
                <>
                  <span className="sr-only">, </span>
                  <span aria-hidden className="mx-[0.3em] font-normal text-gold">
                    →
                  </span>
                </>
              )}
              {step.term}
            </span>
          ))}
        </h2>
        <p className="mt-6 max-w-xl text-lg leading-relaxed text-pretty text-bone-muted">
          At the table, the book reduces each decision to four questions.
        </p>

        <ol className="reveal mt-14 grid lg:grid-cols-4">
          {steps.map((step, i) => (
            <li
              key={step.term}
              className="relative border-l border-line pb-10 pl-8 last:pb-0 lg:border-t lg:border-l-0 lg:pt-10 lg:pr-8 lg:pb-0 lg:pl-0"
            >
              <span
                aria-hidden
                className="absolute top-1.5 left-0 size-2.5 -translate-x-1/2 rotate-45 border border-gold bg-ink-raised lg:top-0 lg:-translate-y-1/2"
              />
              <p className="font-mono text-xs text-bone-faint tabular-nums">
                0{i + 1}
              </p>
              <h3 className="mt-2 font-mono text-sm font-medium tracking-[0.18em] text-gold uppercase">
                {step.term}
              </h3>
              <p className="mt-3 text-xl leading-snug text-pretty text-bone">
                {step.question}
              </p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
