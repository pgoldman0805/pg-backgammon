/**
 * Score-dependent cube puzzles (GLOSSARY "Cube decision"; ticket 38).
 *
 * GENERATED FILE — do not edit by hand. Regenerate with:
 *   npm run mine:score-cubes
 * (scripts/mineScoreCubes.ts: the gnubg WASM engine re-evaluates curated cube
 * positions at representative match scores and keeps the ones whose right
 * answer shifts with the score. Every answer is the engine's cubeful equity
 * AT THAT SCORE. No positions are copied from books or other published
 * sources.)
 *
 * curatedPuzzles.validation.test.ts re-evaluates every stored answer against
 * the real WASM engine (with the puzzle's own match score), so stale or wrong
 * answer data cannot ship.
 */

// biome-ignore-all lint/suspicious/noApproximativeNumericConstant: engine equities are data, not math constants
import type { Puzzle } from './types';

export const SCORE_CUBE_PUZZLES: readonly Puzzle[] = [
  {
    id: 'score-cube-001',
    kind: 'cube',
    theme: 'cube-handling',
    source: 'curated',
    board: {
      points: [
        0, 0, -1, 2, 0, 3, 4, 0, 0, 1, 1, 0, -4, 2, 0, 0, 0, -5, 0, -3, -2, 1,
        0, 1, 0,
      ],
      bar: {
        white: 0,
        black: 0,
      },
      off: {
        white: 0,
        black: 0,
      },
    },
    hero: 'white',
    match: {
      matchLength: 7,
      score: {
        white: 3,
        black: 5,
      },
      cube: {
        value: 1,
        owner: 'center',
      },
    },
    decision: 'offer',
    choices: [
      {
        action: 'double',
        equity: 0.898,
        equityLoss: 0,
      },
      {
        action: 'no-double',
        equity: 0.614,
        equityLoss: 0.284,
      },
    ],
    verdict: 'Double, take',
  },
  {
    id: 'score-cube-002',
    kind: 'cube',
    theme: 'cube-handling',
    source: 'curated',
    board: {
      points: [
        0, -1, 2, -1, 0, 0, 4, 0, 3, 0, 0, 0, -4, 4, 0, 0, 1, -3, -1, -5, 0, 0,
        0, 0, 1,
      ],
      bar: {
        white: 0,
        black: 0,
      },
      off: {
        white: 0,
        black: 0,
      },
    },
    hero: 'white',
    match: {
      matchLength: 7,
      score: {
        white: 3,
        black: 5,
      },
      cube: {
        value: 1,
        owner: 'center',
      },
    },
    decision: 'offer',
    choices: [
      {
        action: 'double',
        equity: 1,
        equityLoss: 0,
      },
      {
        action: 'no-double',
        equity: 0.795,
        equityLoss: 0.205,
      },
    ],
    verdict: 'Double, pass',
  },
  {
    id: 'score-cube-003',
    kind: 'cube',
    theme: 'cube-handling',
    source: 'curated',
    board: {
      points: [
        0, -1, 0, 0, -2, 2, 4, 2, 2, 0, 0, 0, -2, 3, -2, 0, 0, -3, 0, -4, -1, 0,
        0, 0, 1,
      ],
      bar: {
        white: 1,
        black: 0,
      },
      off: {
        white: 0,
        black: 0,
      },
    },
    hero: 'white',
    match: {
      matchLength: 7,
      score: {
        white: 3,
        black: 5,
      },
      cube: {
        value: 1,
        owner: 'center',
      },
    },
    decision: 'offer',
    choices: [
      {
        action: 'double',
        equity: 1,
        equityLoss: 0,
      },
      {
        action: 'no-double',
        equity: 0.855,
        equityLoss: 0.145,
      },
    ],
    verdict: 'Double, pass',
  },
  {
    id: 'score-cube-004',
    kind: 'cube',
    theme: 'cube-handling',
    source: 'curated',
    board: {
      points: [
        0, -2, 2, 0, 2, 0, 3, 2, 0, 0, 0, 0, -2, 4, -1, 0, 1, -2, -2, -4, -2, 0,
        0, 0, 1,
      ],
      bar: {
        white: 0,
        black: 0,
      },
      off: {
        white: 0,
        black: 0,
      },
    },
    hero: 'white',
    match: {
      matchLength: 7,
      score: {
        white: 3,
        black: 5,
      },
      cube: {
        value: 1,
        owner: 'center',
      },
    },
    decision: 'offer',
    choices: [
      {
        action: 'double',
        equity: 0.729,
        equityLoss: 0,
      },
      {
        action: 'no-double',
        equity: 0.674,
        equityLoss: 0.055,
      },
    ],
    verdict: 'Double, take',
  },
  {
    id: 'score-cube-005',
    kind: 'cube',
    theme: 'cube-handling',
    source: 'curated',
    board: {
      points: [
        0, 2, 2, -1, 2, 0, 3, 0, 2, 0, 0, 0, -4, 2, 0, -1, 0, -3, 0, -5, 0, 0,
        0, 0, 2,
      ],
      bar: {
        white: 0,
        black: 1,
      },
      off: {
        white: 0,
        black: 0,
      },
    },
    hero: 'white',
    match: {
      matchLength: 7,
      score: {
        white: 4,
        black: 6,
      },
      cube: {
        value: 1,
        owner: 'center',
      },
    },
    decision: 'offer',
    choices: [
      {
        action: 'double',
        equity: 1,
        equityLoss: 0,
      },
      {
        action: 'no-double',
        equity: 0.949,
        equityLoss: 0.051,
      },
    ],
    verdict: 'Double, pass',
  },
  {
    id: 'score-cube-006',
    kind: 'cube',
    theme: 'cube-handling',
    source: 'curated',
    board: {
      points: [
        0, -1, 0, 3, -2, 3, 3, 2, 2, 2, 0, 0, 0, 0, 0, 0, 0, 0, 0, -1, -2, 0,
        -4, -2, -3,
      ],
      bar: {
        white: 0,
        black: 0,
      },
      off: {
        white: 0,
        black: 0,
      },
    },
    hero: 'white',
    match: {
      matchLength: 7,
      score: {
        white: 4,
        black: 6,
      },
      cube: {
        value: 1,
        owner: 'center',
      },
    },
    decision: 'offer',
    choices: [
      {
        action: 'double',
        equity: 1,
        equityLoss: 0,
      },
      {
        action: 'no-double',
        equity: 0.932,
        equityLoss: 0.068,
      },
    ],
    verdict: 'Double, pass',
  },
  {
    id: 'score-cube-007',
    kind: 'cube',
    theme: 'cube-handling',
    source: 'curated',
    board: {
      points: [
        0, 0, 0, 0, 0, 2, 4, 1, 2, 1, 0, 0, -3, 2, -2, -1, 0, -2, 0, -5, 0, -2,
        0, 2, 1,
      ],
      bar: {
        white: 0,
        black: 0,
      },
      off: {
        white: 0,
        black: 0,
      },
    },
    hero: 'white',
    match: {
      matchLength: 7,
      score: {
        white: 5,
        black: 5,
      },
      cube: {
        value: 1,
        owner: 'center',
      },
    },
    decision: 'response',
    choices: [
      {
        action: 'pass',
        equity: -1,
        equityLoss: 0,
      },
      {
        action: 'take',
        equity: -1.182,
        equityLoss: 0.182,
      },
    ],
    verdict: 'Double, pass',
  },
  {
    id: 'score-cube-008',
    kind: 'cube',
    theme: 'cube-handling',
    source: 'curated',
    board: {
      points: [
        0, 0, 0, 0, 0, 2, 4, 1, 2, 1, 0, 0, -3, 2, -2, -1, 0, -2, 0, -5, 0, -2,
        0, 2, 1,
      ],
      bar: {
        white: 0,
        black: 0,
      },
      off: {
        white: 0,
        black: 0,
      },
    },
    hero: 'white',
    match: {
      matchLength: 7,
      score: {
        white: 5,
        black: 3,
      },
      cube: {
        value: 1,
        owner: 'center',
      },
    },
    decision: 'response',
    choices: [
      {
        action: 'pass',
        equity: -1,
        equityLoss: 0,
      },
      {
        action: 'take',
        equity: -1.422,
        equityLoss: 0.422,
      },
    ],
    verdict: 'Double, pass',
  },
  {
    id: 'score-cube-009',
    kind: 'cube',
    theme: 'cube-handling',
    source: 'curated',
    board: {
      points: [
        0, -1, -1, 2, 2, 2, 3, 2, -1, 0, 0, 1, 0, 1, 0, 0, 0, 0, 1, -2, -2, -2,
        -2, -2, -2,
      ],
      bar: {
        white: 1,
        black: 0,
      },
      off: {
        white: 0,
        black: 0,
      },
    },
    hero: 'white',
    match: {
      matchLength: 7,
      score: {
        white: 5,
        black: 5,
      },
      cube: {
        value: 1,
        owner: 'center',
      },
    },
    decision: 'response',
    choices: [
      {
        action: 'take',
        equity: -0.734,
        equityLoss: 0,
      },
      {
        action: 'pass',
        equity: -1,
        equityLoss: 0.266,
      },
    ],
    verdict: 'Double, take',
  },
];
