/**
 * The Tutor controller (GLOSSARY "Tutor mode"): live analysis over the same
 * store the human plays through. All tests run against the fake engine (same
 * interface as the real one), exactly like the opponent's tests.
 */

import { describe, expect, it, vi } from 'vitest';
import {
  classifyEquityLoss,
  createFakeEngine,
  type Engine,
  type RankedPlay,
} from '../engine';
import {
  applyMovement,
  type CheckerMovement,
  createBoard,
  createGame,
  createMatch,
} from '../rules';
import { scriptedDice } from '../test/dice';
import { createPlayStore, type PlayStore } from './store';
import { createTutor } from './tutor';

/** A store whose match opens with white to play 6-3 from the start. */
function startedStore(...laterRolls: Parameters<typeof scriptedDice>) {
  const store = createPlayStore({ dice: scriptedDice(6, 3, ...laterRolls) });
  store.dispatch({ type: 'start', length: 7 });
  return store;
}

/** White's opening 6-3 played and committed. */
function commitOpening(store: PlayStore): void {
  store.dispatch({ type: 'movement', from: 24, die: 6 });
  store.dispatch({ type: 'movement', from: 13, die: 3 });
  store.dispatch({ type: 'commit' });
}

describe('the tutor flag', () => {
  it('marks the live game tutor-assisted on creation', () => {
    const store = startedStore();
    expect(store.getState().match?.tutorAssisted).toBe(false);

    const tutor = createTutor({
      store,
      engine: createFakeEngine(),
      player: 'white',
    });

    expect(store.getState().match?.tutorAssisted).toBe(true);
    tutor.dispose();
  });

  it('re-marks each new game while it stays alive', () => {
    // White bears off the last checker, winning game 1.
    const store = createPlayStore({
      match: createMatch({
        length: 7,
        game: createGame({
          board: createBoard({
            white: { points: { 1: 1 }, off: 14 },
            black: { points: { 24: 2 }, off: 13 },
          }),
          player: 'white',
          roll: [6, 5],
        }),
      }),
      dice: scriptedDice(6, 3),
    });
    const tutor = createTutor({
      store,
      engine: createFakeEngine(),
      player: 'white',
    });

    store.dispatch({ type: 'movement', from: 1, die: 6 });
    store.dispatch({ type: 'commit' });
    expect(store.getState().match?.phase).toBe('game-over');

    store.dispatch({ type: 'next-game' });
    expect(store.getState().match?.tutorAssisted).toBe(true);

    tutor.dispose();
  });
});

describe('the hint', () => {
  it("reveals the engine's best play for the current roll on demand", async () => {
    const store = startedStore();
    const engine = createFakeEngine();
    const tutor = createTutor({ store, engine, player: 'white' });
    expect(tutor.getState().hint).toBeNull();

    tutor.requestHint();

    await vi.waitFor(() => {
      expect(tutor.getState().hint).not.toBeNull();
    });
    const match = store.getState().match;
    const turn = match?.game.turn;
    if (!match || !turn) {
      throw new Error('expected a turn in progress');
    }
    const [best] = await engine.rankPlays(
      { board: turn.startBoard, onRoll: 'white' },
      turn.roll,
    );
    expect(tutor.getState().hint?.moveText).toBe(best.moveText);
    expect(tutor.getState().hint?.play).toEqual(best.play);
    tutor.dispose();
  });

  it('queries at full strength: no difficulty is ever passed', async () => {
    const store = startedStore();
    const fake = createFakeEngine();
    const difficulties: unknown[] = [];
    const engine = {
      ...fake,
      rankPlays(
        position: Parameters<typeof fake.rankPlays>[0],
        roll: Parameters<typeof fake.rankPlays>[1],
        options?: Parameters<typeof fake.rankPlays>[2],
      ) {
        difficulties.push(options?.difficulty);
        return fake.rankPlays(position, roll, options);
      },
    };
    const tutor = createTutor({ store, engine, player: 'white' });

    tutor.requestHint();
    await vi.waitFor(() => {
      expect(tutor.getState().hint).not.toBeNull();
    });
    expect(difficulties).toEqual([undefined]);
    tutor.dispose();
  });

  it('clears the hint once the turn it belongs to ends', async () => {
    const store = startedStore(5, 2);
    const tutor = createTutor({
      store,
      engine: createFakeEngine(),
      player: 'white',
    });
    tutor.requestHint();
    await vi.waitFor(() => {
      expect(tutor.getState().hint).not.toBeNull();
    });

    commitOpening(store);

    expect(tutor.getState().hint).toBeNull();
    tutor.dispose();
  });

  it("ignores hint requests outside the tutored player's turn", async () => {
    const store = startedStore(5, 2);
    const tutor = createTutor({
      store,
      engine: createFakeEngine(),
      player: 'white',
    });
    commitOpening(store);
    expect(store.getState().match?.toRoll).toBe('black');

    tutor.requestHint();

    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(tutor.getState().hint).toBeNull();
    expect(tutor.getState().hintPending).toBe(false);
    tutor.dispose();
  });
});

/**
 * An engine whose rankings give the play reaching `chosenFinal` a fixed
 * equity below the best, so tests control the exact loss the tutor sees.
 * The returned engine also records what it ranked, for cross-checking.
 */
function rescoredEngine(
  chosenEquity: number,
  bestEquity: number,
): Engine & {
  lastRanked: readonly RankedPlay[] | null;
  calls: Array<{
    board: unknown;
    difficulty: unknown;
  }>;
} {
  const fake = createFakeEngine();
  const engine = {
    ...fake,
    lastRanked: null as readonly RankedPlay[] | null,
    calls: [] as Array<{ board: unknown; difficulty: unknown }>,
    async rankPlays(
      position: Parameters<Engine['rankPlays']>[0],
      roll: Parameters<Engine['rankPlays']>[1],
      options?: Parameters<Engine['rankPlays']>[2],
    ) {
      engine.calls.push({
        board: position.board,
        difficulty: options?.difficulty,
      });
      const ranked = await fake.rankPlays(position, roll, options);
      // White's committed opening is 24/18 13/10; give that final position
      // `chosenEquity` and every other play `bestEquity`.
      const openingMovements: CheckerMovement[] = [
        { from: 24, to: 18, die: 6, hit: false },
        { from: 13, to: 10, die: 3, hit: false },
      ];
      const chosenFinal = JSON.stringify(
        openingMovements.reduce(
          (board, movement) => applyMovement(board, 'white', movement),
          position.board,
        ),
      );
      const rescored = ranked
        .map((entry) => {
          const final = JSON.stringify(
            entry.play.movements.reduce(
              (board, movement) =>
                applyMovement(board, entry.play.player, movement),
              position.board,
            ),
          );
          return {
            ...entry,
            equity: final === chosenFinal ? chosenEquity : bestEquity,
          };
        })
        .sort((a, b) => b.equity - a.equity)
        .map((entry, index) => ({
          ...entry,
          rank: index + 1,
          equityLoss: 0,
        }));
      engine.lastRanked = rescored;
      return rescored;
    },
  };
  return engine;
}

describe('post-play feedback', () => {
  it.each([
    [0.0, 'ok'],
    [0.02, 'dubious'],
    [0.05, 'error'],
    [0.3, 'blunder'],
  ] as const)(
    'a committed play that lost %f is classified "%s" via the shared analysis path',
    async (loss, expected) => {
      const store = startedStore(5, 2);
      const engine = rescoredEngine(0.5 - loss, 0.5);
      const tutor = createTutor({ store, engine, player: 'white' });

      commitOpening(store);

      await vi.waitFor(() => {
        expect(tutor.getState().feedback).not.toBeNull();
      });
      const feedback = tutor.getState().feedback;
      expect(feedback?.equityLoss).toBeCloseTo(loss, 6);
      expect(feedback?.classification).toBe(expected);
      // The same number through src/engine/analysis.ts agrees exactly.
      expect(feedback?.classification).toBe(
        classifyEquityLoss(feedback?.equityLoss ?? Number.NaN),
      );
      expect(feedback?.bestMoveText).toBe(engine.lastRanked?.[0]?.moveText);
      tutor.dispose();
    },
  );

  it('scores the position before the play, at full strength', async () => {
    const store = startedStore(5, 2);
    const engine = rescoredEngine(0.45, 0.5);
    const startBoard = store.getState().match?.game.turn?.startBoard;
    const tutor = createTutor({ store, engine, player: 'white' });

    commitOpening(store);

    await vi.waitFor(() => {
      expect(tutor.getState().feedback).not.toBeNull();
    });
    expect(engine.calls).toEqual([
      { board: startBoard, difficulty: undefined },
    ]);
    tutor.dispose();
  });

  it('gives no feedback for a forced play, and never asks the engine', async () => {
    // White's only legal 6-3 play is 24/18: point 15 is blocked, so the 3
    // cannot be played at all and the higher-die rule fixes the 6.
    const board = createBoard({
      white: { points: { 24: 1 }, off: 14 },
      black: { points: { 15: 2, 1: 13 } },
    });
    const store = createPlayStore({
      match: createMatch({
        length: 7,
        game: createGame({ board, player: 'white', roll: [6, 3] }),
      }),
      dice: scriptedDice(5, 2),
    });
    const engine = rescoredEngine(0.4, 0.5);
    const tutor = createTutor({ store, engine, player: 'white' });

    store.dispatch({ type: 'forced' });
    expect(store.getState().match?.toRoll).toBe('black');

    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(tutor.getState().feedback).toBeNull();
    expect(engine.calls).toEqual([]);
    tutor.dispose();
  });

  it("gives no feedback for the opponent's plays", async () => {
    const store = startedStore(5, 2);
    const engine = rescoredEngine(0.45, 0.5);
    const tutor = createTutor({ store, engine, player: 'black' });

    commitOpening(store);

    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(tutor.getState().feedback).toBeNull();
    tutor.dispose();
  });

  it('clears the feedback when the play it describes is taken back', async () => {
    const store = startedStore(5, 2);
    const engine = rescoredEngine(0.3, 0.5);
    const tutor = createTutor({ store, engine, player: 'white' });

    commitOpening(store);
    await vi.waitFor(() => {
      expect(tutor.getState().feedback?.classification).toBe('blunder');
    });

    store.dispatch({ type: 'takeback', player: 'white' });

    expect(tutor.getState().feedback).toBeNull();
    tutor.dispose();
  });
});

describe('the eval bar', () => {
  it('evaluates the position on creation, from the tutored side', async () => {
    const store = startedStore();
    const tutor = createTutor({
      store,
      engine: createFakeEngine(),
      player: 'white',
    });

    await vi.waitFor(() => {
      expect(tutor.getState().evaluation).not.toBeNull();
    });
    const evaluation = tutor.getState().evaluation;
    // The fake evaluates the level start position at equity 0 → 50%.
    expect(evaluation?.winProbability).toBeCloseTo(0.5, 5);
    expect(evaluation?.equity).toBeCloseTo(0, 5);
    tutor.dispose();
  });

  it('coalesces bursts of updates into one trailing evaluation', async () => {
    const fake = createFakeEngine();
    const pending: Array<() => void> = [];
    const engine = {
      ...fake,
      evalCalls: 0,
      async evaluate(position: Parameters<Engine['evaluate']>[0]) {
        engine.evalCalls += 1;
        await new Promise<void>((resolve) => {
          pending.push(resolve);
        });
        return fake.evaluate(position);
      },
    };
    const store = startedStore(5, 2);
    const tutor = createTutor({ store, engine, player: 'white' });
    expect(engine.evalCalls).toBe(1);

    // Three further triggers while the first evaluation is still in flight.
    commitOpening(store);
    store.dispatch({ type: 'takeback', player: 'white' });
    commitOpening(store);
    expect(engine.evalCalls).toBe(1);

    while (pending.length > 0) {
      pending.shift()?.();
      await new Promise((resolve) => setTimeout(resolve, 0));
    }

    // One trailing evaluation of the latest position, not one per trigger.
    expect(engine.evalCalls).toBe(2);
    await vi.waitFor(() => {
      expect(tutor.getState().evaluation?.equity).toBeCloseTo(0.18, 5);
    });
    tutor.dispose();
  });

  it('updates after a committed play, still from the tutored side', async () => {
    const store = startedStore();
    const tutor = createTutor({
      store,
      engine: createFakeEngine(),
      player: 'white',
    });
    await vi.waitFor(() => {
      expect(tutor.getState().evaluation).not.toBeNull();
    });

    commitOpening(store);

    // White leads by 9 pips; the fake sees equity +0.18 for white even
    // though black is on roll (the perspective is normalized to the user).
    await vi.waitFor(() => {
      expect(tutor.getState().evaluation?.equity).toBeCloseTo(0.18, 5);
    });
    expect(tutor.getState().evaluation?.winProbability).toBeGreaterThan(0.5);
    tutor.dispose();
  });
});
