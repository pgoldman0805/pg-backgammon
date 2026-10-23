/**
 * The engine module (ADR-0001): gnubg-WASM in a Web Worker behind a typed
 * async interface, the difficulty layer, shared analysis primitives, and a
 * fake engine for downstream tests.
 *
 * Internals (command protocol, parsers, XGID encoding, worker plumbing) stay
 * private to this directory; consumers program against the Engine interface.
 */

export {
  CLASSIFICATION_THRESHOLDS,
  classifyEquityLoss,
  type ErrorClassification,
  equityLoss,
} from './analysis';
export { type CreateEngineOptions, createGnubgEngine } from './client';
export {
  DIFFICULTY_SETTINGS,
  type DifficultySettings,
} from './difficulty';
export { createFakeEngine } from './fake';
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
