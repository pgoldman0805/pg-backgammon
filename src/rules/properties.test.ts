import fc from 'fast-check';
import { describe, test } from 'vitest';
import { applyMovement, createBoard, undoMovement } from './board';
import { legalMovements, legalPlays } from './plays';
import type { BoardState, DiceRoll, Die, Player } from './types';

/** Structural key for comparing board positions. */
function key(board: BoardState): string {
  return JSON.stringify([board.points, board.bar, board.off]);
}

/**
 * Independent oracle for the maximum number of dice playable: a plain
 * exhaustive DFS with no maximality filtering, memoization, or dedupe.
 */
function maxPlayableDice(
  board: BoardState,
  player: Player,
  dice: readonly Die[],
): number {
  let best = 0;
  for (const movement of legalMovements(board, player, dice)) {
    const index = dice.indexOf(movement.die);
    const remaining = [...dice.slice(0, index), ...dice.slice(index + 1)];
    const depth =
      1 +
      maxPlayableDice(
        applyMovement(board, player, movement),
        player,
        remaining,
      );
    if (depth > best) {
      best = depth;
    }
  }
  return best;
}

/**
 * Arbitrary positions: each player's 15 checkers distributed over the 24
 * points, the bar, and borne off, with no point shared between players.
 */
const arbitraryPosition = fc
  .tuple(
    // Slot per white checker: 0 = off, 25 = bar, 1-24 = that point.
    fc.array(fc.integer({ min: 0, max: 25 }), { minLength: 15, maxLength: 15 }),
    // Slot index per black checker, mapped onto the points white left free.
    fc.array(fc.nat({ max: 1000 }), { minLength: 15, maxLength: 15 }),
  )
  .map(([whiteSlots, blackDraws]) => {
    const whitePoints: Record<number, number> = {};
    let whiteBar = 0;
    let whiteOff = 0;
    for (const slot of whiteSlots) {
      if (slot === 0) {
        whiteOff++;
      } else if (slot === 25) {
        whiteBar++;
      } else {
        whitePoints[slot] = (whitePoints[slot] ?? 0) + 1;
      }
    }
    const freePoints: number[] = [];
    for (let p = 1; p <= 24; p++) {
      if (!whitePoints[p]) {
        freePoints.push(p);
      }
    }
    // 0 = off, 1 = bar, 2+ = a free point.
    const blackPoints: Record<number, number> = {};
    let blackBar = 0;
    let blackOff = 0;
    for (const draw of blackDraws) {
      const slot = draw % (freePoints.length + 2);
      if (slot === 0) {
        blackOff++;
      } else if (slot === 1) {
        blackBar++;
      } else {
        const point = freePoints[slot - 2];
        blackPoints[point] = (blackPoints[point] ?? 0) + 1;
      }
    }
    return createBoard({
      white: { points: whitePoints, bar: whiteBar, off: whiteOff },
      black: { points: blackPoints, bar: blackBar, off: blackOff },
    });
  });

const arbitraryRoll: fc.Arbitrary<DiceRoll> = fc.tuple(
  fc.integer({ min: 1, max: 6 }) as fc.Arbitrary<Die>,
  fc.integer({ min: 1, max: 6 }) as fc.Arbitrary<Die>,
);

const arbitraryPlayer: fc.Arbitrary<Player> = fc.constantFrom('white', 'black');

describe('legal-play enumeration properties', () => {
  test('every enumerated play applies cleanly and undoes back to the original position', () => {
    fc.assert(
      fc.property(
        arbitraryPosition,
        arbitraryPlayer,
        arbitraryRoll,
        (board, player, roll) => {
          for (const play of legalPlays(board, player, roll)) {
            let current = board;
            for (const movement of play.movements) {
              current = applyMovement(current, player, movement);
            }
            for (let i = play.movements.length - 1; i >= 0; i--) {
              current = undoMovement(current, player, play.movements[i]);
            }
            if (key(current) !== key(board)) {
              throw new Error('undo did not restore the original position');
            }
          }
        },
      ),
      { numRuns: 200 },
    );
  });

  test('no play ever uses fewer dice than the maximum playable (independent DFS oracle)', () => {
    fc.assert(
      fc.property(
        arbitraryPosition,
        arbitraryPlayer,
        arbitraryRoll,
        (board, player, roll) => {
          const [a, b] = roll;
          const dice: Die[] = a === b ? [a, a, a, a] : [a, b];
          const max = maxPlayableDice(board, player, dice);
          const plays = legalPlays(board, player, roll);
          if (max === 0) {
            if (plays.length !== 0) {
              throw new Error(
                'plays enumerated where the oracle finds no playable dice',
              );
            }
            return;
          }
          if (plays.length === 0) {
            throw new Error(
              'no plays enumerated where the oracle finds playable dice',
            );
          }
          for (const play of plays) {
            if (play.movements.length !== max) {
              throw new Error(
                `play uses ${play.movements.length} dice; oracle says ${max} are playable`,
              );
            }
          }
        },
      ),
      { numRuns: 100 },
    );
  });

  test('when only one die is playable, the higher playable die is the one used', () => {
    fc.assert(
      fc.property(
        arbitraryPosition,
        arbitraryPlayer,
        arbitraryRoll,
        (board, player, roll) => {
          const [a, b] = roll;
          if (a === b) {
            return;
          }
          const plays = legalPlays(board, player, roll);
          if (plays.length === 0 || plays[0].movements.length !== 1) {
            return;
          }
          const higher = Math.max(a, b) as Die;
          const higherIsPlayable =
            legalMovements(board, player, [higher]).length > 0;
          for (const play of plays) {
            const used = play.movements[0].die;
            if (higherIsPlayable && used !== higher) {
              throw new Error(
                `higher die ${higher} playable but play used ${used}`,
              );
            }
          }
        },
      ),
      { numRuns: 200 },
    );
  });

  test('enumerated plays are distinct by final position', () => {
    fc.assert(
      fc.property(
        arbitraryPosition,
        arbitraryPlayer,
        arbitraryRoll,
        (board, player, roll) => {
          const finals = new Set<string>();
          for (const play of legalPlays(board, player, roll)) {
            const final = play.movements.reduce(
              (b, m) => applyMovement(b, player, m),
              board,
            );
            const finalKey = key(final);
            if (finals.has(finalKey)) {
              throw new Error('two plays reach the same final position');
            }
            finals.add(finalKey);
          }
        },
      ),
      { numRuns: 200 },
    );
  });
});
