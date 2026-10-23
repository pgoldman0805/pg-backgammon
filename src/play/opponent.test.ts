/**
 * The engine opponent drives the engine's side of a match through the same
 * store the human uses (dispatch/subscribe): checker plays, cube decisions
 * (via Engine.cubeInfo with match context) and resignation responses (via
 * Engine.evaluate). All tests run against the fake engine (same interface as
 * the real one); the real-WASM wiring is proven by
 * src/engine/node/playVsComputer.smoke.test.ts.
 */

import { describe, expect, it, vi } from 'vitest';
import { createFakeEngine, type Engine } from '../engine';
import {
  createBoard,
  createGame,
  createMatch,
  createSeededDice,
  type GameState,
} from '../rules';
import { scriptedDice } from '../test/dice';
import { gatedEngine, scriptedCubeEngine } from '../test/engine';
import { createEngineOpponent } from './opponent';
import { canCommit, forcedPlay, isDance, viableMovements } from './selectors';
import { createPlayStore, type PlayStore } from './store';

/** Pacing that yields the event loop but never waits. */
const instant = () => new Promise<void>((resolve) => setTimeout(resolve, 0));

function opponentOptions() {
  return { pace: instant, stepMs: 0 } as const;
}

function blackOpeningGame(): GameState {
  return createGame({
    board: createBoard({
      white: { points: { 24: 2, 13: 5, 8: 3, 6: 5 } },
      black: { points: { 1: 2, 12: 5, 17: 3, 19: 5 } },
    }),
    player: 'black',
    roll: [3, 1],
  });
}

/** Black on roll with 3-1 from the standard start; white rolls 5-2 next. */
function blackToOpen(match?: Partial<Parameters<typeof createMatch>[0]>) {
  return createPlayStore({
    match: createMatch({ length: 7, game: blackOpeningGame(), ...match }),
    dice: scriptedDice(5, 2),
  });
}

describe('engine turn (checker play)', () => {
  it("plays the engine's top-ranked play and commits to white's pre-roll", async () => {
    const store = blackToOpen();
    const opponent = createEngineOpponent({
      store,
      engine: createFakeEngine(),
      player: 'black',
      difficulty: 'expert',
      ...opponentOptions(),
    });

    await vi.waitFor(() => {
      expect(store.getState().match?.phase).toBe('pre-roll');
    });

    const match = store.getState().match;
    expect(match?.toRoll).toBe('white');
    expect(match?.game.record.plays).toHaveLength(1);
    expect(match?.game.record.plays[0].player).toBe('black');
    expect(match?.game.record.plays[0].movements).toHaveLength(2);
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
    expect(store.getState().match?.game.turn?.player).toBe('black');
    expect(store.getState().match?.game.turn?.movements).toHaveLength(0);

    engine.release();
    await vi.waitFor(() => {
      expect(store.getState().match?.phase).toBe('pre-roll');
    });
    expect(opponent.getState().thinking).toBe(false);
    expect(seen).toEqual([true, false]);
    opponent.dispose();
  });

  it('passes match context (score, cube, length) to rankPlays', async () => {
    const store = blackToOpen({
      score: { white: 2, black: 3 },
      cube: { value: 2, owner: 'black' },
    });
    const fake = createFakeEngine();
    const contexts: unknown[] = [];
    const engine: Engine = {
      ...fake,
      rankPlays(position, roll, options) {
        contexts.push(position.match);
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
      expect(store.getState().match?.phase).toBe('pre-roll');
    });
    expect(contexts).toEqual([
      {
        matchLength: 7,
        score: { white: 2, black: 3 },
        crawford: false,
        cube: { value: 2, owner: 'black' },
      },
    ]);
    opponent.dispose();
  });
});

describe('the engine at the cube', () => {
  /** A store at black's pre-roll decision (white committed the opening). */
  function blackPreRoll(
    options?: Partial<Parameters<typeof createMatch>[0]>,
  ): PlayStore {
    const store = createPlayStore({
      match: createMatch({
        length: 7,
        game: createGame({
          board: createBoard({
            white: { points: { 24: 2, 13: 5, 8: 3, 6: 5 } },
            black: { points: { 1: 2, 12: 5, 17: 3, 19: 5 } },
          }),
          player: 'white',
          roll: [6, 3],
        }),
        ...options,
      }),
      dice: scriptedDice(3, 1, 5, 2),
    });
    store.dispatch({ type: 'movement', from: 24, die: 6 });
    store.dispatch({ type: 'movement', from: 13, die: 3 });
    store.dispatch({ type: 'commit' });
    return store;
  }

  it('doubles before rolling when cube info recommends it', async () => {
    const store = blackPreRoll();
    const engine = scriptedCubeEngine('Double, take');
    const opponent = createEngineOpponent({
      store,
      engine,
      player: 'black',
      difficulty: 'expert',
      ...opponentOptions(),
    });

    await vi.waitFor(() => {
      expect(store.getState().match?.phase).toBe('cube-offered');
    });
    expect(engine.cubeAsked).toBe(1);
    // The offer awaits the human; the engine does not answer its own double.
    await instant();
    expect(store.getState().match?.phase).toBe('cube-offered');
    opponent.dispose();
  });

  it('rolls when cube info says no double', async () => {
    const store = blackPreRoll();
    const engine = scriptedCubeEngine('No double, take');
    const opponent = createEngineOpponent({
      store,
      engine,
      player: 'black',
      difficulty: 'expert',
      ...opponentOptions(),
    });

    // The engine rolls, plays its turn and commits back to white's pre-roll.
    await vi.waitFor(() => {
      expect(store.getState().match?.game.record.plays).toHaveLength(2);
    });
    expect(engine.cubeAsked).toBe(1);
    expect(store.getState().match?.cube.value).toBe(1);
    expect(store.getState().match?.toRoll).toBe('white');
    opponent.dispose();
  });

  it('never consults the cube when doubling is impossible (Crawford)', async () => {
    const store = blackPreRoll({
      score: { white: 6, black: 0 },
      crawford: true,
    });
    const engine = scriptedCubeEngine('Double, take');
    const opponent = createEngineOpponent({
      store,
      engine,
      player: 'black',
      difficulty: 'expert',
      ...opponentOptions(),
    });

    await vi.waitFor(() => {
      expect(store.getState().match?.game.record.plays).toHaveLength(2);
    });
    expect(engine.cubeAsked).toBe(0);
    opponent.dispose();
  });

  /** Black plays 17/20 19/20; white doubles from their pre-roll. */
  function whiteDoubled(): PlayStore {
    const store = createPlayStore({
      match: createMatch({ length: 7, game: blackOpeningGame() }),
      dice: scriptedDice(5, 2),
    });
    store.dispatch({ type: 'movement', from: 17, die: 3 });
    store.dispatch({ type: 'movement', from: 19, die: 1 });
    store.dispatch({ type: 'commit' });
    expect(store.getState().match?.toRoll).toBe('white');
    store.dispatch({ type: 'double' });
    expect(store.getState().match?.phase).toBe('cube-offered');
    return store;
  }

  it("takes the human's double when the position is takeable", async () => {
    const store = whiteDoubled();
    const engine = scriptedCubeEngine('Double, take');
    const responder = createEngineOpponent({
      store,
      engine,
      player: 'black',
      difficulty: 'expert',
      ...opponentOptions(),
    });
    await vi.waitFor(() => {
      expect(store.getState().match?.cube).toEqual({
        value: 2,
        owner: 'black',
      });
    });
    expect(store.getState().match?.phase).toBe('pre-roll');
    expect(store.getState().match?.toRoll).toBe('white');
    responder.dispose();
  });

  it("passes the human's double when the position is a pass", async () => {
    const store = whiteDoubled();

    const engine = scriptedCubeEngine('Double, pass');
    const opponent = createEngineOpponent({
      store,
      engine,
      player: 'black',
      difficulty: 'expert',
      ...opponentOptions(),
    });
    await vi.waitFor(() => {
      expect(store.getState().match?.phase).toBe('game-over');
    });
    expect(store.getState().match?.score).toEqual({ white: 1, black: 0 });
    opponent.dispose();
  });
});

describe('the engine answering resignations', () => {
  function whiteResigned(kind: 'single' | 'gammon'): PlayStore {
    const store = createPlayStore({
      match: createMatch({
        length: 7,
        game: createGame({
          board: createBoard({
            white: { points: { 24: 2, 13: 5, 8: 3, 6: 5 } },
            black: { points: { 1: 2, 12: 5, 17: 3, 19: 5 } },
          }),
          player: 'white',
          roll: [6, 3],
        }),
      }),
      dice: scriptedDice(5, 2),
    });
    store.dispatch({ type: 'resign', kind });
    expect(store.getState().match?.phase).toBe('resign-offered');
    return store;
  }

  it('accepts when the offered points cover its expected equity', async () => {
    const store = whiteResigned('single');
    // Black expects a plain win: white's equity -0.6 → black's +0.6 < 1.
    const engine = scriptedCubeEngine('No double, take', { equity: -0.6 });
    const opponent = createEngineOpponent({
      store,
      engine,
      player: 'black',
      difficulty: 'expert',
      ...opponentOptions(),
    });

    await vi.waitFor(() => {
      expect(store.getState().match?.phase).toBe('game-over');
    });
    expect(store.getState().match?.score).toEqual({ white: 0, black: 1 });
    opponent.dispose();
  });

  it('declines a single when it expects more than a single win', async () => {
    const store = whiteResigned('single');
    // Black expects a gammon-heavy finish: white's equity -1.4 → black +1.4 > 1.
    const engine = scriptedCubeEngine('No double, take', { equity: -1.4 });
    const opponent = createEngineOpponent({
      store,
      engine,
      player: 'black',
      difficulty: 'expert',
      ...opponentOptions(),
    });

    await vi.waitFor(() => {
      expect(store.getState().match?.phase).toBe('turn');
    });
    expect(store.getState().match?.pendingResignation).toBeNull();
    expect(store.getState().match?.score).toEqual({ white: 0, black: 0 });
    opponent.dispose();
  });

  it('accepts a gammon resignation that covers the same expectation', async () => {
    const store = whiteResigned('gammon');
    const engine = scriptedCubeEngine('No double, take', { equity: -1.4 });
    const opponent = createEngineOpponent({
      store,
      engine,
      player: 'black',
      difficulty: 'expert',
      ...opponentOptions(),
    });

    await vi.waitFor(() => {
      expect(store.getState().match?.phase).toBe('game-over');
    });
    expect(store.getState().match?.score).toEqual({ white: 0, black: 2 });
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
      match: createMatch({
        length: 7,
        game: createGame({
          board: createBoard({
            white: { points: { 1: 2, 2: 2, 3: 2, 4: 2, 5: 2, 6: 2, 13: 3 } },
            black: { points: { 24: 14 }, bar: 1 },
          }),
          player: 'black',
          roll: [6, 3],
        }),
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
      expect(store.getState().match?.phase).toBe('pre-roll');
    });
    expect(store.getState().match?.game.record.plays[0]).toEqual({
      player: 'black',
      roll: [6, 3],
      movements: [],
    });
    expect(opponent.getState().error).toBeNull();
    opponent.dispose();
  });

  it('plays a forced turn without consulting the engine', async () => {
    // Black's lone checker: 1/7 plays, 7/10 is blocked, and 1/4 would waste
    // the higher die — exactly one legal play (1/7 with the 6).
    const store = createPlayStore({
      match: createMatch({
        length: 7,
        game: createGame({
          board: createBoard({
            white: { points: { 10: 2, 11: 2, 13: 2, 15: 2, 2: 7 } },
            black: { points: { 1: 1 }, off: 14 },
          }),
          player: 'black',
          roll: [6, 3],
        }),
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
      expect(store.getState().match?.phase).toBe('pre-roll');
    });
    const play = store.getState().match?.game.record.plays[0];
    expect(play?.player).toBe('black');
    expect(play?.movements.length).toBeGreaterThan(0);
    expect(opponent.getState().error).toBeNull();
    opponent.dispose();
  });
});

describe('safety', () => {
  it('discards the engine result when the match was restarted mid-think', async () => {
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
    const fresh = store.getState().match;
    expect(fresh?.game.turn?.player).toBe('white');

    engine.release();
    await vi.waitFor(() => {
      expect(opponent.getState().thinking).toBe(false);
    });
    // The stale play was not applied to the new game.
    expect(store.getState().match?.game.turn?.movements).toHaveLength(0);
    expect(store.getState().match?.game.record.plays).toHaveLength(0);
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
    expect(store.getState().match?.game.turn?.player).toBe('black');
    expect(store.getState().match?.game.turn?.movements).toHaveLength(0);
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
    expect(store.getState().match?.game.turn?.player).toBe('black');

    opponent.retry();
    await vi.waitFor(() => {
      expect(store.getState().match?.phase).toBe('pre-roll');
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
      expect(store.getState().match?.phase).toBe('pre-roll');
    });
    expect(difficulties).toEqual(['beginner']);
    opponent.dispose();
  });
});

describe('a complete match against the engine', () => {
  /** Play white's current decision with a simple always-forward policy. */
  function playWhite(store: PlayStore): void {
    const match = store.getState().match;
    if (!match) {
      return;
    }
    if (match.phase === 'game-over') {
      store.dispatch({ type: 'next-game' });
      return;
    }
    if (match.phase === 'pre-roll' && match.toRoll === 'white') {
      store.dispatch({ type: 'roll' });
      return;
    }
    if (match.phase === 'cube-offered' && match.toRoll === 'black') {
      store.dispatch({ type: 'take' });
      return;
    }
    if (match.phase !== 'turn' || match.game.turn?.player !== 'white') {
      return;
    }
    const game = match.game;
    if (isDance(game)) {
      store.dispatch({ type: 'commit' });
      return;
    }
    if (game.turn?.movements.length === 0 && forcedPlay(game)) {
      store.dispatch({ type: 'forced' });
      return;
    }
    while (!canCommit(store.getState().match?.game ?? null)) {
      const [movement] = viableMovements(store.getState().match?.game ?? null);
      store.dispatch({
        type: 'movement',
        from: movement.from,
        die: movement.die,
      });
    }
    store.dispatch({ type: 'commit' });
  }

  it('plays a 3-point match to its winner, cube included', async () => {
    const store = createPlayStore({ dice: createSeededDice(42) });
    const opponent = createEngineOpponent({
      store,
      engine: createFakeEngine(),
      player: 'black',
      difficulty: 'casual',
      // Microtask pacing: the whole engine turn resolves between loop ticks.
      pace: () => Promise.resolve(),
      stepMs: 0,
    });
    store.dispatch({ type: 'start', length: 3 });

    for (
      let i = 0;
      i < 5000 && store.getState().match?.phase !== 'match-over';
      i++
    ) {
      playWhite(store);
      await instant();
      expect(opponent.getState().error).toBeNull();
    }

    const match = store.getState().match;
    expect(match?.phase).toBe('match-over');
    expect(match?.winner).not.toBeNull();
    expect(match?.games.length).toBeGreaterThan(0);
    opponent.dispose();
  }, 30_000);
});

describe('takeback while the engine thinks (Tutor mode)', () => {
  it('cancels the in-flight decision and answers the replayed play fresh', async () => {
    // White opens 6-3 through the store; the engine starts thinking on its
    // 5-2 reply, but a takeback lands before the engine answers.
    const store = createPlayStore({ dice: scriptedDice(6, 3, 5, 2, 4, 2) });
    store.dispatch({ type: 'start', length: 7 });
    const engine = gatedEngine();
    const opponent = createEngineOpponent({
      store,
      engine,
      player: 'black',
      difficulty: 'expert',
      ...opponentOptions(),
    });

    const before = store.getState().match;
    store.dispatch({ type: 'movement', from: 24, die: 6 });
    store.dispatch({ type: 'movement', from: 13, die: 3 });
    store.dispatch({ type: 'commit' });
    await vi.waitFor(() => {
      expect(store.getState().match?.game.turn?.player).toBe('black');
    });

    store.dispatch({ type: 'takeback', player: 'white' });
    expect(store.getState().match).toEqual(before);

    // The stale answer must not land: the restored turn stays white's.
    engine.release();
    await instant();
    await instant();
    expect(store.getState().match).toEqual(before);

    // Replaying and committing gets a fresh engine response (4-2 this time).
    store.dispatch({ type: 'movement', from: 24, die: 6 });
    store.dispatch({ type: 'movement', from: 13, die: 3 });
    store.dispatch({ type: 'commit' });
    await vi.waitFor(() => {
      expect(store.getState().match?.phase).toBe('pre-roll');
      expect(store.getState().match?.toRoll).toBe('white');
    });
    expect(store.getState().match?.game.record.plays).toHaveLength(2);
    expect(opponent.getState().error).toBeNull();
    opponent.dispose();
  });
});
