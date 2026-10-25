import { renderHook, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { startMatch } from '../rules';
import { scriptedDice } from '../test/dice';
import { mirrorLiveMatch, readLiveMatchMirror } from './liveMatch';
import { createMemoryStorage } from './memory';
import type { MatchStoreLike } from './persist';
import { snapshotMatch } from './snapshot';
import type { MatchConfig, StoredMatch } from './types';
import { useMatchPersistence } from './useMatchPersistence';

const config: MatchConfig = {
  length: 3,
  mode: 'computer',
  difficulty: 'casual',
};

/** A store with no live match: enough to construct the persister. */
const idleStore: MatchStoreLike = {
  getState: () => ({ match: null }),
  subscribe: () => () => {},
};

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

describe('useMatchPersistence mirror recovery on load', () => {
  it('reconciles a newer hide mirror into storage and offers it for resume', async () => {
    const storage = createMemoryStorage();
    // Storage holds the move before the lost one; the mirror holds the move
    // an unprompted reload clipped inside the save debounce.
    await storage.put(inProgressRow({ updatedAt: 1_000 }));
    mirrorLiveMatch(inProgressRow({ updatedAt: 5_000 }));

    const { result } = renderHook(() =>
      useMatchPersistence(idleStore, storage),
    );

    await waitFor(() => {
      expect(result.current.resumable).toHaveLength(1);
    });
    expect(result.current.resumable[0].updatedAt).toBe(5_000);
    expect((await storage.get('live'))?.updatedAt).toBe(5_000);
    // The mirror is consumed so it cannot resurrect a stale match later.
    expect(readLiveMatchMirror()).toBeNull();
  });
});
