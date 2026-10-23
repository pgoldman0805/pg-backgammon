/**
 * Full-history JSON backup (spec: guard against browser storage eviction).
 * Export captures every stored match, the puzzle progress (since format 2,
 * ticket 11) and the mined blunder puzzles (since format 3, ticket 12).
 * Import replaces the current history with the file's; corrupt rows inside a
 * valid file are skipped, never fatal, and an older-format file leaves the
 * sections it predates alone.
 */

import type { PuzzleProgressState } from '../puzzles/queue';
import type { Puzzle } from '../puzzles/types';
import {
  type BlunderPuzzleStorage,
  getBlunderPuzzleStorage,
  isBlunderPuzzle,
} from './blunderPuzzles';
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
   * 3: + blunderPuzzles (ticket 12).
   */
  readonly format: 1 | 2 | 3;
  /** Epoch milliseconds. */
  readonly exportedAt: number;
  readonly matches: readonly StoredMatch[];
  /** Absent when no puzzle has ever been answered (and in format 1). */
  readonly puzzleProgress?: PuzzleProgressState;
  /** Absent when no blunder puzzle was ever mined (and before format 3). */
  readonly blunderPuzzles?: readonly Puzzle[];
}

export async function exportBackup(
  storage: MatchStorage,
  now: () => number = Date.now,
  puzzleStorage: PuzzleProgressStorage = getPuzzleProgressStorage(),
  blunderStorage: BlunderPuzzleStorage = getBlunderPuzzleStorage(),
): Promise<HistoryBackup> {
  const puzzleProgress = await puzzleStorage.load();
  const blunderPuzzles = await blunderStorage.list();
  return {
    app: 'pg-backgammon',
    format: 3,
    exportedAt: now(),
    matches: await storage.list(),
    ...(puzzleProgress ? { puzzleProgress } : {}),
    ...(blunderPuzzles.length > 0 ? { blunderPuzzles } : {}),
  };
}

export function serializeBackup(backup: HistoryBackup): string {
  return JSON.stringify(backup, null, 2);
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
  if (format !== 1 && format !== 2 && format !== 3) {
    throw new Error(
      `This backup uses format ${String(format)}, which this app cannot read.`,
    );
  }
  return parsed as HistoryBackup;
}

/**
 * Replace the stored history with the backup's matches (skipping corrupt
 * rows) and, when the file carries valid puzzle progress or mined blunder
 * puzzles, replace those too. A file predating a section leaves the current
 * data of that section alone.
 */
export async function importBackup(
  storage: MatchStorage,
  backup: HistoryBackup,
  puzzleStorage: PuzzleProgressStorage = getPuzzleProgressStorage(),
  blunderStorage: BlunderPuzzleStorage = getBlunderPuzzleStorage(),
): Promise<void> {
  await storage.clear();
  for (const match of backup.matches) {
    if (isStoredMatch(match)) {
      await storage.put(match);
    }
  }
  if (isPuzzleProgressState(backup.puzzleProgress)) {
    await puzzleStorage.save(backup.puzzleProgress);
  }
  if (Array.isArray(backup.blunderPuzzles)) {
    await blunderStorage.clear();
    await blunderStorage.putAll(backup.blunderPuzzles.filter(isBlunderPuzzle));
  }
}
