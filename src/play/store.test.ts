import { createBoard, createGame, createSeededDice, type Die } from '../rules';
import { scriptedDice } from '../test/dice';
import { canCommit, viableMovements } from './selectors';
import { createPlayStore, type PlayStore } from './store';

/** A store whose game opens with white to play 6-3 from the start position. */
function startedStore(...laterRolls: Die[]): PlayStore {
  const store = createPlayStore({ dice: scriptedDice(6, 3, ...laterRolls) });
  store.dispatch({ type: 'start' });
  return store;
}

describe('starting a game', () => {
  it('holds no game until start is dispatched', () => {
    const store = createPlayStore({ dice: scriptedDice() });
    expect(store.getState().game).toBeNull();
  });

  it('begins with the opening roll decided by the dice source', () => {
    const store = createPlayStore({ dice: scriptedDice(6, 3) });
    store.dispatch({ type: 'start' });

    const game = store.getState().game;
    expect(game?.turn?.player).toBe('white');
    expect(game?.turn?.roll).toEqual([6, 3]);
  });

  it('notifies subscribers when the state changes', () => {
    const store = createPlayStore({ dice: scriptedDice(2, 5) });
    let notified = 0;
    store.subscribe(() => {
      notified += 1;
    });

    store.dispatch({ type: 'start' });

    expect(notified).toBe(1);
  });
});

describe('playing a turn', () => {
  it('applies a legal movement and consumes the die', () => {
    const store = startedStore();

    store.dispatch({ type: 'movement', from: 24, die: 6 });

    const game = store.getState().game;
    expect(game?.board.points[24]).toBe(1);
    expect(game?.board.points[18]).toBe(1);
    expect(game?.turn?.remainingDice).toEqual([3]);
  });

  it('ignores an illegal movement, leaving the state untouched', () => {
    const store = startedStore();
    const before = store.getState();

    // Point 1 belongs to black; white cannot move from it.
    store.dispatch({ type: 'movement', from: 1, die: 6 });

    expect(store.getState()).toBe(before);
  });

  it('undo restores the intermediate state, then the turn start', () => {
    const store = startedStore();
    store.dispatch({ type: 'movement', from: 24, die: 6 });
    const afterFirst = store.getState().game;
    store.dispatch({ type: 'movement', from: 18, die: 3 });

    store.dispatch({ type: 'undo' });
    expect(store.getState().game?.board).toEqual(afterFirst?.board);
    expect(store.getState().game?.turn?.remainingDice).toEqual([3]);

    store.dispatch({ type: 'undo' });
    expect(store.getState().game?.board.points[24]).toBe(2);
    expect(store.getState().game?.turn?.remainingDice).toEqual([6, 3]);
  });

  it('ignores undo when nothing has been moved this turn', () => {
    const store = startedStore();
    const before = store.getState();

    store.dispatch({ type: 'undo' });

    expect(store.getState()).toBe(before);
  });

  it('refuses to commit an incomplete play', () => {
    const store = startedStore();
    store.dispatch({ type: 'movement', from: 24, die: 6 });
    const before = store.getState();

    store.dispatch({ type: 'commit' });

    expect(store.getState()).toBe(before);
  });

  it('commits a complete play and hands the turn to the opponent', () => {
    const store = startedStore(5, 2);
    store.dispatch({ type: 'movement', from: 24, die: 6 });
    store.dispatch({ type: 'movement', from: 13, die: 3 });

    store.dispatch({ type: 'commit' });

    const game = store.getState().game;
    expect(game?.turn?.player).toBe('black');
    expect(game?.turn?.roll).toEqual([5, 2]);
    expect(game?.record.plays).toHaveLength(1);
  });
});

describe('forced plays', () => {
  it('plays and commits the single legal play in one action', () => {
    const board = createBoard({
      white: { points: { 24: 1 }, off: 14 },
      black: { points: { 15: 2, 1: 13 } },
    });
    const store = createPlayStore({
      game: createGame({ board, player: 'white', roll: [6, 3] }),
      dice: scriptedDice(4, 2),
    });

    store.dispatch({ type: 'forced' });

    const game = store.getState().game;
    expect(game?.board.points[18]).toBe(1);
    expect(game?.turn?.player).toBe('black');
    expect(game?.turn?.roll).toEqual([4, 2]);
  });

  it('is ignored when the player has a choice of plays', () => {
    const store = startedStore();
    const before = store.getState();

    store.dispatch({ type: 'forced' });

    expect(store.getState()).toBe(before);
  });
});

describe('game end', () => {
  function endedStore(): PlayStore {
    const board = createBoard({
      white: { points: { 1: 1 }, off: 14 },
      black: { points: { 24: 1 }, off: 14 },
    });
    const store = createPlayStore({
      game: createGame({ board, player: 'white', roll: [6, 5] }),
      dice: scriptedDice(3, 1),
    });
    store.dispatch({ type: 'movement', from: 1, die: 6 });
    store.dispatch({ type: 'commit' });
    return store;
  }

  it('ends the game with the result when the last checker bears off', () => {
    const game = endedStore().getState().game;
    expect(game?.result).toEqual({
      winner: 'white',
      kind: 'single',
      points: 1,
    });
    expect(game?.turn).toBeNull();
  });

  it('ignores further movements and commits after the game ends', () => {
    const store = endedStore();
    const before = store.getState();

    store.dispatch({ type: 'movement', from: 24, die: 3 });
    store.dispatch({ type: 'commit' });
    store.dispatch({ type: 'undo' });

    expect(store.getState()).toBe(before);
  });

  it('starts a fresh game after one has ended', () => {
    const store = endedStore();

    store.dispatch({ type: 'start' });

    const game = store.getState().game;
    expect(game?.result).toBeNull();
    expect(game?.record.plays).toEqual([]);
    expect(game?.turn?.roll).toEqual([3, 1]);
  });
});

describe('a complete game through the store', () => {
  it('reaches a result using only store actions and selector guidance', () => {
    const store = createPlayStore({ dice: createSeededDice(2024) });
    store.dispatch({ type: 'start' });

    for (let step = 0; step < 10_000; step++) {
      const game = store.getState().game;
      if (!game) {
        throw new Error('game vanished');
      }
      if (game.result) {
        break;
      }
      if (canCommit(game)) {
        store.dispatch({ type: 'commit' });
        continue;
      }
      // The viability filter guarantees a movement exists whenever the
      // play is incomplete — a player can never be stranded.
      const [movement] = viableMovements(game);
      expect(movement).toBeDefined();
      store.dispatch({
        type: 'movement',
        from: movement.from,
        die: movement.die,
      });
    }

    const finished = store.getState().game;
    expect(finished?.result).not.toBeNull();
    expect(finished?.result && finished.board.off[finished.result.winner]).toBe(
      15,
    );
    expect(finished?.record.plays.length).toBeGreaterThan(10);
  });
});
