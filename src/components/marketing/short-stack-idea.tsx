import { SectionIntro } from "./section-intro";

const points = [
  {
    title: "Less deep-stack complexity",
    body: "A shallower effective stack removes many of the multi-street decisions that make deep PLO so expensive to get wrong.",
  },
  {
    title: "SPR you can plan",
    body: "Preflop action determines how much room remains after the flop. With less behind, you choose the kind of pot you play.",
  },
  {
    title: "Hand construction first",
    body: "When money goes in early, four cards that work together matter more than hands that only look strong.",
  },
  {
    title: "Earlier equity realization",
    body: "Lower SPRs let you continue with hands a deep stack would force you to fold, and get money in before later streets add pressure.",
  },
  {
    title: "Simpler commitment",
    body: "Stack-off decisions can be planned before the flop instead of improvised on the turn.",
  },
  {
    title: "Opponents who don’t adjust",
    body: "Many live players keep playing speculative hands as if everyone were 200 BB deep. Against your stack, they aren’t.",
  },
];

// Standalone flop snapshots from the book, not one continuous hand.
const sprSnapshots = [
  {
    spr: "8",
    pot: "$35",
    behind: "$280",
    note: "Plenty of money behind. A long sequence of flop, turn, and river decisions remains.",
  },
  {
    spr: "1.4",
    pot: "$150",
    behind: "$210",
    note: "A large part of the stack can go in with one or two bets.",
  },
];

export function ShortStackIdea() {
  return (
    <section id="strategy" aria-labelledby="strategy-title" className="py-20 lg:py-28">
      <div className="mx-auto max-w-6xl px-5 sm:px-8">
        <div className="grid gap-12 lg:grid-cols-12 lg:gap-16">
          <SectionIntro
            index="01"
            label="The Short Stack Idea"
            titleId="strategy-title"
            title="Play a shallower stack with a bigger plan."
            className="lg:col-span-6"
          >
            <p>
              Short Stack PLO is built around deliberately playing shallower
              stacks in live Pot-Limit Omaha. The effective stack changes which
              hands make money, how much room is left after the flop, and which
              decisions actually matter.
            </p>
            <p className="border-l-2 border-gold pl-4 text-base text-bone">
              A shorter stack is not an edge by itself. The edge comes from
              playing that depth better than the rest of the table.
            </p>
          </SectionIntro>

          <figure className="reveal self-end border border-line bg-ink-card lg:col-span-6">
            <figcaption className="border-b border-line px-6 py-4 font-mono text-xs uppercase tracking-[0.18em] text-bone-faint sm:px-8">
              SPR on the flop = stack behind ÷ pot
            </figcaption>
            <dl className="grid divide-y divide-line sm:grid-cols-2 sm:divide-x sm:divide-y-0">
              {sprSnapshots.map((snapshot) => (
                <div key={snapshot.spr} className="px-6 py-6 sm:px-8">
                  <dt className="font-mono text-xs text-bone-muted tabular-nums">
                    {snapshot.behind} behind · {snapshot.pot} pot
                  </dt>
                  <dd className="mt-4">
                    <span className="block font-mono text-[11px] uppercase tracking-[0.18em] text-bone-faint">
                      SPR
                    </span>
                    <span className="block text-5xl font-semibold tracking-tight text-bone tabular-nums">
                      {snapshot.spr}
                    </span>
                    <span className="mt-3 block text-sm leading-relaxed text-bone-muted">
                      {snapshot.note}
                    </span>
                  </dd>
                </div>
              ))}
            </dl>
          </figure>
        </div>

        <ul className="reveal mt-16 grid gap-px border border-line bg-line sm:grid-cols-2 lg:grid-cols-3">
          {points.map((point) => (
            <li key={point.title} className="bg-ink p-6 sm:p-8">
              <h3 className="text-lg font-semibold text-bone">{point.title}</h3>
              <p className="mt-2 text-[15px] leading-relaxed text-pretty text-bone-muted">
                {point.body}
              </p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
