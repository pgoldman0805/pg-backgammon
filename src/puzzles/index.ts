/**
 * The Puzzles pillar (spec stories 30-37): the puzzle model with stored
 * engine answers, offline grading by equity tolerance, the retry queue and
 * per-theme progress reducers, the bundled curated set, and the pure mining
 * helpers (ticket 12's blunder mining builds on the same model).
 */

export {
  type BlunderMiningDeps,
  blunderPuzzleId,
  mineBlunderPuzzles,
  puzzleContentKey,
} from './blunderMining';
export {
  type BlunderMiningService,
  type BlunderMiningServiceOptions,
  createBlunderMiningService,
} from './blunderMiningService';
export {
  cubeContentKey,
  playContentKey,
} from './contentKey';
export { CURATED_PUZZLES } from './curatedSet';
export { getPuzzleGenerationService } from './generationInstance';
export {
  BATCH_GAME_CAP,
  BATCH_KEEPERS,
  createPuzzleGenerationService,
  type GenerationRunOutcome,
  type GenerationStatus,
  type PuzzleGenerationService,
  type PuzzleGenerationServiceOptions,
} from './generationService';
export {
  boardKey,
  type CubeGrade,
  EQUITY_TOLERANCE,
  gradeCubeAttempt,
  gradePlayAttempt,
  type PlayGrade,
} from './grade';
export {
  type CubefulEquities,
  classifyPlayTheme,
  cubeChoicesFromEquities,
  deriveCubeChoices,
  mirrorBoard,
  mirrorMovement,
  toEnginePosition,
} from './mining';
export { getBlunderMiningService } from './miningInstance';
export {
  drillOrder,
  emptyProgress,
  type PuzzleProgressState,
  recordAnswer,
  type ThemeProgress,
  themeProgress,
} from './queue';
export {
  mineSelfPlayPuzzles,
  SELF_PLAY_DIVERSITY,
  SELF_PLAY_QUALITY,
  type SelfPlayDiversity,
  type SelfPlayMiningEngine,
  type SelfPlayMiningOptions,
  type SelfPlayMiningProgress,
  type SelfPlayMiningResult,
  type SelfPlayMiningStats,
  type SelfPlayMiningTarget,
  type SelfPlayQuality,
} from './selfPlayMining';
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
export { useBlunderMining } from './useBlunderMining';
