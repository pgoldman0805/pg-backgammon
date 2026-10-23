/**
 * Turn a parsed .mat import into a finished StoredMatch row: config marked
 * as imported (no difficulty — no engine played it), score and winner
 * recomputed from the record, no analysis — the Analyze area's open flow
 * (ticket 08) analyzes it exactly like a native match.
 */

import { replayMatch } from '../rules';
import type { StoredMatch } from '../storage';
import type { MatImport } from './mat';

export function importedStoredMatch(
  imported: MatImport,
  id: string,
  now: number,
): StoredMatch {
  const replay = replayMatch(imported.record);
  return {
    id,
    config: {
      length: imported.record.length,
      mode: 'imported',
      source: 'mat',
      players: imported.players,
    },
    status: 'finished',
    createdAt: now,
    updatedAt: now,
    record: imported.record,
    score: replay.score,
    winner: replay.winner,
    state: null,
  };
}
