import { fieldKit, type FieldKitPiece } from "@/lib/field-kit";

/**
 * The ten decision concepts the challenge teaches, and the material in the
 * Short Stack PLO system that covers each one.
 *
 * `materialIds` are ids from `src/lib/field-kit.ts`, so the results screen can
 * only ever name a piece that really exists and really ships with the Complete
 * System. The book covers every concept and is therefore implied rather than
 * listed against each one.
 *
 * Exactly one hand exercises each concept. That keeps the end-of-challenge
 * diagnostic honest -- "you missed this one" rather than a scored competence
 * claim derived from a single answer.
 */

export type ConceptId =
  | "nlh-instinct"
  | "preflop-structure"
  | "effective-stack"
  | "spr"
  | "nuttiness"
  | "draw-quality"
  | "price"
  | "turn-discipline"
  | "river-discipline"
  | "whole-hand";

export type Concept = {
  id: ConceptId;
  /** Short label, used in the diagnostic lists. */
  label: string;
  /** One clause saying what the concept asks of the player. */
  summary: string;
  materialIds: string[];
};

export const concepts: Record<ConceptId, Concept> = {
  "nlh-instinct": {
    id: "nlh-instinct",
    label: "Hold'em instinct vs PLO reality",
    summary: "Knowing when a familiar No-Limit read stops describing the spot.",
    materialIds: ["field-kit-03"],
  },
  "preflop-structure": {
    id: "preflop-structure",
    label: "Preflop hand structure",
    summary: "Reading all four cards as one holding rather than two plus two.",
    materialIds: ["field-kit-02"],
  },
  "effective-stack": {
    id: "effective-stack",
    label: "Effective stack and depth",
    summary: "Measuring the stack against the game actually being played.",
    materialIds: ["field-kit-01", "field-kit-06"],
  },
  spr: {
    id: "spr",
    label: "SPR and commitment",
    summary: "Building the pot your hand wants, and knowing what SPR does not prove.",
    materialIds: ["field-kit-02", "field-kit-01"],
  },
  nuttiness: {
    id: "nuttiness",
    label: "Nuttiness and multiway discipline",
    summary: "Grading a draw by what it wins with, not by how big it looks.",
    materialIds: ["field-kit-03"],
  },
  "draw-quality": {
    id: "draw-quality",
    label: "Draw quality",
    summary: "Counting unique outs, then grading them.",
    materialIds: ["field-kit-03"],
  },
  price: {
    id: "price",
    label: "Price and future action",
    summary: "Pricing what you owe against the pot you can still win.",
    materialIds: ["field-kit-01", "field-kit-02"],
  },
  "turn-discipline": {
    id: "turn-discipline",
    label: "Turn discipline",
    summary: "Starting over when the board changes rather than reusing a flop number.",
    materialIds: ["field-kit-01"],
  },
  "river-discipline": {
    id: "river-discipline",
    label: "River discipline",
    summary: "Naming the worse hands that call and the bluffs that actually exist.",
    materialIds: ["field-kit-04"],
  },
  "whole-hand": {
    id: "whole-hand",
    label: "Whole-hand reasoning",
    summary: "Running the same four questions on every street of one hand.",
    materialIds: ["field-kit-01", "field-kit-07"],
  },
};

export const conceptIds = Object.keys(concepts) as ConceptId[];

/** The Field Kit pieces a concept maps to, in kit order. */
export function materialsFor(conceptId: ConceptId): FieldKitPiece[] {
  const wanted = new Set(concepts[conceptId].materialIds);
  return fieldKit.filter((piece) => wanted.has(piece.id));
}
