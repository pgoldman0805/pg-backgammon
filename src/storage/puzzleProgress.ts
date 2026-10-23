/**
 * Puzzle-progress persistence (spec story 37): the whole progress state is
 * one plain document (src/puzzles/queue.ts owns its shape), saved after every
 * answer. IndexedDB in the app — the `puzzle-progress` store of the shared
 * database — and an in-memory fake in tests and in environments without
 * IndexedDB (jsdom), matching the match-storage conventions.
 */

import type { PuzzleProgressState } from '../puzzles/queue';
import { PUZZLE_THEMES, type PuzzleTheme } from '../puzzles/types';
import {
  asPromise,
  createDatabaseHandle,
  type IndexedDbStorageOptions,
  PUZZLE_PROGRESS_STORE,
} from './idb';

/**
 * The puzzle-progress seam. Implementations clone on the way in and out
 * (IndexedDB's structured-clone semantics), so callers never share object
 * identity with the store.
 */
export interface PuzzleProgressStorage {
  /** The saved progress, or null when none has ever been saved. */
  load(): Promise<PuzzleProgressState | null>;
  /** Replace the saved progress. */
  save(progress: PuzzleProgressState): Promise<void>;
  clear(): Promise<void>;
}

/**
 * Structural validation for progress arriving from outside (backup import):
 * anything corrupt is treated as absent, never thrown.
 */
export function isPuzzleProgressState(
  value: unknown,
): value is PuzzleProgressState {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  const state = value as Record<string, unknown>;
  if (
    typeof state.updatedAt !== 'number' ||
    !Array.isArray(state.solvedIds) ||
    !state.solvedIds.every((id) => typeof id === 'string') ||
    !Array.isArray(state.retryQueue) ||
    !state.retryQueue.every((id) => typeof id === 'string') ||
    typeof state.themes !== 'object' ||
    state.themes === null
  ) {
    return false;
  }
  return Object.entries(state.themes as Record<string, unknown>).every(
    ([theme, counters]) => {
      if (!PUZZLE_THEMES.includes(theme as PuzzleTheme)) {
        return false;
      }
      if (typeof counters !== 'object' || counters === null) {
        return false;
      }
      const { solved, missed, streak } = counters as Record<string, unknown>;
      return (
        typeof solved === 'number' &&
        typeof missed === 'number' &&
        typeof streak === 'number'
      );
    },
  );
}

export function createMemoryPuzzleProgressStorage(): PuzzleProgressStorage {
  let stored: PuzzleProgressState | null = null;
  return {
    async load() {
      return stored ? structuredClone(stored) : null;
    },
    async save(progress) {
      stored = structuredClone(progress);
    },
    async clear() {
      stored = null;
    },
  };
}

/** The single row the progress document is stored under. */
const ROW_ID = 'progress';

type ProgressRow = PuzzleProgressState & { readonly id: typeof ROW_ID };

export function createIndexedDbPuzzleProgressStorage(
  options: IndexedDbStorageOptions = {},
): PuzzleProgressStorage {
  const db = createDatabaseHandle(options);

  async function store(mode: IDBTransactionMode): Promise<IDBObjectStore> {
    return (await db())
      .transaction(PUZZLE_PROGRESS_STORE, mode)
      .objectStore(PUZZLE_PROGRESS_STORE);
  }

  return {
    async load() {
      const row = await asPromise<ProgressRow | undefined>(
        (await store('readonly')).get(ROW_ID),
      );
      if (!row) {
        return null;
      }
      const { id: _id, ...progress } = row;
      return progress;
    },
    async save(progress) {
      await asPromise(
        (await store('readwrite')).put({ ...progress, id: ROW_ID }),
      );
    },
    async clear() {
      await asPromise((await store('readwrite')).delete(ROW_ID));
    },
  };
}

let shared: PuzzleProgressStorage | null = null;

/**
 * The app-wide shared puzzle-progress storage. IndexedDB in the browser; an
 * in-memory stand-in where IndexedDB does not exist (jsdom tests rendering
 * pages without injecting storage), so persistence is simply ephemeral there.
 */
export function getPuzzleProgressStorage(): PuzzleProgressStorage {
  if (!shared) {
    shared =
      typeof indexedDB === 'undefined'
        ? createMemoryPuzzleProgressStorage()
        : createIndexedDbPuzzleProgressStorage();
  }
  return shared;
}
