/**
 * Grading uses only the puzzle's stored engine answers (no live engine):
 * a play attempt is joined to a stored answer by its final position, and a
 * choice within 0.02 of the engine's best counts as correct (spec story 32).
 */

import { describe, expect, it } from 'vitest';
import { applyMovement, createBoard } from '../rules';
import { boardKey, gradeCubeAttempt, gradePlayAttempt } from './grade';
import type { CubePuzzle, PlayAnswer, PlayPuzzle } from './types';

/** A simple bear-off position: white 2 on the 5 and 3 points, rest off. */
const board = createBoard({
  white: { points: { 5: 1, 3: 1 }, off: 13 },
  black: { points: { 24: 2 }, off: 13 },
});

function answer(
  partial: Partial<PlayAnswer> &
    Pick<PlayAnswer, 'rank' | 'equityLoss' | 'finalKey'>,
): PlayAnswer {
  return {
    moveText: `play ${partial.rank}`,
    movements: [],
    equity: 1 - partial.equityLoss,
    ...partial,
  } as PlayAnswer;
}

/** Final boards for the two candidate plays of a 5-3 roll. */
const bestBoard = [
  { from: 5, to: 'off', die: 5, hit: false },
  { from: 3, to: 'off', die: 3, hit: false },
].reduce((b, m) => applyMovement(b, 'white', m as never), board);
const otherBoard = [
  { from: 5, to: 'off', die: 5, hit: false },
  { from: 3, to: 1, die: 3, hit: false },
].reduce((b, m) => applyMovement(b, 'white', m as never), board);

function playPuzzle(secondLoss: number): PlayPuzzle {
  return {
    id: 'p1',
    kind: 'play',
    theme: 'bear-off',
    source: 'curated',
    board,
    hero: 'white',
    match: {
      matchLength: 0,
      score: { white: 0, black: 0 },
      cube: { value: 1, owner: 'center' },
    },
    roll: [5, 3],
    answers: [
      answer({ rank: 1, equityLoss: 0, finalKey: boardKey(bestBoard) }),
      answer({
        rank: 2,
        equityLoss: secondLoss,
        finalKey: boardKey(otherBoard),
      }),
    ],
  };
}

describe('gradePlayAttempt', () => {
  it('marks the engine-best play correct', () => {
    const grade = gradePlayAttempt(playPuzzle(0.1), bestBoard);
    expect(grade.correct).toBe(true);
    expect(grade.chosen.rank).toBe(1);
    expect(grade.best.rank).toBe(1);
  });

  it('marks a near-equal alternative (within 0.02) correct', () => {
    const grade = gradePlayAttempt(playPuzzle(0.015), otherBoard);
    expect(grade.correct).toBe(true);
    expect(grade.chosen.rank).toBe(2);
    expect(grade.best.rank).toBe(1);
  });

  it('accepts a loss of exactly 0.02', () => {
    expect(gradePlayAttempt(playPuzzle(0.02), otherBoard).correct).toBe(true);
  });

  it('marks a play losing more than 0.02 incorrect', () => {
    const grade = gradePlayAttempt(playPuzzle(0.021), otherBoard);
    expect(grade.correct).toBe(false);
    expect(grade.chosen.rank).toBe(2);
  });

  it('throws when the final board matches no stored answer', () => {
    expect(() => gradePlayAttempt(playPuzzle(0.1), board)).toThrow(
      /no stored answer/i,
    );
  });
});

const cubePuzzle: CubePuzzle = {
  id: 'c1',
  kind: 'cube',
  theme: 'cube-handling',
  source: 'curated',
  board,
  hero: 'white',
  match: {
    matchLength: 0,
    score: { white: 0, black: 0 },
    cube: { value: 1, owner: 'center' },
  },
  decision: 'offer',
  choices: [
    { action: 'double', equity: 0.62, equityLoss: 0 },
    { action: 'no-double', equity: 0.55, equityLoss: 0.07 },
  ],
  verdict: 'Double, take',
};

describe('gradeCubeAttempt', () => {
  it('marks the engine-best action correct', () => {
    const grade = gradeCubeAttempt(cubePuzzle, 'double');
    expect(grade.correct).toBe(true);
    expect(grade.chosen.action).toBe('double');
    expect(grade.best.action).toBe('double');
  });

  it('marks an action losing more than 0.02 incorrect', () => {
    const grade = gradeCubeAttempt(cubePuzzle, 'no-double');
    expect(grade.correct).toBe(false);
    expect(grade.chosen.action).toBe('no-double');
    expect(grade.best.action).toBe('double');
  });

  it('marks a near-equal action (within 0.02) correct', () => {
    const close: CubePuzzle = {
      ...cubePuzzle,
      choices: [
        { action: 'take', equity: -0.4, equityLoss: 0 },
        { action: 'pass', equity: -0.41, equityLoss: 0.01 },
      ],
      decision: 'response',
      verdict: 'Double, take',
    };
    expect(gradeCubeAttempt(close, 'pass').correct).toBe(true);
  });

  it('throws for an action the puzzle does not offer', () => {
    expect(() => gradeCubeAttempt(cubePuzzle, 'take')).toThrow(/not a choice/i);
  });
});
