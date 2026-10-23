/**
 * Core types for the pure backgammon rules engine (ADR-0002).
 *
 * Conventions:
 * - Points are numbered 1-24. White moves 24 -> 1 (home board 1-6);
 *   black moves 1 -> 24 (home board 19-24).
 * - `points[p]` holds a signed checker count: positive = white, negative = black.
 *   Index 0 is unused and always 0.
 * - A "Play" (see GLOSSARY.md) is a player's complete checker action for one
 *   dice roll; a "movement" is one checker's hop within a Play.
 */

export type Player = 'white' | 'black';

export type Die = 1 | 2 | 3 | 4 | 5 | 6;

/** The two dice of a roll, as rolled (order not significant). */
export type DiceRoll = readonly [Die, Die];

/** A point on the board, 1-24. */
export type Point = number;

export interface BoardState {
  /** Length 25; index 0 unused. Positive counts are white, negative black. */
  readonly points: readonly number[];
  readonly bar: { readonly white: number; readonly black: number };
  readonly off: { readonly white: number; readonly black: number };
}

/** One checker's hop: from a point or the bar, to a point or off. */
export interface CheckerMovement {
  readonly from: Point | 'bar';
  readonly to: Point | 'off';
  readonly die: Die;
  /** True when this movement hit an opposing blot, sending it to the bar. */
  readonly hit: boolean;
}

/** A player's complete checker action for one roll. Empty movements = dance. */
export interface Play {
  readonly player: Player;
  readonly roll: DiceRoll;
  readonly movements: readonly CheckerMovement[];
}

export type GameEndKind = 'single' | 'gammon' | 'backgammon';

export interface GameResult {
  readonly winner: Player;
  readonly kind: GameEndKind;
  /** Undoubled point value: 1 single, 2 gammon, 3 backgammon. */
  readonly points: 1 | 2 | 3;
}

/**
 * Append-only record of one game, sufficient to replay it deterministically
 * to an identical final position.
 */
export interface GameRecord {
  /** The position the game started from (standard or arbitrary). */
  readonly initialBoard: BoardState;
  /** Opening-roll attempts; doubles reroll. Empty for games from arbitrary positions. */
  readonly openingRolls: ReadonlyArray<{
    readonly white: Die;
    readonly black: Die;
  }>;
  readonly firstPlayer: Player;
  readonly plays: readonly Play[];
}
