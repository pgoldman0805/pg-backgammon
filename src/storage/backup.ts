/**
 * Full-history JSON backup (spec: guard against browser storage eviction).
 * Export captures every stored match and, since format 2 (ticket 11), the
 * puzzle progress. Import replaces the current history with the file's;
 * corrupt rows inside a valid file are skipped, never fatal, and a format-1
 * file (which predates puzzle progress) leaves the current progress alone.
 */

import type { PuzzleProgressState } from '../puzzles/queue';
import {
  getPuzzleProgressStorage,
  isPuzzleProgressState,
  type PuzzleProgressStorage,
} from './puzzleProgress';
import { isStoredMatch } from './snapshot';
import type { MatchStorage, StoredMatch } from './types';

export interface HistoryBackup {
  readonly app: 'pg-backgammon';
  /** 1: matches only (ticket 07). 2: + puzzleProgress (ticket 11). */
  readonly format: 1 | 2;
  /** Epoch milliseconds. */
  readonly exportedAt: number;
  readonly matches: readonly StoredMatch[];
  /** Absent when no puzzle has ever been answered (and in format 1). */
  readonly puzzleProgress?: PuzzleProgressState;
}

export async function exportBackup(
  storage: MatchStorage,
  now: () => number = Date.now,
  puzzleStorage: PuzzleProgressStorage = getPuzzleProgressStorage(),
): Promise<HistoryBackup> {
  const puzzleProgress = await puzzleStorage.load();
  return {
    app: 'pg-backgammon',
    format: 2,
    exportedAt: now(),
    matches: await storage.list(),
    ...(puzzleProgress ? { puzzleProgress } : {}),
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
  if (format !== 1 && format !== 2) {
    throw new Error(
      `This backup uses format ${String(format)}, which this app cannot read.`,
    );
  }
  return parsed as HistoryBackup;
}

/**
 * Replace the stored history with the backup's matches (skipping corrupt
 * rows) and, when the file carries valid puzzle progress, replace that too.
 */
export async function importBackup(
  storage: MatchStorage,
  backup: HistoryBackup,
  puzzleStorage: PuzzleProgressStorage = getPuzzleProgressStorage(),
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
}
