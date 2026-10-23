/**
 * diffBoards (ticket 20): the pure diff between two board positions, naming
 * which checkers moved where, so the Board can animate exactly those as
 * travel between coordinates.
 */

import { applyMovement, createBoard, initialBoard } from '../rules';
import { diffBoards } from './checkerTravel';

describe('diffBoards', () => {
  it('reports no moves for an unchanged board', () => {
    const board = initialBoard();
    expect(diffBoards(board, board)).toEqual([]);
  });

  it('names the single checker a movement slides', () => {
    const before = initialBoard();
    const after = applyMovement(before, 'white', {
      from: 24,
      die: 6,
      to: 18,
      hit: false,
    });

    expect(diffBoards(before, after)).toEqual([
      { player: 'white', from: 24, to: 18 },
    ]);
  });

  it('includes the hit blot going to the bar', () => {
    // Black has a blot on 18 instead of a 5th checker on 12.
    const withBlot = createBoard({
      white: { points: { 24: 2, 13: 5, 8: 3, 6: 5 } },
      black: { points: { 1: 2, 12: 4, 17: 3, 18: 1, 19: 5 } },
    });
    const after = applyMovement(withBlot, 'white', {
      from: 24,
      die: 6,
      to: 18,
      hit: true,
    });

    const moves = diffBoards(withBlot, after);
    expect(moves).toEqual(
      expect.arrayContaining([
        { player: 'white', from: 24, to: 18 },
        { player: 'black', from: 18, to: 'bar' },
      ]),
    );
    expect(moves).toHaveLength(2);
  });

  it('names a bear-off as travel to off', () => {
    const before = createBoard({
      white: { points: { 6: 5, 5: 5, 4: 5 } },
      black: { points: { 19: 5, 20: 5, 21: 5 } },
    });
    const after = applyMovement(before, 'white', {
      from: 6,
      die: 6,
      to: 'off',
      hit: false,
    });

    expect(diffBoards(before, after)).toEqual([
      { player: 'white', from: 6, to: 'off' },
    ]);
  });

  it('names a bar re-entry as travel from the bar', () => {
    const before = createBoard({
      white: { points: { 13: 5, 8: 4, 6: 5 }, bar: 1 },
      black: { points: { 1: 2, 12: 5, 17: 3, 19: 5 } },
    });
    const after = applyMovement(before, 'white', {
      from: 'bar',
      die: 3,
      to: 22,
      hit: false,
    });

    expect(diffBoards(before, after)).toEqual([
      { player: 'white', from: 'bar', to: 22 },
    ]);
  });

  it('reads an undone bear-off as travel back from off', () => {
    const before = createBoard({
      white: { points: { 6: 5, 5: 5, 4: 4 }, off: 1 },
      black: { points: { 19: 5, 20: 5, 21: 5 } },
    });
    const after = createBoard({
      white: { points: { 6: 5, 5: 5, 4: 5 } },
      black: { points: { 19: 5, 20: 5, 21: 5 } },
    });

    expect(diffBoards(before, after)).toEqual([
      { player: 'white', from: 'off', to: 4 },
    ]);
  });

  it('pairs a multi-checker takeback sensibly, farthest origin first', () => {
    // Undoing 24/18 13/10: both checkers return toward White's rear.
    const start = initialBoard();
    const played = applyMovement(
      applyMovement(start, 'white', { from: 24, die: 6, to: 18, hit: false }),
      'white',
      { from: 13, die: 3, to: 10, hit: false },
    );

    const moves = diffBoards(played, start);
    expect(moves).toEqual(
      expect.arrayContaining([
        { player: 'white', from: 18, to: 24 },
        { player: 'white', from: 10, to: 13 },
      ]),
    );
    expect(moves).toHaveLength(2);
  });
});
