/**
 * The educational and risk disclaimer.
 *
 * States plainly what the product is and is not. Nothing here promises a win
 * rate, a return, or a result -- and this section exists so that claim is on
 * the page rather than only in the Terms.
 */
export function EducationalDisclaimer() {
  return (
    <section
      aria-labelledby="disclaimer-title"
      className="border-t border-line bg-ink-raised"
    >
      <div className="mx-auto max-w-3xl px-5 py-14 sm:px-8 lg:py-16">
        <h2
          id="disclaimer-title"
          className="font-mono text-[11px] tracking-[0.18em] text-bone-faint uppercase"
        >
          Educational material · Please read
        </h2>
        <div className="mt-5 space-y-4 text-[15px] leading-relaxed text-pretty text-bone-muted">
          <p>
            Short Stack PLO is educational material about poker decision-making.
            It is not a guarantee of profit, winnings, or any particular result,
            and nothing in it should be read as a promise of a return on the
            purchase price.
          </p>
          <p>
            Poker involves risk, including the loss of money. Results depend on
            the games you play, the players in them, variance, and your own
            decisions. No stack depth, system, or framework changes that.
          </p>
          <p>
            The material is practical live strategy, not solver output. Where it
            gives numbers, they assume the stated conditions — an eight-handed
            $2/$5 game, no straddle, $300 effective, exact-chip pot-limit
            counting. Room rules and extra callers change the exact totals.
          </p>
          <p>
            Play within your means. If gambling is causing you harm, support is
            available in most countries; in the US, the National Problem
            Gambling Helpline is 1-800-522-4700.
          </p>
        </div>
      </div>
    </section>
  );
}
