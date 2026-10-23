/**
 * The pure diff between two board positions (ticket 20): which checkers
 * moved, from where to where, per player. The Board animates exactly these
 * as travel between coordinates; everything else repositions silently.
 *
 * A single dispatched movement yields one move (two with a hit: the mover
 * plus the blot to the bar). Undo and takeback yield the same moves reversed.
 * Checker identity is not tracked by the rules, so multi-checker diffs pair
 * origins with destinations in pip order — farthest from home first — which
 * reads naturally for every play the store can produce.
 */

import type { BoardState, Player, Point } from '../rules';

/** Anywhere a checker can stand: a point, the bar, or borne off. */
export type CheckerPlace = Point | 'bar' | 'off';

export interface CheckerMove {
  readonly player: Player;
  readonly from: CheckerPlace;
  readonly to: CheckerPlace;
}

/** How many checkers `player` has standing at `place` on `board`. */
export function checkersAt(
  board: BoardState,
  player: Player,
  place: CheckerPlace,
): number {
  if (place === 'bar') {
    return board.bar[player];
  }
  if (place === 'off') {
    return board.off[player];
  }
  const count = board.points[place];
  return player === 'white' ? Math.max(count, 0) : Math.max(-count, 0);
}

/** A checker's pip distance from home: the sort key for pairing moves. */
function distance(place: CheckerPlace, player: Player): number {
  if (place === 'bar') {
    return 25;
  }
  if (place === 'off') {
    return 0;
  }
  return player === 'white' ? place : 25 - place;
}

const PLACES: readonly CheckerPlace[] = [
  ...Array.from({ length: 24 }, (_, i) => (i + 1) as Point),
  'bar',
  'off',
];

export function diffBoards(prev: BoardState, next: BoardState): CheckerMove[] {
  const moves: CheckerMove[] = [];
  for (const player of ['white', 'black'] as const) {
    const losses: CheckerPlace[] = [];
    const gains: CheckerPlace[] = [];
    for (const place of PLACES) {
      const delta =
        checkersAt(next, player, place) - checkersAt(prev, player, place);
      for (let i = 0; i < Math.abs(delta); i++) {
        (delta < 0 ? losses : gains).push(place);
      }
    }
    if (losses.length !== gains.length) {
      // Different checker totals: not two positions of one game. Snap.
      return [];
    }
    const byDistance = (a: CheckerPlace, b: CheckerPlace) =>
      distance(b, player) - distance(a, player);
    losses.sort(byDistance);
    gains.sort(byDistance);
    for (let i = 0; i < losses.length; i++) {
      moves.push({ player, from: losses[i], to: gains[i] });
    }
  }
  return moves;
}
