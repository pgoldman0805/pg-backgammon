/**
 * XGID encoding of an EnginePosition, used to drive gnubg via `set xgid`.
 *
 * Convention (see .scratch exploration notes / gnubg's PositionFromXG):
 * XGID "player 1" is always our on-roll player (the hero), so the turn field
 * is always 1 and gnubg never prompts to swap seats. Position string index
 * i (1-24) is the hero's point i — the absolute point i when white is on
 * roll, 25-i when black is. Index 0 is the opponent's bar, index 25 the
 * hero's. Uppercase A-P = 1-16 hero checkers, lowercase = opponent.
 */

import type { DiceRoll, Player } from '../rules';
import type { EnginePosition } from './types';

function checkerChar(heroCount: number, opponentCount: number): string {
  if (heroCount > 0) {
    return String.fromCharCode('A'.charCodeAt(0) + heroCount - 1);
  }
  if (opponentCount > 0) {
    return String.fromCharCode('a'.charCodeAt(0) + opponentCount - 1);
  }
  return '-';
}

function encodeBoard(position: EnginePosition): string {
  const { board, onRoll } = position;
  const heroSign = onRoll === 'white' ? 1 : -1;
  const opponent: Player = onRoll === 'white' ? 'black' : 'white';
  const chars: string[] = [];
  chars.push(checkerChar(0, board.bar[opponent]));
  for (let i = 1; i <= 24; i++) {
    const absolute = onRoll === 'white' ? i : 25 - i;
    const signed = board.points[absolute] * heroSign;
    chars.push(checkerChar(Math.max(0, signed), Math.max(0, -signed)));
  }
  chars.push(checkerChar(board.bar[onRoll], 0));
  return chars.join('');
}

/**
 * Encode a position (and optionally the dice to play) as an XGID string,
 * without the leading `XGID=` prefix.
 */
export function encodeXgid(
  position: EnginePosition,
  roll?: DiceRoll,
): string {
  const { onRoll, match } = position;
  const cube = match?.cube ?? { value: 1, owner: 'center' as const };
  const cubeLog2 = Math.round(Math.log2(cube.value));
  const cubeOwner =
    cube.owner === 'center' ? 0 : cube.owner === onRoll ? 1 : -1;
  const dice = roll ? `${roll[0]}${roll[1]}` : '00';
  const heroScore = match ? match.score[onRoll] : 0;
  const opponentScore = match
    ? match.score[onRoll === 'white' ? 'black' : 'white']
    : 0;
  const matchLength = match?.matchLength ?? 0;
  const rules = matchLength > 0 && match?.crawford ? 1 : 0;
  return [
    encodeBoard(position),
    cubeLog2,
    cubeOwner,
    1,
    dice,
    heroScore,
    opponentScore,
    rules,
    matchLength,
    10,
  ].join(':');
}
