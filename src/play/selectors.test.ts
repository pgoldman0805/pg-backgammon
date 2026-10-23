import {
  createBoard,
  createGame,
  type GameState,
  initialBoard,
} from '../rules';
import { scriptedDice } from '../test/dice';
import {
  canCommit,
  canUndo,
  destinationsFrom,
  forcedPlay,
  isDance,
  movableOrigins,
  twoMovementDestinationsFrom,
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

describe('two-movement destinations', () => {
  it('offers the final point when both die orders produce the identical board', () => {
    // Opening 6-3 from 24: 24/18/15 and 24/21/15 both end with the checker on
    // 15 and no hits, so the final target is unambiguous. The movements come
    // in dispatch order, larger die first.
    const twos = twoMovementDestinationsFrom(openingGame(), 24);

    const to15 = twos.find((d) => d.to === 15);
    expect(to15).toBeDefined();
    expect(to15?.movements).toEqual([
      expect.objectContaining({ from: 24, to: 18, die: 6 }),
      expect.objectContaining({ from: 18, to: 15, die: 3 }),
    ]);
  });

  it('rejects a target the die orders reach with different hits', () => {
    // Black blots on 18: 24/18*/15 hits, 24/21/15 does not. The same final
    // point yields two different boards, so no shortcut is offered — the
    // player picks the path per movement.
    const board = createBoard({
      white: { points: { 24: 1, 13: 1 }, off: 13 },
      black: { points: { 18: 1, 19: 14 } },
    });
    const game = createGame({ board, player: 'white', roll: [6, 3] });

    expect(twoMovementDestinationsFrom(game, 24)).toEqual([]);
  });

  it('offers the target when only one die order is legal', () => {
    // Black owns 21, so only 24/18/15 exists; one unambiguous path.
    const board = createBoard({
      white: { points: { 24: 1, 13: 1 }, off: 13 },
      black: { points: { 21: 2, 19: 13 } },
    });
    const game = createGame({ board, player: 'white', roll: [6, 3] });

    expect(twoMovementDestinationsFrom(game, 24)).toEqual([
      {
        to: 15,
        movements: [
          expect.objectContaining({ from: 24, to: 18, die: 6 }),
          expect.objectContaining({ from: 18, to: 15, die: 3 }),
        ],
      },
    ]);
  });

  it('keeps the only legal order even when the smaller die goes first', () => {
    // Black owns 18, so the checker must route 24/21/15: smaller die first.
    const board = createBoard({
      white: { points: { 24: 1, 13: 1 }, off: 13 },
      black: { points: { 18: 2, 19: 13 } },
    });
    const game = createGame({ board, player: 'white', roll: [6, 3] });

    expect(twoMovementDestinationsFrom(game, 24)).toEqual([
      {
        to: 15,
        movements: [
          expect.objectContaining({ from: 24, to: 21, die: 3 }),
          expect.objectContaining({ from: 21, to: 15, die: 6 }),
        ],
      },
    ]);
  });

  it('offers two of the remaining identical dice on doubles', () => {
    const game = createGame({
      board: initialBoard(),
      player: 'white',
      roll: [3, 3],
    });

    const twos = twoMovementDestinationsFrom(game, 24);
    expect(twos).toEqual([
      {
        to: 18,
        movements: [
          expect.objectContaining({ from: 24, to: 21, die: 3 }),
          expect.objectContaining({ from: 21, to: 18, die: 3 }),
        ],
      },
    ]);
  });

  it('offers bear-off as the final target, larger die first', () => {
    // From 5 with 3-2: 5/2 then 2/off, or 5/3 then 3/off — identical boards.
    const board = createBoard({
      white: { points: { 5: 1, 4: 1 }, off: 13 },
      black: { points: { 24: 2, 23: 13 } },
    });
    const game = createGame({ board, player: 'white', roll: [3, 2] });

    expect(twoMovementDestinationsFrom(game, 5)).toEqual([
      {
        to: 'off',
        movements: [
          expect.objectContaining({ from: 5, to: 2, die: 3 }),
          expect.objectContaining({ from: 2, to: 'off', die: 2 }),
        ],
      },
    ]);
  });

  it('cedes a target one die already reaches (bear-off collision)', () => {
    // From 6 with 6-3 the 6 bears off directly; the 6/3, 3/off route to the
    // same tray is not offered — the one-die action wins.
    const board = createBoard({
      white: { points: { 6: 1, 2: 1 }, off: 13 },
      black: { points: { 24: 2, 23: 13 } },
    });
    const game = createGame({ board, player: 'white', roll: [6, 3] });

    expect(destinationsFrom(game, 6)).toEqual(
      expect.arrayContaining([expect.objectContaining({ to: 'off', die: 6 })]),
    );
    expect(twoMovementDestinationsFrom(game, 6)).toEqual([]);
  });

  it('offers nothing when only one die remains', () => {
    const store = createPlayStore({ dice: scriptedDice(6, 3) });
    store.dispatch({ type: 'start' });
    store.dispatch({ type: 'movement', from: 24, die: 6 });
    const game = store.getState().match?.game ?? null;

    expect(twoMovementDestinationsFrom(game, 13)).toEqual([]);
  });

  it('offers nothing when the higher-die rule caps the play at one movement', () => {
    // Only one die fits anywhere (the engine keeps the higher): no checker
    // can use two dice, so there is nothing to shortcut.
    const board = createBoard({
      white: { points: { 24: 1 }, off: 14 },
      black: { points: { 15: 2, 1: 13 } },
    });
    const game = createGame({ board, player: 'white', roll: [6, 3] });

    expect(twoMovementDestinationsFrom(game, 24)).toEqual([]);
  });

  it('excludes paths whose continuation is blocked (dead-end anchoring)', () => {
    // The stranding board from `viableMovements`: from 13 both routes toward
    // 4 are blocked (black owns 4), and from 8 no second movement exists, so
    // neither origin gets a shortcut even though single movements abound.
    const board = createBoard({
      white: { points: { 13: 1, 8: 1 }, off: 13 },
      black: { points: { 2: 2, 4: 2, 10: 2, 19: 9 } },
    });
    const game = createGame({ board, player: 'white', roll: [6, 3] });

    expect(twoMovementDestinationsFrom(game, 13)).toEqual([]);
    expect(twoMovementDestinationsFrom(game, 8)).toEqual([]);
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
