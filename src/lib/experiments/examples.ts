import { cards, type Card } from "@/lib/poker/cards";
import type { AuthoredHook, LessonId } from "./spec";

/**
 * The marketing example library: the only source of poker content a Short
 * may show.
 *
 * **Sourcing rule** (docs/SHORTS-CONTENT-FORMAT.md § Hand sourcing). Every
 * example is an original hand. It must not reproduce or closely adapt a hand
 * from the published book, the Field Kit and its Capstone Quiz, the 10-Hand
 * Challenge, or another example. `tests/marketing-examples.test.ts` checks
 * every holding and flop against the paid inventory
 * (`tests/paid-examples.fixture.ts`), the Challenge, and the rest of this
 * library, and recomputes every card fact the copy states.
 *
 * **Approval.** An example is written by a person and starts as a
 * `candidate`. It becomes `approved` only when the owner has checked the
 * poker and the copy and says so, at which point `reviewedBy` and
 * `reviewedOn` are filled in. The engine proposes batches only from approved
 * examples; the renderer will draw a candidate only as a watermarked draft.
 *
 * **One Short per example.** A published example is spent: the format rule
 * forbids reusing a previously published hand, so the engine never assigns
 * an example that is already attached to a content piece.
 *
 * Principles come from the approved Short Stack PLO manuscript and cite it.
 * Nothing here extends the book.
 */

/** The four questions of the reasoning lens, in order. DECISION is their outcome. */
export const lensFactors = ["HAND", "SPR", "PLAYER", "EQUITY"] as const;
export type LensFactor = (typeof lensFactors)[number];

export type ExampleStatus = "candidate" | "approved" | "retired";

export type MarketingExample = {
  id: string;
  status: ExampleStatus;
  lesson: LessonId;
  provenance: {
    /** The book passage the principle is drawn from. */
    source: string;
    author: string;
    reviewedBy: string | null;
    reviewedOn: string | null;
    /** Anything the reviewer should know: judgement calls, close decisions. */
    notes: string;
  };
  /** Stakes and depth, shown above the table. */
  game: string;
  heroPosition: string;
  hand: Card[];
  board: Card[];
  /** The action so far, one line per step, in order. */
  timeline: string[];
  /** The setup beat's caption: the same action, said plainly. */
  setupLine: string;
  /** Dollars in the pot before the bet hero faces. */
  pot: number;
  /** Hero's remaining stack. */
  behind: number;
  /** The bet hero faces, if any. */
  facing: number | null;
  /** The decision, asked plainly before any reasoning. */
  prompt: string;
  choices: string[];
  answer: string;
  /** Whichever lens factors explain this decision, in lens order. */
  beats: { factor: LensFactor; text: string }[];
  /** Restates the answer at the reveal. */
  answerLine: string;
  /** The transferable line. */
  principle: string;
  /** Hook lines a template cannot write without making a claim. */
  hookLines: Partial<Record<AuthoredHook, string>>;
};

export const marketingExamples: MarketingExample[] = [
  {
    id: "mx-001",
    status: "candidate",
    lesson: "spr",
    provenance: {
      source:
        "Short Stack PLO, Chapter 5 (Think in SPR Zones: SPR 1-2 is LOW SPR; Common SPR Mistakes: Treating All SPRs the Same) and Chapter 6 (Top Set: \"At low SPR, top set is often happy to play for stacks\"; Low SPR Flop Strategy).",
      author: "Drafted by Claude Code for owner review, 2026-10-15",
      reviewedBy: null,
      reviewedOn: null,
      notes:
        "Calling is not a disaster here: after a call, $119 is left behind into $369, so the rest goes in on the turn either way. The example is chosen to teach the SPR arithmetic; confirm the decision framing before approving. A pot-sized raise would be $492, more than the $242 left, which is what makes raise all-in the only raise.",
    },
    game: "$2/$5 PLO · $300 effective",
    heroPosition: "Button",
    hand: cards("Kh Kc Td 9d"),
    board: cards("Ks 7c 2h"),
    timeline: [
      "Cutoff opens $17",
      "You 3-bet the button to $58",
      "Blinds fold · cutoff calls",
      "Flop K♠ 7♣ 2♥ · cutoff bets $123",
    ],
    setupLine: "You 3-bet kings, cutoff calls. Flop K-7-2. They bet the pot.",
    pot: 123,
    behind: 242,
    facing: 123,
    prompt: "Call, or raise all-in?",
    choices: ["Call", "Raise all-in"],
    answer: "Raise all-in",
    beats: [
      {
        factor: "HAND",
        text: "Top set. Nothing beats it on this flop.",
      },
      {
        factor: "SPR",
        text: "$242 behind, $123 in: SPR about 2.",
      },
    ],
    answerLine: "Raise all-in.",
    principle: "At SPR 1–2, top set is often happy to play for stacks.",
    hookLines: {
      "common-mistake": "Treating every SPR the same is expensive.",
      curiosity: "How many bets get $242 in?",
    },
  },
];

export function exampleById(id: string): MarketingExample | null {
  return marketingExamples.find((example) => example.id === id) ?? null;
}

export function approvedExamples(): MarketingExample[] {
  return marketingExamples.filter((example) => example.status === "approved");
}

/** Whether `example` can open with `hook` without a template inventing a line. */
export function supportsHook(example: MarketingExample, hook: string): boolean {
  if (hook === "common-mistake" || hook === "curiosity") {
    return typeof example.hookLines[hook] === "string";
  }
  return true;
}
