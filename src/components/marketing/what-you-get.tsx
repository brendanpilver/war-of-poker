import Image from "next/image";
import { fieldKit, type FieldKitPiece } from "@/lib/field-kit";
import { formatPrice, offers } from "@/lib/offers";
import { shortStackPlo } from "@/lib/short-stack-plo";
import { BookCover } from "./book-cover";
import { Section, SectionHeading } from "./section";

/**
 * What the Complete System actually contains. Merges the former BookContents
 * and SystemContents.
 *
 * The Field Kit is shown as seven named cards rather than a bullet reading
 * "7-piece Field Kit", because the job of this section is to make a system look
 * like a system. Each card now leads with the real front page of that piece,
 * rendered from the PDF the buyer receives (see `thumbnail` in
 * `src/lib/field-kit.ts`). Nothing here is a mock-up; a piece without a real
 * export would simply show its title, as all seven did before.
 *
 * `compact` is the homepage: the seven run as one tidy row of thumbnails with
 * their titles and no descriptions, so the set reads as a set without turning
 * into seven large previews.
 *
 * The sales page runs one across on a phone, two on a tablet, four on a large
 * screen — seven into three columns used to leave one card alone beside two
 * empty cells. Each card carries the front page, the number, the name, and one
 * clause; `summary` is the fuller account and the card is not the place for it,
 * now that the page itself is visible above it.
 *
 * A phone is the exception. Seven full-width cards is most of a screen each, so
 * three lead, every title and clause follows in a list — nothing is hidden from
 * a reader who does not open anything — and a native `details` holds the other
 * four. Those four are in the markup twice: once in the grid, shown from `sm`
 * up, and once inside the disclosure. Only one copy is ever displayed, and the
 * hidden one is `display: none`, which a lazy image does not fetch — so each
 * file is still requested once. A closed `details` keeps its contents in layout,
 * so the four behind it do load before it is opened; that is what makes opening
 * it instant and free of reflow. Tablet and desktop never see the disclosure and
 * show all seven at once.
 *
 * `details` rather than a button: it is the pattern `Faq` already uses, it opens
 * both ways without a second label, and it needs no client component.
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

/**
 * A trailing row that does not fill its width is centred rather than left hard
 * against one edge with dead space beside it. Each grid is declared at double
 * its visible column count so a card spans two and the short row can start on a
 * half-step: one half-column per missing card.
 *
 * Written for any number of pieces, not for seven. Tailwind needs the class
 * names spelled out, so the offsets are a lookup rather than arithmetic, and a
 * row short by more than three at four columns simply is not centred — which
 * cannot happen, because such a row would be empty.
 */
const COLUMNS_AT_SM = 2;
const COLUMNS_AT_LG = 4;

const SM_COLUMN_START = ["", "sm:col-start-2"];
const LG_COLUMN_START = ["", "lg:col-start-2", "lg:col-start-3", "lg:col-start-4"];

/** Where the short row begins, and how many cards it is missing. */
function shortRow(columns: number) {
  const remainder = fieldKit.length % columns;
  if (remainder === 0) return null;
  return { start: fieldKit.length - remainder, missing: columns - remainder };
}

function columnStart(position: number, columns: number, classes: string[]) {
  const row = shortRow(columns);
  if (row === null || position !== row.start) return "";
  return classes[row.missing] ?? "";
}

/**
 * The front page of one Field Kit card. A piece with no real export renders
 * nothing rather than a placeholder, so the layout degrades to the titles the
 * section carried before the thumbnails existed.
 */
function FieldKitFront({
  piece,
  sizes,
}: {
  piece: FieldKitPiece;
  sizes: string;
}) {
  if (!piece.thumbnail) return null;

  return (
    <Image
      src={piece.thumbnail.src}
      width={piece.thumbnail.width}
      height={piece.thumbnail.height}
      alt={piece.thumbnail.alt}
      sizes={sizes}
      className="h-auto w-full bg-bone shadow-[0_16px_32px_-20px_rgb(0_0_0/0.9)] ring-1 ring-bone/10"
    />
  );
}

function FieldKitCard({
  piece,
  sizes,
}: {
  piece: FieldKitPiece;
  sizes: string;
}) {
  return (
    <>
      <FieldKitFront piece={piece} sizes={sizes} />
      <p className="mt-4 font-mono text-[11px] tracking-[0.16em] text-bone-faint uppercase tabular-nums">
        {String(piece.index).padStart(2, "0")}
      </p>
      <h4 className="mt-2 leading-snug font-semibold text-pretty text-bone">
        {piece.name}
      </h4>
      <p className="mt-1.5 text-[14px] leading-relaxed text-pretty text-bone-muted">
        {piece.phrase}
      </p>
    </>
  );
}

/** The three that lead on a phone, chosen to show three different kinds of tool. */
const PHONE_LEAD_IDS = ["field-kit-01", "field-kit-02", "field-kit-07"];
const phoneHeldBack = fieldKit.filter(
  (piece) => !PHONE_LEAD_IDS.includes(piece.id),
);

export function WhatYouGet({ compact = false }: { compact?: boolean }) {
  return (
    <Section id="what-you-get" aria-labelledby="what-you-get-title">
      <SectionHeading
        id="what-you-get-title"
        eyebrow="What you get"
        lead="Use the seven printable tools for study, session preparation, and hand review."
      >
        The book explains the system. The Field Kit helps you apply it.
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
        {compact ? (
          <ol className="mt-6 grid grid-cols-2 gap-x-4 gap-y-6 sm:grid-cols-4 lg:grid-cols-7">
            {fieldKit.map((piece) => (
              <li key={piece.id}>
                <FieldKitFront piece={piece} sizes="(min-width: 1024px) 14vw, (min-width: 640px) 24vw, 45vw" />
                <p className="mt-3 text-[13px] leading-snug text-pretty text-bone">
                  {piece.name}
                </p>
              </li>
            ))}
          </ol>
        ) : (
          <>
            <ol className="mt-6 grid grid-cols-1 gap-x-6 gap-y-10 sm:grid-cols-4 lg:grid-cols-8">
              {fieldKit.map((piece, position) => {
                const heldBackOnPhone = !PHONE_LEAD_IDS.includes(piece.id);
                const smStart = columnStart(
                  position,
                  COLUMNS_AT_SM,
                  SM_COLUMN_START,
                );

                return (
                  <li
                    key={piece.id}
                    className={[
                      heldBackOnPhone ? "hidden sm:block" : "",
                      "sm:col-span-2 lg:col-span-2",
                      smStart && `${smStart} lg:col-start-auto`,
                      columnStart(position, COLUMNS_AT_LG, LG_COLUMN_START),
                    ]
                      .filter(Boolean)
                      .join(" ")}
                  >
                    <FieldKitCard
                      piece={piece}
                      sizes="(min-width: 1024px) 23vw, (min-width: 640px) 45vw, 90vw"
                    />
                  </li>
                );
              })}
            </ol>

            <ul className="mt-8 divide-y divide-line border-y border-line sm:hidden">
              {fieldKit.map((piece) => (
                <li key={piece.id} className="flex gap-4 py-3">
                  <span className="mt-0.5 font-mono text-[11px] tracking-[0.16em] text-bone-faint uppercase tabular-nums">
                    {String(piece.index).padStart(2, "0")}
                  </span>
                  <span>
                    <span className="block leading-snug font-medium text-pretty text-bone">
                      {piece.name}
                    </span>
                    <span className="mt-0.5 block text-[14px] leading-relaxed text-pretty text-bone-muted">
                      {piece.phrase}
                    </span>
                  </span>
                </li>
              ))}
            </ul>

            <details className="group mt-4 sm:hidden">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-6 py-3 leading-snug font-medium text-bone transition-colors duration-150 hover:text-gold-light [&::-webkit-details-marker]:hidden">
                View all {fieldKit.length} full previews
                <span
                  aria-hidden
                  className="font-mono text-xl leading-none text-gold transition-transform duration-150 group-open:rotate-45"
                >
                  +
                </span>
              </summary>
              <ol className="grid grid-cols-1 gap-y-10 pt-4">
                {phoneHeldBack.map((piece) => (
                  <li key={piece.id}>
                    <FieldKitCard piece={piece} sizes="90vw" />
                  </li>
                ))}
              </ol>
            </details>
          </>
        )}
        <p className="mt-6 text-bone-muted">
          All seven are included in the Complete System —{" "}
          <span className="text-bone">{formatPrice(offers.system.amountCents)}</span>{" "}
          with the book, or{" "}
          {formatPrice(offers["field-kit"].amountCents)} on their own.
        </p>
      </div>
    </Section>
  );
}
