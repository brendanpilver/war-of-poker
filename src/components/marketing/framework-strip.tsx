/**
 * HAND · SPR · EQUITY · PLAYER, compact.
 *
 * This is the supporting framework, not a second hero — it previously occupied
 * a full section with display-size type, which competed with the product for
 * attention. Four short definitions in one strip is enough.
 */

const steps = [
  { term: "Hand", question: "What do all four cards contribute?" },
  { term: "SPR", question: "What does the pot and remaining stack make possible?" },
  { term: "Equity", question: "Which outcomes actually win against the relevant range?" },
  { term: "Player", question: "What does this action mean from this opponent?" },
];

export function FrameworkStrip({ headingId }: { headingId: string }) {
  return (
    <div>
      <h3 id={headingId} className="text-xl font-semibold text-bone">
        Four questions, asked the same way on every street
      </h3>
      <dl className="mt-6 grid gap-x-8 gap-y-6 sm:grid-cols-2 lg:grid-cols-4">
        {steps.map((step) => (
          <div key={step.term} className="border-t border-line pt-4">
            <dt className="font-mono text-sm font-medium tracking-[0.18em] text-gold uppercase">
              {step.term}
            </dt>
            <dd className="mt-2 leading-snug text-pretty text-bone">
              {step.question}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
