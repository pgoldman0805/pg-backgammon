/**
 * Structural validation for puzzles arriving from outside (backup import):
 * the shape checks shared by the blunder-puzzle (ticket 12) and generated-
 * puzzle (ticket 18) stores. Source- and origin-specific rules stay with the
 * stores; anything corrupt is treated as absent, never thrown.
 */

import { PUZZLE_THEMES, type Puzzle, type PuzzleTheme } from '../puzzles/types';

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isBoard(value: unknown): boolean {
  return (
    isRecord(value) &&
    Array.isArray(value.points) &&
    isRecord(value.bar) &&
    isRecord(value.off)
  );
}

function isPlayAnswer(value: unknown): boolean {
  return (
    isRecord(value) &&
    typeof value.rank === 'number' &&
    typeof value.moveText === 'string' &&
    Array.isArray(value.movements) &&
    typeof value.finalKey === 'string' &&
    typeof value.equity === 'number' &&
    typeof value.equityLoss === 'number'
  );
}

function isCubeChoice(value: unknown): boolean {
  return (
    isRecord(value) &&
    typeof value.action === 'string' &&
    typeof value.equity === 'number' &&
    typeof value.equityLoss === 'number'
  );
}

/**
 * Whether the value has a stored puzzle's full shape — everything but the
 * `source`/`origin` rules, which each store checks for itself.
 */
export function hasPuzzleShape(value: unknown): value is Puzzle {
  if (!isRecord(value)) {
    return false;
  }
  const base =
    typeof value.id === 'string' &&
    PUZZLE_THEMES.includes(value.theme as PuzzleTheme) &&
    isBoard(value.board) &&
    (value.hero === 'white' || value.hero === 'black') &&
    isRecord(value.match) &&
    typeof value.match.matchLength === 'number' &&
    isRecord(value.match.score) &&
    isRecord(value.match.cube);
  if (!base) {
    return false;
  }
  if (value.kind === 'play') {
    return (
      Array.isArray(value.roll) &&
      Array.isArray(value.answers) &&
      value.answers.length > 0 &&
      value.answers.every(isPlayAnswer)
    );
  }
  if (value.kind === 'cube') {
    return (
      (value.decision === 'offer' || value.decision === 'response') &&
      typeof value.verdict === 'string' &&
      Array.isArray(value.choices) &&
      value.choices.length > 0 &&
      value.choices.every(isCubeChoice)
    );
  }
  return false;
}
