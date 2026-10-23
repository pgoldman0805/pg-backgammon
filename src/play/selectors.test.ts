import { createBoard, createGame, type GameState } from '../rules';
import { scriptedDice } from '../test/dice';
import {
  canCommit,
  canUndo,
  destinationsFrom,
  forcedPlay,
  isDance,
  movableOrigins,
} from './selectors';
import { createPlayStore } from './store';

/** White to play 6-3 from the standard start position. */
function openingGame(): GameState {
  const store = createPlayStore({ dice: scriptedDice(6, 3) });
  store.dispatch({ type: 'start' });
  const game = store.getState().match?.game;
  if (!game) {
    throw new Error('game did not start');
  }
  return game;
}

describe('destinations and origins', () => {
  it('offers both dice as destinations from a free origin', () => {
    const destinations = destinationsFrom(openingGame(), 24);

    expect(destinations).toHaveLength(2);
    expect(destinations).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ to: 18, die: 6 }),
        expect.objectContaining({ to: 21, die: 3 }),
      ]),
    );
  });

  it('offers nothing from an opponent or empty point', () => {
    const game = openingGame();
    expect(destinationsFrom(game, 1)).toEqual([]);
    expect(destinationsFrom(game, 2)).toEqual([]);
  });

  it('lists exactly the origins with at least one viable movement', () => {
    expect(movableOrigins(openingGame())).toEqual([6, 8, 13, 24]);
  });

  it('excludes movements that would strand the other die', () => {
    // White can play both dice only via 13/7 then 8/5 (or 8/5 then 13/7):
    // after 13/10, both sixes (10/4, 8/2) are blocked. 13/10 is individually
    // legal but must not be offered.
    const board = createBoard({
      white: { points: { 13: 1, 8: 1 }, off: 13 },
      black: { points: { 2: 2, 4: 2, 10: 2, 19: 9 } },
    });
    const game = createGame({ board, player: 'white', roll: [6, 3] });

    expect(destinationsFrom(game, 13)).toEqual([
      expect.objectContaining({ to: 7, die: 6 }),
    ]);
    expect(destinationsFrom(game, 8)).toEqual([
      expect.objectContaining({ to: 5, die: 3 }),
    ]);
  });

  it('enforces the higher-die rule when only one die can be played', () => {
    // Only one die fits: 24/18 (6) or 24/21 (3), and 15 is blocked so no
    // second movement follows either. The engine keeps only the higher die.
    const board = createBoard({
      white: { points: { 24: 1 }, off: 14 },
      black: { points: { 15: 2, 1: 13 } },
    });
    const game = createGame({ board, player: 'white', roll: [6, 3] });

    expect(destinationsFrom(game, 24)).toEqual([
      expect.objectContaining({ to: 18, die: 6 }),
    ]);
  });
});

describe('commit and undo gates', () => {
  it('blocks commit until the play is complete, then allows it', () => {
    const store = createPlayStore({ dice: scriptedDice(6, 3) });
    store.dispatch({ type: 'start' });
    const game = () => store.getState().match?.game ?? null;
    expect(canCommit(game())).toBe(false);

    store.dispatch({ type: 'movement', from: 24, die: 6 });
    expect(canCommit(game())).toBe(false);
    expect(canUndo(game())).toBe(true);

    store.dispatch({ type: 'movement', from: 18, die: 3 });
    expect(canCommit(game())).toBe(true);
  });

  it('disallows undo at the start of a turn', () => {
    expect(canUndo(openingGame())).toBe(false);
  });
});

describe('dance and forced plays', () => {
  it('recognises a dance and allows committing it untouched', () => {
    // White is on the bar and black's home board is closed.
    const board = createBoard({
      white: { points: { 13: 14 }, bar: 1 },
      black: {
        points: { 19: 2, 20: 2, 21: 2, 22: 2, 23: 2, 24: 2, 17: 3 },
      },
    });
    const game = createGame({ board, player: 'white', roll: [6, 3] });

    expect(isDance(game)).toBe(true);
    expect(movableOrigins(game)).toEqual([]);
    expect(canCommit(game)).toBe(true);
  });

  it('surfaces the single legal play of a forced turn', () => {
    const board = createBoard({
      white: { points: { 24: 1 }, off: 14 },
      black: { points: { 15: 2, 1: 13 } },
    });
    const game = createGame({ board, player: 'white', roll: [6, 3] });

    const forced = forcedPlay(game);
    expect(forced?.movements).toEqual([
      expect.objectContaining({ from: 24, to: 18, die: 6 }),
    ]);
    expect(isDance(game)).toBe(false);
  });

  it('reports no forced play when alternatives exist', () => {
    expect(forcedPlay(openingGame())).toBeNull();
  });
});
