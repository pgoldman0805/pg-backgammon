/**
 * The app's IndexedDB plumbing (spec: all data local, no backend). One
 * database holds every object store: `matches` (ticket 07) and
 * `puzzle-progress` (ticket 11, the version-2 upgrade — the upgrade only ever
 * adds stores, so existing matches survive it untouched). The database opens
 * lazily on first use; the factory is injectable so tests can run against
 * fake-indexeddb with per-test isolation.
 */

import type { MatchStorage, StoredMatch } from './types';

const DB_NAME = 'pg-backgammon';
/**
 * v1: matches (ticket 07). v2: + puzzle-progress (ticket 11).
 * v3: + blunder-puzzles (ticket 12). v4: + generated-puzzles (ticket 18).
 */
const DB_VERSION = 4;
const MATCHES = 'matches';

/** The puzzle-progress object store, added by the v2 upgrade. */
export const PUZZLE_PROGRESS_STORE = 'puzzle-progress';

/** The mined blunder-puzzle object store, added by the v3 upgrade. */
export const BLUNDER_PUZZLES_STORE = 'blunder-puzzles';

/** The self-play generated-puzzle object store, added by the v4 upgrade. */
export const GENERATED_PUZZLES_STORE = 'generated-puzzles';

export interface IndexedDbStorageOptions {
  /** Defaults to the global indexedDB. */
  readonly factory?: IDBFactory;
  /** Database name; defaults to the app's. */
  readonly name?: string;
}

/** Resolve an IDBRequest as a promise. */
export function asPromise<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () =>
      reject(request.error ?? new Error('IndexedDB request failed'));
  });
}

function openDatabase(
  factory: IDBFactory,
  name: string,
  onVersionChange: (db: IDBDatabase) => void,
): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = factory.open(name, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      // Additive only: never drop or rewrite an existing store, so a v1
      // database upgrades with all its matches intact.
      if (!db.objectStoreNames.contains(MATCHES)) {
        db.createObjectStore(MATCHES, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(PUZZLE_PROGRESS_STORE)) {
        db.createObjectStore(PUZZLE_PROGRESS_STORE, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(BLUNDER_PUZZLES_STORE)) {
        db.createObjectStore(BLUNDER_PUZZLES_STORE, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(GENERATED_PUZZLES_STORE)) {
        db.createObjectStore(GENERATED_PUZZLES_STORE, { keyPath: 'id' });
      }
    };
    // Another tab is holding an older version open and did not close in time:
    // settle the open as a failure so reads and writes surface an error
    // instead of hanging forever behind a stuck upgrade.
    request.onblocked = () =>
      reject(
        new Error(
          'IndexedDB upgrade is blocked by another open tab; close the other ' +
            'tabs and reload',
        ),
      );
    request.onsuccess = () => {
      const db = request.result;
      // A later version bump in another tab must not hang waiting on us:
      // close this connection the moment it would block the upgrade.
      db.onversionchange = () => onVersionChange(db);
      resolve(db);
    };
    request.onerror = () =>
      reject(request.error ?? new Error('IndexedDB failed to open'));
  });
}

/**
 * Lazily open the app database once per caller, recovering from a failed
 * open on the next call. Shared by every store-specific storage module.
 */
export function createDatabaseHandle(
  options: IndexedDbStorageOptions = {},
): () => Promise<IDBDatabase> {
  const name = options.name ?? DB_NAME;
  let database: Promise<IDBDatabase> | null = null;
  return function db(): Promise<IDBDatabase> {
    if (!database) {
      const factory = options.factory ?? indexedDB;
      const opening = openDatabase(factory, name, (conn) => {
        // A schema upgrade is waiting in another tab: close so it can proceed,
        // and drop the cached handle so the next call reopens at the new
        // version instead of transacting on a closed connection.
        conn.close();
        if (database === opening) {
          database = null;
        }
      });
      database = opening;
      // A failed open should not poison every later call.
      opening.catch(() => {
        if (database === opening) {
          database = null;
        }
      });
    }
    return database;
  };
}

export function createIndexedDbStorage(
  options: IndexedDbStorageOptions = {},
): MatchStorage {
  const db = createDatabaseHandle(options);

  async function matchesStore(
    mode: IDBTransactionMode,
  ): Promise<IDBObjectStore> {
    return (await db()).transaction(MATCHES, mode).objectStore(MATCHES);
  }

  return {
    async list() {
      const all = await asPromise<StoredMatch[]>(
        (await matchesStore('readonly')).getAll(),
      );
      return all.sort((a, b) => b.updatedAt - a.updatedAt);
    },
    async get(id) {
      const match = await asPromise<StoredMatch | undefined>(
        (await matchesStore('readonly')).get(id),
      );
      return match ?? null;
    },
    async put(match) {
      await asPromise((await matchesStore('readwrite')).put(match));
    },
    async delete(id) {
      await asPromise((await matchesStore('readwrite')).delete(id));
    },
    async clear() {
      await asPromise((await matchesStore('readwrite')).clear());
    },
  };
}
