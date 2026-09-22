import type { Card, Rank, Suit } from "../src/lib/poker/cards";

/**
 * A small Omaha-high evaluator for testing the challenge content, not for the
 * product. Every hand is built from exactly two hole cards and exactly three
 * board cards -- never the best five of all the cards, which is the Hold'em
 * mistake the challenge exists to catch.
 *
 * Ranks compare as arrays: the first element is the class, the rest break ties.
 */

export const HAND_CLASS = [
  "high card",
  "pair",
  "two pair",
  "trips",
  "straight",
  "flush",
  "full house",
  "quads",
  "straight flush",
] as const;

const ORDER: Rank[] = ["2", "3", "4", "5", "6", "7", "8", "9", "T", "J", "Q", "K", "A"];
const SUITS: Suit[] = ["s", "h", "d", "c"];

function value(rank: Rank): number {
  return ORDER.indexOf(rank) + 2;
}

function combinations<T>(items: T[], size: number): T[][] {
  if (size === 0) return [[]];
  return items.flatMap((item, i) =>
    combinations(items.slice(i + 1), size - 1).map((rest) => [item, ...rest]),
  );
}

export function compare(a: number[], b: number[]): number {
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    const diff = (a[i] ?? 0) - (b[i] ?? 0);
    if (diff !== 0) return diff;
  }
  return 0;
}

function rankFive(five: Card[]): number[] {
  const values = five.map((c) => value(c.rank)).sort((x, y) => y - x);
  const flush = new Set(five.map((c) => c.suit)).size === 1;
  const unique = [...new Set(values)];
  let straightHigh = 0;
  if (unique.length === 5) {
    if (unique[0] - unique[4] === 4) straightHigh = unique[0];
    else if (unique.join() === "14,5,4,3,2") straightHigh = 5;
  }
  const counts = new Map<number, number>();
  for (const v of values) counts.set(v, (counts.get(v) ?? 0) + 1);
  const groups = [...counts].sort((x, y) => y[1] - x[1] || y[0] - x[0]);
  const shape = groups.map(([, n]) => n).join("");
  const ordered = groups.map(([v]) => v);

  if (straightHigh && flush) return [8, straightHigh];
  if (shape === "41") return [7, ...ordered];
  if (shape === "32") return [6, ...ordered];
  if (flush) return [5, ...values];
  if (straightHigh) return [4, straightHigh];
  if (shape === "311") return [3, ...ordered];
  if (shape === "221") return [2, ...ordered];
  if (shape === "2111") return [1, ...ordered];
  return [0, ...values];
}

/** The best legal PLO hand: exactly two of `hole`, exactly three of `board`. */
export function bestHand(hole: Card[], board: Card[]): number[] {
  let top: number[] = [];
  for (const pair of combinations(hole, 2)) {
    for (const three of combinations(board, 3)) {
      const rank = rankFive([...pair, ...three]);
      if (top.length === 0 || compare(rank, top) > 0) top = rank;
    }
  }
  return top;
}

export function handClass(hole: Card[], board: Card[]): (typeof HAND_CLASS)[number] {
  return HAND_CLASS[bestHand(hole, board)[0]];
}

function key(card: Card): string {
  return `${card.rank}${card.suit}`;
}

export function unseen(...known: Card[][]): Card[] {
  const taken = new Set(known.flat().map(key));
  return ORDER.flatMap((rank) => SUITS.map((suit) => ({ rank, suit }))).filter(
    (card) => !taken.has(key(card)),
  );
}

/**
 * True when no unseen two-card holding beats hero's best hand on this board.
 * Two cards are enough to check, because a PLO hand uses exactly two.
 */
export function holdsTheNuts(hole: Card[], board: Card[]): boolean {
  const mine = bestHand(hole, board);
  for (const pair of combinations(unseen(hole, board), 2)) {
    for (const three of combinations(board, 3)) {
      if (compare(rankFive([...pair, ...three]), mine) > 0) return false;
    }
  }
  return true;
}

/** Exact equity of `hero` against one fully known holding, board run out. */
export function equityAgainst(hero: Card[], villain: Card[], board: Card[]): number {
  const runs = combinations(unseen(hero, villain, board), 5 - board.length);
  let share = 0;
  for (const run of runs) {
    const full = [...board, ...run];
    const diff = compare(bestHand(hero, full), bestHand(villain, full));
    share += diff > 0 ? 1 : diff === 0 ? 0.5 : 0;
  }
  return share / runs.length;
}
