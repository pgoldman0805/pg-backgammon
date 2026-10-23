/**
 * Translate gnubg's hero-relative move notation (e.g. "8/5 6/5", "bar/22",
 * "13/10(2)", "6/off", compound chains with hit stars) back into a
 * rules-engine Play.
 *
 * Rather than reconstructing dice assignments from the notation, we simulate
 * the notation to its final board and join it against legalPlays, which
 * guarantees the returned Play is legal and carries correct dice/hit flags.
 * gnubg lists one line per unique final position, so the join is unambiguous.
 */

import type { BoardState, DiceRoll, Play, Player } from '../rules';
import { applyMovement, legalPlays, opponent } from '../rules';

type Location = number | 'bar' | 'off';

interface NotationToken {
  readonly chain: readonly Location[];
  readonly count: number;
}

function parseLocation(text: string, player: Player): Location {
  if (text === 'bar') {
    return 'bar';
  }
  if (text === 'off') {
    return 'off';
  }
  const relative = Number(text);
  if (!Number.isInteger(relative) || relative < 1 || relative > 24) {
    throw new Error(`unparseable move location "${text}"`);
  }
  return player === 'white' ? relative : 25 - relative;
}

/** Parse one token (a hop chain with optional hit stars and repetition). */
function parseToken(token: string, player: Player): NotationToken {
  const repetition = token.match(/^(.*?)\((\d+)\)$/);
  const chainText = repetition ? repetition[1] : token;
  const count = repetition ? Number(repetition[2]) : 1;
  const chain = chainText
    .split('/')
    .map((part) => parseLocation(part.replace(/\*/g, ''), player));
  if (chain.length < 2) {
    throw new Error(`unparseable move token "${token}"`);
  }
  return { chain, count };
}

/**
 * Compute the board resulting from applying gnubg move notation for
 * `player`. Hits are inferred from occupancy (a lone opposing checker on any
 * location a checker lands on is sent to the bar), so `*` markers need no
 * special handling.
 */
export function applyMoveText(
  board: BoardState,
  player: Player,
  moveText: string,
): BoardState {
  const sign = player === 'white' ? 1 : -1;
  const points = [...board.points];
  const bar = { ...board.bar };
  const off = { ...board.off };

  const hop = (from: Location, to: Location): void => {
    if (from === 'bar') {
      bar[player] -= 1;
    } else if (from !== 'off') {
      points[from] -= sign;
    }
    if (to === 'off') {
      off[player] += 1;
    } else if (to !== 'bar') {
      if (points[to] * sign === -1) {
        points[to] = 0;
        bar[opponent(player)] += 1;
      }
      points[to] += sign;
    }
  };

  const tokens = moveText.trim().split(/\s+/);
  for (const token of tokens) {
    const { chain, count } = parseToken(token, player);
    for (let repeat = 0; repeat < count; repeat++) {
      for (let i = 0; i + 1 < chain.length; i++) {
        hop(chain[i], chain[i + 1]);
      }
    }
  }
  return { points, bar, off };
}

/** Canonical key of a board position, for final-position comparison. */
export function boardKey(board: BoardState): string {
  return `${board.points.join(',')}|${board.bar.white},${board.bar.black}|${board.off.white},${board.off.black}`;
}

/**
 * Find the legal Play whose final position matches the gnubg notation.
 * Throws when the notation corresponds to no legal play (a rules/engine
 * disagreement — surfaced loudly, and guarded by cross-validation tests).
 */
export function matchPlayByMoveText(
  board: BoardState,
  player: Player,
  roll: DiceRoll,
  moveText: string,
): Play {
  const target = boardKey(applyMoveText(board, player, moveText));
  for (const play of legalPlays(board, player, roll)) {
    let next = board;
    for (const movement of play.movements) {
      next = applyMovement(next, player, movement);
    }
    if (boardKey(next) === target) {
      return play;
    }
  }
  throw new Error(
    `no legal play matches "${moveText}" for ${player} rolling ${roll[0]}-${roll[1]}`,
  );
}
