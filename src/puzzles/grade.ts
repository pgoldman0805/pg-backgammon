/**
 * Puzzle grading over stored engine answers (spec story 32): an attempt is
 * correct iff its equity is within 0.02 of the engine's best, so near-equal
 * alternatives count. No live engine is consulted — puzzles grade even while
 * the engine payload is still loading.
 */

import type { BoardState } from '../rules';
import type {
  CubeAction,
  CubeChoice,
  CubePuzzle,
  PlayAnswer,
  PlayPuzzle,
} from './types';

/** Correct iff the chosen answer loses no more than this versus the best. */
export const EQUITY_TOLERANCE = 0.02;

/** Float-safe "within tolerance" (0.02 itself must count as correct). */
const within = (loss: number): boolean => loss <= EQUITY_TOLERANCE + 1e-9;

/** Identity key for a position; serialization only, no rules knowledge. */
export function boardKey(board: BoardState): string {
  return `${board.points.join(',')}|${board.bar.white},${board.bar.black}|${board.off.white},${board.off.black}`;
}

export interface PlayGrade {
  readonly correct: boolean;
  /** The stored answer the attempt's final position matched. */
  readonly chosen: PlayAnswer;
  readonly best: PlayAnswer;
}

/**
 * Grade a committed play by the board it ended on. The answers cover every
 * legal play, so a legal attempt always joins; anything else is a defect.
 */
export function gradePlayAttempt(
  puzzle: PlayPuzzle,
  finalBoard: BoardState,
): PlayGrade {
  const key = boardKey(finalBoard);
  const chosen = puzzle.answers.find((a) => a.finalKey === key);
  if (!chosen) {
    throw new Error(
      `puzzle ${puzzle.id}: the final position matches no stored answer`,
    );
  }
  return { correct: within(chosen.equityLoss), chosen, best: best(puzzle) };
}

function best(puzzle: PlayPuzzle): PlayAnswer {
  const top = puzzle.answers.find((a) => a.equityLoss === 0);
  return top ?? puzzle.answers[0];
}

export interface CubeGrade {
  readonly correct: boolean;
  readonly chosen: CubeChoice;
  readonly best: CubeChoice;
}

/** Grade a cube decision by the chosen action's stored equity loss. */
export function gradeCubeAttempt(
  puzzle: CubePuzzle,
  action: CubeAction,
): CubeGrade {
  const chosen = puzzle.choices.find((choice) => choice.action === action);
  if (!chosen) {
    throw new Error(`puzzle ${puzzle.id}: "${action}" is not a choice`);
  }
  const bestChoice =
    puzzle.choices.find((choice) => choice.equityLoss === 0) ??
    puzzle.choices[0];
  return { correct: within(chosen.equityLoss), chosen, best: bestChoice };
}
