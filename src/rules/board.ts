import {
  type BoardState,
  type CheckerMovement,
  opponent,
  type Player,
} from './types';

const sign = (player: Player): 1 | -1 => (player === 'white' ? 1 : -1);

export interface PlayerPlacement {
  /** Checker count per point (1-24). */
  readonly points: Readonly<Record<number, number>>;
  readonly bar?: number;
  readonly off?: number;
}

export interface BoardSpec {
  readonly white: PlayerPlacement;
  readonly black: PlayerPlacement;
}

/**
 * Build an arbitrary position. Each player must have exactly 15 checkers in
 * total, and no point may be occupied by both players.
 */
export function createBoard(spec: BoardSpec): BoardState {
  const points = new Array<number>(25).fill(0);
  for (const player of ['white', 'black'] as const) {
    const placement = spec[player];
    let total = (placement.bar ?? 0) + (placement.off ?? 0);
    for (const [key, count] of Object.entries(placement.points)) {
      const point = Number(key);
      if (!Number.isInteger(point) || point < 1 || point > 24) {
        throw new Error(`invalid point ${key}`);
      }
      if (count < 0) {
        throw new Error(`negative checker count on point ${point}`);
      }
      if (
        count > 0 &&
        points[point] !== 0 &&
        Math.sign(points[point]) !== sign(player)
      ) {
        throw new Error(`both players occupy point ${point}`);
      }
      points[point] += count * sign(player);
      total += count;
    }
    if (total !== 15) {
      throw new Error(`${player} has ${total} checkers; expected exactly 15`);
    }
  }
  return {
    points,
    bar: { white: spec.white.bar ?? 0, black: spec.black.bar ?? 0 },
    off: { white: spec.white.off ?? 0, black: spec.black.off ?? 0 },
  };
}

/** The standard backgammon starting position. */
export function initialBoard(): BoardState {
  const points = new Array<number>(25).fill(0);
  // White (positive): moves 24 -> 1.
  points[24] = 2;
  points[13] = 5;
  points[8] = 3;
  points[6] = 5;
  // Black (negative): mirror image, moves 1 -> 24.
  points[1] = -2;
  points[12] = -5;
  points[17] = -3;
  points[19] = -5;
  return {
    points,
    bar: { white: 0, black: 0 },
    off: { white: 0, black: 0 },
  };
}

/**
 * Apply one checker movement for `player`. The movement is trusted to have
 * been produced by legal-movement computation; only structural invariants are
 * checked (a checker exists at `from`, the destination is not blocked).
 */
export function applyMovement(
  board: BoardState,
  player: Player,
  movement: CheckerMovement,
): BoardState {
  const s = sign(player);
  const points = [...board.points];
  const bar = { ...board.bar };
  const off = { ...board.off };

  if (movement.from === 'bar') {
    if (bar[player] < 1) {
      throw new Error(`${player} has no checker on the bar`);
    }
    bar[player] -= 1;
  } else {
    if (points[movement.from] * s < 1) {
      throw new Error(`${player} has no checker on point ${movement.from}`);
    }
    points[movement.from] -= s;
  }

  if (movement.to === 'off') {
    off[player] += 1;
  } else {
    const occupancy = points[movement.to] * s;
    if (occupancy < -1) {
      throw new Error(`point ${movement.to} is blocked`);
    }
    if (movement.hit) {
      if (occupancy !== -1) {
        throw new Error(`no blot to hit on point ${movement.to}`);
      }
      points[movement.to] = 0;
      bar[opponent(player)] += 1;
    }
    points[movement.to] += s;
  }

  return { points, bar, off };
}

/** Exactly reverse a movement previously applied with {@link applyMovement}. */
export function undoMovement(
  board: BoardState,
  player: Player,
  movement: CheckerMovement,
): BoardState {
  const s = sign(player);
  const points = [...board.points];
  const bar = { ...board.bar };
  const off = { ...board.off };

  if (movement.to === 'off') {
    off[player] -= 1;
  } else {
    points[movement.to] -= s;
    if (movement.hit) {
      bar[opponent(player)] -= 1;
      points[movement.to] = -s;
    }
  }

  if (movement.from === 'bar') {
    bar[player] += 1;
  } else {
    points[movement.from] += s;
  }

  return { points, bar, off };
}

/**
 * Is the position a Race (GLOSSARY "Race")? True when no contact remains:
 * every white checker is strictly past every black checker, so neither player
 * can ever hit or block the other again. A checker on the bar sits behind the
 * opponent's whole army, so it means contact while the opponent has any
 * checker still in play.
 */
export function isRace(board: BoardState): boolean {
  // Rearmost checkers: white moves 24 -> 1 (bar re-enters behind 24), black
  // moves 1 -> 24 (bar re-enters behind 1). A player with nothing left in
  // play has no rear checker and can never be contacted.
  let whiteRear = board.bar.white > 0 ? 25 : -1;
  let blackRear = board.bar.black > 0 ? 0 : 26;
  for (let p = 1; p <= 24; p++) {
    if (board.points[p] > 0) {
      whiteRear = Math.max(whiteRear, p);
    } else if (board.points[p] < 0) {
      blackRear = Math.min(blackRear, p);
    }
  }
  return whiteRear < blackRear;
}

/**
 * Pips remaining for a player: sum of each checker's distance from bearing
 * off. A checker on the bar is 25 pips away; borne-off checkers count 0.
 */
export function pipCount(board: BoardState, player: Player): number {
  let pips = 25 * board.bar[player];
  for (let p = 1; p <= 24; p++) {
    const count = board.points[p] * sign(player);
    if (count > 0) {
      pips += count * (player === 'white' ? p : 25 - p);
    }
  }
  return pips;
}
