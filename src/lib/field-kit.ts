/**
 * The Short Stack PLO Field Kit: seven printable assets.
 *
 * One source of truth for the whole application. The sales page reads the names
 * and summaries from here, and `src/lib/delivery.ts` builds the downloadable
 * asset list from the same entries, so a name shown to a buyer and the file
 * they receive cannot drift apart.
 *
 * Names and summaries follow the published product set (`plo_guide/field_kit`),
 * not paraphrases of it. This file carries no environment access, so marketing
 * components can import it safely.
 */

export type FieldKitPiece = {
  id: string;
  /** "Asset 1 of 7" in the published set. */
  index: number;
  name: string;
  /**
   * The full description. Kept as the canonical account of what the piece does
   * even where no surface currently prints it — the visual cards now carry
   * `phrase` instead, and this is what any longer treatment should use.
   */
  summary: string;
  /**
   * One clause for a card that already shows the piece's own front page, drawn
   * from `summary` rather than written fresh.
   */
  phrase: string;
  /** Object path inside the private products bucket. See delivery.ts. */
  objectPath: string;
  /**
   * The front page of the printed card, rendered at 1.25x from page 1 of the
   * same published PDF the buyer receives — `publication_final/pdf/`. Never a
   * mock-up: a piece with no real export simply has no thumbnail, and
   * `InsideTheBook` renders the row from whichever pieces have one.
   */
  thumbnail?: FieldKitThumbnail;
};

export type FieldKitThumbnail = {
  src: string;
  width: number;
  height: number;
  alt: string;
};

export const fieldKit: FieldKitPiece[] = [
  {
    id: "field-kit-01",
    index: 1,
    name: "Full-Hand Decision Map",
    summary:
      "The whole hand on one double-sided sheet: the four questions applied preflop, on the flop, on the turn, and on the river.",
    phrase: "The whole hand on one double-sided sheet.",
    objectPath: "short-stack-plo/field-kit/01_Full-Hand_Decision_Map.pdf",
    thumbnail: {
      src: "/books/short-stack-plo-field-kit-01-full-hand-decision-map.png",
      width: 765,
      height: 990,
      alt: "The Full-Hand Decision Map from the Short Stack PLO Field Kit: the four questions, then preflop and flop tables of situations and what tips each decision.",
    },
  },
  {
    id: "field-kit-02",
    index: 2,
    name: "60 BB Preflop + Pot Geometry Guide",
    summary:
      "Conservative example decisions for live $2/$5 at $300 effective, and the pot-limit arithmetic behind each one. Not ranges or frequencies.",
    phrase: "Live $2/$5 at $300 effective, and the arithmetic behind it.",
    objectPath:
      "short-stack-plo/field-kit/02_60BB_Preflop_and_Pot_Geometry_Guide.pdf",
    thumbnail: {
      src: "/books/short-stack-plo-field-kit-02-preflop-pot-geometry.png",
      width: 765,
      height: 990,
      alt: "The 60 BB Preflop + Pot Geometry Guide from the Short Stack PLO Field Kit, opening on the default $2/$5 game and the exact-chip pot-limit counting it uses.",
    },
  },
  {
    id: "field-kit-03",
    index: 3,
    name: "Flop + Draw Quality Card",
    summary:
      "What is the current nuts, and which components give you equity against the range that continues? Grading outs: nut, clean, vulnerable, dirty.",
    phrase: "Grading outs: nut, clean, vulnerable, dirty.",
    objectPath: "short-stack-plo/field-kit/03_Flop_and_Draw_Quality_Card.pdf",
    thumbnail: {
      src: "/books/short-stack-plo-field-kit-03-flop-draw-quality.png",
      width: 765,
      height: 990,
      alt: "The Flop + Draw Quality Card from the Short Stack PLO Field Kit: board-texture and hand-class tables under the question “what is the current nuts?”",
    },
  },
  {
    id: "field-kit-04",
    index: 4,
    name: "River Decision Card",
    summary:
      "What worse hands call? What better hands fold? What bluffs justify a call? Value, bluff-catching, and blockers on the last street.",
    phrase: "Value, bluff-catching, and blockers on the last street.",
    objectPath: "short-stack-plo/field-kit/04_River_Decision_Card.pdf",
    thumbnail: {
      src: "/books/short-stack-plo-field-kit-04-river-decision.png",
      width: 765,
      height: 990,
      alt: "The River Decision Card from the Short Stack PLO Field Kit, opening on what worse hands call, what better hands fold, and what bluffs justify a call.",
    },
  },
  {
    id: "field-kit-05",
    index: 5,
    name: "Player Read + Live Exploit Card",
    summary:
      "An exploit is an adjustment to a repeatable mistake. Find the evidence, rate your confidence, and make the change that earns against that behaviour.",
    phrase: "Find the evidence, rate your confidence, make the change.",
    objectPath:
      "short-stack-plo/field-kit/05_Player_Read_and_Live_Exploit_Card.pdf",
    thumbnail: {
      src: "/books/short-stack-plo-field-kit-05-player-read-live-exploit.png",
      width: 765,
      height: 990,
      alt: "The Player Read + Live Exploit Card from the Short Stack PLO Field Kit, opening on the definition of an exploit as an adjustment to a repeatable mistake.",
    },
  },
  {
    id: "field-kit-06",
    index: 6,
    name: "Session + Hand Review Workbook",
    summary:
      "Four printable pages — before, during, one uncertain hand, after. Built to review decisions rather than results.",
    phrase: "Four pages — before, during, one uncertain hand, after.",
    objectPath:
      "short-stack-plo/field-kit/06_Session_and_Hand_Review_Workbook.pdf",
    thumbnail: {
      src: "/books/short-stack-plo-field-kit-06-session-hand-review.png",
      width: 765,
      height: 990,
      alt: "Page one of the Session + Hand Review Workbook from the Short Stack PLO Field Kit: the before-you-sit sheet, with blank fields for stakes, stack plan, and table read.",
    },
  },
  {
    id: "field-kit-07",
    index: 7,
    name: "20-Hand Capstone Quiz + Answer Key",
    summary:
      "Twenty applied situations with the game, stacks, positions, player read, action, board, and price — plus a full answer key.",
    phrase: "Twenty applied situations, plus a full answer key.",
    objectPath:
      "short-stack-plo/field-kit/07_20-Hand_Capstone_Quiz_and_Answer_Key.pdf",
    thumbnail: {
      src: "/books/short-stack-plo-field-kit-07-capstone-quiz.png",
      width: 765,
      height: 990,
      alt: "The 20-Hand Capstone Quiz from the Short Stack PLO Field Kit, showing the first applied hands with their four lettered answers.",
    },
  },
];

export const fieldKitCount = fieldKit.length;

export type FieldKitPieceWithThumbnail = FieldKitPiece & {
  thumbnail: FieldKitThumbnail;
};

/** The pieces whose front page has been exported. See `thumbnail` above. */
export const fieldKitThumbnails = fieldKit.filter(
  (piece): piece is FieldKitPieceWithThumbnail => piece.thumbnail !== undefined,
);
