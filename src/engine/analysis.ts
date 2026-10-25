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

/**
 * How many plays at the start of a game count as the opening: the opening
 * roll (play 0) and the first reply (play 1). These are judged at 2-ply but
 * disagree with rollout consensus on several well-known openings.
 */
export const OPENING_PLY_COUNT = 2;

/**
 * The 2-ply-noise band for opening plays. The analyzer scores at 2-ply, not a
 * rollout, and 2-ply misranks several well-known openings by a small margin
 * relative to the rollout answer. Within this band an opening play is never
 * flagged as an error or blunder — the gap is evaluation noise, not a mistake
 * worth "correcting". The band sits above the error threshold (so soft errors
 * are suppressed) but no higher than the blunder threshold (so a genuinely
 * gross opening is still flagged).
 */
export const OPENING_NOISE_MARGIN = 0.06;

/** Is this 0-based play index one of the opening plays? */
export function isOpeningPlay(playIndex: number): boolean {
  return playIndex < OPENING_PLY_COUNT;
}

/**
 * Classify a checker play's equity loss, suppressing error/blunder flags on
 * opening plays within the 2-ply-noise margin (see {@link OPENING_NOISE_MARGIN}).
 * Non-opening plays, and opening losses beyond the margin, classify normally.
 */
export function classifyPlayLoss(
  loss: number,
  playIndex: number,
): ErrorClassification {
  if (isOpeningPlay(playIndex) && loss < OPENING_NOISE_MARGIN) {
    return 'ok';
  }
  return classifyEquityLoss(loss);
}
