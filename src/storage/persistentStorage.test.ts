/**
 * Durable storage (ticket 26): asking the browser to keep our IndexedDB from
 * being evicted, reading back whether it did, and measuring how much space
 * the app is using — each degrading quietly where the StorageManager API is
 * absent rather than throwing.
 */

import {
  estimateStorage,
  persistedState,
  requestPersistentStorage,
} from './persistentStorage';

describe('requesting persistent storage', () => {
  it('reports persisted when the browser grants durability', async () => {
    const persist = vi.fn(() => Promise.resolve(true));
    expect(await requestPersistentStorage({ persist })).toBe('persisted');
    expect(persist).toHaveBeenCalledOnce();
  });

  it('reports not-persisted when the browser declines', async () => {
    expect(
      await requestPersistentStorage({ persist: () => Promise.resolve(false) }),
    ).toBe('not-persisted');
  });

  it('is a no-op reporting unsupported where persist() is absent', async () => {
    expect(await requestPersistentStorage({})).toBe('unsupported');
    expect(await requestPersistentStorage(undefined)).toBe('unsupported');
  });

  it('never throws when persist() rejects', async () => {
    await expect(
      requestPersistentStorage({
        persist: () => Promise.reject(new Error('denied')),
      }),
    ).resolves.toBe('unsupported');
  });
});

describe('reading the current persistence state', () => {
  it('reads persisted() without requesting it', async () => {
    const persist = vi.fn(() => Promise.resolve(true));
    const persisted = vi.fn(() => Promise.resolve(true));
    expect(await persistedState({ persist, persisted })).toBe('persisted');
    expect(persisted).toHaveBeenCalledOnce();
    expect(persist).not.toHaveBeenCalled();
  });

  it('degrades to unsupported where persisted() is absent', async () => {
    expect(await persistedState({})).toBe('unsupported');
    expect(await persistedState(undefined)).toBe('unsupported');
  });
});

describe('estimating storage usage', () => {
  it('returns the usage and quota the browser reports', async () => {
    const estimate = () => Promise.resolve({ usage: 1_024, quota: 50_000 });
    expect(await estimateStorage({ estimate })).toEqual({
      usage: 1_024,
      quota: 50_000,
    });
  });

  it('returns null where estimate() is absent', async () => {
    expect(await estimateStorage({})).toBeNull();
    expect(await estimateStorage(undefined)).toBeNull();
  });

  it('returns null when the estimate omits the figures', async () => {
    expect(
      await estimateStorage({ estimate: () => Promise.resolve({}) }),
    ).toBeNull();
  });
});
