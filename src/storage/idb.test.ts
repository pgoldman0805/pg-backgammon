import { IDBFactory } from 'fake-indexeddb';
import { createIndexedDbStorage } from './idb';
import {
  describeMatchStorageContract,
  storedMatchFixture,
} from './storageContract';

describe('IndexedDB match storage', () => {
  describeMatchStorageContract(() =>
    createIndexedDbStorage({ factory: new IDBFactory() }),
  );

  it('persists across instances over the same database', async () => {
    const factory = new IDBFactory();
    const first = createIndexedDbStorage({ factory });
    await first.put(storedMatchFixture());

    const second = createIndexedDbStorage({ factory });
    expect((await second.list()).map((m) => m.id)).toEqual(['match-1']);
  });

  it('rejects rather than hangs when the open is blocked by another tab', async () => {
    // A blocked upgrade must settle the open promise, never leave reads and
    // writes waiting forever. Simulate the browser firing `blocked` by handing
    // the handle a factory whose open request we drive by hand.
    type FakeRequest = {
      onupgradeneeded: (() => void) | null;
      onsuccess: (() => void) | null;
      onerror: (() => void) | null;
      onblocked: (() => void) | null;
      result: unknown;
      error: unknown;
    };
    // A holder (not a bare `let`) keeps the union type across the closure
    // assignment TypeScript's flow analysis cannot otherwise see.
    const held: { request: FakeRequest | null } = { request: null };
    const factory = {
      open() {
        held.request = {
          onupgradeneeded: null,
          onsuccess: null,
          onerror: null,
          onblocked: null,
          result: null,
          error: null,
        };
        return held.request;
      },
    } as unknown as IDBFactory;

    const storage = createIndexedDbStorage({ factory });
    const listing = storage.list();
    // The open is in flight; the browser reports it blocked by another
    // connection holding an older version open.
    held.request?.onblocked?.();

    await expect(listing).rejects.toThrow(/block/i);
  });

  it('closes on versionchange so another tab can upgrade without blocking', async () => {
    const factory = new IDBFactory();
    const storage = createIndexedDbStorage({ factory });
    // Open and hold a connection at the current version.
    await storage.put(storedMatchFixture());

    // Another tab deploys a schema bump: open the same database one version up.
    // If our connection ignored versionchange this open would be blocked and
    // hang; because it closes, the upgrade proceeds.
    const upgraded = await new Promise<IDBDatabase>((resolve, reject) => {
      const open = factory.open('pg-backgammon', 99);
      open.onupgradeneeded = () => {
        const db = open.result;
        if (!db.objectStoreNames.contains('future-store')) {
          db.createObjectStore('future-store', { keyPath: 'id' });
        }
      };
      open.onsuccess = () => resolve(open.result);
      open.onerror = () => reject(open.error ?? new Error('open failed'));
      open.onblocked = () =>
        reject(new Error('blocked by the held connection'));
    });

    expect(upgraded.version).toBe(99);
    upgraded.close();
  });
});
