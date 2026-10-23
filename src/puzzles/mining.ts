/**
 * Pure helpers shared by the puzzle mining script (scripts/minePuzzles.ts)
 * and the curated-set validation test: color-mirroring so every curated
 * puzzle is posed for White, hero-perspective cube choices derived from a
 * gnubg cube analysis, theme heuristics, and the engine position a stored
 * puzzle is validated against. No node or engine-runtime imports here.
 */

// Deep import: the engine barrel pulls in the DOM-typed worker client, which
// the node-side tsconfig (used by the validation test) cannot type-check.
import type { CubeAnalysis, EnginePosition } from '../engine/types';
import type { BoardState, CheckerMovement } from '../rules';
import { pipCount } from '../rules';
import type { CubeChoice, Puzzle, PuzzleTheme } from './types';

/** Reflect the board so each player takes the other's checkers and seats. */
export function mirrorBoard(board: BoardState): BoardState {
  const points = new Array<number>(25).fill(0);
  for (let p = 1; p <= 24; p++) {
    // `|| 0` normalizes -0, which structural equality distinguishes.
    points[p] = -board.points[25 - p] || 0;
  }
  return {
    points,
    bar: { white: board.bar.black, black: board.bar.white },
    off: { white: board.off.black, black: board.off.white },
  };
}

/** Reflect one movement to match {@link mirrorBoard}. */
export function mirrorMovement(movement: CheckerMovement): CheckerMovement {
  return {
    from: movement.from === 'bar' ? 'bar' : 25 - movement.from,
    to: movement.to === 'off' ? 'off' : 25 - movement.to,
    die: movement.die,
    hit: movement.hit,
  };
}

/** Strip float noise from derived equity differences. */
const round = (value: number): number => Math.round(value * 1e6) / 1e6;

function rankChoices(
  raw: ReadonlyArray<{ action: CubeChoice['action']; equity: number }>,
): CubeChoice[] {
  const best = Math.max(...raw.map((r) => r.equity));
  return raw
    .map((r) => ({ ...r, equityLoss: round(best - r.equity) }))
    .sort((a, b) => a.equityLoss - b.equityLoss);
}

/** The three cubeful equities, always from the potential doubler's side. */
export interface CubefulEquities {
  readonly noDouble: number;
  readonly doubleTake: number;
  readonly doublePass: number;
}

/**
 * The hero's cube choices from the doubler-perspective equities. For an
 * 'offer' the hero is the doubler, and doubling assumes the opponent picks
 * their better response; for a 'response' the hero is the player doubled, so
 * equities negate. Shared by the curated miner (via {@link deriveCubeChoices})
 * and ticket 12's blunder miner, whose analysis rows store exactly these
 * three numbers.
 */
export function cubeChoicesFromEquities(
  equities: CubefulEquities,
  decision: 'offer' | 'response',
): CubeChoice[] {
  if (decision === 'offer') {
    return rankChoices([
      // The opponent responds with whichever reply hurts the doubler more.
      {
        action: 'double',
        equity: Math.min(equities.doubleTake, equities.doublePass),
      },
      { action: 'no-double', equity: equities.noDouble },
    ]);
  }
  return rankChoices([
    { action: 'take', equity: round(-equities.doubleTake) },
    { action: 'pass', equity: round(-equities.doublePass) },
  ]);
}

/**
 * Turn a gnubg cube analysis (always from the potential doubler's
 * perspective) into the hero's two choices and the engine verdict.
 */
export function deriveCubeChoices(
  analysis: CubeAnalysis,
  decision: 'offer' | 'response',
): { choices: CubeChoice[]; verdict: string } {
  const find = (re: RegExp) =>
    analysis.options.find((option) => re.test(option.action));
  const noDouble = find(/^no (re)?double/i);
  const take = find(/^(re)?double, take$/i);
  const pass = find(/^(re)?double, pass$/i);
  if (!noDouble || !take || !pass) {
    throw new Error(
      `cube analysis is missing options: ${analysis.options
        .map((o) => o.action)
        .join(', ')}`,
    );
  }
  return {
    choices: cubeChoicesFromEquities(
      {
        noDouble: noDouble.equity,
        doubleTake: take.equity,
        doublePass: pass.equity,
      },
      decision,
    ),
    verdict: analysis.properAction,
  };
}

/**
 * Theme heuristics for a checker-play position, hero = White on roll.
 * Specific structures win over general ones: bear-off, then blitzing, then
 * priming, then holding game; null means the position teaches nothing
 * specific enough to tag.
 */
export function classifyPlayTheme(board: BoardState): PuzzleTheme | null {
  const white = (p: number) => Math.max(0, board.points[p]);
  const black = (p: number) => Math.max(0, -board.points[p]);

  let whiteOutside = board.bar.white > 0;
  for (let p = 7; p <= 24 && !whiteOutside; p++) {
    whiteOutside = white(p) > 0;
  }
  if (!whiteOutside) {
    return 'bear-off';
  }

  let blackHomeAnchor = false;
  let whiteHomePoints = 0;
  for (let p = 1; p <= 6; p++) {
    blackHomeAnchor ||= black(p) >= 2;
    whiteHomePoints += white(p) >= 2 ? 1 : 0;
  }
  if (board.bar.black > 0 && !blackHomeAnchor && whiteHomePoints >= 2) {
    return 'blitzing';
  }

  // Priming: three or more consecutive made points in the priming zone with
  // black checkers trapped behind (black moves 1 -> 24).
  for (let start = 3; start <= 8; start++) {
    let length = 0;
    while (start + length <= 10 && white(start + length) >= 2) {
      length++;
    }
    if (length >= 3) {
      let blackBehind = board.bar.black > 0;
      for (let p = 1; p < start && !blackBehind; p++) {
        blackBehind = black(p) > 0;
      }
      if (blackBehind) {
        return 'priming';
      }
    }
  }

  let highAnchor = false;
  for (let p = 18; p <= 24; p++) {
    highAnchor ||= white(p) >= 2;
  }
  if (highAnchor && pipCount(board, 'white') >= pipCount(board, 'black') + 10) {
    return 'holding-game';
  }

  return null;
}

/**
 * The engine position a puzzle's stored answers are validated against: the
 * hero on roll, except a cube 'response', which gnubg analyzes from the
 * doubler's (the opponent's) side.
 */
export function toEnginePosition(puzzle: Puzzle): EnginePosition {
  const onRoll =
    puzzle.kind === 'cube' && puzzle.decision === 'response'
      ? puzzle.hero === 'white'
        ? 'black'
        : 'white'
      : puzzle.hero;
  return {
    board: puzzle.board,
    onRoll,
    match: {
      matchLength: puzzle.match.matchLength,
      score: puzzle.match.score,
      crawford: puzzle.match.crawford,
      cube: puzzle.match.cube,
    },
  };
}
