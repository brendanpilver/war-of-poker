/**
 * The 3-Hand PLO Reality Check.
 *
 * Transcribed from the approved release source, `FREE_3_HAND_PLO_QUIZ_RELEASE.md`
 * (Short Stack PLO publication set, River Potter / War of Poker). The hands,
 * the answer options, the correct answers, the explanations, and the closing
 * lessons are that document's content. Do not rewrite the strategy here: if a
 * hand needs to change, it changes in the source material first.
 */

export type Suit = "s" | "h" | "d" | "c";

export type Card = {
  rank: "A" | "K" | "Q" | "J" | "T" | "9" | "8" | "7" | "6" | "5" | "4" | "3" | "2";
  suit: Suit;
};

export type ChoiceId = "A" | "B" | "C" | "D";

export type Choice = {
  id: ChoiceId;
  text: string;
};

/** One labelled fact in the hand's situation strip (pot, stack behind, read). */
export type SituationFact = {
  label: string;
  value: string;
  /** Spans the full row. Set on long values such as a player read. */
  wide?: boolean;
};

/** A row of the Question 2 out-counting table. */
export type OutsRow = {
  improvement: string;
  cards: string;
  count: number;
};

export type QuizQuestion = {
  id: string;
  /** 1-based position, shown as "Hand 1 of 3". */
  number: number;
  title: string;
  /** The narrative setup, one paragraph per entry. */
  setup: string[];
  /** Hero's four hole cards. */
  hand: Card[];
  /** Community cards dealt so far, if any. */
  board: Card[];
  /** Board cards that arrived after the street the setup describes. */
  boardTurnIndex?: number;
  facts: SituationFact[];
  /** The decision the reader is being asked to make. */
  prompt: string;
  choices: Choice[];
  correctChoiceId: ChoiceId;
  /** Headline restating the correct answer. */
  answerHeadline: string;
  /** The reasoning, one paragraph per entry. */
  explanation: string[];
  outsTable?: { rows: OutsRow[]; totalLabel: string; total: number };
  /** The closing italic line: the transferable lesson. */
  lesson: string;
};

/** Conditions shared by all three hands, stated once above the quiz. */
export const sharedAssumptions =
  "Eight-handed $2/$5, no straddle, $300 effective stacks, exact-chip pot-limit counting, costs omitted.";

export const quizIntro = {
  title: "The 3-Hand PLO Reality Check",
  standfirst: "Three spots where Hold'em instincts get expensive",
  byline: "River Potter · PLO Specialist, War of Poker",
  body: [
    "You know how to play poker. That's not the problem. The problem is that four hole cards change the inputs, and accurate Hold'em instincts start producing wrong answers.",
    "Three hands. Pick an answer and a one-line reason before you look.",
  ],
};

function cards(notation: string): Card[] {
  // "Ah Ac Ks 3d" -> four Card objects. Keeps the data below readable.
  return notation.split(" ").map((token) => ({
    rank: token[0] as Card["rank"],
    suit: token[1] as Suit,
  }));
}

export const questions: QuizQuestion[] = [
  {
    id: "aces-on-a-rundown-board",
    number: 1,
    title: "Your aces meet a rundown board",
    setup: [
      "The cutoff has shown down rundowns and suited connectors after calling 3-bets.",
      "The cutoff opens $17, you 3-bet the button to $58, the blinds fold, and the cutoff calls. On the flop, the cutoff checks.",
    ],
    hand: cards("Ah Ac Ks 3d"),
    board: cards("9h 8h 6c"),
    facts: [
      { label: "Game", value: "$2/$5 PLO, 8-handed" },
      { label: "Position", value: "Button vs cutoff" },
      { label: "Pot", value: "$123" },
      { label: "Behind", value: "$242" },
      {
        label: "Read",
        value: "Rundowns and suited connectors after calling 3-bets",
        wide: true,
      },
    ],
    prompt: "What do you do, and why?",
    choices: [
      {
        id: "A",
        text: "Bet $123. You're the preflop raiser, and an SPR under 3 means you're committed.",
      },
      {
        id: "B",
        text: "Check back. The board hits the caller's range, and a bet mostly folds hands with little equity while getting raised by hands that crush bare aces.",
      },
      {
        id: "C",
        text: "Bet $123 and call a check-raise all-in, since you've already put in $58.",
      },
      { id: "D", text: "Bet $60 to find out where you stand." },
    ],
    correctChoiceId: "B",
    answerHeadline: "B — check back.",
    explanation: [
      "Bare aces with no heart and no useful straight coverage. The current nuts is T7, and 75 also makes a straight. This caller's range is full of exactly the rundowns and suited connectors that just connected with 9-8-6.",
      "Your preflop range advantage is not a flop advantage on this board. A bet folds the hands with little equity and gets action from the straights, sets and big wraps that have you crushed.",
      "SPR 1.97 describes the leverage available. It does not describe your cards, and it is not an instruction to commit. On A♦7♠2♣ the same aces bet comfortably.",
    ],
    lesson: "Checking is not surrender. If you can't name what a bet earns, don't bet.",
  },
  {
    id: "counting-a-big-draw",
    number: 2,
    title: "Counting a big draw",
    setup: [
      "A heads-up 3-bet pot. The opponent bets $60 into $123 on the flop.",
    ],
    hand: cards("Ks Qs Jd 9d"),
    board: cards("Ts 8s 3h"),
    facts: [
      { label: "Game", value: "$2/$5 PLO, 8-handed" },
      { label: "Pot", value: "$123" },
      { label: "Behind", value: "$242" },
      { label: "Opponent bets", value: "$60" },
    ],
    prompt: "Before you decide, which description of your draw is accurate?",
    choices: [
      { id: "A", text: "22 outs: 13 straight cards plus 9 spades." },
      {
        id: "B",
        text: "19 unique improving cards. The 10 non-spade straight cards and the A♠ make the current nuts; the other 8 spades give you a flush that can already be beaten.",
      },
      { id: "C", text: "9 outs. Only flush cards count on a two-tone board." },
      { id: "D", text: "13 clean outs. Straights always beat flushes." },
    ],
    correctChoiceId: "B",
    answerHeadline: "B — 19 unique cards, 11 of which make the current nuts.",
    explanation: [
      '"13 straight cards + 9 spades = 22" counts 7♠, 9♠ and J♠ twice. They are one physical card each. Overlapping improvement labels never create extra outs.',
      "The real count:",
    ],
    outsTable: {
      rows: [
        { improvement: "Straight, non-spade", cards: "7♥ 7♦ 7♣ · 9♥ 9♣ · J♥ J♣ · Q♥ Q♦ Q♣", count: 10 },
        { improvement: "Spade flush, ace on board", cards: "A♠", count: 1 },
        { improvement: "Spade flush, beatable", cards: "2♠ 4♠ 5♠ 6♠ 7♠ 9♠ J♠", count: 7 },
        { improvement: "Spade flush that pairs the board", cards: "3♠", count: 1 },
      ],
      totalLabel: "Total unique",
      total: 19,
    },
    lesson: "Count unique outs. Then grade their quality. Both steps, every time.",
  },
  {
    id: "the-turn-pairs-the-board",
    number: 3,
    title: "The turn pairs the board",
    setup: [
      "You 3-bet the button to $58 against a wide cutoff opener, who calls.",
      "On the flop the cutoff leads $100 and you call, leaving $323 in the pot and $142 behind. The turn pairs the board, and the cutoff shoves $142.",
    ],
    hand: cards("Jd Td 7c 6s"),
    board: cards("9s 8h 2d 8c"),
    boardTurnIndex: 3,
    facts: [
      { label: "Game", value: "$2/$5 PLO, 8-handed" },
      { label: "Position", value: "Button vs cutoff" },
      { label: "Pot", value: "$323" },
      { label: "Behind", value: "$142" },
      {
        label: "Read",
        value:
          "Leads flops with sets and two pair more often than draws; has 4-bet overpairs preflop (MEDIUM confidence)",
        wide: true,
      },
    ],
    prompt: "What do you do, and why?",
    choices: [
      {
        id: "A",
        text: "Call. You had about 55% against a set on the flop and you still hold 20 straight cards.",
      },
      { id: "B", text: "Call. You need only 23.4%, and 20 cards out of 44 is about 45%." },
      {
        id: "C",
        text: "Fold. The paired board turns the flop's sets into full houses or quads, and 98 is now a full house. None of your straight cards beat those hands. The price is fine; your equity against this range isn't.",
      },
      { id: "D", text: "Fold. Never call off with a draw on the turn." },
    ],
    correctChoiceId: "C",
    answerHeadline: "C — fold, because the equity died, not because the price is bad.",
    explanation: [
      "The price is genuinely fine. You owe $142 into a final $607, so you need 23.4%.",
      "What changed is the board. The 8♣ pairs it. Flopped 99xx and 22xx are now full houses, 88xx is quads, and 98xx is now a full house. Against those hands, none of your twenty straight completions win. Not some. None.",
      "Option A is the classic error: paying a turn price with flop equity. Your flop number was computed against a board that no longer exists. Option B counts completions rather than winners against this range.",
      "Option D is the opposite mistake — a slogan. A draw can be a perfectly profitable turn call at the right price against the right range. This isn't one.",
    ],
    lesson:
      "When the turn changes the board, start over. What changed? Which river cards actually win against the range that's betting? Does the present price justify the next investment?",
  },
];

export const totalQuestions = questions.length;

/** The four questions the book reduces every street to. */
export const fourQuestions = ["Hand", "SPR", "Equity", "Player"] as const;

export const survivalCard = {
  name: "The NLH Player's PLO Survival Card",
  summary:
    "8 expensive Hold'em habits to drop before you sit in a PLO game. Two pages: the eight translation errors, the four street questions, and the $2/$5 60 BB numbers worth remembering.",
};
