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
});
