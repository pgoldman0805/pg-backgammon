import { createMemoryStorage } from './memory';
import {
  describeMatchStorageContract,
  storedMatchFixture,
} from './storageContract';

describe('in-memory match storage', () => {
  describeMatchStorageContract(() => createMemoryStorage());

  it('can be seeded with existing matches', async () => {
    const seeded = createMemoryStorage([storedMatchFixture({ id: 'seed' })]);

    expect((await seeded.list()).map((m) => m.id)).toEqual(['seed']);
  });
});
