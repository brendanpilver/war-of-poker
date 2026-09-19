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
  summary: string;
  /** Object path inside the private products bucket. See delivery.ts. */
  objectPath: string;
};

export const fieldKit: FieldKitPiece[] = [
  {
    id: "field-kit-01",
    index: 1,
    name: "Full-Hand Decision Map",
    summary:
      "The whole hand on one double-sided sheet: the four questions applied preflop, on the flop, on the turn, and on the river.",
    objectPath: "short-stack-plo/field-kit/01_Full-Hand_Decision_Map.pdf",
  },
  {
    id: "field-kit-02",
    index: 2,
    name: "60 BB Preflop + Pot Geometry Guide",
    summary:
      "Conservative example decisions for live $2/$5 at $300 effective, and the pot-limit arithmetic behind each one. Not ranges or frequencies.",
    objectPath:
      "short-stack-plo/field-kit/02_60BB_Preflop_and_Pot_Geometry_Guide.pdf",
  },
  {
    id: "field-kit-03",
    index: 3,
    name: "Flop + Draw Quality Card",
    summary:
      "What is the current nuts, and which components give you equity against the range that continues? Grading outs: nut, clean, vulnerable, dirty.",
    objectPath: "short-stack-plo/field-kit/03_Flop_and_Draw_Quality_Card.pdf",
  },
  {
    id: "field-kit-04",
    index: 4,
    name: "River Decision Card",
    summary:
      "What worse hands call? What better hands fold? What bluffs justify a call? Value, bluff-catching, and blockers on the last street.",
    objectPath: "short-stack-plo/field-kit/04_River_Decision_Card.pdf",
  },
  {
    id: "field-kit-05",
    index: 5,
    name: "Player Read + Live Exploit Card",
    summary:
      "An exploit is an adjustment to a repeatable mistake. Find the evidence, rate your confidence, and make the change that earns against that behaviour.",
    objectPath:
      "short-stack-plo/field-kit/05_Player_Read_and_Live_Exploit_Card.pdf",
  },
  {
    id: "field-kit-06",
    index: 6,
    name: "Session + Hand Review Workbook",
    summary:
      "Four printable pages — before, during, one uncertain hand, after. Built to review decisions rather than results.",
    objectPath:
      "short-stack-plo/field-kit/06_Session_and_Hand_Review_Workbook.pdf",
  },
  {
    id: "field-kit-07",
    index: 7,
    name: "20-Hand Capstone Quiz + Answer Key",
    summary:
      "Twenty applied situations with the game, stacks, positions, player read, action, board, and price — plus a full answer key.",
    objectPath:
      "short-stack-plo/field-kit/07_20-Hand_Capstone_Quiz_and_Answer_Key.pdf",
  },
];

export const fieldKitCount = fieldKit.length;
