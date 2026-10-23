import { describe, expect, it } from 'vitest';
import type { BoardState, DiceRoll, Player } from '../rules';
import { applyMovement, createBoard, initialBoard } from '../rules';
import { matchPlayByMoveText } from './moveText';

function finalBoard(
  board: BoardState,
  player: Player,
  movements: ReturnType<typeof matchPlayByMoveText>['movements'],
): BoardState {
  let next = board;
  for (const movement of movements) {
    next = applyMovement(next, player, movement);
  }
  return next;
}

describe('matchPlayByMoveText', () => {
  it('matches a simple two-checker play', () => {
    const board = initialBoard();
    const play = matchPlayByMoveText(board, 'white', [3, 1], '8/5 6/5');
    const after = finalBoard(board, 'white', play.movements);
    expect(after.points[5]).toBe(2);
    expect(after.points[8]).toBe(2);
    expect(after.points[6]).toBe(4);
  });

  it('matches a compound single-checker move using both dice', () => {
    const board = initialBoard();
    const play = matchPlayByMoveText(board, 'white', [3, 1], '24/20');
    expect(play.movements).toHaveLength(2);
    const after = finalBoard(board, 'white', play.movements);
    expect(after.points[24]).toBe(1);
    expect(after.points[20]).toBe(1);
  });

  it('matches doubles with (n) repetition', () => {
    const board = initialBoard();
    const play = matchPlayByMoveText(board, 'white', [3, 3], '8/5(2) 6/3(2)');
    expect(play.movements).toHaveLength(4);
    const after = finalBoard(board, 'white', play.movements);
    expect(after.points[5]).toBe(2);
    expect(after.points[3]).toBe(2);
  });

  it('matches bar entry', () => {
    const board = createBoard({
      white: { points: { 24: 2, 13: 5, 8: 3, 6: 4 }, bar: 1 },
      black: { points: { 1: 2, 12: 5, 17: 3, 19: 5 } },
    });
    const play = matchPlayByMoveText(board, 'white', [4, 2], 'bar/21 13/11');
    const after = finalBoard(board, 'white', play.movements);
    expect(after.bar.white).toBe(0);
    expect(after.points[21]).toBe(1);
    expect(after.points[11]).toBe(1);
  });

  it('matches bear-off', () => {
    const board = createBoard({
      white: {
        points: { 6: 3, 5: 2, 4: 2, 3: 2, 2: 2, 1: 2 },
        off: 2,
      },
      black: { points: { 24: 2, 19: 5, 17: 3, 12: 5 } },
    });
    const play = matchPlayByMoveText(board, 'white', [6, 1], '6/5 6/off');
    const after = finalBoard(board, 'white', play.movements);
    expect(after.off.white).toBe(3);
    expect(after.points[6]).toBe(1);
  });

  it('matches a compound move with intermediate hits', () => {
    const board = createBoard({
      white: { points: { 24: 2, 13: 5, 8: 3, 6: 5 } },
      black: { points: { 22: 1, 18: 1, 12: 5, 17: 3, 19: 3, 1: 2 } },
    });
    const play = matchPlayByMoveText(board, 'white', [2, 4], '24/22*/18*');
    expect(play.movements.filter((m) => m.hit)).toHaveLength(2);
    const after = finalBoard(board, 'white', play.movements);
    expect(after.bar.black).toBe(2);
    expect(after.points[18]).toBe(1);
  });

  it('maps hero-relative points for black', () => {
    // Black's 24-point is absolute 1; black's 18 is absolute 7.
    const board = initialBoard();
    const play = matchPlayByMoveText(board, 'black', [6, 5], '24/18 18/13');
    const after = finalBoard(board, 'black', play.movements);
    expect(after.points[1]).toBe(-1);
    expect(after.points[12]).toBe(-6);
  });

  it('throws when the notation matches no legal play', () => {
    expect(() =>
      matchPlayByMoveText(initialBoard(), 'white', [3, 1] as DiceRoll, '1/off'),
    ).toThrow(/no legal play/i);
  });
});
