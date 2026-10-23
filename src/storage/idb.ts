/**
 * IndexedDB-backed MatchStorage (spec: all data local, no backend). One
 * database with one object store keyed by match id; the database opens
 * lazily on first use. The factory is injectable so tests can run against
 * fake-indexeddb with per-test isolation.
 */

import type { MatchStorage, StoredMatch } from './types';

const DB_NAME = 'pg-backgammon';
const DB_VERSION = 1;
const MATCHES = 'matches';

export interface IndexedDbStorageOptions {
  /** Defaults to the global indexedDB. */
  readonly factory?: IDBFactory;
  /** Database name; defaults to the app's. */
  readonly name?: string;
}

function asPromise<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () =>
      reject(request.error ?? new Error('IndexedDB request failed'));
  });
}

function openDatabase(factory: IDBFactory, name: string): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = factory.open(name, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(MATCHES)) {
        db.createObjectStore(MATCHES, { keyPath: 'id' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () =>
      reject(request.error ?? new Error('IndexedDB failed to open'));
  });
}

export function createIndexedDbStorage(
  options: IndexedDbStorageOptions = {},
): MatchStorage {
  const name = options.name ?? DB_NAME;
  let database: Promise<IDBDatabase> | null = null;

  function db(): Promise<IDBDatabase> {
    if (!database) {
      const factory = options.factory ?? indexedDB;
      database = openDatabase(factory, name);
      // A failed open should not poison every later call.
      database.catch(() => {
        database = null;
      });
    }
    return database;
  }

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
