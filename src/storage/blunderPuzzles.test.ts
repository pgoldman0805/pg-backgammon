/**
 * Blunder-puzzle persistence (ticket 12): mined puzzles survive reload in a
 * new v3 object store, alongside a per-match "mined at analysis stamp" marker
 * so catch-up mining can skip matches already covered. The v2 -> v3 schema
 * upgrade must leave stored matches and puzzle progress untouched.
 */

import { IDBFactory } from 'fake-indexeddb';
import { describe, expect, it } from 'vitest';
import type { CubePuzzle, PlayPuzzle, Puzzle } from '../puzzles/types';
import {
  type BlunderPuzzleStorage,
  createIndexedDbBlunderPuzzleStorage,
  createMemoryBlunderPuzzleStorage,
  isBlunderPuzzle,
} from './blunderPuzzles';
import { createIndexedDbStorage } from './idb';
import { createIndexedDbPuzzleProgressStorage } from './puzzleProgress';
import { storedMatchFixture } from './storageContract';

const board = {
  points: [
    0, 2, 0, 0, 0, 0, 4, 0, 0, 0, 0, 0, -5, 5, 0, 0, 0, -3, 0, -5, 0, 0, 0, 0,
    -2,
  ],
  bar: { white: 0, black: 0 },
  off: { white: 4, black: 0 },
};

const playPuzzle: PlayPuzzle = {
  id: 'blunder:m1:0:0',
  kind: 'play',
  theme: 'priming',
  source: 'blunder',
  origin: { matchId: 'm1', game: 0, decision: 0 },
  board,
  hero: 'white',
  match: {
    matchLength: 7,
    score: { white: 2, black: 1 },
    cube: { value: 2, owner: 'white' },
    crawford: false,
  },
  roll: [6, 2],
  answers: [
    {
      rank: 1,
      moveText: '13/7 13/11',
      movements: [
        { from: 13, to: 7, die: 6, hit: false },
        { from: 13, to: 11, die: 2, hit: false },
      ],
      finalKey: 'k1',
      equity: 0.1,
      equityLoss: 0,
    },
  ],
};

const cubePuzzle: CubePuzzle = {
  id: 'blunder:m1:0:1',
  kind: 'cube',
  theme: 'cube-handling',
  source: 'blunder',
  origin: { matchId: 'm1', game: 0, decision: 1 },
  board,
  hero: 'white',
  match: {
    matchLength: 7,
    score: { white: 2, black: 1 },
    cube: { value: 1, owner: 'center' },
    crawford: false,
  },
  decision: 'response',
  choices: [
    { action: 'pass', equity: -1, equityLoss: 0 },
    { action: 'take', equity: -1.3, equityLoss: 0.3 },
  ],
  verdict: 'Double, pass',
};

function describeBlunderContract(create: () => BlunderPuzzleStorage): void {
  it('starts empty, with no mined marks', async () => {
    const storage = create();
    expect(await storage.list()).toEqual([]);
    expect(await storage.loadMined()).toEqual({});
  });

  it('round-trips puzzles, listed in stable id order', async () => {
    const storage = create();
    await storage.putAll([cubePuzzle, playPuzzle]);
    expect(await storage.list()).toEqual([playPuzzle, cubePuzzle]);
  });

  it('upserts by id', async () => {
    const storage = create();
    await storage.putAll([playPuzzle]);
    await storage.putAll([{ ...playPuzzle, theme: 'blitzing' } as Puzzle]);
    const listed = await storage.list();
    expect(listed).toHaveLength(1);
    expect(listed[0].theme).toBe('blitzing');
  });

  it('tracks per-match mined stamps, invisible to list()', async () => {
    const storage = create();
    await storage.markMined('m1', 111);
    await storage.markMined('m2', 222);
    await storage.markMined('m1', 333);
    expect(await storage.loadMined()).toEqual({ m1: 333, m2: 222 });
    expect(await storage.list()).toEqual([]);
  });

  it('clears puzzles and marks together', async () => {
    const storage = create();
    await storage.putAll([playPuzzle]);
    await storage.markMined('m1', 111);
    await storage.clear();
    expect(await storage.list()).toEqual([]);
    expect(await storage.loadMined()).toEqual({});
  });

  it('does not share object identity with callers', async () => {
    const storage = create();
    const puzzle = structuredClone(playPuzzle);
    await storage.putAll([puzzle]);
    const [loaded] = await storage.list();
    expect(loaded).not.toBe(puzzle);
    expect(loaded).toEqual(puzzle);
  });
}

describe('in-memory blunder puzzle storage', () => {
  describeBlunderContract(() => createMemoryBlunderPuzzleStorage());
});

describe('IndexedDB blunder puzzle storage', () => {
  describeBlunderContract(() =>
    createIndexedDbBlunderPuzzleStorage({ factory: new IDBFactory() }),
  );

  it('persists across instances over the same database', async () => {
    const factory = new IDBFactory();
    const first = createIndexedDbBlunderPuzzleStorage({ factory });
    await first.putAll([playPuzzle, cubePuzzle]);
    await first.markMined('m1', 111);

    const second = createIndexedDbBlunderPuzzleStorage({ factory });
    expect(await second.list()).toEqual([playPuzzle, cubePuzzle]);
    expect(await second.loadMined()).toEqual({ m1: 111 });
  });

  it('upgrading a version-2 database preserves matches and puzzle progress', async () => {
    const factory = new IDBFactory();
    const progressRow = {
      id: 'progress',
      themes: {},
      solvedIds: ['curated-001'],
      retryQueue: [],
      updatedAt: 9,
    };
    // Recreate the ticket-11 era database: version 2, matches + progress.
    await new Promise<void>((resolve, reject) => {
      const request = factory.open('pg-backgammon', 2);
      request.onupgradeneeded = () => {
        request.result.createObjectStore('matches', { keyPath: 'id' });
        request.result.createObjectStore('puzzle-progress', { keyPath: 'id' });
      };
      request.onsuccess = () => {
        const db = request.result;
        const tx = db.transaction(['matches', 'puzzle-progress'], 'readwrite');
        tx.objectStore('matches').put(storedMatchFixture());
        tx.objectStore('puzzle-progress').put(progressRow);
        tx.oncomplete = () => {
          db.close();
          resolve();
        };
        tx.onerror = () => reject(tx.error);
      };
      request.onerror = () => reject(request.error);
    });

    const blunders = createIndexedDbBlunderPuzzleStorage({ factory });
    expect(await blunders.list()).toEqual([]);
    await blunders.putAll([playPuzzle]);
    expect(await blunders.list()).toEqual([playPuzzle]);

    // The upgrade added the blunder store without touching its siblings.
    const matches = createIndexedDbStorage({ factory });
    expect((await matches.list()).map((m) => m.id)).toEqual(['match-1']);
    const progress = createIndexedDbPuzzleProgressStorage({ factory });
    expect((await progress.load())?.solvedIds).toEqual(['curated-001']);
  });
});

describe('isBlunderPuzzle', () => {
  it('accepts both mined puzzle kinds', () => {
    expect(isBlunderPuzzle(playPuzzle)).toBe(true);
    expect(isBlunderPuzzle(cubePuzzle)).toBe(true);
  });

  it('rejects structures that are not a mined puzzle', () => {
    expect(isBlunderPuzzle(null)).toBe(false);
    expect(isBlunderPuzzle('nope')).toBe(false);
    expect(isBlunderPuzzle({ ...playPuzzle, source: 'curated' })).toBe(false);
    expect(isBlunderPuzzle({ ...playPuzzle, origin: undefined })).toBe(false);
    expect(isBlunderPuzzle({ ...playPuzzle, theme: 'opening' })).toBe(false);
    expect(isBlunderPuzzle({ ...playPuzzle, answers: 'nope' })).toBe(false);
    expect(isBlunderPuzzle({ ...playPuzzle, board: null })).toBe(false);
    expect(isBlunderPuzzle({ ...cubePuzzle, choices: [{}] })).toBe(false);
    expect(isBlunderPuzzle({ ...cubePuzzle, verdict: 7 })).toBe(false);
  });
});
