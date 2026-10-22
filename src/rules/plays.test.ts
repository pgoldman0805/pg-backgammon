import { describe, expect, test } from 'vitest';
import { applyMovement, createBoard, initialBoard } from './board';
import { legalPlays } from './plays';
import type { BoardState, Play } from './types';

/** Apply all of a play's movements to a board. */
function applyPlay(board: BoardState, play: Play): BoardState {
  return play.movements.reduce((b, m) => applyMovement(b, play.player, m), board);
}

describe('legalPlays: using both dice', () => {
  test('two routes to the same final point collapse into one play', () => {
    // White's only mover is on 10; 10->8->7 and 10->9->7 end identically.
    const board = createBoard({
      white: { points: { 10: 1 }, off: 14 },
      black: { points: { 24: 1 }, off: 14 },
    });
    const plays = legalPlays(board, 'white', [2, 1]);
    expect(plays).toHaveLength(1);
    expect(plays[0].movements).toHaveLength(2);
    expect(plays[0].player).toBe('white');
    expect(plays[0].roll).toEqual([2, 1]);
    const final = applyPlay(board, plays[0]);
    expect(final.points[7]).toBe(1);
    expect(final.points[10]).toBe(0);
  });

  test('routes that hit a blot stay distinct from routes that do not', () => {
    // 10->8 hits a black blot; 10->9->7 passes it by. Different final
    // positions, so both plays must be enumerated.
    const board = createBoard({
      white: { points: { 10: 1 }, off: 14 },
      black: { points: { 8: 1, 24: 1 }, off: 13 },
    });
    const plays = legalPlays(board, 'white', [2, 1]);
    expect(plays).toHaveLength(2);
    const hitting = plays.filter((p) => p.movements.some((m) => m.to === 8 && m.hit));
    expect(hitting).toHaveLength(1);
    expect(applyPlay(board, hitting[0]).bar.black).toBe(1);
  });

  test('the opening 3-1 includes the golden-point play 8/5 6/5', () => {
    const plays = legalPlays(initialBoard(), 'white', [3, 1]);
    const goldenPoint = plays.filter((p) => {
      const final = applyPlay(initialBoard(), p);
      return final.points[5] === 2 && final.points[8] === 2 && final.points[6] === 4;
    });
    expect(goldenPoint).toHaveLength(1);
    for (const play of plays) {
      expect(play.movements).toHaveLength(2);
    }
  });

  test('a play that would strand the second die is excluded when another order plays both', () => {
    // 24->18 (6) is blocked; 24->19 (5) then 19->13 (6) plays both dice.
    // Stopping after only the 5 would violate the must-use-both-dice rule.
    const board = createBoard({
      white: { points: { 24: 1, 1: 14 } },
      black: { points: { 18: 2 }, off: 13 },
    });
    const plays = legalPlays(board, 'white', [6, 5]);
    expect(plays).toHaveLength(1);
    expect(plays[0].movements).toEqual([
      { from: 24, to: 19, die: 5, hit: false },
      { from: 19, to: 13, die: 6, hit: false },
    ]);
  });

  test('black moves ascending and is blocked by white-held points', () => {
    const board = createBoard({
      white: { points: { 3: 2 }, off: 13 },
      black: { points: { 1: 1, 24: 14 } },
    });
    const plays = legalPlays(board, 'black', [2, 4]);
    // 1->3 is blocked, so the only route is 1->5 (4) then 5->7 (2).
    expect(plays).toHaveLength(1);
    expect(plays[0].movements).toEqual([
      { from: 1, to: 5, die: 4, hit: false },
      { from: 5, to: 7, die: 2, hit: false },
    ]);
  });
});

describe('legalPlays: when only one die can be played', () => {
  test('the higher die must be played when either (but not both) is possible', () => {
    // From 24, the 4 reaches 20 and the 3 reaches 21, but 17 is blocked so
    // the second die can never be played. The higher die (4) is compulsory.
    const board = createBoard({
      white: { points: { 24: 1, 1: 14 } },
      black: { points: { 17: 2 }, off: 13 },
    });
    const plays = legalPlays(board, 'white', [4, 3]);
    expect(plays).toHaveLength(1);
    expect(plays[0].movements).toEqual([{ from: 24, to: 20, die: 4, hit: false }]);
  });

  test('the lower die is played when the higher die has no legal movement', () => {
    const board = createBoard({
      white: { points: { 24: 1, 1: 14 } },
      black: { points: { 20: 2, 17: 2 }, off: 11 },
    });
    const plays = legalPlays(board, 'white', [4, 3]);
    expect(plays).toHaveLength(1);
    expect(plays[0].movements).toEqual([{ from: 24, to: 21, die: 3, hit: false }]);
  });

  test('a fully blocked roll is a dance: no legal plays', () => {
    const board = createBoard({
      white: { points: { 1: 14 }, bar: 1 },
      black: { points: { 19: 2, 20: 2, 21: 2, 22: 2, 23: 2, 24: 2 }, off: 3 },
    });
    expect(legalPlays(board, 'white', [3, 5])).toEqual([]);
  });
});

describe('legalPlays: bar entry', () => {
  test('a checker on the bar must enter before any other movement', () => {
    // Entry with the 3 (point 22) is blocked; entry with the 5 (point 20)
    // is open. Every play must start with the bar entry.
    const board = createBoard({
      white: { points: { 13: 1 }, bar: 1, off: 13 },
      black: { points: { 22: 2 }, off: 13 },
    });
    const plays = legalPlays(board, 'white', [3, 5]);
    expect(plays).toHaveLength(2);
    for (const play of plays) {
      expect(play.movements[0]).toEqual({ from: 'bar', to: 20, die: 5, hit: false });
    }
    const destinations = plays.map((p) => Number(p.movements[1].to)).sort((x, y) => x - y);
    expect(destinations).toEqual([10, 17]); // 13->10 or 20->17 with the 3
  });

  test('black enters from the bar on the point matching the die', () => {
    const board = createBoard({
      white: { points: { 3: 2 }, off: 13 },
      black: { points: { 24: 14 }, bar: 1 },
    });
    const plays = legalPlays(board, 'black', [3, 5]);
    // Entry with the 3 (point 3) is blocked; enter on 5, then 5->8.
    expect(plays).toHaveLength(1);
    expect(plays[0].movements).toEqual([
      { from: 'bar', to: 5, die: 5, hit: false },
      { from: 5, to: 8, die: 3, hit: false },
    ]);
  });
});

describe('legalPlays: doubles', () => {
  test('doubles play four movements when possible', () => {
    const board = createBoard({
      white: { points: { 24: 1, 1: 14 } },
      black: { points: { 10: 2 }, off: 13 },
    });
    const plays = legalPlays(board, 'white', [2, 2]);
    expect(plays).toHaveLength(1);
    expect(plays[0].movements).toHaveLength(4);
    const final = applyPlay(board, plays[0]);
    expect(final.points[16]).toBe(1);
  });

  test('doubles play as many movements as the position allows', () => {
    const board = createBoard({
      white: { points: { 24: 1, 1: 14 } },
      black: { points: { 18: 2 }, off: 13 },
    });
    const plays = legalPlays(board, 'white', [2, 2]);
    expect(plays).toHaveLength(1);
    expect(plays[0].movements).toEqual([
      { from: 24, to: 22, die: 2, hit: false },
      { from: 22, to: 20, die: 2, hit: false },
    ]);
  });
});

describe('legalPlays: bearing off', () => {
  test('must use both dice even when an immediate exact bear-off exists', () => {
    // Bearing off 4->off with the 4 strands the 2; playing 4->2 then
    // 2->off (overshooting with the 4) uses both dice, so it is forced.
    const board = createBoard({
      white: { points: { 4: 1 }, off: 14 },
      black: { points: { 24: 1 }, off: 14 },
    });
    const plays = legalPlays(board, 'white', [4, 2]);
    expect(plays).toHaveLength(1);
    expect(plays[0].movements).toEqual([
      { from: 4, to: 2, die: 2, hit: false },
      { from: 2, to: 'off', die: 4, hit: false },
    ]);
  });

  test('an overshooting die bears off only from the highest occupied point', () => {
    const board = createBoard({
      white: { points: { 5: 1, 3: 1 }, off: 13 },
      black: { points: { 24: 1 }, off: 14 },
    });
    const plays = legalPlays(board, 'white', [6, 6]);
    expect(plays).toHaveLength(1);
    expect(plays[0].movements).toEqual([
      { from: 5, to: 'off', die: 6, hit: false },
      { from: 3, to: 'off', die: 6, hit: false },
    ]);
  });

  test('with a checker on a higher point, the die must move inside the board first', () => {
    // 2->off with a 5 is illegal while 6 is occupied; the forced sequence
    // plays 6->1, after which both remaining checkers bear off.
    const board = createBoard({
      white: { points: { 6: 1, 2: 1 }, off: 13 },
      black: { points: { 24: 1 }, off: 14 },
    });
    const plays = legalPlays(board, 'white', [5, 5]);
    expect(plays).toHaveLength(1);
    expect(plays[0].movements).toEqual([
      { from: 6, to: 1, die: 5, hit: false },
      { from: 2, to: 'off', die: 5, hit: false },
      { from: 1, to: 'off', die: 5, hit: false },
    ]);
  });

  test('no bear-off while a checker remains outside the home board', () => {
    const board = createBoard({
      white: { points: { 6: 1, 7: 1 }, off: 13 },
      black: { points: { 24: 1 }, off: 14 },
    });
    const plays = legalPlays(board, 'white', [6, 1]);
    for (const play of plays) {
      const bearOffFirst = play.movements[0];
      if (bearOffFirst.to === 'off') {
        // Only legal if the 7-point checker came home first.
        expect(play.movements[0].from).not.toBe(6);
      }
    }
    // 6->off with the 6 while 7 is occupied must not be enumerated.
    const illegal = plays.filter(
      (p) => p.movements[0].from === 6 && p.movements[0].to === 'off',
    );
    expect(illegal).toEqual([]);
  });
});
