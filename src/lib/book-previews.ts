/**
 * Four decisions from Chapter 12 of the final Short Stack PLO edition.
 *
 * Every image in `public/books/short-stack-plo-page-*.png` is a direct render of
 * a region of `Short_Stack_PLO_PUBLICATION_MASTER_RELEASE.pdf` — the published
 * first digital edition — at 3x, cropped to the text column. Nothing is
 * retouched, redrawn, or mocked up, and `page` is the number printed on the
 * page itself, so a reader can find it in the book they buy.
 *
 * To replace one, re-export the same region from the current edition PDF rather
 * than editing the PNG. If a page's content moves between editions, update
 * `page` with it. Each is 488 x 345 PDF points wide starting at x = 62, drawn at
 * 3x, which lands on 1464 x 1035:
 *
 *     printed page  PDF page  crop top (pt)  what it holds
 *     53            57        68             Hand 3, cards and ledger
 *     55            59        100            Hand 5, ledger and equities
 *     57            61        68             Hand 7, ledger and both prices
 *     59            63        68             Hand 9, ledger and the river price
 *
 * Nothing in the repository regenerates these; the publication file lives with
 * the rest of the product source, outside it.
 *
 * These replaced four previews of reference tables — preflop responses, SPR
 * zones, draw quality, river tendencies. The tables were real, but a table is a
 * rule, and the book's argument is that the rule does not decide the hand: the
 * cards, the SPR, the equity, the price and the player do, and when one of them
 * moves the answer moves with it. Chapter 12 is where that is demonstrated
 * rather than asserted, so the section now argues from the decisions.
 *
 * `headline` is the decision, not the chapter title. `stat` is the hand, the
 * board and what was actually done, and `learn` is the one sentence that says
 * why. Every card, amount and percentage in all three is transcribed from the
 * page above it — none of it is illustrative, and none of it is rounded.
 */

export type BookPreview = {
  id: string;
  /** Printed page number in the first digital edition. */
  page: number;
  /** The decision, stated as the reader meets it. */
  headline: string;
  /** Hand, board, and what the player did. Verbatim figures from the page. */
  stat: string;
  /** One sentence: why that was the decision. */
  learn: string;
  /** Shown in the compact homepage version, which carries three. */
  onHomepage: boolean;
  image: {
    src: string;
    width: number;
    height: number;
    alt: string;
  };
};

export const bookPreviews: BookPreview[] = [
  {
    id: "hand-3-flop-fold",
    page: 53,
    headline: "You put $58 in preflop. Now fold.",
    stat: "A♣A♦8♠3♥ on J♠T♠9♦ · $123 to call · fold",
    learn:
      "The $58 already in the pot buys no claim on the next $123, and lowering the SPR does not repair a poor matchup.",
    onHomepage: true,
    image: {
      src: "/books/short-stack-plo-page-53-hand-3-flop-fold.png",
      width: 1464,
      height: 1035,
      alt: "A page from Short Stack PLO: worked Hand 3, with A♣A♦8♠3♥ and the J♠T♠9♦ flop drawn as cards above a chip ledger that ends in a fold.",
    },
  },
  {
    id: "hand-5-wrap",
    page: 55,
    headline: "Twenty outs does not mean twenty clean outs.",
    stat: "J♠T♠7♥6♥ on 9♠8♠3♦ · $242 all-in · raise",
    learn:
      "The same twenty-card wrap is worth 61.1% against one holding and 46.0% against the same pair holding the better flush draw.",
    onHomepage: false,
    image: {
      src: "/books/short-stack-plo-page-55-hand-5-wrap.png",
      width: 1464,
      height: 1035,
      alt: "A page from Short Stack PLO: the chip ledger for worked Hand 5, ending in an all-in raise to $242, above the two equity figures for the twenty-card wrap.",
    },
  },
  {
    id: "hand-7-price",
    page: 57,
    headline: "Same cards. Same opponent. Fold at one stack depth. Call at another.",
    stat: "Q♥Q♣7♦6♦ on Q♦9♣4♠8♥ · fold at 60 BB · call at 40 BB",
    learn:
      "At $300 the call needs 30.0% and the set has 25.0%. At $200 the same call needs 20.1%, and the fold becomes a call.",
    onHomepage: true,
    image: {
      src: "/books/short-stack-plo-page-57-hand-7-price.png",
      width: 1464,
      height: 1035,
      alt: "A page from Short Stack PLO: the chip ledger for worked Hand 7, ending in a fold at $300 effective, above the paragraph that calls the same spot at $200.",
    },
  },
  {
    id: "hand-9-river-fold",
    page: 59,
    headline: "The value bet can be right. The fold can also be right.",
    stat: "K♠J♠T♥8♥ on Q♠9♠5♦3♣2♠ · $191 to call · fold",
    learn:
      "The $50 bet was priced for the hands that call. The raise is a different range, and $191 to win $602 needs 31.7%.",
    onHomepage: true,
    image: {
      src: "/books/short-stack-plo-page-59-hand-9-river-fold.png",
      width: 1464,
      height: 1035,
      alt: "A page from Short Stack PLO: the chip ledger for worked Hand 9, ending in a fold to an all-in river raise, above the paragraph pricing that call at 31.7%.",
    },
  },
];

export const homepageBookPreviews = bookPreviews.filter(
  (preview) => preview.onHomepage,
);
