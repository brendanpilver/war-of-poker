import { shortStackPlo } from "@/lib/short-stack-plo";
import { BuyButton } from "./buy-button";

export function FinalCta() {
  return (
    <section aria-labelledby="final-cta-title" className="border-t border-line">
      <div className="mx-auto max-w-3xl px-5 py-20 text-center sm:px-8 lg:py-28">
        <h2
          id="final-cta-title"
          className="text-4xl leading-[1.05] font-semibold tracking-[-0.03em] text-balance text-bone sm:text-6xl"
        >
          {/* Non-breaking spaces keep the book title on one line. */}
          {"Start With Short Stack PLO."}
        </h2>
        <p className="mt-6 text-lg text-pretty text-bone-muted">
          Learn the system. Understand the stack. Make better decisions.
        </p>
        <BuyButton className="mt-10" />
        <p className="mt-5 flex flex-wrap justify-center gap-x-2 gap-y-1 font-mono text-[11px] uppercase tracking-[0.18em] text-bone-faint">
          <span>{shortStackPlo.format}</span>
          <span aria-hidden>·</span>
          <span>{shortStackPlo.access}</span>
          <span aria-hidden>·</span>
          <span>By {shortStackPlo.author}</span>
        </p>
      </div>
    </section>
  );
}
