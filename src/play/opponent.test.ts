/**
 * The engine opponent drives the engine's side of a game through the same
 * store the human uses (dispatch/subscribe). All tests run against the fake
 * engine (same interface as the real one); the real-WASM wiring is proven by
 * src/engine/node/playVsComputer.smoke.test.ts.
 */

import { describe, expect, it, vi } from 'vitest';
import { createFakeEngine, type Engine } from '../engine';
import { createBoard, createGame, createSeededDice } from '../rules';
import { scriptedDice } from '../test/dice';
import { createEngineOpponent } from './opponent';
import {
  canCommit,
  forcedPlay,
  isDance,
  viableMovements,
} from './selectors';
import { createPlayStore, type PlayStore } from './store';

/** Pacing that yields the event loop but never waits. */
const instant = () => new Promise<void>((resolve) => setTimeout(resolve, 0));

function opponentOptions() {
  return { pace: instant, stepMs: 0 } as const;
}

/** Black on roll with 3-1 from the standard start; white rolls 5-2 next. */
function blackToOpen() {
  return createPlayStore({
    game: createGame({
      board: createBoard({
        white: { points: { 24: 2, 13: 5, 8: 3, 6: 5 } },
        black: { points: { 1: 2, 12: 5, 17: 3, 19: 5 } },
      }),
      player: 'black',
      roll: [3, 1],
    }),
    dice: scriptedDice(5, 2),
  });
}

/** A fake engine whose rankPlays waits until the test releases it. */
function gatedEngine(): Engine & { release: () => void } {
  const fake = createFakeEngine();
  let open: () => void = () => {};
  const gate = new Promise<void>((resolve) => {
    open = resolve;
  });
  return {
    ...fake,
    async rankPlays(position, roll, options) {
      await gate;
      return fake.rankPlays(position, roll, options);
    },
    release: () => open(),
  };
}

describe('engine turn', () => {
  it("plays the engine's top-ranked play and commits, passing the turn", async () => {
    const store = blackToOpen();
    const opponent = createEngineOpponent({
      store,
      engine: createFakeEngine(),
      player: 'black',
      difficulty: 'expert',
      ...opponentOptions(),
    });

    await vi.waitFor(() => {
      expect(store.getState().game?.turn?.player).toBe('white');
    });

    const game = store.getState().game;
    expect(game?.record.plays).toHaveLength(1);
    expect(game?.record.plays[0].player).toBe('black');
    expect(game?.record.plays[0].movements).toHaveLength(2);
    opponent.dispose();
  });

  it('is thinking while the engine ranks, and done once the play lands', async () => {
    const store = blackToOpen();
    const engine = gatedEngine();
    const opponent = createEngineOpponent({
      store,
      engine,
      player: 'black',
      difficulty: 'expert',
      ...opponentOptions(),
    });
    const seen: boolean[] = [];
    opponent.subscribe(() => seen.push(opponent.getState().thinking));

    await vi.waitFor(() => {
      expect(opponent.getState().thinking).toBe(true);
    });
    // The game has not moved while the engine thinks.
    expect(store.getState().game?.turn?.player).toBe('black');
    expect(store.getState().game?.turn?.movements).toHaveLength(0);

    engine.release();
    await vi.waitFor(() => {
      expect(store.getState().game?.turn?.player).toBe('white');
    });
    expect(opponent.getState().thinking).toBe(false);
    expect(seen).toEqual([true, false]);
    opponent.dispose();
  });
});

describe('dance and forced turns', () => {
  /** An engine that must not be consulted. */
  function unusableEngine(): Engine {
    return {
      ...createFakeEngine(),
      rankPlays: () => Promise.reject(new Error('engine must not be asked')),
    };
  }

  it('commits a dance without consulting the engine', async () => {
    // Black is on the bar; white's home board is closed: no legal plays.
    const store = createPlayStore({
      game: createGame({
        board: createBoard({
          white: { points: { 1: 2, 2: 2, 3: 2, 4: 2, 5: 2, 6: 2, 13: 3 } },
          black: { points: { 24: 14 }, bar: 1 },
        }),
        player: 'black',
        roll: [6, 3],
      }),
      dice: scriptedDice(5, 2),
    });
    const opponent = createEngineOpponent({
      store,
      engine: unusableEngine(),
      player: 'black',
      difficulty: 'expert',
      ...opponentOptions(),
    });

    await vi.waitFor(() => {
      expect(store.getState().game?.turn?.player).toBe('white');
    });
    expect(store.getState().game?.record.plays[0]).toEqual({
      player: 'black',
      roll: [6, 3],
      movements: [],
    });
    expect(opponent.getState().error).toBeNull();
    opponent.dispose();
  });

  it('plays a forced turn without consulting the engine', async () => {
    // Black's lone checker can only play 24/18 6/3 off... keep it simple:
    // one black checker far from home, a single maximal sequence.
    const store = createPlayStore({
      game: createGame({
        board: createBoard({
          white: { points: { 10: 2, 11: 2, 13: 2, 15: 2, 2: 7 } },
          black: { points: { 1: 1 }, off: 14 },
        }),
        player: 'black',
        roll: [6, 3],
      }),
      dice: scriptedDice(5, 2),
    });
    const opponent = createEngineOpponent({
      store,
      engine: unusableEngine(),
      player: 'black',
      difficulty: 'expert',
      ...opponentOptions(),
    });

    await vi.waitFor(() => {
      expect(store.getState().game?.turn?.player).toBe('white');
    });
    const play = store.getState().game?.record.plays[0];
    expect(play?.player).toBe('black');
    expect(play?.movements.length).toBeGreaterThan(0);
    expect(opponent.getState().error).toBeNull();
    opponent.dispose();
  });
});

describe('safety', () => {
  it('discards the engine result when the game was restarted mid-think', async () => {
    const store = blackToOpen();
    const engine = gatedEngine();
    const opponent = createEngineOpponent({
      store,
      engine,
      player: 'black',
      difficulty: 'expert',
      ...opponentOptions(),
    });
    await vi.waitFor(() => {
      expect(opponent.getState().thinking).toBe(true);
    });

    // Restart while the engine is still thinking about the old turn.
    // (White wins the new opening roll 5-2, so the fresh turn is white's.)
    store.dispatch({ type: 'start' });
    const fresh = store.getState().game;
    expect(fresh?.turn?.player).toBe('white');

    engine.release();
    await vi.waitFor(() => {
      expect(opponent.getState().thinking).toBe(false);
    });
    // The stale play was not applied to the new game.
    expect(store.getState().game?.turn?.movements).toHaveLength(0);
    expect(store.getState().game?.record.plays).toHaveLength(0);
    opponent.dispose();
  });

  it('acts on nothing after dispose, even with a resolved engine call', async () => {
    const store = blackToOpen();
    const engine = gatedEngine();
    const opponent = createEngineOpponent({
      store,
      engine,
      player: 'black',
      difficulty: 'expert',
      ...opponentOptions(),
    });
    await vi.waitFor(() => {
      expect(opponent.getState().thinking).toBe(true);
    });

    opponent.dispose();
    engine.release();
    await instant();
    await instant();
    expect(store.getState().game?.turn?.player).toBe('black');
    expect(store.getState().game?.turn?.movements).toHaveLength(0);
  });

  it('surfaces an engine failure and completes the turn on retry', async () => {
    const store = blackToOpen();
    const fake = createFakeEngine();
    let failures = 1;
    const engine: Engine = {
      ...fake,
      rankPlays(position, roll, options) {
        if (failures > 0) {
          failures--;
          return Promise.reject(new Error('worker crashed'));
        }
        return fake.rankPlays(position, roll, options);
      },
    };
    const opponent = createEngineOpponent({
      store,
      engine,
      player: 'black',
      difficulty: 'expert',
      ...opponentOptions(),
    });

    await vi.waitFor(() => {
      expect(opponent.getState().error).toBe('worker crashed');
    });
    // The game is intact and waiting.
    expect(store.getState().game?.turn?.player).toBe('black');

    opponent.retry();
    await vi.waitFor(() => {
      expect(store.getState().game?.turn?.player).toBe('white');
    });
    expect(opponent.getState().error).toBeNull();
    opponent.dispose();
  });

  it('asks the engine at its configured difficulty', async () => {
    const store = blackToOpen();
    const fake = createFakeEngine();
    const difficulties: (string | undefined)[] = [];
    const engine: Engine = {
      ...fake,
      rankPlays(position, roll, options) {
        difficulties.push(options?.difficulty);
        return fake.rankPlays(position, roll, options);
      },
    };
    const opponent = createEngineOpponent({
      store,
      engine,
      player: 'black',
      difficulty: 'beginner',
      ...opponentOptions(),
    });

    await vi.waitFor(() => {
      expect(store.getState().game?.turn?.player).toBe('white');
    });
    expect(difficulties).toEqual(['beginner']);
    opponent.dispose();
  });
});

describe('a complete game at every difficulty', () => {
  /** Play white's current turn with a first-viable-movement policy. */
  function playWhiteTurn(store: PlayStore): void {
    const game = store.getState().game;
    if (!game?.turn || game.turn.player !== 'white') {
      return;
    }
    if (isDance(game)) {
      store.dispatch({ type: 'commit' });
      return;
    }
    if (game.turn.movements.length === 0 && forcedPlay(game)) {
      store.dispatch({ type: 'forced' });
      return;
    }
    while (!canCommit(store.getState().game)) {
      const [movement] = viableMovements(store.getState().game);
      store.dispatch({
        type: 'movement',
        from: movement.from,
        die: movement.die,
      });
    }
    store.dispatch({ type: 'commit' });
  }

  it.each([
    'beginner',
    'casual',
    'intermediate',
    'expert',
    'world-class',
  ] as const)('plays a full game to a result at %s', async (difficulty) => {
    const store = createPlayStore({ dice: createSeededDice(42) });
    const opponent = createEngineOpponent({
      store,
      engine: createFakeEngine(),
      player: 'black',
      difficulty,
      // Microtask pacing: the whole engine turn resolves between loop ticks.
      pace: () => Promise.resolve(),
      stepMs: 0,
    });
    store.dispatch({ type: 'start' });

    for (let i = 0; i < 2000 && !store.getState().game?.result; i++) {
      if (store.getState().game?.turn?.player === 'white') {
        playWhiteTurn(store);
      } else {
        // The opponent is acting; let its async chain advance.
        await instant();
      }
      expect(opponent.getState().error).toBeNull();
    }

    const game = store.getState().game;
    expect(game?.result).not.toBeNull();
    expect(game?.record.plays.length).toBeGreaterThan(10);
    opponent.dispose();
  }, 30_000);
});
