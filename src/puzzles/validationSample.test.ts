/**
 * The deterministic WASM-validation sample (ticket 17): `npm test` re-runs
 * the engine over only a seeded sample of the curated set, so the selection
 * must be reproducible, span every theme, and include both puzzle kinds.
 */

import { describe, expect, it } from 'vitest';
import type { BoardState } from '../rules';
import type { CubePuzzle, PlayPuzzle, Puzzle, PuzzleTheme } from './types';
import { selectValidationSample } from './validationSample';

const emptyBoard: BoardState = {
  points: new Array<number>(25).fill(0),
  bar: { white: 0, black: 0 },
  off: { white: 0, black: 0 },
};

const money = {
  matchLength: 0,
  score: { white: 0, black: 0 },
  cube: { value: 1, owner: 'center' as const },
};

function playPuzzle(id: string, theme: PuzzleTheme): PlayPuzzle {
  return {
    id,
    kind: 'play',
    theme,
    source: 'curated',
    board: emptyBoard,
    hero: 'white',
    match: money,
    roll: [3, 1],
    answers: [],
  };
}

function cubePuzzle(id: string, theme: PuzzleTheme): CubePuzzle {
  return {
    id,
    kind: 'cube',
    theme,
    source: 'curated',
    board: emptyBoard,
    hero: 'white',
    match: money,
    decision: 'offer',
    choices: [],
    verdict: 'Double, take',
  };
}

describe('selectValidationSample', () => {
  it('takes every puzzle when each theme fits the quota', () => {
    const puzzles: Puzzle[] = [
      playPuzzle('a', 'priming'),
      playPuzzle('b', 'priming'),
      cubePuzzle('c', 'cube-handling'),
    ];
    const sample = selectValidationSample(puzzles, 6, 1);
    expect(new Set(sample.map((p) => p.id))).toEqual(new Set(['a', 'b', 'c']));
  });

  it('caps each theme at the quota with a seeded spread, reproducibly', () => {
    const puzzles: Puzzle[] = Array.from({ length: 30 }, (_, i) =>
      playPuzzle(`p${String(i).padStart(2, '0')}`, 'priming'),
    );
    const sample = selectValidationSample(puzzles, 6, 17);

    expect(sample).toHaveLength(6);
    const ids = sample.map((p) => p.id);
    expect(new Set(ids).size).toBe(6);
    for (const picked of sample) {
      expect(puzzles).toContain(picked);
    }
    // Same seed, same selection.
    expect(selectValidationSample(puzzles, 6, 17)).toEqual(sample);
    // A seeded spread, not simply the first six in file order.
    expect(ids).not.toEqual(puzzles.slice(0, 6).map((p) => p.id));
  });

  it('represents every puzzle kind a theme contains', () => {
    // One lone play puzzle among many cube puzzles: a plain random draw
    // would usually miss it, yet the sample must exercise both kinds.
    for (let seed = 1; seed <= 5; seed++) {
      const puzzles: Puzzle[] = [
        playPuzzle('lone-play', 'cube-handling'),
        ...Array.from({ length: 40 }, (_, i) =>
          cubePuzzle(`c${String(i).padStart(2, '0')}`, 'cube-handling'),
        ),
      ];
      const kinds = new Set(
        selectValidationSample(puzzles, 6, seed).map((p) => p.kind),
      );
      expect(kinds, `seed ${seed}`).toEqual(new Set(['play', 'cube']));
    }
  });
});
