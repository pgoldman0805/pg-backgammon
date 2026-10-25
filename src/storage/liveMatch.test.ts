import { afterEach, describe, expect, it, vi } from 'vitest';
import { startMatch } from '../rules';
import { scriptedDice } from '../test/dice';
import {
  clearLiveMatchMirror,
  isLiveMatchInProgress,
  mirrorLiveMatch,
  readLiveMatchMirror,
  reconcileLiveMatchMirror,
  setLiveMatchActive,
  subscribeLiveMatch,
} from './liveMatch';
import { createMemoryStorage } from './memory';
import { snapshotMatch } from './snapshot';
import type { MatchConfig, StoredMatch } from './types';

const config: MatchConfig = {
  length: 3,
  mode: 'computer',
  difficulty: 'casual',
};

/** A structurally valid in-progress stored match the mirror can carry. */
function inProgressRow(overrides: Partial<StoredMatch> = {}): StoredMatch {
  const match = startMatch(3, scriptedDice(6, 3, 5, 2, 4, 1));
  return {
    ...snapshotMatch({
      id: 'live',
      config,
      match,
      createdAt: 1_000,
      updatedAt: 2_000,
    }),
    ...overrides,
  };
}

afterEach(() => {
  localStorage.clear();
});

describe('live-match flag', () => {
  it('reads false until set, true once active, false once cleared', () => {
    expect(isLiveMatchInProgress()).toBe(false);
    setLiveMatchActive(true);
    expect(isLiveMatchInProgress()).toBe(true);
    setLiveMatchActive(false);
    expect(isLiveMatchInProgress()).toBe(false);
  });

  it('notifies same-tab subscribers only when the flag changes', () => {
    const listener = vi.fn();
    const unsubscribe = subscribeLiveMatch(listener);

    setLiveMatchActive(true);
    setLiveMatchActive(true); // no-op: already active
    setLiveMatchActive(false);

    expect(listener).toHaveBeenCalledTimes(2);
    unsubscribe();
    setLiveMatchActive(true);
    expect(listener).toHaveBeenCalledTimes(2);
  });
});

describe('live-match mirror', () => {
  it('round-trips a stored match through localStorage', () => {
    const row = inProgressRow();
    mirrorLiveMatch(row);
    expect(readLiveMatchMirror()).toEqual(row);
  });

  it('returns null for an absent, malformed, or non-match mirror', () => {
    expect(readLiveMatchMirror()).toBeNull();
    localStorage.setItem('pg-backgammon.live-match-mirror', '{not json');
    expect(readLiveMatchMirror()).toBeNull();
    localStorage.setItem('pg-backgammon.live-match-mirror', '{"id":"x"}');
    expect(readLiveMatchMirror()).toBeNull();
  });

  it('clears the mirror', () => {
    mirrorLiveMatch(inProgressRow());
    clearLiveMatchMirror();
    expect(readLiveMatchMirror()).toBeNull();
  });
});

describe('reconcileLiveMatchMirror', () => {
  it('writes a newer in-progress mirror into storage, then clears it', async () => {
    const storage = createMemoryStorage();
    await storage.put(inProgressRow({ updatedAt: 1_000 }));
    mirrorLiveMatch(inProgressRow({ updatedAt: 5_000 }));

    await reconcileLiveMatchMirror(storage);

    expect((await storage.get('live'))?.updatedAt).toBe(5_000);
    expect(readLiveMatchMirror()).toBeNull();
  });

  it('recovers a match storage never received', async () => {
    const storage = createMemoryStorage();
    mirrorLiveMatch(inProgressRow({ updatedAt: 5_000 }));

    await reconcileLiveMatchMirror(storage);

    expect(await storage.get('live')).not.toBeNull();
  });

  it('does not regress a storage row that is already newer', async () => {
    const storage = createMemoryStorage();
    await storage.put(inProgressRow({ updatedAt: 9_000 }));
    mirrorLiveMatch(inProgressRow({ updatedAt: 5_000 }));

    await reconcileLiveMatchMirror(storage);

    expect((await storage.get('live'))?.updatedAt).toBe(9_000);
    expect(readLiveMatchMirror()).toBeNull();
  });
});
