/**
 * Playing-card data.
 *
 * Shared by the challenge content (`src/lib/quiz/`) and the card component
 * (`src/components/poker/playing-card.tsx`). It lives here rather than beside
 * either one so the component does not have to import from the quiz to know
 * what a card is.
 */

export type Suit = "s" | "h" | "d" | "c";

export type Rank =
  | "A"
  | "K"
  | "Q"
  | "J"
  | "T"
  | "9"
  | "8"
  | "7"
  | "6"
  | "5"
  | "4"
  | "3"
  | "2";

export type Card = {
  rank: Rank;
  suit: Suit;
};

/** `"Ah Ac Ks 3d"` -> four cards. Keeps hand data readable where it is written. */
export function cards(notation: string): Card[] {
  return notation
    .split(" ")
    .filter((token) => token.length > 0)
    .map((token) => ({
      rank: token[0] as Rank,
      suit: token[1] as Suit,
    }));
}
