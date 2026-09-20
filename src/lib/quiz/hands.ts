import { cards, type Card } from "@/lib/poker/cards";
import type { ConceptId } from "./concepts";

/**
 * The 10-Hand Short Stack PLO Challenge.
 *
 * Every hand below is drawn from the approved Short Stack PLO publication set
 * (River Potter / War of Poker). No new strategy is written here. Provenance,
 * hand by hand:
 *
 *   1  FREE_3_HAND_PLO_QUIZ_RELEASE.md, Question 1 (verbatim)
 *   2  Field Kit 02, Part 1 "Six checks" + Part 2 "Opening by seat" / Ch. 3-4
 *   3  Ch. 12, "The Permanent Straddle Changes the Strategy" / Ch. 11
 *   4  Ch. 12, "Premium Structure Against Loose Callers" / Ch. 5
 *   5  Ch. 12, "The Dominated Flush Draw" / Field Kit 03, Side B-C
 *   6  FREE_3_HAND_PLO_QUIZ_RELEASE.md, Question 2 (verbatim)
 *   7  Published edition p. 57, worked Hand 7 / Ch. 5, Ch. 8
 *   8  FREE_3_HAND_PLO_QUIZ_RELEASE.md, Question 3 (verbatim)
 *   9  Published edition p. 59, worked Hand 9 / Ch. 9 / Field Kit 04
 *  10  Ch. 12, "A Full System Hand"
 *
 * Hands 1, 6 and 8 are the three already published free; their wording,
 * options, answers and figures are the release document's and are not edited
 * here. The rest are staged from the book's own worked hands: the cards,
 * boards, figures and reasoning are the source's, and only the framing around
 * them -- the question asked, the wrong options, the order -- is written for
 * this format. If a hand needs to change strategically, it changes in the
 * source material first.
 *
 * `principle` is the one line the reader should leave with. Each is the
 * source's own, quoted or condensed, never invented.
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
    "Ten hands from the Short Stack PLO system. Pick an answer, then read the working — it comes after every hand, and none of it is held back for an email address.",
  ],
};

export const hands: ChallengeHand[] = [
  {
    id: "aces-on-a-rundown-board",
    number: 1,
    concept: "nlh-instinct",
    title: "Your aces meet a rundown board",
    setup: [
      "The cutoff has shown down rundowns and suited connectors after calling 3-bets.",
      "The cutoff opens $17, you 3-bet the button to $58, the blinds fold, and the cutoff calls. On the flop, the cutoff checks.",
    ],
    hand: cards("Ah Ac Ks 3d"),
    board: cards("9h 8h 6c"),
    facts: [
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
    principle: "Checking is not surrender. If you can't name what a bet earns, don't bet.",
  },
  {
    id: "which-hand-opens",
    number: 2,
    concept: "preflop-structure",
    title: "Which hand opens?",
    setup: [
      "Nothing has happened yet. You're under the gun in an eight-handed game, $300 effective, and a pot-sized open is $17.",
      "Four holdings. One of them is the clearest open of the four.",
    ],
    hand: [],
    board: [],
    facts: [
      { label: "Position", value: "Under the gun" },
      { label: "Effective", value: "$300 · 60 BB" },
      { label: "Action", value: "Folded to you" },
    ],
    prompt: "Which holding is the clearest open to $17?",
    choices: [
      {
        id: "A",
        text: "Two premium Hold'em cards, rainbow.",
        cards: cards("As Kd 8h 3c"),
      },
      {
        id: "B",
        text: "Four connected high cards, two suits.",
        cards: cards("Ks Qs Jh Th"),
      },
      { id: "C", text: "Double-suited.", cards: cards("Js 7s 4h 2h") },
      { id: "D", text: "A big pair.", cards: cards("Ks Kh 7c 2d") },
    ],
    correctChoiceId: "B",
    answerHeadline: "B — K♠Q♠J♥T♥.",
    explanation: [
      "This is the book's own early-position opening example. Four connected high cards, two suits, no dangler, and every card contributing: it makes high straights, strong two pair and strong combo draws, and it still has ways to continue if somebody raises behind you.",
      "A♠K♦8♥3♣ is the most common crossover error, and it's the one the book names. AK is recognisable Hold'em strength, but the eight and the three contribute nothing, there is no suit, and early position is where you leave out hands with a major dangler. It isn't AK with two extra cards; it's four cards that happen to contain AK.",
      "J♠7♠4♥2♥ is the reminder that double-suited does not repair bad construction. Both flushes are low, the straights are scattered, and two weak draws are not one strong hand.",
      "K♠K♥7♣2♦ is a different hand from K♠K♥Q♠J♥. Ask the pair-support question: when the pair misses its set — which is most of the time — what else does the hand do? Here, almost nothing.",
    ],
    principle: "Double-suited does not repair bad construction.",
  },
  {
    id: "the-permanent-straddle",
    number: 3,
    concept: "effective-stack",
    title: "The straddle is on every orbit",
    setup: [
      "The game is advertised as $2/$5 and you buy in for $300 — your usual 60 big blinds.",
      "The table runs a near-permanent $10 straddle. It's on almost every hand, and nobody is turning it off.",
    ],
    hand: [],
    board: [],
    facts: [
      { label: "Advertised", value: "$2/$5" },
      { label: "Live blind", value: "$10 straddle" },
      { label: "Your stack", value: "$300" },
      { label: "Depth", value: "60 posted BB · 30 straddles", wide: true },
    ],
    prompt: "What has actually changed?",
    choices: [
      {
        id: "A",
        text: "Nothing meaningful. You bought in for 60 big blinds and you're playing 60 big blinds.",
      },
      {
        id: "B",
        text: "You're effectively deeper, because every pot is bigger.",
      },
      {
        id: "C",
        text: "Against the live $10 blind you're about 30 blinds deep. Preflop pots grow faster, a raise and a call can create a very low SPR, 3-bet pots can be near-committed before the flop, and speculative calls lose value. Re-label the stack and choose: play the 30-blind structure deliberately, buy deeper if the room allows, or find another game.",
      },
      {
        id: "D",
        text: "Play tighter and wait for the straddle to stop.",
      },
    ],
    correctChoiceId: "C",
    answerHeadline: "C — re-label the stack, then choose deliberately.",
    explanation: [
      "$300 is 60 posted big blinds and 30 straddles at the same time. Both labels are accurate. The one that matters is the one the betting actually uses, and every raise at this table is sized off the $10.",
      "That is not a small adjustment. The same open, 3-bet and call that leaves a workable SPR in an unstraddled game leaves far less behind here, and the hands that need room to manoeuvre — speculative rundowns, drawing hands you planned to fold cheaply — lose most of their value first.",
      "None of the three real options is wrong. Playing a 30-blind structure on purpose is a legitimate choice, so is buying deeper where the room allows it, and so is finding a different game. The mistake is playing a 30-blind structure while thinking you're playing 60.",
      "The same question applies away from the straddle: effective depth is always measured against a specific opponent. Win a pot and you may be 44 big blinds deep against the player on your left and 108 against the one on your right.",
    ],
    principle: "Stack depth is relative to the game actually being played.",
  },
  {
    id: "building-the-pot-you-want",
    number: 4,
    concept: "spr",
    title: "Building the pot you want",
    setup: [
      "Two loose-passive players limp. They play too many hands, limp-call too much, chase draws and rarely 3-bet — the range you want to be playing against.",
      "You raise on the button and both call. The flop pot is about $65 with roughly $280 behind, an SPR of about 4.3. Both players check.",
    ],
    hand: cards("As Ks Qd Jd"),
    board: cards("Qs Ts 4c"),
    facts: [
      { label: "Position", value: "Button, three-way" },
      { label: "Pot", value: "$65" },
      { label: "Behind", value: "$280" },
      { label: "Flop SPR", value: "About 4.3" },
    ],
    prompt: "You bet $45. What is the actual case for it?",
    choices: [
      {
        id: "A",
        text: "You raised preflop, so you have to continue.",
      },
      {
        id: "B",
        text: "Protection. You need to charge the flush draw before it gets there.",
      },
      {
        id: "C",
        text: "Worse draws and weaker queens call, your equity against a wide checking range is already strong, and the bet builds a pot with a hand that gets better as the stack behind shrinks. $45 called once makes a turn pot near $155 with about $235 behind — SPR about 1.5.",
      },
      {
        id: "D",
        text: "Check back. The board is too dynamic for one pair.",
      },
    ],
    correctChoiceId: "C",
    answerHeadline: "C — bet, and be able to name all three jobs it does.",
    explanation: [
      "Top pair, the nut flush draw and real straight coverage is a combination hand, not a made hand with a backup plan. A bet here has three named jobs: worse draws and weaker queens call it, your current equity against a wide checking range is strong, and the pot it builds suits your hand better the less money is left behind.",
      "\"Protection\" is the wrong word for it, which is why B fails. You hold the nut flush draw. Nothing in their range is drawing to a better spade, so there is no dominant draw to charge.",
      "SPR 4.3 sits in the zone where you plan the streets before you bet rather than after: which turns you want, what you do against a raise, and where the stack ends up. One called bet takes the turn SPR to about 1.5, and at 1.5 this hand is comfortable playing for the rest.",
      "That is the difference between arriving at a low SPR and choosing one. A and D both skip the planning — one by betting without a reason, the other by refusing a spot that the falling SPR makes favourable.",
    ],
    principle: "Build lower-SPR pots when your hand benefits.",
  },
  {
    id: "the-dominated-flush-draw",
    number: 5,
    concept: "nuttiness",
    title: "The king-high flush draw, three-way",
    setup: [
      "You call a raise on the button and three of you see the flop.",
      "The preflop raiser bets, one player calls, and the decision comes to you.",
    ],
    hand: cards("Ks Qs 8d 7d"),
    board: cards("Js 6s 3h"),
    facts: [
      { label: "Position", value: "Button" },
      { label: "Players", value: "Three-way" },
      { label: "Action", value: "Raiser bets, one caller" },
    ],
    prompt: "What is your flush draw actually worth here?",
    choices: [
      {
        id: "A",
        text: "A strong draw. Nine spades, two cards to come, and there's already money in the pot.",
      },
      {
        id: "B",
        text: "More players means a better price, so multiway makes continuing easier.",
      },
      {
        id: "C",
        text: "Ask where A♠x♠ is. Three-way, a higher spade draw is far more likely to be out, which kills outs and costs you more on the cards that complete your hand. This is precisely the equity that loses value as players enter.",
      },
      {
        id: "D",
        text: "Nothing. Non-nut flush draws are never playable.",
      },
    ],
    correctChoiceId: "C",
    answerHeadline: "C — downgrade it, because the field makes domination likely.",
    explanation: [
      "Against one opponent a king-high flush draw is often perfectly viable. Against several, domination stops being a possibility and becomes an expectation — and a dominated draw is one of the most expensive holdings in live PLO, because the cards that complete it are the cards that cost you the most.",
      "That is reverse implied odds stated plainly. Hitting makes a strong-looking second-best hand, and a strong-looking second-best hand is how stacks change seats.",
      "B is the slogan in the other direction. Multiway is two checks, not one: extra callers genuinely can improve the price, while your equity quality falls further than the price improves. Work out both rather than picking the half that suits the call.",
      "D is a slogan too. Nuttiness is a factor you weigh against the price and the range, not a rule that plays the hand for you. This is also the whole reason nut-suited starting hands carry such a premium.",
    ],
    principle:
      "Don't ask whether you can make a flush. Ask how often you win when you do.",
  },
  {
    id: "counting-a-big-draw",
    number: 6,
    concept: "draw-quality",
    title: "Counting a big draw",
    setup: ["A heads-up 3-bet pot. The opponent bets $60 into $123 on the flop."],
    hand: cards("Ks Qs Jd 9d"),
    board: cards("Ts 8s 3h"),
    facts: [
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
        {
          improvement: "Straight, non-spade",
          cards: "7♥ 7♦ 7♣ · 9♥ 9♣ · J♥ J♣ · Q♥ Q♦ Q♣",
          count: 10,
        },
        { improvement: "Spade flush, ace on board", cards: "A♠", count: 1 },
        { improvement: "Spade flush, beatable", cards: "2♠ 4♠ 5♠ 6♠ 7♠ 9♠ J♠", count: 7 },
        { improvement: "Spade flush that pairs the board", cards: "3♠", count: 1 },
      ],
      totalLabel: "Total unique",
      total: 19,
    },
    principle: "Count unique outs. Then grade their quality. Both steps, every time.",
  },
  {
    id: "same-hand-different-price",
    number: 7,
    concept: "price",
    title: "Same hand. Different price.",
    setup: [
      "One spot, played twice. You hold top set and the turn has put a straight on the board. You face a bet.",
      "The only difference between the two versions is the stack everyone started with: $300 in the first, $200 in the second. Same cards, same board, same line, same opponent.",
    ],
    hand: cards("Qh Qc 7d 6d"),
    board: cards("Qd 9c 4s 8h"),
    boardStreetBreaks: [3],
    boardLabel: "Board · flop + turn",
    facts: [
      { label: "Version 1", value: "$300 effective · 60 BB" },
      { label: "Version 2", value: "$200 effective · 40 BB" },
      { label: "Your hand", value: "Top set, straight now possible", wide: true },
    ],
    prompt: "Does the shorter stack change the answer?",
    choices: [
      {
        id: "A",
        text: "No. Same hand, same board, same decision.",
      },
      {
        id: "B",
        text: "Yes — you're shorter, so you should be more willing to commit with a set.",
      },
      {
        id: "C",
        text: "Yes, but it's the price that moved, not the hand. At $300 effective the call needs 30.0% and the set has 25.0%, so it's a fold. At $200 effective the same call needs 20.1%, and the fold becomes a call.",
      },
      {
        id: "D",
        text: "Yes. At 40 big blinds you're committed with a set whatever the price.",
      },
    ],
    correctChoiceId: "C",
    answerHeadline: "C — fold at 60 BB, call at 40 BB, for the same reason.",
    explanation: [
      "The cards never changed. The effective stack changed, and the effective stack sets the size of the bet you can be asked to face, which sets the price, which sets the equity you need.",
      "At $300 effective you are being asked for 30.0% with a hand worth 25.0% against the range that is betting. Five points is not a close call to talk yourself into. It's a fold.",
      "At $200 effective the same hand against the same range needs 20.1%, and 25.0% clears it comfortably. Nothing about the hand improved. The question changed.",
      "This is also why \"I'm committed\" is a conclusion rather than a starting point. Work out what you still owe against the final pot, then compare it with what the hand is actually worth against the range in front of you. B and D both skip that step and arrive at the right action for the wrong reason, which means they will get the next one wrong.",
    ],
    principle: "Does the present price justify the next investment?",
  },
  {
    id: "the-turn-pairs-the-board",
    number: 8,
    concept: "turn-discipline",
    title: "The turn pairs the board",
    setup: [
      "You 3-bet the button to $58 against a wide cutoff opener, who calls.",
      "On the flop the cutoff leads $100 and you call, leaving $323 in the pot and $142 behind. The turn pairs the board, and the cutoff shoves $142.",
    ],
    hand: cards("Jd Td 7c 6s"),
    board: cards("9s 8h 2d 8c"),
    boardStreetBreaks: [3],
    boardLabel: "Board · flop + turn",
    facts: [
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
    principle: "Do not pay turn prices with flop equity.",
  },
  {
    id: "value-bet-then-fold",
    number: 9,
    concept: "river-discipline",
    title: "You bet the river and got raised",
    setup: [
      "The river completes the spade draw and gives you the king-high flush. There is $120 in the pot, heads-up against a tight-passive player who has paid off with worse.",
      "You bet $50 for value. They raise all-in to $241.",
    ],
    hand: cards("Ks Js Th 8h"),
    board: cards("Qs 9s 5d 3c 2s"),
    boardStreetBreaks: [3, 4],
    boardLabel: "Board · final",
    facts: [
      { label: "Pot before your bet", value: "$120" },
      { label: "You bet", value: "$50" },
      { label: "They raise to", value: "$241" },
      { label: "Read", value: "Tight-passive; large raises have meant strength", wide: true },
    ],
    prompt: "You owe $191. What do you do?",
    choices: [
      {
        id: "A",
        text: "Call. You bet, so you can't fold now — and the second nuts is too strong to give up.",
      },
      {
        id: "B",
        text: "Call. $191 into a final $602 is 31.7%, and a king-high flush beats most of their range.",
      },
      {
        id: "C",
        text: "Fold. The $50 was priced for the hands that call. The raise is a different range, and from a tight-passive player it is almost all value. Name the bluffs it contains; if you can't, the 31.7% isn't there.",
      },
      { id: "D", text: "Raise. You have the second nuts." },
    ],
    correctChoiceId: "C",
    answerHeadline: "C — fold, and the value bet was still correct.",
    explanation: [
      "The bet and the fold face different ranges, which is why both can be right. The hands that call $50 include worse flushes, straights and stubborn two pair. The hands that raise all-in mostly do not.",
      "Price the raise on the incremental amount. You owe $191, not $241 — the $50 already belongs to the pot. $191 into a final $602 is 31.7%.",
      "Then name the bluffs that survive. Which missed draw would this tight-passive player turn into an all-in river raise here? If you can't put a specific holding on that list, you are not being offered 31.7% of anything. River raises in live games are heavily weighted to value, and from this profile especially.",
      "Option A is sunk cost dressed up as consistency. Betting and then folding to a raise is not a contradiction; against passive players it is one of the strongest exploits available. Option B is right about the arithmetic and wrong about whose range it is measuring.",
    ],
    principle:
      "Don't pay for the name of your hand. The second nuts can still be a bluff-catcher.",
  },
  {
    id: "a-full-system-hand",
    number: 10,
    concept: "whole-hand",
    title: "One hand, start to finish",
    setup: [
      "A loose-passive player limps. They limp too much, call raises too wide, chase weak draws, rarely bluff rivers, and every time they have raised late they have had it.",
      "You raise the button and they call. On Q♠9♠4♥ they check, you bet, they call. The 2♣ turn is a blank and they check again. The 8♠ river makes your nut flush, and they check a third time. There is very little stack left.",
    ],
    hand: cards("As Ks Jd Td"),
    board: cards("Qs 9s 4h 2c 8s"),
    boardStreetBreaks: [3, 4],
    boardLabel: "Board · flop, turn, river",
    facts: [
      { label: "Position", value: "Button, heads-up" },
      { label: "River", value: "8♠ — you hold the nut flush" },
      { label: "Behind", value: "Very little" },
      {
        label: "Read",
        value: "Loose-passive: calls too wide, chases weak draws, rarely bluffs rivers",
        wide: true,
      },
    ],
    prompt: "They've checked the river. What's the reasoning that gets this last bet right?",
    choices: [
      {
        id: "A",
        text: "Check back. They called the flop and then went quiet, so there's nothing left to bet into.",
      },
      {
        id: "B",
        text: "Bet the rest because you have the nuts. That's the whole reason.",
      },
      {
        id: "C",
        text: "Bet the rest, for a named reason: there is no equity left to realise and nothing left to deny, so the only question is what worse hands call — and against this player, lower flushes, straights, sets and curious two pair all can.",
      },
      {
        id: "D",
        text: "Bet small, in case they have a better flush.",
      },
    ],
    correctChoiceId: "C",
    answerHeadline: "C — value bet the rest, because you can name who pays.",
    explanation: [
      "Work it the way the system works every hand. Preflop: better structure than theirs, in position, against a range you actively want to play. Flop: nut flush draw plus real straight coverage on a board their wide calling range has plenty of reasons to continue on. Turn: the 2♣ changes nothing — the nuts didn't move, your draw lost a card, their range stayed wide. River: the 8♠ is your card.",
      "On the river there is nothing left to draw to and no equity left to deny, so the river question is the only question. What worse hands call this size? Against someone who calls too wide and rarely raises, the list is long — and the player who calls too much is the player you bet into.",
      "D is worth naming rather than skipping. You hold the A♠, so no better flush exists: nobody can beat you. A blocker is normally information rather than permission, but here it's certainty, and there is no reason to price the bet for a hand that cannot be held.",
      "What made this hand profitable was not one clever river decision. It was a chain: a better starting hand, against a weaker range, in position, at a favourable SPR, with high-quality equity, against a player who calls too much. That is the system, and it is the same chain in every hand you have just worked through.",
    ],
    principle: "The four questions, on every street: Hand · SPR · Equity · Player.",
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
