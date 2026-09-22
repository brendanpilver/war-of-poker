import { cards, type Card } from "@/lib/poker/cards";
import type { ConceptId } from "./concepts";

/**
 * The 10-Hand Short Stack PLO Challenge.
 *
 * **Sourcing rule.** Challenge strategy principles must be grounded in the
 * approved Short Stack PLO manuscript, but challenge hand examples must be
 * original applications of those principles and should not reproduce
 * paid-book or paid-Field-Kit worked examples. Nothing here introduces
 * strategy doctrine that contradicts or extends beyond the book.
 *
 * The paid product's worked hands -- the book's Chapter 12, its example
 * tables and review questions, and the Field Kit's 20-Hand Capstone Quiz --
 * are premium inventory. No hand below reuses their cards, boards, action
 * sequences or teaching reveal, and none of them should be introduced here.
 * The retired free 3-Hand Reality Check is not a source either: its three
 * questions were Capstone questions.
 *
 * Every hand was checked with an Omaha evaluator that builds each hand from
 * exactly two hole cards and exactly three board cards. Equities quoted
 * against a "study holding" are exact enumerations against that one fully
 * specified hand, the same convention the book uses; nobody knows those
 * cards at the table.
 *
 * `principle` is the one line the reader should leave with.
 */

export type ChoiceId = "A" | "B" | "C" | "D";

export type Choice = {
  id: ChoiceId;
  text: string;
  /** Four hole cards, when the question is choosing between holdings. */
  cards?: Card[];
};

/** One labelled fact in the hand's situation strip. */
export type SituationFact = {
  label: string;
  value: string;
  /** Spans the full row. Set on long values such as a player read. */
  wide?: boolean;
};

/** A row of the out-counting table on Hand 6. */
export type OutsRow = {
  improvement: string;
  cards: string;
  count: number;
};

export type ChallengeHand = {
  id: string;
  /** 1-based position, shown as "Hand 4 of 10". */
  number: number;
  concept: ConceptId;
  title: string;
  /** The narrative setup, one paragraph per entry. */
  setup: string[];
  /** Hero's four hole cards. Empty when the question is not about one holding. */
  hand: Card[];
  /** Community cards dealt so far, if any. */
  board: Card[];
  /** Indices at which a later street begins, so the turn and river read apart. */
  boardStreetBreaks?: number[];
  /** Label for the board row, e.g. "Board · flop + turn". */
  boardLabel?: string;
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
  /** The transferable line, shown as the system principle. */
  principle: string;
};

/** Conditions shared by the whole challenge, stated once above it. */
export const sharedAssumptions =
  "Unless a hand says otherwise: eight-handed $2/$5, no straddle, $300 effective stacks, exact-chip pot-limit counting, costs omitted.";

export const challengeIntro = {
  title: "The 10-Hand Short Stack PLO Challenge",
  standfirst: "Ten hands. Ten decisions.",
  byline: "River Potter · PLO Specialist, War of Poker",
  body: [
    "You know how to play poker. That's not the problem. The problem is that four hole cards change the inputs, and accurate Hold'em instincts start producing wrong answers.",
    "Ten original hands built on the Short Stack PLO system. Pick an answer, then read the working — it comes after every hand, and none of it is held back for an email address.",
  ],
};

export const hands: ChallengeHand[] = [
  {
    id: "you-hold-the-ten",
    number: 1,
    concept: "nlh-instinct",
    title: "You hold the ten",
    setup: [
      "The cutoff opens $17 and you call on the button with Q♥Q♣T♦3♠. The blinds fold.",
      "The flop 9♣7♠2♣ checks through. On the 8♦ turn the cutoff bets $30 and you call. The river is the 6♥, and the cutoff bets the pot.",
    ],
    hand: cards("Qh Qc Td 3s"),
    board: cards("9c 7s 2c 8d 6h"),
    boardStreetBreaks: [3, 4],
    boardLabel: "Board · final",
    facts: [
      { label: "Position", value: "Button vs cutoff" },
      { label: "Pot", value: "$101" },
      { label: "They bet", value: "$101" },
      { label: "Behind", value: "$253" },
    ],
    prompt: "The board reads 9-8-7-6 and you hold a ten. What do you do?",
    choices: [
      {
        id: "A",
        text: "Raise all-in. The ten gives you the top of the straight.",
      },
      {
        id: "B",
        text: "Call. You have a ten-high straight, and they could be betting a smaller one.",
      },
      {
        id: "C",
        text: "Fold. You don't have a straight. PLO plays exactly two hole cards, and your ten has no partner among 9-8-7-6 — your hand is a pair of queens.",
      },
      {
        id: "D",
        text: "Call. Queens are an overpair, and overpairs beat the two pair they bet here.",
      },
    ],
    correctChoiceId: "C",
    answerHeadline: "C — fold. You're holding one pair, not a straight.",
    explanation: [
      "In Hold'em the T♦ plus 9-8-7-6 on the board is a straight. In PLO a hand is always exactly two of your cards and exactly three from the board. Point to the two: the ten needs a second card from J, 9, 8, 7 or 6 alongside it, and you hold queens and a three. Your best hand is Q♥Q♣ with 9-8-7 — one pair.",
      "Now read the board for them rather than for you. Any ten with a 9, 8, 7 or 6 makes a ten-high straight, J-T makes a jack-high one, and 6-5, 7-5, 8-5, 9-5 and 5-4 make lower ones. A pot-sized river bet after a turn bet, on a board this connected, is where those hands live.",
      "The price is $101 into a final $303: 33.3%. A pair of queens would need a third of this range to be bluffs, and on four to a straight it isn't close.",
      "D is the second Hold'em habit in the same hand: an overpair is a strong made hand there. Here, even before counting straights, it is a bluff-catcher on a board that has handed out every straight in the deck.",
    ],
    principle: "Point to the two cards in your hand. If you can't, you don't have it.",
  },
  {
    id: "which-hand-wants-the-crowd",
    number: 2,
    concept: "preflop-structure",
    title: "Which hand wants the crowd?",
    setup: [
      "It's a loose table. Most flops tonight have been seen five-way, and nobody is raising enough to change that.",
      "Four holdings. Each looks playable. One of them gets better, not worse, as more players see the flop.",
    ],
    hand: [],
    board: [],
    facts: [
      { label: "Game", value: "$2/$5 · $300 effective" },
      { label: "Typical flop", value: "Five players" },
    ],
    prompt: "Which holding gains the most from a five-way pot?",
    choices: [
      {
        id: "A",
        text: "The nut suit, with four connected high cards.",
        cards: cards("Ah Qh Jc Tc"),
      },
      {
        id: "B",
        text: "A double-suited rundown.",
        cards: cards("8c 7c 6h 5h"),
      },
      {
        id: "C",
        text: "A big pair.",
        cards: cards("Qs Qd 6c 2s"),
      },
      {
        id: "D",
        text: "Ace-king.",
        cards: cards("As Kc 7d 3h"),
      },
    ],
    correctChoiceId: "A",
    answerHeadline: "A — A♥Q♥J♣T♣.",
    explanation: [
      "The more players see the flop, the more often somebody else has made a strong hand, so the question becomes what your hand makes when it connects — and whether that is the best version of it.",
      "A♥Q♥J♣T♣ makes the nut heart flush, the high straights and top two pair. All four cards work together, and when it hits it tends to hit the top of the range.",
      "8♣7♣6♥5♥ looks like the most flexible hand here, and it connects often. But it makes low straights that higher rundowns beat, and eight-high and six-high flushes that any bigger flush beats. With five players in, those second-best hands are what cost stacks.",
      "Q♠Q♦6♣2♠ needs a set, and the six and two contribute almost nothing when it misses. A♠K♣7♦3♥ is recognisable Hold'em strength, but rainbow: it can't make a flush at all, and the seven and three are danglers.",
    ],
    principle: "The more multiway the pot, the more you should care about drawing to the nuts.",
  },
  {
    id: "set-mining-a-short-stack",
    number: 3,
    concept: "effective-stack",
    title: "Set-mining a short stack",
    setup: [
      "You've won a couple of pots and have $520. The cutoff has $140 and opens to $17. You hold 5♠5♥A♦9♣ on the button, and both blinds have full stacks behind you.",
      "In Hold'em this is a textbook set-mine: call cheaply, and win a big pot the times you flop a set.",
    ],
    hand: cards("5s 5h Ad 9c"),
    board: [],
    facts: [
      { label: "Your stack", value: "$520" },
      { label: "Cutoff's stack", value: "$140" },
      { label: "Cost to call", value: "$17" },
      { label: "Flop SPR vs cutoff", value: "About 3" },
    ],
    prompt: "What does your $520 buy you here?",
    choices: [
      {
        id: "A",
        text: "Implied odds. You're deep, so call and let the set pay you off.",
      },
      {
        id: "B",
        text: "Nothing against this player. What you can win is capped by his $140, not your $520 — the effective stack. Even the best case barely breaks even, so fold.",
      },
      {
        id: "C",
        text: "The right to 3-bet. You cover him, so put the pressure on.",
      },
      {
        id: "D",
        text: "Protection. The blinds are deep too, so a set could win a huge multiway pot.",
      },
    ],
    correctChoiceId: "B",
    answerHeadline: "B — fold. His stack sets the price, not yours.",
    explanation: [
      "The effective stack is the amount the relevant players can match. Against the cutoff that is $140, however many chips you have. After your call there is $41 in the pot and he has $123 behind: an SPR of about 3.",
      "Now run the best case. You flop at least a set about 12.2% of the time. If you win every one of those pots and he pays off all $123, you net $147; the other 87.8% of the time you lose $17. That is about +$3 a call — before you discount the sets that lose to higher sets or straights, the times he doesn't pay, and a squeeze from the deep blinds behind you. Every one of those turns it negative.",
      "The pair is also most of what this hand has. The ace has no suit to go with it, and the nine connects with nothing.",
      "Speculative hands live on implied odds, and implied odds come from the other player's stack. Your deep stack only matters when the money that pays you off is deep too.",
    ],
    principle: "Short stacks take implied odds away. The shorter stack decides.",
  },
  {
    id: "a-medium-hand-at-low-spr",
    number: 4,
    concept: "spr",
    title: "A medium hand at low SPR",
    setup: [
      "You open the button to $17 with K♥Q♠9♣8♥. The small blind folds, and the big blind — a loose-aggressive player who 3-bets wide and leads flops often — 3-bets the pot to $53. You call.",
      "The flop is K♦9♠4♣. There's $108 in the pot and $247 behind, and the big blind leads $108.",
    ],
    hand: cards("Kh Qs 9c 8h"),
    board: cards("Kd 9s 4c"),
    facts: [
      { label: "Position", value: "Button vs big blind" },
      { label: "Pot", value: "$108" },
      { label: "Behind", value: "$247" },
      { label: "They lead", value: "$108" },
      { label: "Read", value: "Loose-aggressive: 3-bets wide, leads flops often", wide: true },
    ],
    prompt: "Top two pair and nothing else. What do you do?",
    choices: [
      {
        id: "A",
        text: "Fold. Bare two pair is a medium hand in PLO, and a pot-sized lead means strength.",
      },
      {
        id: "B",
        text: "Call, and fold the turn if a bad card comes. Keep the pot manageable.",
      },
      {
        id: "C",
        text: "Raise all-in. At this SPR a bet and a raise commit the stack anyway, and against this player's wide range top two is ahead of far more than it trails.",
      },
      {
        id: "D",
        text: "Raise all-in. SPR is under 3, so you're committed with any pair.",
      },
    ],
    correctChoiceId: "C",
    answerHeadline: "C — get it in. Low SPR is where a medium hand gets to play for stacks.",
    explanation: [
      "A is half right. Bare two pair is a medium hand, and in a deep multiway pot it plays small. But the book is precise about medium hands: SPR and the number of opponents decide everything. This one is heads-up at an SPR of 2.3, against a player whose leads are wide.",
      "On a dry rainbow board, only three sets beat you now. Against the rest of a wide 3-betting range you are well ahead. Against these study holdings: A♥A♣Q♦J♥ 59.9%, K♣Q♦J♠T♥ 65.1%, J♣T♣8♠7♦ 74.1%. Against the sets you are in trouble — 12.0% against 9♥9♦7♣6♥, 21.0% against 4♥4♦A♣7♥ — and those are the price of playing this spot.",
      "The raise is to $247 total. If they always call, your $247 goes into a final $602 pot and needs 41.0% equity, before counting the folds a raise also wins.",
      "B is the plan that actually loses money. After a call there's $324 in the pot and $139 behind, so a turn shove asks for only 23.1%, and you will almost never have less than that. Planning to fold there throws away your equity. D reaches the right action for a reason that would get the next hand wrong: SPR describes the remaining bet, not your cards.",
    ],
    principle: "SPR decides how much a medium hand can play for. It doesn't make every hand a commitment.",
  },
  {
    id: "you-flopped-a-flush",
    number: 5,
    concept: "nuttiness",
    title: "You flopped a flush, five ways",
    setup: [
      "Three players limp, the small blind completes, and you check your option in the big blind with 6♦4♦K♠2♣ — a hand you would never have raised.",
      "Five of you see T♦8♦3♦. There's $25 in the pot and $295 behind: an SPR of 11.8. The small blind checks to you.",
    ],
    hand: cards("6d 4d Ks 2c"),
    board: cards("Td 8d 3d"),
    facts: [
      { label: "Players", value: "Five" },
      { label: "Pot", value: "$25" },
      { label: "Behind", value: "$295" },
      { label: "SPR", value: "11.8" },
    ],
    prompt: "You have a ten-high flush. What is it worth in this pot?",
    choices: [
      {
        id: "A",
        text: "It's a monster. Bet the pot now, before a fourth diamond can beat you.",
      },
      {
        id: "B",
        text: "It's the nuts until the board changes, so build the biggest pot you can.",
      },
      {
        id: "C",
        text: "It's a medium-strength hand. Any opponent holding two diamonds with one above your six already beats it, and with four opponents that's close to a coin flip. Keep the pot small and don't stack off to heavy action.",
      },
      {
        id: "D",
        text: "Nothing. Small flushes are never good multiway, so give it up to any bet.",
      },
    ],
    correctChoiceId: "C",
    answerHeadline: "C — a medium hand. Play it that way.",
    explanation: [
      "A flush needs two of your cards and three from the board, so a higher flush needs two diamonds in the same hand, one of them above your six: the A♦, K♦, Q♦, J♦, 9♦ or 7♦ with any other diamond. Each opponent holds four cards. Against four random hands, somebody already has one close to half the time — and limpers' ranges are full of suited cards.",
      "Nothing rescues you, either. You can't make a full house, and no turn card lifts your flush past a hand that already beats it. Meanwhile the hands that aren't beating you yet — sets and two pair — have full-house redraws.",
      "B is the error that costs a stack. \"It's the nuts until the board changes\" is only true if nobody has two diamonds, and in a five-way pot you can't assume that. A and B also share the Hold'em instinct that a flopped flush must be protected. Here, the hands that call a big bet are mostly the ones beating you.",
      "D is a slogan in the other direction. At SPR 11.8 there's room to take a cheap card, pick off a bluff, or value bet a smaller flush. You just don't build a pot you can't release.",
    ],
    principle: "Multiway, a non-nut hand is a medium hand, whatever it's called.",
  },
  {
    id: "thirteen-straight-cards",
    number: 6,
    concept: "draw-quality",
    title: "Thirteen straight cards",
    setup: [
      "You open the button to $17 with Q♠J♦9♣8♣ and the big blind calls. There's $36 in the pot and $283 behind.",
      "The flop is T♥7♥2♣ and the big blind checks. Before you bet, count what you're drawing to.",
    ],
    hand: cards("Qs Jd 9c 8c"),
    board: cards("Th 7h 2c"),
    facts: [
      { label: "Position", value: "Button vs big blind" },
      { label: "Pot", value: "$36" },
      { label: "Behind", value: "$283" },
    ],
    prompt: "How many of your cards are clean outs?",
    choices: [
      {
        id: "A",
        text: "Thirteen. Every straight you can make here is the best straight.",
      },
      {
        id: "B",
        text: "Nine. Thirteen cards make the best straight, but four of them are hearts that also put three hearts on the board.",
      },
      { id: "C", text: "Sixteen: thirteen straight cards plus the three queens for top pair." },
      { id: "D", text: "Eight, the same as an open-ended straight draw." },
    ],
    correctChoiceId: "B",
    answerHeadline: "B — nine clean, four more that make a flush for someone else.",
    explanation: [
      "Find the straights first. With two of your cards and three from the board, any 6, 8, 9 or J completes one: 9-8 with T-7-6, J-9 with T-8-7, J-8 with T-9-7, and 9-8 with J-T-7. That's thirteen cards, and on every one of those boards your straight is the highest straight possible.",
      "Then grade them. The board already has two hearts. The 6♥, 8♥, 9♥ and J♥ make your straight and put a third heart out, so any opponent holding two hearts now has a flush — and on each of them the right two hearts make a straight flush. Those four are dirty. The other nine are clean on the turn, though an unmade flush draw still has the river against you.",
    ],
    outsTable: {
      rows: [
        {
          improvement: "Best straight, no third heart",
          cards: "6♠ 6♦ 6♣ · 8♠ 8♦ · 9♠ 9♦ · J♠ J♣",
          count: 9,
        },
        {
          improvement: "Best straight, but three hearts on board",
          cards: "6♥ 8♥ 9♥ J♥",
          count: 4,
        },
      ],
      totalLabel: "Total straight cards",
      total: 13,
    },
    principle: "Grade every out. A card that makes your hand and someone else's better hand is not clean.",
  },
  {
    id: "price-the-check-raise",
    number: 7,
    concept: "price",
    title: "Price the check-raise",
    setup: [
      "The cutoff opens $17 and you call on the button with A♣K♣J♥T♦. Heads-up, you bet $30 on 9♣8♦5♣ and the cutoff calls.",
      "The turn is the 2♥. The cutoff checks, you bet $80 into $101 with the nut flush draw and an open-ended straight draw, and the cutoff check-raises all-in to $253.",
    ],
    hand: cards("Ac Kc Jh Td"),
    board: cards("9c 8d 5c 2h"),
    boardStreetBreaks: [3],
    boardLabel: "Board · flop + turn",
    facts: [
      { label: "Pot before your bet", value: "$101" },
      { label: "You bet", value: "$80" },
      { label: "They raise to", value: "$253" },
      { label: "Their range", value: "Weighted to made straights, with some sets", wide: true },
    ],
    prompt: "What does the call actually cost, and do you make it?",
    choices: [
      {
        id: "A",
        text: "Fold. You owe $253 into a $607 pot — 41.7% — and fourteen outs is only 35%.",
      },
      {
        id: "B",
        text: "Fold. The semi-bluff failed the moment they raised.",
      },
      {
        id: "C",
        text: "Call. Your $80 is already in the pot, so you owe $173 into a final $607: 28.5%. Against a made straight, fourteen of the forty unseen rivers win — 35%.",
      },
      {
        id: "D",
        text: "Call. Fourteen outs times four is 56%, so you're the favourite.",
      },
    ],
    correctChoiceId: "C",
    answerHeadline: "C — call. Price the extra amount, not the whole raise.",
    explanation: [
      "Facing a raise, the cost is only what you still owe. Your $80 already belongs to the pot. The raise is to $253, so you owe $173, and the final pot will be $101 + $253 + $253 = $607. $173 ÷ $607 is 28.5%.",
      "Now the equity. Against a made nine-high straight — the study holding 7♠6♥4♦3♠ — your winners are the nine remaining clubs for the ace-high flush, plus the Q♠ Q♥ Q♦ and the 7♥ 7♦ for a higher straight: fourteen of forty rivers, 35.0%. Against the sets in this line you still clear the price: 32.5% against 9♥9♦6♠3♦, 30.0% against 8♥8♠6♦4♣. So does a straight that holds clubs of its own and takes some of your flush cards away: 30.0% against 7♣6♣4♦3♠.",
      "A does the right arithmetic on the wrong number. Pricing the whole $253 turns a clear call into a fold.",
      "D reaches the right action by the wrong method. The rule of four prices two cards to come, and this is the turn: there is one card left. It is also all-in, so there are no implied odds and no further decisions — the price you just calculated is the whole bet.",
    ],
    principle: "Facing a raise, price only what you still owe.",
  },
  {
    id: "the-flush-card-arrives",
    number: 8,
    concept: "turn-discipline",
    title: "The flush card arrives",
    setup: [
      "You open the button to $17 with Q♦J♣9♠6♣ and the big blind calls. The big blind is tight and passive, and hasn't bet into the preflop raiser all night.",
      "On T♥8♥7♠ you flop the nut straight. The big blind checks, you bet $36, and they call. The turn is the 2♥, and for the first time tonight the big blind leads — $108, the pot.",
    ],
    hand: cards("Qd Jc 9s 6c"),
    board: cards("Th 8h 7s 2h"),
    boardStreetBreaks: [3],
    boardLabel: "Board · flop + turn",
    facts: [
      { label: "Pot", value: "$108" },
      { label: "They lead", value: "$108" },
      { label: "Behind", value: "$247" },
      {
        label: "Read",
        value: "Tight-passive; hasn't bet into the raiser all night",
        wide: true,
      },
    ],
    prompt: "You flopped the nuts. What do you do now?",
    choices: [
      {
        id: "A",
        text: "Raise all-in. You flopped the nut straight, and nothing has happened to your hand.",
      },
      {
        id: "B",
        text: "Call. You had the nuts a street ago, and at this SPR you're committed.",
      },
      {
        id: "C",
        text: "Fold. The 2♥ is the third heart. Any two hearts now beat you, and your straight can't improve past a flush. This player's first lead of the night, on this card, is weighted to exactly that.",
      },
      {
        id: "D",
        text: "Call. Your straight still has outs if they have a flush.",
      },
    ],
    correctChoiceId: "C",
    answerHeadline: "C — fold. The flop's nuts isn't this turn's nuts.",
    explanation: [
      "Start the hand again from the turn. The 2♥ puts three hearts on the board, and a player holding two hearts has a flush. Your J♣9♠ straight is still the best straight, but straights no longer top the board.",
      "Against a flush you are drawing dead. You have no heart, and no river turns a straight into anything that beats a flush. Against the study holding A♥5♥K♣4♦ your equity is 0%. Against a set, 7♣7♦A♣Q♠, you are 75%. Against the same J-9, you split.",
      "So the answer turns on the player, which is what the fourth question is for. The price is $108 into a final $324: 33.3%. A tight-passive player who has not bet into the raiser all night, and who check-called the flop, leads the pot on the one card that completes the flush draw. That range is flushes first. There aren't enough sets and chops in it to make up a third.",
      "A and B both play the flop's hand on the turn's board. D is simply not true: with no heart and no pair, nothing on the river rescues a straight against a flush.",
    ],
    principle: "When the board changes, start over. The nuts is a fact about this street, not the last one.",
  },
  {
    id: "the-small-river-bet",
    number: 9,
    concept: "river-discipline",
    title: "The small river bet",
    setup: [
      "The button opens $17 and you call in the big blind with K♦8♥5♥3♠. The button is loose-aggressive and bets most rivers after betting the turn.",
      "On Q♣8♣5♦ you check-call $24 with two pair. On the 2♥ turn you check-call $60. The river is the J♠, you check, and the button bets $68 into $204.",
    ],
    hand: cards("Kd 8h 5h 3s"),
    board: cards("Qc 8c 5d 2h Js"),
    boardStreetBreaks: [3, 4],
    boardLabel: "Board · final",
    facts: [
      { label: "Pot", value: "$204" },
      { label: "They bet", value: "$68" },
      { label: "Behind", value: "$199" },
      {
        label: "Read",
        value: "Loose-aggressive; bets most rivers after betting the turn",
        wide: true,
      },
    ],
    prompt: "Bottom two pair against a third-pot bet. What do you do?",
    choices: [
      {
        id: "A",
        text: "Fold. There's a straight on board, and any river bet into two pair is value.",
      },
      {
        id: "B",
        text: "Raise all-in. The bet is small, which means weakness.",
      },
      {
        id: "C",
        text: "Call. You only need to be good one time in five, and this line is full of hands that missed.",
      },
      {
        id: "D",
        text: "Call. Two pair is a strong hand.",
      },
    ],
    correctChoiceId: "C",
    answerHeadline: "C — call. A small bet sets a low bar.",
    explanation: [
      "Price it first. $68 into $204 makes a final pot of $340, so the call needs 20.0%. You don't need this player to be bluffing often — only one time in five.",
      "Then name what's in the range, starting with the hands that beat you: T-9 made a straight on the J♠, and sets, jacks-up and queens-up are all ahead of 8♥5♥. Then the hands that missed: every club draw, and the 7-6 and 9-7-6 straight draws, bricked when the turn and river brought the 2♥ and J♠. A player who bets most rivers after betting the turn arrives here with plenty of those, and some worse two pair and top pairs betting thin.",
      "B raises into the part of the range you can't beat. The worse hands and missed draws fold to a raise; the straights and sets call it. A small bet isn't a sign of weakness, it's a price. D takes the right action for a reason that would get the next hand wrong: bottom two pair on this board is a bluff-catcher, and bluff-catchers are called by price and by range, not by name.",
    ],
    principle: "Price the call, then name the bluffs. A small bet needs very few.",
  },
  {
    id: "blind-versus-blind",
    number: 10,
    concept: "whole-hand",
    title: "Blind versus blind, four questions",
    setup: [
      "It folds to the small blind, a loose-passive player who calls too much and rarely raises. They complete. You raise to $15 in the big blind with K♥Q♥J♣9♣ and they call. There's $30 in the pot and $285 behind.",
      "On Q♠T♣4♥ they check, you bet $30, and they call. The turn is the 2♦ and they check again. There's $90 in the pot and $255 behind.",
    ],
    hand: cards("Kh Qh Jc 9c"),
    board: cards("Qs Tc 4h 2d"),
    boardStreetBreaks: [3],
    boardLabel: "Board · flop + turn",
    facts: [
      { label: "Position", value: "Big blind vs small blind" },
      { label: "Pot", value: "$90" },
      { label: "Behind", value: "$255" },
      { label: "Turn SPR", value: "About 2.8" },
      {
        label: "Read",
        value: "Loose-passive: calls too much, rarely raises",
        wide: true,
      },
    ],
    prompt: "They've checked the turn. What do you do?",
    choices: [
      {
        id: "A",
        text: "Check back. They never fold, so there's no point in betting.",
      },
      {
        id: "B",
        text: "Bet $90. Worse queens, tens and draws call, your wrap improves on the river anyway, and the bet sets up the rest of the stack.",
      },
      {
        id: "C",
        text: "Check. Top pair is one pair, and pot control protects it.",
      },
      {
        id: "D",
        text: "Bet $20, small enough that they'll keep calling.",
      },
    ],
    correctChoiceId: "B",
    answerHeadline: "B — bet the pot. This time the calling station is the reason to bet.",
    explanation: [
      "Run the four questions in order. Hand: top pair with the king, plus a wrap. With exactly two of your cards and three from the board, any ace, king, jack, nine or eight makes you a straight — seventeen cards. The ace, nine and eight make the best straight. The king and jack make a straight an ace-high one can still beat, so count them, but not as clean.",
      "SPR: about 2.8 on the turn. A pot-sized bet that is called leaves $165 behind in a $270 pot — about 0.6 — so one more bet covers the rest on the river, whichever card comes.",
      "Equity: this player's calling range is weaker queens, tens, pairs with draws, and draws. Against the study holdings Q♦8♠7♠3♣, T♦9♥6♠5♣ and A♦3♦T♥6♣ you are 85%, 70% and 70%. Against queens-and-tens, Q♣T♦5♠5♦, you are still 42.5%.",
      "Player: this is the one that decides the size. A loose-passive player calls with worse and seldom raises, so the bet is value, not a bluff. If they do raise, the rare raise from this player is strong and you can reassess. A misreads the player — not folding is a reason to bet good hands, not to stop betting. C plays top pair as if it were alone, ignoring the wrap. D charges a player who calls anything a fraction of what they'll pay.",
    ],
    principle: "Hand, SPR, equity, player — on every street, in that order.",
  },
];

export const totalHands = hands.length;

/** The four questions the book reduces every street to. */
export const fourQuestions = ["Hand", "SPR", "Equity", "Player"] as const;

export const survivalCard = {
  name: "The NLH Player's PLO Survival Card",
  summary:
    "8 expensive Hold'em habits to drop before you sit in a PLO game. Two pages: the eight translation errors, the four street questions, and the $2/$5 60 BB numbers worth remembering.",
};
