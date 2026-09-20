import type { Card, Suit } from "@/lib/poker/cards";

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

/** `lead` for hole cards, `board` for community cards, `mini` inside options. */
export type CardSize = "lead" | "board" | "mini";

const cardDimensions: Record<CardSize, string> = {
  lead: "h-[4.25rem] w-[3rem] sm:h-20 sm:w-14",
  board: "h-16 w-11 sm:h-[4.5rem] sm:w-[3.25rem]",
  mini: "h-11 w-8 sm:h-12 sm:w-[2.125rem]",
};

const cardRankSize: Record<CardSize, string> = {
  lead: "text-2xl sm:text-3xl",
  board: "text-xl sm:text-2xl",
  mini: "text-base",
};

const cardGlyphSize: Record<CardSize, string> = {
  lead: "text-xl sm:text-2xl",
  board: "text-lg sm:text-xl",
  mini: "text-sm",
};

type PlayingCardProps = {
  card: Card;
  size?: CardSize;
};

export function PlayingCard({ card, size = "board" }: PlayingCardProps) {
  const label = `${rankNames[card.rank]} of ${suitNames[card.suit]}`;
  const dimensions = cardDimensions[size];
  const rankSize = cardRankSize[size];
  const glyphSize = cardGlyphSize[size];

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
  /** Omit to render the cards without a caption, as inside an option. */
  label?: string;
  size?: CardSize;
  /**
   * Indices at which a later street begins. A card at one of these positions is
   * preceded by a rule, so the turn and the river read as new cards rather than
   * part of the flop.
   */
  streetBreaks?: number[];
};

export function CardRow({ cards, label, size = "board", streetBreaks }: CardRowProps) {
  const breaks = new Set(streetBreaks ?? []);

  return (
    <div>
      {label && (
        <p className="font-mono text-[11px] tracking-[0.18em] text-bone-faint uppercase">
          {label}
        </p>
      )}
      <div className={`flex items-center gap-1.5 ${label ? "mt-2" : ""}`}>
        {cards.map((card, index) => (
          <span key={`${card.rank}${card.suit}`} className="contents">
            {breaks.has(index) && (
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
