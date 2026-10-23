/**
 * In-memory MatchStorage: the test stand-in for the IndexedDB implementation.
 * Honors the same contract, including structured-clone semantics, so anything
 * unserializable fails here just as it would in the real store.
 */

import type { MatchStorage, StoredMatch } from './types';

export function createMemoryStorage(
  seed: readonly StoredMatch[] = [],
): MatchStorage {
  const matches = new Map<string, StoredMatch>(
    seed.map((match) => [match.id, structuredClone(match)]),
  );
  return {
    async list() {
      return [...matches.values()]
        .sort((a, b) => b.updatedAt - a.updatedAt)
        .map((match) => structuredClone(match));
    },
    async get(id) {
      const match = matches.get(id);
      return match ? structuredClone(match) : null;
    },
    async put(match) {
      matches.set(match.id, structuredClone(match));
    },
    async delete(id) {
      matches.delete(id);
    },
    async clear() {
      matches.clear();
    },
  };
}
