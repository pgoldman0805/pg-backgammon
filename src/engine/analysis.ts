/**
 * Shared analysis primitives (spec "Analyzer" conventions, ADR-0001).
 *
 * Pure functions over EMG equities: the equity lost by a decision versus the
 * engine's best choice, and its classification. Used by the analyzer and
 * Tutor-mode feedback (tickets 08/09); kept UI- and engine-free.
 */

/** Classification of a decision by its EMG equity loss. */
export type ErrorClassification = 'ok' | 'dubious' | 'error' | 'blunder';

/** Minimum equity loss (inclusive) for each non-ok classification. */
export const CLASSIFICATION_THRESHOLDS = {
  dubious: 0.02,
  error: 0.04,
  blunder: 0.08,
} as const;

/**
 * EMG equity given up by choosing `chosen` over the engine's `best`.
 * Clamped at zero: mixed-ply evaluations can rate the chosen play above the
 * nominal best, which is never a loss.
 */
export function equityLoss(best: number, chosen: number): number {
  return Math.max(0, best - chosen);
}

/** Classify an equity loss per the gnubg/XG thresholds. */
export function classifyEquityLoss(loss: number): ErrorClassification {
  if (loss >= CLASSIFICATION_THRESHOLDS.blunder) {
    return 'blunder';
  }
  if (loss >= CLASSIFICATION_THRESHOLDS.error) {
    return 'error';
  }
  if (loss >= CLASSIFICATION_THRESHOLDS.dubious) {
    return 'dubious';
  }
  return 'ok';
}
