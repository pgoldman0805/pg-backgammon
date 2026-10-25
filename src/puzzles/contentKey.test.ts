import { describe, expect, it } from 'vitest';
import { initialBoard } from '../rules';
import { puzzleContentKey } from './contentKey';
import type { CubePuzzle, PuzzleMatchContext } from './types';

const MONEY: PuzzleMatchContext = {
  matchLength: 0,
  score: { white: 0, black: 0 },
  cube: { value: 1, owner: 'center' },
};

function cubePuzzle(match: PuzzleMatchContext): CubePuzzle {
  return {
    id: 'x',
    kind: 'cube',
    theme: 'cube-handling',
    source: 'curated',
    board: initialBoard(),
    hero: 'white',
    match,
    decision: 'offer',
    choices: [
      { action: 'double', equity: 0.1, equityLoss: 0 },
      { action: 'no-double', equity: 0, equityLoss: 0.1 },
    ],
    verdict: 'Double, take',
  };
}

describe('puzzleContentKey and the match score', () => {
  it('ignores the score for money puzzles (same drill)', () => {
    const a = cubePuzzle(MONEY);
    const b = cubePuzzle({ ...MONEY, score: { white: 0, black: 0 } });
    expect(puzzleContentKey(a)).toBe(puzzleContentKey(b));
  });

  it('distinguishes the same position at two different match scores', () => {
    const twoAway = cubePuzzle({
      matchLength: 7,
      score: { white: 5, black: 5 },
      cube: { value: 1, owner: 'center' },
    });
    const fourAway = cubePuzzle({
      matchLength: 7,
      score: { white: 5, black: 3 },
      cube: { value: 1, owner: 'center' },
    });
    expect(puzzleContentKey(twoAway)).not.toBe(puzzleContentKey(fourAway));
  });

  it('keeps an identical match-score position as one drill', () => {
    const a = cubePuzzle({
      matchLength: 7,
      score: { white: 5, black: 5 },
      cube: { value: 1, owner: 'center' },
    });
    const b = cubePuzzle({
      matchLength: 7,
      score: { white: 5, black: 5 },
      cube: { value: 1, owner: 'center' },
    });
    expect(puzzleContentKey(a)).toBe(puzzleContentKey(b));
  });

  it('distinguishes a money drill from the same position in a match', () => {
    const money = cubePuzzle(MONEY);
    const match = cubePuzzle({
      matchLength: 7,
      score: { white: 0, black: 0 },
      cube: { value: 1, owner: 'center' },
    });
    expect(puzzleContentKey(money)).not.toBe(puzzleContentKey(match));
  });
});
