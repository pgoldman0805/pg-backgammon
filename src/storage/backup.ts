/**
 * Full-history JSON backup (spec: guard against browser storage eviction).
 * Export captures every stored match; import replaces the current history
 * with the file's. Corrupt rows inside an otherwise valid file are skipped,
 * never fatal.
 */

import { isStoredMatch } from './snapshot';
import type { MatchStorage, StoredMatch } from './types';

export interface HistoryBackup {
  readonly app: 'pg-backgammon';
  readonly format: 1;
  /** Epoch milliseconds. */
  readonly exportedAt: number;
  readonly matches: readonly StoredMatch[];
}

export async function exportBackup(
  storage: MatchStorage,
  now: () => number = Date.now,
): Promise<HistoryBackup> {
  return {
    app: 'pg-backgammon',
    format: 1,
    exportedAt: now(),
    matches: await storage.list(),
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
  if (format !== 1) {
    throw new Error(
      `This backup uses format ${String(format)}, which this app cannot read.`,
    );
  }
  return parsed as HistoryBackup;
}

/** Replace the stored history with the backup's matches (skipping corrupt rows). */
export async function importBackup(
  storage: MatchStorage,
  backup: HistoryBackup,
): Promise<void> {
  await storage.clear();
  for (const match of backup.matches) {
    if (isStoredMatch(match)) {
      await storage.put(match);
    }
  }
}
