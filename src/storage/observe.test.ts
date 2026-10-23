/**
 * Observable match storage (ticket 12): the shared storage instance exposes
 * put events so the blunder miner can react the moment an analysis-bearing
 * row persists — a pure observer, no polling, mirroring how the persister
 * and auto-analysis observe the Play store.
 */

import { describe, expect, it, vi } from 'vitest';
import { createMemoryStorage } from './memory';
import { createObservableMatchStorage } from './observe';
import { storedMatchFixture } from './storageContract';

describe('createObservableMatchStorage', () => {
  it('behaves as the wrapped storage and notifies after each put lands', async () => {
    const storage = createObservableMatchStorage(createMemoryStorage());
    const seen: string[] = [];
    storage.onMatchPut((match) => seen.push(match.id));

    await storage.put(storedMatchFixture({ id: 'a' }));
    await storage.put(storedMatchFixture({ id: 'b' }));

    expect(seen).toEqual(['a', 'b']);
    expect((await storage.list()).map((m) => m.id).sort()).toEqual(['a', 'b']);
  });

  it('stops notifying once unsubscribed', async () => {
    const storage = createObservableMatchStorage(createMemoryStorage());
    const listener = vi.fn();
    const unsubscribe = storage.onMatchPut(listener);
    unsubscribe();

    await storage.put(storedMatchFixture());
    expect(listener).not.toHaveBeenCalled();
  });

  it('a throwing listener never breaks the put or its siblings', async () => {
    const storage = createObservableMatchStorage(createMemoryStorage());
    const seen: string[] = [];
    storage.onMatchPut(() => {
      throw new Error('listener bug');
    });
    storage.onMatchPut((match) => seen.push(match.id));

    await expect(
      storage.put(storedMatchFixture({ id: 'a' })),
    ).resolves.toBeUndefined();
    expect(seen).toEqual(['a']);
    expect(await storage.get('a')).not.toBeNull();
  });
});
