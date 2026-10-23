import { applyMovement } from './board';
import type {
  BoardState,
  CheckerMovement,
  DiceRoll,
  Die,
  Play,
  Player,
  Point,
} from './types';

const sign = (player: Player): 1 | -1 => (player === 'white' ? 1 : -1);

/**
 * Compute the movement of one checker by one die, or null when illegal.
 * Enforces: bar entry before anything else, blocked points, and the
 * bear-off rules (all checkers home; exact die, or overshoot only from the
 * highest occupied point).
 */
export function computeMovement(
  board: BoardState,
  player: Player,
  from: Point | 'bar',
  die: Die,
): CheckerMovement | null {
  const s = sign(player);

  if (board.bar[player] > 0 && from !== 'bar') {
    return null;
  }

  let to: number;
  if (from === 'bar') {
    if (board.bar[player] === 0) {
      return null;
    }
    to = player === 'white' ? 25 - die : die;
  } else {
    if (from < 1 || from > 24 || board.points[from] * s < 1) {
      return null;
    }
    to = player === 'white' ? from - die : from + die;
  }

  if (to >= 1 && to <= 24) {
    const occupancy = board.points[to] * s;
    if (occupancy < -1) {
      return null; // blocked by two or more opposing checkers
    }
    return { from, to, die, hit: occupancy === -1 };
  }

  // Destination is past the board edge: only a bear-off can do that.
  if (from === 'bar') {
    return null;
  }
  if (!allCheckersHome(board, player)) {
    return null;
  }
  const distance = player === 'white' ? from : 25 - from;
  if (die === distance) {
    return { from, to: 'off', die, hit: false };
  }
  // Overshoot: legal only from the player's highest occupied point.
  if (die > distance && highestHomePoint(board, player) === from) {
    return { from, to: 'off', die, hit: false };
  }
  return null;
}

function allCheckersHome(board: BoardState, player: Player): boolean {
  if (board.bar[player] > 0) {
    return false;
  }
  const s = sign(player);
  const [outsideStart, outsideEnd] = player === 'white' ? [7, 24] : [1, 18];
  for (let p = outsideStart; p <= outsideEnd; p++) {
    if (board.points[p] * s > 0) {
      return false;
    }
  }
  return true;
}

/** The player's occupied home point farthest from bearing off, or null. */
function highestHomePoint(board: BoardState, player: Player): Point | null {
  const s = sign(player);
  if (player === 'white') {
    for (let p = 6; p >= 1; p--) {
      if (board.points[p] * s > 0) {
        return p;
      }
    }
  } else {
    for (let p = 19; p <= 24; p++) {
      if (board.points[p] * s > 0) {
        return p;
      }
    }
  }
  return null;
}

/** All distinct single-checker movements available for the given die values. */
export function legalMovements(
  board: BoardState,
  player: Player,
  dice: readonly Die[],
): CheckerMovement[] {
  const movements: CheckerMovement[] = [];
  for (const die of new Set(dice)) {
    const fromBar = computeMovement(board, player, 'bar', die);
    if (fromBar) {
      movements.push(fromBar);
    }
    for (let p = 1; p <= 24; p++) {
      const movement = computeMovement(board, player, p, die);
      if (movement) {
        movements.push(movement);
      }
    }
  }
  return movements;
}

function boardKey(board: BoardState): string {
  return `${board.points.join(',')}|${board.bar.white},${board.bar.black}|${board.off.white},${board.off.black}`;
}

interface Expansion {
  /** Number of movements in the longest continuation from this state. */
  readonly length: number;
  /** All maximal continuations: their movements and resulting boards. */
  readonly results: ReadonlyArray<{
    readonly movements: readonly CheckerMovement[];
    readonly board: BoardState;
  }>;
}

function expand(
  board: BoardState,
  player: Player,
  dice: readonly Die[],
  cache: Map<string, Expansion>,
): Expansion {
  const key = `${boardKey(board)}#${[...dice].sort().join(',')}`;
  const cached = cache.get(key);
  if (cached) {
    return cached;
  }

  const candidates = legalMovements(board, player, dice);
  let expansion: Expansion;
  if (candidates.length === 0) {
    expansion = { length: 0, results: [{ movements: [], board }] };
  } else {
    let best = 0;
    let results: Array<{
      movements: readonly CheckerMovement[];
      board: BoardState;
    }> = [];
    for (const movement of candidates) {
      const nextBoard = applyMovement(board, player, movement);
      const index = dice.indexOf(movement.die);
      const remaining = [...dice.slice(0, index), ...dice.slice(index + 1)];
      const child = expand(nextBoard, player, remaining, cache);
      const total = 1 + child.length;
      if (total > best) {
        best = total;
        results = [];
      }
      if (total === best) {
        for (const r of child.results) {
          results.push({
            movements: [movement, ...r.movements],
            board: r.board,
          });
        }
      }
    }
    expansion = { length: best, results };
  }

  cache.set(key, expansion);
  return expansion;
}

/**
 * Enumerate every legal Play for a roll, enforcing the full rule set:
 * - doubles play up to four movements;
 * - as many dice as possible must be used (max-dice rule);
 * - when only one die can be played, the higher must be chosen if legal;
 * - plays reaching the same final position are enumerated once.
 *
 * Returns an empty array when no checker can move (a dance / no-play).
 */
export function legalPlays(
  board: BoardState,
  player: Player,
  roll: DiceRoll,
): Play[] {
  const [a, b] = roll;
  const dice: Die[] = a === b ? [a, a, a, a] : [a, b];
  const { length, results } = expand(board, player, dice, new Map());

  if (length === 0) {
    return [];
  }

  let maximal = results;
  if (length === 1 && a !== b) {
    const higher = Math.max(a, b);
    const higherDie = maximal.filter((r) => r.movements[0].die === higher);
    if (higherDie.length > 0) {
      maximal = higherDie;
    }
  }

  const seen = new Set<string>();
  const plays: Play[] = [];
  for (const result of maximal) {
    const key = boardKey(result.board);
    if (!seen.has(key)) {
      seen.add(key);
      plays.push({ player, roll, movements: result.movements });
    }
  }
  return plays;
}
