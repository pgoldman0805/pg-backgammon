/**
 * XGID encoding and decoding of an EnginePosition — used to drive gnubg via
 * `set xgid` and as the user-facing position copy/paste format (ticket 10).
 *
 * Encoding convention (see .scratch exploration notes / gnubg's
 * PositionFromXG): XGID "player 1" is always our on-roll player (the hero),
 * so the turn field is always 1 and gnubg never prompts to swap seats.
 * Position string index i (1-24) is the hero's point i — the absolute point
 * i when white is on roll, 25-i when black is. Index 0 is the opponent's
 * bar, index 25 the hero's. Uppercase A-P = 1-16 hero checkers, lowercase =
 * opponent.
 *
 * Decoding maps XGID player 1 (the bottom/uppercase player) to white and
 * player 2 to black, so a pasted position renders with its author's hero at
 * the bottom of the board; the turn field picks who is on roll.
 */

import type { BoardState, DiceRoll, Die, Player } from '../rules';
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

export interface EncodeXgidOptions {
  /**
   * True encodes an offered double awaiting take/pass: the dice field is
   * `D` and the on-roll player is read as the doubler (gnubg's SetXGID
   * semantics). Any `roll` argument is ignored.
   */
  readonly pendingDouble?: boolean;
}

/**
 * Encode a position (and optionally the dice to play) as an XGID string,
 * without the leading `XGID=` prefix.
 */
export function encodeXgid(
  position: EnginePosition,
  roll?: DiceRoll,
  options?: EncodeXgidOptions,
): string {
  const { onRoll, match } = position;
  const cube = match?.cube ?? { value: 1, owner: 'center' as const };
  const cubeLog2 = Math.round(Math.log2(cube.value));
  const cubeOwner =
    cube.owner === 'center' ? 0 : cube.owner === onRoll ? 1 : -1;
  const dice = options?.pendingDouble
    ? 'D'
    : roll
      ? `${roll[0]}${roll[1]}`
      : '00';
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

/** A successfully decoded XGID: the position plus what the dice field said. */
export interface DecodedXgid {
  /** XGID player 1 (bottom/uppercase) mapped to white, player 2 to black. */
  readonly position: EnginePosition;
  /** The dice to play, or null when nothing has been rolled. */
  readonly roll: DiceRoll | null;
  /** True when a double is pending: `position.onRoll` is the doubler. */
  readonly pendingDouble: boolean;
}

function invalid(reason: string): Error {
  return new Error(`not a valid XGID: ${reason}`);
}

function parseIntField(value: string, name: string): number {
  if (!/^-?\d+$/.test(value)) {
    throw invalid(`the ${name} field "${value}" is not an integer`);
  }
  return Number(value);
}

/** Decode the 26-char position string into a BoardState (player 1 = white). */
function decodeBoard(text: string): BoardState {
  if (text.length !== 26) {
    throw invalid(`the position must be 26 characters, got ${text.length}`);
  }
  const points = new Array<number>(25).fill(0);
  const bar = { white: 0, black: 0 };
  for (let i = 0; i < 26; i++) {
    const char = text[i];
    let white = 0;
    let black = 0;
    if (char >= 'A' && char <= 'P') {
      white = char.charCodeAt(0) - 'A'.charCodeAt(0) + 1;
    } else if (char >= 'a' && char <= 'p') {
      black = char.charCodeAt(0) - 'a'.charCodeAt(0) + 1;
    } else if (char !== '-') {
      throw invalid(`the position holds an unexpected character "${char}"`);
    }
    if (i === 0) {
      if (white > 0) {
        throw invalid('player 2 cannot have player-1 checkers on the bar');
      }
      bar.black = black;
    } else if (i === 25) {
      if (black > 0) {
        throw invalid('player 1 cannot have player-2 checkers on the bar');
      }
      bar.white = white;
    } else {
      // Index i is player 1's point i — the absolute point i with white as
      // player 1.
      points[i] = white > 0 ? white : black > 0 ? -black : 0;
    }
  }
  const total = (player: Player): number => {
    const sign = player === 'white' ? 1 : -1;
    let sum = bar[player];
    for (let p = 1; p <= 24; p++) {
      sum += Math.max(0, points[p] * sign);
    }
    return sum;
  };
  const whiteTotal = total('white');
  const blackTotal = total('black');
  if (whiteTotal > 15 || blackTotal > 15) {
    throw invalid('a player has more than 15 checkers');
  }
  return {
    points,
    bar,
    off: { white: 15 - whiteTotal, black: 15 - blackTotal },
  };
}

/**
 * Decode an XGID string (the `XGID=` prefix is optional) into a position,
 * the rolled dice, and whether a double is pending. Throws an Error whose
 * message starts with "not a valid XGID" on anything malformed.
 */
export function decodeXgid(text: string): DecodedXgid {
  const trimmed = text.trim();
  const body = trimmed.includes('=')
    ? trimmed.slice(trimmed.lastIndexOf('=') + 1)
    : trimmed;
  const fields = body.split(':');
  if (fields.length !== 10) {
    throw invalid(`expected 10 ":"-separated fields, got ${fields.length}`);
  }
  const [pos, cb, co, t, d, s1, s2, r, l] = fields;

  const board = decodeBoard(pos);

  const cubeLog2 = parseIntField(cb, 'cube');
  if (cubeLog2 < 0 || cubeLog2 > 15) {
    throw invalid(`the cube field must be a log2 value 0-15, got "${cb}"`);
  }
  const cubeValue = 2 ** cubeLog2;

  const cubeOwnerField = parseIntField(co, 'cube owner');
  if (cubeOwnerField !== 0 && cubeOwnerField !== 1 && cubeOwnerField !== -1) {
    throw invalid(`the cube owner must be 1, 0 or -1, got "${co}"`);
  }
  const owner: Player | 'center' =
    cubeOwnerField === 0 ? 'center' : cubeOwnerField === 1 ? 'white' : 'black';

  const turn = parseIntField(t, 'turn');
  if (turn !== 1 && turn !== -1) {
    throw invalid(`the turn field must be 1 or -1, got "${t}"`);
  }
  const onRoll: Player = turn === 1 ? 'white' : 'black';

  let roll: DiceRoll | null = null;
  let pendingDouble = false;
  if (d === 'D') {
    pendingDouble = true;
  } else if (d !== '00') {
    if (!/^[1-6][1-6]$/.test(d)) {
      throw invalid(`the dice field must be 00, D or two digits 1-6, got "${d}"`);
    }
    roll = [Number(d[0]) as Die, Number(d[1]) as Die];
  }

  const scoreWhite = parseIntField(s1, 'player 1 score');
  const scoreBlack = parseIntField(s2, 'player 2 score');
  if (scoreWhite < 0 || scoreBlack < 0) {
    throw invalid('scores cannot be negative');
  }

  const rules = parseIntField(r, 'rules');
  if (rules < 0 || rules > 3) {
    throw invalid(`the rules field must be 0-3, got "${r}"`);
  }

  const matchLength = parseIntField(l, 'match length');
  if (matchLength < 0) {
    throw invalid('the match length cannot be negative');
  }
  if (matchLength > 0 && (scoreWhite >= matchLength || scoreBlack >= matchLength)) {
    throw invalid('scores must be below the match length');
  }

  return {
    position: {
      board,
      onRoll,
      match: {
        matchLength,
        score: { white: scoreWhite, black: scoreBlack },
        crawford: matchLength > 0 && rules === 1,
        cube: { value: cubeValue, owner },
      },
    },
    roll,
    pendingDouble,
  };
}
