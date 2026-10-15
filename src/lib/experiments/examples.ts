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
  /** Dollars in the middle as hero decides, including any bets this street. */
  pot: number;
  /** The pot when this street began; SPR is measured against it. */
  streetPot: number;
  /** Hero's remaining stack. */
  behind: number;
  /** What hero must put in to call, if facing a bet. */
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
    setupLine: "You 3-bet kings. Flop K-7-2. They bet the pot.",
    pot: 246,
    streetPot: 123,
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
  {
    id: "mx-002",
    status: "candidate",
    lesson: "spr",
    provenance: {
      source:
        "Short Stack PLO, Chapter 6 (Overpairs: \"Bare overpairs require caution... At SPR 5, it may be an easy check or fold\") and Chapter 5 (SPR Changes Hand Strength).",
      author: "Drafted by Claude Code for owner review, 2026-10-15",
      reviewedBy: null,
      reviewedOn: null,
      notes:
        "Three-way at SPR about 5 with bare aces facing a pot bet on a connected two-tone flop. J-9 and 9-6 already make straights. The aces have no straight or flush draw; only the two remaining aces improve them.",
    },
    game: "$2/$5 PLO · $300 effective",
    heroPosition: "Button",
    hand: cards("As Ad Qc 4d"),
    board: cards("Th 8h 7c"),
    timeline: ["Hijack opens $17", "You call · big blind calls", "Flop T♥ 8♥ 7♣ · hijack bets $53"],
    setupLine: "Three-way. Flop T-8-7, two hearts. A pot bet.",
    pot: 106,
    streetPot: 53,
    behind: 283,
    facing: 53,
    prompt: "Fold, call, or raise?",
    choices: ["Fold", "Call", "Raise"],
    answer: "Fold",
    beats: [
      { factor: "HAND", text: "Bare aces. No flush draw, no straight draw." },
      { factor: "SPR", text: "$283 behind, $53 in: SPR about 5." },
    ],
    answerLine: "Fold.",
    principle: "At SPR 5, bare aces can be an easy fold.",
    hookLines: {
      "common-mistake": "Aces are not a plan on every flop.",
      curiosity: "Can you fold aces on the flop?",
    },
  },
  {
    id: "mx-003",
    status: "candidate",
    lesson: "spr",
    provenance: {
      source:
        "Short Stack PLO, Chapter 5 (Combo Draws and Low SPR: at SPR 1-2 strong wraps and nut flush draws \"often become natural stack-off candidates\"; Common SPR Mistakes: Overfolding Strong Combo Draws).",
      author: "Drafted by Claude Code for owner review, 2026-10-15",
      reviewedBy: null,
      reviewedOn: null,
      notes:
        "Equity is exact against one study holding, Q♣Q♠7♦6♦ (top set): 50.4%. The raise is all-in because a pot raise would be $444, more than the $248 left.",
    },
    game: "$2/$5 PLO · $300 effective",
    heroPosition: "Cutoff",
    hand: cards("Ah Kh Jc Tc"),
    board: cards("Qh 9h 2s"),
    timeline: ["Hijack opens $15", "You 3-bet the cutoff to $52", "Blinds fold · hijack calls", "Flop Q♥ 9♥ 2♠ · hijack bets $111"],
    setupLine: "Your 3-bet is called. Flop Q-9-2, two hearts. A pot bet.",
    pot: 222,
    streetPot: 111,
    behind: 248,
    facing: 111,
    prompt: "Fold, call, or raise all-in?",
    choices: ["Fold", "Call", "Raise all-in"],
    answer: "Raise all-in",
    beats: [
      { factor: "HAND", text: "Nut flush draw and a wrap: even with top set." },
      { factor: "SPR", text: "$248 behind, $111 in: SPR about 2." },
    ],
    answerLine: "Raise all-in.",
    principle: "Low SPR makes big combo draws stack-off hands.",
    hookLines: {
      "common-mistake": "Overfolding big combo draws is expensive.",
      curiosity: "Can a draw be even with top set?",
    },
  },
  {
    id: "mx-004",
    status: "candidate",
    lesson: "nuttiness",
    provenance: {
      source:
        "Short Stack PLO, Chapter 7 (Non-Nut Flush Draws: \"should be downgraded aggressively as more players enter the pot\"; Multiway Draws).",
      author: "Drafted by Claude Code for owner review, 2026-10-15",
      reviewedBy: null,
      reviewedOn: null,
      notes:
        "Four-way. Nine spades make hero a jack-high flush; none makes the nuts, because the A♠ and Q♠ are unseen. No single turn card makes hero a straight.",
    },
    game: "$2/$5 PLO · $300 effective",
    heroPosition: "Button",
    hand: cards("Js Ts 6d 5c"),
    board: cards("Ks 8s 3h"),
    timeline: ["Hijack opens $17", "Cutoff, you and big blind call", "Flop K♠ 8♠ 3♥", "Hijack bets $70 · cutoff calls"],
    setupLine: "Four-way pot. Flop K-8-3, two spades. A bet and a call reach you.",
    pot: 210,
    streetPot: 70,
    behind: 283,
    facing: 70,
    prompt: "Fold, call, or raise?",
    choices: ["Fold", "Call", "Raise"],
    answer: "Fold",
    beats: [
      { factor: "HAND", text: "Jack-high flush draw. No spade makes it the nuts." },
      { factor: "PLAYER", text: "Three opponents, and higher spades unseen." },
    ],
    answerLine: "Fold.",
    principle: "Downgrade non-nut flush draws as more players enter the pot.",
    hookLines: {
      "common-mistake": "Not every flush draw is worth a call.",
      curiosity: "When is a flush draw a fold?",
    },
  },
  {
    id: "mx-005",
    status: "candidate",
    lesson: "nuttiness",
    provenance: {
      source:
        "Short Stack PLO, Chapter 6 (Straights: \"DO I HAVE THE NUT STRAIGHT?\"; The Nuts Come First: \"getting excited about a strong-looking hand that is already second best\").",
      author: "Drafted by Claude Code for owner review, 2026-10-15",
      reviewedBy: null,
      reviewedOn: null,
      notes:
        "Hero holds the lowest straight (4-5-6-7-8). T-9 and 9-5 make higher straights. Equity is exact against one study holding, T♠9♥J♣2♦: 3.4%. The cutoff's raise to $280 is a full pot raise.",
    },
    game: "$2/$5 PLO · $300 effective",
    heroPosition: "Button",
    hand: cards("Kc Kd 5h 4h"),
    board: cards("8s 7d 6c"),
    timeline: ["Hijack opens $17 · three callers", "Flop 8♠ 7♦ 6♣", "Hijack bets $70", "Cutoff raises to $280"],
    setupLine: "Four-way pot. Flop 8-7-6. A bet, then a pot raise, reach you.",
    pot: 420,
    streetPot: 70,
    behind: 283,
    facing: 280,
    prompt: "Fold, or call off your stack?",
    choices: ["Fold", "Call"],
    answer: "Fold",
    beats: [
      { factor: "HAND", text: "The low straight. Ten-nine and nine-five beat it." },
      { factor: "EQUITY", text: "Against ten-nine you win about 3%." },
    ],
    answerLine: "Fold.",
    principle: "Ask first: do I have the nut straight?",
    hookLines: {
      "common-mistake": "A straight is not always the best hand.",
      curiosity: "Can you fold a straight on the flop?",
    },
  },
  {
    id: "mx-006",
    status: "candidate",
    lesson: "draw-quality",
    provenance: {
      source:
        "Short Stack PLO, Chapter 7 (Start With Clean Outs: \"HOW MANY CARDS IMPROVE ME TO A WINNING HAND?\"; Dirty Outs) and Chapter 8 (Pot Odds Still Matter: \"Do not count dirty outs\").",
      author: "Drafted by Claude Code for owner review, 2026-10-15",
      reviewedBy: null,
      reviewedOn: null,
      notes:
        "Ten rivers give hero the nuts. The rest of the straight cards are diamonds (a possible flush) or make a beatable straight. Price: $123 to win a final $369 is 33%. Even if the remaining $119 were always won, 25% is needed, against 23%.",
    },
    game: "$2/$5 PLO · $300 effective",
    heroPosition: "Button",
    hand: cards("Kc Qs 9c 8s"),
    board: cards("Jd Td 4c 2s"),
    timeline: ["Cutoff opens $17 · you call", "Flop J♦ T♦ 4♣ · you call $41", "Turn 2♠ · cutoff bets $123"],
    setupLine: "You call the flop on a straight draw. The turn misses. They bet the pot.",
    pot: 246,
    streetPot: 123,
    behind: 242,
    facing: 123,
    prompt: "Fold or call?",
    choices: ["Fold", "Call"],
    answer: "Fold",
    beats: [
      { factor: "HAND", text: "Many straight cards. Only ten give the nuts." },
      { factor: "EQUITY", text: "About 23%. The price needs 33%." },
    ],
    answerLine: "Fold.",
    principle: "Count outs that win, not outs that improve.",
    hookLines: {
      "common-mistake": "Counting dirty outs makes bad calls look good.",
      curiosity: "How many of your outs really win?",
    },
  },
  {
    id: "mx-007",
    status: "candidate",
    lesson: "draw-quality",
    provenance: {
      source:
        "Short Stack PLO, Chapter 7 (Nut Outs vs. Non-Nut Outs: \"If a card completes the best possible straight or flush, you can often continue confidently\"), Chapter 8 (Pot Odds Still Matter) and Chapter 9 (Common River Calling Thresholds: a half-pot bet needs 25%).",
      author: "Drafted by Claude Code for owner review, 2026-10-15",
      reviewedBy: null,
      reviewedOn: null,
      notes:
        "Rainbow turn, so no river flush is possible. Fourteen rivers give hero the nuts. Price: $18 to win a final $72 is 25%. Raising may also be reasonable; the choice offered is fold or call.",
    },
    game: "$2/$5 PLO · $300 effective",
    heroPosition: "Cutoff",
    hand: cards("Jd Th 7c 6s"),
    board: cards("9s 8d 3c 2h"),
    timeline: ["You open $17 · big blind calls", "Flop 9♠ 8♦ 3♣ · checks through", "Turn 2♥ · big blind bets $18"],
    setupLine: "Heads-up. The flop checks through. On the turn they bet half the pot.",
    pot: 54,
    streetPot: 36,
    behind: 283,
    facing: 18,
    prompt: "Fold or call?",
    choices: ["Fold", "Call"],
    answer: "Call",
    beats: [
      { factor: "HAND", text: "A wrap. Fourteen rivers give you the nuts." },
      { factor: "EQUITY", text: "About 32%. Half pot needs 25%." },
    ],
    answerLine: "Call.",
    principle: "Nut outs are the ones you can continue on with confidence.",
    hookLines: {
      "common-mistake": "Count nut outs, not just outs.",
      curiosity: "What is a wrap really worth?",
    },
  },
  {
    id: "mx-008",
    status: "candidate",
    lesson: "price",
    provenance: {
      source:
        "Short Stack PLO, Chapter 9 (Pot Odds on the River; Common River Calling Thresholds: a one-third-pot bet needs about 20%) and Chapter 2 (The Loose-Aggressive Player).",
      author: "Drafted by Claude Code for owner review, 2026-10-15",
      reviewedBy: null,
      reviewedOn: null,
      notes:
        "Top pair is a bluff-catcher: straights, two pair and sets beat it. The call rests on the read that this player bets missed draws. Price: $41 to win a final $205 is 20%.",
    },
    game: "$2/$5 PLO · $300 effective",
    heroPosition: "Button",
    hand: cards("Kd Qs Jh 4d"),
    board: cards("Kc 9c 5d 3h 7s"),
    timeline: ["Cutoff opens $17 · you call", "Flop K♣ 9♣ 5♦ · you call $41", "Turn 3♥ · checks through", "River 7♠ · cutoff bets $41"],
    setupLine: "The clubs missed. They bet a third of the pot.",
    pot: 164,
    streetPot: 123,
    behind: 242,
    facing: 41,
    prompt: "Fold or call?",
    choices: ["Fold", "Call"],
    answer: "Call",
    beats: [
      { factor: "HAND", text: "Top pair is a bluff-catcher." },
      { factor: "PLAYER", text: "A loose-aggressive player bets missed draws." },
      { factor: "EQUITY", text: "Call $41 to win $205: you need 20%." },
    ],
    answerLine: "Call.",
    principle: "A third-pot bet needs one win in five.",
    hookLines: {
      "common-mistake": "Small river bets need very little to call.",
      curiosity: "How often must you win to call this?",
    },
  },
  {
    id: "mx-009",
    status: "candidate",
    lesson: "price",
    provenance: {
      source:
        "Short Stack PLO, Chapter 8 (Draws That Miss: \"Do not pay turn prices with flop equity\"; Implied Odds Shrink at 60 BB).",
      author: "Drafted by Claude Code for owner review, 2026-10-15",
      reviewedBy: null,
      reviewedOn: null,
      notes:
        "Nine spades make a flush, but 9♠ and 2♠ pair the board and 7♠ and 8♠ allow a straight flush, so five rivers give the nuts. Price: $108 to win a final $324 is 33%. Even if the remaining $139 were always won, 23% is needed, against 11%.",
    },
    game: "$2/$5 PLO · $300 effective",
    heroPosition: "Big blind",
    hand: cards("As 5s Kd 3c"),
    board: cards("Ts 6s 2d 9c"),
    timeline: ["Button opens $17 · you call", "Flop T♠ 6♠ 2♦ · you call $36", "Turn 9♣ · button bets $108"],
    setupLine: "Nut flush draw on the flop. The turn misses. They bet the pot.",
    pot: 216,
    streetPot: 108,
    behind: 247,
    facing: 108,
    prompt: "Fold or call?",
    choices: ["Fold", "Call"],
    answer: "Fold",
    beats: [
      { factor: "HAND", text: "One card left. Five rivers give the nuts." },
      { factor: "EQUITY", text: "Five of 44 is about 11%. You need 33%." },
    ],
    answerLine: "Fold.",
    principle: "Do not pay turn prices with flop equity.",
    hookLines: {
      "common-mistake": "A big flop draw is not a turn call.",
      curiosity: "What is your draw worth when the turn misses?",
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
