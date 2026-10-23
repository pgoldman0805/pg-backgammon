/**
 * Match persistence (spec: IndexedDB, local-only, JSON backup): a small
 * storage seam with an in-memory fake for tests, a store-observing persister
 * for continuous saves, and full-history backup export/import.
 */

export {
  exportBackup,
  type HistoryBackup,
  importBackup,
  parseBackup,
  serializeBackup,
} from './backup';
export {
  type BlunderPuzzleStorage,
  createIndexedDbBlunderPuzzleStorage,
  createMemoryBlunderPuzzleStorage,
  getBlunderPuzzleStorage,
  isBlunderPuzzle,
  type MinedMatchStamps,
} from './blunderPuzzles';
export { createIndexedDbStorage, type IndexedDbStorageOptions } from './idb';
export { getMatchStorage, getObservableMatchStorage } from './instance';
export { createMemoryStorage } from './memory';
export {
  createObservableMatchStorage,
  type MatchPutEvents,
  type ObservableMatchStorage,
} from './observe';
export {
  createMatchPersister,
  type MatchPersister,
  type MatchPersisterOptions,
  type MatchStoreLike,
  type PersistedIdentity,
} from './persist';
export {
  createIndexedDbPuzzleProgressStorage,
  createMemoryPuzzleProgressStorage,
  getPuzzleProgressStorage,
  isPuzzleProgressState,
  type PuzzleProgressStorage,
} from './puzzleProgress';
export { isStoredMatch, snapshotMatch } from './snapshot';
export type {
  MatchConfig,
  MatchStatus,
  MatchStorage,
  StoredMatch,
} from './types';
export {
  type MatchPersistence,
  useMatchPersistence,
} from './useMatchPersistence';
