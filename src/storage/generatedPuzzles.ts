/**
 * Generated-puzzle persistence (ticket 18, GLOSSARY "Puzzle"): puzzles found
 * by in-app self-play mining live in the `generated-puzzles` store of the
 * shared database (the version-4 upgrade) so they survive reload and slot
 * into their theme's drill beside the curated set. IndexedDB in the app, an
 * in-memory fake in tests and jsdom, matching the blunder-puzzle conventions.
 */

import type { Puzzle } from '../puzzles/types';
import {
  asPromise,
  createDatabaseHandle,
  GENERATED_PUZZLES_STORE,
  type IndexedDbStorageOptions,
} from './idb';
import { hasPuzzleShape } from './puzzleShape';

/**
 * The generated-puzzle seam. Implementations clone on the way in and out
 * (IndexedDB's structured-clone semantics), so callers never share object
 * identity with the store.
 */
export interface GeneratedPuzzleStorage {
  /** Every stored puzzle, in stable id order. */
  list(): Promise<Puzzle[]>;
  /** Insert or replace each puzzle by id. */
  putAll(puzzles: readonly Puzzle[]): Promise<void>;
  /** Forget every generated puzzle. */
  clear(): Promise<void>;
}

/**
 * Structural validation for generated puzzles arriving from outside (backup
 * import): anything corrupt is treated as absent, never thrown.
 */
export function isGeneratedPuzzle(value: unknown): value is Puzzle {
  return hasPuzzleShape(value) && value.source === 'generated';
}

const byId = (a: Puzzle, b: Puzzle): number => a.id.localeCompare(b.id);

export function createMemoryGeneratedPuzzleStorage(): GeneratedPuzzleStorage {
  const puzzles = new Map<string, Puzzle>();
  return {
    async list() {
      return [...puzzles.values()].map((p) => structuredClone(p)).sort(byId);
    },
    async putAll(incoming) {
      for (const puzzle of incoming) {
        puzzles.set(puzzle.id, structuredClone(puzzle));
      }
    },
    async clear() {
      puzzles.clear();
    },
  };
}

export function createIndexedDbGeneratedPuzzleStorage(
  options: IndexedDbStorageOptions = {},
): GeneratedPuzzleStorage {
  const db = createDatabaseHandle(options);

  async function store(mode: IDBTransactionMode): Promise<IDBObjectStore> {
    return (await db())
      .transaction(GENERATED_PUZZLES_STORE, mode)
      .objectStore(GENERATED_PUZZLES_STORE);
  }

  return {
    async list() {
      const rows = await asPromise<Puzzle[]>(
        (await store('readonly')).getAll(),
      );
      return rows.sort(byId);
    },
    async putAll(puzzles) {
      if (puzzles.length === 0) {
        return;
      }
      const target = await store('readwrite');
      await Promise.all(puzzles.map((puzzle) => asPromise(target.put(puzzle))));
    },
    async clear() {
      await asPromise((await store('readwrite')).clear());
    },
  };
}

let shared: GeneratedPuzzleStorage | null = null;

/**
 * The app-wide shared generated-puzzle storage. IndexedDB in the browser; an
 * in-memory stand-in where IndexedDB does not exist (jsdom tests rendering
 * pages without injecting storage), so persistence is simply ephemeral there.
 */
export function getGeneratedPuzzleStorage(): GeneratedPuzzleStorage {
  if (!shared) {
    shared =
      typeof indexedDB === 'undefined'
        ? createMemoryGeneratedPuzzleStorage()
        : createIndexedDbGeneratedPuzzleStorage();
  }
  return shared;
}
