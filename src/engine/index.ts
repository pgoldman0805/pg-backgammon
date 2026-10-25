/**
 * The engine module (ADR-0001): gnubg-WASM in a Web Worker behind a typed
 * async interface, the difficulty layer, and shared analysis primitives.
 *
 * Internals (command protocol, parsers, XGID encoding, worker plumbing) stay
 * private to this directory; consumers program against the Engine interface.
 * The fake engine for tests lives in ./fake, deliberately outside this
 * production barrel — test code imports it from there directly.
 */

export {
  CLASSIFICATION_THRESHOLDS,
  classifyEquityLoss,
  classifyPlayLoss,
  type ErrorClassification,
  equityLoss,
  isOpeningPlay,
  OPENING_NOISE_MARGIN,
  OPENING_PLY_COUNT,
} from './analysis';
export { type CreateEngineOptions, createGnubgEngine } from './client';
export {
  DIFFICULTY_LABELS,
  DIFFICULTY_SETTINGS,
  type DifficultySettings,
} from './difficulty';
export type {
  AnalysisEffort,
  CubeAnalysis,
  CubeDecisionOption,
  CubeInfoOptions,
  CubeState,
  Difficulty,
  Engine,
  EnginePosition,
  EngineStatus,
  MatchContext,
  PositionEvaluation,
  RankedPlay,
  RankPlaysOptions,
  WinChances,
} from './types';
