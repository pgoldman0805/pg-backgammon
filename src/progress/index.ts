/**
 * The Progress selector (spec story 27): pure derivation of the user's
 * per-match quality series — error rate, blunders, decisions over
 * non-tutor-assisted games — from stored matches. The Progress page renders
 * what this module computes.
 */

export {
  buildProgress,
  type ProgressData,
  type ProgressPoint,
  type ProgressTotals,
  RECENT_WINDOW,
} from './series';
