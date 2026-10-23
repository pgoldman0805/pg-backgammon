/**
 * Puzzle-progress persistence (spec story 37): one plain document behind a
 * small seam, IndexedDB in the app (a new v2 object store) and an in-memory
 * fake in tests. The v1 -> v2 schema upgrade must leave stored matches
 * untouched.
 */

import { IDBFactory } from 'fake-indexeddb';
import { describe, expect, it } from 'vitest';
import type { PuzzleProgressState } from '../puzzles/queue';
import { recordAnswer } from '../puzzles/queue';
import { createIndexedDbStorage } from './idb';
import {
  createIndexedDbPuzzleProgressStorage,
  createMemoryPuzzleProgressStorage,
  type PuzzleProgressStorage,
} from './puzzleProgress';
import { storedMatchFixture } from './storageContract';

const sample: PuzzleProgressState = {
  themes: { priming: { solved: 2, missed: 1, streak: 2 } },
  solvedIds: ['curated-001'],
  retryQueue: ['curated-004'],
  updatedAt: 1234,
};

function describeProgressContract(create: () => PuzzleProgressStorage): void {
  it('loads null before anything is saved', async () => {
    expect(await create().load()).toBeNull();
  });

  it('round-trips the saved state', async () => {
    const storage = create();
    await storage.save(sample);
    expect(await storage.load()).toEqual(sample);
  });

  it('replaces on save and forgets on clear', async () => {
    const storage = create();
    await storage.save(sample);
    const next = recordAnswer(
      sample,
      {
        id: 'curated-004',
        kind: 'cube',
        theme: 'priming',
        source: 'curated',
        board: {
          points: [],
          bar: { white: 0, black: 0 },
          off: { white: 0, black: 0 },
        },
        hero: 'white',
        match: {
          matchLength: 0,
          score: { white: 0, black: 0 },
          cube: { value: 1, owner: 'center' },
        },
        decision: 'offer',
        choices: [{ action: 'double', equity: 1, equityLoss: 0 }],
        verdict: 'Double, take',
      },
      true,
      2000,
    );
    await storage.save(next);
    expect((await storage.load())?.retryQueue).toEqual([]);
    await storage.clear();
    expect(await storage.load()).toBeNull();
  });

  it('does not share object identity with callers', async () => {
    const storage = create();
    const state = structuredClone(sample);
    await storage.save(state);
    const loaded = await storage.load();
    expect(loaded).not.toBe(state);
    expect(loaded).toEqual(state);
  });
}

describe('in-memory puzzle progress storage', () => {
  describeProgressContract(() => createMemoryPuzzleProgressStorage());
});

describe('IndexedDB puzzle progress storage', () => {
  describeProgressContract(() =>
    createIndexedDbPuzzleProgressStorage({ factory: new IDBFactory() }),
  );

  it('persists across instances over the same database', async () => {
    const factory = new IDBFactory();
    await createIndexedDbPuzzleProgressStorage({ factory }).save(sample);
    expect(
      await createIndexedDbPuzzleProgressStorage({ factory }).load(),
    ).toEqual(sample);
  });

  it('shares one database with match storage without losing either', async () => {
    const factory = new IDBFactory();
    const matches = createIndexedDbStorage({ factory });
    const progress = createIndexedDbPuzzleProgressStorage({ factory });
    await matches.put(storedMatchFixture());
    await progress.save(sample);
    expect((await matches.list()).map((m) => m.id)).toEqual(['match-1']);
    expect(await progress.load()).toEqual(sample);
  });

  it('upgrading a version-1 database preserves existing matches', async () => {
    const factory = new IDBFactory();
    // Recreate the ticket-07 era database: version 1, matches store only.
    await new Promise<void>((resolve, reject) => {
      const request = factory.open('pg-backgammon', 1);
      request.onupgradeneeded = () => {
        request.result.createObjectStore('matches', { keyPath: 'id' });
      };
      request.onsuccess = () => {
        const db = request.result;
        const tx = db.transaction('matches', 'readwrite');
        tx.objectStore('matches').put(storedMatchFixture());
        tx.oncomplete = () => {
          db.close();
          resolve();
        };
        tx.onerror = () => reject(tx.error);
      };
      request.onerror = () => reject(request.error);
    });

    const matches = createIndexedDbStorage({ factory });
    expect((await matches.list()).map((m) => m.id)).toEqual(['match-1']);

    const progress = createIndexedDbPuzzleProgressStorage({ factory });
    expect(await progress.load()).toBeNull();
    await progress.save(sample);
    expect(await progress.load()).toEqual(sample);
    // The upgrade added the progress store without touching matches.
    expect((await matches.list()).map((m) => m.id)).toEqual(['match-1']);
  });
});
