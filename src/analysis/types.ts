/**
 * The persisted shape of a post-game review (GLOSSARY "Post-game review").
 *
 * Everything here is plain serializable data, deterministic for a given
 * record and engine effort, and written onto StoredMatch.analysis exactly as
 * produced (the storage layer carries it untouched). `format` version-marks
 * the shape so later tickets (10/12/13: export, blunder mining, progress) can
 * evolve it without misreading old rows.
 */

import type { ErrorClassification } from '../engine/analysis';
import type { CheckerMovement, DiceRoll, Player } from '../rules';
import type { CubeError } from './cube';

export const ANALYSIS_FORMAT = 1;

/** Engine lookahead a decision was analyzed at (2 standard, 3 deepened). */
export type AnalyzedPlies = 2 | 3;

/** One engine-ranked candidate play, kept for the alternatives panel. */
export interface PlayAlternative {
  readonly moveText: string;
  readonly equity: number;
  readonly equityLoss: number;
  /** True for the play that was actually committed. */
  readonly played: boolean;
  /** Movements to render the candidate's resulting position. */
  readonly movements: readonly CheckerMovement[];
}

/** An analyzed unforced checker play (GLOSSARY "Play", "Error"). */
export interface AnalyzedPlay {
  readonly kind: 'play';
  readonly player: Player;
  /** Index into the game record's plays. */
  readonly playIndex: number;
  readonly roll: DiceRoll;
  /** The committed play in engine notation. */
  readonly moveText: string;
  /** 1-based rank of the committed play among all legal plays. */
  readonly rank: number;
  readonly totalPlays: number;
  /** Top-ranked candidates (the committed play always included). */
  readonly alternatives: readonly PlayAlternative[];
  readonly equityLoss: number;
  readonly classification: ErrorClassification;
  readonly plies: AnalyzedPlies;
}

/** An analyzed cube decision (GLOSSARY "Cube decision"). */
export interface AnalyzedCube {
  readonly kind: 'cube';
  readonly player: Player;
  /** The decision sits before the play at this index. */
  readonly playIndex: number;
  readonly action: 'double' | 'no-double' | 'take' | 'pass';
  /** The cube's value when the choice was made. */
  readonly cubeValue: number;
  /** The engine's recommendation, e.g. "No double, take". */
  readonly properAction: string;
  /** Cubeful equities from the doubler's perspective. */
  readonly noDoubleEquity: number;
  readonly doubleTakeEquity: number;
  readonly doublePassEquity: number;
  readonly error: CubeError | null;
  readonly equityLoss: number;
  readonly classification: ErrorClassification;
  readonly plies: AnalyzedPlies;
}

export type AnalyzedDecision = AnalyzedPlay | AnalyzedCube;

/** Per-player quality over a game or match (GLOSSARY "Error rate"). */
export interface PlayerSummary {
  /** Unforced decisions analyzed (plays and cube decisions). */
  readonly decisions: number;
  readonly equityLost: number;
  /** equityLost / decisions; 0 when there were no decisions. */
  readonly errorRate: number;
  readonly blunders: number;
  readonly errors: number;
  readonly dubious: number;
}

export interface GameAnalysis {
  /** Every analyzed decision, in game order. */
  readonly decisions: readonly AnalyzedDecision[];
  readonly white: PlayerSummary;
  readonly black: PlayerSummary;
}

export interface MatchAnalysis {
  readonly format: typeof ANALYSIS_FORMAT;
  /** Epoch milliseconds of the (last) analysis write. */
  readonly analyzedAt: number;
  /** One analysis per recorded game, in match order. */
  readonly games: readonly GameAnalysis[];
  readonly white: PlayerSummary;
  readonly black: PlayerSummary;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isSummary(value: unknown): boolean {
  return (
    isRecord(value) &&
    typeof value.decisions === 'number' &&
    typeof value.equityLost === 'number' &&
    typeof value.errorRate === 'number'
  );
}

/**
 * Does a StoredMatch.analysis value look like a review this code can read?
 * Anything else (older formats, corruption) is treated as absent: the match
 * simply analyzes again.
 */
export function isMatchAnalysis(value: unknown): value is MatchAnalysis {
  return (
    isRecord(value) &&
    value.format === ANALYSIS_FORMAT &&
    Array.isArray(value.games) &&
    value.games.every(
      (game) =>
        isRecord(game) &&
        Array.isArray(game.decisions) &&
        isSummary(game.white) &&
        isSummary(game.black),
    ) &&
    isSummary(value.white) &&
    isSummary(value.black)
  );
}
