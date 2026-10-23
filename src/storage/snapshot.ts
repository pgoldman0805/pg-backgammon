/**
 * Mapping between the live MatchState (src/rules/match.ts) and the persisted
 * StoredMatch, plus the structural validation that keeps corrupt rows from
 * ever crashing the app: anything that fails isStoredMatch is treated as
 * absent (fresh setup instead of resume, skipped in history).
 */

import type { MatchState } from '../rules';
import type { MatchConfig, MatchStatus, StoredMatch } from './types';

export interface SnapshotArgs {
  readonly id: string;
  readonly config: MatchConfig;
  readonly match: MatchState;
  readonly createdAt: number;
  readonly updatedAt: number;
}

/**
 * Capture a live match as a StoredMatch. In-progress matches keep the exact
 * state snapshot for resumption; finished matches keep only the deterministic
 * record (which alone reproduces the outcome via replayMatch).
 */
export function snapshotMatch(args: SnapshotArgs): StoredMatch {
  const { match } = args;
  const status: MatchStatus =
    match.phase === 'match-over' ? 'finished' : 'in-progress';
  return {
    id: args.id,
    config: args.config,
    status,
    createdAt: args.createdAt,
    updatedAt: args.updatedAt,
    record: { length: match.length, games: match.games },
    score: match.score,
    winner: match.winner,
    state: status === 'finished' ? null : match,
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isScore(value: unknown): boolean {
  return (
    isRecord(value) &&
    typeof value.white === 'number' &&
    typeof value.black === 'number'
  );
}

/** Does this look like a MatchState a Play store can safely load? */
function isResumableState(value: unknown): boolean {
  if (!isRecord(value)) {
    return false;
  }
  const game = value.game;
  if (!isRecord(game) || !isRecord(game.board) || !isRecord(game.record)) {
    return false;
  }
  const board = game.board as Record<string, unknown>;
  return (
    typeof value.phase === 'string' &&
    typeof value.length === 'number' &&
    isScore(value.score) &&
    isRecord(value.cube) &&
    Array.isArray(value.decisions) &&
    Array.isArray(value.games) &&
    Array.isArray(board.points) &&
    board.points.length === 25 &&
    isRecord(board.bar) &&
    isRecord(board.off) &&
    Array.isArray((game.record as Record<string, unknown>).plays)
  );
}

/**
 * Light structural validation of a stored row. Unknown extra fields pass
 * (later tickets add them); missing or mistyped known fields fail.
 */
export function isStoredMatch(value: unknown): value is StoredMatch {
  if (!isRecord(value)) {
    return false;
  }
  if (typeof value.id !== 'string' || value.id.length === 0) {
    return false;
  }
  if (value.status !== 'in-progress' && value.status !== 'finished') {
    return false;
  }
  if (
    typeof value.createdAt !== 'number' ||
    typeof value.updatedAt !== 'number'
  ) {
    return false;
  }
  const config = value.config;
  if (!isRecord(config) || typeof config.length !== 'number') {
    return false;
  }
  const record = value.record;
  if (
    !isRecord(record) ||
    typeof record.length !== 'number' ||
    !Array.isArray(record.games)
  ) {
    return false;
  }
  if (!isScore(value.score)) {
    return false;
  }
  if (value.status === 'in-progress' && !isResumableState(value.state)) {
    return false;
  }
  return true;
}
