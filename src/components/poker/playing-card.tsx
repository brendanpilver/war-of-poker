import type { Card, Suit } from "@/lib/quiz/reality-check";

/**
 * A playing card.
 *
 * Rendered as a light face on the site's dark ground because that is how a real
 * card reads at a table, and because rank and suit need to survive a glance on
 * a phone. The rank carries the most weight: at small sizes a reader identifies
 * the card by its rank first and confirms with the suit.
 */

const suitGlyphs: Record<Suit, string> = {
  s: "♠",
  h: "♥",
  d: "♦",
  c: "♣",
};

const suitNames: Record<Suit, string> = {
  s: "spades",
  h: "hearts",
  d: "diamonds",
  c: "clubs",
};

const rankNames: Record<Card["rank"], string> = {
  A: "ace",
  K: "king",
  Q: "queen",
  J: "jack",
  T: "ten",
  "9": "nine",
  "8": "eight",
  "7": "seven",
  "6": "six",
  "5": "five",
  "4": "four",
  "3": "three",
  "2": "two",
};

/** Red suits use a deep red that stays legible against the bone face. */
const suitColor: Record<Suit, string> = {
  s: "text-[#16150f]",
  c: "text-[#16150f]",
  h: "text-[#a8202a]",
  d: "text-[#a8202a]",
};

type PlayingCardProps = {
  card: Card;
  /** `lead` is used for hole cards, `board` for community cards. */
  size?: "lead" | "board";
};

export function PlayingCard({ card, size = "board" }: PlayingCardProps) {
  const label = `${rankNames[card.rank]} of ${suitNames[card.suit]}`;
  const dimensions =
    size === "lead"
      ? "h-[4.25rem] w-[3rem] sm:h-20 sm:w-14"
      : "h-16 w-11 sm:h-[4.5rem] sm:w-[3.25rem]";
  const rankSize = size === "lead" ? "text-2xl sm:text-3xl" : "text-xl sm:text-2xl";
  const glyphSize = size === "lead" ? "text-xl sm:text-2xl" : "text-lg sm:text-xl";

  return (
    <span
      role="img"
      aria-label={label}
      className={`inline-flex shrink-0 flex-col items-center justify-center rounded-[3px] bg-bone shadow-[0_1px_0_rgb(0_0_0/0.45)] ring-1 ring-black/20 ${dimensions} ${suitColor[card.suit]}`}
    >
      <span className={`font-bold leading-none tracking-[-0.02em] ${rankSize}`}>
        {card.rank}
      </span>
      <span aria-hidden className={`mt-0.5 leading-none ${glyphSize}`}>
        {suitGlyphs[card.suit]}
      </span>
    </span>
  );
}

type CardRowProps = {
  cards: Card[];
  label: string;
  size?: "lead" | "board";
  /**
   * Index at which a later street begins. Cards from here on are separated by a
   * gap so the turn reads as a new card rather than part of the flop.
   */
  streetBreakIndex?: number;
};

export function CardRow({ cards, label, size = "board", streetBreakIndex }: CardRowProps) {
  return (
    <div>
      <p className="font-mono text-[11px] tracking-[0.18em] text-bone-faint uppercase">
        {label}
      </p>
      <div className="mt-2 flex items-center gap-1.5">
        {cards.map((card, index) => (
          <span key={`${card.rank}${card.suit}`} className="contents">
            {index === streetBreakIndex && (
              <span
                aria-hidden
                className="mx-1 h-10 w-px shrink-0 bg-line sm:mx-1.5"
              />
            )}
            <PlayingCard card={card} size={size} />
          </span>
        ))}
      </div>
    </div>
  );
}
