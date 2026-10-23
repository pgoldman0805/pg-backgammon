import { describe, expect, it } from 'vitest';
import { createFakeEngine } from '../engine';
import { createPlayStore } from '../play/store';
import {
  createBoard,
  createGame,
  createMatch,
  type MatchState,
} from '../rules';
import { createMemoryStorage, snapshotMatch } from '../storage';
import { createMatchAnalyzer, type MatchAnalyzer } from './analyzer';
import { createAutoAnalysis } from './autoAnalysis';
import { isMatchAnalysis } from './types';

/** A live match one bear-off play away from ending the current game. */
function aboutToFinish(length: number): MatchState {
  return createMatch({
    length,
    game: createGame({
      board: createBoard({
        white: { points: { 1: 1 }, off: 14 },
        black: { points: { 19: 14 }, off: 1 },
      }),
      player: 'white',
      roll: [3, 1],
    }),
  });
}

/** Record the analyzer calls while delegating to a real one. */
function spiedAnalyzer(): MatchAnalyzer & {
  gamesAnalyzed: number;
  matchesAnalyzed: number;
} {
  const real = createMatchAnalyzer({
    engine: createFakeEngine(),
    now: () => 99,
  });
  const spy = {
    gamesAnalyzed: 0,
    matchesAnalyzed: 0,
    analyzeGame: ((record, standing, priority) => {
      spy.gamesAnalyzed += 1;
      return real.analyzeGame(record, standing, priority);
    }) as MatchAnalyzer['analyzeGame'],
    analyzeMatch: ((record, options) => {
      spy.matchesAnalyzed += 1;
      return real.analyzeMatch(record, options);
    }) as MatchAnalyzer['analyzeMatch'],
    deepen: real.deepen,
    rankPlays: real.rankPlays,
  };
  return spy;
}

const immediate = () => Promise.resolve();

describe('createAutoAnalysis', () => {
  it('analyzes a game in the background the moment it finishes', async () => {
    const store = createPlayStore({ match: aboutToFinish(3) });
    const analyzer = spiedAnalyzer();
    const auto = createAutoAnalysis({
      store,
      storage: createMemoryStorage(),
      analyzer,
      sleep: immediate,
    });

    store.dispatch({ type: 'movement', from: 1, die: 1 });
    store.dispatch({ type: 'commit' });
    expect(store.getState().match?.phase).toBe('game-over');
    await auto.settled();

    expect(analyzer.gamesAnalyzed).toBe(1);
    expect(analyzer.matchesAnalyzed).toBe(0);
    auto.dispose();
  });

  it('persists the full analysis onto the finished row at match end', async () => {
    const store = createPlayStore({ match: aboutToFinish(1) });
    const storage = createMemoryStorage();
    const auto = createAutoAnalysis({
      store,
      storage,
      analyzer: spiedAnalyzer(),
      sleep: immediate,
    });

    store.dispatch({ type: 'movement', from: 1, die: 1 });
    store.dispatch({ type: 'commit' });
    const finished = store.getState().match;
    expect(finished?.phase).toBe('match-over');
    // The persister (a separate observer) writes the finished row.
    if (finished) {
      await storage.put(
        snapshotMatch({
          id: 'row-1',
          config: { length: 1, mode: 'computer', difficulty: 'expert' },
          match: finished,
          createdAt: 1,
          updatedAt: 2,
        }),
      );
    }
    await auto.settled();

    const row = await storage.get('row-1');
    expect(isMatchAnalysis(row?.analysis)).toBe(true);
    auto.dispose();
  });

  it('retries until the persister has flushed the finished row', async () => {
    const store = createPlayStore({ match: aboutToFinish(1) });
    const storage = createMemoryStorage();
    let naps = 0;
    const auto = createAutoAnalysis({
      store,
      storage,
      analyzer: spiedAnalyzer(),
      sleep: async () => {
        naps += 1;
        if (naps === 2) {
          const finished = store.getState().match;
          if (finished) {
            await storage.put(
              snapshotMatch({
                id: 'late-row',
                config: { length: 1, mode: 'computer', difficulty: 'expert' },
                match: finished,
                createdAt: 1,
                updatedAt: 2,
              }),
            );
          }
        }
      },
    });

    store.dispatch({ type: 'movement', from: 1, die: 1 });
    store.dispatch({ type: 'commit' });
    await auto.settled();

    const row = await storage.get('late-row');
    expect(isMatchAnalysis(row?.analysis)).toBe(true);
    auto.dispose();
  });

  it('gives up quietly when the finished match never reaches storage', async () => {
    const store = createPlayStore({ match: aboutToFinish(1) });
    const storage = createMemoryStorage();
    const auto = createAutoAnalysis({
      store,
      storage,
      analyzer: spiedAnalyzer(),
      sleep: immediate,
    });

    store.dispatch({ type: 'movement', from: 1, die: 1 });
    store.dispatch({ type: 'commit' });
    await expect(auto.settled()).resolves.toBeUndefined();
    expect(await storage.list()).toEqual([]);
    auto.dispose();
  });

  it('stops observing once disposed', async () => {
    const store = createPlayStore({ match: aboutToFinish(3) });
    const analyzer = spiedAnalyzer();
    const auto = createAutoAnalysis({
      store,
      storage: createMemoryStorage(),
      analyzer,
      sleep: immediate,
    });
    auto.dispose();

    store.dispatch({ type: 'movement', from: 1, die: 1 });
    store.dispatch({ type: 'commit' });
    await auto.settled();

    expect(analyzer.gamesAnalyzed).toBe(0);
  });

  it('warms the cache for games already finished when attached (resume)', async () => {
    // A store resumed around a match whose first game is already recorded.
    const store = createPlayStore({ match: aboutToFinish(3) });
    store.dispatch({ type: 'movement', from: 1, die: 1 });
    store.dispatch({ type: 'commit' });
    const analyzer = spiedAnalyzer();
    const auto = createAutoAnalysis({
      store,
      storage: createMemoryStorage(),
      analyzer,
      sleep: immediate,
    });
    await auto.settled();

    expect(analyzer.gamesAnalyzed).toBe(1);
    auto.dispose();
  });
});
