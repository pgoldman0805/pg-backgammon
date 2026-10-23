/**
 * Persistence types for match history (spec: IndexedDB, local-only).
 *
 * Everything stored is plain serializable data straight from the rules
 * engine's deterministic records (src/rules/match.ts). Storage never strips
 * fields it does not know: later tickets may add fields (a tutor flag on the
 * config, analysis results beside the record) and existing rows must carry
 * them through untouched.
 */

import type { Difficulty } from '../engine';
import type { MatchRecord, MatchScore, MatchState, Player } from '../rules';

export type MatchStatus = 'in-progress' | 'finished';

/**
 * The setup a match was created with. The index signature keeps the record
 * tolerant of fields added by later tickets (e.g. ticket 09's tutor flag).
 * Matches imported from .mat files (ticket 10) carry mode 'imported' and no
 * difficulty — no engine ever played them here.
 */
export interface MatchConfig {
  readonly length: number;
  readonly mode: 'computer' | 'hotseat' | 'imported';
  readonly difficulty?: Difficulty;
  readonly [extra: string]: unknown;
}

/** One match as persisted: config, deterministic record, status, timestamps. */
export interface StoredMatch {
  readonly id: string;
  readonly config: MatchConfig;
  readonly status: MatchStatus;
  /** Epoch milliseconds. */
  readonly createdAt: number;
  /** Epoch milliseconds; bumped on every save. */
  readonly updatedAt: number;
  /** Completed games so far — replayable via replayMatch (src/rules). */
  readonly record: MatchRecord;
  /** The current (in-progress) or final score, for listing without replay. */
  readonly score: MatchScore;
  /** The match winner once finished, else null. */
  readonly winner: Player | null;
  /** Exact state snapshot while in progress (resume); null once finished. */
  readonly state: MatchState | null;
  /** Analysis results, written by the analyzer (ticket 08); carried as-is. */
  readonly analysis?: unknown;
}

/**
 * The storage seam: IndexedDB in the app, an in-memory fake in tests.
 * Implementations clone on the way in and out (IndexedDB's structured-clone
 * semantics), so callers never share object identity with the store.
 */
export interface MatchStorage {
  /** All stored matches, most recently updated first. */
  list(): Promise<StoredMatch[]>;
  get(id: string): Promise<StoredMatch | null>;
  /** Insert or replace by id. */
  put(match: StoredMatch): Promise<void>;
  delete(id: string): Promise<void>;
  clear(): Promise<void>;
}
