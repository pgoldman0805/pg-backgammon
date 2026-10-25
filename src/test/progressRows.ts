/**
 * Hand-built StoredMatch fixtures for Progress tests: rows with known,
 * hand-computed analysis numbers and per-game tutor flags. Everything passes
 * isStoredMatch, so page tests can seed storage with them directly.
 */

import {
  ANALYSIS_FORMAT,
  type GameAnalysis,
  type MatchAnalysis,
  type PlayerSummary,
} from '../analysis';
import type { BoardState, MatchGameRecord } from '../rules';
import type { StoredMatch } from '../storage';

const emptyBoard: BoardState = {
  points: Array.from({ length: 25 }, () => 0),
  bar: { white: 0, black: 0 },
  off: { white: 0, black: 0 },
};

export function gameRecord(tutorAssisted: boolean): MatchGameRecord {
  return {
    game: {
      initialBoard: emptyBoard,
      openingRolls: [],
      firstPlayer: 'white',
      plays: [],
    },
    decisions: [],
    crawford: false,
    money: false,
    tutorAssisted,
    result: { winner: 'white', end: 'checkers', kind: 'single', points: 1 },
  };
}

/** A game stored before ticket 09: no tutorAssisted field at all. */
export function legacyGameRecord(): MatchGameRecord {
  const { tutorAssisted: _absent, ...rest } = gameRecord(false);
  return rest as MatchGameRecord;
}

/** White's summary with the error rate derived from the other numbers. */
export function summary(
  decisions: number,
  equityLost: number,
  blunders = 0,
  errors = 0,
  dubious = 0,
): PlayerSummary {
  return {
    decisions,
    equityLost,
    errorRate: decisions === 0 ? 0 : equityLost / decisions,
    blunders,
    errors,
    dubious,
  };
}

const quiet = summary(0, 0);

export function gameAnalysis(white: PlayerSummary): GameAnalysis {
  return { decisions: [], white, black: quiet };
}

/** A MatchAnalysis whose match summary sums its per-game summaries. */
export function matchAnalysis(games: readonly GameAnalysis[]): MatchAnalysis {
  const total = (pick: (s: PlayerSummary) => number) =>
    games.reduce((sum, game) => sum + pick(game.white), 0);
  return {
    format: ANALYSIS_FORMAT,
    analyzedAt: Date.now(),
    games,
    white: summary(
      total((s) => s.decisions),
      total((s) => s.equityLost),
      total((s) => s.blunders),
      total((s) => s.errors),
      total((s) => s.dubious),
    ),
    black: quiet,
  };
}

export interface ProgressRowArgs {
  readonly id: string;
  readonly games: readonly MatchGameRecord[];
  readonly analysis?: unknown;
  readonly mode?: string;
  readonly status?: 'finished' | 'in-progress';
  readonly updatedAt?: number;
  readonly createdAt?: number;
  readonly length?: number;
  readonly difficulty?: string;
}

/** A finished (by default) vs-computer StoredMatch with the given games. */
export function progressRow(args: ProgressRowArgs): StoredMatch {
  return {
    id: args.id,
    config: {
      length: args.length ?? 7,
      mode: (args.mode ?? 'computer') as 'computer',
      difficulty: (args.difficulty ?? 'expert') as 'expert',
    },
    status: args.status ?? 'finished',
    createdAt: args.createdAt ?? 1_000,
    updatedAt: args.updatedAt ?? 2_000,
    record: { length: args.length ?? 7, games: args.games },
    score: { white: 7, black: 0 },
    winner: 'white',
    state: null,
    analysis: args.analysis,
  };
}
