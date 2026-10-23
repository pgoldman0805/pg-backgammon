import { describe, expect, test } from 'vitest';
import { createBoard, initialBoard } from './board';
import type { DiceSource } from './dice';
import {
  applyTurnMovement,
  commitPlay,
  createGame,
  gameResult,
  startGame,
  undoTurnMovement,
} from './game';
import type { Die } from './types';

/** A scripted dice source: returns the given dies in order. */
function diceFrom(rolls: readonly Die[]): DiceSource {
  let i = 0;
  return {
    rollDie: () => {
      const die = rolls[i];
      if (die === undefined) {
        throw new Error('scripted dice exhausted');
      }
      i += 1;
      return die;
    },
  };
}

describe('startGame: opening roll', () => {
  test('each player rolls one die and the higher roller starts with both dice', () => {
    const game = startGame(diceFrom([3, 5]));
    expect(game.record.openingRolls).toEqual([{ white: 3, black: 5 }]);
    expect(game.record.firstPlayer).toBe('black');
    expect(game.turn?.player).toBe('black');
    expect(game.turn?.roll).toEqual([3, 5]);
    expect(game.turn?.remainingDice).toEqual([3, 5]);
    expect(game.board).toEqual(initialBoard());
  });

  test('equal opening dice are rerolled until they differ', () => {
    const game = startGame(diceFrom([4, 4, 2, 2, 6, 1]));
    expect(game.record.openingRolls).toEqual([
      { white: 4, black: 4 },
      { white: 2, black: 2 },
      { white: 6, black: 1 },
    ]);
    expect(game.record.firstPlayer).toBe('white');
    expect(game.turn?.roll).toEqual([6, 1]);
  });
});

describe('turn movements: apply and undo', () => {
  test('applying a movement consumes a die; undo restores board and dice', () => {
    const game = startGame(diceFrom([6, 1]));
    expect(game.turn?.player).toBe('white');

    const afterOne = applyTurnMovement(game, 13, 6);
    expect(afterOne.board.points[7]).toBe(1);
    expect(afterOne.turn?.remainingDice).toEqual([1]);

    const afterTwo = applyTurnMovement(afterOne, 7, 1);
    expect(afterTwo.board.points[6]).toBe(6);
    expect(afterTwo.turn?.remainingDice).toEqual([]);

    const undone = undoTurnMovement(afterTwo);
    expect(undone.board).toEqual(afterOne.board);
    expect(undone.turn?.remainingDice).toEqual([1]);

    const undoneAll = undoTurnMovement(undone);
    expect(undoneAll.board).toEqual(game.board);
    expect(undoneAll.turn?.remainingDice).toEqual([6, 1]);
  });

  test('an illegal movement throws', () => {
    const game = startGame(diceFrom([6, 1]));
    // White's 24-point checker cannot move 6 to black's anchor... point 18 is
    // open on the initial board, but moving from an empty point must throw.
    expect(() => applyTurnMovement(game, 2, 6)).toThrow(/illegal/i);
    // Using a die that is not part of the roll throws too.
    expect(() => applyTurnMovement(game, 13, 3)).toThrow(/die/i);
  });
});

describe('commitPlay', () => {
  test('records the play, switches players, and rolls the next turn', () => {
    const game = startGame(diceFrom([6, 1, 3, 3]));
    const moved = applyTurnMovement(applyTurnMovement(game, 13, 6), 7, 1);
    const committed = commitPlay(moved, diceFrom([5, 2]));

    expect(committed.record.plays).toHaveLength(1);
    expect(committed.record.plays[0].player).toBe('white');
    expect(committed.record.plays[0].movements).toHaveLength(2);
    expect(committed.turn?.player).toBe('black');
    expect(committed.turn?.roll).toEqual([5, 2]);
    expect(committed.turn?.remainingDice).toEqual([5, 2]);
  });

  test('rolling doubles gives the next player four dice', () => {
    const game = startGame(diceFrom([6, 1]));
    const moved = applyTurnMovement(applyTurnMovement(game, 13, 6), 7, 1);
    const committed = commitPlay(moved, diceFrom([4, 4]));
    expect(committed.turn?.remainingDice).toEqual([4, 4, 4, 4]);
  });

  test('rejects committing before the maximum number of dice is played', () => {
    const game = startGame(diceFrom([6, 1]));
    const oneMovement = applyTurnMovement(game, 13, 6);
    expect(() => commitPlay(oneMovement, diceFrom([5, 2]))).toThrow(/legal/i);
  });

  test('a dance commits with zero movements and passes the turn', () => {
    // White is on the bar with black holding every entry point.
    const board = createBoard({
      white: { points: { 1: 14 }, bar: 1 },
      black: { points: { 19: 2, 20: 2, 21: 2, 22: 2, 23: 2, 24: 2 }, off: 3 },
    });
    const game = createGame({ board, player: 'white', roll: [3, 5] });
    const committed = commitPlay(game, diceFrom([2, 6]));
    expect(committed.record.plays[0]).toEqual({
      player: 'white',
      roll: [3, 5],
      movements: [],
    });
    expect(committed.turn?.player).toBe('black');
  });

  test('bearing off the last checker ends the game without rolling again', () => {
    const board = createBoard({
      white: { points: { 2: 1 }, off: 14 },
      black: { points: { 24: 1, 23: 1 }, off: 13 },
    });
    const game = createGame({ board, player: 'white', roll: [6, 3] });
    // 2->off with the higher die is the forced single-die play... both dice:
    // 2->off(3 exact)? Let the engine say: apply the enumerated legal play.
    const moved = applyTurnMovement(game, 2, 3);
    const ended = commitPlay(moved, diceFrom([1, 1]));
    expect(ended.turn).toBeNull();
    expect(ended.result).toEqual({
      winner: 'white',
      kind: 'single',
      points: 1,
    });
  });
});

describe('gameResult', () => {
  test('no result while both players still have checkers in play', () => {
    expect(gameResult(initialBoard())).toBeNull();
  });

  test('single: the loser has borne off at least one checker', () => {
    const board = createBoard({
      white: { points: {}, off: 15 },
      black: { points: { 24: 14 }, off: 1 },
    });
    expect(gameResult(board)).toEqual({
      winner: 'white',
      kind: 'single',
      points: 1,
    });
  });

  test('gammon: the loser has borne off nothing', () => {
    const board = createBoard({
      white: { points: {}, off: 15 },
      black: { points: { 12: 15 } },
    });
    expect(gameResult(board)).toEqual({
      winner: 'white',
      kind: 'gammon',
      points: 2,
    });
  });

  test('backgammon: the loser additionally has a checker in the winner home board', () => {
    const board = createBoard({
      white: { points: {}, off: 15 },
      black: { points: { 3: 1, 12: 14 } },
    });
    expect(gameResult(board)).toEqual({
      winner: 'white',
      kind: 'backgammon',
      points: 3,
    });
  });

  test('backgammon: the loser additionally has a checker on the bar', () => {
    const board = createBoard({
      white: { points: {}, off: 15 },
      black: { points: { 12: 14 }, bar: 1 },
    });
    expect(gameResult(board)).toEqual({
      winner: 'white',
      kind: 'backgammon',
      points: 3,
    });
  });

  test('black wins a backgammon when white has a checker in black home board', () => {
    const board = createBoard({
      white: { points: { 22: 1, 12: 14 } },
      black: { points: {}, off: 15 },
    });
    expect(gameResult(board)).toEqual({
      winner: 'black',
      kind: 'backgammon',
      points: 3,
    });
  });
});
