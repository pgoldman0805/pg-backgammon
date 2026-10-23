import {
  acceptResignation,
  offerResignation,
  replayMatch,
  startMatch,
} from '../rules';
import { scriptedDice } from '../test/dice';
import { isStoredMatch, snapshotMatch } from './snapshot';
import { storedMatchFixture } from './storageContract';
import type { MatchConfig } from './types';

const config: MatchConfig = {
  length: 3,
  mode: 'computer',
  difficulty: 'casual',
};

/** A live match: game 1 just opened (white rolled 6, black 3). */
function liveMatch() {
  return startMatch(3, scriptedDice(6, 3));
}

/** A decided 1-point match: black resigns game 1, so white wins 1-0. */
function decidedMatch() {
  const match = startMatch(1, scriptedDice(6, 3));
  return acceptResignation(offerResignation(match, 'black', 'single'));
}

describe('snapshotMatch', () => {
  it('stores an in-progress match with its exact state snapshot', () => {
    const match = liveMatch();

    const stored = snapshotMatch({
      id: 'm1',
      config,
      match,
      createdAt: 1_000,
      updatedAt: 2_000,
    });

    expect(stored).toMatchObject({
      id: 'm1',
      config,
      status: 'in-progress',
      createdAt: 1_000,
      updatedAt: 2_000,
      score: { white: 0, black: 0 },
      winner: null,
    });
    expect(stored.state).toEqual(match);
    expect(stored.record).toEqual({ length: 3, games: [] });
  });

  it('stores a finished match as its replayable record, without a snapshot', () => {
    const match = decidedMatch();

    const stored = snapshotMatch({
      id: 'm2',
      config: { ...config, length: 1 },
      match,
      createdAt: 1_000,
      updatedAt: 3_000,
    });

    expect(stored.status).toBe('finished');
    expect(stored.state).toBeNull();
    expect(stored.winner).toBe('white');
    expect(stored.score).toEqual({ white: 1, black: 0 });
    // The record alone reproduces the outcome (the round-trip guarantee).
    expect(replayMatch(stored.record)).toEqual({
      score: { white: 1, black: 0 },
      winner: 'white',
    });
  });

  it('survives structured cloning (plain data only)', () => {
    const stored = snapshotMatch({
      id: 'm3',
      config,
      match: liveMatch(),
      createdAt: 1,
      updatedAt: 2,
    });

    expect(structuredClone(stored)).toEqual(stored);
  });
});

describe('isStoredMatch', () => {
  it('accepts a real snapshot, in progress or finished', () => {
    const live = snapshotMatch({
      id: 'a',
      config,
      match: liveMatch(),
      createdAt: 1,
      updatedAt: 2,
    });
    const done = snapshotMatch({
      id: 'b',
      config: { ...config, length: 1 },
      match: decidedMatch(),
      createdAt: 1,
      updatedAt: 2,
    });

    expect(isStoredMatch(live)).toBe(true);
    expect(isStoredMatch(done)).toBe(true);
  });

  it('accepts extra unknown fields (later tickets)', () => {
    const stored = {
      ...storedMatchFixture(),
      config: {
        length: 3,
        mode: 'computer',
        difficulty: 'casual',
        tutor: true,
      },
      analysis: { errorRate: 0.03 },
    };

    expect(isStoredMatch(stored)).toBe(true);
  });

  it('rejects garbage and structurally broken rows', () => {
    const base = storedMatchFixture();
    expect(isStoredMatch(base)).toBe(true);

    expect(isStoredMatch(null)).toBe(false);
    expect(isStoredMatch('corrupt')).toBe(false);
    expect(isStoredMatch({})).toBe(false);
    expect(isStoredMatch({ ...base, id: 7 })).toBe(false);
    expect(isStoredMatch({ ...base, status: 'archived' })).toBe(false);
    expect(isStoredMatch({ ...base, record: { games: 'none' } })).toBe(false);
    expect(isStoredMatch({ ...base, score: { white: 1 } })).toBe(false);
  });

  it('rejects an in-progress row with no snapshot to resume', () => {
    expect(
      isStoredMatch(storedMatchFixture({ status: 'in-progress', state: null })),
    ).toBe(false);
  });

  it('rejects an in-progress row whose snapshot cannot be resumed', () => {
    const live = snapshotMatch({
      id: 'a',
      config,
      match: liveMatch(),
      createdAt: 1,
      updatedAt: 2,
    });

    expect(isStoredMatch({ ...live, state: { phase: 'turn' } })).toBe(false);
    expect(
      isStoredMatch({
        ...live,
        state: { ...live.state, game: { board: { points: [] } } },
      }),
    ).toBe(false);
  });
});
