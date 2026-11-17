/**
 * The Progress selector (spec story 27): derive the user's per-match quality
 * series from stored matches. Pure data in, pure data out — no storage, no
 * engine, no React.
 *
 * Which matches contribute (GLOSSARY "Tutor mode", "Error rate"):
 * - Finished and analyzed only. In-progress rows and rows without a readable
 *   `MatchAnalysis` are skipped (they will contribute once analyzed).
 * - Only matches with a single user side (`userSide(config)`): vs-computer
 *   (the user is White) and remote (the user is the seat this device held,
 *   `config.localSide`). Hot-seat matches have no single "user" side and are
 *   excluded. Imported matches (ticket 10) are included exactly when their
 *   config says `mode: 'computer'`; any other mode is excluded until a
 *   richer marker exists. The numbers are read from that side's summaries.
 * - Within a match, only games not flagged tutor-assisted count (an absent
 *   flag on pre-ticket-09 rows is falsy). The per-match numbers are
 *   recomputed from the per-game analyses of the counted games — never read
 *   from the stored match summary, which includes tutor-assisted games.
 * - A match with no counted unforced decisions (every game tutor-assisted,
 *   or nothing to decide) contributes no point: zero decisions carry no
 *   evidence of quality.
 */

import { isMatchAnalysis, type PlayerSummary } from '../analysis';
import { type StoredMatch, userSide } from '../storage';

/** One plotted match: the user's side's recomputed quality over its counted games. */
export interface ProgressPoint {
  readonly matchId: string;
  /** Epoch ms the match finished (its last persisted write). */
  readonly when: number;
  /** Match target, for labels ("7-point match vs Expert"). */
  readonly length: number;
  readonly difficulty: string;
  /** Unforced decisions across the counted games. */
  readonly decisions: number;
  readonly equityLost: number;
  /** equityLost / decisions (GLOSSARY "Error rate" — lower is better). */
  readonly errorRate: number;
  readonly blunders: number;
  readonly errors: number;
  readonly dubious: number;
  /** Games that counted (not tutor-assisted). */
  readonly gamesCounted: number;
  /** Tutor-assisted games skipped; > 0 marks the match as partial. */
  readonly gamesExcluded: number;
}

/** How many recent matches the headline error rate averages over. */
export const RECENT_WINDOW = 10;

export interface ProgressTotals {
  /** Matches contributing a point. */
  readonly matches: number;
  /** Blunders across all contributing matches. */
  readonly blunders: number;
  /** Mean of the last `recentCount` match error rates; null with no points. */
  readonly recentErrorRate: number | null;
  /** min(RECENT_WINDOW, matches). */
  readonly recentCount: number;
}

export interface ProgressData {
  /** Oldest first — ready to plot left to right. */
  readonly points: readonly ProgressPoint[];
  readonly totals: ProgressTotals;
}

function pointOf(stored: StoredMatch): ProgressPoint | null {
  const side = userSide(stored.config);
  if (stored.status !== 'finished' || !side) {
    return null;
  }
  const analysis = stored.analysis;
  if (!isMatchAnalysis(analysis)) {
    return null;
  }

  let decisions = 0;
  let equityLost = 0;
  let blunders = 0;
  let errors = 0;
  let dubious = 0;
  let gamesCounted = 0;
  let gamesExcluded = 0;

  stored.record.games.forEach((game, index) => {
    const analyzed = analysis.games[index];
    if (!analyzed) {
      return; // Analysis shorter than the record: count only aligned pairs.
    }
    if (game.tutorAssisted) {
      gamesExcluded += 1;
      return;
    }
    const mine: PlayerSummary = analyzed[side];
    decisions += mine.decisions;
    equityLost += mine.equityLost;
    blunders += mine.blunders;
    errors += mine.errors;
    dubious += mine.dubious;
    gamesCounted += 1;
  });

  if (decisions === 0) {
    return null;
  }

  return {
    matchId: stored.id,
    when: stored.updatedAt,
    length: stored.config.length,
    difficulty:
      stored.config.mode === 'remote'
        ? 'online'
        : String(stored.config.difficulty),
    decisions,
    equityLost,
    errorRate: equityLost / decisions,
    blunders,
    errors,
    dubious,
    gamesCounted,
    gamesExcluded,
  };
}

/** Derive the plotted series and its aggregates from stored matches. */
export function buildProgress(matches: readonly StoredMatch[]): ProgressData {
  const points = matches
    .map(pointOf)
    .filter((point): point is ProgressPoint => point !== null)
    .sort((a, b) => a.when - b.when);

  const recent = points.slice(-RECENT_WINDOW);
  const recentErrorRate =
    recent.length === 0
      ? null
      : recent.reduce((sum, point) => sum + point.errorRate, 0) / recent.length;

  return {
    points,
    totals: {
      matches: points.length,
      blunders: points.reduce((sum, point) => sum + point.blunders, 0),
      recentErrorRate,
      recentCount: recent.length,
    },
  };
}
