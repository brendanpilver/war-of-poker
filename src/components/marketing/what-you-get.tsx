import { fieldKit } from "@/lib/field-kit";
import { formatPrice, offers } from "@/lib/offers";
import { shortStackPlo } from "@/lib/short-stack-plo";
import { BookCover } from "./book-cover";
import { Section, SectionHeading } from "./section";

/**
 * What $49 actually buys. Merges the former BookContents and SystemContents.
 *
 * The Field Kit is shown as seven named cards rather than a bullet reading
 * "7-piece Field Kit", because the job of this section is to make a system look
 * like a system. No page thumbnails exist in the repository, and inventing
 * mock-ups of pages that may not match the real files would misrepresent the
 * product — so each card carries the real published title and what the piece
 * does, and nothing pretends to be a screenshot.
 */

const bookCovers = [
  "Hand construction — which four cards actually work together",
  "Preflop and pot geometry at 60 BB",
  "SPR and planning commitment before the flop",
  "Flop play, board texture, and equity quality",
  "Draws, wraps, and redraws",
  "Turn resets when the board changes",
  "River value, bluff-catching, and blockers",
  "Live player reads and exploits",
  "Session and stack management",
];

export function WhatYouGet({ compact = false }: { compact?: boolean }) {
  return (
    <Section id="what-you-get" aria-labelledby="what-you-get-title">
      <SectionHeading
        id="what-you-get-title"
        eyebrow="What you get"
        lead="A book you read once and seven tools you keep using. The Field Kit is printable, because at a live table you have thirty seconds and no software."
      >
        A system you can put on the table.
      </SectionHeading>

      <div className="mt-12 grid gap-10 lg:grid-cols-12 lg:gap-12">
        <div className="lg:col-span-4">
          <BookCover
            sizes="(min-width: 1024px) 320px, 220px"
            className="w-full max-w-[13rem] lg:max-w-none"
          />
        </div>

        <div className="lg:col-span-8">
          <h3 className="text-2xl font-bold text-bone uppercase">
            {shortStackPlo.title}
          </h3>
          <p className="mt-2 leading-relaxed text-pretty text-bone-muted">
            The complete book, with fully worked hands.
          </p>
          {!compact && (
            <ul className="mt-6 grid gap-x-8 gap-y-2.5 sm:grid-cols-2">
              {bookCovers.map((item) => (
                <li
                  key={item}
                  className="flex gap-3 text-[15px] leading-snug text-pretty text-bone"
                >
                  <span aria-hidden className="text-gold">
                    —
                  </span>
                  {item}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="mt-14">
        <h3 className="text-xl font-semibold text-bone">
          The Field Kit — seven printable tools
        </h3>
        <ol className="mt-6 grid gap-px border border-line bg-line sm:grid-cols-2 lg:grid-cols-3">
          {fieldKit.map((piece) => (
            <li key={piece.id} className="flex flex-col bg-ink p-5">
              <p className="font-mono text-[11px] tracking-[0.16em] text-bone-faint uppercase tabular-nums">
                {String(piece.index).padStart(2, "0")}
              </p>
              <h4 className="mt-2.5 leading-snug font-semibold text-pretty text-bone">
                {piece.name}
              </h4>
              <p className="mt-2 text-[14px] leading-relaxed text-pretty text-bone-muted">
                {piece.summary}
              </p>
            </li>
          ))}
        </ol>
        <p className="mt-6 text-bone-muted">
          All seven are included in the Complete System —{" "}
          <span className="text-bone">{formatPrice(offers.system.amountCents)}</span>.
        </p>
      </div>
    </Section>
  );
}
