/**
 * The educational and risk disclaimer.
 *
 * States plainly what the product is and is not. Deliberately quiet: it sits at
 * the foot of the page in supporting contrast, because it is necessary
 * information rather than a selling point, and making it visually loud would
 * read as either a warning or a disclaimer-as-marketing.
 */
export function EducationalDisclaimer() {
  return (
    <section aria-labelledby="disclaimer-title" className="border-t border-line">
      <div className="mx-auto max-w-2xl px-5 py-12 sm:px-8">
        <h2
          id="disclaimer-title"
          className="font-mono text-[11px] tracking-[0.18em] text-bone-faint uppercase"
        >
          Educational material
        </h2>
        <div className="mt-4 space-y-3 text-sm leading-relaxed text-pretty text-bone-muted">
          <p>
            Short Stack PLO is educational material about poker
            decision-making. It is not a guarantee of profit, winnings, or any
            particular result. Poker involves risk, including the loss of money,
            and results depend on the games you play, the players in them,
            variance, and your own decisions.
          </p>
          <p>
            It is practical live strategy, not solver output. Where it gives
            numbers, they assume the stated conditions — an eight-handed $2/$5
            game, no straddle, $300 effective, exact-chip pot-limit counting.
            Room rules and extra callers change the exact totals.
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
