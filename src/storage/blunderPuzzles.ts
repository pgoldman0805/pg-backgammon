/**
 * Blunder-puzzle persistence (ticket 12, GLOSSARY "Blunder puzzle"): mined
 * puzzles live in the `blunder-puzzles` store of the shared database (the
 * version-3 upgrade) so they survive reload, beside one bookkeeping row that
 * remembers, per match, the `analyzedAt` stamp of the analysis last mined —
 * catch-up mining uses it to skip matches it has already covered and to
 * re-mine after a re-analysis or deepening. IndexedDB in the app, an
 * in-memory fake in tests and jsdom, matching the puzzle-progress
 * conventions.
 */

import { PUZZLE_THEMES, type Puzzle, type PuzzleTheme } from '../puzzles/types';
import {
  asPromise,
  BLUNDER_PUZZLES_STORE,
  createDatabaseHandle,
  type IndexedDbStorageOptions,
} from './idb';

/** matchId -> analyzedAt stamp of the analysis that was mined. */
export type MinedMatchStamps = Record<string, number>;

/**
 * The blunder-puzzle seam. Implementations clone on the way in and out
 * (IndexedDB's structured-clone semantics), so callers never share object
 * identity with the store.
 */
export interface BlunderPuzzleStorage {
  /** Every stored puzzle, in stable id order. */
  list(): Promise<Puzzle[]>;
  /** Insert or replace each puzzle by id. */
  putAll(puzzles: readonly Puzzle[]): Promise<void>;
  /** The per-match mined stamps; empty when nothing was ever mined. */
  loadMined(): Promise<MinedMatchStamps>;
  /** Record that a match's analysis (identified by stamp) has been mined. */
  markMined(matchId: string, analyzedAt: number): Promise<void>;
  /** Forget every puzzle and every mined stamp. */
  clear(): Promise<void>;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isBoard(value: unknown): boolean {
  return (
    isRecord(value) &&
    Array.isArray(value.points) &&
    isRecord(value.bar) &&
    isRecord(value.off)
  );
}

function isPlayAnswer(value: unknown): boolean {
  return (
    isRecord(value) &&
    typeof value.rank === 'number' &&
    typeof value.moveText === 'string' &&
    Array.isArray(value.movements) &&
    typeof value.finalKey === 'string' &&
    typeof value.equity === 'number' &&
    typeof value.equityLoss === 'number'
  );
}

function isCubeChoice(value: unknown): boolean {
  return (
    isRecord(value) &&
    typeof value.action === 'string' &&
    typeof value.equity === 'number' &&
    typeof value.equityLoss === 'number'
  );
}

/**
 * Structural validation for mined puzzles arriving from outside (backup
 * import): anything corrupt is treated as absent, never thrown.
 */
export function isBlunderPuzzle(value: unknown): value is Puzzle {
  if (!isRecord(value)) {
    return false;
  }
  const base =
    typeof value.id === 'string' &&
    value.source === 'blunder' &&
    PUZZLE_THEMES.includes(value.theme as PuzzleTheme) &&
    isRecord(value.origin) &&
    typeof value.origin.matchId === 'string' &&
    typeof value.origin.game === 'number' &&
    typeof value.origin.decision === 'number' &&
    isBoard(value.board) &&
    (value.hero === 'white' || value.hero === 'black') &&
    isRecord(value.match) &&
    typeof value.match.matchLength === 'number' &&
    isRecord(value.match.score) &&
    isRecord(value.match.cube);
  if (!base) {
    return false;
  }
  if (value.kind === 'play') {
    return (
      Array.isArray(value.roll) &&
      Array.isArray(value.answers) &&
      value.answers.length > 0 &&
      value.answers.every(isPlayAnswer)
    );
  }
  if (value.kind === 'cube') {
    return (
      (value.decision === 'offer' || value.decision === 'response') &&
      typeof value.verdict === 'string' &&
      Array.isArray(value.choices) &&
      value.choices.length > 0 &&
      value.choices.every(isCubeChoice)
    );
  }
  return false;
}

const byId = (a: Puzzle, b: Puzzle): number => a.id.localeCompare(b.id);

export function createMemoryBlunderPuzzleStorage(): BlunderPuzzleStorage {
  const puzzles = new Map<string, Puzzle>();
  let mined: MinedMatchStamps = {};
  return {
    async list() {
      return [...puzzles.values()].map((p) => structuredClone(p)).sort(byId);
    },
    async putAll(incoming) {
      for (const puzzle of incoming) {
        puzzles.set(puzzle.id, structuredClone(puzzle));
      }
    },
    async loadMined() {
      return { ...mined };
    },
    async markMined(matchId, analyzedAt) {
      mined[matchId] = analyzedAt;
    },
    async clear() {
      puzzles.clear();
      mined = {};
    },
  };
}

/** The single row the mined-match stamps live under (never a puzzle id). */
const MINED_ROW_ID = 'mined-matches';

type MinedRow = {
  readonly id: typeof MINED_ROW_ID;
  readonly matches: MinedMatchStamps;
};

export function createIndexedDbBlunderPuzzleStorage(
  options: IndexedDbStorageOptions = {},
): BlunderPuzzleStorage {
  const db = createDatabaseHandle(options);

  async function store(mode: IDBTransactionMode): Promise<IDBObjectStore> {
    return (await db())
      .transaction(BLUNDER_PUZZLES_STORE, mode)
      .objectStore(BLUNDER_PUZZLES_STORE);
  }

  return {
    async list() {
      const rows = await asPromise<Array<Puzzle | MinedRow>>(
        (await store('readonly')).getAll(),
      );
      return rows
        .filter((row): row is Puzzle => row.id !== MINED_ROW_ID)
        .sort(byId);
    },
    async putAll(puzzles) {
      if (puzzles.length === 0) {
        return;
      }
      const target = await store('readwrite');
      await Promise.all(puzzles.map((puzzle) => asPromise(target.put(puzzle))));
    },
    async loadMined() {
      const row = await asPromise<MinedRow | undefined>(
        (await store('readonly')).get(MINED_ROW_ID),
      );
      return row ? { ...row.matches } : {};
    },
    async markMined(matchId, analyzedAt) {
      const target = await store('readwrite');
      const row = await asPromise<MinedRow | undefined>(
        target.get(MINED_ROW_ID),
      );
      const matches = { ...(row?.matches ?? {}), [matchId]: analyzedAt };
      await asPromise(target.put({ id: MINED_ROW_ID, matches }));
    },
    async clear() {
      await asPromise((await store('readwrite')).clear());
    },
  };
}

let shared: BlunderPuzzleStorage | null = null;

/**
 * The app-wide shared blunder-puzzle storage. IndexedDB in the browser; an
 * in-memory stand-in where IndexedDB does not exist (jsdom tests rendering
 * pages without injecting storage), so persistence is simply ephemeral there.
 */
export function getBlunderPuzzleStorage(): BlunderPuzzleStorage {
  if (!shared) {
    shared =
      typeof indexedDB === 'undefined'
        ? createMemoryBlunderPuzzleStorage()
        : createIndexedDbBlunderPuzzleStorage();
  }
  return shared;
}
