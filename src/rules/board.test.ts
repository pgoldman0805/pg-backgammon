import { describe, expect, test } from 'vitest';
import {
  applyMovement,
  createBoard,
  initialBoard,
  isRace,
  pipCount,
  undoMovement,
} from './board';

describe('initialBoard', () => {
  test('sets up the standard backgammon starting position', () => {
    const board = initialBoard();
    // White moves 24 -> 1; home board is points 1-6.
    expect(board.points[24]).toBe(2); // 2 white on 24
    expect(board.points[13]).toBe(5); // 5 white on 13
    expect(board.points[8]).toBe(3); // 3 white on 8
    expect(board.points[6]).toBe(5); // 5 white on 6
    // Black moves 1 -> 24; home board is points 19-24. Negative = black.
    expect(board.points[1]).toBe(-2);
    expect(board.points[12]).toBe(-5);
    expect(board.points[17]).toBe(-3);
    expect(board.points[19]).toBe(-5);
    expect(board.bar).toEqual({ white: 0, black: 0 });
    expect(board.off).toEqual({ white: 0, black: 0 });
  });

  test('every other point starts empty', () => {
    const board = initialBoard();
    const occupied = [24, 13, 8, 6, 1, 12, 17, 19];
    for (let p = 1; p <= 24; p++) {
      if (!occupied.includes(p)) {
        expect(board.points[p]).toBe(0);
      }
    }
  });
});

describe('pipCount', () => {
  test('both players start at 167', () => {
    const board = initialBoard();
    expect(pipCount(board, 'white')).toBe(167);
    expect(pipCount(board, 'black')).toBe(167);
  });

  test('a checker on the bar counts 25 pips; borne-off checkers count 0', () => {
    const board = createBoard({
      white: { points: {}, bar: 1, off: 14 },
      black: { points: { 24: 1 }, off: 14 },
    });
    expect(pipCount(board, 'white')).toBe(25);
    expect(pipCount(board, 'black')).toBe(1);
  });
});

describe('createBoard', () => {
  test('builds a position from per-player checker placements', () => {
    const board = createBoard({
      white: { points: { 6: 2, 13: 3 }, bar: 1, off: 9 },
      black: { points: { 19: 5 }, off: 10 },
    });
    expect(board.points[6]).toBe(2);
    expect(board.points[13]).toBe(3);
    expect(board.points[19]).toBe(-5);
    expect(board.bar).toEqual({ white: 1, black: 0 });
    expect(board.off).toEqual({ white: 9, black: 10 });
  });

  test('rejects a player with other than 15 checkers in total', () => {
    expect(() =>
      createBoard({
        white: { points: { 6: 2 }, off: 1 },
        black: { points: {}, off: 15 },
      }),
    ).toThrow(/15/);
  });

  test('rejects both players occupying the same point', () => {
    expect(() =>
      createBoard({
        white: { points: { 6: 15 } },
        black: { points: { 6: 15 } },
      }),
    ).toThrow(/point 6/i);
  });
});

describe('isRace', () => {
  test('the starting position is not a race', () => {
    expect(isRace(initialBoard())).toBe(false);
  });

  test('both sides fully home with no contact is a race', () => {
    const board = createBoard({
      white: { points: { 6: 5, 5: 5, 4: 5 } },
      black: { points: { 19: 5, 20: 5, 21: 5 } },
    });
    expect(isRace(board)).toBe(true);
  });

  test('a bear-off against checkers left behind is still a race once past them', () => {
    const board = createBoard({
      white: { points: { 3: 2, 1: 3 }, off: 10 },
      black: { points: { 12: 5, 18: 5, 22: 5 } },
    });
    expect(isRace(board)).toBe(true);
  });

  test('the last crossing: rear checkers one point apart, already passed', () => {
    // White's rearmost on 10, black's rearmost on 11: nobody can hit.
    const board = createBoard({
      white: { points: { 10: 1, 5: 9, 3: 5 } },
      black: { points: { 11: 1, 20: 9, 22: 5 } },
    });
    expect(isRace(board)).toBe(true);
  });

  test('the last crossing: rear checkers still facing each other is contact', () => {
    // White's rearmost on 11, black's rearmost on 10: black can hit white.
    const board = createBoard({
      white: { points: { 11: 1, 5: 9, 3: 5 } },
      black: { points: { 10: 1, 20: 9, 22: 5 } },
    });
    expect(isRace(board)).toBe(false);
  });

  test('a checker on the bar means contact while the opponent has checkers in play', () => {
    const board = createBoard({
      white: { points: { 5: 9, 3: 5 }, bar: 1 },
      black: { points: { 19: 5, 20: 5, 21: 5 } },
    });
    expect(isRace(board)).toBe(false);
  });

  test('a player with every checker borne off cannot be contacted', () => {
    const board = createBoard({
      white: { points: {}, off: 15 },
      black: { points: { 1: 10, 2: 5 } },
    });
    expect(isRace(board)).toBe(true);
  });
});

describe('applyMovement and undoMovement', () => {
  test('moves a white checker to a lower point and back', () => {
    const board = initialBoard();
    const movement = { from: 13, to: 9, die: 4 as const, hit: false };
    const after = applyMovement(board, 'white', movement);
    expect(after.points[13]).toBe(4);
    expect(after.points[9]).toBe(1);
    expect(undoMovement(after, 'white', movement)).toEqual(board);
  });

  test('hitting a blot sends it to the bar, and undo restores it', () => {
    const board = createBoard({
      white: { points: { 10: 1 }, off: 14 },
      black: { points: { 8: 1 }, off: 14 },
    });
    const movement = { from: 10, to: 8, die: 2 as const, hit: true };
    const after = applyMovement(board, 'white', movement);
    expect(after.points[8]).toBe(1);
    expect(after.bar.black).toBe(1);
    expect(undoMovement(after, 'white', movement)).toEqual(board);
  });

  test('entering from the bar and bearing off both round-trip through undo', () => {
    const board = createBoard({
      white: { points: { 3: 1 }, bar: 1, off: 13 },
      black: { points: { 1: 2 }, off: 13 },
    });
    const entry = { from: 'bar' as const, to: 21, die: 4 as const, hit: false };
    const entered = applyMovement(board, 'white', entry);
    expect(entered.bar.white).toBe(0);
    expect(entered.points[21]).toBe(1);
    expect(undoMovement(entered, 'white', entry)).toEqual(board);

    const bearOff = {
      from: 3,
      to: 'off' as const,
      die: 3 as const,
      hit: false,
    };
    const borneOff = applyMovement(board, 'white', bearOff);
    expect(borneOff.off.white).toBe(14);
    expect(borneOff.points[3]).toBe(0);
    expect(undoMovement(borneOff, 'white', bearOff)).toEqual(board);
  });

  test('black movements mirror white: ascending points, own bar and off', () => {
    const board = initialBoard();
    const movement = { from: 1, to: 5, die: 4 as const, hit: false };
    const after = applyMovement(board, 'black', movement);
    expect(after.points[1]).toBe(-1);
    expect(after.points[5]).toBe(-1);
    expect(undoMovement(after, 'black', movement)).toEqual(board);
  });
});
