/**
 * Full-history JSON backup (spec: guard against browser storage eviction).
 * Export captures every stored match, the puzzle progress (since format 2,
 * ticket 11), the mined blunder puzzles (since format 3, ticket 12) and the
 * self-play generated puzzles (since format 4, ticket 18). Import replaces
 * the current history with the file's; corrupt rows inside a valid file are
 * skipped, never fatal, and an older-format file leaves the sections it
 * predates alone.
 */

import type { PuzzleProgressState } from '../puzzles/queue';
import type { Puzzle } from '../puzzles/types';
import {
  type BlunderPuzzleStorage,
  getBlunderPuzzleStorage,
  isBlunderPuzzle,
} from './blunderPuzzles';
import {
  type GeneratedPuzzleStorage,
  getGeneratedPuzzleStorage,
  isGeneratedPuzzle,
} from './generatedPuzzles';
import {
  getPuzzleProgressStorage,
  isPuzzleProgressState,
  type PuzzleProgressStorage,
} from './puzzleProgress';
import { isStoredMatch } from './snapshot';
import type { MatchStorage, StoredMatch } from './types';

export interface HistoryBackup {
  readonly app: 'pg-backgammon';
  /**
   * 1: matches only (ticket 07). 2: + puzzleProgress (ticket 11).
   * 3: + blunderPuzzles (ticket 12). 4: + generatedPuzzles (ticket 18).
   */
  readonly format: 1 | 2 | 3 | 4;
  /** Epoch milliseconds. */
  readonly exportedAt: number;
  readonly matches: readonly StoredMatch[];
  /** Absent when no puzzle has ever been answered (and in format 1). */
  readonly puzzleProgress?: PuzzleProgressState;
  /** Absent when no blunder puzzle was ever mined (and before format 3). */
  readonly blunderPuzzles?: readonly Puzzle[];
  /** Absent when no puzzle was ever generated (and before format 4). */
  readonly generatedPuzzles?: readonly Puzzle[];
}

export async function exportBackup(
  storage: MatchStorage,
  now: () => number = Date.now,
  puzzleStorage: PuzzleProgressStorage = getPuzzleProgressStorage(),
  blunderStorage: BlunderPuzzleStorage = getBlunderPuzzleStorage(),
  generatedStorage: GeneratedPuzzleStorage = getGeneratedPuzzleStorage(),
): Promise<HistoryBackup> {
  const puzzleProgress = await puzzleStorage.load();
  const blunderPuzzles = await blunderStorage.list();
  const generatedPuzzles = await generatedStorage.list();
  return {
    app: 'pg-backgammon',
    format: 4,
    exportedAt: now(),
    matches: await storage.list(),
    ...(puzzleProgress ? { puzzleProgress } : {}),
    ...(blunderPuzzles.length > 0 ? { blunderPuzzles } : {}),
    ...(generatedPuzzles.length > 0 ? { generatedPuzzles } : {}),
  };
}

export function serializeBackup(backup: HistoryBackup): string {
  return JSON.stringify(backup, null, 2);
}

/** How many of each kind a backup carries — the confirmation's headline. */
export interface BackupSummary {
  readonly format: HistoryBackup['format'];
  /** Epoch milliseconds the file was exported. */
  readonly exportedAt: number;
  readonly matches: number;
  readonly blunderPuzzles: number;
  readonly generatedPuzzles: number;
  /** Blunder + generated: the "puzzles" the confirmation names. */
  readonly puzzles: number;
  readonly hasPuzzleProgress: boolean;
}

/**
 * Count what a parsed backup holds, so a restore can be confirmed by naming
 * its contents before anything is touched. Counts the file as written; corrupt
 * rows are weeded out later, at import.
 */
export function summarizeBackup(backup: HistoryBackup): BackupSummary {
  const blunderPuzzles = backup.blunderPuzzles?.length ?? 0;
  const generatedPuzzles = backup.generatedPuzzles?.length ?? 0;
  return {
    format: backup.format,
    exportedAt: backup.exportedAt,
    matches: backup.matches.length,
    blunderPuzzles,
    generatedPuzzles,
    puzzles: blunderPuzzles + generatedPuzzles,
    hasPuzzleProgress: backup.puzzleProgress !== undefined,
  };
}

/** Parse backup JSON; throws a descriptive error for anything else. */
export function parseBackup(json: string): HistoryBackup {
  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch {
    throw new Error('This file is not a pg-backgammon backup (not JSON).');
  }
  if (
    typeof parsed !== 'object' ||
    parsed === null ||
    (parsed as Record<string, unknown>).app !== 'pg-backgammon' ||
    !Array.isArray((parsed as Record<string, unknown>).matches)
  ) {
    throw new Error('This file is not a pg-backgammon backup.');
  }
  const format = (parsed as Record<string, unknown>).format;
  if (format !== 1 && format !== 2 && format !== 3 && format !== 4) {
    throw new Error(
      `This backup uses format ${String(format)}, which this app cannot read.`,
    );
  }
  return parsed as HistoryBackup;
}

/** Replace discards whatever is there; merge keeps it and adds the file's. */
export type ImportMode = 'replace' | 'merge';

export interface ImportBackupOptions {
  /** 'replace' (default) swaps history for the file's; 'merge' adds to it. */
  readonly mode?: ImportMode;
}

/** The current contents of every backed-up store, taken before any write. */
interface StoreSnapshot {
  readonly matches: readonly StoredMatch[];
  readonly progress: PuzzleProgressState | null;
  readonly blunders: readonly Puzzle[];
  readonly mined: Record<string, number>;
  readonly generated: readonly Puzzle[];
}

/**
 * Merge two progress documents without losing either side: the union of the
 * solved and retry ids, existing per-theme counters kept (a theme the player
 * has touched here wins over the file's), and the newer stamp.
 */
function mergeProgress(
  existing: PuzzleProgressState | null,
  incoming: PuzzleProgressState,
): PuzzleProgressState {
  if (!existing) {
    return incoming;
  }
  return {
    updatedAt: Math.max(existing.updatedAt, incoming.updatedAt),
    solvedIds: [...new Set([...existing.solvedIds, ...incoming.solvedIds])],
    retryQueue: [...new Set([...existing.retryQueue, ...incoming.retryQueue])],
    themes: { ...incoming.themes, ...existing.themes },
  };
}

/** Put every store back exactly as the snapshot found it. */
async function restoreSnapshot(
  snapshot: StoreSnapshot,
  storage: MatchStorage,
  puzzleStorage: PuzzleProgressStorage,
  blunderStorage: BlunderPuzzleStorage,
  generatedStorage: GeneratedPuzzleStorage,
): Promise<void> {
  await storage.clear();
  for (const match of snapshot.matches) {
    await storage.put(match);
  }
  await puzzleStorage.clear();
  if (snapshot.progress) {
    await puzzleStorage.save(snapshot.progress);
  }
  await blunderStorage.clear();
  await blunderStorage.putAll(snapshot.blunders);
  for (const [matchId, analyzedAt] of Object.entries(snapshot.mined)) {
    await blunderStorage.markMined(matchId, analyzedAt);
  }
  await generatedStorage.clear();
  await generatedStorage.putAll(snapshot.generated);
}

/**
 * Bring the backup's data into the stores, all-or-nothing. Corrupt rows inside
 * a valid file are skipped (never fatal) and a file predating a section leaves
 * that section's current data alone. In 'replace' mode (the default) the file's
 * data stands in for the current history; in 'merge' mode it is added beside
 * the existing data, bringing only ids not already present and discarding
 * nothing. Should any write fail partway, every store is rolled back to the
 * state it held before the import, so a wrong file or an interrupted restore
 * can never leave a half-wiped history.
 */
export async function importBackup(
  storage: MatchStorage,
  backup: HistoryBackup,
  puzzleStorage: PuzzleProgressStorage = getPuzzleProgressStorage(),
  blunderStorage: BlunderPuzzleStorage = getBlunderPuzzleStorage(),
  generatedStorage: GeneratedPuzzleStorage = getGeneratedPuzzleStorage(),
  { mode = 'replace' }: ImportBackupOptions = {},
): Promise<void> {
  // Validate and shape the whole file in memory first, so a corrupt row can
  // never leave the stores touched but unfinished.
  const matches = backup.matches.filter(isStoredMatch);
  const progress = isPuzzleProgressState(backup.puzzleProgress)
    ? backup.puzzleProgress
    : null;
  const blunders = Array.isArray(backup.blunderPuzzles)
    ? backup.blunderPuzzles.filter(isBlunderPuzzle)
    : null;
  const generated = Array.isArray(backup.generatedPuzzles)
    ? backup.generatedPuzzles.filter(isGeneratedPuzzle)
    : null;

  const snapshot: StoreSnapshot = {
    matches: await storage.list(),
    progress: await puzzleStorage.load(),
    blunders: await blunderStorage.list(),
    mined: await blunderStorage.loadMined(),
    generated: await generatedStorage.list(),
  };

  try {
    if (mode === 'replace') {
      await storage.clear();
      for (const match of matches) {
        await storage.put(match);
      }
      if (progress) {
        await puzzleStorage.save(progress);
      }
      if (blunders) {
        await blunderStorage.clear();
        await blunderStorage.putAll(blunders);
      }
      if (generated) {
        await generatedStorage.clear();
        await generatedStorage.putAll(generated);
      }
    } else {
      const haveMatch = new Set(snapshot.matches.map((m) => m.id));
      for (const match of matches) {
        if (!haveMatch.has(match.id)) {
          await storage.put(match);
        }
      }
      if (progress) {
        await puzzleStorage.save(mergeProgress(snapshot.progress, progress));
      }
      if (blunders) {
        const have = new Set(snapshot.blunders.map((p) => p.id));
        await blunderStorage.putAll(blunders.filter((p) => !have.has(p.id)));
      }
      if (generated) {
        const have = new Set(snapshot.generated.map((p) => p.id));
        await generatedStorage.putAll(generated.filter((p) => !have.has(p.id)));
      }
    }
  } catch (error) {
    await restoreSnapshot(
      snapshot,
      storage,
      puzzleStorage,
      blunderStorage,
      generatedStorage,
    );
    throw error;
  }
}
