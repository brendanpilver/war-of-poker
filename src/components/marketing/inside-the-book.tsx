import Image from "next/image";
import { bookPreviews, homepageBookPreviews } from "@/lib/book-previews";
import { Section, SectionHeading } from "./section";

/**
 * Real pages from the final edition, answering "what am I actually going to
 * learn from this book?" — with decisions, not chapter titles.
 *
 * Each preview leads with what the player did and what it cost, because the
 * claim the section has to carry is that this is not a list of PLO rules. Hand 7
 * makes the argument on its own: the same cards against the same opponent fold
 * at one stack depth and call at another.
 *
 * Every image is a direct render of the published PDF — see
 * `src/lib/book-previews.ts`. If a preview cannot be exported from the real
 * publication, it does not belong in this section; an invented page would
 * misrepresent the product.
 *
 * Two variants, one component. `compact` is the homepage: three previews, three
 * across, tightened vertical rhythm, so the page does not get meaningfully
 * longer, and it carries the three hands that need no setup. The full version is
 * the sales page: four previews, two across at every width above mobile, because
 * a preview small enough to be decoration is not evidence.
 *
 * Book pages only. The Field Kit cards are previewed in `WhatYouGet`, which
 * already names all seven and sits directly below this on both pages.
 *
 * No carousel, no hover state, no lightbox. The pages are the argument.
 *
 * The ground stays default: `ExpensiveDecision` is already raised and sits
 * directly above this on the homepage, and the white pages separate it anyway.
 */

function PagePreview({
  src,
  width,
  height,
  alt,
  sizes,
}: {
  src: string;
  width: number;
  height: number;
  alt: string;
  sizes: string;
}) {
  return (
    <Image
      src={src}
      width={width}
      height={height}
      alt={alt}
      sizes={sizes}
      className="h-auto w-full bg-bone shadow-[0_24px_48px_-24px_rgb(0_0_0/0.9)] ring-1 ring-bone/10"
    />
  );
}

export function InsideTheBook({ compact = false }: { compact?: boolean }) {
  const previews = compact ? homepageBookPreviews : bookPreviews;

  return (
    <Section
      id="inside-the-book"
      size={compact ? "compact" : "default"}
      aria-labelledby="inside-the-book-title"
    >
      <SectionHeading
        id="inside-the-book-title"
        eyebrow={compact ? "Inside Short Stack PLO" : "Inside the book"}
        lead={
          compact
            ? undefined
            : "Four hands from the final chapter, rendered straight from the published file. The answer moves with the hand, the SPR, the equity, the price, and the player — so the same cards are not the same decision twice."
        }
      >
        {compact ? "Three decisions from the book." : "The cards are not the decision."}
      </SectionHeading>

      <ul
        className={`mt-10 grid gap-x-8 gap-y-10 ${
          compact ? "sm:grid-cols-3 sm:gap-x-6" : "sm:grid-cols-2 sm:gap-y-12"
        }`}
      >
        {previews.map((preview) => (
          <li key={preview.id}>
            <figure>
              <PagePreview
                {...preview.image}
                sizes={
                  compact
                    ? "(min-width: 640px) 30vw, 90vw"
                    : "(min-width: 640px) 45vw, 90vw"
                }
              />
              <figcaption className="mt-4">
                <h3 className="leading-snug font-semibold text-balance text-bone">
                  {preview.headline}
                </h3>
                <p className="mt-2 font-mono text-[11px] leading-relaxed tracking-[0.1em] text-gold uppercase">
                  {preview.stat}
                </p>
                <p className="mt-2.5 text-[15px] leading-relaxed text-pretty text-bone-muted">
                  {preview.learn}
                </p>
                <p className="mt-2 font-mono text-[11px] tracking-[0.16em] text-bone-faint uppercase tabular-nums">
                  Page {preview.page}
                </p>
              </figcaption>
            </figure>
          </li>
        ))}
      </ul>
    </Section>
  );
}
