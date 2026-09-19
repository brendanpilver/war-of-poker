import { fieldKit } from "@/lib/field-kit";
import { shortStackPlo } from "@/lib/short-stack-plo";
import { SectionIntro } from "./section-intro";

/** Everything the Complete System contains, piece by piece. */
export function SystemContents() {
  return (
    <section
      id="complete-system"
      aria-labelledby="complete-system-title"
      className="scroll-mt-24 border-t border-line py-20 lg:py-28"
    >
      <div className="mx-auto max-w-6xl px-5 sm:px-8">
        <SectionIntro
          index="06"
          label="The complete system"
          titleId="complete-system-title"
          title="The book, plus seven tools you can put on the table."
          className="max-w-3xl"
        >
          <p>
            The Field Kit is printable. It exists so the thinking survives
            contact with a live game, where you have thirty seconds and no
            software.
          </p>
        </SectionIntro>

        <div className="mt-14 border border-line bg-ink-card">
          <div className="border-b border-line p-6 sm:p-8">
            <p className="font-mono text-[11px] tracking-[0.18em] text-gold uppercase">
              Asset 0
            </p>
            <h3 className="mt-3 text-2xl font-bold text-bone uppercase sm:text-3xl">
              {shortStackPlo.title}
            </h3>
            <p className="mt-3 max-w-2xl leading-relaxed text-pretty text-bone-muted">
              The complete book: hand construction, preflop, pot geometry, SPR
              and commitment, flop play, draw quality and redraws, turn resets,
              river decisions, live exploits, and session and stack management —
              with fully worked hands.
            </p>
          </div>

          <ol className="divide-y divide-line">
            {fieldKit.map((piece) => (
              <li
                key={piece.id}
                className="grid gap-x-8 gap-y-2 p-6 sm:grid-cols-12 sm:p-8"
              >
                <p className="font-mono text-[11px] tracking-[0.18em] text-bone-faint uppercase sm:col-span-2 tabular-nums">
                  Asset {piece.index}
                </p>
                <div className="sm:col-span-10">
                  <h3 className="text-lg leading-snug font-semibold text-pretty text-bone">
                    {piece.name}
                  </h3>
                  <p className="mt-2 text-[15px] leading-relaxed text-pretty text-bone-muted">
                    {piece.summary}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}
