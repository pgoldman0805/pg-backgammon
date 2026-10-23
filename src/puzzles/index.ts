/**
 * The Puzzles pillar (spec stories 30-37): the puzzle model with stored
 * engine answers, offline grading by equity tolerance, the retry queue and
 * per-theme progress reducers, the bundled curated set, and the pure mining
 * helpers (ticket 12's blunder mining builds on the same model).
 */

export { CURATED_PUZZLES } from './curatedSet';
export {
  boardKey,
  type CubeGrade,
  EQUITY_TOLERANCE,
  gradeCubeAttempt,
  gradePlayAttempt,
  type PlayGrade,
} from './grade';
export {
  classifyPlayTheme,
  deriveCubeChoices,
  mirrorBoard,
  mirrorMovement,
  toEnginePosition,
} from './mining';
export {
  drillOrder,
  emptyProgress,
  type PuzzleProgressState,
  recordAnswer,
  type ThemeProgress,
  themeProgress,
} from './queue';
export {
  type CubeAction,
  type CubeChoice,
  type CubePuzzle,
  type PlayAnswer,
  type PlayPuzzle,
  PUZZLE_THEMES,
  type Puzzle,
  type PuzzleMatchContext,
  type PuzzleOrigin,
  type PuzzleSource,
  type PuzzleTheme,
} from './types';
