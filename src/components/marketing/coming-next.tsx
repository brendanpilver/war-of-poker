import { SectionIntro } from "./section-intro";

// Step names are canonical — see docs/WARPLAN.md. Do not rename or reorder.
const warplanSteps = [
  "WHO?",
  "ACTION SO FAR",
  "RANGES LIKELY",
  "POSSIBLE RESPONSES",
  "LONG-RANGE IMPLICATIONS",
  "AIM & ACTION",
  "NOTHING ELSE",
];

const categories = [
  {
    name: "Books",
    description: "Deep practical guides.",
    status: { label: "Available now: Short Stack PLO", tone: "text-gold" },
  },
  { name: "Strategy", description: "Actionable poker thinking." },
  {
    name: "Systems",
    description: "Repeatable decision frameworks.",
    status: { label: "Coming soon: WARPLAN", tone: "text-olive-light" },
  },
  {
    name: "Tools",
    description: "Reference cards, quizzes, calculators, and study aids.",
  },
  { name: "Courses", description: "Structured learning." },
  { name: "Gear", description: "War of Poker merchandise." },
];

export function ComingNext() {
  return (
    <section
      id="platform"
      aria-labelledby="platform-title"
      className="border-t border-line bg-ink-raised py-16 lg:py-20"
    >
      <div className="mx-auto max-w-6xl px-5 sm:px-8">
        <SectionIntro
          label="War of Poker"
          titleId="platform-title"
          title="Make Better Decisions at the Table."
        >
          <p>
            War of Poker develops practical systems, guides, and tools for
            players who want to think more clearly and play more deliberately.
          </p>
        </SectionIntro>

        <div className="mt-12 grid gap-12 lg:grid-cols-2 lg:gap-16">
          <div id="warplan" className="border-t border-line pt-8">
            <h3>
              <span className="block font-mono text-xs uppercase tracking-[0.18em] text-olive-light">
                Coming Next
              </span>
              <span className="mt-3 block text-3xl font-bold tracking-[0.02em] text-bone">
                WARPLAN
              </span>
            </h3>
            <p className="mt-4 leading-relaxed text-pretty text-bone-muted">
              A structured decision framework for approaching poker hands with a
              plan rather than reacting street by street.
            </p>
            <ol className="mt-5 flex flex-wrap gap-x-3 gap-y-2 font-mono text-[11px] tracking-[0.14em] text-bone-faint">
              {warplanSteps.map((step) => (
                <li
                  key={step}
                  className="after:ml-3 after:content-['·'] last:after:content-none"
                >
                  {step}
                </li>
              ))}
            </ol>
            <blockquote className="mt-6 text-lg text-bone">
              “Change the price; change the range.”
            </blockquote>
            <p className="mt-6 inline-flex items-center gap-3 border border-olive px-4 py-2 font-mono text-xs uppercase tracking-[0.18em] text-olive-light">
              <span aria-hidden className="size-1.5 rounded-full bg-olive-light" />
              WARPLAN — Coming Soon
            </p>
          </div>

          <div className="border-t border-line pt-8">
            <h3>
              <span className="block font-mono text-xs uppercase tracking-[0.18em] text-bone-faint">
                Beyond the Book
              </span>
              <span className="mt-3 block text-3xl font-bold tracking-[-0.01em] text-bone">
                More Than One Strategy Guide
              </span>
            </h3>
            <p className="mt-4 leading-relaxed text-pretty text-bone-muted">
              War of Poker is being built as a home for practical poker strategy
              — books, articles, systems, courses, tools, and gear designed
              around better decisions at the table.
            </p>
            <dl className="mt-6 grid gap-x-8 gap-y-5 sm:grid-cols-2">
              {categories.map((category) => (
                <div key={category.name}>
                  <dt className="font-medium text-bone">{category.name}</dt>
                  <dd className="mt-0.5 text-sm leading-relaxed text-bone-muted">
                    {category.description}
                    {category.status && (
                      <span
                        className={`mt-1 block font-mono text-[10px] uppercase tracking-[0.16em] ${category.status.tone}`}
                      >
                        {category.status.label}
                      </span>
                    )}
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      </div>
    </section>
  );
}
