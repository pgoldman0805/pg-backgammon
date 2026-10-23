/**
 * The behavior every MatchStorage implementation must honor, exercised by
 * both the in-memory fake (tests' dependency) and the IndexedDB
 * implementation (the app's). Import from a *.test.ts file.
 */

import type { MatchRecord } from '../rules';
import type { MatchStorage, StoredMatch } from './types';

/** A minimal, structurally valid stored match (finished, snapshot-free). */
export function storedMatchFixture(
  overrides: Partial<StoredMatch> = {},
): StoredMatch {
  const record: MatchRecord = { length: 3, games: [] };
  return {
    id: 'match-1',
    config: { length: 3, mode: 'computer', difficulty: 'casual' },
    status: 'finished',
    createdAt: 1_000,
    updatedAt: 1_000,
    record,
    score: { white: 3, black: 0 },
    winner: 'white',
    state: null,
    ...overrides,
  };
}

export function describeMatchStorageContract(
  makeStorage: () => MatchStorage | Promise<MatchStorage>,
): void {
  let storage: MatchStorage;

  beforeEach(async () => {
    storage = await makeStorage();
  });

  it('returns a stored match by id, and null for an unknown id', async () => {
    const match = storedMatchFixture();
    await storage.put(match);

    expect(await storage.get('match-1')).toEqual(match);
    expect(await storage.get('no-such-match')).toBeNull();
  });

  it('starts empty and lists stored matches newest-updated first', async () => {
    expect(await storage.list()).toEqual([]);

    const older = storedMatchFixture({ id: 'older', updatedAt: 1_000 });
    const newer = storedMatchFixture({ id: 'newer', updatedAt: 2_000 });
    await storage.put(older);
    await storage.put(newer);

    expect((await storage.list()).map((m) => m.id)).toEqual(['newer', 'older']);
  });

  it('replaces a match stored under the same id', async () => {
    await storage.put(storedMatchFixture({ updatedAt: 1_000 }));
    await storage.put(
      storedMatchFixture({ updatedAt: 2_000, winner: 'black' }),
    );

    const matches = await storage.list();
    expect(matches).toHaveLength(1);
    expect(matches[0].winner).toBe('black');
  });

  it('deletes a match by id and tolerates deleting a missing one', async () => {
    await storage.put(storedMatchFixture());

    await storage.delete('match-1');
    await storage.delete('match-1');

    expect(await storage.get('match-1')).toBeNull();
    expect(await storage.list()).toEqual([]);
  });

  it('clears everything', async () => {
    await storage.put(storedMatchFixture({ id: 'a' }));
    await storage.put(storedMatchFixture({ id: 'b' }));

    await storage.clear();

    expect(await storage.list()).toEqual([]);
  });

  it('carries unknown extra fields through untouched', async () => {
    const withExtras = {
      ...storedMatchFixture(),
      config: {
        length: 3,
        mode: 'computer',
        difficulty: 'casual',
        tutor: true,
      },
      analysis: { errorRate: 0.042 },
      futureField: 'kept',
    } as StoredMatch;
    await storage.put(withExtras);

    expect(await storage.get('match-1')).toEqual(withExtras);
  });

  it('does not share object identity with the caller', async () => {
    const match = storedMatchFixture();
    await storage.put(match);

    const first = await storage.get('match-1');
    const second = await storage.get('match-1');
    expect(first).not.toBeNull();
    expect(first).not.toBe(match);
    expect(first?.record).not.toBe(match.record);
    expect(first).not.toBe(second);
  });
}
