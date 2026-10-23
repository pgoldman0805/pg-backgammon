/**
 * Observable match storage (ticket 12): a thin decorator exposing put events
 * so background features (the blunder miner) can react the moment a row —
 * e.g. one that just gained its analysis — persists, without polling and
 * without the writer knowing about them. Listeners are notified after the put
 * has landed; a listener failure never breaks the write.
 */

import type { MatchStorage, StoredMatch } from './types';

export interface MatchPutEvents {
  /** Subscribe to every stored put; returns an unsubscribe function. */
  onMatchPut(listener: (match: StoredMatch) => void): () => void;
}

export type ObservableMatchStorage = MatchStorage & MatchPutEvents;

export function createObservableMatchStorage(
  inner: MatchStorage,
): ObservableMatchStorage {
  const listeners = new Set<(match: StoredMatch) => void>();
  return {
    list: () => inner.list(),
    get: (id) => inner.get(id),
    async put(match) {
      await inner.put(match);
      for (const listener of listeners) {
        try {
          listener(match);
        } catch {
          // Observers must never break the write path.
        }
      }
    },
    delete: (id) => inner.delete(id),
    clear: () => inner.clear(),
    onMatchPut(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}
