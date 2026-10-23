/**
 * The analyzer module (spec "Analyze" pillar): walks finished match records,
 * scores every unforced play and cube decision against the engine at full
 * strength, classifies the losses with the shared thresholds, persists the
 * review beside the match, and deepens single decisions on demand.
 *
 * Internals (record walking, cube costing, the priority gate) stay private;
 * consumers program against the analyzer service and the persisted shape.
 */

export {
  type AnalyzeOptions,
  analyzeGame,
  analyzeMatch,
} from './analyze';
export {
  type AnalysisProgress,
  type AnalyzeMatchOptions,
  createMatchAnalyzer,
  type DeepenTarget,
  type MatchAnalyzer,
  type MatchAnalyzerOptions,
  type PositionAnalysis,
} from './analyzer';
export {
  type AutoAnalysis,
  type AutoAnalysisOptions,
  createAutoAnalysis,
} from './autoAnalysis';
export type { CubeError } from './cube';
export { type DeepenOptions, deepenDecision } from './deepen';
export type { AnalysisPriority } from './gate';
export { getMatchAnalyzer } from './instance';
export {
  ANALYSIS_FORMAT,
  type AnalyzedCube,
  type AnalyzedDecision,
  type AnalyzedPlay,
  type AnalyzedPlies,
  type GameAnalysis,
  isMatchAnalysis,
  type MatchAnalysis,
  type PlayAlternative,
  type PlayerSummary,
} from './types';
export { useAutoAnalysis } from './useAutoAnalysis';
export {
  type CubeActionMoment,
  type CubeOpportunityMoment,
  type DecisionMoment,
  type GameStanding,
  matchStandings,
  type PlayMoment,
  walkGame,
} from './walk';
