/**
 * Match persistence (spec: IndexedDB, local-only, JSON backup): a small
 * storage seam with an in-memory fake for tests, a store-observing persister
 * for continuous saves, and full-history backup export/import.
 */

export {
  type BackupSummary,
  exportBackup,
  type HistoryBackup,
  type ImportBackupOptions,
  type ImportMode,
  importBackup,
  parseBackup,
  serializeBackup,
  summarizeBackup,
} from './backup';
export {
  type BlunderPuzzleStorage,
  createIndexedDbBlunderPuzzleStorage,
  createMemoryBlunderPuzzleStorage,
  getBlunderPuzzleStorage,
  isBlunderPuzzle,
  type MinedMatchStamps,
} from './blunderPuzzles';
export {
  createIndexedDbGeneratedPuzzleStorage,
  createMemoryGeneratedPuzzleStorage,
  type GeneratedPuzzleStorage,
  getGeneratedPuzzleStorage,
  isGeneratedPuzzle,
} from './generatedPuzzles';
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
  estimateStorage,
  type PersistenceState,
  persistedState,
  requestPersistentStorage,
  type StorageUsage,
} from './persistentStorage';
export {
  createIndexedDbPuzzleProgressStorage,
  createMemoryPuzzleProgressStorage,
  getPuzzleProgressStorage,
  isPuzzleProgressState,
  type PuzzleProgressStorage,
} from './puzzleProgress';
export {
  createSaveHealthMonitor,
  getSaveHealthMonitor,
  type SaveHealth,
  type SaveHealthMonitor,
  type SaveHealthReporter,
} from './saveHealth';
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
export { userSide } from './userSide';
