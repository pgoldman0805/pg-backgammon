/**
 * The Puzzle model (GLOSSARY "Puzzle", "Curated puzzle", "Blunder puzzle",
 * "Theme"): a stored position posing one question — best play for a given
 * roll, or the correct cube decision — with the engine's graded answer data
 * computed at generation time. Grading never needs a live engine: everything
 * the player's attempt is compared against ships inside the puzzle.
 */

import type { BoardState, CheckerMovement, DiceRoll, Player } from '../rules';

/**
 * The curated themes (GLOSSARY "Theme"), in drill order. "Basics" comes
 * first (ticket 33): the fundamentals — legal moves, hitting, bearing off —
 * a newcomer should drill before the advanced tactical themes.
 */
export const PUZZLE_THEMES = [
  'basics',
  'priming',
  'blitzing',
  'holding-game',
  'bear-off',
  'cube-handling',
] as const;

export type PuzzleTheme = (typeof PUZZLE_THEMES)[number];

/**
 * The themes the self-play miner can tag from position heuristics. "Basics"
 * is hand-authored (scripts/mineBasics.ts), never mined, so it is excluded
 * here — the miner's per-theme targets only apply to what it can produce.
 */
export const MINEABLE_THEMES = PUZZLE_THEMES.filter(
  (theme): theme is Exclude<PuzzleTheme, 'basics'> => theme !== 'basics',
);

/**
 * Curated ships with the app; blunder puzzles are mined from the player's
 * analyzed games (ticket 12); generated puzzles come from in-app self-play
 * mining (ticket 18).
 */
export type PuzzleSource = 'curated' | 'blunder' | 'generated';

/** Where a blunder puzzle came from in the player's own games (ticket 12). */
export interface PuzzleOrigin {
  readonly matchId: string;
  /** Index of the game within the match record. */
  readonly game: number;
  /** Index of the decision within the game. */
  readonly decision: number;
}

/** The match situation the position sits in; matchLength 0 is money play. */
export interface PuzzleMatchContext {
  readonly matchLength: number;
  readonly score: { readonly white: number; readonly black: number };
  readonly cube: { readonly value: number; readonly owner: Player | 'center' };
  readonly crawford?: boolean;
}

interface PuzzleBase {
  readonly id: string;
  readonly theme: PuzzleTheme;
  readonly source: PuzzleSource;
  /** Present only on blunder puzzles. */
  readonly origin?: PuzzleOrigin;
  readonly board: BoardState;
  /** The player whose decision the puzzle poses (curated: always white). */
  readonly hero: Player;
  readonly match: PuzzleMatchContext;
}

/**
 * One candidate play with its full-strength engine grade. `finalKey` is the
 * position key of the board after the movements — the join the player's
 * attempt is matched on.
 */
export interface PlayAnswer {
  /** 1-based rank, best first. */
  readonly rank: number;
  /** gnubg move notation, e.g. "8/5 6/5". */
  readonly moveText: string;
  readonly movements: readonly CheckerMovement[];
  readonly finalKey: string;
  /** Cubeless EMG equity from the hero's perspective. */
  readonly equity: number;
  /** Equity given up versus the best play (>= 0). */
  readonly equityLoss: number;
}

/** "Find the best play for this roll." Answers cover every legal play. */
export interface PlayPuzzle extends PuzzleBase {
  readonly kind: 'play';
  readonly roll: DiceRoll;
  readonly answers: readonly PlayAnswer[];
}

export type CubeAction = 'double' | 'no-double' | 'take' | 'pass';

/** One cube action with its cubeful equity from the hero's perspective. */
export interface CubeChoice {
  readonly action: CubeAction;
  readonly equity: number;
  /** Equity given up versus the best choice (>= 0). */
  readonly equityLoss: number;
}

/**
 * A cube-decision puzzle. 'offer' asks double-or-roll (the hero may double);
 * 'response' asks take-or-pass (the hero has been doubled).
 */
export interface CubePuzzle extends PuzzleBase {
  readonly kind: 'cube';
  readonly decision: 'offer' | 'response';
  readonly choices: readonly CubeChoice[];
  /** The engine's verdict for the position, e.g. "Double, take". */
  readonly verdict: string;
}

export type Puzzle = PlayPuzzle | CubePuzzle;
