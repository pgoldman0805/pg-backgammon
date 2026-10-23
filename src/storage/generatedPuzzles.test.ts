/**
 * Generated-puzzle persistence (ticket 18): puzzles found by in-app self-play
 * mining survive reload in a new v4 object store. The v3 -> v4 schema upgrade
 * must leave stored matches, puzzle progress and blunder puzzles untouched.
 */

import { IDBFactory } from 'fake-indexeddb';
import { describe, expect, it } from 'vitest';
import type { CubePuzzle, PlayPuzzle, Puzzle } from '../puzzles/types';
import { createIndexedDbBlunderPuzzleStorage } from './blunderPuzzles';
import {
  createIndexedDbGeneratedPuzzleStorage,
  createMemoryGeneratedPuzzleStorage,
  type GeneratedPuzzleStorage,
  isGeneratedPuzzle,
} from './generatedPuzzles';
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
  id: 'generated-7-1',
  kind: 'play',
  theme: 'priming',
  source: 'generated',
  board,
  hero: 'white',
  match: {
    matchLength: 0,
    score: { white: 0, black: 0 },
    cube: { value: 1, owner: 'center' },
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
  id: 'generated-7-2',
  kind: 'cube',
  theme: 'cube-handling',
  source: 'generated',
  board,
  hero: 'white',
  match: {
    matchLength: 0,
    score: { white: 0, black: 0 },
    cube: { value: 1, owner: 'center' },
  },
  decision: 'response',
  choices: [
    { action: 'pass', equity: -1, equityLoss: 0 },
    { action: 'take', equity: -1.3, equityLoss: 0.3 },
  ],
  verdict: 'Double, pass',
};

function describeGeneratedContract(create: () => GeneratedPuzzleStorage): void {
  it('starts empty', async () => {
    expect(await create().list()).toEqual([]);
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

  it('clears every puzzle', async () => {
    const storage = create();
    await storage.putAll([playPuzzle, cubePuzzle]);
    await storage.clear();
    expect(await storage.list()).toEqual([]);
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

describe('in-memory generated puzzle storage', () => {
  describeGeneratedContract(() => createMemoryGeneratedPuzzleStorage());
});

describe('IndexedDB generated puzzle storage', () => {
  describeGeneratedContract(() =>
    createIndexedDbGeneratedPuzzleStorage({ factory: new IDBFactory() }),
  );

  it('persists across instances over the same database', async () => {
    const factory = new IDBFactory();
    const first = createIndexedDbGeneratedPuzzleStorage({ factory });
    await first.putAll([playPuzzle, cubePuzzle]);

    const second = createIndexedDbGeneratedPuzzleStorage({ factory });
    expect(await second.list()).toEqual([playPuzzle, cubePuzzle]);
  });

  it('upgrading a version-3 database preserves matches, progress and blunder puzzles', async () => {
    const factory = new IDBFactory();
    const progressRow = {
      id: 'progress',
      themes: {},
      solvedIds: ['curated-001'],
      retryQueue: [],
      updatedAt: 9,
    };
    const blunderRow = {
      ...structuredClone(playPuzzle),
      id: 'blunder:m1:0:0',
      source: 'blunder',
      origin: { matchId: 'm1', game: 0, decision: 0 },
    };
    // Recreate the ticket-12 era database: version 3, all three stores.
    await new Promise<void>((resolve, reject) => {
      const request = factory.open('pg-backgammon', 3);
      request.onupgradeneeded = () => {
        request.result.createObjectStore('matches', { keyPath: 'id' });
        request.result.createObjectStore('puzzle-progress', { keyPath: 'id' });
        request.result.createObjectStore('blunder-puzzles', { keyPath: 'id' });
      };
      request.onsuccess = () => {
        const db = request.result;
        const tx = db.transaction(
          ['matches', 'puzzle-progress', 'blunder-puzzles'],
          'readwrite',
        );
        tx.objectStore('matches').put(storedMatchFixture());
        tx.objectStore('puzzle-progress').put(progressRow);
        tx.objectStore('blunder-puzzles').put(blunderRow);
        tx.oncomplete = () => {
          db.close();
          resolve();
        };
        tx.onerror = () => reject(tx.error);
      };
      request.onerror = () => reject(request.error);
    });

    const generated = createIndexedDbGeneratedPuzzleStorage({ factory });
    expect(await generated.list()).toEqual([]);
    await generated.putAll([playPuzzle]);
    expect(await generated.list()).toEqual([playPuzzle]);

    // The upgrade added the generated store without touching its siblings.
    const matches = createIndexedDbStorage({ factory });
    expect((await matches.list()).map((m) => m.id)).toEqual(['match-1']);
    const progress = createIndexedDbPuzzleProgressStorage({ factory });
    expect((await progress.load())?.solvedIds).toEqual(['curated-001']);
    const blunders = createIndexedDbBlunderPuzzleStorage({ factory });
    expect((await blunders.list()).map((p) => p.id)).toEqual([
      'blunder:m1:0:0',
    ]);
  });
});

describe('isGeneratedPuzzle', () => {
  it('accepts both generated puzzle kinds', () => {
    expect(isGeneratedPuzzle(playPuzzle)).toBe(true);
    expect(isGeneratedPuzzle(cubePuzzle)).toBe(true);
  });

  it('rejects structures that are not a generated puzzle', () => {
    expect(isGeneratedPuzzle(null)).toBe(false);
    expect(isGeneratedPuzzle('nope')).toBe(false);
    expect(isGeneratedPuzzle({ ...playPuzzle, source: 'curated' })).toBe(false);
    expect(isGeneratedPuzzle({ ...playPuzzle, source: 'blunder' })).toBe(false);
    expect(isGeneratedPuzzle({ ...playPuzzle, theme: 'opening' })).toBe(false);
    expect(isGeneratedPuzzle({ ...playPuzzle, answers: [] })).toBe(false);
    expect(isGeneratedPuzzle({ ...playPuzzle, board: null })).toBe(false);
    expect(isGeneratedPuzzle({ ...cubePuzzle, choices: [{}] })).toBe(false);
    expect(isGeneratedPuzzle({ ...cubePuzzle, verdict: 7 })).toBe(false);
  });
});
