// @vitest-environment node
/**
 * Cross-validation of the rules engine against gnubg move generation
 * (deferred from ticket 02): for sampled positions and rolls, gnubg's legal
 * move list and src/rules legalPlays must agree exactly.
 *
 * session.rankPlays already throws if gnubg produces a play our rules reject;
 * comparing counts (both lists are deduplicated by final position) makes the
 * check a bijection, so a single assertion per position covers both
 * directions.
 */
import { beforeAll, describe, expect, it } from 'vitest';
import type { BoardState, DiceRoll, Die, Player } from '../../rules';
import {
  applyMovement,
  createBoard,
  initialBoard,
  legalPlays,
} from '../../rules';
import type { GnubgSession } from '../session';
import { loadGnubgSession } from './loadGnubg';

let session: GnubgSession;

beforeAll(async () => {
  session = await loadGnubgSession();
}, 120_000);

function mulberry32(seed: number): () => number {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function assertAgreement(
  board: BoardState,
  player: Player,
  roll: DiceRoll,
): void {
  const legal = legalPlays(board, player, roll);
  if (legal.length === 0) {
    // Dance: nothing for gnubg to list; rankPlays never consults it.
    expect(session.rankPlays({ board, onRoll: player }, roll)).toEqual([]);
    return;
  }
  // Joins every gnubg move to a legal play (throws on mismatch) and the
  // count equality makes it a bijection.
  const ranked = session.rankPlays({ board, onRoll: player }, roll, {
    difficulty: 'expert',
  });
  expect(ranked).toHaveLength(legal.length);
}

describe('rules engine vs gnubg move generation', () => {
  it('agrees across a seeded random playout from the opening', () => {
    const random = mulberry32(0xbacca);
    const die = (): Die => (Math.floor(random() * 6) + 1) as Die;
    let board = initialBoard();
    let player: Player = 'white';
    let compared = 0;

    for (let turn = 0; turn < 60 && compared < 24; turn++) {
      const roll: DiceRoll = [die(), die()];
      const plays = legalPlays(board, player, roll);
      assertAgreement(board, player, roll);
      compared++;
      if (plays.length > 0) {
        const choice = plays[Math.floor(random() * plays.length)];
        for (const movement of choice.movements) {
          board = applyMovement(board, player, movement);
        }
      }
      if (board.off.white === 15 || board.off.black === 15) {
        break;
      }
      player = player === 'white' ? 'black' : 'white';
    }
    expect(compared).toBeGreaterThanOrEqual(20);
  });

  it('agrees on bar-entry positions', () => {
    const board = createBoard({
      white: { points: { 24: 2, 13: 5, 8: 3, 6: 4 }, bar: 1 },
      black: { points: { 1: 2, 12: 4, 17: 3, 19: 4, 20: 2 } },
    });
    for (const roll of [
      [4, 2],
      [5, 5],
      [6, 1],
    ] as const satisfies readonly DiceRoll[]) {
      assertAgreement(board, 'white', roll);
    }
  });

  it('agrees on bear-off positions including overshoot rules', () => {
    const board = createBoard({
      white: { points: { 5: 3, 4: 2, 3: 4, 2: 2 }, off: 4 },
      black: { points: { 24: 2, 19: 5, 17: 3, 12: 5 } },
    });
    for (const roll of [
      [6, 3],
      [5, 1],
      [6, 6],
      [2, 1],
    ] as const satisfies readonly DiceRoll[]) {
      assertAgreement(board, 'white', roll);
    }
  });

  it('agrees on forced and single-die positions', () => {
    // White is heavily blocked: only some dice play, max-dice rules bite.
    const board = createBoard({
      white: { points: { 24: 2, 23: 2, 13: 6, 6: 5 } },
      black: {
        points: { 22: 2, 21: 2, 20: 2, 19: 2, 18: 2, 5: 2, 4: 2, 11: 1 },
      },
    });
    for (const roll of [
      [6, 5],
      [1, 2],
      [4, 4],
      [6, 6],
    ] as const satisfies readonly DiceRoll[]) {
      assertAgreement(board, 'white', roll);
    }
  });
});
