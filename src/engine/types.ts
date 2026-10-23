/**
 * The typed async interface to the gnubg-WASM engine (ADR-0001).
 *
 * One engine serves two roles: opponent (weakened per Difficulty) and
 * analysis ground truth (always full strength). All equities are EMG
 * (money-equivalent) from the on-roll player's perspective.
 */

import type { BoardState, DiceRoll, Play, Player } from '../rules';

/** Named opponent strength (GLOSSARY "Difficulty"). */
export type Difficulty =
  | 'beginner'
  | 'casual'
  | 'intermediate'
  | 'expert'
  | 'world-class';

/** Observable lifecycle of the lazily-loaded engine payload. */
export type EngineStatus = 'idle' | 'loading' | 'ready' | 'error';

export interface CubeState {
  /** 1, 2, 4, ... */
  readonly value: number;
  readonly owner: Player | 'center';
}

export interface MatchContext {
  /** Match length in points; 0 = money game. */
  readonly matchLength: number;
  readonly score: { readonly white: number; readonly black: number };
  readonly crawford?: boolean;
  /** Defaults to a centered 1-cube. */
  readonly cube?: CubeState;
}

/** A position presented to the engine, with the player to act. */
export interface EnginePosition {
  readonly board: BoardState;
  readonly onRoll: Player;
  /** Defaults to a money game at 0-0 with a centered 1-cube. */
  readonly match?: MatchContext;
}

/** The six gnubg outcome probabilities (sum of win+lose = 1). */
export interface WinChances {
  readonly win: number;
  readonly winGammon: number;
  readonly winBackgammon: number;
  readonly lose: number;
  readonly loseGammon: number;
  readonly loseBackgammon: number;
}

/** One legal play ranked by the engine. */
export interface RankedPlay {
  /** 1-based rank in the returned ordering. */
  readonly rank: number;
  /** The play in rules-engine terms (joined by final position). */
  readonly play: Play;
  /** gnubg move notation, e.g. "8/5 6/5" or "bar/23 24/20". */
  readonly moveText: string;
  /**
   * EMG equity of the play. At a weakened Difficulty this is the engine's
   * noisy evaluation (what the opponent "believes"), not ground truth.
   */
  readonly equity: number;
  /** Equity given up versus the top-ranked play (>= 0). */
  readonly equityLoss: number;
  readonly chances: WinChances;
}

/** Static evaluation of a position (on-roll perspective). */
export interface PositionEvaluation {
  readonly chances: WinChances;
  /** Cubeless EMG equity. */
  readonly equity: number;
  /** Cubeful EMG equity. */
  readonly cubefulEquity: number;
  /** Lookahead depth the evaluation was computed at. */
  readonly plies: number;
}

/** One cube action with its cubeful equity. */
export interface CubeDecisionOption {
  /** gnubg label, e.g. "No double", "Double, take", "Redouble, pass". */
  readonly action: string;
  readonly equity: number;
  /** Signed difference versus the first-listed action (gnubg convention). */
  readonly equityDiff: number;
}

/** Full cube-decision analysis for the on-roll player. */
export interface CubeAnalysis {
  readonly cubelessEquity: number;
  readonly chances: WinChances;
  readonly options: readonly CubeDecisionOption[];
  /** gnubg's recommendation, e.g. "No double, take". */
  readonly properAction: string;
}

/**
 * Full-strength analysis effort: 'standard' is the clean 2-ply ground truth,
 * 'deep' re-queries at 3-ply with a wider move filter (the analyzer's
 * bounded on-demand deepening — no rollouts, per the spec).
 */
export type AnalysisEffort = 'standard' | 'deep';

export interface RankPlaysOptions {
  /**
   * Weaken the ranking to this difficulty: reduced lookahead plus
   * position-seeded deterministic noise. Omit for full strength (2-ply).
   */
  readonly difficulty?: Difficulty;
  /** Full-strength effort; ignored when a difficulty weakens the ranking. */
  readonly effort?: AnalysisEffort;
}

export interface CubeInfoOptions {
  readonly effort?: AnalysisEffort;
}

/**
 * The engine behind its async seam. The real implementation runs gnubg-WASM
 * in a Web Worker; a fake honoring this interface backs downstream tests.
 */
export interface Engine {
  readonly status: EngineStatus;
  /** Subscribe to status changes; returns an unsubscribe function. */
  onStatusChange(listener: (status: EngineStatus) => void): () => void;
  /** Idempotent lazy initialization; resolves when the engine is ready. */
  initialize(): Promise<void>;
  /** Evaluate the position for the on-roll player. */
  evaluate(position: EnginePosition): Promise<PositionEvaluation>;
  /** Rank every legal play for the roll, best first. */
  rankPlays(
    position: EnginePosition,
    roll: DiceRoll,
    options?: RankPlaysOptions,
  ): Promise<readonly RankedPlay[]>;
  /** Analyze the on-roll player's doubling decision. */
  cubeInfo(
    position: EnginePosition,
    options?: CubeInfoOptions,
  ): Promise<CubeAnalysis>;
  /** Release the worker and any pending requests. */
  dispose(): void;
}
