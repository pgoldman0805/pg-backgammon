/**
 * The bundled curated puzzle set (GLOSSARY "Curated puzzle").
 *
 * GENERATED FILE — do not edit by hand. Regenerate with:
 *   npm run mine:puzzles
 * (scripts/minePuzzles.ts: engine self-play sweeps positions, keeps the
 * instructive ones, and grades every answer at full strength. Themes are
 * tagged by position heuristics. No positions are copied from books or
 * other published sources.)
 *
 * curatedPuzzles.validation.test.ts re-evaluates every stored answer
 * against the real WASM engine, so stale or wrong answer data cannot ship.
 */

// biome-ignore-all lint/suspicious/noApproximativeNumericConstant: engine equities are data, not math constants
import type { Puzzle } from './types';

export const CURATED_PUZZLES: readonly Puzzle[] = [
  {
    id: 'curated-001',
    kind: 'play',
    theme: 'priming',
    source: 'curated',
    board: {
      points: [
        0, 0, -1, 0, 0, 0, 5, 2, 2, 0, -1, 0, -4, 4, 0, 0, 0, -4, 0, -5, 0, 0,
        0, 0, 2,
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
      matchLength: 0,
      score: {
        white: 0,
        black: 0,
      },
      cube: {
        value: 1,
        owner: 'center',
      },
    },
    roll: [6, 2],
    answers: [
      {
        rank: 1,
        moveText: '24/22 13/7',
        movements: [
          {
            from: 13,
            to: 7,
            die: 6,
            hit: false,
          },
          {
            from: 24,
            to: 22,
            die: 2,
            hit: false,
          },
        ],
        finalKey:
          '0,0,-1,0,0,0,5,3,2,0,-1,0,-4,3,0,0,0,-4,0,-5,0,0,1,0,1|0,0|0,0',
        equity: -0.004,
        equityLoss: 0,
      },
      {
        rank: 2,
        moveText: '13/7 6/4',
        movements: [
          {
            from: 13,
            to: 7,
            die: 6,
            hit: false,
          },
          {
            from: 6,
            to: 4,
            die: 2,
            hit: false,
          },
        ],
        finalKey:
          '0,0,-1,0,1,0,4,3,2,0,-1,0,-4,3,0,0,0,-4,0,-5,0,0,0,0,2|0,0|0,0',
        equity: -0.066,
        equityLoss: 0.062,
      },
      {
        rank: 3,
        moveText: '24/18 13/11',
        movements: [
          {
            from: 24,
            to: 18,
            die: 6,
            hit: false,
          },
          {
            from: 13,
            to: 11,
            die: 2,
            hit: false,
          },
        ],
        finalKey:
          '0,0,-1,0,0,0,5,2,2,0,-1,1,-4,3,0,0,0,-4,1,-5,0,0,0,0,1|0,0|0,0',
        equity: -0.073,
        equityLoss: 0.06899999999999999,
      },
      {
        rank: 4,
        moveText: '13/5',
        movements: [
          {
            from: 13,
            to: 7,
            die: 6,
            hit: false,
          },
          {
            from: 7,
            to: 5,
            die: 2,
            hit: false,
          },
        ],
        finalKey:
          '0,0,-1,0,0,1,5,2,2,0,-1,0,-4,3,0,0,0,-4,0,-5,0,0,0,0,2|0,0|0,0',
        equity: -0.074,
        equityLoss: 0.06999999999999999,
      },
      {
        rank: 5,
        moveText: '24/22 24/18',
        movements: [
          {
            from: 24,
            to: 18,
            die: 6,
            hit: false,
          },
          {
            from: 24,
            to: 22,
            die: 2,
            hit: false,
          },
        ],
        finalKey:
          '0,0,-1,0,0,0,5,2,2,0,-1,0,-4,4,0,0,0,-4,1,-5,0,0,1,0,0|0,0|0,0',
        equity: -0.077,
        equityLoss: 0.073,
      },
      {
        rank: 6,
        moveText: '13/11 13/7',
        movements: [
          {
            from: 13,
            to: 7,
            die: 6,
            hit: false,
          },
          {
            from: 13,
            to: 11,
            die: 2,
            hit: false,
          },
        ],
        finalKey:
          '0,0,-1,0,0,0,5,3,2,0,-1,1,-4,2,0,0,0,-4,0,-5,0,0,0,0,2|0,0|0,0',
        equity: -0.085,
        equityLoss: 0.081,
      },
      {
        rank: 7,
        moveText: '24/16',
        movements: [
          {
            from: 24,
            to: 18,
            die: 6,
            hit: false,
          },
          {
            from: 18,
            to: 16,
            die: 2,
            hit: false,
          },
        ],
        finalKey:
          '0,0,-1,0,0,0,5,2,2,0,-1,0,-4,4,0,0,1,-4,0,-5,0,0,0,0,1|0,0|0,0',
        equity: -0.095,
        equityLoss: 0.091,
      },
      {
        rank: 8,
        moveText: '24/18 6/4',
        movements: [
          {
            from: 24,
            to: 18,
            die: 6,
            hit: false,
          },
          {
            from: 6,
            to: 4,
            die: 2,
            hit: false,
          },
        ],
        finalKey:
          '0,0,-1,0,1,0,4,2,2,0,-1,0,-4,4,0,0,0,-4,1,-5,0,0,0,0,1|0,0|0,0',
        equity: -0.147,
        equityLoss: 0.143,
      },
      {
        rank: 9,
        moveText: '24/22 8/2*',
        movements: [
          {
            from: 8,
            to: 2,
            die: 6,
            hit: true,
          },
          {
            from: 24,
            to: 22,
            die: 2,
            hit: false,
          },
        ],
        finalKey:
          '0,0,1,0,0,0,5,2,1,0,-1,0,-4,4,0,0,0,-4,0,-5,0,0,1,0,1|0,1|0,0',
        equity: -0.213,
        equityLoss: 0.209,
      },
      {
        rank: 10,
        moveText: '13/11 8/2*',
        movements: [
          {
            from: 8,
            to: 2,
            die: 6,
            hit: true,
          },
          {
            from: 13,
            to: 11,
            die: 2,
            hit: false,
          },
        ],
        finalKey:
          '0,0,1,0,0,0,5,2,1,0,-1,1,-4,3,0,0,0,-4,0,-5,0,0,0,0,2|0,1|0,0',
        equity: -0.26,
        equityLoss: 0.256,
      },
      {
        rank: 11,
        moveText: '8/6 8/2*',
        movements: [
          {
            from: 8,
            to: 2,
            die: 6,
            hit: true,
          },
          {
            from: 8,
            to: 6,
            die: 2,
            hit: false,
          },
        ],
        finalKey:
          '0,0,1,0,0,0,6,2,0,0,-1,0,-4,4,0,0,0,-4,0,-5,0,0,0,0,2|0,1|0,0',
        equity: -0.275,
        equityLoss: 0.271,
      },
      {
        rank: 12,
        moveText: '13/7 8/6',
        movements: [
          {
            from: 13,
            to: 7,
            die: 6,
            hit: false,
          },
          {
            from: 8,
            to: 6,
            die: 2,
            hit: false,
          },
        ],
        finalKey:
          '0,0,-1,0,0,0,6,3,1,0,-1,0,-4,3,0,0,0,-4,0,-5,0,0,0,0,2|0,0|0,0',
        equity: -0.303,
        equityLoss: 0.299,
      },
      {
        rank: 13,
        moveText: '8/2* 6/4',
        movements: [
          {
            from: 8,
            to: 2,
            die: 6,
            hit: true,
          },
          {
            from: 6,
            to: 4,
            die: 2,
            hit: false,
          },
        ],
        finalKey:
          '0,0,1,0,1,0,4,2,1,0,-1,0,-4,4,0,0,0,-4,0,-5,0,0,0,0,2|0,1|0,0',
        equity: -0.306,
        equityLoss: 0.302,
      },
      {
        rank: 14,
        moveText: '24/22 7/1',
        movements: [
          {
            from: 7,
            to: 1,
            die: 6,
            hit: false,
          },
          {
            from: 24,
            to: 22,
            die: 2,
            hit: false,
          },
        ],
        finalKey:
          '0,1,-1,0,0,0,5,1,2,0,-1,0,-4,4,0,0,0,-4,0,-5,0,0,1,0,1|0,0|0,0',
        equity: -0.343,
        equityLoss: 0.339,
      },
      {
        rank: 15,
        moveText: '24/18 8/6',
        movements: [
          {
            from: 24,
            to: 18,
            die: 6,
            hit: false,
          },
          {
            from: 8,
            to: 6,
            die: 2,
            hit: false,
          },
        ],
        finalKey:
          '0,0,-1,0,0,0,6,2,1,0,-1,0,-4,4,0,0,0,-4,1,-5,0,0,0,0,1|0,0|0,0',
        equity: -0.343,
        equityLoss: 0.339,
      },
      {
        rank: 16,
        moveText: '7/5 7/1',
        movements: [
          {
            from: 7,
            to: 1,
            die: 6,
            hit: false,
          },
          {
            from: 7,
            to: 5,
            die: 2,
            hit: false,
          },
        ],
        finalKey:
          '0,1,-1,0,0,1,5,0,2,0,-1,0,-4,4,0,0,0,-4,0,-5,0,0,0,0,2|0,0|0,0',
        equity: -0.365,
        equityLoss: 0.361,
      },
      {
        rank: 17,
        moveText: '24/18 7/5',
        movements: [
          {
            from: 24,
            to: 18,
            die: 6,
            hit: false,
          },
          {
            from: 7,
            to: 5,
            die: 2,
            hit: false,
          },
        ],
        finalKey:
          '0,0,-1,0,0,1,5,1,2,0,-1,0,-4,4,0,0,0,-4,1,-5,0,0,0,0,1|0,0|0,0',
        equity: -0.397,
        equityLoss: 0.393,
      },
      {
        rank: 18,
        moveText: '13/11 7/1',
        movements: [
          {
            from: 7,
            to: 1,
            die: 6,
            hit: false,
          },
          {
            from: 13,
            to: 11,
            die: 2,
            hit: false,
          },
        ],
        finalKey:
          '0,1,-1,0,0,0,5,1,2,0,-1,1,-4,3,0,0,0,-4,0,-5,0,0,0,0,2|0,0|0,0',
        equity: -0.404,
        equityLoss: 0.4,
      },
      {
        rank: 19,
        moveText: '8/2* 7/5',
        movements: [
          {
            from: 8,
            to: 2,
            die: 6,
            hit: true,
          },
          {
            from: 7,
            to: 5,
            die: 2,
            hit: false,
          },
        ],
        finalKey:
          '0,0,1,0,0,1,5,1,1,0,-1,0,-4,4,0,0,0,-4,0,-5,0,0,0,0,2|0,1|0,0',
        equity: -0.409,
        equityLoss: 0.40499999999999997,
      },
      {
        rank: 20,
        moveText: '7/1 6/4',
        movements: [
          {
            from: 7,
            to: 1,
            die: 6,
            hit: false,
          },
          {
            from: 6,
            to: 4,
            die: 2,
            hit: false,
          },
        ],
        finalKey:
          '0,1,-1,0,1,0,4,1,2,0,-1,0,-4,4,0,0,0,-4,0,-5,0,0,0,0,2|0,0|0,0',
        equity: -0.431,
        equityLoss: 0.427,
      },
      {
        rank: 21,
        moveText: '8/6 7/1',
        movements: [
          {
            from: 7,
            to: 1,
            die: 6,
            hit: false,
          },
          {
            from: 8,
            to: 6,
            die: 2,
            hit: false,
          },
        ],
        finalKey:
          '0,1,-1,0,0,0,6,1,1,0,-1,0,-4,4,0,0,0,-4,0,-5,0,0,0,0,2|0,0|0,0',
        equity: -0.566,
        equityLoss: 0.5619999999999999,
      },
    ],
  },
  {
    id: 'curated-002',
    kind: 'play',
    theme: 'priming',
    source: 'curated',
    board: {
      points: [
        0, 3, -1, 3, 2, 3, 2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 1, 0, -3, -2,
        -2, -3,
      ],
      bar: {
        white: 0,
        black: 0,
      },
      off: {
        white: 0,
        black: 4,
      },
    },
    hero: 'white',
    match: {
      matchLength: 0,
      score: {
        white: 0,
        black: 0,
      },
      cube: {
        value: 1,
        owner: 'center',
      },
    },
    roll: [2, 6],
    answers: [
      {
        rank: 1,
        moveText: '19/13 17/15',
        movements: [
          {
            from: 17,
            to: 15,
            die: 2,
            hit: false,
          },
          {
            from: 19,
            to: 13,
            die: 6,
            hit: false,
          },
        ],
        finalKey:
          '0,3,-1,3,2,3,2,0,0,0,0,0,0,1,0,1,0,0,0,0,0,-3,-2,-2,-3|0,0|0,4',
        equity: -0.139,
        equityLoss: 0,
      },
      {
        rank: 2,
        moveText: '19/11',
        movements: [
          {
            from: 19,
            to: 17,
            die: 2,
            hit: false,
          },
          {
            from: 17,
            to: 11,
            die: 6,
            hit: false,
          },
        ],
        finalKey:
          '0,3,-1,3,2,3,2,0,0,0,0,1,0,0,0,0,0,1,0,0,0,-3,-2,-2,-3|0,0|0,4',
        equity: -0.245,
        equityLoss: 0.10599999999999998,
      },
      {
        rank: 3,
        moveText: '19/13 5/3',
        movements: [
          {
            from: 5,
            to: 3,
            die: 2,
            hit: false,
          },
          {
            from: 19,
            to: 13,
            die: 6,
            hit: false,
          },
        ],
        finalKey:
          '0,3,-1,4,2,2,2,0,0,0,0,0,0,1,0,0,0,1,0,0,0,-3,-2,-2,-3|0,0|0,4',
        equity: -0.281,
        equityLoss: 0.14200000000000002,
      },
      {
        rank: 4,
        moveText: '19/13 3/1',
        movements: [
          {
            from: 3,
            to: 1,
            die: 2,
            hit: false,
          },
          {
            from: 19,
            to: 13,
            die: 6,
            hit: false,
          },
        ],
        finalKey:
          '0,4,-1,2,2,3,2,0,0,0,0,0,0,1,0,0,0,1,0,0,0,-3,-2,-2,-3|0,0|0,4',
        equity: -0.336,
        equityLoss: 0.197,
      },
      {
        rank: 5,
        moveText: '17/9',
        movements: [
          {
            from: 17,
            to: 15,
            die: 2,
            hit: false,
          },
          {
            from: 15,
            to: 9,
            die: 6,
            hit: false,
          },
        ],
        finalKey:
          '0,3,-1,3,2,3,2,0,0,1,0,0,0,0,0,0,0,0,0,1,0,-3,-2,-2,-3|0,0|0,4',
        equity: -0.362,
        equityLoss: 0.22299999999999998,
      },
      {
        rank: 6,
        moveText: '17/11 5/3',
        movements: [
          {
            from: 5,
            to: 3,
            die: 2,
            hit: false,
          },
          {
            from: 17,
            to: 11,
            die: 6,
            hit: false,
          },
        ],
        finalKey:
          '0,3,-1,4,2,2,2,0,0,0,0,1,0,0,0,0,0,0,0,1,0,-3,-2,-2,-3|0,0|0,4',
        equity: -0.411,
        equityLoss: 0.27199999999999996,
      },
      {
        rank: 7,
        moveText: '17/11 3/1',
        movements: [
          {
            from: 3,
            to: 1,
            die: 2,
            hit: false,
          },
          {
            from: 17,
            to: 11,
            die: 6,
            hit: false,
          },
        ],
        finalKey:
          '0,4,-1,2,2,3,2,0,0,0,0,1,0,0,0,0,0,0,0,1,0,-3,-2,-2,-3|0,0|0,4',
        equity: -0.517,
        equityLoss: 0.378,
      },
      {
        rank: 8,
        moveText: '19/13 4/2*',
        movements: [
          {
            from: 4,
            to: 2,
            die: 2,
            hit: true,
          },
          {
            from: 19,
            to: 13,
            die: 6,
            hit: false,
          },
        ],
        finalKey:
          '0,3,1,3,1,3,2,0,0,0,0,0,0,1,0,0,0,1,0,0,0,-3,-2,-2,-3|0,1|0,4',
        equity: -0.849,
        equityLoss: 0.71,
      },
      {
        rank: 9,
        moveText: '17/11 4/2*',
        movements: [
          {
            from: 4,
            to: 2,
            die: 2,
            hit: true,
          },
          {
            from: 17,
            to: 11,
            die: 6,
            hit: false,
          },
        ],
        finalKey:
          '0,3,1,3,1,3,2,0,0,0,0,1,0,0,0,0,0,0,0,1,0,-3,-2,-2,-3|0,1|0,4',
        equity: -0.992,
        equityLoss: 0.853,
      },
      {
        rank: 10,
        moveText: '19/13 6/4',
        movements: [
          {
            from: 6,
            to: 4,
            die: 2,
            hit: false,
          },
          {
            from: 19,
            to: 13,
            die: 6,
            hit: false,
          },
        ],
        finalKey:
          '0,3,-1,3,3,3,1,0,0,0,0,0,0,1,0,0,0,1,0,0,0,-3,-2,-2,-3|0,0|0,4',
        equity: -1,
        equityLoss: 0.861,
      },
      {
        rank: 11,
        moveText: '17/11 6/4',
        movements: [
          {
            from: 6,
            to: 4,
            die: 2,
            hit: false,
          },
          {
            from: 17,
            to: 11,
            die: 6,
            hit: false,
          },
        ],
        finalKey:
          '0,3,-1,3,3,3,1,0,0,0,0,1,0,0,0,0,0,0,0,1,0,-3,-2,-2,-3|0,0|0,4',
        equity: -1,
        equityLoss: 0.861,
      },
    ],
  },
  {
    id: 'curated-003',
    kind: 'play',
    theme: 'priming',
    source: 'curated',
    board: {
      points: [
        0, -2, -1, 2, 2, 2, 2, 2, 1, 0, 0, 0, -2, 0, 2, 0, 0, 0, -3, -3, 1, -2,
        -2, 1, 0,
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
      matchLength: 0,
      score: {
        white: 0,
        black: 0,
      },
      cube: {
        value: 1,
        owner: 'center',
      },
    },
    roll: [1, 2],
    answers: [
      {
        rank: 1,
        moveText: '8/5',
        movements: [
          {
            from: 8,
            to: 7,
            die: 1,
            hit: false,
          },
          {
            from: 7,
            to: 5,
            die: 2,
            hit: false,
          },
        ],
        finalKey:
          '0,-2,-1,2,2,3,2,2,0,0,0,0,-2,0,2,0,0,0,-3,-3,1,-2,-2,1,0|0,0|0,0',
        equity: 0.991,
        equityLoss: 0,
      },
      {
        rank: 2,
        moveText: '14/13 8/6',
        movements: [
          {
            from: 14,
            to: 13,
            die: 1,
            hit: false,
          },
          {
            from: 8,
            to: 6,
            die: 2,
            hit: false,
          },
        ],
        finalKey:
          '0,-2,-1,2,2,2,3,2,0,0,0,0,-2,1,1,0,0,0,-3,-3,1,-2,-2,1,0|0,0|0,0',
        equity: 0.911,
        equityLoss: 0.07999999999999996,
      },
      {
        rank: 3,
        moveText: '14/11',
        movements: [
          {
            from: 14,
            to: 13,
            die: 1,
            hit: false,
          },
          {
            from: 13,
            to: 11,
            die: 2,
            hit: false,
          },
        ],
        finalKey:
          '0,-2,-1,2,2,2,2,2,1,0,0,1,-2,0,1,0,0,0,-3,-3,1,-2,-2,1,0|0,0|0,0',
        equity: 0.776,
        equityLoss: 0.21499999999999997,
      },
      {
        rank: 4,
        moveText: '8/6 3/2*',
        movements: [
          {
            from: 3,
            to: 2,
            die: 1,
            hit: true,
          },
          {
            from: 8,
            to: 6,
            die: 2,
            hit: false,
          },
        ],
        finalKey:
          '0,-2,1,1,2,2,3,2,0,0,0,0,-2,0,2,0,0,0,-3,-3,1,-2,-2,1,0|0,1|0,0',
        equity: 0.444,
        equityLoss: 0.5469999999999999,
      },
      {
        rank: 5,
        moveText: '7/6 7/5',
        movements: [
          {
            from: 7,
            to: 6,
            die: 1,
            hit: false,
          },
          {
            from: 7,
            to: 5,
            die: 2,
            hit: false,
          },
        ],
        finalKey:
          '0,-2,-1,2,2,3,3,0,1,0,0,0,-2,0,2,0,0,0,-3,-3,1,-2,-2,1,0|0,0|0,0',
        equity: 0.29,
        equityLoss: 0.7010000000000001,
      },
      {
        rank: 6,
        moveText: '4/3 4/2*',
        movements: [
          {
            from: 4,
            to: 3,
            die: 1,
            hit: false,
          },
          {
            from: 4,
            to: 2,
            die: 2,
            hit: true,
          },
        ],
        finalKey:
          '0,-2,1,3,0,2,2,2,1,0,0,0,-2,0,2,0,0,0,-3,-3,1,-2,-2,1,0|0,1|0,0',
        equity: 0.242,
        equityLoss: 0.749,
      },
      {
        rank: 7,
        moveText: '8/7 4/2*',
        movements: [
          {
            from: 8,
            to: 7,
            die: 1,
            hit: false,
          },
          {
            from: 4,
            to: 2,
            die: 2,
            hit: true,
          },
        ],
        finalKey:
          '0,-2,1,2,1,2,2,3,0,0,0,0,-2,0,2,0,0,0,-3,-3,1,-2,-2,1,0|0,1|0,0',
        equity: 0.149,
        equityLoss: 0.842,
      },
      {
        rank: 8,
        moveText: '8/6 7/6',
        movements: [
          {
            from: 7,
            to: 6,
            die: 1,
            hit: false,
          },
          {
            from: 8,
            to: 6,
            die: 2,
            hit: false,
          },
        ],
        finalKey:
          '0,-2,-1,2,2,2,4,1,0,0,0,0,-2,0,2,0,0,0,-3,-3,1,-2,-2,1,0|0,0|0,0',
        equity: 0.102,
        equityLoss: 0.889,
      },
      {
        rank: 9,
        moveText: '7/4',
        movements: [
          {
            from: 7,
            to: 6,
            die: 1,
            hit: false,
          },
          {
            from: 6,
            to: 4,
            die: 2,
            hit: false,
          },
        ],
        finalKey:
          '0,-2,-1,2,3,2,2,1,1,0,0,0,-2,0,2,0,0,0,-3,-3,1,-2,-2,1,0|0,0|0,0',
        equity: 0.053,
        equityLoss: 0.938,
      },
      {
        rank: 10,
        moveText: '5/2*',
        movements: [
          {
            from: 5,
            to: 4,
            die: 1,
            hit: false,
          },
          {
            from: 4,
            to: 2,
            die: 2,
            hit: true,
          },
        ],
        finalKey:
          '0,-2,1,2,2,1,2,2,1,0,0,0,-2,0,2,0,0,0,-3,-3,1,-2,-2,1,0|0,1|0,0',
        equity: 0.035,
        equityLoss: 0.956,
      },
      {
        rank: 11,
        moveText: '4/2* 3/2',
        movements: [
          {
            from: 3,
            to: 2,
            die: 1,
            hit: true,
          },
          {
            from: 4,
            to: 2,
            die: 2,
            hit: false,
          },
        ],
        finalKey:
          '0,-2,2,1,1,2,2,2,1,0,0,0,-2,0,2,0,0,0,-3,-3,1,-2,-2,1,0|0,1|0,0',
        equity: 0.003,
        equityLoss: 0.988,
      },
      {
        rank: 12,
        moveText: '8/6 4/3',
        movements: [
          {
            from: 4,
            to: 3,
            die: 1,
            hit: false,
          },
          {
            from: 8,
            to: 6,
            die: 2,
            hit: false,
          },
        ],
        finalKey:
          '0,-2,-1,3,1,2,3,2,0,0,0,0,-2,0,2,0,0,0,-3,-3,1,-2,-2,1,0|0,0|0,0',
        equity: -0.029,
        equityLoss: 1.02,
      },
      {
        rank: 13,
        moveText: '8/6 5/4',
        movements: [
          {
            from: 5,
            to: 4,
            die: 1,
            hit: false,
          },
          {
            from: 8,
            to: 6,
            die: 2,
            hit: false,
          },
        ],
        finalKey:
          '0,-2,-1,2,3,1,3,2,0,0,0,0,-2,0,2,0,0,0,-3,-3,1,-2,-2,1,0|0,0|0,0',
        equity: -0.086,
        equityLoss: 1.077,
      },
      {
        rank: 14,
        moveText: '14/13 4/2*',
        movements: [
          {
            from: 14,
            to: 13,
            die: 1,
            hit: false,
          },
          {
            from: 4,
            to: 2,
            die: 2,
            hit: true,
          },
        ],
        finalKey:
          '0,-2,1,2,1,2,2,2,1,0,0,0,-2,1,1,0,0,0,-3,-3,1,-2,-2,1,0|0,1|0,0',
        equity: -0.09,
        equityLoss: 1.081,
      },
      {
        rank: 15,
        moveText: '6/5 6/4',
        movements: [
          {
            from: 6,
            to: 5,
            die: 1,
            hit: false,
          },
          {
            from: 6,
            to: 4,
            die: 2,
            hit: false,
          },
        ],
        finalKey:
          '0,-2,-1,2,3,3,0,2,1,0,0,0,-2,0,2,0,0,0,-3,-3,1,-2,-2,1,0|0,0|0,0',
        equity: -0.155,
        equityLoss: 1.146,
      },
      {
        rank: 16,
        moveText: '8/7 5/3',
        movements: [
          {
            from: 8,
            to: 7,
            die: 1,
            hit: false,
          },
          {
            from: 5,
            to: 3,
            die: 2,
            hit: false,
          },
        ],
        finalKey:
          '0,-2,-1,3,2,1,2,3,0,0,0,0,-2,0,2,0,0,0,-3,-3,1,-2,-2,1,0|0,0|0,0',
        equity: -0.157,
        equityLoss: 1.148,
      },
      {
        rank: 17,
        moveText: '7/5 3/2*',
        movements: [
          {
            from: 3,
            to: 2,
            die: 1,
            hit: true,
          },
          {
            from: 7,
            to: 5,
            die: 2,
            hit: false,
          },
        ],
        finalKey:
          '0,-2,1,1,2,3,2,1,1,0,0,0,-2,0,2,0,0,0,-3,-3,1,-2,-2,1,0|0,1|0,0',
        equity: -0.164,
        equityLoss: 1.155,
      },
      {
        rank: 18,
        moveText: '8/7 6/4',
        movements: [
          {
            from: 8,
            to: 7,
            die: 1,
            hit: false,
          },
          {
            from: 6,
            to: 4,
            die: 2,
            hit: false,
          },
        ],
        finalKey:
          '0,-2,-1,2,3,2,1,3,0,0,0,0,-2,0,2,0,0,0,-3,-3,1,-2,-2,1,0|0,0|0,0',
        equity: -0.191,
        equityLoss: 1.182,
      },
      {
        rank: 19,
        moveText: '5/4 5/3',
        movements: [
          {
            from: 5,
            to: 4,
            die: 1,
            hit: false,
          },
          {
            from: 5,
            to: 3,
            die: 2,
            hit: false,
          },
        ],
        finalKey:
          '0,-2,-1,3,3,0,2,2,1,0,0,0,-2,0,2,0,0,0,-3,-3,1,-2,-2,1,0|0,0|0,0',
        equity: -0.191,
        equityLoss: 1.182,
      },
      {
        rank: 20,
        moveText: '7/6 4/2*',
        movements: [
          {
            from: 7,
            to: 6,
            die: 1,
            hit: false,
          },
          {
            from: 4,
            to: 2,
            die: 2,
            hit: true,
          },
        ],
        finalKey:
          '0,-2,1,2,1,2,3,1,1,0,0,0,-2,0,2,0,0,0,-3,-3,1,-2,-2,1,0|0,1|0,0',
        equity: -0.248,
        equityLoss: 1.2389999999999999,
      },
      {
        rank: 21,
        moveText: '14/13 7/5',
        movements: [
          {
            from: 14,
            to: 13,
            die: 1,
            hit: false,
          },
          {
            from: 7,
            to: 5,
            die: 2,
            hit: false,
          },
        ],
        finalKey:
          '0,-2,-1,2,2,3,2,1,1,0,0,0,-2,1,1,0,0,0,-3,-3,1,-2,-2,1,0|0,0|0,0',
        equity: -0.398,
        equityLoss: 1.389,
      },
      {
        rank: 22,
        moveText: '6/3',
        movements: [
          {
            from: 6,
            to: 5,
            die: 1,
            hit: false,
          },
          {
            from: 5,
            to: 3,
            die: 2,
            hit: false,
          },
        ],
        finalKey:
          '0,-2,-1,3,2,2,1,2,1,0,0,0,-2,0,2,0,0,0,-3,-3,1,-2,-2,1,0|0,0|0,0',
        equity: -0.468,
        equityLoss: 1.459,
      },
      {
        rank: 23,
        moveText: '7/5 4/3',
        movements: [
          {
            from: 4,
            to: 3,
            die: 1,
            hit: false,
          },
          {
            from: 7,
            to: 5,
            die: 2,
            hit: false,
          },
        ],
        finalKey:
          '0,-2,-1,3,1,3,2,1,1,0,0,0,-2,0,2,0,0,0,-3,-3,1,-2,-2,1,0|0,0|0,0',
        equity: -1,
        equityLoss: 1.991,
      },
      {
        rank: 24,
        moveText: '7/5 6/5',
        movements: [
          {
            from: 6,
            to: 5,
            die: 1,
            hit: false,
          },
          {
            from: 7,
            to: 5,
            die: 2,
            hit: false,
          },
        ],
        finalKey:
          '0,-2,-1,2,2,4,1,1,1,0,0,0,-2,0,2,0,0,0,-3,-3,1,-2,-2,1,0|0,0|0,0',
        equity: -1,
        equityLoss: 1.991,
      },
      {
        rank: 25,
        moveText: '6/4 3/2*',
        movements: [
          {
            from: 3,
            to: 2,
            die: 1,
            hit: true,
          },
          {
            from: 6,
            to: 4,
            die: 2,
            hit: false,
          },
        ],
        finalKey:
          '0,-2,1,1,3,2,1,2,1,0,0,0,-2,0,2,0,0,0,-3,-3,1,-2,-2,1,0|0,1|0,0',
        equity: -1,
        equityLoss: 1.991,
      },
      {
        rank: 26,
        moveText: '7/6 5/3',
        movements: [
          {
            from: 7,
            to: 6,
            die: 1,
            hit: false,
          },
          {
            from: 5,
            to: 3,
            die: 2,
            hit: false,
          },
        ],
        finalKey:
          '0,-2,-1,3,2,1,3,1,1,0,0,0,-2,0,2,0,0,0,-3,-3,1,-2,-2,1,0|0,0|0,0',
        equity: -1,
        equityLoss: 1.991,
      },
      {
        rank: 27,
        moveText: '14/13 5/3',
        movements: [
          {
            from: 14,
            to: 13,
            die: 1,
            hit: false,
          },
          {
            from: 5,
            to: 3,
            die: 2,
            hit: false,
          },
        ],
        finalKey:
          '0,-2,-1,3,2,1,2,2,1,0,0,0,-2,1,1,0,0,0,-3,-3,1,-2,-2,1,0|0,0|0,0',
        equity: -1,
        equityLoss: 1.991,
      },
      {
        rank: 28,
        moveText: '14/13 6/4',
        movements: [
          {
            from: 14,
            to: 13,
            die: 1,
            hit: false,
          },
          {
            from: 6,
            to: 4,
            die: 2,
            hit: false,
          },
        ],
        finalKey:
          '0,-2,-1,2,3,2,1,2,1,0,0,0,-2,1,1,0,0,0,-3,-3,1,-2,-2,1,0|0,0|0,0',
        equity: -1,
        equityLoss: 1.991,
      },
      {
        rank: 29,
        moveText: '6/5 4/2*',
        movements: [
          {
            from: 6,
            to: 5,
            die: 1,
            hit: false,
          },
          {
            from: 4,
            to: 2,
            die: 2,
            hit: true,
          },
        ],
        finalKey:
          '0,-2,1,2,1,3,1,2,1,0,0,0,-2,0,2,0,0,0,-3,-3,1,-2,-2,1,0|0,1|0,0',
        equity: -1,
        equityLoss: 1.991,
      },
      {
        rank: 30,
        moveText: '5/3 4/3',
        movements: [
          {
            from: 4,
            to: 3,
            die: 1,
            hit: false,
          },
          {
            from: 5,
            to: 3,
            die: 2,
            hit: false,
          },
        ],
        finalKey:
          '0,-2,-1,4,1,1,2,2,1,0,0,0,-2,0,2,0,0,0,-3,-3,1,-2,-2,1,0|0,0|0,0',
        equity: -1.063,
        equityLoss: 2.054,
      },
      {
        rank: 31,
        moveText: '6/4 5/4',
        movements: [
          {
            from: 5,
            to: 4,
            die: 1,
            hit: false,
          },
          {
            from: 6,
            to: 4,
            die: 2,
            hit: false,
          },
        ],
        finalKey:
          '0,-2,-1,2,4,1,1,2,1,0,0,0,-2,0,2,0,0,0,-3,-3,1,-2,-2,1,0|0,0|0,0',
        equity: -1.124,
        equityLoss: 2.115,
      },
    ],
  },
  {
    id: 'curated-004',
    kind: 'play',
    theme: 'priming',
    source: 'curated',
    board: {
      points: [
        0, -1, 0, 0, -1, 0, 5, 2, 4, 0, 0, 1, -2, 2, 0, 0, 0, -2, 1, -5, -2, 0,
        0, 0, -2,
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
      matchLength: 0,
      score: {
        white: 0,
        black: 0,
      },
      cube: {
        value: 1,
        owner: 'center',
      },
    },
    roll: [3, 3],
    answers: [
      {
        rank: 1,
        moveText: '8/5(2) 7/4*(2)',
        movements: [
          {
            from: 8,
            to: 5,
            die: 3,
            hit: false,
          },
          {
            from: 8,
            to: 5,
            die: 3,
            hit: false,
          },
          {
            from: 7,
            to: 4,
            die: 3,
            hit: true,
          },
          {
            from: 7,
            to: 4,
            die: 3,
            hit: false,
          },
        ],
        finalKey:
          '0,-1,0,0,2,2,5,0,2,0,0,1,-2,2,0,0,0,-2,1,-5,-2,0,0,0,-2|0,1|0,0',
        equity: 0.834,
        equityLoss: 0,
      },
      {
        rank: 2,
        moveText: '7/4*(2) 6/3(2)',
        movements: [
          {
            from: 7,
            to: 4,
            die: 3,
            hit: true,
          },
          {
            from: 7,
            to: 4,
            die: 3,
            hit: false,
          },
          {
            from: 6,
            to: 3,
            die: 3,
            hit: false,
          },
          {
            from: 6,
            to: 3,
            die: 3,
            hit: false,
          },
        ],
        finalKey:
          '0,-1,0,2,2,0,3,0,4,0,0,1,-2,2,0,0,0,-2,1,-5,-2,0,0,0,-2|0,1|0,0',
        equity: 0.635,
        equityLoss: 0.19899999999999995,
      },
      {
        rank: 3,
        moveText: '18/15 11/5 8/5',
        movements: [
          {
            from: 18,
            to: 15,
            die: 3,
            hit: false,
          },
          {
            from: 11,
            to: 8,
            die: 3,
            hit: false,
          },
          {
            from: 8,
            to: 5,
            die: 3,
            hit: false,
          },
          {
            from: 8,
            to: 5,
            die: 3,
            hit: false,
          },
        ],
        finalKey:
          '0,-1,0,0,-1,2,5,2,3,0,0,0,-2,2,0,1,0,-2,0,-5,-2,0,0,0,-2|0,0|0,0',
        equity: 0.599,
        equityLoss: 0.235,
      },
      {
        rank: 4,
        moveText: '8/5(2) 6/3(2)',
        movements: [
          {
            from: 8,
            to: 5,
            die: 3,
            hit: false,
          },
          {
            from: 8,
            to: 5,
            die: 3,
            hit: false,
          },
          {
            from: 6,
            to: 3,
            die: 3,
            hit: false,
          },
          {
            from: 6,
            to: 3,
            die: 3,
            hit: false,
          },
        ],
        finalKey:
          '0,-1,0,2,-1,2,3,2,2,0,0,1,-2,2,0,0,0,-2,1,-5,-2,0,0,0,-2|0,0|0,0',
        equity: 0.573,
        equityLoss: 0.261,
      },
      {
        rank: 5,
        moveText: '7/4*/1*(2)',
        movements: [
          {
            from: 7,
            to: 4,
            die: 3,
            hit: true,
          },
          {
            from: 7,
            to: 4,
            die: 3,
            hit: false,
          },
          {
            from: 4,
            to: 1,
            die: 3,
            hit: true,
          },
          {
            from: 4,
            to: 1,
            die: 3,
            hit: false,
          },
        ],
        finalKey:
          '0,2,0,0,0,0,5,0,4,0,0,1,-2,2,0,0,0,-2,1,-5,-2,0,0,0,-2|0,2|0,0',
        equity: 0.46,
        equityLoss: 0.37399999999999994,
      },
      {
        rank: 6,
        moveText: '11/5 8/5(2)',
        movements: [
          {
            from: 11,
            to: 8,
            die: 3,
            hit: false,
          },
          {
            from: 8,
            to: 5,
            die: 3,
            hit: false,
          },
          {
            from: 8,
            to: 5,
            die: 3,
            hit: false,
          },
          {
            from: 8,
            to: 5,
            die: 3,
            hit: false,
          },
        ],
        finalKey:
          '0,-1,0,0,-1,3,5,2,2,0,0,0,-2,2,0,0,0,-2,1,-5,-2,0,0,0,-2|0,0|0,0',
        equity: 0.429,
        equityLoss: 0.40499999999999997,
      },
      {
        rank: 7,
        moveText: '13/10(2) 8/5(2)',
        movements: [
          {
            from: 13,
            to: 10,
            die: 3,
            hit: false,
          },
          {
            from: 13,
            to: 10,
            die: 3,
            hit: false,
          },
          {
            from: 8,
            to: 5,
            die: 3,
            hit: false,
          },
          {
            from: 8,
            to: 5,
            die: 3,
            hit: false,
          },
        ],
        finalKey:
          '0,-1,0,0,-1,2,5,2,2,0,2,1,-2,0,0,0,0,-2,1,-5,-2,0,0,0,-2|0,0|0,0',
        equity: 0.424,
        equityLoss: 0.41,
      },
      {
        rank: 8,
        moveText: '18/15 11/8 7/4*(2)',
        movements: [
          {
            from: 18,
            to: 15,
            die: 3,
            hit: false,
          },
          {
            from: 11,
            to: 8,
            die: 3,
            hit: false,
          },
          {
            from: 7,
            to: 4,
            die: 3,
            hit: true,
          },
          {
            from: 7,
            to: 4,
            die: 3,
            hit: false,
          },
        ],
        finalKey:
          '0,-1,0,0,2,0,5,0,5,0,0,0,-2,2,0,1,0,-2,0,-5,-2,0,0,0,-2|0,1|0,0',
        equity: 0.391,
        equityLoss: 0.44299999999999995,
      },
      {
        rank: 9,
        moveText: '8/5(2) 7/4*/1*',
        movements: [
          {
            from: 8,
            to: 5,
            die: 3,
            hit: false,
          },
          {
            from: 8,
            to: 5,
            die: 3,
            hit: false,
          },
          {
            from: 7,
            to: 4,
            die: 3,
            hit: true,
          },
          {
            from: 4,
            to: 1,
            die: 3,
            hit: true,
          },
        ],
        finalKey:
          '0,1,0,0,0,2,5,1,2,0,0,1,-2,2,0,0,0,-2,1,-5,-2,0,0,0,-2|0,2|0,0',
        equity: 0.345,
        equityLoss: 0.489,
      },
      {
        rank: 10,
        moveText: '13/10(2) 7/4*(2)',
        movements: [
          {
            from: 13,
            to: 10,
            die: 3,
            hit: false,
          },
          {
            from: 13,
            to: 10,
            die: 3,
            hit: false,
          },
          {
            from: 7,
            to: 4,
            die: 3,
            hit: true,
          },
          {
            from: 7,
            to: 4,
            die: 3,
            hit: false,
          },
        ],
        finalKey:
          '0,-1,0,0,2,0,5,0,4,0,2,1,-2,0,0,0,0,-2,1,-5,-2,0,0,0,-2|0,1|0,0',
        equity: 0.227,
        equityLoss: 0.607,
      },
      {
        rank: 11,
        moveText: '18/15 11/8 6/3(2)',
        movements: [
          {
            from: 18,
            to: 15,
            die: 3,
            hit: false,
          },
          {
            from: 11,
            to: 8,
            die: 3,
            hit: false,
          },
          {
            from: 6,
            to: 3,
            die: 3,
            hit: false,
          },
          {
            from: 6,
            to: 3,
            die: 3,
            hit: false,
          },
        ],
        finalKey:
          '0,-1,0,2,-1,0,3,2,5,0,0,0,-2,2,0,1,0,-2,0,-5,-2,0,0,0,-2|0,0|0,0',
        equity: 0.211,
        equityLoss: 0.623,
      },
      {
        rank: 12,
        moveText: '18/15 13/10(2) 11/8',
        movements: [
          {
            from: 18,
            to: 15,
            die: 3,
            hit: false,
          },
          {
            from: 13,
            to: 10,
            die: 3,
            hit: false,
          },
          {
            from: 13,
            to: 10,
            die: 3,
            hit: false,
          },
          {
            from: 11,
            to: 8,
            die: 3,
            hit: false,
          },
        ],
        finalKey:
          '0,-1,0,0,-1,0,5,2,5,0,2,0,-2,0,0,1,0,-2,0,-5,-2,0,0,0,-2|0,0|0,0',
        equity: 0.172,
        equityLoss: 0.6619999999999999,
      },
      {
        rank: 13,
        moveText: '7/4*/1* 6/3(2)',
        movements: [
          {
            from: 7,
            to: 4,
            die: 3,
            hit: true,
          },
          {
            from: 6,
            to: 3,
            die: 3,
            hit: false,
          },
          {
            from: 6,
            to: 3,
            die: 3,
            hit: false,
          },
          {
            from: 4,
            to: 1,
            die: 3,
            hit: true,
          },
        ],
        finalKey:
          '0,1,0,2,0,0,3,1,4,0,0,1,-2,2,0,0,0,-2,1,-5,-2,0,0,0,-2|0,2|0,0',
        equity: 0.158,
        equityLoss: 0.6759999999999999,
      },
      {
        rank: 14,
        moveText: '13/10(2) 6/3(2)',
        movements: [
          {
            from: 13,
            to: 10,
            die: 3,
            hit: false,
          },
          {
            from: 13,
            to: 10,
            die: 3,
            hit: false,
          },
          {
            from: 6,
            to: 3,
            die: 3,
            hit: false,
          },
          {
            from: 6,
            to: 3,
            die: 3,
            hit: false,
          },
        ],
        finalKey:
          '0,-1,0,2,-1,0,3,2,4,0,2,1,-2,0,0,0,0,-2,1,-5,-2,0,0,0,-2|0,0|0,0',
        equity: 0.152,
        equityLoss: 0.6819999999999999,
      },
      {
        rank: 15,
        moveText: '18/15 13/10 7/4*(2)',
        movements: [
          {
            from: 18,
            to: 15,
            die: 3,
            hit: false,
          },
          {
            from: 13,
            to: 10,
            die: 3,
            hit: false,
          },
          {
            from: 7,
            to: 4,
            die: 3,
            hit: true,
          },
          {
            from: 7,
            to: 4,
            die: 3,
            hit: false,
          },
        ],
        finalKey:
          '0,-1,0,0,2,0,5,0,4,0,1,1,-2,1,0,1,0,-2,0,-5,-2,0,0,0,-2|0,1|0,0',
        equity: 0.135,
        equityLoss: 0.699,
      },
      {
        rank: 16,
        moveText: '11/5 8/5 6/3',
        movements: [
          {
            from: 11,
            to: 8,
            die: 3,
            hit: false,
          },
          {
            from: 8,
            to: 5,
            die: 3,
            hit: false,
          },
          {
            from: 8,
            to: 5,
            die: 3,
            hit: false,
          },
          {
            from: 6,
            to: 3,
            die: 3,
            hit: false,
          },
        ],
        finalKey:
          '0,-1,0,1,-1,2,4,2,3,0,0,0,-2,2,0,0,0,-2,1,-5,-2,0,0,0,-2|0,0|0,0',
        equity: 0.069,
        equityLoss: 0.7649999999999999,
      },
      {
        rank: 17,
        moveText: '18/15 8/5(2) 6/3',
        movements: [
          {
            from: 18,
            to: 15,
            die: 3,
            hit: false,
          },
          {
            from: 8,
            to: 5,
            die: 3,
            hit: false,
          },
          {
            from: 8,
            to: 5,
            die: 3,
            hit: false,
          },
          {
            from: 6,
            to: 3,
            die: 3,
            hit: false,
          },
        ],
        finalKey:
          '0,-1,0,1,-1,2,4,2,2,0,0,1,-2,2,0,1,0,-2,0,-5,-2,0,0,0,-2|0,0|0,0',
        equity: 0.041,
        equityLoss: 0.7929999999999999,
      },
      {
        rank: 18,
        moveText: '13/10 11/8 7/4*(2)',
        movements: [
          {
            from: 13,
            to: 10,
            die: 3,
            hit: false,
          },
          {
            from: 11,
            to: 8,
            die: 3,
            hit: false,
          },
          {
            from: 7,
            to: 4,
            die: 3,
            hit: true,
          },
          {
            from: 7,
            to: 4,
            die: 3,
            hit: false,
          },
        ],
        finalKey:
          '0,-1,0,0,2,0,5,0,5,0,1,0,-2,1,0,0,0,-2,1,-5,-2,0,0,0,-2|0,1|0,0',
        equity: -0.015,
        equityLoss: 0.849,
      },
      {
        rank: 19,
        moveText: '18/15 8/5 7/4*(2)',
        movements: [
          {
            from: 18,
            to: 15,
            die: 3,
            hit: false,
          },
          {
            from: 8,
            to: 5,
            die: 3,
            hit: false,
          },
          {
            from: 7,
            to: 4,
            die: 3,
            hit: true,
          },
          {
            from: 7,
            to: 4,
            die: 3,
            hit: false,
          },
        ],
        finalKey:
          '0,-1,0,0,2,1,5,0,3,0,0,1,-2,2,0,1,0,-2,0,-5,-2,0,0,0,-2|0,1|0,0',
        equity: -0.058,
        equityLoss: 0.892,
      },
      {
        rank: 20,
        moveText: '18/15 7/4*(2) 6/3',
        movements: [
          {
            from: 18,
            to: 15,
            die: 3,
            hit: false,
          },
          {
            from: 7,
            to: 4,
            die: 3,
            hit: true,
          },
          {
            from: 7,
            to: 4,
            die: 3,
            hit: false,
          },
          {
            from: 6,
            to: 3,
            die: 3,
            hit: false,
          },
        ],
        finalKey:
          '0,-1,0,1,2,0,4,0,4,0,0,1,-2,2,0,1,0,-2,0,-5,-2,0,0,0,-2|0,1|0,0',
        equity: -0.067,
        equityLoss: 0.901,
      },
      {
        rank: 21,
        moveText: '13/7 8/5(2)',
        movements: [
          {
            from: 13,
            to: 10,
            die: 3,
            hit: false,
          },
          {
            from: 10,
            to: 7,
            die: 3,
            hit: false,
          },
          {
            from: 8,
            to: 5,
            die: 3,
            hit: false,
          },
          {
            from: 8,
            to: 5,
            die: 3,
            hit: false,
          },
        ],
        finalKey:
          '0,-1,0,0,-1,2,5,3,2,0,0,1,-2,1,0,0,0,-2,1,-5,-2,0,0,0,-2|0,0|0,0',
        equity: -0.07,
        equityLoss: 0.9039999999999999,
      },
      {
        rank: 22,
        moveText: '13/4*/1*',
        movements: [
          {
            from: 13,
            to: 10,
            die: 3,
            hit: false,
          },
          {
            from: 10,
            to: 7,
            die: 3,
            hit: false,
          },
          {
            from: 7,
            to: 4,
            die: 3,
            hit: true,
          },
          {
            from: 4,
            to: 1,
            die: 3,
            hit: true,
          },
        ],
        finalKey:
          '0,1,0,0,0,0,5,2,4,0,0,1,-2,1,0,0,0,-2,1,-5,-2,0,0,0,-2|0,2|0,0',
        equity: -0.071,
        equityLoss: 0.9049999999999999,
      },
      {
        rank: 23,
        moveText: '8/5(4)',
        movements: [
          {
            from: 8,
            to: 5,
            die: 3,
            hit: false,
          },
          {
            from: 8,
            to: 5,
            die: 3,
            hit: false,
          },
          {
            from: 8,
            to: 5,
            die: 3,
            hit: false,
          },
          {
            from: 8,
            to: 5,
            die: 3,
            hit: false,
          },
        ],
        finalKey:
          '0,-1,0,0,-1,4,5,2,0,0,0,1,-2,2,0,0,0,-2,1,-5,-2,0,0,0,-2|0,0|0,0',
        equity: -0.076,
        equityLoss: 0.9099999999999999,
      },
      {
        rank: 24,
        moveText: '13/10 11/5 8/5',
        movements: [
          {
            from: 13,
            to: 10,
            die: 3,
            hit: false,
          },
          {
            from: 11,
            to: 8,
            die: 3,
            hit: false,
          },
          {
            from: 8,
            to: 5,
            die: 3,
            hit: false,
          },
          {
            from: 8,
            to: 5,
            die: 3,
            hit: false,
          },
        ],
        finalKey:
          '0,-1,0,0,-1,2,5,2,3,0,1,0,-2,1,0,0,0,-2,1,-5,-2,0,0,0,-2|0,0|0,0',
        equity: -0.078,
        equityLoss: 0.9119999999999999,
      },
      {
        rank: 25,
        moveText: '18/15 11/8 7/4*/1*',
        movements: [
          {
            from: 18,
            to: 15,
            die: 3,
            hit: false,
          },
          {
            from: 11,
            to: 8,
            die: 3,
            hit: false,
          },
          {
            from: 7,
            to: 4,
            die: 3,
            hit: true,
          },
          {
            from: 4,
            to: 1,
            die: 3,
            hit: true,
          },
        ],
        finalKey:
          '0,1,0,0,0,0,5,1,5,0,0,0,-2,2,0,1,0,-2,0,-5,-2,0,0,0,-2|0,2|0,0',
        equity: -0.089,
        equityLoss: 0.9229999999999999,
      },
      {
        rank: 26,
        moveText: '18/15 6/3(3)',
        movements: [
          {
            from: 18,
            to: 15,
            die: 3,
            hit: false,
          },
          {
            from: 6,
            to: 3,
            die: 3,
            hit: false,
          },
          {
            from: 6,
            to: 3,
            die: 3,
            hit: false,
          },
          {
            from: 6,
            to: 3,
            die: 3,
            hit: false,
          },
        ],
        finalKey:
          '0,-1,0,3,-1,0,2,2,4,0,0,1,-2,2,0,1,0,-2,0,-5,-2,0,0,0,-2|0,0|0,0',
        equity: -0.09,
        equityLoss: 0.9239999999999999,
      },
      {
        rank: 27,
        moveText: '13/10(2) 7/4*/1*',
        movements: [
          {
            from: 13,
            to: 10,
            die: 3,
            hit: false,
          },
          {
            from: 13,
            to: 10,
            die: 3,
            hit: false,
          },
          {
            from: 7,
            to: 4,
            die: 3,
            hit: true,
          },
          {
            from: 4,
            to: 1,
            die: 3,
            hit: true,
          },
        ],
        finalKey:
          '0,1,0,0,0,0,5,1,4,0,2,1,-2,0,0,0,0,-2,1,-5,-2,0,0,0,-2|0,2|0,0',
        equity: -0.101,
        equityLoss: 0.9349999999999999,
      },
      {
        rank: 28,
        moveText: '11/8 6/3(3)',
        movements: [
          {
            from: 11,
            to: 8,
            die: 3,
            hit: false,
          },
          {
            from: 6,
            to: 3,
            die: 3,
            hit: false,
          },
          {
            from: 6,
            to: 3,
            die: 3,
            hit: false,
          },
          {
            from: 6,
            to: 3,
            die: 3,
            hit: false,
          },
        ],
        finalKey:
          '0,-1,0,3,-1,0,2,2,5,0,0,0,-2,2,0,0,0,-2,1,-5,-2,0,0,0,-2|0,0|0,0',
        equity: -0.152,
        equityLoss: 0.986,
      },
      {
        rank: 29,
        moveText: '11/8 7/4*(2) 6/3',
        movements: [
          {
            from: 11,
            to: 8,
            die: 3,
            hit: false,
          },
          {
            from: 7,
            to: 4,
            die: 3,
            hit: true,
          },
          {
            from: 7,
            to: 4,
            die: 3,
            hit: false,
          },
          {
            from: 6,
            to: 3,
            die: 3,
            hit: false,
          },
        ],
        finalKey:
          '0,-1,0,1,2,0,4,0,5,0,0,0,-2,2,0,0,0,-2,1,-5,-2,0,0,0,-2|0,1|0,0',
        equity: -0.154,
        equityLoss: 0.988,
      },
      {
        rank: 30,
        moveText: '8/2(2)',
        movements: [
          {
            from: 8,
            to: 5,
            die: 3,
            hit: false,
          },
          {
            from: 8,
            to: 5,
            die: 3,
            hit: false,
          },
          {
            from: 5,
            to: 2,
            die: 3,
            hit: false,
          },
          {
            from: 5,
            to: 2,
            die: 3,
            hit: false,
          },
        ],
        finalKey:
          '0,-1,2,0,-1,0,5,2,2,0,0,1,-2,2,0,0,0,-2,1,-5,-2,0,0,0,-2|0,0|0,0',
        equity: -0.168,
        equityLoss: 1.002,
      },
      {
        rank: 31,
        moveText: '18/15 13/10 7/4*/1*',
        movements: [
          {
            from: 18,
            to: 15,
            die: 3,
            hit: false,
          },
          {
            from: 13,
            to: 10,
            die: 3,
            hit: false,
          },
          {
            from: 7,
            to: 4,
            die: 3,
            hit: true,
          },
          {
            from: 4,
            to: 1,
            die: 3,
            hit: true,
          },
        ],
        finalKey:
          '0,1,0,0,0,0,5,1,4,0,1,1,-2,1,0,1,0,-2,0,-5,-2,0,0,0,-2|0,2|0,0',
        equity: -0.213,
        equityLoss: 1.047,
      },
      {
        rank: 32,
        moveText: '8/2 7/4*(2)',
        movements: [
          {
            from: 8,
            to: 5,
            die: 3,
            hit: false,
          },
          {
            from: 7,
            to: 4,
            die: 3,
            hit: true,
          },
          {
            from: 7,
            to: 4,
            die: 3,
            hit: false,
          },
          {
            from: 5,
            to: 2,
            die: 3,
            hit: false,
          },
        ],
        finalKey:
          '0,-1,1,0,2,0,5,0,3,0,0,1,-2,2,0,0,0,-2,1,-5,-2,0,0,0,-2|0,1|0,0',
        equity: -0.22,
        equityLoss: 1.054,
      },
      {
        rank: 33,
        moveText: '13/10(2) 11/8 6/3',
        movements: [
          {
            from: 13,
            to: 10,
            die: 3,
            hit: false,
          },
          {
            from: 13,
            to: 10,
            die: 3,
            hit: false,
          },
          {
            from: 11,
            to: 8,
            die: 3,
            hit: false,
          },
          {
            from: 6,
            to: 3,
            die: 3,
            hit: false,
          },
        ],
        finalKey:
          '0,-1,0,1,-1,0,4,2,5,0,2,0,-2,0,0,0,0,-2,1,-5,-2,0,0,0,-2|0,0|0,0',
        equity: -0.251,
        equityLoss: 1.085,
      },
      {
        rank: 34,
        moveText: '18/15 8/5(3)',
        movements: [
          {
            from: 18,
            to: 15,
            die: 3,
            hit: false,
          },
          {
            from: 8,
            to: 5,
            die: 3,
            hit: false,
          },
          {
            from: 8,
            to: 5,
            die: 3,
            hit: false,
          },
          {
            from: 8,
            to: 5,
            die: 3,
            hit: false,
          },
        ],
        finalKey:
          '0,-1,0,0,-1,3,5,2,1,0,0,1,-2,2,0,1,0,-2,0,-5,-2,0,0,0,-2|0,0|0,0',
        equity: -0.261,
        equityLoss: 1.095,
      },
      {
        rank: 35,
        moveText: '13/4* 7/4',
        movements: [
          {
            from: 13,
            to: 10,
            die: 3,
            hit: false,
          },
          {
            from: 10,
            to: 7,
            die: 3,
            hit: false,
          },
          {
            from: 7,
            to: 4,
            die: 3,
            hit: true,
          },
          {
            from: 7,
            to: 4,
            die: 3,
            hit: false,
          },
        ],
        finalKey:
          '0,-1,0,0,2,0,5,1,4,0,0,1,-2,1,0,0,0,-2,1,-5,-2,0,0,0,-2|0,1|0,0',
        equity: -0.263,
        equityLoss: 1.097,
      },
      {
        rank: 36,
        moveText: '11/5 7/4*(2)',
        movements: [
          {
            from: 11,
            to: 8,
            die: 3,
            hit: false,
          },
          {
            from: 8,
            to: 5,
            die: 3,
            hit: false,
          },
          {
            from: 7,
            to: 4,
            die: 3,
            hit: true,
          },
          {
            from: 7,
            to: 4,
            die: 3,
            hit: false,
          },
        ],
        finalKey:
          '0,-1,0,0,2,1,5,0,4,0,0,0,-2,2,0,0,0,-2,1,-5,-2,0,0,0,-2|0,1|0,0',
        equity: -0.276,
        equityLoss: 1.1099999999999999,
      },
      {
        rank: 37,
        moveText: '18/15 11/2',
        movements: [
          {
            from: 18,
            to: 15,
            die: 3,
            hit: false,
          },
          {
            from: 11,
            to: 8,
            die: 3,
            hit: false,
          },
          {
            from: 8,
            to: 5,
            die: 3,
            hit: false,
          },
          {
            from: 5,
            to: 2,
            die: 3,
            hit: false,
          },
        ],
        finalKey:
          '0,-1,1,0,-1,0,5,2,4,0,0,0,-2,2,0,1,0,-2,0,-5,-2,0,0,0,-2|0,0|0,0',
        equity: -0.278,
        equityLoss: 1.112,
      },
      {
        rank: 38,
        moveText: '11/5 8/5 7/4*',
        movements: [
          {
            from: 11,
            to: 8,
            die: 3,
            hit: false,
          },
          {
            from: 8,
            to: 5,
            die: 3,
            hit: false,
          },
          {
            from: 8,
            to: 5,
            die: 3,
            hit: false,
          },
          {
            from: 7,
            to: 4,
            die: 3,
            hit: true,
          },
        ],
        finalKey:
          '0,-1,0,0,1,2,5,1,3,0,0,0,-2,2,0,0,0,-2,1,-5,-2,0,0,0,-2|0,1|0,0',
        equity: -0.305,
        equityLoss: 1.139,
      },
      {
        rank: 39,
        moveText: '13/7(2)',
        movements: [
          {
            from: 13,
            to: 10,
            die: 3,
            hit: false,
          },
          {
            from: 13,
            to: 10,
            die: 3,
            hit: false,
          },
          {
            from: 10,
            to: 7,
            die: 3,
            hit: false,
          },
          {
            from: 10,
            to: 7,
            die: 3,
            hit: false,
          },
        ],
        finalKey:
          '0,-1,0,0,-1,0,5,4,4,0,0,1,-2,0,0,0,0,-2,1,-5,-2,0,0,0,-2|0,0|0,0',
        equity: -0.309,
        equityLoss: 1.143,
      },
      {
        rank: 40,
        moveText: '18/15 8/5(2) 7/4*',
        movements: [
          {
            from: 18,
            to: 15,
            die: 3,
            hit: false,
          },
          {
            from: 8,
            to: 5,
            die: 3,
            hit: false,
          },
          {
            from: 8,
            to: 5,
            die: 3,
            hit: false,
          },
          {
            from: 7,
            to: 4,
            die: 3,
            hit: true,
          },
        ],
        finalKey:
          '0,-1,0,0,1,2,5,1,2,0,0,1,-2,2,0,1,0,-2,0,-5,-2,0,0,0,-2|0,1|0,0',
        equity: -0.315,
        equityLoss: 1.149,
      },
      {
        rank: 41,
        moveText: '8/2 6/3(2)',
        movements: [
          {
            from: 8,
            to: 5,
            die: 3,
            hit: false,
          },
          {
            from: 6,
            to: 3,
            die: 3,
            hit: false,
          },
          {
            from: 6,
            to: 3,
            die: 3,
            hit: false,
          },
          {
            from: 5,
            to: 2,
            die: 3,
            hit: false,
          },
        ],
        finalKey:
          '0,-1,1,2,-1,0,3,2,3,0,0,1,-2,2,0,0,0,-2,1,-5,-2,0,0,0,-2|0,0|0,0',
        equity: -0.316,
        equityLoss: 1.15,
      },
      {
        rank: 42,
        moveText: '13/10 11/8 7/4*/1*',
        movements: [
          {
            from: 13,
            to: 10,
            die: 3,
            hit: false,
          },
          {
            from: 11,
            to: 8,
            die: 3,
            hit: false,
          },
          {
            from: 7,
            to: 4,
            die: 3,
            hit: true,
          },
          {
            from: 4,
            to: 1,
            die: 3,
            hit: true,
          },
        ],
        finalKey:
          '0,1,0,0,0,0,5,1,5,0,1,0,-2,1,0,0,0,-2,1,-5,-2,0,0,0,-2|0,2|0,0',
        equity: -0.318,
        equityLoss: 1.152,
      },
      {
        rank: 43,
        moveText: '18/15 13/10(2) 6/3',
        movements: [
          {
            from: 18,
            to: 15,
            die: 3,
            hit: false,
          },
          {
            from: 13,
            to: 10,
            die: 3,
            hit: false,
          },
          {
            from: 13,
            to: 10,
            die: 3,
            hit: false,
          },
          {
            from: 6,
            to: 3,
            die: 3,
            hit: false,
          },
        ],
        finalKey:
          '0,-1,0,1,-1,0,4,2,4,0,2,1,-2,0,0,1,0,-2,0,-5,-2,0,0,0,-2|0,0|0,0',
        equity: -0.324,
        equityLoss: 1.158,
      },
      {
        rank: 44,
        moveText: '18/15 13/10 8/5(2)',
        movements: [
          {
            from: 18,
            to: 15,
            die: 3,
            hit: false,
          },
          {
            from: 13,
            to: 10,
            die: 3,
            hit: false,
          },
          {
            from: 8,
            to: 5,
            die: 3,
            hit: false,
          },
          {
            from: 8,
            to: 5,
            die: 3,
            hit: false,
          },
        ],
        finalKey:
          '0,-1,0,0,-1,2,5,2,2,0,1,1,-2,1,0,1,0,-2,0,-5,-2,0,0,0,-2|0,0|0,0',
        equity: -0.326,
        equityLoss: 1.16,
      },
      {
        rank: 45,
        moveText: '18/15 13/7 11/8',
        movements: [
          {
            from: 18,
            to: 15,
            die: 3,
            hit: false,
          },
          {
            from: 13,
            to: 10,
            die: 3,
            hit: false,
          },
          {
            from: 11,
            to: 8,
            die: 3,
            hit: false,
          },
          {
            from: 10,
            to: 7,
            die: 3,
            hit: false,
          },
        ],
        finalKey:
          '0,-1,0,0,-1,0,5,3,5,0,0,0,-2,1,0,1,0,-2,0,-5,-2,0,0,0,-2|0,0|0,0',
        equity: -0.327,
        equityLoss: 1.161,
      },
      {
        rank: 46,
        moveText: '11/5 6/3(2)',
        movements: [
          {
            from: 11,
            to: 8,
            die: 3,
            hit: false,
          },
          {
            from: 8,
            to: 5,
            die: 3,
            hit: false,
          },
          {
            from: 6,
            to: 3,
            die: 3,
            hit: false,
          },
          {
            from: 6,
            to: 3,
            die: 3,
            hit: false,
          },
        ],
        finalKey:
          '0,-1,0,2,-1,1,3,2,4,0,0,0,-2,2,0,0,0,-2,1,-5,-2,0,0,0,-2|0,0|0,0',
        equity: -0.343,
        equityLoss: 1.177,
      },
      {
        rank: 47,
        moveText: '13/10(2) 8/2',
        movements: [
          {
            from: 13,
            to: 10,
            die: 3,
            hit: false,
          },
          {
            from: 13,
            to: 10,
            die: 3,
            hit: false,
          },
          {
            from: 8,
            to: 5,
            die: 3,
            hit: false,
          },
          {
            from: 5,
            to: 2,
            die: 3,
            hit: false,
          },
        ],
        finalKey:
          '0,-1,1,0,-1,0,5,2,3,0,2,1,-2,0,0,0,0,-2,1,-5,-2,0,0,0,-2|0,0|0,0',
        equity: -0.375,
        equityLoss: 1.209,
      },
      {
        rank: 48,
        moveText: '13/7 6/3(2)',
        movements: [
          {
            from: 13,
            to: 10,
            die: 3,
            hit: false,
          },
          {
            from: 10,
            to: 7,
            die: 3,
            hit: false,
          },
          {
            from: 6,
            to: 3,
            die: 3,
            hit: false,
          },
          {
            from: 6,
            to: 3,
            die: 3,
            hit: false,
          },
        ],
        finalKey:
          '0,-1,0,2,-1,0,3,3,4,0,0,1,-2,1,0,0,0,-2,1,-5,-2,0,0,0,-2|0,0|0,0',
        equity: -0.38,
        equityLoss: 1.214,
      },
      {
        rank: 49,
        moveText: '13/10(2) 11/5',
        movements: [
          {
            from: 13,
            to: 10,
            die: 3,
            hit: false,
          },
          {
            from: 13,
            to: 10,
            die: 3,
            hit: false,
          },
          {
            from: 11,
            to: 8,
            die: 3,
            hit: false,
          },
          {
            from: 8,
            to: 5,
            die: 3,
            hit: false,
          },
        ],
        finalKey:
          '0,-1,0,0,-1,1,5,2,4,0,2,0,-2,0,0,0,0,-2,1,-5,-2,0,0,0,-2|0,0|0,0',
        equity: -0.382,
        equityLoss: 1.216,
      },
      {
        rank: 50,
        moveText: '13/7 13/10 11/8',
        movements: [
          {
            from: 13,
            to: 10,
            die: 3,
            hit: false,
          },
          {
            from: 13,
            to: 10,
            die: 3,
            hit: false,
          },
          {
            from: 11,
            to: 8,
            die: 3,
            hit: false,
          },
          {
            from: 10,
            to: 7,
            die: 3,
            hit: false,
          },
        ],
        finalKey:
          '0,-1,0,0,-1,0,5,3,5,0,1,0,-2,0,0,0,0,-2,1,-5,-2,0,0,0,-2|0,0|0,0',
        equity: -0.392,
        equityLoss: 1.226,
      },
      {
        rank: 51,
        moveText: '13/10 11/8 6/3(2)',
        movements: [
          {
            from: 13,
            to: 10,
            die: 3,
            hit: false,
          },
          {
            from: 11,
            to: 8,
            die: 3,
            hit: false,
          },
          {
            from: 6,
            to: 3,
            die: 3,
            hit: false,
          },
          {
            from: 6,
            to: 3,
            die: 3,
            hit: false,
          },
        ],
        finalKey:
          '0,-1,0,2,-1,0,3,2,5,0,1,0,-2,1,0,0,0,-2,1,-5,-2,0,0,0,-2|0,0|0,0',
        equity: -0.463,
        equityLoss: 1.297,
      },
      {
        rank: 52,
        moveText: '18/15 8/5 6/3(2)',
        movements: [
          {
            from: 18,
            to: 15,
            die: 3,
            hit: false,
          },
          {
            from: 8,
            to: 5,
            die: 3,
            hit: false,
          },
          {
            from: 6,
            to: 3,
            die: 3,
            hit: false,
          },
          {
            from: 6,
            to: 3,
            die: 3,
            hit: false,
          },
        ],
        finalKey:
          '0,-1,0,2,-1,1,3,2,3,0,0,1,-2,2,0,1,0,-2,0,-5,-2,0,0,0,-2|0,0|0,0',
        equity: -0.468,
        equityLoss: 1.302,
      },
      {
        rank: 53,
        moveText: '18/15 8/5 7/4*/1*',
        movements: [
          {
            from: 18,
            to: 15,
            die: 3,
            hit: false,
          },
          {
            from: 8,
            to: 5,
            die: 3,
            hit: false,
          },
          {
            from: 7,
            to: 4,
            die: 3,
            hit: true,
          },
          {
            from: 4,
            to: 1,
            die: 3,
            hit: true,
          },
        ],
        finalKey:
          '0,1,0,0,0,1,5,1,3,0,0,1,-2,2,0,1,0,-2,0,-5,-2,0,0,0,-2|0,2|0,0',
        equity: -0.479,
        equityLoss: 1.313,
      },
      {
        rank: 54,
        moveText: '11/5 7/4*/1*',
        movements: [
          {
            from: 11,
            to: 8,
            die: 3,
            hit: false,
          },
          {
            from: 8,
            to: 5,
            die: 3,
            hit: false,
          },
          {
            from: 7,
            to: 4,
            die: 3,
            hit: true,
          },
          {
            from: 4,
            to: 1,
            die: 3,
            hit: true,
          },
        ],
        finalKey:
          '0,1,0,0,0,1,5,1,4,0,0,0,-2,2,0,0,0,-2,1,-5,-2,0,0,0,-2|0,2|0,0',
        equity: -0.504,
        equityLoss: 1.338,
      },
      {
        rank: 55,
        moveText: '11/8 7/4*/1* 7/4',
        movements: [
          {
            from: 11,
            to: 8,
            die: 3,
            hit: false,
          },
          {
            from: 7,
            to: 4,
            die: 3,
            hit: true,
          },
          {
            from: 7,
            to: 4,
            die: 3,
            hit: false,
          },
          {
            from: 4,
            to: 1,
            die: 3,
            hit: true,
          },
        ],
        finalKey:
          '0,1,0,0,1,0,5,0,5,0,0,0,-2,2,0,0,0,-2,1,-5,-2,0,0,0,-2|0,2|0,0',
        equity: -0.505,
        equityLoss: 1.339,
      },
      {
        rank: 56,
        moveText: '18/15 7/4*/1* 7/4',
        movements: [
          {
            from: 18,
            to: 15,
            die: 3,
            hit: false,
          },
          {
            from: 7,
            to: 4,
            die: 3,
            hit: true,
          },
          {
            from: 7,
            to: 4,
            die: 3,
            hit: false,
          },
          {
            from: 4,
            to: 1,
            die: 3,
            hit: true,
          },
        ],
        finalKey:
          '0,1,0,0,1,0,5,0,4,0,0,1,-2,2,0,1,0,-2,0,-5,-2,0,0,0,-2|0,2|0,0',
        equity: -0.517,
        equityLoss: 1.351,
      },
      {
        rank: 57,
        moveText: '18/15 7/4*/1* 6/3',
        movements: [
          {
            from: 18,
            to: 15,
            die: 3,
            hit: false,
          },
          {
            from: 7,
            to: 4,
            die: 3,
            hit: true,
          },
          {
            from: 6,
            to: 3,
            die: 3,
            hit: false,
          },
          {
            from: 4,
            to: 1,
            die: 3,
            hit: true,
          },
        ],
        finalKey:
          '0,1,0,1,0,0,4,1,4,0,0,1,-2,2,0,1,0,-2,0,-5,-2,0,0,0,-2|0,2|0,0',
        equity: -0.546,
        equityLoss: 1.38,
      },
      {
        rank: 58,
        moveText: '11/8 7/4*/1* 6/3',
        movements: [
          {
            from: 11,
            to: 8,
            die: 3,
            hit: false,
          },
          {
            from: 7,
            to: 4,
            die: 3,
            hit: true,
          },
          {
            from: 6,
            to: 3,
            die: 3,
            hit: false,
          },
          {
            from: 4,
            to: 1,
            die: 3,
            hit: true,
          },
        ],
        finalKey:
          '0,1,0,1,0,0,4,1,5,0,0,0,-2,2,0,0,0,-2,1,-5,-2,0,0,0,-2|0,2|0,0',
        equity: -0.57,
        equityLoss: 1.404,
      },
      {
        rank: 59,
        moveText: '18/15 13/7 13/10',
        movements: [
          {
            from: 18,
            to: 15,
            die: 3,
            hit: false,
          },
          {
            from: 13,
            to: 10,
            die: 3,
            hit: false,
          },
          {
            from: 13,
            to: 10,
            die: 3,
            hit: false,
          },
          {
            from: 10,
            to: 7,
            die: 3,
            hit: false,
          },
        ],
        finalKey:
          '0,-1,0,0,-1,0,5,3,4,0,1,1,-2,0,0,1,0,-2,0,-5,-2,0,0,0,-2|0,0|0,0',
        equity: -0.579,
        equityLoss: 1.4129999999999998,
      },
      {
        rank: 60,
        moveText: '13/10 8/5(2) 6/3',
        movements: [
          {
            from: 13,
            to: 10,
            die: 3,
            hit: false,
          },
          {
            from: 8,
            to: 5,
            die: 3,
            hit: false,
          },
          {
            from: 8,
            to: 5,
            die: 3,
            hit: false,
          },
          {
            from: 6,
            to: 3,
            die: 3,
            hit: false,
          },
        ],
        finalKey:
          '0,-1,0,1,-1,2,4,2,2,0,1,1,-2,1,0,0,0,-2,1,-5,-2,0,0,0,-2|0,0|0,0',
        equity: -0.608,
        equityLoss: 1.442,
      },
      {
        rank: 61,
        moveText: '18/15 13/4*',
        movements: [
          {
            from: 18,
            to: 15,
            die: 3,
            hit: false,
          },
          {
            from: 13,
            to: 10,
            die: 3,
            hit: false,
          },
          {
            from: 10,
            to: 7,
            die: 3,
            hit: false,
          },
          {
            from: 7,
            to: 4,
            die: 3,
            hit: true,
          },
        ],
        finalKey:
          '0,-1,0,0,1,0,5,2,4,0,0,1,-2,1,0,1,0,-2,0,-5,-2,0,0,0,-2|0,1|0,0',
        equity: -0.621,
        equityLoss: 1.455,
      },
      {
        rank: 62,
        moveText: '18/15 7/4* 6/3(2)',
        movements: [
          {
            from: 18,
            to: 15,
            die: 3,
            hit: false,
          },
          {
            from: 7,
            to: 4,
            die: 3,
            hit: true,
          },
          {
            from: 6,
            to: 3,
            die: 3,
            hit: false,
          },
          {
            from: 6,
            to: 3,
            die: 3,
            hit: false,
          },
        ],
        finalKey:
          '0,-1,0,2,1,0,3,1,4,0,0,1,-2,2,0,1,0,-2,0,-5,-2,0,0,0,-2|0,1|0,0',
        equity: -0.631,
        equityLoss: 1.4649999999999999,
      },
      {
        rank: 63,
        moveText: '11/2 6/3',
        movements: [
          {
            from: 11,
            to: 8,
            die: 3,
            hit: false,
          },
          {
            from: 8,
            to: 5,
            die: 3,
            hit: false,
          },
          {
            from: 6,
            to: 3,
            die: 3,
            hit: false,
          },
          {
            from: 5,
            to: 2,
            die: 3,
            hit: false,
          },
        ],
        finalKey:
          '0,-1,1,1,-1,0,4,2,4,0,0,0,-2,2,0,0,0,-2,1,-5,-2,0,0,0,-2|0,0|0,0',
        equity: -0.65,
        equityLoss: 1.484,
      },
      {
        rank: 64,
        moveText: '18/15 13/10(2) 8/5',
        movements: [
          {
            from: 18,
            to: 15,
            die: 3,
            hit: false,
          },
          {
            from: 13,
            to: 10,
            die: 3,
            hit: false,
          },
          {
            from: 13,
            to: 10,
            die: 3,
            hit: false,
          },
          {
            from: 8,
            to: 5,
            die: 3,
            hit: false,
          },
        ],
        finalKey:
          '0,-1,0,0,-1,1,5,2,3,0,2,1,-2,0,0,1,0,-2,0,-5,-2,0,0,0,-2|0,0|0,0',
        equity: -0.654,
        equityLoss: 1.488,
      },
      {
        rank: 65,
        moveText: '13/10 7/4*(2) 6/3',
        movements: [
          {
            from: 13,
            to: 10,
            die: 3,
            hit: false,
          },
          {
            from: 7,
            to: 4,
            die: 3,
            hit: true,
          },
          {
            from: 7,
            to: 4,
            die: 3,
            hit: false,
          },
          {
            from: 6,
            to: 3,
            die: 3,
            hit: false,
          },
        ],
        finalKey:
          '0,-1,0,1,2,0,4,0,4,0,1,1,-2,1,0,0,0,-2,1,-5,-2,0,0,0,-2|0,1|0,0',
        equity: -0.698,
        equityLoss: 1.532,
      },
      {
        rank: 66,
        moveText: '8/5 6/3(3)',
        movements: [
          {
            from: 8,
            to: 5,
            die: 3,
            hit: false,
          },
          {
            from: 6,
            to: 3,
            die: 3,
            hit: false,
          },
          {
            from: 6,
            to: 3,
            die: 3,
            hit: false,
          },
          {
            from: 6,
            to: 3,
            die: 3,
            hit: false,
          },
        ],
        finalKey:
          '0,-1,0,3,-1,1,2,2,3,0,0,1,-2,2,0,0,0,-2,1,-5,-2,0,0,0,-2|0,0|0,0',
        equity: -0.707,
        equityLoss: 1.541,
      },
      {
        rank: 67,
        moveText: '8/2 7/4*/1*',
        movements: [
          {
            from: 8,
            to: 5,
            die: 3,
            hit: false,
          },
          {
            from: 7,
            to: 4,
            die: 3,
            hit: true,
          },
          {
            from: 5,
            to: 2,
            die: 3,
            hit: false,
          },
          {
            from: 4,
            to: 1,
            die: 3,
            hit: true,
          },
        ],
        finalKey:
          '0,1,1,0,0,0,5,1,3,0,0,1,-2,2,0,0,0,-2,1,-5,-2,0,0,0,-2|0,2|0,0',
        equity: -0.721,
        equityLoss: 1.555,
      },
      {
        rank: 68,
        moveText: '18/15 13/10 6/3(2)',
        movements: [
          {
            from: 18,
            to: 15,
            die: 3,
            hit: false,
          },
          {
            from: 13,
            to: 10,
            die: 3,
            hit: false,
          },
          {
            from: 6,
            to: 3,
            die: 3,
            hit: false,
          },
          {
            from: 6,
            to: 3,
            die: 3,
            hit: false,
          },
        ],
        finalKey:
          '0,-1,0,2,-1,0,3,2,4,0,1,1,-2,1,0,1,0,-2,0,-5,-2,0,0,0,-2|0,0|0,0',
        equity: -0.724,
        equityLoss: 1.5579999999999998,
      },
      {
        rank: 69,
        moveText: '11/2 8/5',
        movements: [
          {
            from: 11,
            to: 8,
            die: 3,
            hit: false,
          },
          {
            from: 8,
            to: 5,
            die: 3,
            hit: false,
          },
          {
            from: 8,
            to: 5,
            die: 3,
            hit: false,
          },
          {
            from: 5,
            to: 2,
            die: 3,
            hit: false,
          },
        ],
        finalKey:
          '0,-1,1,0,-1,1,5,2,3,0,0,0,-2,2,0,0,0,-2,1,-5,-2,0,0,0,-2|0,0|0,0',
        equity: -0.733,
        equityLoss: 1.567,
      },
      {
        rank: 70,
        moveText: '13/10 6/3(3)',
        movements: [
          {
            from: 13,
            to: 10,
            die: 3,
            hit: false,
          },
          {
            from: 6,
            to: 3,
            die: 3,
            hit: false,
          },
          {
            from: 6,
            to: 3,
            die: 3,
            hit: false,
          },
          {
            from: 6,
            to: 3,
            die: 3,
            hit: false,
          },
        ],
        finalKey:
          '0,-1,0,3,-1,0,2,2,4,0,1,1,-2,1,0,0,0,-2,1,-5,-2,0,0,0,-2|0,0|0,0',
        equity: -0.774,
        equityLoss: 1.608,
      },
      {
        rank: 71,
        moveText: '11/8 7/4* 6/3(2)',
        movements: [
          {
            from: 11,
            to: 8,
            die: 3,
            hit: false,
          },
          {
            from: 7,
            to: 4,
            die: 3,
            hit: true,
          },
          {
            from: 6,
            to: 3,
            die: 3,
            hit: false,
          },
          {
            from: 6,
            to: 3,
            die: 3,
            hit: false,
          },
        ],
        finalKey:
          '0,-1,0,2,1,0,3,1,5,0,0,0,-2,2,0,0,0,-2,1,-5,-2,0,0,0,-2|0,1|0,0',
        equity: -0.794,
        equityLoss: 1.6280000000000001,
      },
      {
        rank: 72,
        moveText: '8/2 8/5(2)',
        movements: [
          {
            from: 8,
            to: 5,
            die: 3,
            hit: false,
          },
          {
            from: 8,
            to: 5,
            die: 3,
            hit: false,
          },
          {
            from: 8,
            to: 5,
            die: 3,
            hit: false,
          },
          {
            from: 5,
            to: 2,
            die: 3,
            hit: false,
          },
        ],
        finalKey:
          '0,-1,1,0,-1,2,5,2,1,0,0,1,-2,2,0,0,0,-2,1,-5,-2,0,0,0,-2|0,0|0,0',
        equity: -0.835,
        equityLoss: 1.669,
      },
      {
        rank: 73,
        moveText: '13/4* 11/8',
        movements: [
          {
            from: 13,
            to: 10,
            die: 3,
            hit: false,
          },
          {
            from: 11,
            to: 8,
            die: 3,
            hit: false,
          },
          {
            from: 10,
            to: 7,
            die: 3,
            hit: false,
          },
          {
            from: 7,
            to: 4,
            die: 3,
            hit: true,
          },
        ],
        finalKey:
          '0,-1,0,0,1,0,5,2,5,0,0,0,-2,1,0,0,0,-2,1,-5,-2,0,0,0,-2|0,1|0,0',
        equity: -0.844,
        equityLoss: 1.678,
      },
      {
        rank: 74,
        moveText: '13/10 8/5 7/4*/1*',
        movements: [
          {
            from: 13,
            to: 10,
            die: 3,
            hit: false,
          },
          {
            from: 8,
            to: 5,
            die: 3,
            hit: false,
          },
          {
            from: 7,
            to: 4,
            die: 3,
            hit: true,
          },
          {
            from: 4,
            to: 1,
            die: 3,
            hit: true,
          },
        ],
        finalKey:
          '0,1,0,0,0,1,5,1,3,0,1,1,-2,1,0,0,0,-2,1,-5,-2,0,0,0,-2|0,2|0,0',
        equity: -0.861,
        equityLoss: 1.6949999999999998,
      },
      {
        rank: 75,
        moveText: '8/5(3) 6/3',
        movements: [
          {
            from: 8,
            to: 5,
            die: 3,
            hit: false,
          },
          {
            from: 8,
            to: 5,
            die: 3,
            hit: false,
          },
          {
            from: 8,
            to: 5,
            die: 3,
            hit: false,
          },
          {
            from: 6,
            to: 3,
            die: 3,
            hit: false,
          },
        ],
        finalKey:
          '0,-1,0,1,-1,3,4,2,1,0,0,1,-2,2,0,0,0,-2,1,-5,-2,0,0,0,-2|0,0|0,0',
        equity: -0.882,
        equityLoss: 1.716,
      },
      {
        rank: 76,
        moveText: '13/7 11/8 6/3',
        movements: [
          {
            from: 13,
            to: 10,
            die: 3,
            hit: false,
          },
          {
            from: 11,
            to: 8,
            die: 3,
            hit: false,
          },
          {
            from: 10,
            to: 7,
            die: 3,
            hit: false,
          },
          {
            from: 6,
            to: 3,
            die: 3,
            hit: false,
          },
        ],
        finalKey:
          '0,-1,0,1,-1,0,4,3,5,0,0,0,-2,1,0,0,0,-2,1,-5,-2,0,0,0,-2|0,0|0,0',
        equity: -0.892,
        equityLoss: 1.726,
      },
      {
        rank: 77,
        moveText: '8/5 7/4*(2) 6/3',
        movements: [
          {
            from: 8,
            to: 5,
            die: 3,
            hit: false,
          },
          {
            from: 7,
            to: 4,
            die: 3,
            hit: true,
          },
          {
            from: 7,
            to: 4,
            die: 3,
            hit: false,
          },
          {
            from: 6,
            to: 3,
            die: 3,
            hit: false,
          },
        ],
        finalKey:
          '0,-1,0,1,2,1,4,0,3,0,0,1,-2,2,0,0,0,-2,1,-5,-2,0,0,0,-2|0,1|0,0',
        equity: -0.892,
        equityLoss: 1.726,
      },
      {
        rank: 78,
        moveText: '13/10 8/5 7/4*(2)',
        movements: [
          {
            from: 13,
            to: 10,
            die: 3,
            hit: false,
          },
          {
            from: 8,
            to: 5,
            die: 3,
            hit: false,
          },
          {
            from: 7,
            to: 4,
            die: 3,
            hit: true,
          },
          {
            from: 7,
            to: 4,
            die: 3,
            hit: false,
          },
        ],
        finalKey:
          '0,-1,0,0,2,1,5,0,3,0,1,1,-2,1,0,0,0,-2,1,-5,-2,0,0,0,-2|0,1|0,0',
        equity: -0.901,
        equityLoss: 1.7349999999999999,
      },
      {
        rank: 79,
        moveText: '13/7 11/5',
        movements: [
          {
            from: 13,
            to: 10,
            die: 3,
            hit: false,
          },
          {
            from: 11,
            to: 8,
            die: 3,
            hit: false,
          },
          {
            from: 10,
            to: 7,
            die: 3,
            hit: false,
          },
          {
            from: 8,
            to: 5,
            die: 3,
            hit: false,
          },
        ],
        finalKey:
          '0,-1,0,0,-1,1,5,3,4,0,0,0,-2,1,0,0,0,-2,1,-5,-2,0,0,0,-2|0,0|0,0',
        equity: -0.907,
        equityLoss: 1.741,
      },
      {
        rank: 80,
        moveText: '13/10 7/4*/1* 7/4',
        movements: [
          {
            from: 13,
            to: 10,
            die: 3,
            hit: false,
          },
          {
            from: 7,
            to: 4,
            die: 3,
            hit: true,
          },
          {
            from: 7,
            to: 4,
            die: 3,
            hit: false,
          },
          {
            from: 4,
            to: 1,
            die: 3,
            hit: true,
          },
        ],
        finalKey:
          '0,1,0,0,1,0,5,0,4,0,1,1,-2,1,0,0,0,-2,1,-5,-2,0,0,0,-2|0,2|0,0',
        equity: -0.925,
        equityLoss: 1.759,
      },
      {
        rank: 81,
        moveText: '13/10 8/5(2) 7/4*',
        movements: [
          {
            from: 13,
            to: 10,
            die: 3,
            hit: false,
          },
          {
            from: 8,
            to: 5,
            die: 3,
            hit: false,
          },
          {
            from: 8,
            to: 5,
            die: 3,
            hit: false,
          },
          {
            from: 7,
            to: 4,
            die: 3,
            hit: true,
          },
        ],
        finalKey:
          '0,-1,0,0,1,2,5,1,2,0,1,1,-2,1,0,0,0,-2,1,-5,-2,0,0,0,-2|0,1|0,0',
        equity: -0.957,
        equityLoss: 1.791,
      },
      {
        rank: 82,
        moveText: '13/7 8/2',
        movements: [
          {
            from: 13,
            to: 10,
            die: 3,
            hit: false,
          },
          {
            from: 10,
            to: 7,
            die: 3,
            hit: false,
          },
          {
            from: 8,
            to: 5,
            die: 3,
            hit: false,
          },
          {
            from: 5,
            to: 2,
            die: 3,
            hit: false,
          },
        ],
        finalKey:
          '0,-1,1,0,-1,0,5,3,3,0,0,1,-2,1,0,0,0,-2,1,-5,-2,0,0,0,-2|0,0|0,0',
        equity: -0.971,
        equityLoss: 1.805,
      },
      {
        rank: 83,
        moveText: '13/4* 13/10',
        movements: [
          {
            from: 13,
            to: 10,
            die: 3,
            hit: false,
          },
          {
            from: 13,
            to: 10,
            die: 3,
            hit: false,
          },
          {
            from: 10,
            to: 7,
            die: 3,
            hit: false,
          },
          {
            from: 7,
            to: 4,
            die: 3,
            hit: true,
          },
        ],
        finalKey:
          '0,-1,0,0,1,0,5,2,4,0,1,1,-2,0,0,0,0,-2,1,-5,-2,0,0,0,-2|0,1|0,0',
        equity: -0.972,
        equityLoss: 1.806,
      },
      {
        rank: 84,
        moveText: '13/10(2) 8/5 6/3',
        movements: [
          {
            from: 13,
            to: 10,
            die: 3,
            hit: false,
          },
          {
            from: 13,
            to: 10,
            die: 3,
            hit: false,
          },
          {
            from: 8,
            to: 5,
            die: 3,
            hit: false,
          },
          {
            from: 6,
            to: 3,
            die: 3,
            hit: false,
          },
        ],
        finalKey:
          '0,-1,0,1,-1,1,4,2,3,0,2,1,-2,0,0,0,0,-2,1,-5,-2,0,0,0,-2|0,0|0,0',
        equity: -0.987,
        equityLoss: 1.821,
      },
      {
        rank: 85,
        moveText: '13/10 7/4*/1* 6/3',
        movements: [
          {
            from: 13,
            to: 10,
            die: 3,
            hit: false,
          },
          {
            from: 7,
            to: 4,
            die: 3,
            hit: true,
          },
          {
            from: 6,
            to: 3,
            die: 3,
            hit: false,
          },
          {
            from: 4,
            to: 1,
            die: 3,
            hit: true,
          },
        ],
        finalKey:
          '0,1,0,1,0,0,4,1,4,0,1,1,-2,1,0,0,0,-2,1,-5,-2,0,0,0,-2|0,2|0,0',
        equity: -1,
        equityLoss: 1.834,
      },
      {
        rank: 86,
        moveText: '13/10 11/2',
        movements: [
          {
            from: 13,
            to: 10,
            die: 3,
            hit: false,
          },
          {
            from: 11,
            to: 8,
            die: 3,
            hit: false,
          },
          {
            from: 8,
            to: 5,
            die: 3,
            hit: false,
          },
          {
            from: 5,
            to: 2,
            die: 3,
            hit: false,
          },
        ],
        finalKey:
          '0,-1,1,0,-1,0,5,2,4,0,1,0,-2,1,0,0,0,-2,1,-5,-2,0,0,0,-2|0,0|0,0',
        equity: -1,
        equityLoss: 1.834,
      },
      {
        rank: 87,
        moveText: '13/7 13/10 6/3',
        movements: [
          {
            from: 13,
            to: 10,
            die: 3,
            hit: false,
          },
          {
            from: 13,
            to: 10,
            die: 3,
            hit: false,
          },
          {
            from: 10,
            to: 7,
            die: 3,
            hit: false,
          },
          {
            from: 6,
            to: 3,
            die: 3,
            hit: false,
          },
        ],
        finalKey:
          '0,-1,0,1,-1,0,4,3,4,0,1,1,-2,0,0,0,0,-2,1,-5,-2,0,0,0,-2|0,0|0,0',
        equity: -1,
        equityLoss: 1.834,
      },
      {
        rank: 88,
        moveText: '8/5(2) 7/4* 6/3',
        movements: [
          {
            from: 8,
            to: 5,
            die: 3,
            hit: false,
          },
          {
            from: 8,
            to: 5,
            die: 3,
            hit: false,
          },
          {
            from: 7,
            to: 4,
            die: 3,
            hit: true,
          },
          {
            from: 6,
            to: 3,
            die: 3,
            hit: false,
          },
        ],
        finalKey:
          '0,-1,0,1,1,2,4,1,2,0,0,1,-2,2,0,0,0,-2,1,-5,-2,0,0,0,-2|0,1|0,0',
        equity: -1,
        equityLoss: 1.834,
      },
      {
        rank: 89,
        moveText: '18/15 8/2 6/3',
        movements: [
          {
            from: 18,
            to: 15,
            die: 3,
            hit: false,
          },
          {
            from: 8,
            to: 5,
            die: 3,
            hit: false,
          },
          {
            from: 6,
            to: 3,
            die: 3,
            hit: false,
          },
          {
            from: 5,
            to: 2,
            die: 3,
            hit: false,
          },
        ],
        finalKey:
          '0,-1,1,1,-1,0,4,2,3,0,0,1,-2,2,0,1,0,-2,0,-5,-2,0,0,0,-2|0,0|0,0',
        equity: -1,
        equityLoss: 1.834,
      },
      {
        rank: 90,
        moveText: '8/5(3) 7/4*',
        movements: [
          {
            from: 8,
            to: 5,
            die: 3,
            hit: false,
          },
          {
            from: 8,
            to: 5,
            die: 3,
            hit: false,
          },
          {
            from: 8,
            to: 5,
            die: 3,
            hit: false,
          },
          {
            from: 7,
            to: 4,
            die: 3,
            hit: true,
          },
        ],
        finalKey:
          '0,-1,0,0,1,3,5,1,1,0,0,1,-2,2,0,0,0,-2,1,-5,-2,0,0,0,-2|0,1|0,0',
        equity: -1,
        equityLoss: 1.834,
      },
      {
        rank: 91,
        moveText: '18/15 11/5 6/3',
        movements: [
          {
            from: 18,
            to: 15,
            die: 3,
            hit: false,
          },
          {
            from: 11,
            to: 8,
            die: 3,
            hit: false,
          },
          {
            from: 8,
            to: 5,
            die: 3,
            hit: false,
          },
          {
            from: 6,
            to: 3,
            die: 3,
            hit: false,
          },
        ],
        finalKey:
          '0,-1,0,1,-1,1,4,2,4,0,0,0,-2,2,0,1,0,-2,0,-5,-2,0,0,0,-2|0,0|0,0',
        equity: -1,
        equityLoss: 1.834,
      },
      {
        rank: 92,
        moveText: '7/4* 6/3(3)',
        movements: [
          {
            from: 7,
            to: 4,
            die: 3,
            hit: true,
          },
          {
            from: 6,
            to: 3,
            die: 3,
            hit: false,
          },
          {
            from: 6,
            to: 3,
            die: 3,
            hit: false,
          },
          {
            from: 6,
            to: 3,
            die: 3,
            hit: false,
          },
        ],
        finalKey:
          '0,-1,0,3,1,0,2,1,4,0,0,1,-2,2,0,0,0,-2,1,-5,-2,0,0,0,-2|0,1|0,0',
        equity: -1,
        equityLoss: 1.834,
      },
      {
        rank: 93,
        moveText: '8/5 7/4*/1* 7/4',
        movements: [
          {
            from: 8,
            to: 5,
            die: 3,
            hit: false,
          },
          {
            from: 7,
            to: 4,
            die: 3,
            hit: true,
          },
          {
            from: 7,
            to: 4,
            die: 3,
            hit: false,
          },
          {
            from: 4,
            to: 1,
            die: 3,
            hit: true,
          },
        ],
        finalKey:
          '0,1,0,0,1,1,5,0,3,0,0,1,-2,2,0,0,0,-2,1,-5,-2,0,0,0,-2|0,2|0,0',
        equity: -1,
        equityLoss: 1.834,
      },
      {
        rank: 94,
        moveText: '18/15 13/10(2) 7/4*',
        movements: [
          {
            from: 18,
            to: 15,
            die: 3,
            hit: false,
          },
          {
            from: 13,
            to: 10,
            die: 3,
            hit: false,
          },
          {
            from: 13,
            to: 10,
            die: 3,
            hit: false,
          },
          {
            from: 7,
            to: 4,
            die: 3,
            hit: true,
          },
        ],
        finalKey:
          '0,-1,0,0,1,0,5,1,4,0,2,1,-2,0,0,1,0,-2,0,-5,-2,0,0,0,-2|0,1|0,0',
        equity: -1,
        equityLoss: 1.834,
      },
      {
        rank: 95,
        moveText: '13/10 8/5 6/3(2)',
        movements: [
          {
            from: 13,
            to: 10,
            die: 3,
            hit: false,
          },
          {
            from: 8,
            to: 5,
            die: 3,
            hit: false,
          },
          {
            from: 6,
            to: 3,
            die: 3,
            hit: false,
          },
          {
            from: 6,
            to: 3,
            die: 3,
            hit: false,
          },
        ],
        finalKey:
          '0,-1,0,2,-1,1,3,2,3,0,1,1,-2,1,0,0,0,-2,1,-5,-2,0,0,0,-2|0,0|0,0',
        equity: -1,
        equityLoss: 1.834,
      },
      {
        rank: 96,
        moveText: '13/10(2) 11/8 7/4*',
        movements: [
          {
            from: 13,
            to: 10,
            die: 3,
            hit: false,
          },
          {
            from: 13,
            to: 10,
            die: 3,
            hit: false,
          },
          {
            from: 11,
            to: 8,
            die: 3,
            hit: false,
          },
          {
            from: 7,
            to: 4,
            die: 3,
            hit: true,
          },
        ],
        finalKey:
          '0,-1,0,0,1,0,5,1,5,0,2,0,-2,0,0,0,0,-2,1,-5,-2,0,0,0,-2|0,1|0,0',
        equity: -1,
        equityLoss: 1.834,
      },
      {
        rank: 97,
        moveText: '13/10 8/5(3)',
        movements: [
          {
            from: 13,
            to: 10,
            die: 3,
            hit: false,
          },
          {
            from: 8,
            to: 5,
            die: 3,
            hit: false,
          },
          {
            from: 8,
            to: 5,
            die: 3,
            hit: false,
          },
          {
            from: 8,
            to: 5,
            die: 3,
            hit: false,
          },
        ],
        finalKey:
          '0,-1,0,0,-1,3,5,2,1,0,1,1,-2,1,0,0,0,-2,1,-5,-2,0,0,0,-2|0,0|0,0',
        equity: -1,
        equityLoss: 1.834,
      },
      {
        rank: 98,
        moveText: '18/15 13/7 6/3',
        movements: [
          {
            from: 18,
            to: 15,
            die: 3,
            hit: false,
          },
          {
            from: 13,
            to: 10,
            die: 3,
            hit: false,
          },
          {
            from: 10,
            to: 7,
            die: 3,
            hit: false,
          },
          {
            from: 6,
            to: 3,
            die: 3,
            hit: false,
          },
        ],
        finalKey:
          '0,-1,0,1,-1,0,4,3,4,0,0,1,-2,1,0,1,0,-2,0,-5,-2,0,0,0,-2|0,0|0,0',
        equity: -1,
        equityLoss: 1.834,
      },
      {
        rank: 99,
        moveText: '18/15 8/2 8/5',
        movements: [
          {
            from: 18,
            to: 15,
            die: 3,
            hit: false,
          },
          {
            from: 8,
            to: 5,
            die: 3,
            hit: false,
          },
          {
            from: 8,
            to: 5,
            die: 3,
            hit: false,
          },
          {
            from: 5,
            to: 2,
            die: 3,
            hit: false,
          },
        ],
        finalKey:
          '0,-1,1,0,-1,1,5,2,2,0,0,1,-2,2,0,1,0,-2,0,-5,-2,0,0,0,-2|0,0|0,0',
        equity: -1,
        equityLoss: 1.834,
      },
      {
        rank: 100,
        moveText: '7/4*/1* 7/4 6/3',
        movements: [
          {
            from: 7,
            to: 4,
            die: 3,
            hit: true,
          },
          {
            from: 7,
            to: 4,
            die: 3,
            hit: false,
          },
          {
            from: 6,
            to: 3,
            die: 3,
            hit: false,
          },
          {
            from: 4,
            to: 1,
            die: 3,
            hit: true,
          },
        ],
        finalKey:
          '0,1,0,1,1,0,4,0,4,0,0,1,-2,2,0,0,0,-2,1,-5,-2,0,0,0,-2|0,2|0,0',
        equity: -1,
        equityLoss: 1.834,
      },
      {
        rank: 101,
        moveText: '13/7 13/10 8/5',
        movements: [
          {
            from: 13,
            to: 10,
            die: 3,
            hit: false,
          },
          {
            from: 13,
            to: 10,
            die: 3,
            hit: false,
          },
          {
            from: 10,
            to: 7,
            die: 3,
            hit: false,
          },
          {
            from: 8,
            to: 5,
            die: 3,
            hit: false,
          },
        ],
        finalKey:
          '0,-1,0,0,-1,1,5,3,3,0,1,1,-2,0,0,0,0,-2,1,-5,-2,0,0,0,-2|0,0|0,0',
        equity: -1,
        equityLoss: 1.834,
      },
      {
        rank: 102,
        moveText: '8/5 7/4*/1* 6/3',
        movements: [
          {
            from: 8,
            to: 5,
            die: 3,
            hit: false,
          },
          {
            from: 7,
            to: 4,
            die: 3,
            hit: true,
          },
          {
            from: 6,
            to: 3,
            die: 3,
            hit: false,
          },
          {
            from: 4,
            to: 1,
            die: 3,
            hit: true,
          },
        ],
        finalKey:
          '0,1,0,1,0,1,4,1,3,0,0,1,-2,2,0,0,0,-2,1,-5,-2,0,0,0,-2|0,2|0,0',
        equity: -1,
        equityLoss: 1.834,
      },
      {
        rank: 103,
        moveText: '18/15 13/7 8/5',
        movements: [
          {
            from: 18,
            to: 15,
            die: 3,
            hit: false,
          },
          {
            from: 13,
            to: 10,
            die: 3,
            hit: false,
          },
          {
            from: 10,
            to: 7,
            die: 3,
            hit: false,
          },
          {
            from: 8,
            to: 5,
            die: 3,
            hit: false,
          },
        ],
        finalKey:
          '0,-1,0,0,-1,1,5,3,3,0,0,1,-2,1,0,1,0,-2,0,-5,-2,0,0,0,-2|0,0|0,0',
        equity: -1,
        equityLoss: 1.834,
      },
      {
        rank: 104,
        moveText: '8/5 7/4* 6/3(2)',
        movements: [
          {
            from: 8,
            to: 5,
            die: 3,
            hit: false,
          },
          {
            from: 7,
            to: 4,
            die: 3,
            hit: true,
          },
          {
            from: 6,
            to: 3,
            die: 3,
            hit: false,
          },
          {
            from: 6,
            to: 3,
            die: 3,
            hit: false,
          },
        ],
        finalKey:
          '0,-1,0,2,1,1,3,1,3,0,0,1,-2,2,0,0,0,-2,1,-5,-2,0,0,0,-2|0,1|0,0',
        equity: -1,
        equityLoss: 1.834,
      },
      {
        rank: 105,
        moveText: '18/15 13/10 8/2',
        movements: [
          {
            from: 18,
            to: 15,
            die: 3,
            hit: false,
          },
          {
            from: 13,
            to: 10,
            die: 3,
            hit: false,
          },
          {
            from: 8,
            to: 5,
            die: 3,
            hit: false,
          },
          {
            from: 5,
            to: 2,
            die: 3,
            hit: false,
          },
        ],
        finalKey:
          '0,-1,1,0,-1,0,5,2,3,0,1,1,-2,1,0,1,0,-2,0,-5,-2,0,0,0,-2|0,0|0,0',
        equity: -1.047,
        equityLoss: 1.8809999999999998,
      },
      {
        rank: 106,
        moveText: '18/15 13/10 11/8 6/3',
        movements: [
          {
            from: 18,
            to: 15,
            die: 3,
            hit: false,
          },
          {
            from: 13,
            to: 10,
            die: 3,
            hit: false,
          },
          {
            from: 11,
            to: 8,
            die: 3,
            hit: false,
          },
          {
            from: 6,
            to: 3,
            die: 3,
            hit: false,
          },
        ],
        finalKey:
          '0,-1,0,1,-1,0,4,2,5,0,1,0,-2,1,0,1,0,-2,0,-5,-2,0,0,0,-2|0,0|0,0',
        equity: -1.047,
        equityLoss: 1.8809999999999998,
      },
      {
        rank: 107,
        moveText: '8/2 8/5 6/3',
        movements: [
          {
            from: 8,
            to: 5,
            die: 3,
            hit: false,
          },
          {
            from: 8,
            to: 5,
            die: 3,
            hit: false,
          },
          {
            from: 6,
            to: 3,
            die: 3,
            hit: false,
          },
          {
            from: 5,
            to: 2,
            die: 3,
            hit: false,
          },
        ],
        finalKey:
          '0,-1,1,1,-1,1,4,2,2,0,0,1,-2,2,0,0,0,-2,1,-5,-2,0,0,0,-2|0,0|0,0',
        equity: -1.048,
        equityLoss: 1.8820000000000001,
      },
      {
        rank: 108,
        moveText: '18/15 13/10 11/5',
        movements: [
          {
            from: 18,
            to: 15,
            die: 3,
            hit: false,
          },
          {
            from: 13,
            to: 10,
            die: 3,
            hit: false,
          },
          {
            from: 11,
            to: 8,
            die: 3,
            hit: false,
          },
          {
            from: 8,
            to: 5,
            die: 3,
            hit: false,
          },
        ],
        finalKey:
          '0,-1,0,0,-1,1,5,2,4,0,1,0,-2,1,0,1,0,-2,0,-5,-2,0,0,0,-2|0,0|0,0',
        equity: -1.056,
        equityLoss: 1.8900000000000001,
      },
      {
        rank: 109,
        moveText: '13/4* 8/5',
        movements: [
          {
            from: 13,
            to: 10,
            die: 3,
            hit: false,
          },
          {
            from: 10,
            to: 7,
            die: 3,
            hit: false,
          },
          {
            from: 8,
            to: 5,
            die: 3,
            hit: false,
          },
          {
            from: 7,
            to: 4,
            die: 3,
            hit: true,
          },
        ],
        finalKey:
          '0,-1,0,0,1,1,5,2,3,0,0,1,-2,1,0,0,0,-2,1,-5,-2,0,0,0,-2|0,1|0,0',
        equity: -1.082,
        equityLoss: 1.916,
      },
      {
        rank: 110,
        moveText: '18/15 11/5 7/4*',
        movements: [
          {
            from: 18,
            to: 15,
            die: 3,
            hit: false,
          },
          {
            from: 11,
            to: 8,
            die: 3,
            hit: false,
          },
          {
            from: 8,
            to: 5,
            die: 3,
            hit: false,
          },
          {
            from: 7,
            to: 4,
            die: 3,
            hit: true,
          },
        ],
        finalKey:
          '0,-1,0,0,1,1,5,1,4,0,0,0,-2,2,0,1,0,-2,0,-5,-2,0,0,0,-2|0,1|0,0',
        equity: -1.089,
        equityLoss: 1.923,
      },
      {
        rank: 111,
        moveText: '13/7 8/5 6/3',
        movements: [
          {
            from: 13,
            to: 10,
            die: 3,
            hit: false,
          },
          {
            from: 10,
            to: 7,
            die: 3,
            hit: false,
          },
          {
            from: 8,
            to: 5,
            die: 3,
            hit: false,
          },
          {
            from: 6,
            to: 3,
            die: 3,
            hit: false,
          },
        ],
        finalKey:
          '0,-1,0,1,-1,1,4,3,3,0,0,1,-2,1,0,0,0,-2,1,-5,-2,0,0,0,-2|0,0|0,0',
        equity: -1.097,
        equityLoss: 1.931,
      },
      {
        rank: 112,
        moveText: '11/2 7/4*',
        movements: [
          {
            from: 11,
            to: 8,
            die: 3,
            hit: false,
          },
          {
            from: 8,
            to: 5,
            die: 3,
            hit: false,
          },
          {
            from: 7,
            to: 4,
            die: 3,
            hit: true,
          },
          {
            from: 5,
            to: 2,
            die: 3,
            hit: false,
          },
        ],
        finalKey:
          '0,-1,1,0,1,0,5,1,4,0,0,0,-2,2,0,0,0,-2,1,-5,-2,0,0,0,-2|0,1|0,0',
        equity: -1.098,
        equityLoss: 1.932,
      },
      {
        rank: 113,
        moveText: '13/4* 6/3',
        movements: [
          {
            from: 13,
            to: 10,
            die: 3,
            hit: false,
          },
          {
            from: 10,
            to: 7,
            die: 3,
            hit: false,
          },
          {
            from: 7,
            to: 4,
            die: 3,
            hit: true,
          },
          {
            from: 6,
            to: 3,
            die: 3,
            hit: false,
          },
        ],
        finalKey:
          '0,-1,0,1,1,0,4,2,4,0,0,1,-2,1,0,0,0,-2,1,-5,-2,0,0,0,-2|0,1|0,0',
        equity: -1.1,
        equityLoss: 1.9340000000000002,
      },
      {
        rank: 114,
        moveText: '13/10 7/4* 6/3(2)',
        movements: [
          {
            from: 13,
            to: 10,
            die: 3,
            hit: false,
          },
          {
            from: 7,
            to: 4,
            die: 3,
            hit: true,
          },
          {
            from: 6,
            to: 3,
            die: 3,
            hit: false,
          },
          {
            from: 6,
            to: 3,
            die: 3,
            hit: false,
          },
        ],
        finalKey:
          '0,-1,0,2,1,0,3,1,4,0,1,1,-2,1,0,0,0,-2,1,-5,-2,0,0,0,-2|0,1|0,0',
        equity: -1.107,
        equityLoss: 1.9409999999999998,
      },
      {
        rank: 115,
        moveText: '18/15 11/8 7/4* 6/3',
        movements: [
          {
            from: 18,
            to: 15,
            die: 3,
            hit: false,
          },
          {
            from: 11,
            to: 8,
            die: 3,
            hit: false,
          },
          {
            from: 7,
            to: 4,
            die: 3,
            hit: true,
          },
          {
            from: 6,
            to: 3,
            die: 3,
            hit: false,
          },
        ],
        finalKey:
          '0,-1,0,1,1,0,4,1,5,0,0,0,-2,2,0,1,0,-2,0,-5,-2,0,0,0,-2|0,1|0,0',
        equity: -1.112,
        equityLoss: 1.9460000000000002,
      },
      {
        rank: 116,
        moveText: '6/3(4)',
        movements: [
          {
            from: 6,
            to: 3,
            die: 3,
            hit: false,
          },
          {
            from: 6,
            to: 3,
            die: 3,
            hit: false,
          },
          {
            from: 6,
            to: 3,
            die: 3,
            hit: false,
          },
          {
            from: 6,
            to: 3,
            die: 3,
            hit: false,
          },
        ],
        finalKey:
          '0,-1,0,4,-1,0,1,2,4,0,0,1,-2,2,0,0,0,-2,1,-5,-2,0,0,0,-2|0,0|0,0',
        equity: -1.127,
        equityLoss: 1.9609999999999999,
      },
      {
        rank: 117,
        moveText: '13/10 8/2 6/3',
        movements: [
          {
            from: 13,
            to: 10,
            die: 3,
            hit: false,
          },
          {
            from: 8,
            to: 5,
            die: 3,
            hit: false,
          },
          {
            from: 6,
            to: 3,
            die: 3,
            hit: false,
          },
          {
            from: 5,
            to: 2,
            die: 3,
            hit: false,
          },
        ],
        finalKey:
          '0,-1,1,1,-1,0,4,2,3,0,1,1,-2,1,0,0,0,-2,1,-5,-2,0,0,0,-2|0,0|0,0',
        equity: -1.139,
        equityLoss: 1.9729999999999999,
      },
      {
        rank: 118,
        moveText: '13/10 11/5 6/3',
        movements: [
          {
            from: 13,
            to: 10,
            die: 3,
            hit: false,
          },
          {
            from: 11,
            to: 8,
            die: 3,
            hit: false,
          },
          {
            from: 8,
            to: 5,
            die: 3,
            hit: false,
          },
          {
            from: 6,
            to: 3,
            die: 3,
            hit: false,
          },
        ],
        finalKey:
          '0,-1,0,1,-1,1,4,2,4,0,1,0,-2,1,0,0,0,-2,1,-5,-2,0,0,0,-2|0,0|0,0',
        equity: -1.149,
        equityLoss: 1.983,
      },
      {
        rank: 119,
        moveText: '13/10(2) 8/5 7/4*',
        movements: [
          {
            from: 13,
            to: 10,
            die: 3,
            hit: false,
          },
          {
            from: 13,
            to: 10,
            die: 3,
            hit: false,
          },
          {
            from: 8,
            to: 5,
            die: 3,
            hit: false,
          },
          {
            from: 7,
            to: 4,
            die: 3,
            hit: true,
          },
        ],
        finalKey:
          '0,-1,0,0,1,1,5,1,3,0,2,1,-2,0,0,0,0,-2,1,-5,-2,0,0,0,-2|0,1|0,0',
        equity: -1.187,
        equityLoss: 2.021,
      },
      {
        rank: 120,
        moveText: '13/10 8/2 8/5',
        movements: [
          {
            from: 13,
            to: 10,
            die: 3,
            hit: false,
          },
          {
            from: 8,
            to: 5,
            die: 3,
            hit: false,
          },
          {
            from: 8,
            to: 5,
            die: 3,
            hit: false,
          },
          {
            from: 5,
            to: 2,
            die: 3,
            hit: false,
          },
        ],
        finalKey:
          '0,-1,1,0,-1,1,5,2,2,0,1,1,-2,1,0,0,0,-2,1,-5,-2,0,0,0,-2|0,0|0,0',
        equity: -1.188,
        equityLoss: 2.022,
      },
      {
        rank: 121,
        moveText: '13/10(2) 7/4* 6/3',
        movements: [
          {
            from: 13,
            to: 10,
            die: 3,
            hit: false,
          },
          {
            from: 13,
            to: 10,
            die: 3,
            hit: false,
          },
          {
            from: 7,
            to: 4,
            die: 3,
            hit: true,
          },
          {
            from: 6,
            to: 3,
            die: 3,
            hit: false,
          },
        ],
        finalKey:
          '0,-1,0,1,1,0,4,1,4,0,2,1,-2,0,0,0,0,-2,1,-5,-2,0,0,0,-2|0,1|0,0',
        equity: -1.198,
        equityLoss: 2.032,
      },
      {
        rank: 122,
        moveText: '18/15 13/10 11/8 7/4*',
        movements: [
          {
            from: 18,
            to: 15,
            die: 3,
            hit: false,
          },
          {
            from: 13,
            to: 10,
            die: 3,
            hit: false,
          },
          {
            from: 11,
            to: 8,
            die: 3,
            hit: false,
          },
          {
            from: 7,
            to: 4,
            die: 3,
            hit: true,
          },
        ],
        finalKey:
          '0,-1,0,0,1,0,5,1,5,0,1,0,-2,1,0,1,0,-2,0,-5,-2,0,0,0,-2|0,1|0,0',
        equity: -1.218,
        equityLoss: 2.052,
      },
      {
        rank: 123,
        moveText: '18/15 8/2 7/4*',
        movements: [
          {
            from: 18,
            to: 15,
            die: 3,
            hit: false,
          },
          {
            from: 8,
            to: 5,
            die: 3,
            hit: false,
          },
          {
            from: 7,
            to: 4,
            die: 3,
            hit: true,
          },
          {
            from: 5,
            to: 2,
            die: 3,
            hit: false,
          },
        ],
        finalKey:
          '0,-1,1,0,1,0,5,1,3,0,0,1,-2,2,0,1,0,-2,0,-5,-2,0,0,0,-2|0,1|0,0',
        equity: -1.227,
        equityLoss: 2.061,
      },
      {
        rank: 124,
        moveText: '11/5 7/4* 6/3',
        movements: [
          {
            from: 11,
            to: 8,
            die: 3,
            hit: false,
          },
          {
            from: 8,
            to: 5,
            die: 3,
            hit: false,
          },
          {
            from: 7,
            to: 4,
            die: 3,
            hit: true,
          },
          {
            from: 6,
            to: 3,
            die: 3,
            hit: false,
          },
        ],
        finalKey:
          '0,-1,0,1,1,1,4,1,4,0,0,0,-2,2,0,0,0,-2,1,-5,-2,0,0,0,-2|0,1|0,0',
        equity: -1.284,
        equityLoss: 2.118,
      },
      {
        rank: 125,
        moveText: '18/15 13/10 8/5 6/3',
        movements: [
          {
            from: 18,
            to: 15,
            die: 3,
            hit: false,
          },
          {
            from: 13,
            to: 10,
            die: 3,
            hit: false,
          },
          {
            from: 8,
            to: 5,
            die: 3,
            hit: false,
          },
          {
            from: 6,
            to: 3,
            die: 3,
            hit: false,
          },
        ],
        finalKey:
          '0,-1,0,1,-1,1,4,2,3,0,1,1,-2,1,0,1,0,-2,0,-5,-2,0,0,0,-2|0,0|0,0',
        equity: -1.315,
        equityLoss: 2.149,
      },
      {
        rank: 126,
        moveText: '18/15 8/5 7/4* 6/3',
        movements: [
          {
            from: 18,
            to: 15,
            die: 3,
            hit: false,
          },
          {
            from: 8,
            to: 5,
            die: 3,
            hit: false,
          },
          {
            from: 7,
            to: 4,
            die: 3,
            hit: true,
          },
          {
            from: 6,
            to: 3,
            die: 3,
            hit: false,
          },
        ],
        finalKey:
          '0,-1,0,1,1,1,4,1,3,0,0,1,-2,2,0,1,0,-2,0,-5,-2,0,0,0,-2|0,1|0,0',
        equity: -1.35,
        equityLoss: 2.184,
      },
      {
        rank: 127,
        moveText: '8/2 7/4* 6/3',
        movements: [
          {
            from: 8,
            to: 5,
            die: 3,
            hit: false,
          },
          {
            from: 7,
            to: 4,
            die: 3,
            hit: true,
          },
          {
            from: 6,
            to: 3,
            die: 3,
            hit: false,
          },
          {
            from: 5,
            to: 2,
            die: 3,
            hit: false,
          },
        ],
        finalKey:
          '0,-1,1,1,1,0,4,1,3,0,0,1,-2,2,0,0,0,-2,1,-5,-2,0,0,0,-2|0,1|0,0',
        equity: -1.354,
        equityLoss: 2.188,
      },
      {
        rank: 128,
        moveText: '8/2 8/5 7/4*',
        movements: [
          {
            from: 8,
            to: 5,
            die: 3,
            hit: false,
          },
          {
            from: 8,
            to: 5,
            die: 3,
            hit: false,
          },
          {
            from: 7,
            to: 4,
            die: 3,
            hit: true,
          },
          {
            from: 5,
            to: 2,
            die: 3,
            hit: false,
          },
        ],
        finalKey:
          '0,-1,1,0,1,1,5,1,2,0,0,1,-2,2,0,0,0,-2,1,-5,-2,0,0,0,-2|0,1|0,0',
        equity: -1.381,
        equityLoss: 2.215,
      },
      {
        rank: 129,
        moveText: '13/10 11/5 7/4*',
        movements: [
          {
            from: 13,
            to: 10,
            die: 3,
            hit: false,
          },
          {
            from: 11,
            to: 8,
            die: 3,
            hit: false,
          },
          {
            from: 8,
            to: 5,
            die: 3,
            hit: false,
          },
          {
            from: 7,
            to: 4,
            die: 3,
            hit: true,
          },
        ],
        finalKey:
          '0,-1,0,0,1,1,5,1,4,0,1,0,-2,1,0,0,0,-2,1,-5,-2,0,0,0,-2|0,1|0,0',
        equity: -1.409,
        equityLoss: 2.243,
      },
      {
        rank: 130,
        moveText: '18/15 13/10 8/5 7/4*',
        movements: [
          {
            from: 18,
            to: 15,
            die: 3,
            hit: false,
          },
          {
            from: 13,
            to: 10,
            die: 3,
            hit: false,
          },
          {
            from: 8,
            to: 5,
            die: 3,
            hit: false,
          },
          {
            from: 7,
            to: 4,
            die: 3,
            hit: true,
          },
        ],
        finalKey:
          '0,-1,0,0,1,1,5,1,3,0,1,1,-2,1,0,1,0,-2,0,-5,-2,0,0,0,-2|0,1|0,0',
        equity: -1.45,
        equityLoss: 2.284,
      },
      {
        rank: 131,
        moveText: '13/10 11/8 7/4* 6/3',
        movements: [
          {
            from: 13,
            to: 10,
            die: 3,
            hit: false,
          },
          {
            from: 11,
            to: 8,
            die: 3,
            hit: false,
          },
          {
            from: 7,
            to: 4,
            die: 3,
            hit: true,
          },
          {
            from: 6,
            to: 3,
            die: 3,
            hit: false,
          },
        ],
        finalKey:
          '0,-1,0,1,1,0,4,1,5,0,1,0,-2,1,0,0,0,-2,1,-5,-2,0,0,0,-2|0,1|0,0',
        equity: -1.452,
        equityLoss: 2.286,
      },
      {
        rank: 132,
        moveText: '13/10 8/2 7/4*',
        movements: [
          {
            from: 13,
            to: 10,
            die: 3,
            hit: false,
          },
          {
            from: 8,
            to: 5,
            die: 3,
            hit: false,
          },
          {
            from: 7,
            to: 4,
            die: 3,
            hit: true,
          },
          {
            from: 5,
            to: 2,
            die: 3,
            hit: false,
          },
        ],
        finalKey:
          '0,-1,1,0,1,0,5,1,3,0,1,1,-2,1,0,0,0,-2,1,-5,-2,0,0,0,-2|0,1|0,0',
        equity: -1.528,
        equityLoss: 2.362,
      },
      {
        rank: 133,
        moveText: '18/15 13/10 7/4* 6/3',
        movements: [
          {
            from: 18,
            to: 15,
            die: 3,
            hit: false,
          },
          {
            from: 13,
            to: 10,
            die: 3,
            hit: false,
          },
          {
            from: 7,
            to: 4,
            die: 3,
            hit: true,
          },
          {
            from: 6,
            to: 3,
            die: 3,
            hit: false,
          },
        ],
        finalKey:
          '0,-1,0,1,1,0,4,1,4,0,1,1,-2,1,0,1,0,-2,0,-5,-2,0,0,0,-2|0,1|0,0',
        equity: -1.53,
        equityLoss: 2.364,
      },
      {
        rank: 134,
        moveText: '13/10 8/5 7/4* 6/3',
        movements: [
          {
            from: 13,
            to: 10,
            die: 3,
            hit: false,
          },
          {
            from: 8,
            to: 5,
            die: 3,
            hit: false,
          },
          {
            from: 7,
            to: 4,
            die: 3,
            hit: true,
          },
          {
            from: 6,
            to: 3,
            die: 3,
            hit: false,
          },
        ],
        finalKey:
          '0,-1,0,1,1,1,4,1,3,0,1,1,-2,1,0,0,0,-2,1,-5,-2,0,0,0,-2|0,1|0,0',
        equity: -1.662,
        equityLoss: 2.496,
      },
    ],
  },
  {
    id: 'curated-005',
    kind: 'play',
    theme: 'priming',
    source: 'curated',
    board: {
      points: [
        0, 2, -2, 3, 2, 3, 2, 0, 0, 0, 2, 0, 0, 0, -1, 0, -2, -2, -2, -4, -2, 0,
        1, 0, 0,
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
      matchLength: 0,
      score: {
        white: 0,
        black: 0,
      },
      cube: {
        value: 1,
        owner: 'center',
      },
    },
    roll: [1, 1],
    answers: [
      {
        rank: 1,
        moveText: '22/21 10/9(2) 5/4',
        movements: [
          {
            from: 5,
            to: 4,
            die: 1,
            hit: false,
          },
          {
            from: 10,
            to: 9,
            die: 1,
            hit: false,
          },
          {
            from: 10,
            to: 9,
            die: 1,
            hit: false,
          },
          {
            from: 22,
            to: 21,
            die: 1,
            hit: false,
          },
        ],
        finalKey:
          '0,2,-2,3,3,2,2,0,0,2,0,0,0,0,-1,0,-2,-2,-2,-4,-2,1,0,0,0|0,0|0,0',
        equity: -0.242,
        equityLoss: 0,
      },
      {
        rank: 2,
        moveText: '22/21 10/9 5/3',
        movements: [
          {
            from: 4,
            to: 3,
            die: 1,
            hit: false,
          },
          {
            from: 5,
            to: 4,
            die: 1,
            hit: false,
          },
          {
            from: 10,
            to: 9,
            die: 1,
            hit: false,
          },
          {
            from: 22,
            to: 21,
            die: 1,
            hit: false,
          },
        ],
        finalKey:
          '0,2,-2,4,2,2,2,0,0,1,1,0,0,0,-1,0,-2,-2,-2,-4,-2,1,0,0,0|0,0|0,0',
        equity: -0.373,
        equityLoss: 0.131,
      },
      {
        rank: 3,
        moveText: '10/8(2)',
        movements: [
          {
            from: 10,
            to: 9,
            die: 1,
            hit: false,
          },
          {
            from: 9,
            to: 8,
            die: 1,
            hit: false,
          },
          {
            from: 10,
            to: 9,
            die: 1,
            hit: false,
          },
          {
            from: 9,
            to: 8,
            die: 1,
            hit: false,
          },
        ],
        finalKey:
          '0,2,-2,3,2,3,2,0,2,0,0,0,0,0,-1,0,-2,-2,-2,-4,-2,0,1,0,0|0,0|0,0',
        equity: -0.398,
        equityLoss: 0.15600000000000003,
      },
      {
        rank: 4,
        moveText: '22/21 6/4 6/5',
        movements: [
          {
            from: 5,
            to: 4,
            die: 1,
            hit: false,
          },
          {
            from: 6,
            to: 5,
            die: 1,
            hit: false,
          },
          {
            from: 6,
            to: 5,
            die: 1,
            hit: false,
          },
          {
            from: 22,
            to: 21,
            die: 1,
            hit: false,
          },
        ],
        finalKey:
          '0,2,-2,3,3,4,0,0,0,0,2,0,0,0,-1,0,-2,-2,-2,-4,-2,1,0,0,0|0,0|0,0',
        equity: -0.418,
        equityLoss: 0.176,
      },
      {
        rank: 5,
        moveText: '22/21 10/7',
        movements: [
          {
            from: 10,
            to: 9,
            die: 1,
            hit: false,
          },
          {
            from: 9,
            to: 8,
            die: 1,
            hit: false,
          },
          {
            from: 8,
            to: 7,
            die: 1,
            hit: false,
          },
          {
            from: 22,
            to: 21,
            die: 1,
            hit: false,
          },
        ],
        finalKey:
          '0,2,-2,3,2,3,2,1,0,0,1,0,0,0,-1,0,-2,-2,-2,-4,-2,1,0,0,0|0,0|0,0',
        equity: -0.429,
        equityLoss: 0.187,
      },
      {
        rank: 6,
        moveText: '22/21 10/8 10/9',
        movements: [
          {
            from: 10,
            to: 9,
            die: 1,
            hit: false,
          },
          {
            from: 9,
            to: 8,
            die: 1,
            hit: false,
          },
          {
            from: 10,
            to: 9,
            die: 1,
            hit: false,
          },
          {
            from: 22,
            to: 21,
            die: 1,
            hit: false,
          },
        ],
        finalKey:
          '0,2,-2,3,2,3,2,0,1,1,0,0,0,0,-1,0,-2,-2,-2,-4,-2,1,0,0,0|0,0|0,0',
        equity: -0.503,
        equityLoss: 0.261,
      },
      {
        rank: 7,
        moveText: '22/21 10/8 5/4',
        movements: [
          {
            from: 5,
            to: 4,
            die: 1,
            hit: false,
          },
          {
            from: 10,
            to: 9,
            die: 1,
            hit: false,
          },
          {
            from: 9,
            to: 8,
            die: 1,
            hit: false,
          },
          {
            from: 22,
            to: 21,
            die: 1,
            hit: false,
          },
        ],
        finalKey:
          '0,2,-2,3,3,2,2,0,1,0,1,0,0,0,-1,0,-2,-2,-2,-4,-2,1,0,0,0|0,0|0,0',
        equity: -0.527,
        equityLoss: 0.28500000000000003,
      },
      {
        rank: 8,
        moveText: '22/21 5/4(3)',
        movements: [
          {
            from: 5,
            to: 4,
            die: 1,
            hit: false,
          },
          {
            from: 5,
            to: 4,
            die: 1,
            hit: false,
          },
          {
            from: 5,
            to: 4,
            die: 1,
            hit: false,
          },
          {
            from: 22,
            to: 21,
            die: 1,
            hit: false,
          },
        ],
        finalKey:
          '0,2,-2,3,5,0,2,0,0,0,2,0,0,0,-1,0,-2,-2,-2,-4,-2,1,0,0,0|0,0|0,0',
        equity: -0.532,
        equityLoss: 0.29000000000000004,
      },
      {
        rank: 9,
        moveText: '10/6',
        movements: [
          {
            from: 10,
            to: 9,
            die: 1,
            hit: false,
          },
          {
            from: 9,
            to: 8,
            die: 1,
            hit: false,
          },
          {
            from: 8,
            to: 7,
            die: 1,
            hit: false,
          },
          {
            from: 7,
            to: 6,
            die: 1,
            hit: false,
          },
        ],
        finalKey:
          '0,2,-2,3,2,3,3,0,0,0,1,0,0,0,-1,0,-2,-2,-2,-4,-2,0,1,0,0|0,0|0,0',
        equity: -0.549,
        equityLoss: 0.30700000000000005,
      },
      {
        rank: 10,
        moveText: '10/9(2) 5/3',
        movements: [
          {
            from: 4,
            to: 3,
            die: 1,
            hit: false,
          },
          {
            from: 5,
            to: 4,
            die: 1,
            hit: false,
          },
          {
            from: 10,
            to: 9,
            die: 1,
            hit: false,
          },
          {
            from: 10,
            to: 9,
            die: 1,
            hit: false,
          },
        ],
        finalKey:
          '0,2,-2,4,2,2,2,0,0,2,0,0,0,0,-1,0,-2,-2,-2,-4,-2,0,1,0,0|0,0|0,0',
        equity: -0.64,
        equityLoss: 0.398,
      },
      {
        rank: 11,
        moveText: '22/21 6/4 5/4',
        movements: [
          {
            from: 5,
            to: 4,
            die: 1,
            hit: false,
          },
          {
            from: 5,
            to: 4,
            die: 1,
            hit: false,
          },
          {
            from: 6,
            to: 5,
            die: 1,
            hit: false,
          },
          {
            from: 22,
            to: 21,
            die: 1,
            hit: false,
          },
        ],
        finalKey:
          '0,2,-2,3,4,2,1,0,0,0,2,0,0,0,-1,0,-2,-2,-2,-4,-2,1,0,0,0|0,0|0,0',
        equity: -0.668,
        equityLoss: 0.42600000000000005,
      },
      {
        rank: 12,
        moveText: '22/21 6/3',
        movements: [
          {
            from: 4,
            to: 3,
            die: 1,
            hit: false,
          },
          {
            from: 5,
            to: 4,
            die: 1,
            hit: false,
          },
          {
            from: 6,
            to: 5,
            die: 1,
            hit: false,
          },
          {
            from: 22,
            to: 21,
            die: 1,
            hit: false,
          },
        ],
        finalKey:
          '0,2,-2,4,2,3,1,0,0,0,2,0,0,0,-1,0,-2,-2,-2,-4,-2,1,0,0,0|0,0|0,0',
        equity: -0.679,
        equityLoss: 0.43700000000000006,
      },
      {
        rank: 13,
        moveText: '22/21 10/9(2) 4/3',
        movements: [
          {
            from: 4,
            to: 3,
            die: 1,
            hit: false,
          },
          {
            from: 10,
            to: 9,
            die: 1,
            hit: false,
          },
          {
            from: 10,
            to: 9,
            die: 1,
            hit: false,
          },
          {
            from: 22,
            to: 21,
            die: 1,
            hit: false,
          },
        ],
        finalKey:
          '0,2,-2,4,1,3,2,0,0,2,0,0,0,0,-1,0,-2,-2,-2,-4,-2,1,0,0,0|0,0|0,0',
        equity: -0.69,
        equityLoss: 0.44799999999999995,
      },
      {
        rank: 14,
        moveText: '22/21 5/3 5/4',
        movements: [
          {
            from: 4,
            to: 3,
            die: 1,
            hit: false,
          },
          {
            from: 5,
            to: 4,
            die: 1,
            hit: false,
          },
          {
            from: 5,
            to: 4,
            die: 1,
            hit: false,
          },
          {
            from: 22,
            to: 21,
            die: 1,
            hit: false,
          },
        ],
        finalKey:
          '0,2,-2,4,3,1,2,0,0,0,2,0,0,0,-1,0,-2,-2,-2,-4,-2,1,0,0,0|0,0|0,0',
        equity: -0.694,
        equityLoss: 0.45199999999999996,
      },
      {
        rank: 15,
        moveText: '22/21 10/9(2) 6/5',
        movements: [
          {
            from: 6,
            to: 5,
            die: 1,
            hit: false,
          },
          {
            from: 10,
            to: 9,
            die: 1,
            hit: false,
          },
          {
            from: 10,
            to: 9,
            die: 1,
            hit: false,
          },
          {
            from: 22,
            to: 21,
            die: 1,
            hit: false,
          },
        ],
        finalKey:
          '0,2,-2,3,2,4,1,0,0,2,0,0,0,0,-1,0,-2,-2,-2,-4,-2,1,0,0,0|0,0|0,0',
        equity: -0.697,
        equityLoss: 0.45499999999999996,
      },
      {
        rank: 16,
        moveText: '22/21 10/9 6/5(2)',
        movements: [
          {
            from: 6,
            to: 5,
            die: 1,
            hit: false,
          },
          {
            from: 6,
            to: 5,
            die: 1,
            hit: false,
          },
          {
            from: 10,
            to: 9,
            die: 1,
            hit: false,
          },
          {
            from: 22,
            to: 21,
            die: 1,
            hit: false,
          },
        ],
        finalKey:
          '0,2,-2,3,2,5,0,0,0,1,1,0,0,0,-1,0,-2,-2,-2,-4,-2,1,0,0,0|0,0|0,0',
        equity: -0.703,
        equityLoss: 0.46099999999999997,
      },
      {
        rank: 17,
        moveText: '6/4(2)',
        movements: [
          {
            from: 5,
            to: 4,
            die: 1,
            hit: false,
          },
          {
            from: 5,
            to: 4,
            die: 1,
            hit: false,
          },
          {
            from: 6,
            to: 5,
            die: 1,
            hit: false,
          },
          {
            from: 6,
            to: 5,
            die: 1,
            hit: false,
          },
        ],
        finalKey:
          '0,2,-2,3,4,3,0,0,0,0,2,0,0,0,-1,0,-2,-2,-2,-4,-2,0,1,0,0|0,0|0,0',
        equity: -0.723,
        equityLoss: 0.481,
      },
      {
        rank: 18,
        moveText: '6/3 6/5',
        movements: [
          {
            from: 4,
            to: 3,
            die: 1,
            hit: false,
          },
          {
            from: 5,
            to: 4,
            die: 1,
            hit: false,
          },
          {
            from: 6,
            to: 5,
            die: 1,
            hit: false,
          },
          {
            from: 6,
            to: 5,
            die: 1,
            hit: false,
          },
        ],
        finalKey:
          '0,2,-2,4,2,4,0,0,0,0,2,0,0,0,-1,0,-2,-2,-2,-4,-2,0,1,0,0|0,0|0,0',
        equity: -0.796,
        equityLoss: 0.554,
      },
      {
        rank: 19,
        moveText: '22/21 10/9 4/3(2)',
        movements: [
          {
            from: 4,
            to: 3,
            die: 1,
            hit: false,
          },
          {
            from: 4,
            to: 3,
            die: 1,
            hit: false,
          },
          {
            from: 10,
            to: 9,
            die: 1,
            hit: false,
          },
          {
            from: 22,
            to: 21,
            die: 1,
            hit: false,
          },
        ],
        finalKey:
          '0,2,-2,5,0,3,2,0,0,1,1,0,0,0,-1,0,-2,-2,-2,-4,-2,1,0,0,0|0,0|0,0',
        equity: -0.796,
        equityLoss: 0.554,
      },
      {
        rank: 20,
        moveText: '10/7 10/9',
        movements: [
          {
            from: 10,
            to: 9,
            die: 1,
            hit: false,
          },
          {
            from: 9,
            to: 8,
            die: 1,
            hit: false,
          },
          {
            from: 8,
            to: 7,
            die: 1,
            hit: false,
          },
          {
            from: 10,
            to: 9,
            die: 1,
            hit: false,
          },
        ],
        finalKey:
          '0,2,-2,3,2,3,2,1,0,1,0,0,0,0,-1,0,-2,-2,-2,-4,-2,0,1,0,0|0,0|0,0',
        equity: -0.804,
        equityLoss: 0.562,
      },
      {
        rank: 21,
        moveText: '10/7 5/4',
        movements: [
          {
            from: 5,
            to: 4,
            die: 1,
            hit: false,
          },
          {
            from: 10,
            to: 9,
            die: 1,
            hit: false,
          },
          {
            from: 9,
            to: 8,
            die: 1,
            hit: false,
          },
          {
            from: 8,
            to: 7,
            die: 1,
            hit: false,
          },
        ],
        finalKey:
          '0,2,-2,3,3,2,2,1,0,0,1,0,0,0,-1,0,-2,-2,-2,-4,-2,0,1,0,0|0,0|0,0',
        equity: -0.806,
        equityLoss: 0.5640000000000001,
      },
      {
        rank: 22,
        moveText: '22/21 5/3 4/3',
        movements: [
          {
            from: 4,
            to: 3,
            die: 1,
            hit: false,
          },
          {
            from: 4,
            to: 3,
            die: 1,
            hit: false,
          },
          {
            from: 5,
            to: 4,
            die: 1,
            hit: false,
          },
          {
            from: 22,
            to: 21,
            die: 1,
            hit: false,
          },
        ],
        finalKey:
          '0,2,-2,5,1,2,2,0,0,0,2,0,0,0,-1,0,-2,-2,-2,-4,-2,1,0,0,0|0,0|0,0',
        equity: -0.817,
        equityLoss: 0.575,
      },
      {
        rank: 23,
        moveText: '10/9(2) 6/5(2)',
        movements: [
          {
            from: 6,
            to: 5,
            die: 1,
            hit: false,
          },
          {
            from: 6,
            to: 5,
            die: 1,
            hit: false,
          },
          {
            from: 10,
            to: 9,
            die: 1,
            hit: false,
          },
          {
            from: 10,
            to: 9,
            die: 1,
            hit: false,
          },
        ],
        finalKey:
          '0,2,-2,3,2,5,0,0,0,2,0,0,0,0,-1,0,-2,-2,-2,-4,-2,0,1,0,0|0,0|0,0',
        equity: -0.828,
        equityLoss: 0.586,
      },
      {
        rank: 24,
        moveText: '10/8 10/9 5/4',
        movements: [
          {
            from: 5,
            to: 4,
            die: 1,
            hit: false,
          },
          {
            from: 10,
            to: 9,
            die: 1,
            hit: false,
          },
          {
            from: 9,
            to: 8,
            die: 1,
            hit: false,
          },
          {
            from: 10,
            to: 9,
            die: 1,
            hit: false,
          },
        ],
        finalKey:
          '0,2,-2,3,3,2,2,0,1,1,0,0,0,0,-1,0,-2,-2,-2,-4,-2,0,1,0,0|0,0|0,0',
        equity: -0.831,
        equityLoss: 0.589,
      },
      {
        rank: 25,
        moveText: '10/8 5/3',
        movements: [
          {
            from: 4,
            to: 3,
            die: 1,
            hit: false,
          },
          {
            from: 5,
            to: 4,
            die: 1,
            hit: false,
          },
          {
            from: 10,
            to: 9,
            die: 1,
            hit: false,
          },
          {
            from: 9,
            to: 8,
            die: 1,
            hit: false,
          },
        ],
        finalKey:
          '0,2,-2,4,2,2,2,0,1,0,1,0,0,0,-1,0,-2,-2,-2,-4,-2,0,1,0,0|0,0|0,0',
        equity: -0.879,
        equityLoss: 0.637,
      },
      {
        rank: 26,
        moveText: '5/3 5/4(2)',
        movements: [
          {
            from: 4,
            to: 3,
            die: 1,
            hit: false,
          },
          {
            from: 5,
            to: 4,
            die: 1,
            hit: false,
          },
          {
            from: 5,
            to: 4,
            die: 1,
            hit: false,
          },
          {
            from: 5,
            to: 4,
            die: 1,
            hit: false,
          },
        ],
        finalKey:
          '0,2,-2,4,4,0,2,0,0,0,2,0,0,0,-1,0,-2,-2,-2,-4,-2,0,1,0,0|0,0|0,0',
        equity: -0.932,
        equityLoss: 0.6900000000000001,
      },
      {
        rank: 27,
        moveText: '10/9(2) 6/4',
        movements: [
          {
            from: 5,
            to: 4,
            die: 1,
            hit: false,
          },
          {
            from: 6,
            to: 5,
            die: 1,
            hit: false,
          },
          {
            from: 10,
            to: 9,
            die: 1,
            hit: false,
          },
          {
            from: 10,
            to: 9,
            die: 1,
            hit: false,
          },
        ],
        finalKey:
          '0,2,-2,3,3,3,1,0,0,2,0,0,0,0,-1,0,-2,-2,-2,-4,-2,0,1,0,0|0,0|0,0',
        equity: -0.954,
        equityLoss: 0.712,
      },
      {
        rank: 28,
        moveText: '10/9 6/4 6/5',
        movements: [
          {
            from: 5,
            to: 4,
            die: 1,
            hit: false,
          },
          {
            from: 6,
            to: 5,
            die: 1,
            hit: false,
          },
          {
            from: 6,
            to: 5,
            die: 1,
            hit: false,
          },
          {
            from: 10,
            to: 9,
            die: 1,
            hit: false,
          },
        ],
        finalKey:
          '0,2,-2,3,3,4,0,0,0,1,1,0,0,0,-1,0,-2,-2,-2,-4,-2,0,1,0,0|0,0|0,0',
        equity: -0.957,
        equityLoss: 0.715,
      },
      {
        rank: 29,
        moveText: '10/9(2) 4/3(2)',
        movements: [
          {
            from: 4,
            to: 3,
            die: 1,
            hit: false,
          },
          {
            from: 4,
            to: 3,
            die: 1,
            hit: false,
          },
          {
            from: 10,
            to: 9,
            die: 1,
            hit: false,
          },
          {
            from: 10,
            to: 9,
            die: 1,
            hit: false,
          },
        ],
        finalKey:
          '0,2,-2,5,0,3,2,0,0,2,0,0,0,0,-1,0,-2,-2,-2,-4,-2,0,1,0,0|0,0|0,0',
        equity: -0.98,
        equityLoss: 0.738,
      },
      {
        rank: 30,
        moveText: '22/21 10/9 5/4(2)',
        movements: [
          {
            from: 5,
            to: 4,
            die: 1,
            hit: false,
          },
          {
            from: 5,
            to: 4,
            die: 1,
            hit: false,
          },
          {
            from: 10,
            to: 9,
            die: 1,
            hit: false,
          },
          {
            from: 22,
            to: 21,
            die: 1,
            hit: false,
          },
        ],
        finalKey:
          '0,2,-2,3,4,1,2,0,0,1,1,0,0,0,-1,0,-2,-2,-2,-4,-2,1,0,0,0|0,0|0,0',
        equity: -0.985,
        equityLoss: 0.743,
      },
      {
        rank: 31,
        moveText: '6/3 5/4',
        movements: [
          {
            from: 4,
            to: 3,
            die: 1,
            hit: false,
          },
          {
            from: 5,
            to: 4,
            die: 1,
            hit: false,
          },
          {
            from: 5,
            to: 4,
            die: 1,
            hit: false,
          },
          {
            from: 6,
            to: 5,
            die: 1,
            hit: false,
          },
        ],
        finalKey:
          '0,2,-2,4,3,2,1,0,0,0,2,0,0,0,-1,0,-2,-2,-2,-4,-2,0,1,0,0|0,0|0,0',
        equity: -0.996,
        equityLoss: 0.754,
      },
      {
        rank: 32,
        moveText: '10/9(2) 5/4(2)',
        movements: [
          {
            from: 5,
            to: 4,
            die: 1,
            hit: false,
          },
          {
            from: 5,
            to: 4,
            die: 1,
            hit: false,
          },
          {
            from: 10,
            to: 9,
            die: 1,
            hit: false,
          },
          {
            from: 10,
            to: 9,
            die: 1,
            hit: false,
          },
        ],
        finalKey:
          '0,2,-2,3,4,1,2,0,0,2,0,0,0,0,-1,0,-2,-2,-2,-4,-2,0,1,0,0|0,0|0,0',
        equity: -1,
        equityLoss: 0.758,
      },
      {
        rank: 33,
        moveText: '22/21 10/9 6/4',
        movements: [
          {
            from: 5,
            to: 4,
            die: 1,
            hit: false,
          },
          {
            from: 6,
            to: 5,
            die: 1,
            hit: false,
          },
          {
            from: 10,
            to: 9,
            die: 1,
            hit: false,
          },
          {
            from: 22,
            to: 21,
            die: 1,
            hit: false,
          },
        ],
        finalKey:
          '0,2,-2,3,3,3,1,0,0,1,1,0,0,0,-1,0,-2,-2,-2,-4,-2,1,0,0,0|0,0|0,0',
        equity: -1,
        equityLoss: 0.758,
      },
      {
        rank: 34,
        moveText: '5/3 4/3(2)',
        movements: [
          {
            from: 4,
            to: 3,
            die: 1,
            hit: false,
          },
          {
            from: 4,
            to: 3,
            die: 1,
            hit: false,
          },
          {
            from: 5,
            to: 4,
            die: 1,
            hit: false,
          },
          {
            from: 4,
            to: 3,
            die: 1,
            hit: false,
          },
        ],
        finalKey:
          '0,2,-2,6,0,2,2,0,0,0,2,0,0,0,-1,0,-2,-2,-2,-4,-2,0,1,0,0|0,0|0,0',
        equity: -1,
        equityLoss: 0.758,
      },
      {
        rank: 35,
        moveText: '22/21 6/5(2) 4/3',
        movements: [
          {
            from: 4,
            to: 3,
            die: 1,
            hit: false,
          },
          {
            from: 6,
            to: 5,
            die: 1,
            hit: false,
          },
          {
            from: 6,
            to: 5,
            die: 1,
            hit: false,
          },
          {
            from: 22,
            to: 21,
            die: 1,
            hit: false,
          },
        ],
        finalKey:
          '0,2,-2,4,1,5,0,0,0,0,2,0,0,0,-1,0,-2,-2,-2,-4,-2,1,0,0,0|0,0|0,0',
        equity: -1,
        equityLoss: 0.758,
      },
      {
        rank: 36,
        moveText: '5/3(2)',
        movements: [
          {
            from: 4,
            to: 3,
            die: 1,
            hit: false,
          },
          {
            from: 4,
            to: 3,
            die: 1,
            hit: false,
          },
          {
            from: 5,
            to: 4,
            die: 1,
            hit: false,
          },
          {
            from: 5,
            to: 4,
            die: 1,
            hit: false,
          },
        ],
        finalKey:
          '0,2,-2,5,2,1,2,0,0,0,2,0,0,0,-1,0,-2,-2,-2,-4,-2,0,1,0,0|0,0|0,0',
        equity: -1,
        equityLoss: 0.758,
      },
      {
        rank: 37,
        moveText: '10/9 5/4(3)',
        movements: [
          {
            from: 5,
            to: 4,
            die: 1,
            hit: false,
          },
          {
            from: 5,
            to: 4,
            die: 1,
            hit: false,
          },
          {
            from: 5,
            to: 4,
            die: 1,
            hit: false,
          },
          {
            from: 10,
            to: 9,
            die: 1,
            hit: false,
          },
        ],
        finalKey:
          '0,2,-2,3,5,0,2,0,0,1,1,0,0,0,-1,0,-2,-2,-2,-4,-2,0,1,0,0|0,0|0,0',
        equity: -1,
        equityLoss: 0.758,
      },
      {
        rank: 38,
        moveText: '10/8 6/5(2)',
        movements: [
          {
            from: 6,
            to: 5,
            die: 1,
            hit: false,
          },
          {
            from: 6,
            to: 5,
            die: 1,
            hit: false,
          },
          {
            from: 10,
            to: 9,
            die: 1,
            hit: false,
          },
          {
            from: 9,
            to: 8,
            die: 1,
            hit: false,
          },
        ],
        finalKey:
          '0,2,-2,3,2,5,0,0,1,0,1,0,0,0,-1,0,-2,-2,-2,-4,-2,0,1,0,0|0,0|0,0',
        equity: -1,
        equityLoss: 0.758,
      },
      {
        rank: 39,
        moveText: '6/5(2) 4/3(2)',
        movements: [
          {
            from: 4,
            to: 3,
            die: 1,
            hit: false,
          },
          {
            from: 4,
            to: 3,
            die: 1,
            hit: false,
          },
          {
            from: 6,
            to: 5,
            die: 1,
            hit: false,
          },
          {
            from: 6,
            to: 5,
            die: 1,
            hit: false,
          },
        ],
        finalKey:
          '0,2,-2,5,0,5,0,0,0,0,2,0,0,0,-1,0,-2,-2,-2,-4,-2,0,1,0,0|0,0|0,0',
        equity: -1,
        equityLoss: 0.758,
      },
      {
        rank: 40,
        moveText: '22/21 6/5 4/3(2)',
        movements: [
          {
            from: 4,
            to: 3,
            die: 1,
            hit: false,
          },
          {
            from: 4,
            to: 3,
            die: 1,
            hit: false,
          },
          {
            from: 6,
            to: 5,
            die: 1,
            hit: false,
          },
          {
            from: 22,
            to: 21,
            die: 1,
            hit: false,
          },
        ],
        finalKey:
          '0,2,-2,5,0,4,1,0,0,0,2,0,0,0,-1,0,-2,-2,-2,-4,-2,1,0,0,0|0,0|0,0',
        equity: -1,
        equityLoss: 0.758,
      },
      {
        rank: 41,
        moveText: '22/21 10/8 4/3',
        movements: [
          {
            from: 4,
            to: 3,
            die: 1,
            hit: false,
          },
          {
            from: 10,
            to: 9,
            die: 1,
            hit: false,
          },
          {
            from: 9,
            to: 8,
            die: 1,
            hit: false,
          },
          {
            from: 22,
            to: 21,
            die: 1,
            hit: false,
          },
        ],
        finalKey:
          '0,2,-2,4,1,3,2,0,1,0,1,0,0,0,-1,0,-2,-2,-2,-4,-2,1,0,0,0|0,0|0,0',
        equity: -1,
        equityLoss: 0.758,
      },
      {
        rank: 42,
        moveText: '10/9 5/3 5/4',
        movements: [
          {
            from: 4,
            to: 3,
            die: 1,
            hit: false,
          },
          {
            from: 5,
            to: 4,
            die: 1,
            hit: false,
          },
          {
            from: 5,
            to: 4,
            die: 1,
            hit: false,
          },
          {
            from: 10,
            to: 9,
            die: 1,
            hit: false,
          },
        ],
        finalKey:
          '0,2,-2,4,3,1,2,0,0,1,1,0,0,0,-1,0,-2,-2,-2,-4,-2,0,1,0,0|0,0|0,0',
        equity: -1,
        equityLoss: 0.758,
      },
      {
        rank: 43,
        moveText: '22/21 10/8 6/5',
        movements: [
          {
            from: 6,
            to: 5,
            die: 1,
            hit: false,
          },
          {
            from: 10,
            to: 9,
            die: 1,
            hit: false,
          },
          {
            from: 9,
            to: 8,
            die: 1,
            hit: false,
          },
          {
            from: 22,
            to: 21,
            die: 1,
            hit: false,
          },
        ],
        finalKey:
          '0,2,-2,3,2,4,1,0,1,0,1,0,0,0,-1,0,-2,-2,-2,-4,-2,1,0,0,0|0,0|0,0',
        equity: -1,
        equityLoss: 0.758,
      },
      {
        rank: 44,
        moveText: '10/9 6/4 5/4',
        movements: [
          {
            from: 5,
            to: 4,
            die: 1,
            hit: false,
          },
          {
            from: 5,
            to: 4,
            die: 1,
            hit: false,
          },
          {
            from: 6,
            to: 5,
            die: 1,
            hit: false,
          },
          {
            from: 10,
            to: 9,
            die: 1,
            hit: false,
          },
        ],
        finalKey:
          '0,2,-2,3,4,2,1,0,0,1,1,0,0,0,-1,0,-2,-2,-2,-4,-2,0,1,0,0|0,0|0,0',
        equity: -1,
        equityLoss: 0.758,
      },
      {
        rank: 45,
        moveText: '10/8 4/3(2)',
        movements: [
          {
            from: 4,
            to: 3,
            die: 1,
            hit: false,
          },
          {
            from: 4,
            to: 3,
            die: 1,
            hit: false,
          },
          {
            from: 10,
            to: 9,
            die: 1,
            hit: false,
          },
          {
            from: 9,
            to: 8,
            die: 1,
            hit: false,
          },
        ],
        finalKey:
          '0,2,-2,5,0,3,2,0,1,0,1,0,0,0,-1,0,-2,-2,-2,-4,-2,0,1,0,0|0,0|0,0',
        equity: -1,
        equityLoss: 0.758,
      },
      {
        rank: 46,
        moveText: '10/9 6/3',
        movements: [
          {
            from: 4,
            to: 3,
            die: 1,
            hit: false,
          },
          {
            from: 5,
            to: 4,
            die: 1,
            hit: false,
          },
          {
            from: 6,
            to: 5,
            die: 1,
            hit: false,
          },
          {
            from: 10,
            to: 9,
            die: 1,
            hit: false,
          },
        ],
        finalKey:
          '0,2,-2,4,2,3,1,0,0,1,1,0,0,0,-1,0,-2,-2,-2,-4,-2,0,1,0,0|0,0|0,0',
        equity: -1,
        equityLoss: 0.758,
      },
      {
        rank: 47,
        moveText: '10/8 5/4(2)',
        movements: [
          {
            from: 5,
            to: 4,
            die: 1,
            hit: false,
          },
          {
            from: 5,
            to: 4,
            die: 1,
            hit: false,
          },
          {
            from: 10,
            to: 9,
            die: 1,
            hit: false,
          },
          {
            from: 9,
            to: 8,
            die: 1,
            hit: false,
          },
        ],
        finalKey:
          '0,2,-2,3,4,1,2,0,1,0,1,0,0,0,-1,0,-2,-2,-2,-4,-2,0,1,0,0|0,0|0,0',
        equity: -1,
        equityLoss: 0.758,
      },
      {
        rank: 48,
        moveText: '10/7 6/5',
        movements: [
          {
            from: 6,
            to: 5,
            die: 1,
            hit: false,
          },
          {
            from: 10,
            to: 9,
            die: 1,
            hit: false,
          },
          {
            from: 9,
            to: 8,
            die: 1,
            hit: false,
          },
          {
            from: 8,
            to: 7,
            die: 1,
            hit: false,
          },
        ],
        finalKey:
          '0,2,-2,3,2,4,1,1,0,0,1,0,0,0,-1,0,-2,-2,-2,-4,-2,0,1,0,0|0,0|0,0',
        equity: -1,
        equityLoss: 0.758,
      },
      {
        rank: 49,
        moveText: '10/7 4/3',
        movements: [
          {
            from: 4,
            to: 3,
            die: 1,
            hit: false,
          },
          {
            from: 10,
            to: 9,
            die: 1,
            hit: false,
          },
          {
            from: 9,
            to: 8,
            die: 1,
            hit: false,
          },
          {
            from: 8,
            to: 7,
            die: 1,
            hit: false,
          },
        ],
        finalKey:
          '0,2,-2,4,1,3,2,1,0,0,1,0,0,0,-1,0,-2,-2,-2,-4,-2,0,1,0,0|0,0|0,0',
        equity: -1,
        equityLoss: 0.758,
      },
      {
        rank: 50,
        moveText: '10/8 6/4',
        movements: [
          {
            from: 5,
            to: 4,
            die: 1,
            hit: false,
          },
          {
            from: 6,
            to: 5,
            die: 1,
            hit: false,
          },
          {
            from: 10,
            to: 9,
            die: 1,
            hit: false,
          },
          {
            from: 9,
            to: 8,
            die: 1,
            hit: false,
          },
        ],
        finalKey:
          '0,2,-2,3,3,3,1,0,1,0,1,0,0,0,-1,0,-2,-2,-2,-4,-2,0,1,0,0|0,0|0,0',
        equity: -1,
        equityLoss: 0.758,
      },
      {
        rank: 51,
        moveText: '10/9 5/3 4/3',
        movements: [
          {
            from: 4,
            to: 3,
            die: 1,
            hit: false,
          },
          {
            from: 4,
            to: 3,
            die: 1,
            hit: false,
          },
          {
            from: 5,
            to: 4,
            die: 1,
            hit: false,
          },
          {
            from: 10,
            to: 9,
            die: 1,
            hit: false,
          },
        ],
        finalKey:
          '0,2,-2,5,1,2,2,0,0,1,1,0,0,0,-1,0,-2,-2,-2,-4,-2,0,1,0,0|0,0|0,0',
        equity: -1,
        equityLoss: 0.758,
      },
      {
        rank: 52,
        moveText: '10/8 10/9 6/5',
        movements: [
          {
            from: 6,
            to: 5,
            die: 1,
            hit: false,
          },
          {
            from: 10,
            to: 9,
            die: 1,
            hit: false,
          },
          {
            from: 9,
            to: 8,
            die: 1,
            hit: false,
          },
          {
            from: 10,
            to: 9,
            die: 1,
            hit: false,
          },
        ],
        finalKey:
          '0,2,-2,3,2,4,1,0,1,1,0,0,0,0,-1,0,-2,-2,-2,-4,-2,0,1,0,0|0,0|0,0',
        equity: -1,
        equityLoss: 0.758,
      },
      {
        rank: 53,
        moveText: '10/8 10/9 4/3',
        movements: [
          {
            from: 4,
            to: 3,
            die: 1,
            hit: false,
          },
          {
            from: 10,
            to: 9,
            die: 1,
            hit: false,
          },
          {
            from: 9,
            to: 8,
            die: 1,
            hit: false,
          },
          {
            from: 10,
            to: 9,
            die: 1,
            hit: false,
          },
        ],
        finalKey:
          '0,2,-2,4,1,3,2,0,1,1,0,0,0,0,-1,0,-2,-2,-2,-4,-2,0,1,0,0|0,0|0,0',
        equity: -1,
        equityLoss: 0.758,
      },
      {
        rank: 54,
        moveText: '6/4 5/4(2)',
        movements: [
          {
            from: 5,
            to: 4,
            die: 1,
            hit: false,
          },
          {
            from: 5,
            to: 4,
            die: 1,
            hit: false,
          },
          {
            from: 5,
            to: 4,
            die: 1,
            hit: false,
          },
          {
            from: 6,
            to: 5,
            die: 1,
            hit: false,
          },
        ],
        finalKey:
          '0,2,-2,3,5,1,1,0,0,0,2,0,0,0,-1,0,-2,-2,-2,-4,-2,0,1,0,0|0,0|0,0',
        equity: -1.003,
        equityLoss: 0.7609999999999999,
      },
      {
        rank: 55,
        moveText: '10/9(2) 6/5 4/3',
        movements: [
          {
            from: 4,
            to: 3,
            die: 1,
            hit: false,
          },
          {
            from: 6,
            to: 5,
            die: 1,
            hit: false,
          },
          {
            from: 10,
            to: 9,
            die: 1,
            hit: false,
          },
          {
            from: 10,
            to: 9,
            die: 1,
            hit: false,
          },
        ],
        finalKey:
          '0,2,-2,4,1,4,1,0,0,2,0,0,0,0,-1,0,-2,-2,-2,-4,-2,0,1,0,0|0,0|0,0',
        equity: -1.033,
        equityLoss: 0.7909999999999999,
      },
      {
        rank: 56,
        moveText: '6/3 4/3',
        movements: [
          {
            from: 4,
            to: 3,
            die: 1,
            hit: false,
          },
          {
            from: 4,
            to: 3,
            die: 1,
            hit: false,
          },
          {
            from: 5,
            to: 4,
            die: 1,
            hit: false,
          },
          {
            from: 6,
            to: 5,
            die: 1,
            hit: false,
          },
        ],
        finalKey:
          '0,2,-2,5,1,3,1,0,0,0,2,0,0,0,-1,0,-2,-2,-2,-4,-2,0,1,0,0|0,0|0,0',
        equity: -1.037,
        equityLoss: 0.7949999999999999,
      },
      {
        rank: 57,
        moveText: '10/9 6/5(2) 4/3',
        movements: [
          {
            from: 4,
            to: 3,
            die: 1,
            hit: false,
          },
          {
            from: 6,
            to: 5,
            die: 1,
            hit: false,
          },
          {
            from: 6,
            to: 5,
            die: 1,
            hit: false,
          },
          {
            from: 10,
            to: 9,
            die: 1,
            hit: false,
          },
        ],
        finalKey:
          '0,2,-2,4,1,5,0,0,0,1,1,0,0,0,-1,0,-2,-2,-2,-4,-2,0,1,0,0|0,0|0,0',
        equity: -1.046,
        equityLoss: 0.804,
      },
      {
        rank: 58,
        moveText: '10/9 6/5 4/3(2)',
        movements: [
          {
            from: 4,
            to: 3,
            die: 1,
            hit: false,
          },
          {
            from: 4,
            to: 3,
            die: 1,
            hit: false,
          },
          {
            from: 6,
            to: 5,
            die: 1,
            hit: false,
          },
          {
            from: 10,
            to: 9,
            die: 1,
            hit: false,
          },
        ],
        finalKey:
          '0,2,-2,5,0,4,1,0,0,1,1,0,0,0,-1,0,-2,-2,-2,-4,-2,0,1,0,0|0,0|0,0',
        equity: -1.072,
        equityLoss: 0.8300000000000001,
      },
      {
        rank: 59,
        moveText: '22/21 10/9 6/5 4/3',
        movements: [
          {
            from: 4,
            to: 3,
            die: 1,
            hit: false,
          },
          {
            from: 6,
            to: 5,
            die: 1,
            hit: false,
          },
          {
            from: 10,
            to: 9,
            die: 1,
            hit: false,
          },
          {
            from: 22,
            to: 21,
            die: 1,
            hit: false,
          },
        ],
        finalKey:
          '0,2,-2,4,1,4,1,0,0,1,1,0,0,0,-1,0,-2,-2,-2,-4,-2,1,0,0,0|0,0|0,0',
        equity: -1.114,
        equityLoss: 0.8720000000000001,
      },
      {
        rank: 60,
        moveText: '10/8 6/5 4/3',
        movements: [
          {
            from: 4,
            to: 3,
            die: 1,
            hit: false,
          },
          {
            from: 6,
            to: 5,
            die: 1,
            hit: false,
          },
          {
            from: 10,
            to: 9,
            die: 1,
            hit: false,
          },
          {
            from: 9,
            to: 8,
            die: 1,
            hit: false,
          },
        ],
        finalKey:
          '0,2,-2,4,1,4,1,0,1,0,1,0,0,0,-1,0,-2,-2,-2,-4,-2,0,1,0,0|0,0|0,0',
        equity: -1.185,
        equityLoss: 0.9430000000000001,
      },
    ],
  },
  {
    id: 'curated-006',
    kind: 'play',
    theme: 'priming',
    source: 'curated',
    board: {
      points: [
        0, 0, 0, -1, 0, 2, 3, 2, 2, 0, 0, 0, -4, 4, -2, 0, 0, -3, 0, -5, 0, 0,
        1, 0, 1,
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
      matchLength: 0,
      score: {
        white: 0,
        black: 0,
      },
      cube: {
        value: 1,
        owner: 'center',
      },
    },
    roll: [3, 5],
    answers: [
      {
        rank: 1,
        moveText: '8/3* 6/3',
        movements: [
          {
            from: 6,
            to: 3,
            die: 3,
            hit: true,
          },
          {
            from: 8,
            to: 3,
            die: 5,
            hit: false,
          },
        ],
        finalKey:
          '0,0,0,2,0,2,2,2,1,0,0,0,-4,4,-2,0,0,-3,0,-5,0,0,1,0,1|0,1|0,0',
        equity: 0.461,
        equityLoss: 0,
      },
      {
        rank: 2,
        moveText: '13/8 6/3*',
        movements: [
          {
            from: 6,
            to: 3,
            die: 3,
            hit: true,
          },
          {
            from: 13,
            to: 8,
            die: 5,
            hit: false,
          },
        ],
        finalKey:
          '0,0,0,1,0,2,2,2,3,0,0,0,-4,3,-2,0,0,-3,0,-5,0,0,1,0,1|0,1|0,0',
        equity: 0.239,
        equityLoss: 0.22200000000000003,
      },
      {
        rank: 3,
        moveText: '13/5',
        movements: [
          {
            from: 8,
            to: 5,
            die: 3,
            hit: false,
          },
          {
            from: 13,
            to: 8,
            die: 5,
            hit: false,
          },
        ],
        finalKey:
          '0,0,0,-1,0,3,3,2,2,0,0,0,-4,3,-2,0,0,-3,0,-5,0,0,1,0,1|0,0|0,0',
        equity: 0.163,
        equityLoss: 0.29800000000000004,
      },
      {
        rank: 4,
        moveText: '13/10 13/8',
        movements: [
          {
            from: 13,
            to: 10,
            die: 3,
            hit: false,
          },
          {
            from: 13,
            to: 8,
            die: 5,
            hit: false,
          },
        ],
        finalKey:
          '0,0,0,-1,0,2,3,2,3,0,1,0,-4,2,-2,0,0,-3,0,-5,0,0,1,0,1|0,0|0,0',
        equity: 0.158,
        equityLoss: 0.30300000000000005,
      },
      {
        rank: 5,
        moveText: '24/21 13/8',
        movements: [
          {
            from: 24,
            to: 21,
            die: 3,
            hit: false,
          },
          {
            from: 13,
            to: 8,
            die: 5,
            hit: false,
          },
        ],
        finalKey:
          '0,0,0,-1,0,2,3,2,3,0,0,0,-4,3,-2,0,0,-3,0,-5,0,1,1,0,0|0,0|0,0',
        equity: 0.13,
        equityLoss: 0.331,
      },
      {
        rank: 6,
        moveText: '13/10 8/3*',
        movements: [
          {
            from: 13,
            to: 10,
            die: 3,
            hit: false,
          },
          {
            from: 8,
            to: 3,
            die: 5,
            hit: true,
          },
        ],
        finalKey:
          '0,0,0,1,0,2,3,2,1,0,1,0,-4,3,-2,0,0,-3,0,-5,0,0,1,0,1|0,1|0,0',
        equity: 0.129,
        equityLoss: 0.332,
      },
      {
        rank: 7,
        moveText: '8/5 8/3*',
        movements: [
          {
            from: 8,
            to: 5,
            die: 3,
            hit: false,
          },
          {
            from: 8,
            to: 3,
            die: 5,
            hit: true,
          },
        ],
        finalKey:
          '0,0,0,1,0,3,3,2,0,0,0,0,-4,4,-2,0,0,-3,0,-5,0,0,1,0,1|0,1|0,0',
        equity: 0.101,
        equityLoss: 0.36,
      },
      {
        rank: 8,
        moveText: '24/16',
        movements: [
          {
            from: 24,
            to: 21,
            die: 3,
            hit: false,
          },
          {
            from: 21,
            to: 16,
            die: 5,
            hit: false,
          },
        ],
        finalKey:
          '0,0,0,-1,0,2,3,2,2,0,0,0,-4,4,-2,0,1,-3,0,-5,0,0,1,0,0|0,0|0,0',
        equity: 0.062,
        equityLoss: 0.399,
      },
      {
        rank: 9,
        moveText: '24/21 8/3*',
        movements: [
          {
            from: 24,
            to: 21,
            die: 3,
            hit: false,
          },
          {
            from: 8,
            to: 3,
            die: 5,
            hit: true,
          },
        ],
        finalKey:
          '0,0,0,1,0,2,3,2,1,0,0,0,-4,4,-2,0,0,-3,0,-5,0,1,1,0,0|0,1|0,0',
        equity: 0.067,
        equityLoss: 0.394,
      },
      {
        rank: 10,
        moveText: '13/10 6/1',
        movements: [
          {
            from: 13,
            to: 10,
            die: 3,
            hit: false,
          },
          {
            from: 6,
            to: 1,
            die: 5,
            hit: false,
          },
        ],
        finalKey:
          '0,1,0,-1,0,2,2,2,2,0,1,0,-4,3,-2,0,0,-3,0,-5,0,0,1,0,1|0,0|0,0',
        equity: -0.006,
        equityLoss: 0.467,
      },
      {
        rank: 11,
        moveText: '24/21 6/1',
        movements: [
          {
            from: 24,
            to: 21,
            die: 3,
            hit: false,
          },
          {
            from: 6,
            to: 1,
            die: 5,
            hit: false,
          },
        ],
        finalKey:
          '0,1,0,-1,0,2,2,2,2,0,0,0,-4,4,-2,0,0,-3,0,-5,0,1,1,0,0|0,0|0,0',
        equity: -0.082,
        equityLoss: 0.543,
      },
      {
        rank: 12,
        moveText: '13/8 7/4',
        movements: [
          {
            from: 7,
            to: 4,
            die: 3,
            hit: false,
          },
          {
            from: 13,
            to: 8,
            die: 5,
            hit: false,
          },
        ],
        finalKey:
          '0,0,0,-1,1,2,3,1,3,0,0,0,-4,3,-2,0,0,-3,0,-5,0,0,1,0,1|0,0|0,0',
        equity: -0.095,
        equityLoss: 0.556,
      },
      {
        rank: 13,
        moveText: '7/2 6/3*',
        movements: [
          {
            from: 6,
            to: 3,
            die: 3,
            hit: true,
          },
          {
            from: 7,
            to: 2,
            die: 5,
            hit: false,
          },
        ],
        finalKey:
          '0,0,1,1,0,2,2,1,2,0,0,0,-4,4,-2,0,0,-3,0,-5,0,0,1,0,1|0,1|0,0',
        equity: -0.122,
        equityLoss: 0.583,
      },
      {
        rank: 14,
        moveText: '13/10 7/2',
        movements: [
          {
            from: 13,
            to: 10,
            die: 3,
            hit: false,
          },
          {
            from: 7,
            to: 2,
            die: 5,
            hit: false,
          },
        ],
        finalKey:
          '0,0,1,-1,0,2,3,1,2,0,1,0,-4,3,-2,0,0,-3,0,-5,0,0,1,0,1|0,0|0,0',
        equity: -0.138,
        equityLoss: 0.599,
      },
      {
        rank: 15,
        moveText: '8/3* 7/4',
        movements: [
          {
            from: 7,
            to: 4,
            die: 3,
            hit: false,
          },
          {
            from: 8,
            to: 3,
            die: 5,
            hit: true,
          },
        ],
        finalKey:
          '0,0,0,1,1,2,3,1,1,0,0,0,-4,4,-2,0,0,-3,0,-5,0,0,1,0,1|0,1|0,0',
        equity: -0.16,
        equityLoss: 0.621,
      },
      {
        rank: 16,
        moveText: '7/4 7/2',
        movements: [
          {
            from: 7,
            to: 4,
            die: 3,
            hit: false,
          },
          {
            from: 7,
            to: 2,
            die: 5,
            hit: false,
          },
        ],
        finalKey:
          '0,0,1,-1,1,2,3,0,2,0,0,0,-4,4,-2,0,0,-3,0,-5,0,0,1,0,1|0,0|0,0',
        equity: -0.18,
        equityLoss: 0.641,
      },
      {
        rank: 17,
        moveText: '24/21 7/2',
        movements: [
          {
            from: 24,
            to: 21,
            die: 3,
            hit: false,
          },
          {
            from: 7,
            to: 2,
            die: 5,
            hit: false,
          },
        ],
        finalKey:
          '0,0,1,-1,0,2,3,1,2,0,0,0,-4,4,-2,0,0,-3,0,-5,0,1,1,0,0|0,0|0,0',
        equity: -0.184,
        equityLoss: 0.645,
      },
      {
        rank: 18,
        moveText: '8/5 6/1',
        movements: [
          {
            from: 8,
            to: 5,
            die: 3,
            hit: false,
          },
          {
            from: 6,
            to: 1,
            die: 5,
            hit: false,
          },
        ],
        finalKey:
          '0,1,0,-1,0,3,2,2,1,0,0,0,-4,4,-2,0,0,-3,0,-5,0,0,1,0,1|0,0|0,0',
        equity: -0.215,
        equityLoss: 0.676,
      },
      {
        rank: 19,
        moveText: '13/8 5/2',
        movements: [
          {
            from: 5,
            to: 2,
            die: 3,
            hit: false,
          },
          {
            from: 13,
            to: 8,
            die: 5,
            hit: false,
          },
        ],
        finalKey:
          '0,0,1,-1,0,1,3,2,3,0,0,0,-4,3,-2,0,0,-3,0,-5,0,0,1,0,1|0,0|0,0',
        equity: -0.234,
        equityLoss: 0.6950000000000001,
      },
      {
        rank: 20,
        moveText: '8/5 7/2',
        movements: [
          {
            from: 8,
            to: 5,
            die: 3,
            hit: false,
          },
          {
            from: 7,
            to: 2,
            die: 5,
            hit: false,
          },
        ],
        finalKey:
          '0,0,1,-1,0,3,3,1,1,0,0,0,-4,4,-2,0,0,-3,0,-5,0,0,1,0,1|0,0|0,0',
        equity: -0.277,
        equityLoss: 0.738,
      },
      {
        rank: 21,
        moveText: '7/4 6/1',
        movements: [
          {
            from: 7,
            to: 4,
            die: 3,
            hit: false,
          },
          {
            from: 6,
            to: 1,
            die: 5,
            hit: false,
          },
        ],
        finalKey:
          '0,1,0,-1,1,2,2,1,2,0,0,0,-4,4,-2,0,0,-3,0,-5,0,0,1,0,1|0,0|0,0',
        equity: -0.332,
        equityLoss: 0.793,
      },
      {
        rank: 22,
        moveText: '7/2 5/2',
        movements: [
          {
            from: 5,
            to: 2,
            die: 3,
            hit: false,
          },
          {
            from: 7,
            to: 2,
            die: 5,
            hit: false,
          },
        ],
        finalKey:
          '0,0,2,-1,0,1,3,1,2,0,0,0,-4,4,-2,0,0,-3,0,-5,0,0,1,0,1|0,0|0,0',
        equity: -0.333,
        equityLoss: 0.794,
      },
      {
        rank: 23,
        moveText: '8/3* 5/2',
        movements: [
          {
            from: 5,
            to: 2,
            die: 3,
            hit: false,
          },
          {
            from: 8,
            to: 3,
            die: 5,
            hit: true,
          },
        ],
        finalKey:
          '0,0,1,1,0,1,3,2,1,0,0,0,-4,4,-2,0,0,-3,0,-5,0,0,1,0,1|0,1|0,0',
        equity: -0.472,
        equityLoss: 0.933,
      },
      {
        rank: 24,
        moveText: '6/1 5/2',
        movements: [
          {
            from: 5,
            to: 2,
            die: 3,
            hit: false,
          },
          {
            from: 6,
            to: 1,
            die: 5,
            hit: false,
          },
        ],
        finalKey:
          '0,1,1,-1,0,1,2,2,2,0,0,0,-4,4,-2,0,0,-3,0,-5,0,0,1,0,1|0,0|0,0',
        equity: -0.476,
        equityLoss: 0.937,
      },
      {
        rank: 25,
        moveText: '6/3* 6/1',
        movements: [
          {
            from: 6,
            to: 3,
            die: 3,
            hit: true,
          },
          {
            from: 6,
            to: 1,
            die: 5,
            hit: false,
          },
        ],
        finalKey:
          '0,1,0,1,0,2,1,2,2,0,0,0,-4,4,-2,0,0,-3,0,-5,0,0,1,0,1|0,1|0,0',
        equity: -0.524,
        equityLoss: 0.9850000000000001,
      },
    ],
  },
  {
    id: 'curated-007',
    kind: 'play',
    theme: 'blitzing',
    source: 'curated',
    board: {
      points: [
        0, 2, 0, 2, 2, -1, 4, 1, 1, 0, 1, 0, -2, 1, 0, 0, 0, -2, -2, -5, 1, 0,
        0, -1, 0,
      ],
      bar: {
        white: 0,
        black: 2,
      },
      off: {
        white: 0,
        black: 0,
      },
    },
    hero: 'white',
    match: {
      matchLength: 0,
      score: {
        white: 0,
        black: 0,
      },
      cube: {
        value: 1,
        owner: 'center',
      },
    },
    roll: [5, 5],
    answers: [
      {
        rank: 1,
        moveText: '20/5* 10/5',
        movements: [
          {
            from: 20,
            to: 15,
            die: 5,
            hit: false,
          },
          {
            from: 15,
            to: 10,
            die: 5,
            hit: false,
          },
          {
            from: 10,
            to: 5,
            die: 5,
            hit: true,
          },
          {
            from: 10,
            to: 5,
            die: 5,
            hit: false,
          },
        ],
        finalKey:
          '0,2,0,2,2,2,4,1,1,0,0,0,-2,1,0,0,0,-2,-2,-5,0,0,0,-1,0|0,3|0,0',
        equity: 1.833,
        equityLoss: 0,
      },
      {
        rank: 2,
        moveText: '20/5* 13/8',
        movements: [
          {
            from: 20,
            to: 15,
            die: 5,
            hit: false,
          },
          {
            from: 15,
            to: 10,
            die: 5,
            hit: false,
          },
          {
            from: 13,
            to: 8,
            die: 5,
            hit: false,
          },
          {
            from: 10,
            to: 5,
            die: 5,
            hit: true,
          },
        ],
        finalKey:
          '0,2,0,2,2,1,4,1,2,0,1,0,-2,0,0,0,0,-2,-2,-5,0,0,0,-1,0|0,3|0,0',
        equity: 1.706,
        equityLoss: 0.127,
      },
      {
        rank: 3,
        moveText: '20/15 13/3 10/5*',
        movements: [
          {
            from: 20,
            to: 15,
            die: 5,
            hit: false,
          },
          {
            from: 13,
            to: 8,
            die: 5,
            hit: false,
          },
          {
            from: 10,
            to: 5,
            die: 5,
            hit: true,
          },
          {
            from: 8,
            to: 3,
            die: 5,
            hit: false,
          },
        ],
        finalKey:
          '0,2,0,3,2,1,4,1,1,0,0,0,-2,0,0,1,0,-2,-2,-5,0,0,0,-1,0|0,3|0,0',
        equity: 1.681,
        equityLoss: 0.1519999999999999,
      },
      {
        rank: 4,
        moveText: '20/5* 8/3',
        movements: [
          {
            from: 20,
            to: 15,
            die: 5,
            hit: false,
          },
          {
            from: 15,
            to: 10,
            die: 5,
            hit: false,
          },
          {
            from: 10,
            to: 5,
            die: 5,
            hit: true,
          },
          {
            from: 8,
            to: 3,
            die: 5,
            hit: false,
          },
        ],
        finalKey:
          '0,2,0,3,2,1,4,1,0,0,1,0,-2,1,0,0,0,-2,-2,-5,0,0,0,-1,0|0,3|0,0',
        equity: 1.651,
        equityLoss: 0.18199999999999994,
      },
      {
        rank: 5,
        moveText: '20/15 13/8 10/5* 6/1',
        movements: [
          {
            from: 20,
            to: 15,
            die: 5,
            hit: false,
          },
          {
            from: 13,
            to: 8,
            die: 5,
            hit: false,
          },
          {
            from: 10,
            to: 5,
            die: 5,
            hit: true,
          },
          {
            from: 6,
            to: 1,
            die: 5,
            hit: false,
          },
        ],
        finalKey:
          '0,3,0,2,2,1,3,1,2,0,0,0,-2,0,0,1,0,-2,-2,-5,0,0,0,-1,0|0,3|0,0',
        equity: 1.646,
        equityLoss: 0.18700000000000006,
      },
      {
        rank: 6,
        moveText: '20/15 13/8 10/5* 7/2',
        movements: [
          {
            from: 20,
            to: 15,
            die: 5,
            hit: false,
          },
          {
            from: 13,
            to: 8,
            die: 5,
            hit: false,
          },
          {
            from: 10,
            to: 5,
            die: 5,
            hit: true,
          },
          {
            from: 7,
            to: 2,
            die: 5,
            hit: false,
          },
        ],
        finalKey:
          '0,2,1,2,2,1,4,0,2,0,0,0,-2,0,0,1,0,-2,-2,-5,0,0,0,-1,0|0,3|0,0',
        equity: 1.633,
        equityLoss: 0.19999999999999996,
      },
      {
        rank: 7,
        moveText: '20/5* 6/1',
        movements: [
          {
            from: 20,
            to: 15,
            die: 5,
            hit: false,
          },
          {
            from: 15,
            to: 10,
            die: 5,
            hit: false,
          },
          {
            from: 10,
            to: 5,
            die: 5,
            hit: true,
          },
          {
            from: 6,
            to: 1,
            die: 5,
            hit: false,
          },
        ],
        finalKey:
          '0,3,0,2,2,1,3,1,1,0,1,0,-2,1,0,0,0,-2,-2,-5,0,0,0,-1,0|0,3|0,0',
        equity: 1.631,
        equityLoss: 0.20199999999999996,
      },
      {
        rank: 8,
        moveText: '20/5* 7/2',
        movements: [
          {
            from: 20,
            to: 15,
            die: 5,
            hit: false,
          },
          {
            from: 15,
            to: 10,
            die: 5,
            hit: false,
          },
          {
            from: 10,
            to: 5,
            die: 5,
            hit: true,
          },
          {
            from: 7,
            to: 2,
            die: 5,
            hit: false,
          },
        ],
        finalKey:
          '0,2,1,2,2,1,4,0,1,0,1,0,-2,1,0,0,0,-2,-2,-5,0,0,0,-1,0|0,3|0,0',
        equity: 1.626,
        equityLoss: 0.20700000000000007,
      },
      {
        rank: 9,
        moveText: '20/15 10/5* 8/3 6/1',
        movements: [
          {
            from: 20,
            to: 15,
            die: 5,
            hit: false,
          },
          {
            from: 10,
            to: 5,
            die: 5,
            hit: true,
          },
          {
            from: 8,
            to: 3,
            die: 5,
            hit: false,
          },
          {
            from: 6,
            to: 1,
            die: 5,
            hit: false,
          },
        ],
        finalKey:
          '0,3,0,3,2,1,3,1,0,0,0,0,-2,1,0,1,0,-2,-2,-5,0,0,0,-1,0|0,3|0,0',
        equity: 1.617,
        equityLoss: 0.21599999999999997,
      },
      {
        rank: 10,
        moveText: '13/3 10/5* 6/1',
        movements: [
          {
            from: 13,
            to: 8,
            die: 5,
            hit: false,
          },
          {
            from: 10,
            to: 5,
            die: 5,
            hit: true,
          },
          {
            from: 8,
            to: 3,
            die: 5,
            hit: false,
          },
          {
            from: 6,
            to: 1,
            die: 5,
            hit: false,
          },
        ],
        finalKey:
          '0,3,0,3,2,1,3,1,1,0,0,0,-2,0,0,0,0,-2,-2,-5,1,0,0,-1,0|0,3|0,0',
        equity: 1.606,
        equityLoss: 0.22699999999999987,
      },
      {
        rank: 11,
        moveText: '20/10 13/3',
        movements: [
          {
            from: 20,
            to: 15,
            die: 5,
            hit: false,
          },
          {
            from: 15,
            to: 10,
            die: 5,
            hit: false,
          },
          {
            from: 13,
            to: 8,
            die: 5,
            hit: false,
          },
          {
            from: 8,
            to: 3,
            die: 5,
            hit: false,
          },
        ],
        finalKey:
          '0,2,0,3,2,-1,4,1,1,0,2,0,-2,0,0,0,0,-2,-2,-5,0,0,0,-1,0|0,2|0,0',
        equity: 1.6,
        equityLoss: 0.23299999999999987,
      },
      {
        rank: 12,
        moveText: '13/3 10/5* 8/3',
        movements: [
          {
            from: 13,
            to: 8,
            die: 5,
            hit: false,
          },
          {
            from: 10,
            to: 5,
            die: 5,
            hit: true,
          },
          {
            from: 8,
            to: 3,
            die: 5,
            hit: false,
          },
          {
            from: 8,
            to: 3,
            die: 5,
            hit: false,
          },
        ],
        finalKey:
          '0,2,0,4,2,1,4,1,0,0,0,0,-2,0,0,0,0,-2,-2,-5,1,0,0,-1,0|0,3|0,0',
        equity: 1.591,
        equityLoss: 0.242,
      },
      {
        rank: 13,
        moveText: '20/15 10/5* 8/3 7/2',
        movements: [
          {
            from: 20,
            to: 15,
            die: 5,
            hit: false,
          },
          {
            from: 10,
            to: 5,
            die: 5,
            hit: true,
          },
          {
            from: 8,
            to: 3,
            die: 5,
            hit: false,
          },
          {
            from: 7,
            to: 2,
            die: 5,
            hit: false,
          },
        ],
        finalKey:
          '0,2,1,3,2,1,4,0,0,0,0,0,-2,1,0,1,0,-2,-2,-5,0,0,0,-1,0|0,3|0,0',
        equity: 1.587,
        equityLoss: 0.246,
      },
      {
        rank: 14,
        moveText: '13/3 10/5* 7/2',
        movements: [
          {
            from: 13,
            to: 8,
            die: 5,
            hit: false,
          },
          {
            from: 10,
            to: 5,
            die: 5,
            hit: true,
          },
          {
            from: 8,
            to: 3,
            die: 5,
            hit: false,
          },
          {
            from: 7,
            to: 2,
            die: 5,
            hit: false,
          },
        ],
        finalKey:
          '0,2,1,3,2,1,4,0,1,0,0,0,-2,0,0,0,0,-2,-2,-5,1,0,0,-1,0|0,3|0,0',
        equity: 1.583,
        equityLoss: 0.25,
      },
      {
        rank: 15,
        moveText: '20/10 13/8 6/1',
        movements: [
          {
            from: 20,
            to: 15,
            die: 5,
            hit: false,
          },
          {
            from: 15,
            to: 10,
            die: 5,
            hit: false,
          },
          {
            from: 13,
            to: 8,
            die: 5,
            hit: false,
          },
          {
            from: 6,
            to: 1,
            die: 5,
            hit: false,
          },
        ],
        finalKey:
          '0,3,0,2,2,-1,3,1,2,0,2,0,-2,0,0,0,0,-2,-2,-5,0,0,0,-1,0|0,2|0,0',
        equity: 1.572,
        equityLoss: 0.2609999999999999,
      },
      {
        rank: 16,
        moveText: '20/15 10/5* 7/2 6/1',
        movements: [
          {
            from: 20,
            to: 15,
            die: 5,
            hit: false,
          },
          {
            from: 10,
            to: 5,
            die: 5,
            hit: true,
          },
          {
            from: 7,
            to: 2,
            die: 5,
            hit: false,
          },
          {
            from: 6,
            to: 1,
            die: 5,
            hit: false,
          },
        ],
        finalKey:
          '0,3,1,2,2,1,3,0,1,0,0,0,-2,1,0,1,0,-2,-2,-5,0,0,0,-1,0|0,3|0,0',
        equity: 1.552,
        equityLoss: 0.2809999999999999,
      },
      {
        rank: 17,
        moveText: '13/8 10/5* 7/2 6/1',
        movements: [
          {
            from: 13,
            to: 8,
            die: 5,
            hit: false,
          },
          {
            from: 10,
            to: 5,
            die: 5,
            hit: true,
          },
          {
            from: 7,
            to: 2,
            die: 5,
            hit: false,
          },
          {
            from: 6,
            to: 1,
            die: 5,
            hit: false,
          },
        ],
        finalKey:
          '0,3,1,2,2,1,3,0,2,0,0,0,-2,0,0,0,0,-2,-2,-5,1,0,0,-1,0|0,3|0,0',
        equity: 1.548,
        equityLoss: 0.2849999999999999,
      },
      {
        rank: 18,
        moveText: '20/15 13/3 6/1',
        movements: [
          {
            from: 20,
            to: 15,
            die: 5,
            hit: false,
          },
          {
            from: 13,
            to: 8,
            die: 5,
            hit: false,
          },
          {
            from: 8,
            to: 3,
            die: 5,
            hit: false,
          },
          {
            from: 6,
            to: 1,
            die: 5,
            hit: false,
          },
        ],
        finalKey:
          '0,3,0,3,2,-1,3,1,1,0,1,0,-2,0,0,1,0,-2,-2,-5,0,0,0,-1,0|0,2|0,0',
        equity: 1.534,
        equityLoss: 0.29899999999999993,
      },
      {
        rank: 19,
        moveText: '20/15 10/5* 6/1(2)',
        movements: [
          {
            from: 20,
            to: 15,
            die: 5,
            hit: false,
          },
          {
            from: 10,
            to: 5,
            die: 5,
            hit: true,
          },
          {
            from: 6,
            to: 1,
            die: 5,
            hit: false,
          },
          {
            from: 6,
            to: 1,
            die: 5,
            hit: false,
          },
        ],
        finalKey:
          '0,4,0,2,2,1,2,1,1,0,0,0,-2,1,0,1,0,-2,-2,-5,0,0,0,-1,0|0,3|0,0',
        equity: 1.518,
        equityLoss: 0.31499999999999995,
      },
      {
        rank: 20,
        moveText: '20/10 13/8 7/2',
        movements: [
          {
            from: 20,
            to: 15,
            die: 5,
            hit: false,
          },
          {
            from: 15,
            to: 10,
            die: 5,
            hit: false,
          },
          {
            from: 13,
            to: 8,
            die: 5,
            hit: false,
          },
          {
            from: 7,
            to: 2,
            die: 5,
            hit: false,
          },
        ],
        finalKey:
          '0,2,1,2,2,-1,4,0,2,0,2,0,-2,0,0,0,0,-2,-2,-5,0,0,0,-1,0|0,2|0,0',
        equity: 1.509,
        equityLoss: 0.32400000000000007,
      },
      {
        rank: 21,
        moveText: '20/15 13/3 8/3',
        movements: [
          {
            from: 20,
            to: 15,
            die: 5,
            hit: false,
          },
          {
            from: 13,
            to: 8,
            die: 5,
            hit: false,
          },
          {
            from: 8,
            to: 3,
            die: 5,
            hit: false,
          },
          {
            from: 8,
            to: 3,
            die: 5,
            hit: false,
          },
        ],
        finalKey:
          '0,2,0,4,2,-1,4,1,0,0,1,0,-2,0,0,1,0,-2,-2,-5,0,0,0,-1,0|0,2|0,0',
        equity: 1.503,
        equityLoss: 0.33000000000000007,
      },
      {
        rank: 22,
        moveText: '20/10 8/3 6/1',
        movements: [
          {
            from: 20,
            to: 15,
            die: 5,
            hit: false,
          },
          {
            from: 15,
            to: 10,
            die: 5,
            hit: false,
          },
          {
            from: 8,
            to: 3,
            die: 5,
            hit: false,
          },
          {
            from: 6,
            to: 1,
            die: 5,
            hit: false,
          },
        ],
        finalKey:
          '0,3,0,3,2,-1,3,1,0,0,2,0,-2,1,0,0,0,-2,-2,-5,0,0,0,-1,0|0,2|0,0',
        equity: 1.497,
        equityLoss: 0.33599999999999985,
      },
      {
        rank: 23,
        moveText: '13/8 10/5* 6/1(2)',
        movements: [
          {
            from: 13,
            to: 8,
            die: 5,
            hit: false,
          },
          {
            from: 10,
            to: 5,
            die: 5,
            hit: true,
          },
          {
            from: 6,
            to: 1,
            die: 5,
            hit: false,
          },
          {
            from: 6,
            to: 1,
            die: 5,
            hit: false,
          },
        ],
        finalKey:
          '0,4,0,2,2,1,2,1,2,0,0,0,-2,0,0,0,0,-2,-2,-5,1,0,0,-1,0|0,3|0,0',
        equity: 1.491,
        equityLoss: 0.34199999999999986,
      },
      {
        rank: 24,
        moveText: '10/5* 8/3 7/2 6/1',
        movements: [
          {
            from: 10,
            to: 5,
            die: 5,
            hit: true,
          },
          {
            from: 8,
            to: 3,
            die: 5,
            hit: false,
          },
          {
            from: 7,
            to: 2,
            die: 5,
            hit: false,
          },
          {
            from: 6,
            to: 1,
            die: 5,
            hit: false,
          },
        ],
        finalKey:
          '0,3,1,3,2,1,3,0,0,0,0,0,-2,1,0,0,0,-2,-2,-5,1,0,0,-1,0|0,3|0,0',
        equity: 1.468,
        equityLoss: 0.365,
      },
      {
        rank: 25,
        moveText: '20/15 13/3 7/2',
        movements: [
          {
            from: 20,
            to: 15,
            die: 5,
            hit: false,
          },
          {
            from: 13,
            to: 8,
            die: 5,
            hit: false,
          },
          {
            from: 8,
            to: 3,
            die: 5,
            hit: false,
          },
          {
            from: 7,
            to: 2,
            die: 5,
            hit: false,
          },
        ],
        finalKey:
          '0,2,1,3,2,-1,4,0,1,0,1,0,-2,0,0,1,0,-2,-2,-5,0,0,0,-1,0|0,2|0,0',
        equity: 1.452,
        equityLoss: 0.381,
      },
      {
        rank: 26,
        moveText: '20/10 8/3 7/2',
        movements: [
          {
            from: 20,
            to: 15,
            die: 5,
            hit: false,
          },
          {
            from: 15,
            to: 10,
            die: 5,
            hit: false,
          },
          {
            from: 8,
            to: 3,
            die: 5,
            hit: false,
          },
          {
            from: 7,
            to: 2,
            die: 5,
            hit: false,
          },
        ],
        finalKey:
          '0,2,1,3,2,-1,4,0,0,0,2,0,-2,1,0,0,0,-2,-2,-5,0,0,0,-1,0|0,2|0,0',
        equity: 1.427,
        equityLoss: 0.4059999999999999,
      },
      {
        rank: 27,
        moveText: '10/5* 8/3 6/1(2)',
        movements: [
          {
            from: 10,
            to: 5,
            die: 5,
            hit: true,
          },
          {
            from: 8,
            to: 3,
            die: 5,
            hit: false,
          },
          {
            from: 6,
            to: 1,
            die: 5,
            hit: false,
          },
          {
            from: 6,
            to: 1,
            die: 5,
            hit: false,
          },
        ],
        finalKey:
          '0,4,0,3,2,1,2,1,0,0,0,0,-2,1,0,0,0,-2,-2,-5,1,0,0,-1,0|0,3|0,0',
        equity: 1.427,
        equityLoss: 0.4059999999999999,
      },
      {
        rank: 28,
        moveText: '20/15 13/8 7/2 6/1',
        movements: [
          {
            from: 20,
            to: 15,
            die: 5,
            hit: false,
          },
          {
            from: 13,
            to: 8,
            die: 5,
            hit: false,
          },
          {
            from: 7,
            to: 2,
            die: 5,
            hit: false,
          },
          {
            from: 6,
            to: 1,
            die: 5,
            hit: false,
          },
        ],
        finalKey:
          '0,3,1,2,2,-1,3,0,2,0,1,0,-2,0,0,1,0,-2,-2,-5,0,0,0,-1,0|0,2|0,0',
        equity: 1.419,
        equityLoss: 0.4139999999999999,
      },
      {
        rank: 29,
        moveText: '20/10 7/2 6/1',
        movements: [
          {
            from: 20,
            to: 15,
            die: 5,
            hit: false,
          },
          {
            from: 15,
            to: 10,
            die: 5,
            hit: false,
          },
          {
            from: 7,
            to: 2,
            die: 5,
            hit: false,
          },
          {
            from: 6,
            to: 1,
            die: 5,
            hit: false,
          },
        ],
        finalKey:
          '0,3,1,2,2,-1,3,0,1,0,2,0,-2,1,0,0,0,-2,-2,-5,0,0,0,-1,0|0,2|0,0',
        equity: 1.413,
        equityLoss: 0.41999999999999993,
      },
      {
        rank: 30,
        moveText: '20/10 6/1(2)',
        movements: [
          {
            from: 20,
            to: 15,
            die: 5,
            hit: false,
          },
          {
            from: 15,
            to: 10,
            die: 5,
            hit: false,
          },
          {
            from: 6,
            to: 1,
            die: 5,
            hit: false,
          },
          {
            from: 6,
            to: 1,
            die: 5,
            hit: false,
          },
        ],
        finalKey:
          '0,4,0,2,2,-1,2,1,1,0,2,0,-2,1,0,0,0,-2,-2,-5,0,0,0,-1,0|0,2|0,0',
        equity: 1.404,
        equityLoss: 0.42900000000000005,
      },
      {
        rank: 31,
        moveText: '20/15 13/8 6/1(2)',
        movements: [
          {
            from: 20,
            to: 15,
            die: 5,
            hit: false,
          },
          {
            from: 13,
            to: 8,
            die: 5,
            hit: false,
          },
          {
            from: 6,
            to: 1,
            die: 5,
            hit: false,
          },
          {
            from: 6,
            to: 1,
            die: 5,
            hit: false,
          },
        ],
        finalKey:
          '0,4,0,2,2,-1,2,1,2,0,1,0,-2,0,0,1,0,-2,-2,-5,0,0,0,-1,0|0,2|0,0',
        equity: 1.399,
        equityLoss: 0.43399999999999994,
      },
      {
        rank: 32,
        moveText: '10/5* 7/2 6/1(2)',
        movements: [
          {
            from: 10,
            to: 5,
            die: 5,
            hit: true,
          },
          {
            from: 7,
            to: 2,
            die: 5,
            hit: false,
          },
          {
            from: 6,
            to: 1,
            die: 5,
            hit: false,
          },
          {
            from: 6,
            to: 1,
            die: 5,
            hit: false,
          },
        ],
        finalKey:
          '0,4,1,2,2,1,2,0,1,0,0,0,-2,1,0,0,0,-2,-2,-5,1,0,0,-1,0|0,3|0,0',
        equity: 1.363,
        equityLoss: 0.47,
      },
      {
        rank: 33,
        moveText: '13/3 8/3 6/1',
        movements: [
          {
            from: 13,
            to: 8,
            die: 5,
            hit: false,
          },
          {
            from: 8,
            to: 3,
            die: 5,
            hit: false,
          },
          {
            from: 8,
            to: 3,
            die: 5,
            hit: false,
          },
          {
            from: 6,
            to: 1,
            die: 5,
            hit: false,
          },
        ],
        finalKey:
          '0,3,0,4,2,-1,3,1,0,0,1,0,-2,0,0,0,0,-2,-2,-5,1,0,0,-1,0|0,2|0,0',
        equity: 1.353,
        equityLoss: 0.48,
      },
      {
        rank: 34,
        moveText: '20/15 8/3 6/1(2)',
        movements: [
          {
            from: 20,
            to: 15,
            die: 5,
            hit: false,
          },
          {
            from: 8,
            to: 3,
            die: 5,
            hit: false,
          },
          {
            from: 6,
            to: 1,
            die: 5,
            hit: false,
          },
          {
            from: 6,
            to: 1,
            die: 5,
            hit: false,
          },
        ],
        finalKey:
          '0,4,0,3,2,-1,2,1,0,0,1,0,-2,1,0,1,0,-2,-2,-5,0,0,0,-1,0|0,2|0,0',
        equity: 1.341,
        equityLoss: 0.492,
      },
      {
        rank: 35,
        moveText: '20/15 8/3 7/2 6/1',
        movements: [
          {
            from: 20,
            to: 15,
            die: 5,
            hit: false,
          },
          {
            from: 8,
            to: 3,
            die: 5,
            hit: false,
          },
          {
            from: 7,
            to: 2,
            die: 5,
            hit: false,
          },
          {
            from: 6,
            to: 1,
            die: 5,
            hit: false,
          },
        ],
        finalKey:
          '0,3,1,3,2,-1,3,0,0,0,1,0,-2,1,0,1,0,-2,-2,-5,0,0,0,-1,0|0,2|0,0',
        equity: 1.339,
        equityLoss: 0.494,
      },
      {
        rank: 36,
        moveText: '13/3 7/2 6/1',
        movements: [
          {
            from: 13,
            to: 8,
            die: 5,
            hit: false,
          },
          {
            from: 8,
            to: 3,
            die: 5,
            hit: false,
          },
          {
            from: 7,
            to: 2,
            die: 5,
            hit: false,
          },
          {
            from: 6,
            to: 1,
            die: 5,
            hit: false,
          },
        ],
        finalKey:
          '0,3,1,3,2,-1,3,0,1,0,1,0,-2,0,0,0,0,-2,-2,-5,1,0,0,-1,0|0,2|0,0',
        equity: 1.318,
        equityLoss: 0.5149999999999999,
      },
      {
        rank: 37,
        moveText: '13/3 6/1(2)',
        movements: [
          {
            from: 13,
            to: 8,
            die: 5,
            hit: false,
          },
          {
            from: 8,
            to: 3,
            die: 5,
            hit: false,
          },
          {
            from: 6,
            to: 1,
            die: 5,
            hit: false,
          },
          {
            from: 6,
            to: 1,
            die: 5,
            hit: false,
          },
        ],
        finalKey:
          '0,4,0,3,2,-1,2,1,1,0,1,0,-2,0,0,0,0,-2,-2,-5,1,0,0,-1,0|0,2|0,0',
        equity: 1.314,
        equityLoss: 0.5189999999999999,
      },
      {
        rank: 38,
        moveText: '13/3 8/3 7/2',
        movements: [
          {
            from: 13,
            to: 8,
            die: 5,
            hit: false,
          },
          {
            from: 8,
            to: 3,
            die: 5,
            hit: false,
          },
          {
            from: 8,
            to: 3,
            die: 5,
            hit: false,
          },
          {
            from: 7,
            to: 2,
            die: 5,
            hit: false,
          },
        ],
        finalKey:
          '0,2,1,4,2,-1,4,0,0,0,1,0,-2,0,0,0,0,-2,-2,-5,1,0,0,-1,0|0,2|0,0',
        equity: 1.279,
        equityLoss: 0.554,
      },
      {
        rank: 39,
        moveText: '20/15 7/2 6/1(2)',
        movements: [
          {
            from: 20,
            to: 15,
            die: 5,
            hit: false,
          },
          {
            from: 7,
            to: 2,
            die: 5,
            hit: false,
          },
          {
            from: 6,
            to: 1,
            die: 5,
            hit: false,
          },
          {
            from: 6,
            to: 1,
            die: 5,
            hit: false,
          },
        ],
        finalKey:
          '0,4,1,2,2,-1,2,0,1,0,1,0,-2,1,0,1,0,-2,-2,-5,0,0,0,-1,0|0,2|0,0',
        equity: 1.222,
        equityLoss: 0.611,
      },
      {
        rank: 40,
        moveText: '13/8 7/2 6/1(2)',
        movements: [
          {
            from: 13,
            to: 8,
            die: 5,
            hit: false,
          },
          {
            from: 7,
            to: 2,
            die: 5,
            hit: false,
          },
          {
            from: 6,
            to: 1,
            die: 5,
            hit: false,
          },
          {
            from: 6,
            to: 1,
            die: 5,
            hit: false,
          },
        ],
        finalKey:
          '0,4,1,2,2,-1,2,0,2,0,1,0,-2,0,0,0,0,-2,-2,-5,1,0,0,-1,0|0,2|0,0',
        equity: 1.192,
        equityLoss: 0.641,
      },
      {
        rank: 41,
        moveText: '8/3 7/2 6/1(2)',
        movements: [
          {
            from: 8,
            to: 3,
            die: 5,
            hit: false,
          },
          {
            from: 7,
            to: 2,
            die: 5,
            hit: false,
          },
          {
            from: 6,
            to: 1,
            die: 5,
            hit: false,
          },
          {
            from: 6,
            to: 1,
            die: 5,
            hit: false,
          },
        ],
        finalKey:
          '0,4,1,3,2,-1,2,0,0,0,1,0,-2,1,0,0,0,-2,-2,-5,1,0,0,-1,0|0,2|0,0',
        equity: 1.102,
        equityLoss: 0.7309999999999999,
      },
      {
        rank: 42,
        moveText: '10/5* 6/1(3)',
        movements: [
          {
            from: 10,
            to: 5,
            die: 5,
            hit: true,
          },
          {
            from: 6,
            to: 1,
            die: 5,
            hit: false,
          },
          {
            from: 6,
            to: 1,
            die: 5,
            hit: false,
          },
          {
            from: 6,
            to: 1,
            die: 5,
            hit: false,
          },
        ],
        finalKey:
          '0,5,0,2,2,1,1,1,1,0,0,0,-2,1,0,0,0,-2,-2,-5,1,0,0,-1,0|0,3|0,0',
        equity: 1.015,
        equityLoss: 0.8180000000000001,
      },
      {
        rank: 43,
        moveText: '20/15 6/1(3)',
        movements: [
          {
            from: 20,
            to: 15,
            die: 5,
            hit: false,
          },
          {
            from: 6,
            to: 1,
            die: 5,
            hit: false,
          },
          {
            from: 6,
            to: 1,
            die: 5,
            hit: false,
          },
          {
            from: 6,
            to: 1,
            die: 5,
            hit: false,
          },
        ],
        finalKey:
          '0,5,0,2,2,-1,1,1,1,0,1,0,-2,1,0,1,0,-2,-2,-5,0,0,0,-1,0|0,2|0,0',
        equity: 0.927,
        equityLoss: 0.9059999999999999,
      },
      {
        rank: 44,
        moveText: '13/8 6/1(3)',
        movements: [
          {
            from: 13,
            to: 8,
            die: 5,
            hit: false,
          },
          {
            from: 6,
            to: 1,
            die: 5,
            hit: false,
          },
          {
            from: 6,
            to: 1,
            die: 5,
            hit: false,
          },
          {
            from: 6,
            to: 1,
            die: 5,
            hit: false,
          },
        ],
        finalKey:
          '0,5,0,2,2,-1,1,1,2,0,1,0,-2,0,0,0,0,-2,-2,-5,1,0,0,-1,0|0,2|0,0',
        equity: 0.92,
        equityLoss: 0.9129999999999999,
      },
      {
        rank: 45,
        moveText: '8/3 6/1(3)',
        movements: [
          {
            from: 8,
            to: 3,
            die: 5,
            hit: false,
          },
          {
            from: 6,
            to: 1,
            die: 5,
            hit: false,
          },
          {
            from: 6,
            to: 1,
            die: 5,
            hit: false,
          },
          {
            from: 6,
            to: 1,
            die: 5,
            hit: false,
          },
        ],
        finalKey:
          '0,5,0,3,2,-1,1,1,0,0,1,0,-2,1,0,0,0,-2,-2,-5,1,0,0,-1,0|0,2|0,0',
        equity: 0.718,
        equityLoss: 1.115,
      },
      {
        rank: 46,
        moveText: '6/1(4)',
        movements: [
          {
            from: 6,
            to: 1,
            die: 5,
            hit: false,
          },
          {
            from: 6,
            to: 1,
            die: 5,
            hit: false,
          },
          {
            from: 6,
            to: 1,
            die: 5,
            hit: false,
          },
          {
            from: 6,
            to: 1,
            die: 5,
            hit: false,
          },
        ],
        finalKey:
          '0,6,0,2,2,-1,0,1,1,0,1,0,-2,1,0,0,0,-2,-2,-5,1,0,0,-1,0|0,2|0,0',
        equity: 0.714,
        equityLoss: 1.119,
      },
      {
        rank: 47,
        moveText: '7/2 6/1(3)',
        movements: [
          {
            from: 7,
            to: 2,
            die: 5,
            hit: false,
          },
          {
            from: 6,
            to: 1,
            die: 5,
            hit: false,
          },
          {
            from: 6,
            to: 1,
            die: 5,
            hit: false,
          },
          {
            from: 6,
            to: 1,
            die: 5,
            hit: false,
          },
        ],
        finalKey:
          '0,5,1,2,2,-1,1,0,1,0,1,0,-2,1,0,0,0,-2,-2,-5,1,0,0,-1,0|0,2|0,0',
        equity: 0.508,
        equityLoss: 1.325,
      },
    ],
  },
  {
    id: 'curated-008',
    kind: 'play',
    theme: 'blitzing',
    source: 'curated',
    board: {
      points: [
        0, -1, 2, 2, 2, 2, 3, 2, 0, 0, 0, 0, -3, 0, 1, 0, -2, -2, 0, -4, -2, 0,
        0, 0, 1,
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
      matchLength: 0,
      score: {
        white: 0,
        black: 0,
      },
      cube: {
        value: 1,
        owner: 'center',
      },
    },
    roll: [2, 4],
    answers: [
      {
        rank: 1,
        moveText: '7/1*',
        movements: [
          {
            from: 3,
            to: 1,
            die: 2,
            hit: true,
          },
          {
            from: 7,
            to: 3,
            die: 4,
            hit: false,
          },
        ],
        finalKey:
          '0,1,2,2,2,2,3,1,0,0,0,0,-3,0,1,0,-2,-2,0,-4,-2,0,0,0,1|0,2|0,0',
        equity: 1.475,
        equityLoss: 0,
      },
      {
        rank: 2,
        moveText: '24/18',
        movements: [
          {
            from: 24,
            to: 22,
            die: 2,
            hit: false,
          },
          {
            from: 22,
            to: 18,
            die: 4,
            hit: false,
          },
        ],
        finalKey:
          '0,-1,2,2,2,2,3,2,0,0,0,0,-3,0,1,0,-2,-2,1,-4,-2,0,0,0,0|0,1|0,0',
        equity: 1.407,
        equityLoss: 0.06800000000000006,
      },
      {
        rank: 3,
        moveText: '14/8',
        movements: [
          {
            from: 14,
            to: 10,
            die: 4,
            hit: false,
          },
          {
            from: 10,
            to: 8,
            die: 2,
            hit: false,
          },
        ],
        finalKey:
          '0,-1,2,2,2,2,3,2,1,0,0,0,-3,0,0,0,-2,-2,0,-4,-2,0,0,0,1|0,1|0,0',
        equity: 1.273,
        equityLoss: 0.20200000000000018,
      },
      {
        rank: 4,
        moveText: '24/22 14/10',
        movements: [
          {
            from: 24,
            to: 22,
            die: 2,
            hit: false,
          },
          {
            from: 14,
            to: 10,
            die: 4,
            hit: false,
          },
        ],
        finalKey:
          '0,-1,2,2,2,2,3,2,0,0,1,0,-3,0,0,0,-2,-2,0,-4,-2,0,1,0,0|0,1|0,0',
        equity: 1.261,
        equityLoss: 0.2140000000000002,
      },
      {
        rank: 5,
        moveText: '14/10 6/4',
        movements: [
          {
            from: 6,
            to: 4,
            die: 2,
            hit: false,
          },
          {
            from: 14,
            to: 10,
            die: 4,
            hit: false,
          },
        ],
        finalKey:
          '0,-1,2,2,3,2,2,2,0,0,1,0,-3,0,0,0,-2,-2,0,-4,-2,0,0,0,1|0,1|0,0',
        equity: 1.258,
        equityLoss: 0.21700000000000008,
      },
      {
        rank: 6,
        moveText: '14/10 7/5',
        movements: [
          {
            from: 7,
            to: 5,
            die: 2,
            hit: false,
          },
          {
            from: 14,
            to: 10,
            die: 4,
            hit: false,
          },
        ],
        finalKey:
          '0,-1,2,2,2,3,3,1,0,0,1,0,-3,0,0,0,-2,-2,0,-4,-2,0,0,0,1|0,1|0,0',
        equity: 1.243,
        equityLoss: 0.23199999999999998,
      },
      {
        rank: 7,
        moveText: '7/5 7/3',
        movements: [
          {
            from: 7,
            to: 5,
            die: 2,
            hit: false,
          },
          {
            from: 7,
            to: 3,
            die: 4,
            hit: false,
          },
        ],
        finalKey:
          '0,-1,2,3,2,3,3,0,0,0,0,0,-3,0,1,0,-2,-2,0,-4,-2,0,0,0,1|0,1|0,0',
        equity: 1.188,
        equityLoss: 0.28700000000000014,
      },
      {
        rank: 8,
        moveText: '7/3 6/4',
        movements: [
          {
            from: 6,
            to: 4,
            die: 2,
            hit: false,
          },
          {
            from: 7,
            to: 3,
            die: 4,
            hit: false,
          },
        ],
        finalKey:
          '0,-1,2,3,3,2,2,1,0,0,0,0,-3,0,1,0,-2,-2,0,-4,-2,0,0,0,1|0,1|0,0',
        equity: 1.102,
        equityLoss: 0.373,
      },
      {
        rank: 9,
        moveText: '14/10 3/1*',
        movements: [
          {
            from: 3,
            to: 1,
            die: 2,
            hit: true,
          },
          {
            from: 14,
            to: 10,
            die: 4,
            hit: false,
          },
        ],
        finalKey:
          '0,1,2,1,2,2,3,2,0,0,1,0,-3,0,0,0,-2,-2,0,-4,-2,0,0,0,1|0,2|0,0',
        equity: 1.165,
        equityLoss: 0.31000000000000005,
      },
      {
        rank: 10,
        moveText: '24/22 7/3',
        movements: [
          {
            from: 24,
            to: 22,
            die: 2,
            hit: false,
          },
          {
            from: 7,
            to: 3,
            die: 4,
            hit: false,
          },
        ],
        finalKey:
          '0,-1,2,3,2,2,3,1,0,0,0,0,-3,0,1,0,-2,-2,0,-4,-2,0,1,0,0|0,1|0,0',
        equity: 1.157,
        equityLoss: 0.31800000000000006,
      },
      {
        rank: 11,
        moveText: '7/5 6/2',
        movements: [
          {
            from: 7,
            to: 5,
            die: 2,
            hit: false,
          },
          {
            from: 6,
            to: 2,
            die: 4,
            hit: false,
          },
        ],
        finalKey:
          '0,-1,3,2,2,3,2,1,0,0,0,0,-3,0,1,0,-2,-2,0,-4,-2,0,0,0,1|0,1|0,0',
        equity: 1.156,
        equityLoss: 0.3190000000000002,
      },
      {
        rank: 12,
        moveText: '24/22 6/2',
        movements: [
          {
            from: 24,
            to: 22,
            die: 2,
            hit: false,
          },
          {
            from: 6,
            to: 2,
            die: 4,
            hit: false,
          },
        ],
        finalKey:
          '0,-1,3,2,2,2,2,2,0,0,0,0,-3,0,1,0,-2,-2,0,-4,-2,0,1,0,0|0,1|0,0',
        equity: 1.124,
        equityLoss: 0.351,
      },
      {
        rank: 13,
        moveText: '5/3 5/1*',
        movements: [
          {
            from: 5,
            to: 3,
            die: 2,
            hit: false,
          },
          {
            from: 5,
            to: 1,
            die: 4,
            hit: true,
          },
        ],
        finalKey:
          '0,1,2,3,2,0,3,2,0,0,0,0,-3,0,1,0,-2,-2,0,-4,-2,0,0,0,1|0,2|0,0',
        equity: 1.066,
        equityLoss: 0.40900000000000003,
      },
      {
        rank: 14,
        moveText: '24/22 5/1*',
        movements: [
          {
            from: 24,
            to: 22,
            die: 2,
            hit: false,
          },
          {
            from: 5,
            to: 1,
            die: 4,
            hit: true,
          },
        ],
        finalKey:
          '0,1,2,2,2,1,3,2,0,0,0,0,-3,0,1,0,-2,-2,0,-4,-2,0,1,0,0|0,2|0,0',
        equity: 1.001,
        equityLoss: 0.4740000000000002,
      },
      {
        rank: 15,
        moveText: '5/1* 3/1',
        movements: [
          {
            from: 3,
            to: 1,
            die: 2,
            hit: true,
          },
          {
            from: 5,
            to: 1,
            die: 4,
            hit: false,
          },
        ],
        finalKey:
          '0,2,2,1,2,1,3,2,0,0,0,0,-3,0,1,0,-2,-2,0,-4,-2,0,0,0,1|0,2|0,0',
        equity: 0.986,
        equityLoss: 0.4890000000000001,
      },
      {
        rank: 16,
        moveText: '6/2 3/1*',
        movements: [
          {
            from: 3,
            to: 1,
            die: 2,
            hit: true,
          },
          {
            from: 6,
            to: 2,
            die: 4,
            hit: false,
          },
        ],
        finalKey:
          '0,1,3,1,2,2,2,2,0,0,0,0,-3,0,1,0,-2,-2,0,-4,-2,0,0,0,1|0,2|0,0',
        equity: 0.968,
        equityLoss: 0.5070000000000001,
      },
      {
        rank: 17,
        moveText: '6/4 5/1*',
        movements: [
          {
            from: 6,
            to: 4,
            die: 2,
            hit: false,
          },
          {
            from: 5,
            to: 1,
            die: 4,
            hit: true,
          },
        ],
        finalKey:
          '0,1,2,2,3,1,2,2,0,0,0,0,-3,0,1,0,-2,-2,0,-4,-2,0,0,0,1|0,2|0,0',
        equity: 0.939,
        equityLoss: 0.5360000000000001,
      },
      {
        rank: 18,
        moveText: '14/10 5/3',
        movements: [
          {
            from: 5,
            to: 3,
            die: 2,
            hit: false,
          },
          {
            from: 14,
            to: 10,
            die: 4,
            hit: false,
          },
        ],
        finalKey:
          '0,-1,2,3,2,1,3,2,0,0,1,0,-3,0,0,0,-2,-2,0,-4,-2,0,0,0,1|0,1|0,0',
        equity: 0.773,
        equityLoss: 0.7020000000000001,
      },
      {
        rank: 19,
        moveText: '14/10 4/2',
        movements: [
          {
            from: 4,
            to: 2,
            die: 2,
            hit: false,
          },
          {
            from: 14,
            to: 10,
            die: 4,
            hit: false,
          },
        ],
        finalKey:
          '0,-1,3,2,1,2,3,2,0,0,1,0,-3,0,0,0,-2,-2,0,-4,-2,0,0,0,1|0,1|0,0',
        equity: 0.752,
        equityLoss: 0.7230000000000001,
      },
      {
        rank: 20,
        moveText: '6/4 6/2',
        movements: [
          {
            from: 6,
            to: 4,
            die: 2,
            hit: false,
          },
          {
            from: 6,
            to: 2,
            die: 4,
            hit: false,
          },
        ],
        finalKey:
          '0,-1,3,2,3,2,1,2,0,0,0,0,-3,0,1,0,-2,-2,0,-4,-2,0,0,0,1|0,1|0,0',
        equity: 0.468,
        equityLoss: 1.0070000000000001,
      },
      {
        rank: 21,
        moveText: '6/2 5/3',
        movements: [
          {
            from: 5,
            to: 3,
            die: 2,
            hit: false,
          },
          {
            from: 6,
            to: 2,
            die: 4,
            hit: false,
          },
        ],
        finalKey:
          '0,-1,3,3,2,1,2,2,0,0,0,0,-3,0,1,0,-2,-2,0,-4,-2,0,0,0,1|0,1|0,0',
        equity: 0.419,
        equityLoss: 1.056,
      },
      {
        rank: 22,
        moveText: '7/3 4/2',
        movements: [
          {
            from: 4,
            to: 2,
            die: 2,
            hit: false,
          },
          {
            from: 7,
            to: 3,
            die: 4,
            hit: false,
          },
        ],
        finalKey:
          '0,-1,3,3,1,2,3,1,0,0,0,0,-3,0,1,0,-2,-2,0,-4,-2,0,0,0,1|0,1|0,0',
        equity: 0.393,
        equityLoss: 1.082,
      },
      {
        rank: 23,
        moveText: '7/3 5/3',
        movements: [
          {
            from: 5,
            to: 3,
            die: 2,
            hit: false,
          },
          {
            from: 7,
            to: 3,
            die: 4,
            hit: false,
          },
        ],
        finalKey:
          '0,-1,2,4,2,1,3,1,0,0,0,0,-3,0,1,0,-2,-2,0,-4,-2,0,0,0,1|0,1|0,0',
        equity: 0.364,
        equityLoss: 1.1110000000000002,
      },
      {
        rank: 24,
        moveText: '6/2 4/2',
        movements: [
          {
            from: 4,
            to: 2,
            die: 2,
            hit: false,
          },
          {
            from: 6,
            to: 2,
            die: 4,
            hit: false,
          },
        ],
        finalKey:
          '0,-1,4,2,1,2,2,2,0,0,0,0,-3,0,1,0,-2,-2,0,-4,-2,0,0,0,1|0,1|0,0',
        equity: 0.301,
        equityLoss: 1.1740000000000002,
      },
      {
        rank: 25,
        moveText: '5/1* 4/2',
        movements: [
          {
            from: 4,
            to: 2,
            die: 2,
            hit: false,
          },
          {
            from: 5,
            to: 1,
            die: 4,
            hit: true,
          },
        ],
        finalKey:
          '0,1,3,2,1,1,3,2,0,0,0,0,-3,0,1,0,-2,-2,0,-4,-2,0,0,0,1|0,2|0,0',
        equity: 0.083,
        equityLoss: 1.3920000000000001,
      },
    ],
  },
  {
    id: 'curated-009',
    kind: 'play',
    theme: 'blitzing',
    source: 'curated',
    board: {
      points: [
        0, 2, 2, 0, 2, 2, 2, 0, 1, 2, 0, 0, 0, 0, 0, 0, 0, 0, 0, -2, -3, -2, -3,
        2, -3,
      ],
      bar: {
        white: 0,
        black: 2,
      },
      off: {
        white: 0,
        black: 0,
      },
    },
    hero: 'white',
    match: {
      matchLength: 0,
      score: {
        white: 0,
        black: 0,
      },
      cube: {
        value: 1,
        owner: 'center',
      },
    },
    roll: [6, 6],
    answers: [
      {
        rank: 1,
        moveText: '23/17(2) 9/3(2)',
        movements: [
          {
            from: 23,
            to: 17,
            die: 6,
            hit: false,
          },
          {
            from: 23,
            to: 17,
            die: 6,
            hit: false,
          },
          {
            from: 9,
            to: 3,
            die: 6,
            hit: false,
          },
          {
            from: 9,
            to: 3,
            die: 6,
            hit: false,
          },
        ],
        finalKey:
          '0,2,2,2,2,2,2,0,1,0,0,0,0,0,0,0,0,2,0,-2,-3,-2,-3,0,-3|0,2|0,0',
        equity: 1.394,
        equityLoss: 0,
      },
      {
        rank: 2,
        moveText: '23/11 9/3(2)',
        movements: [
          {
            from: 23,
            to: 17,
            die: 6,
            hit: false,
          },
          {
            from: 17,
            to: 11,
            die: 6,
            hit: false,
          },
          {
            from: 9,
            to: 3,
            die: 6,
            hit: false,
          },
          {
            from: 9,
            to: 3,
            die: 6,
            hit: false,
          },
        ],
        finalKey:
          '0,2,2,2,2,2,2,0,1,0,0,1,0,0,0,0,0,0,0,-2,-3,-2,-3,1,-3|0,2|0,0',
        equity: 1.326,
        equityLoss: 0.06799999999999984,
      },
      {
        rank: 3,
        moveText: '23/17 9/3(2) 8/2',
        movements: [
          {
            from: 23,
            to: 17,
            die: 6,
            hit: false,
          },
          {
            from: 9,
            to: 3,
            die: 6,
            hit: false,
          },
          {
            from: 9,
            to: 3,
            die: 6,
            hit: false,
          },
          {
            from: 8,
            to: 2,
            die: 6,
            hit: false,
          },
        ],
        finalKey:
          '0,2,3,2,2,2,2,0,0,0,0,0,0,0,0,0,0,1,0,-2,-3,-2,-3,1,-3|0,2|0,0',
        equity: 1.292,
        equityLoss: 0.10199999999999987,
      },
      {
        rank: 4,
        moveText: '23/5 23/17',
        movements: [
          {
            from: 23,
            to: 17,
            die: 6,
            hit: false,
          },
          {
            from: 23,
            to: 17,
            die: 6,
            hit: false,
          },
          {
            from: 17,
            to: 11,
            die: 6,
            hit: false,
          },
          {
            from: 11,
            to: 5,
            die: 6,
            hit: false,
          },
        ],
        finalKey:
          '0,2,2,0,2,3,2,0,1,2,0,0,0,0,0,0,0,1,0,-2,-3,-2,-3,0,-3|0,2|0,0',
        equity: 1.251,
        equityLoss: 0.14300000000000002,
      },
      {
        rank: 5,
        moveText: '23/11(2)',
        movements: [
          {
            from: 23,
            to: 17,
            die: 6,
            hit: false,
          },
          {
            from: 23,
            to: 17,
            die: 6,
            hit: false,
          },
          {
            from: 17,
            to: 11,
            die: 6,
            hit: false,
          },
          {
            from: 17,
            to: 11,
            die: 6,
            hit: false,
          },
        ],
        finalKey:
          '0,2,2,0,2,2,2,0,1,2,0,2,0,0,0,0,0,0,0,-2,-3,-2,-3,0,-3|0,2|0,0',
        equity: 1.234,
        equityLoss: 0.15999999999999992,
      },
      {
        rank: 6,
        moveText: '23/11 23/17 8/2',
        movements: [
          {
            from: 23,
            to: 17,
            die: 6,
            hit: false,
          },
          {
            from: 23,
            to: 17,
            die: 6,
            hit: false,
          },
          {
            from: 17,
            to: 11,
            die: 6,
            hit: false,
          },
          {
            from: 8,
            to: 2,
            die: 6,
            hit: false,
          },
        ],
        finalKey:
          '0,2,3,0,2,2,2,0,0,2,0,1,0,0,0,0,0,1,0,-2,-3,-2,-3,0,-3|0,2|0,0',
        equity: 1.161,
        equityLoss: 0.23299999999999987,
      },
      {
        rank: 7,
        moveText: '23/5 8/2',
        movements: [
          {
            from: 23,
            to: 17,
            die: 6,
            hit: false,
          },
          {
            from: 17,
            to: 11,
            die: 6,
            hit: false,
          },
          {
            from: 11,
            to: 5,
            die: 6,
            hit: false,
          },
          {
            from: 8,
            to: 2,
            die: 6,
            hit: false,
          },
        ],
        finalKey:
          '0,2,3,0,2,3,2,0,0,2,0,0,0,0,0,0,0,0,0,-2,-3,-2,-3,1,-3|0,2|0,0',
        equity: 1.094,
        equityLoss: 0.2999999999999998,
      },
      {
        rank: 8,
        moveText: '23/11 23/17 9/3',
        movements: [
          {
            from: 23,
            to: 17,
            die: 6,
            hit: false,
          },
          {
            from: 23,
            to: 17,
            die: 6,
            hit: false,
          },
          {
            from: 17,
            to: 11,
            die: 6,
            hit: false,
          },
          {
            from: 9,
            to: 3,
            die: 6,
            hit: false,
          },
        ],
        finalKey:
          '0,2,2,1,2,2,2,0,1,1,0,1,0,0,0,0,0,1,0,-2,-3,-2,-3,0,-3|0,2|0,0',
        equity: 0.931,
        equityLoss: 0.46299999999999986,
      },
      {
        rank: 9,
        moveText: '23/5 9/3',
        movements: [
          {
            from: 23,
            to: 17,
            die: 6,
            hit: false,
          },
          {
            from: 17,
            to: 11,
            die: 6,
            hit: false,
          },
          {
            from: 11,
            to: 5,
            die: 6,
            hit: false,
          },
          {
            from: 9,
            to: 3,
            die: 6,
            hit: false,
          },
        ],
        finalKey:
          '0,2,2,1,2,3,2,0,1,1,0,0,0,0,0,0,0,0,0,-2,-3,-2,-3,1,-3|0,2|0,0',
        equity: 1.025,
        equityLoss: 0.369,
      },
      {
        rank: 10,
        moveText: '23/17(2) 9/3 8/2',
        movements: [
          {
            from: 23,
            to: 17,
            die: 6,
            hit: false,
          },
          {
            from: 23,
            to: 17,
            die: 6,
            hit: false,
          },
          {
            from: 9,
            to: 3,
            die: 6,
            hit: false,
          },
          {
            from: 8,
            to: 2,
            die: 6,
            hit: false,
          },
        ],
        finalKey:
          '0,2,3,1,2,2,2,0,0,1,0,0,0,0,0,0,0,2,0,-2,-3,-2,-3,0,-3|0,2|0,0',
        equity: 0.948,
        equityLoss: 0.44599999999999995,
      },
      {
        rank: 11,
        moveText: '23/11 9/3 8/2',
        movements: [
          {
            from: 23,
            to: 17,
            die: 6,
            hit: false,
          },
          {
            from: 17,
            to: 11,
            die: 6,
            hit: false,
          },
          {
            from: 9,
            to: 3,
            die: 6,
            hit: false,
          },
          {
            from: 8,
            to: 2,
            die: 6,
            hit: false,
          },
        ],
        finalKey:
          '0,2,3,1,2,2,2,0,0,1,0,1,0,0,0,0,0,0,0,-2,-3,-2,-3,1,-3|0,2|0,0',
        equity: 0.91,
        equityLoss: 0.4839999999999999,
      },
    ],
  },
  {
    id: 'curated-010',
    kind: 'play',
    theme: 'blitzing',
    source: 'curated',
    board: {
      points: [
        0, -1, 0, 2, 2, 3, 3, 0, 1, 0, 0, 1, -2, 2, 0, 0, 0, -2, 1, -4, -2, 0,
        0, -1, -2,
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
      matchLength: 0,
      score: {
        white: 0,
        black: 0,
      },
      cube: {
        value: 1,
        owner: 'center',
      },
    },
    roll: [5, 4],
    answers: [
      {
        rank: 1,
        moveText: '6/1* 5/1',
        movements: [
          {
            from: 6,
            to: 1,
            die: 5,
            hit: true,
          },
          {
            from: 5,
            to: 1,
            die: 4,
            hit: false,
          },
        ],
        finalKey:
          '0,2,0,2,2,2,2,0,1,0,0,1,-2,2,0,0,0,-2,1,-4,-2,0,0,-1,-2|0,2|0,0',
        equity: 1.501,
        equityLoss: 0,
      },
      {
        rank: 2,
        moveText: '18/13 5/1*',
        movements: [
          {
            from: 18,
            to: 13,
            die: 5,
            hit: false,
          },
          {
            from: 5,
            to: 1,
            die: 4,
            hit: true,
          },
        ],
        finalKey:
          '0,1,0,2,2,2,3,0,1,0,0,1,-2,3,0,0,0,-2,0,-4,-2,0,0,-1,-2|0,2|0,0',
        equity: 1.285,
        equityLoss: 0.21599999999999997,
      },
      {
        rank: 3,
        moveText: '11/7 6/1*',
        movements: [
          {
            from: 6,
            to: 1,
            die: 5,
            hit: true,
          },
          {
            from: 11,
            to: 7,
            die: 4,
            hit: false,
          },
        ],
        finalKey:
          '0,1,0,2,2,3,2,1,1,0,0,0,-2,2,0,0,0,-2,1,-4,-2,0,0,-1,-2|0,2|0,0',
        equity: 1.276,
        equityLoss: 0.22499999999999987,
      },
      {
        rank: 4,
        moveText: '13/8 5/1*',
        movements: [
          {
            from: 13,
            to: 8,
            die: 5,
            hit: false,
          },
          {
            from: 5,
            to: 1,
            die: 4,
            hit: true,
          },
        ],
        finalKey:
          '0,1,0,2,2,2,3,0,2,0,0,1,-2,1,0,0,0,-2,1,-4,-2,0,0,-1,-2|0,2|0,0',
        equity: 1.272,
        equityLoss: 0.22899999999999987,
      },
      {
        rank: 5,
        moveText: '18/14 6/1*',
        movements: [
          {
            from: 6,
            to: 1,
            die: 5,
            hit: true,
          },
          {
            from: 18,
            to: 14,
            die: 4,
            hit: false,
          },
        ],
        finalKey:
          '0,1,0,2,2,3,2,0,1,0,0,1,-2,2,1,0,0,-2,0,-4,-2,0,0,-1,-2|0,2|0,0',
        equity: 1.249,
        equityLoss: 0.2519999999999998,
      },
      {
        rank: 6,
        moveText: '11/6 5/1*',
        movements: [
          {
            from: 11,
            to: 6,
            die: 5,
            hit: false,
          },
          {
            from: 5,
            to: 1,
            die: 4,
            hit: true,
          },
        ],
        finalKey:
          '0,1,0,2,2,2,4,0,1,0,0,0,-2,2,0,0,0,-2,1,-4,-2,0,0,-1,-2|0,2|0,0',
        equity: 1.248,
        equityLoss: 0.2529999999999999,
      },
      {
        rank: 7,
        moveText: '8/3 5/1*',
        movements: [
          {
            from: 8,
            to: 3,
            die: 5,
            hit: false,
          },
          {
            from: 5,
            to: 1,
            die: 4,
            hit: true,
          },
        ],
        finalKey:
          '0,1,0,3,2,2,3,0,0,0,0,1,-2,2,0,0,0,-2,1,-4,-2,0,0,-1,-2|0,2|0,0',
        equity: 1.246,
        equityLoss: 0.2549999999999999,
      },
      {
        rank: 8,
        moveText: '8/4 6/1*',
        movements: [
          {
            from: 6,
            to: 1,
            die: 5,
            hit: true,
          },
          {
            from: 8,
            to: 4,
            die: 4,
            hit: false,
          },
        ],
        finalKey:
          '0,1,0,2,3,3,2,0,0,0,0,1,-2,2,0,0,0,-2,1,-4,-2,0,0,-1,-2|0,2|0,0',
        equity: 1.238,
        equityLoss: 0.2629999999999999,
      },
      {
        rank: 9,
        moveText: '13/9 6/1*',
        movements: [
          {
            from: 6,
            to: 1,
            die: 5,
            hit: true,
          },
          {
            from: 13,
            to: 9,
            die: 4,
            hit: false,
          },
        ],
        finalKey:
          '0,1,0,2,2,3,2,0,1,1,0,1,-2,1,0,0,0,-2,1,-4,-2,0,0,-1,-2|0,2|0,0',
        equity: 1.228,
        equityLoss: 0.2729999999999999,
      },
      {
        rank: 10,
        moveText: '18/9',
        movements: [
          {
            from: 18,
            to: 13,
            die: 5,
            hit: false,
          },
          {
            from: 13,
            to: 9,
            die: 4,
            hit: false,
          },
        ],
        finalKey:
          '0,-1,0,2,2,3,3,0,1,1,0,1,-2,2,0,0,0,-2,0,-4,-2,0,0,-1,-2|0,1|0,0',
        equity: 1.211,
        equityLoss: 0.2899999999999998,
      },
      {
        rank: 11,
        moveText: '18/13 8/4',
        movements: [
          {
            from: 18,
            to: 13,
            die: 5,
            hit: false,
          },
          {
            from: 8,
            to: 4,
            die: 4,
            hit: false,
          },
        ],
        finalKey:
          '0,-1,0,2,3,3,3,0,0,0,0,1,-2,3,0,0,0,-2,0,-4,-2,0,0,-1,-2|0,1|0,0',
        equity: 1.21,
        equityLoss: 0.2909999999999999,
      },
      {
        rank: 12,
        moveText: '18/13 11/7',
        movements: [
          {
            from: 18,
            to: 13,
            die: 5,
            hit: false,
          },
          {
            from: 11,
            to: 7,
            die: 4,
            hit: false,
          },
        ],
        finalKey:
          '0,-1,0,2,2,3,3,1,1,0,0,0,-2,3,0,0,0,-2,0,-4,-2,0,0,-1,-2|0,1|0,0',
        equity: 1.207,
        equityLoss: 0.2939999999999998,
      },
      {
        rank: 13,
        moveText: '18/14 13/8',
        movements: [
          {
            from: 13,
            to: 8,
            die: 5,
            hit: false,
          },
          {
            from: 18,
            to: 14,
            die: 4,
            hit: false,
          },
        ],
        finalKey:
          '0,-1,0,2,2,3,3,0,2,0,0,1,-2,1,1,0,0,-2,0,-4,-2,0,0,-1,-2|0,1|0,0',
        equity: 1.203,
        equityLoss: 0.2979999999999998,
      },
      {
        rank: 14,
        moveText: '18/14 8/3',
        movements: [
          {
            from: 8,
            to: 3,
            die: 5,
            hit: false,
          },
          {
            from: 18,
            to: 14,
            die: 4,
            hit: false,
          },
        ],
        finalKey:
          '0,-1,0,3,2,3,3,0,0,0,0,1,-2,2,1,0,0,-2,0,-4,-2,0,0,-1,-2|0,1|0,0',
        equity: 1.2,
        equityLoss: 0.30099999999999993,
      },
      {
        rank: 15,
        moveText: '11/6 8/4',
        movements: [
          {
            from: 11,
            to: 6,
            die: 5,
            hit: false,
          },
          {
            from: 8,
            to: 4,
            die: 4,
            hit: false,
          },
        ],
        finalKey:
          '0,-1,0,2,3,3,4,0,0,0,0,0,-2,2,0,0,0,-2,1,-4,-2,0,0,-1,-2|0,1|0,0',
        equity: 1.196,
        equityLoss: 0.30499999999999994,
      },
      {
        rank: 16,
        moveText: '18/14 11/6',
        movements: [
          {
            from: 11,
            to: 6,
            die: 5,
            hit: false,
          },
          {
            from: 18,
            to: 14,
            die: 4,
            hit: false,
          },
        ],
        finalKey:
          '0,-1,0,2,2,3,4,0,1,0,0,0,-2,2,1,0,0,-2,0,-4,-2,0,0,-1,-2|0,1|0,0',
        equity: 1.194,
        equityLoss: 0.30699999999999994,
      },
      {
        rank: 17,
        moveText: '13/9 13/8',
        movements: [
          {
            from: 13,
            to: 8,
            die: 5,
            hit: false,
          },
          {
            from: 13,
            to: 9,
            die: 4,
            hit: false,
          },
        ],
        finalKey:
          '0,-1,0,2,2,3,3,0,2,1,0,1,-2,0,0,0,0,-2,1,-4,-2,0,0,-1,-2|0,1|0,0',
        equity: 1.18,
        equityLoss: 0.32099999999999995,
      },
      {
        rank: 18,
        moveText: '11/7 8/3',
        movements: [
          {
            from: 8,
            to: 3,
            die: 5,
            hit: false,
          },
          {
            from: 11,
            to: 7,
            die: 4,
            hit: false,
          },
        ],
        finalKey:
          '0,-1,0,3,2,3,3,1,0,0,0,0,-2,2,0,0,0,-2,1,-4,-2,0,0,-1,-2|0,1|0,0',
        equity: 1.168,
        equityLoss: 0.33299999999999996,
      },
      {
        rank: 19,
        moveText: '13/8 11/7',
        movements: [
          {
            from: 13,
            to: 8,
            die: 5,
            hit: false,
          },
          {
            from: 11,
            to: 7,
            die: 4,
            hit: false,
          },
        ],
        finalKey:
          '0,-1,0,2,2,3,3,1,2,0,0,0,-2,1,0,0,0,-2,1,-4,-2,0,0,-1,-2|0,1|0,0',
        equity: 1.16,
        equityLoss: 0.34099999999999997,
      },
      {
        rank: 20,
        moveText: '13/4',
        movements: [
          {
            from: 13,
            to: 8,
            die: 5,
            hit: false,
          },
          {
            from: 8,
            to: 4,
            die: 4,
            hit: false,
          },
        ],
        finalKey:
          '0,-1,0,2,3,3,3,0,1,0,0,1,-2,1,0,0,0,-2,1,-4,-2,0,0,-1,-2|0,1|0,0',
        equity: 1.159,
        equityLoss: 0.34199999999999986,
      },
      {
        rank: 21,
        moveText: '13/9 8/3',
        movements: [
          {
            from: 8,
            to: 3,
            die: 5,
            hit: false,
          },
          {
            from: 13,
            to: 9,
            die: 4,
            hit: false,
          },
        ],
        finalKey:
          '0,-1,0,3,2,3,3,0,0,1,0,1,-2,1,0,0,0,-2,1,-4,-2,0,0,-1,-2|0,1|0,0',
        equity: 1.154,
        equityLoss: 0.347,
      },
      {
        rank: 22,
        moveText: '13/9 11/6',
        movements: [
          {
            from: 11,
            to: 6,
            die: 5,
            hit: false,
          },
          {
            from: 13,
            to: 9,
            die: 4,
            hit: false,
          },
        ],
        finalKey:
          '0,-1,0,2,2,3,4,0,1,1,0,0,-2,1,0,0,0,-2,1,-4,-2,0,0,-1,-2|0,1|0,0',
        equity: 1.132,
        equityLoss: 0.369,
      },
      {
        rank: 23,
        moveText: '18/13 6/2',
        movements: [
          {
            from: 18,
            to: 13,
            die: 5,
            hit: false,
          },
          {
            from: 6,
            to: 2,
            die: 4,
            hit: false,
          },
        ],
        finalKey:
          '0,-1,1,2,2,3,2,0,1,0,0,1,-2,3,0,0,0,-2,0,-4,-2,0,0,-1,-2|0,1|0,0',
        equity: 1.088,
        equityLoss: 0.4129999999999998,
      },
      {
        rank: 24,
        moveText: '11/2',
        movements: [
          {
            from: 11,
            to: 6,
            die: 5,
            hit: false,
          },
          {
            from: 6,
            to: 2,
            die: 4,
            hit: false,
          },
        ],
        finalKey:
          '0,-1,1,2,2,3,3,0,1,0,0,0,-2,2,0,0,0,-2,1,-4,-2,0,0,-1,-2|0,1|0,0',
        equity: 1.072,
        equityLoss: 0.4289999999999998,
      },
      {
        rank: 25,
        moveText: '13/8 6/2',
        movements: [
          {
            from: 13,
            to: 8,
            die: 5,
            hit: false,
          },
          {
            from: 6,
            to: 2,
            die: 4,
            hit: false,
          },
        ],
        finalKey:
          '0,-1,1,2,2,3,2,0,2,0,0,1,-2,1,0,0,0,-2,1,-4,-2,0,0,-1,-2|0,1|0,0',
        equity: 1.03,
        equityLoss: 0.47099999999999986,
      },
      {
        rank: 26,
        moveText: '8/3 6/2',
        movements: [
          {
            from: 8,
            to: 3,
            die: 5,
            hit: false,
          },
          {
            from: 6,
            to: 2,
            die: 4,
            hit: false,
          },
        ],
        finalKey:
          '0,-1,1,3,2,3,2,0,0,0,0,1,-2,2,0,0,0,-2,1,-4,-2,0,0,-1,-2|0,1|0,0',
        equity: 1.027,
        equityLoss: 0.474,
      },
      {
        rank: 27,
        moveText: '6/2 6/1*',
        movements: [
          {
            from: 6,
            to: 1,
            die: 5,
            hit: true,
          },
          {
            from: 6,
            to: 2,
            die: 4,
            hit: false,
          },
        ],
        finalKey:
          '0,1,1,2,2,3,1,0,1,0,0,1,-2,2,0,0,0,-2,1,-4,-2,0,0,-1,-2|0,2|0,0',
        equity: 0.067,
        equityLoss: 1.434,
      },
    ],
  },
  {
    id: 'curated-011',
    kind: 'play',
    theme: 'blitzing',
    source: 'curated',
    board: {
      points: [
        0, -1, 0, 2, 1, 2, 2, 1, 1, 0, 0, 1, -2, 3, -2, 0, 0, -3, 0, -3, 2, -2,
        -1, 0, 0,
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
      matchLength: 0,
      score: {
        white: 0,
        black: 0,
      },
      cube: {
        value: 1,
        owner: 'center',
      },
    },
    roll: [2, 5],
    answers: [
      {
        rank: 1,
        moveText: '11/4',
        movements: [
          {
            from: 6,
            to: 4,
            die: 2,
            hit: false,
          },
          {
            from: 11,
            to: 6,
            die: 5,
            hit: false,
          },
        ],
        finalKey:
          '0,-1,0,2,2,2,2,1,1,0,0,0,-2,3,-2,0,0,-3,0,-3,2,-2,-1,0,0|0,1|0,0',
        equity: 1.048,
        equityLoss: 0,
      },
      {
        rank: 2,
        moveText: '7/2 4/2',
        movements: [
          {
            from: 4,
            to: 2,
            die: 2,
            hit: false,
          },
          {
            from: 7,
            to: 2,
            die: 5,
            hit: false,
          },
        ],
        finalKey:
          '0,-1,2,2,0,2,2,0,1,0,0,1,-2,3,-2,0,0,-3,0,-3,2,-2,-1,0,0|0,1|0,0',
        equity: 0.888,
        equityLoss: 0.16000000000000003,
      },
      {
        rank: 3,
        moveText: '6/4 6/1*',
        movements: [
          {
            from: 6,
            to: 4,
            die: 2,
            hit: false,
          },
          {
            from: 6,
            to: 1,
            die: 5,
            hit: true,
          },
        ],
        finalKey:
          '0,1,0,2,2,2,0,1,1,0,0,1,-2,3,-2,0,0,-3,0,-3,2,-2,-1,0,0|0,2|0,0',
        equity: 0.716,
        equityLoss: 0.3320000000000001,
      },
      {
        rank: 4,
        moveText: '13/8 7/5',
        movements: [
          {
            from: 7,
            to: 5,
            die: 2,
            hit: false,
          },
          {
            from: 13,
            to: 8,
            die: 5,
            hit: false,
          },
        ],
        finalKey:
          '0,-1,0,2,1,3,2,0,2,0,0,1,-2,2,-2,0,0,-3,0,-3,2,-2,-1,0,0|0,1|0,0',
        equity: 0.667,
        equityLoss: 0.381,
      },
      {
        rank: 5,
        moveText: '11/6 7/5',
        movements: [
          {
            from: 7,
            to: 5,
            die: 2,
            hit: false,
          },
          {
            from: 11,
            to: 6,
            die: 5,
            hit: false,
          },
        ],
        finalKey:
          '0,-1,0,2,1,3,3,0,1,0,0,0,-2,3,-2,0,0,-3,0,-3,2,-2,-1,0,0|0,1|0,0',
        equity: 0.602,
        equityLoss: 0.44600000000000006,
      },
      {
        rank: 6,
        moveText: '13/8 11/9',
        movements: [
          {
            from: 11,
            to: 9,
            die: 2,
            hit: false,
          },
          {
            from: 13,
            to: 8,
            die: 5,
            hit: false,
          },
        ],
        finalKey:
          '0,-1,0,2,1,2,2,1,2,1,0,0,-2,2,-2,0,0,-3,0,-3,2,-2,-1,0,0|0,1|0,0',
        equity: 0.563,
        equityLoss: 0.4850000000000001,
      },
      {
        rank: 7,
        moveText: '13/8 6/4',
        movements: [
          {
            from: 6,
            to: 4,
            die: 2,
            hit: false,
          },
          {
            from: 13,
            to: 8,
            die: 5,
            hit: false,
          },
        ],
        finalKey:
          '0,-1,0,2,2,2,1,1,2,0,0,1,-2,2,-2,0,0,-3,0,-3,2,-2,-1,0,0|0,1|0,0',
        equity: 0.548,
        equityLoss: 0.5,
      },
      {
        rank: 8,
        moveText: '13/6',
        movements: [
          {
            from: 8,
            to: 6,
            die: 2,
            hit: false,
          },
          {
            from: 13,
            to: 8,
            die: 5,
            hit: false,
          },
        ],
        finalKey:
          '0,-1,0,2,1,2,3,1,1,0,0,1,-2,2,-2,0,0,-3,0,-3,2,-2,-1,0,0|0,1|0,0',
        equity: 0.475,
        equityLoss: 0.5730000000000001,
      },
      {
        rank: 9,
        moveText: '8/1*',
        movements: [
          {
            from: 3,
            to: 1,
            die: 2,
            hit: true,
          },
          {
            from: 8,
            to: 3,
            die: 5,
            hit: false,
          },
        ],
        finalKey:
          '0,1,0,2,1,2,2,1,0,0,0,1,-2,3,-2,0,0,-3,0,-3,2,-2,-1,0,0|0,2|0,0',
        equity: 0.571,
        equityLoss: 0.4770000000000001,
      },
      {
        rank: 10,
        moveText: '13/11 13/8',
        movements: [
          {
            from: 13,
            to: 11,
            die: 2,
            hit: false,
          },
          {
            from: 13,
            to: 8,
            die: 5,
            hit: false,
          },
        ],
        finalKey:
          '0,-1,0,2,1,2,2,1,2,0,0,2,-2,1,-2,0,0,-3,0,-3,2,-2,-1,0,0|0,1|0,0',
        equity: 0.547,
        equityLoss: 0.501,
      },
      {
        rank: 11,
        moveText: '11/6 8/6',
        movements: [
          {
            from: 8,
            to: 6,
            die: 2,
            hit: false,
          },
          {
            from: 11,
            to: 6,
            die: 5,
            hit: false,
          },
        ],
        finalKey:
          '0,-1,0,2,1,2,4,1,0,0,0,0,-2,3,-2,0,0,-3,0,-3,2,-2,-1,0,0|0,1|0,0',
        equity: 0.517,
        equityLoss: 0.531,
      },
      {
        rank: 12,
        moveText: '13/8 4/2',
        movements: [
          {
            from: 4,
            to: 2,
            die: 2,
            hit: false,
          },
          {
            from: 13,
            to: 8,
            die: 5,
            hit: false,
          },
        ],
        finalKey:
          '0,-1,1,2,0,2,2,1,2,0,0,1,-2,2,-2,0,0,-3,0,-3,2,-2,-1,0,0|0,1|0,0',
        equity: 0.496,
        equityLoss: 0.552,
      },
      {
        rank: 13,
        moveText: '8/3 7/5',
        movements: [
          {
            from: 7,
            to: 5,
            die: 2,
            hit: false,
          },
          {
            from: 8,
            to: 3,
            die: 5,
            hit: false,
          },
        ],
        finalKey:
          '0,-1,0,3,1,3,2,0,0,0,0,1,-2,3,-2,0,0,-3,0,-3,2,-2,-1,0,0|0,1|0,0',
        equity: 0.459,
        equityLoss: 0.589,
      },
      {
        rank: 14,
        moveText: '11/6 4/2',
        movements: [
          {
            from: 4,
            to: 2,
            die: 2,
            hit: false,
          },
          {
            from: 11,
            to: 6,
            die: 5,
            hit: false,
          },
        ],
        finalKey:
          '0,-1,1,2,0,2,3,1,1,0,0,0,-2,3,-2,0,0,-3,0,-3,2,-2,-1,0,0|0,1|0,0',
        equity: 0.453,
        equityLoss: 0.595,
      },
      {
        rank: 15,
        moveText: '13/11 8/3',
        movements: [
          {
            from: 13,
            to: 11,
            die: 2,
            hit: false,
          },
          {
            from: 8,
            to: 3,
            die: 5,
            hit: false,
          },
        ],
        finalKey:
          '0,-1,0,3,1,2,2,1,0,0,0,2,-2,2,-2,0,0,-3,0,-3,2,-2,-1,0,0|0,1|0,0',
        equity: 0.401,
        equityLoss: 0.647,
      },
      {
        rank: 16,
        moveText: '13/11 7/2',
        movements: [
          {
            from: 13,
            to: 11,
            die: 2,
            hit: false,
          },
          {
            from: 7,
            to: 2,
            die: 5,
            hit: false,
          },
        ],
        finalKey:
          '0,-1,1,2,1,2,2,0,1,0,0,2,-2,2,-2,0,0,-3,0,-3,2,-2,-1,0,0|0,1|0,0',
        equity: 0.384,
        equityLoss: 0.664,
      },
      {
        rank: 17,
        moveText: '8/6 7/2',
        movements: [
          {
            from: 8,
            to: 6,
            die: 2,
            hit: false,
          },
          {
            from: 7,
            to: 2,
            die: 5,
            hit: false,
          },
        ],
        finalKey:
          '0,-1,1,2,1,2,3,0,0,0,0,1,-2,3,-2,0,0,-3,0,-3,2,-2,-1,0,0|0,1|0,0',
        equity: 0.379,
        equityLoss: 0.669,
      },
      {
        rank: 18,
        moveText: '11/9 8/3',
        movements: [
          {
            from: 11,
            to: 9,
            die: 2,
            hit: false,
          },
          {
            from: 8,
            to: 3,
            die: 5,
            hit: false,
          },
        ],
        finalKey:
          '0,-1,0,3,1,2,2,1,0,1,0,0,-2,3,-2,0,0,-3,0,-3,2,-2,-1,0,0|0,1|0,0',
        equity: 0.354,
        equityLoss: 0.6940000000000001,
      },
      {
        rank: 19,
        moveText: '8/3 6/4',
        movements: [
          {
            from: 6,
            to: 4,
            die: 2,
            hit: false,
          },
          {
            from: 8,
            to: 3,
            die: 5,
            hit: false,
          },
        ],
        finalKey:
          '0,-1,0,3,2,2,1,1,0,0,0,1,-2,3,-2,0,0,-3,0,-3,2,-2,-1,0,0|0,1|0,0',
        equity: 0.342,
        equityLoss: 0.706,
      },
      {
        rank: 20,
        moveText: '11/9 7/2',
        movements: [
          {
            from: 11,
            to: 9,
            die: 2,
            hit: false,
          },
          {
            from: 7,
            to: 2,
            die: 5,
            hit: false,
          },
        ],
        finalKey:
          '0,-1,1,2,1,2,2,0,1,1,0,0,-2,3,-2,0,0,-3,0,-3,2,-2,-1,0,0|0,1|0,0',
        equity: 0.33,
        equityLoss: 0.718,
      },
      {
        rank: 21,
        moveText: '20/18 13/8',
        movements: [
          {
            from: 20,
            to: 18,
            die: 2,
            hit: false,
          },
          {
            from: 13,
            to: 8,
            die: 5,
            hit: false,
          },
        ],
        finalKey:
          '0,-1,0,2,1,2,2,1,2,0,0,1,-2,2,-2,0,0,-3,1,-3,1,-2,-1,0,0|0,1|0,0',
        equity: 0.307,
        equityLoss: 0.7410000000000001,
      },
      {
        rank: 22,
        moveText: '20/15 7/5',
        movements: [
          {
            from: 7,
            to: 5,
            die: 2,
            hit: false,
          },
          {
            from: 20,
            to: 15,
            die: 5,
            hit: false,
          },
        ],
        finalKey:
          '0,-1,0,2,1,3,2,0,1,0,0,1,-2,3,-2,1,0,-3,0,-3,1,-2,-1,0,0|0,1|0,0',
        equity: 0.292,
        equityLoss: 0.756,
      },
      {
        rank: 23,
        moveText: '20/13',
        movements: [
          {
            from: 20,
            to: 18,
            die: 2,
            hit: false,
          },
          {
            from: 18,
            to: 13,
            die: 5,
            hit: false,
          },
        ],
        finalKey:
          '0,-1,0,2,1,2,2,1,1,0,0,1,-2,4,-2,0,0,-3,0,-3,1,-2,-1,0,0|0,1|0,0',
        equity: 0.291,
        equityLoss: 0.7570000000000001,
      },
      {
        rank: 24,
        moveText: '20/15 13/11',
        movements: [
          {
            from: 13,
            to: 11,
            die: 2,
            hit: false,
          },
          {
            from: 20,
            to: 15,
            die: 5,
            hit: false,
          },
        ],
        finalKey:
          '0,-1,0,2,1,2,2,1,1,0,0,2,-2,2,-2,1,0,-3,0,-3,1,-2,-1,0,0|0,1|0,0',
        equity: 0.281,
        equityLoss: 0.767,
      },
      {
        rank: 25,
        moveText: '8/3 4/2',
        movements: [
          {
            from: 4,
            to: 2,
            die: 2,
            hit: false,
          },
          {
            from: 8,
            to: 3,
            die: 5,
            hit: false,
          },
        ],
        finalKey:
          '0,-1,1,3,0,2,2,1,0,0,0,1,-2,3,-2,0,0,-3,0,-3,2,-2,-1,0,0|0,1|0,0',
        equity: 0.272,
        equityLoss: 0.776,
      },
      {
        rank: 26,
        moveText: '20/15 8/6',
        movements: [
          {
            from: 8,
            to: 6,
            die: 2,
            hit: false,
          },
          {
            from: 20,
            to: 15,
            die: 5,
            hit: false,
          },
        ],
        finalKey:
          '0,-1,0,2,1,2,3,1,0,0,0,1,-2,3,-2,1,0,-3,0,-3,1,-2,-1,0,0|0,1|0,0',
        equity: 0.262,
        equityLoss: 0.786,
      },
      {
        rank: 27,
        moveText: '20/15 11/9',
        movements: [
          {
            from: 11,
            to: 9,
            die: 2,
            hit: false,
          },
          {
            from: 20,
            to: 15,
            die: 5,
            hit: false,
          },
        ],
        finalKey:
          '0,-1,0,2,1,2,2,1,1,1,0,0,-2,3,-2,1,0,-3,0,-3,1,-2,-1,0,0|0,1|0,0',
        equity: 0.231,
        equityLoss: 0.8170000000000001,
      },
      {
        rank: 28,
        moveText: '7/2 6/4',
        movements: [
          {
            from: 6,
            to: 4,
            die: 2,
            hit: false,
          },
          {
            from: 7,
            to: 2,
            die: 5,
            hit: false,
          },
        ],
        finalKey:
          '0,-1,1,2,2,2,1,0,1,0,0,1,-2,3,-2,0,0,-3,0,-3,2,-2,-1,0,0|0,1|0,0',
        equity: 0.218,
        equityLoss: 0.8300000000000001,
      },
      {
        rank: 29,
        moveText: '20/18 11/6',
        movements: [
          {
            from: 20,
            to: 18,
            die: 2,
            hit: false,
          },
          {
            from: 11,
            to: 6,
            die: 5,
            hit: false,
          },
        ],
        finalKey:
          '0,-1,0,2,1,2,3,1,1,0,0,0,-2,3,-2,0,0,-3,1,-3,1,-2,-1,0,0|0,1|0,0',
        equity: 0.209,
        equityLoss: 0.8390000000000001,
      },
      {
        rank: 30,
        moveText: '20/15 6/4',
        movements: [
          {
            from: 6,
            to: 4,
            die: 2,
            hit: false,
          },
          {
            from: 20,
            to: 15,
            die: 5,
            hit: false,
          },
        ],
        finalKey:
          '0,-1,0,2,2,2,1,1,1,0,0,1,-2,3,-2,1,0,-3,0,-3,1,-2,-1,0,0|0,1|0,0',
        equity: 0.173,
        equityLoss: 0.875,
      },
      {
        rank: 31,
        moveText: '13/8 3/1*',
        movements: [
          {
            from: 3,
            to: 1,
            die: 2,
            hit: true,
          },
          {
            from: 13,
            to: 8,
            die: 5,
            hit: false,
          },
        ],
        finalKey:
          '0,1,0,1,1,2,2,1,2,0,0,1,-2,2,-2,0,0,-3,0,-3,2,-2,-1,0,0|0,2|0,0',
        equity: 0.152,
        equityLoss: 0.896,
      },
      {
        rank: 32,
        moveText: '20/18 20/15',
        movements: [
          {
            from: 20,
            to: 18,
            die: 2,
            hit: false,
          },
          {
            from: 20,
            to: 15,
            die: 5,
            hit: false,
          },
        ],
        finalKey:
          '0,-1,0,2,1,2,2,1,1,0,0,1,-2,3,-2,1,0,-3,1,-3,0,-2,-1,0,0|0,1|0,0',
        equity: 0.109,
        equityLoss: 0.9390000000000001,
      },
      {
        rank: 33,
        moveText: '11/6 3/1*',
        movements: [
          {
            from: 3,
            to: 1,
            die: 2,
            hit: true,
          },
          {
            from: 11,
            to: 6,
            die: 5,
            hit: false,
          },
        ],
        finalKey:
          '0,1,0,1,1,2,3,1,1,0,0,0,-2,3,-2,0,0,-3,0,-3,2,-2,-1,0,0|0,2|0,0',
        equity: 0.109,
        equityLoss: 0.9390000000000001,
      },
      {
        rank: 34,
        moveText: '20/15 4/2',
        movements: [
          {
            from: 4,
            to: 2,
            die: 2,
            hit: false,
          },
          {
            from: 20,
            to: 15,
            die: 5,
            hit: false,
          },
        ],
        finalKey:
          '0,-1,1,2,0,2,2,1,1,0,0,1,-2,3,-2,1,0,-3,0,-3,1,-2,-1,0,0|0,1|0,0',
        equity: 0.098,
        equityLoss: 0.9500000000000001,
      },
      {
        rank: 35,
        moveText: '20/18 8/3',
        movements: [
          {
            from: 20,
            to: 18,
            die: 2,
            hit: false,
          },
          {
            from: 8,
            to: 3,
            die: 5,
            hit: false,
          },
        ],
        finalKey:
          '0,-1,0,3,1,2,2,1,0,0,0,1,-2,3,-2,0,0,-3,1,-3,1,-2,-1,0,0|0,1|0,0',
        equity: 0.029,
        equityLoss: 1.0190000000000001,
      },
      {
        rank: 36,
        moveText: '13/11 6/1*',
        movements: [
          {
            from: 13,
            to: 11,
            die: 2,
            hit: false,
          },
          {
            from: 6,
            to: 1,
            die: 5,
            hit: true,
          },
        ],
        finalKey:
          '0,1,0,2,1,2,1,1,1,0,0,2,-2,2,-2,0,0,-3,0,-3,2,-2,-1,0,0|0,2|0,0',
        equity: -0.039,
        equityLoss: 1.087,
      },
      {
        rank: 37,
        moveText: '20/18 7/2',
        movements: [
          {
            from: 20,
            to: 18,
            die: 2,
            hit: false,
          },
          {
            from: 7,
            to: 2,
            die: 5,
            hit: false,
          },
        ],
        finalKey:
          '0,-1,1,2,1,2,2,0,1,0,0,1,-2,3,-2,0,0,-3,1,-3,1,-2,-1,0,0|0,1|0,0',
        equity: -0.07,
        equityLoss: 1.118,
      },
      {
        rank: 38,
        moveText: '11/9 6/1*',
        movements: [
          {
            from: 11,
            to: 9,
            die: 2,
            hit: false,
          },
          {
            from: 6,
            to: 1,
            die: 5,
            hit: true,
          },
        ],
        finalKey:
          '0,1,0,2,1,2,1,1,1,1,0,0,-2,3,-2,0,0,-3,0,-3,2,-2,-1,0,0|0,2|0,0',
        equity: -0.075,
        equityLoss: 1.123,
      },
      {
        rank: 39,
        moveText: '7/5 6/1*',
        movements: [
          {
            from: 7,
            to: 5,
            die: 2,
            hit: false,
          },
          {
            from: 6,
            to: 1,
            die: 5,
            hit: true,
          },
        ],
        finalKey:
          '0,1,0,2,1,3,1,0,1,0,0,1,-2,3,-2,0,0,-3,0,-3,2,-2,-1,0,0|0,2|0,0',
        equity: -0.129,
        equityLoss: 1.177,
      },
      {
        rank: 40,
        moveText: '13/8 5/3',
        movements: [
          {
            from: 5,
            to: 3,
            die: 2,
            hit: false,
          },
          {
            from: 13,
            to: 8,
            die: 5,
            hit: false,
          },
        ],
        finalKey:
          '0,-1,0,3,1,1,2,1,2,0,0,1,-2,2,-2,0,0,-3,0,-3,2,-2,-1,0,0|0,1|0,0',
        equity: -0.191,
        equityLoss: 1.239,
      },
      {
        rank: 41,
        moveText: '6/1* 4/2',
        movements: [
          {
            from: 4,
            to: 2,
            die: 2,
            hit: false,
          },
          {
            from: 6,
            to: 1,
            die: 5,
            hit: true,
          },
        ],
        finalKey:
          '0,1,1,2,0,2,1,1,1,0,0,1,-2,3,-2,0,0,-3,0,-3,2,-2,-1,0,0|0,2|0,0',
        equity: -0.211,
        equityLoss: 1.2590000000000001,
      },
      {
        rank: 42,
        moveText: '6/1* 3/1',
        movements: [
          {
            from: 3,
            to: 1,
            die: 2,
            hit: true,
          },
          {
            from: 6,
            to: 1,
            die: 5,
            hit: false,
          },
        ],
        finalKey:
          '0,2,0,1,1,2,1,1,1,0,0,1,-2,3,-2,0,0,-3,0,-3,2,-2,-1,0,0|0,2|0,0',
        equity: -0.255,
        equityLoss: 1.303,
      },
      {
        rank: 43,
        moveText: '20/15 3/1*',
        movements: [
          {
            from: 3,
            to: 1,
            die: 2,
            hit: true,
          },
          {
            from: 20,
            to: 15,
            die: 5,
            hit: false,
          },
        ],
        finalKey:
          '0,1,0,1,1,2,2,1,1,0,0,1,-2,3,-2,1,0,-3,0,-3,1,-2,-1,0,0|0,2|0,0',
        equity: -0.284,
        equityLoss: 1.332,
      },
      {
        rank: 44,
        moveText: '11/6 5/3',
        movements: [
          {
            from: 5,
            to: 3,
            die: 2,
            hit: false,
          },
          {
            from: 11,
            to: 6,
            die: 5,
            hit: false,
          },
        ],
        finalKey:
          '0,-1,0,3,1,1,3,1,1,0,0,0,-2,3,-2,0,0,-3,0,-3,2,-2,-1,0,0|0,1|0,0',
        equity: -0.304,
        equityLoss: 1.352,
      },
      {
        rank: 45,
        moveText: '7/2 3/1*',
        movements: [
          {
            from: 3,
            to: 1,
            die: 2,
            hit: true,
          },
          {
            from: 7,
            to: 2,
            die: 5,
            hit: false,
          },
        ],
        finalKey:
          '0,1,1,1,1,2,2,0,1,0,0,1,-2,3,-2,0,0,-3,0,-3,2,-2,-1,0,0|0,2|0,0',
        equity: -0.309,
        equityLoss: 1.357,
      },
      {
        rank: 46,
        moveText: '20/18 6/1*',
        movements: [
          {
            from: 20,
            to: 18,
            die: 2,
            hit: false,
          },
          {
            from: 6,
            to: 1,
            die: 5,
            hit: true,
          },
        ],
        finalKey:
          '0,1,0,2,1,2,1,1,1,0,0,1,-2,3,-2,0,0,-3,1,-3,1,-2,-1,0,0|0,2|0,0',
        equity: -0.454,
        equityLoss: 1.502,
      },
      {
        rank: 47,
        moveText: '7/2 5/3',
        movements: [
          {
            from: 5,
            to: 3,
            die: 2,
            hit: false,
          },
          {
            from: 7,
            to: 2,
            die: 5,
            hit: false,
          },
        ],
        finalKey:
          '0,-1,1,3,1,1,2,0,1,0,0,1,-2,3,-2,0,0,-3,0,-3,2,-2,-1,0,0|0,1|0,0',
        equity: -0.484,
        equityLoss: 1.532,
      },
      {
        rank: 48,
        moveText: '8/3 5/3',
        movements: [
          {
            from: 5,
            to: 3,
            die: 2,
            hit: false,
          },
          {
            from: 8,
            to: 3,
            die: 5,
            hit: false,
          },
        ],
        finalKey:
          '0,-1,0,4,1,1,2,1,0,0,0,1,-2,3,-2,0,0,-3,0,-3,2,-2,-1,0,0|0,1|0,0',
        equity: -0.516,
        equityLoss: 1.564,
      },
      {
        rank: 49,
        moveText: '20/15 5/3',
        movements: [
          {
            from: 5,
            to: 3,
            die: 2,
            hit: false,
          },
          {
            from: 20,
            to: 15,
            die: 5,
            hit: false,
          },
        ],
        finalKey:
          '0,-1,0,3,1,1,2,1,1,0,0,1,-2,3,-2,1,0,-3,0,-3,1,-2,-1,0,0|0,1|0,0',
        equity: -0.961,
        equityLoss: 2.009,
      },
      {
        rank: 50,
        moveText: '6/1* 5/3',
        movements: [
          {
            from: 5,
            to: 3,
            die: 2,
            hit: false,
          },
          {
            from: 6,
            to: 1,
            die: 5,
            hit: true,
          },
        ],
        finalKey:
          '0,1,0,3,1,1,1,1,1,0,0,1,-2,3,-2,0,0,-3,0,-3,2,-2,-1,0,0|0,2|0,0',
        equity: -0.984,
        equityLoss: 2.032,
      },
    ],
  },
  {
    id: 'curated-012',
    kind: 'play',
    theme: 'blitzing',
    source: 'curated',
    board: {
      points: [
        0, 2, 3, 1, 2, 2, 2, 2, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, -2, -1, -5,
        -4, -2,
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
      matchLength: 0,
      score: {
        white: 0,
        black: 0,
      },
      cube: {
        value: 1,
        owner: 'center',
      },
    },
    roll: [5, 2],
    answers: [
      {
        rank: 1,
        moveText: '14/9 3/1',
        movements: [
          {
            from: 14,
            to: 9,
            die: 5,
            hit: false,
          },
          {
            from: 3,
            to: 1,
            die: 2,
            hit: false,
          },
        ],
        finalKey:
          '0,3,3,0,2,2,2,2,0,1,0,0,0,0,0,0,0,0,0,0,-2,-1,-5,-4,-2|0,1|0,0',
        equity: 0.892,
        equityLoss: 0,
      },
      {
        rank: 2,
        moveText: '7/2 3/1',
        movements: [
          {
            from: 7,
            to: 2,
            die: 5,
            hit: false,
          },
          {
            from: 3,
            to: 1,
            die: 2,
            hit: false,
          },
        ],
        finalKey:
          '0,3,4,0,2,2,2,1,0,0,0,0,0,0,1,0,0,0,0,0,-2,-1,-5,-4,-2|0,1|0,0',
        equity: 0.798,
        equityLoss: 0.09399999999999997,
      },
      {
        rank: 3,
        moveText: '14/7',
        movements: [
          {
            from: 14,
            to: 9,
            die: 5,
            hit: false,
          },
          {
            from: 9,
            to: 7,
            die: 2,
            hit: false,
          },
        ],
        finalKey:
          '0,2,3,1,2,2,2,3,0,0,0,0,0,0,0,0,0,0,0,0,-2,-1,-5,-4,-2|0,1|0,0',
        equity: 0.703,
        equityLoss: 0.18900000000000006,
      },
      {
        rank: 4,
        moveText: '7/5 7/2',
        movements: [
          {
            from: 7,
            to: 2,
            die: 5,
            hit: false,
          },
          {
            from: 7,
            to: 5,
            die: 2,
            hit: false,
          },
        ],
        finalKey:
          '0,2,4,1,2,3,2,0,0,0,0,0,0,0,1,0,0,0,0,0,-2,-1,-5,-4,-2|0,1|0,0',
        equity: 0.612,
        equityLoss: 0.28,
      },
      {
        rank: 5,
        moveText: '14/9 7/5',
        movements: [
          {
            from: 14,
            to: 9,
            die: 5,
            hit: false,
          },
          {
            from: 7,
            to: 5,
            die: 2,
            hit: false,
          },
        ],
        finalKey:
          '0,2,3,1,2,3,2,1,0,1,0,0,0,0,0,0,0,0,0,0,-2,-1,-5,-4,-2|0,1|0,0',
        equity: 0.589,
        equityLoss: 0.30300000000000005,
      },
      {
        rank: 6,
        moveText: '14/12 7/2',
        movements: [
          {
            from: 7,
            to: 2,
            die: 5,
            hit: false,
          },
          {
            from: 14,
            to: 12,
            die: 2,
            hit: false,
          },
        ],
        finalKey:
          '0,2,4,1,2,2,2,1,0,0,0,0,1,0,0,0,0,0,0,0,-2,-1,-5,-4,-2|0,1|0,0',
        equity: 0.577,
        equityLoss: 0.31500000000000006,
      },
      {
        rank: 7,
        moveText: '14/9 5/3',
        movements: [
          {
            from: 14,
            to: 9,
            die: 5,
            hit: false,
          },
          {
            from: 5,
            to: 3,
            die: 2,
            hit: false,
          },
        ],
        finalKey:
          '0,2,3,2,2,1,2,2,0,1,0,0,0,0,0,0,0,0,0,0,-2,-1,-5,-4,-2|0,1|0,0',
        equity: 0.548,
        equityLoss: 0.344,
      },
      {
        rank: 8,
        moveText: '7/2 5/3',
        movements: [
          {
            from: 7,
            to: 2,
            die: 5,
            hit: false,
          },
          {
            from: 5,
            to: 3,
            die: 2,
            hit: false,
          },
        ],
        finalKey:
          '0,2,4,2,2,1,2,1,0,0,0,0,0,0,1,0,0,0,0,0,-2,-1,-5,-4,-2|0,1|0,0',
        equity: 0.547,
        equityLoss: 0.345,
      },
      {
        rank: 9,
        moveText: '6/4 6/1',
        movements: [
          {
            from: 6,
            to: 1,
            die: 5,
            hit: false,
          },
          {
            from: 6,
            to: 4,
            die: 2,
            hit: false,
          },
        ],
        finalKey:
          '0,3,3,1,3,2,0,2,0,0,0,0,0,0,1,0,0,0,0,0,-2,-1,-5,-4,-2|0,1|0,0',
        equity: 0.252,
        equityLoss: 0.64,
      },
      {
        rank: 10,
        moveText: '6/1 3/1',
        movements: [
          {
            from: 6,
            to: 1,
            die: 5,
            hit: false,
          },
          {
            from: 3,
            to: 1,
            die: 2,
            hit: false,
          },
        ],
        finalKey:
          '0,4,3,0,2,2,1,2,0,0,0,0,0,0,1,0,0,0,0,0,-2,-1,-5,-4,-2|0,1|0,0',
        equity: 0.207,
        equityLoss: 0.685,
      },
      {
        rank: 11,
        moveText: '14/9 6/4',
        movements: [
          {
            from: 14,
            to: 9,
            die: 5,
            hit: false,
          },
          {
            from: 6,
            to: 4,
            die: 2,
            hit: false,
          },
        ],
        finalKey:
          '0,2,3,1,3,2,1,2,0,1,0,0,0,0,0,0,0,0,0,0,-2,-1,-5,-4,-2|0,1|0,0',
        equity: 0.155,
        equityLoss: 0.737,
      },
      {
        rank: 12,
        moveText: '14/12 6/1',
        movements: [
          {
            from: 6,
            to: 1,
            die: 5,
            hit: false,
          },
          {
            from: 14,
            to: 12,
            die: 2,
            hit: false,
          },
        ],
        finalKey:
          '0,3,3,1,2,2,1,2,0,0,0,0,1,0,0,0,0,0,0,0,-2,-1,-5,-4,-2|0,1|0,0',
        equity: 0.053,
        equityLoss: 0.839,
      },
      {
        rank: 13,
        moveText: '14/9 4/2',
        movements: [
          {
            from: 14,
            to: 9,
            die: 5,
            hit: false,
          },
          {
            from: 4,
            to: 2,
            die: 2,
            hit: false,
          },
        ],
        finalKey:
          '0,2,4,1,1,2,2,2,0,1,0,0,0,0,0,0,0,0,0,0,-2,-1,-5,-4,-2|0,1|0,0',
        equity: 0.01,
        equityLoss: 0.882,
      },
      {
        rank: 14,
        moveText: '7/5 6/1',
        movements: [
          {
            from: 6,
            to: 1,
            die: 5,
            hit: false,
          },
          {
            from: 7,
            to: 5,
            die: 2,
            hit: false,
          },
        ],
        finalKey:
          '0,3,3,1,2,3,1,1,0,0,0,0,0,0,1,0,0,0,0,0,-2,-1,-5,-4,-2|0,1|0,0',
        equity: -0.018,
        equityLoss: 0.91,
      },
      {
        rank: 15,
        moveText: '7/2 6/4',
        movements: [
          {
            from: 7,
            to: 2,
            die: 5,
            hit: false,
          },
          {
            from: 6,
            to: 4,
            die: 2,
            hit: false,
          },
        ],
        finalKey:
          '0,2,4,1,3,2,1,1,0,0,0,0,0,0,1,0,0,0,0,0,-2,-1,-5,-4,-2|0,1|0,0',
        equity: -0.057,
        equityLoss: 0.9490000000000001,
      },
      {
        rank: 16,
        moveText: '6/1 5/3',
        movements: [
          {
            from: 6,
            to: 1,
            die: 5,
            hit: false,
          },
          {
            from: 5,
            to: 3,
            die: 2,
            hit: false,
          },
        ],
        finalKey:
          '0,3,3,2,2,1,1,2,0,0,0,0,0,0,1,0,0,0,0,0,-2,-1,-5,-4,-2|0,1|0,0',
        equity: -0.121,
        equityLoss: 1.013,
      },
      {
        rank: 17,
        moveText: '7/2 4/2',
        movements: [
          {
            from: 7,
            to: 2,
            die: 5,
            hit: false,
          },
          {
            from: 4,
            to: 2,
            die: 2,
            hit: false,
          },
        ],
        finalKey:
          '0,2,5,1,1,2,2,1,0,0,0,0,0,0,1,0,0,0,0,0,-2,-1,-5,-4,-2|0,1|0,0',
        equity: -0.173,
        equityLoss: 1.065,
      },
      {
        rank: 18,
        moveText: '6/1 4/2',
        movements: [
          {
            from: 6,
            to: 1,
            die: 5,
            hit: false,
          },
          {
            from: 4,
            to: 2,
            die: 2,
            hit: false,
          },
        ],
        finalKey:
          '0,3,4,1,1,2,1,2,0,0,0,0,0,0,1,0,0,0,0,0,-2,-1,-5,-4,-2|0,1|0,0',
        equity: -0.957,
        equityLoss: 1.849,
      },
    ],
  },
  {
    id: 'curated-013',
    kind: 'play',
    theme: 'holding-game',
    source: 'curated',
    board: {
      points: [
        0, 0, 0, 2, 0, 2, 4, 0, 0, 1, 0, 0, -3, 2, 0, 0, 0, -3, 0, -3, -4, 2,
        -2, 1, 0,
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
      matchLength: 0,
      score: {
        white: 0,
        black: 0,
      },
      cube: {
        value: 1,
        owner: 'center',
      },
    },
    roll: [3, 2],
    answers: [
      {
        rank: 1,
        moveText: 'bar/23 13/10',
        movements: [
          {
            from: 'bar',
            to: 23,
            die: 2,
            hit: false,
          },
          {
            from: 13,
            to: 10,
            die: 3,
            hit: false,
          },
        ],
        finalKey:
          '0,0,0,2,0,2,4,0,0,1,1,0,-3,1,0,0,0,-3,0,-3,-4,2,-2,2,0|0,0|0,0',
        equity: -0.705,
        equityLoss: 0,
      },
      {
        rank: 2,
        moveText: 'bar/23 9/6',
        movements: [
          {
            from: 'bar',
            to: 23,
            die: 2,
            hit: false,
          },
          {
            from: 9,
            to: 6,
            die: 3,
            hit: false,
          },
        ],
        finalKey:
          '0,0,0,2,0,2,5,0,0,0,0,0,-3,2,0,0,0,-3,0,-3,-4,2,-2,2,0|0,0|0,0',
        equity: -0.772,
        equityLoss: 0.06700000000000006,
      },
      {
        rank: 3,
        moveText: 'bar/23 6/3',
        movements: [
          {
            from: 'bar',
            to: 23,
            die: 2,
            hit: false,
          },
          {
            from: 6,
            to: 3,
            die: 3,
            hit: false,
          },
        ],
        finalKey:
          '0,0,0,3,0,2,3,0,0,1,0,0,-3,2,0,0,0,-3,0,-3,-4,2,-2,2,0|0,0|0,0',
        equity: -0.788,
        equityLoss: 0.08300000000000007,
      },
      {
        rank: 4,
        moveText: 'bar/23 5/2',
        movements: [
          {
            from: 'bar',
            to: 23,
            die: 2,
            hit: false,
          },
          {
            from: 5,
            to: 2,
            die: 3,
            hit: false,
          },
        ],
        finalKey:
          '0,0,1,2,0,1,4,0,0,1,0,0,-3,2,0,0,0,-3,0,-3,-4,2,-2,2,0|0,0|0,0',
        equity: -0.83,
        equityLoss: 0.125,
      },
      {
        rank: 5,
        moveText: 'bar/23 21/18',
        movements: [
          {
            from: 'bar',
            to: 23,
            die: 2,
            hit: false,
          },
          {
            from: 21,
            to: 18,
            die: 3,
            hit: false,
          },
        ],
        finalKey:
          '0,0,0,2,0,2,4,0,0,1,0,0,-3,2,0,0,0,-3,1,-3,-4,1,-2,2,0|0,0|0,0',
        equity: -1,
        equityLoss: 0.29500000000000004,
      },
    ],
  },
  {
    id: 'curated-014',
    kind: 'play',
    theme: 'holding-game',
    source: 'curated',
    board: {
      points: [
        0, 0, 0, 1, 2, 0, 4, 2, 0, -2, 0, 0, -3, 3, 0, 0, 0, -4, -1, -4, 2, 0,
        0, 0, -1,
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
      matchLength: 0,
      score: {
        white: 0,
        black: 0,
      },
      cube: {
        value: 1,
        owner: 'center',
      },
    },
    roll: [2, 3],
    answers: [
      {
        rank: 1,
        moveText: 'bar/22 20/18*',
        movements: [
          {
            from: 'bar',
            to: 22,
            die: 3,
            hit: false,
          },
          {
            from: 20,
            to: 18,
            die: 2,
            hit: true,
          },
        ],
        finalKey:
          '0,0,0,1,2,0,4,2,0,-2,0,0,-3,3,0,0,0,-4,1,-4,1,0,1,0,-1|0,1|0,0',
        equity: 0.096,
        equityLoss: 0,
      },
      {
        rank: 2,
        moveText: 'bar/23 6/3',
        movements: [
          {
            from: 'bar',
            to: 23,
            die: 2,
            hit: false,
          },
          {
            from: 6,
            to: 3,
            die: 3,
            hit: false,
          },
        ],
        finalKey:
          '0,0,0,2,2,0,3,2,0,-2,0,0,-3,3,0,0,0,-4,-1,-4,2,0,0,1,-1|0,0|0,0',
        equity: -0.145,
        equityLoss: 0.241,
      },
      {
        rank: 3,
        moveText: 'bar/23 13/10',
        movements: [
          {
            from: 'bar',
            to: 23,
            die: 2,
            hit: false,
          },
          {
            from: 13,
            to: 10,
            die: 3,
            hit: false,
          },
        ],
        finalKey:
          '0,0,0,1,2,0,4,2,0,-2,1,0,-3,2,0,0,0,-4,-1,-4,2,0,0,1,-1|0,0|0,0',
        equity: -0.206,
        equityLoss: 0.302,
      },
      {
        rank: 4,
        moveText: 'bar/22 7/5',
        movements: [
          {
            from: 'bar',
            to: 22,
            die: 3,
            hit: false,
          },
          {
            from: 7,
            to: 5,
            die: 2,
            hit: false,
          },
        ],
        finalKey:
          '0,0,0,1,2,1,4,1,0,-2,0,0,-3,3,0,0,0,-4,-1,-4,2,0,1,0,-1|0,0|0,0',
        equity: -0.214,
        equityLoss: 0.31,
      },
      {
        rank: 5,
        moveText: 'bar/22 13/11',
        movements: [
          {
            from: 'bar',
            to: 22,
            die: 3,
            hit: false,
          },
          {
            from: 13,
            to: 11,
            die: 2,
            hit: false,
          },
        ],
        finalKey:
          '0,0,0,1,2,0,4,2,0,-2,0,1,-3,2,0,0,0,-4,-1,-4,2,0,1,0,-1|0,0|0,0',
        equity: -0.244,
        equityLoss: 0.33999999999999997,
      },
      {
        rank: 6,
        moveText: 'bar/23 7/4',
        movements: [
          {
            from: 'bar',
            to: 23,
            die: 2,
            hit: false,
          },
          {
            from: 7,
            to: 4,
            die: 3,
            hit: false,
          },
        ],
        finalKey:
          '0,0,0,1,3,0,4,1,0,-2,0,0,-3,3,0,0,0,-4,-1,-4,2,0,0,1,-1|0,0|0,0',
        equity: -0.248,
        equityLoss: 0.344,
      },
      {
        rank: 7,
        moveText: 'bar/22 6/4',
        movements: [
          {
            from: 'bar',
            to: 22,
            die: 3,
            hit: false,
          },
          {
            from: 6,
            to: 4,
            die: 2,
            hit: false,
          },
        ],
        finalKey:
          '0,0,0,1,3,0,3,2,0,-2,0,0,-3,3,0,0,0,-4,-1,-4,2,0,1,0,-1|0,0|0,0',
        equity: -0.266,
        equityLoss: 0.362,
      },
      {
        rank: 8,
        moveText: 'bar/22 3/1',
        movements: [
          {
            from: 'bar',
            to: 22,
            die: 3,
            hit: false,
          },
          {
            from: 3,
            to: 1,
            die: 2,
            hit: false,
          },
        ],
        finalKey:
          '0,1,0,0,2,0,4,2,0,-2,0,0,-3,3,0,0,0,-4,-1,-4,2,0,1,0,-1|0,0|0,0',
        equity: -0.339,
        equityLoss: 0.43500000000000005,
      },
      {
        rank: 9,
        moveText: 'bar/20',
        movements: [
          {
            from: 'bar',
            to: 23,
            die: 2,
            hit: false,
          },
          {
            from: 23,
            to: 20,
            die: 3,
            hit: false,
          },
        ],
        finalKey:
          '0,0,0,1,2,0,4,2,0,-2,0,0,-3,3,0,0,0,-4,-1,-4,3,0,0,0,-1|0,0|0,0',
        equity: -0.338,
        equityLoss: 0.43400000000000005,
      },
      {
        rank: 10,
        moveText: 'bar/22 4/2',
        movements: [
          {
            from: 'bar',
            to: 22,
            die: 3,
            hit: false,
          },
          {
            from: 4,
            to: 2,
            die: 2,
            hit: false,
          },
        ],
        finalKey:
          '0,0,1,1,1,0,4,2,0,-2,0,0,-3,3,0,0,0,-4,-1,-4,2,0,1,0,-1|0,0|0,0',
        equity: -0.37,
        equityLoss: 0.46599999999999997,
      },
      {
        rank: 11,
        moveText: 'bar/23 4/1',
        movements: [
          {
            from: 'bar',
            to: 23,
            die: 2,
            hit: false,
          },
          {
            from: 4,
            to: 1,
            die: 3,
            hit: false,
          },
        ],
        finalKey:
          '0,1,0,1,1,0,4,2,0,-2,0,0,-3,3,0,0,0,-4,-1,-4,2,0,0,1,-1|0,0|0,0',
        equity: -0.382,
        equityLoss: 0.478,
      },
    ],
  },
  {
    id: 'curated-015',
    kind: 'play',
    theme: 'holding-game',
    source: 'curated',
    board: {
      points: [
        0, 0, 0, 0, 0, -1, 4, -1, 3, 0, 0, 2, -1, 2, 0, -2, 0, -2, -2, -2, -2,
        2, -2, 0, 1,
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
      matchLength: 0,
      score: {
        white: 0,
        black: 0,
      },
      cube: {
        value: 1,
        owner: 'center',
      },
    },
    roll: [3, 2],
    answers: [
      {
        rank: 1,
        moveText: 'bar/23 8/5*',
        movements: [
          {
            from: 'bar',
            to: 23,
            die: 2,
            hit: false,
          },
          {
            from: 8,
            to: 5,
            die: 3,
            hit: true,
          },
        ],
        finalKey:
          '0,0,0,0,0,1,4,-1,2,0,0,2,-1,2,0,-2,0,-2,-2,-2,-2,2,-2,1,1|0,1|0,0',
        equity: -0.9,
        equityLoss: 0,
      },
      {
        rank: 2,
        moveText: 'bar/23 24/21',
        movements: [
          {
            from: 'bar',
            to: 23,
            die: 2,
            hit: false,
          },
          {
            from: 24,
            to: 21,
            die: 3,
            hit: false,
          },
        ],
        finalKey:
          '0,0,0,0,0,-1,4,-1,3,0,0,2,-1,2,0,-2,0,-2,-2,-2,-2,3,-2,1,0|0,0|0,0',
        equity: -0.989,
        equityLoss: 0.08899999999999997,
      },
      {
        rank: 3,
        moveText: 'bar/23 6/3',
        movements: [
          {
            from: 'bar',
            to: 23,
            die: 2,
            hit: false,
          },
          {
            from: 6,
            to: 3,
            die: 3,
            hit: false,
          },
        ],
        finalKey:
          '0,0,0,1,0,-1,3,-1,3,0,0,2,-1,2,0,-2,0,-2,-2,-2,-2,2,-2,1,1|0,0|0,0',
        equity: -1,
        equityLoss: 0.09999999999999998,
      },
      {
        rank: 4,
        moveText: 'bar/23 11/8',
        movements: [
          {
            from: 'bar',
            to: 23,
            die: 2,
            hit: false,
          },
          {
            from: 11,
            to: 8,
            die: 3,
            hit: false,
          },
        ],
        finalKey:
          '0,0,0,0,0,-1,4,-1,4,0,0,1,-1,2,0,-2,0,-2,-2,-2,-2,2,-2,1,1|0,0|0,0',
        equity: -1,
        equityLoss: 0.09999999999999998,
      },
      {
        rank: 5,
        moveText: 'bar/23 13/10',
        movements: [
          {
            from: 'bar',
            to: 23,
            die: 2,
            hit: false,
          },
          {
            from: 13,
            to: 10,
            die: 3,
            hit: false,
          },
        ],
        finalKey:
          '0,0,0,0,0,-1,4,-1,3,0,1,2,-1,1,0,-2,0,-2,-2,-2,-2,2,-2,1,1|0,0|0,0',
        equity: -1.027,
        equityLoss: 0.1269999999999999,
      },
    ],
  },
  {
    id: 'curated-016',
    kind: 'play',
    theme: 'holding-game',
    source: 'curated',
    board: {
      points: [
        0, 1, 0, 0, 0, -1, 4, 0, 3, 0, 0, 2, -3, 3, 0, -1, 0, -2, -2, 2, -2, -2,
        -2, 0, 0,
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
      matchLength: 0,
      score: {
        white: 0,
        black: 0,
      },
      cube: {
        value: 1,
        owner: 'center',
      },
    },
    roll: [4, 1],
    answers: [
      {
        rank: 1,
        moveText: '6/5*/1',
        movements: [
          {
            from: 6,
            to: 5,
            die: 1,
            hit: true,
          },
          {
            from: 5,
            to: 1,
            die: 4,
            hit: false,
          },
        ],
        finalKey:
          '0,2,0,0,0,0,3,0,3,0,0,2,-3,3,0,-1,0,-2,-2,2,-2,-2,-2,0,0|0,1|0,0',
        equity: -0.189,
        equityLoss: 0,
      },
      {
        rank: 2,
        moveText: '6/1',
        movements: [
          {
            from: 6,
            to: 2,
            die: 4,
            hit: false,
          },
          {
            from: 2,
            to: 1,
            die: 1,
            hit: false,
          },
        ],
        finalKey:
          '0,2,0,0,0,-1,3,0,3,0,0,2,-3,3,0,-1,0,-2,-2,2,-2,-2,-2,0,0|0,0|0,0',
        equity: -0.37,
        equityLoss: 0.181,
      },
      {
        rank: 3,
        moveText: '13/8',
        movements: [
          {
            from: 13,
            to: 9,
            die: 4,
            hit: false,
          },
          {
            from: 9,
            to: 8,
            die: 1,
            hit: false,
          },
        ],
        finalKey:
          '0,1,0,0,0,-1,4,0,4,0,0,2,-3,2,0,-1,0,-2,-2,2,-2,-2,-2,0,0|0,0|0,0',
        equity: -0.511,
        equityLoss: 0.322,
      },
      {
        rank: 4,
        moveText: '19/15* 6/5*',
        movements: [
          {
            from: 19,
            to: 15,
            die: 4,
            hit: true,
          },
          {
            from: 6,
            to: 5,
            die: 1,
            hit: true,
          },
        ],
        finalKey:
          '0,1,0,0,0,1,3,0,3,0,0,2,-3,3,0,1,0,-2,-2,1,-2,-2,-2,0,0|0,2|0,0',
        equity: -0.528,
        equityLoss: 0.339,
      },
      {
        rank: 5,
        moveText: '8/3',
        movements: [
          {
            from: 8,
            to: 4,
            die: 4,
            hit: false,
          },
          {
            from: 4,
            to: 3,
            die: 1,
            hit: false,
          },
        ],
        finalKey:
          '0,1,0,1,0,-1,4,0,2,0,0,2,-3,3,0,-1,0,-2,-2,2,-2,-2,-2,0,0|0,0|0,0',
        equity: -0.566,
        equityLoss: 0.37699999999999995,
      },
      {
        rank: 6,
        moveText: '19/15*/14',
        movements: [
          {
            from: 19,
            to: 15,
            die: 4,
            hit: true,
          },
          {
            from: 15,
            to: 14,
            die: 1,
            hit: false,
          },
        ],
        finalKey:
          '0,1,0,0,0,-1,4,0,3,0,0,2,-3,3,1,0,0,-2,-2,1,-2,-2,-2,0,0|0,1|0,0',
        equity: -0.581,
        equityLoss: 0.39199999999999996,
      },
      {
        rank: 7,
        moveText: '11/7 8/7',
        movements: [
          {
            from: 11,
            to: 7,
            die: 4,
            hit: false,
          },
          {
            from: 8,
            to: 7,
            die: 1,
            hit: false,
          },
        ],
        finalKey:
          '0,1,0,0,0,-1,4,2,2,0,0,1,-3,3,0,-1,0,-2,-2,2,-2,-2,-2,0,0|0,0|0,0',
        equity: -0.689,
        equityLoss: 0.49999999999999994,
      },
      {
        rank: 8,
        moveText: '8/7 6/2',
        movements: [
          {
            from: 6,
            to: 2,
            die: 4,
            hit: false,
          },
          {
            from: 8,
            to: 7,
            die: 1,
            hit: false,
          },
        ],
        finalKey:
          '0,1,1,0,0,-1,3,1,2,0,0,2,-3,3,0,-1,0,-2,-2,2,-2,-2,-2,0,0|0,0|0,0',
        equity: -0.703,
        equityLoss: 0.514,
      },
      {
        rank: 9,
        moveText: '11/6',
        movements: [
          {
            from: 11,
            to: 7,
            die: 4,
            hit: false,
          },
          {
            from: 7,
            to: 6,
            die: 1,
            hit: false,
          },
        ],
        finalKey:
          '0,1,0,0,0,-1,5,0,3,0,0,1,-3,3,0,-1,0,-2,-2,2,-2,-2,-2,0,0|0,0|0,0',
        equity: -0.808,
        equityLoss: 0.619,
      },
      {
        rank: 10,
        moveText: '13/9 8/7',
        movements: [
          {
            from: 13,
            to: 9,
            die: 4,
            hit: false,
          },
          {
            from: 8,
            to: 7,
            die: 1,
            hit: false,
          },
        ],
        finalKey:
          '0,1,0,0,0,-1,4,1,2,1,0,2,-3,2,0,-1,0,-2,-2,2,-2,-2,-2,0,0|0,0|0,0',
        equity: -0.828,
        equityLoss: 0.639,
      },
      {
        rank: 11,
        moveText: '13/9 6/5*',
        movements: [
          {
            from: 13,
            to: 9,
            die: 4,
            hit: false,
          },
          {
            from: 6,
            to: 5,
            die: 1,
            hit: true,
          },
        ],
        finalKey:
          '0,1,0,0,0,1,3,0,3,1,0,2,-3,2,0,-1,0,-2,-2,2,-2,-2,-2,0,0|0,1|0,0',
        equity: -0.873,
        equityLoss: 0.6839999999999999,
      },
      {
        rank: 12,
        moveText: '11/10 11/7',
        movements: [
          {
            from: 11,
            to: 7,
            die: 4,
            hit: false,
          },
          {
            from: 11,
            to: 10,
            die: 1,
            hit: false,
          },
        ],
        finalKey:
          '0,1,0,0,0,-1,4,1,3,0,1,0,-3,3,0,-1,0,-2,-2,2,-2,-2,-2,0,0|0,0|0,0',
        equity: -1,
        equityLoss: 0.8109999999999999,
      },
      {
        rank: 13,
        moveText: '8/7 8/4',
        movements: [
          {
            from: 8,
            to: 4,
            die: 4,
            hit: false,
          },
          {
            from: 8,
            to: 7,
            die: 1,
            hit: false,
          },
        ],
        finalKey:
          '0,1,0,0,1,-1,4,1,1,0,0,2,-3,3,0,-1,0,-2,-2,2,-2,-2,-2,0,0|0,0|0,0',
        equity: -1,
        equityLoss: 0.8109999999999999,
      },
      {
        rank: 14,
        moveText: '11/7 6/5*',
        movements: [
          {
            from: 11,
            to: 7,
            die: 4,
            hit: false,
          },
          {
            from: 6,
            to: 5,
            die: 1,
            hit: true,
          },
        ],
        finalKey:
          '0,1,0,0,0,1,3,1,3,0,0,1,-3,3,0,-1,0,-2,-2,2,-2,-2,-2,0,0|0,1|0,0',
        equity: -1,
        equityLoss: 0.8109999999999999,
      },
      {
        rank: 15,
        moveText: '19/15* 8/7',
        movements: [
          {
            from: 19,
            to: 15,
            die: 4,
            hit: true,
          },
          {
            from: 8,
            to: 7,
            die: 1,
            hit: false,
          },
        ],
        finalKey:
          '0,1,0,0,0,-1,4,1,2,0,0,2,-3,3,0,1,0,-2,-2,1,-2,-2,-2,0,0|0,1|0,0',
        equity: -1,
        equityLoss: 0.8109999999999999,
      },
      {
        rank: 16,
        moveText: '11/10 8/4',
        movements: [
          {
            from: 8,
            to: 4,
            die: 4,
            hit: false,
          },
          {
            from: 11,
            to: 10,
            die: 1,
            hit: false,
          },
        ],
        finalKey:
          '0,1,0,0,1,-1,4,0,2,0,1,1,-3,3,0,-1,0,-2,-2,2,-2,-2,-2,0,0|0,0|0,0',
        equity: -1,
        equityLoss: 0.8109999999999999,
      },
      {
        rank: 17,
        moveText: '8/4 6/5*',
        movements: [
          {
            from: 8,
            to: 4,
            die: 4,
            hit: false,
          },
          {
            from: 6,
            to: 5,
            die: 1,
            hit: true,
          },
        ],
        finalKey:
          '0,1,0,0,1,1,3,0,2,0,0,2,-3,3,0,-1,0,-2,-2,2,-2,-2,-2,0,0|0,1|0,0',
        equity: -1,
        equityLoss: 0.8109999999999999,
      },
      {
        rank: 18,
        moveText: '6/5* 6/2',
        movements: [
          {
            from: 6,
            to: 2,
            die: 4,
            hit: false,
          },
          {
            from: 6,
            to: 5,
            die: 1,
            hit: true,
          },
        ],
        finalKey:
          '0,1,1,0,0,1,2,0,3,0,0,2,-3,3,0,-1,0,-2,-2,2,-2,-2,-2,0,0|0,1|0,0',
        equity: -1,
        equityLoss: 0.8109999999999999,
      },
      {
        rank: 19,
        moveText: '11/10 6/2',
        movements: [
          {
            from: 6,
            to: 2,
            die: 4,
            hit: false,
          },
          {
            from: 11,
            to: 10,
            die: 1,
            hit: false,
          },
        ],
        finalKey:
          '0,1,1,0,0,-1,3,0,3,0,1,1,-3,3,0,-1,0,-2,-2,2,-2,-2,-2,0,0|0,0|0,0',
        equity: -1,
        equityLoss: 0.8109999999999999,
      },
      {
        rank: 20,
        moveText: '13/9 11/10',
        movements: [
          {
            from: 13,
            to: 9,
            die: 4,
            hit: false,
          },
          {
            from: 11,
            to: 10,
            die: 1,
            hit: false,
          },
        ],
        finalKey:
          '0,1,0,0,0,-1,4,0,3,1,1,1,-3,2,0,-1,0,-2,-2,2,-2,-2,-2,0,0|0,0|0,0',
        equity: -1,
        equityLoss: 0.8109999999999999,
      },
      {
        rank: 21,
        moveText: '19/15* 11/10',
        movements: [
          {
            from: 19,
            to: 15,
            die: 4,
            hit: true,
          },
          {
            from: 11,
            to: 10,
            die: 1,
            hit: false,
          },
        ],
        finalKey:
          '0,1,0,0,0,-1,4,0,3,0,1,1,-3,3,0,1,0,-2,-2,1,-2,-2,-2,0,0|0,1|0,0',
        equity: -1.086,
        equityLoss: 0.897,
      },
    ],
  },
  {
    id: 'curated-017',
    kind: 'play',
    theme: 'holding-game',
    source: 'curated',
    board: {
      points: [
        0, 1, 1, 3, 2, 0, 3, 0, -1, 0, 0, 2, 0, 0, 0, 0, 0, -2, -2, -2, -2, -3,
        -2, -1, 2,
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
      matchLength: 0,
      score: {
        white: 0,
        black: 0,
      },
      cube: {
        value: 1,
        owner: 'center',
      },
    },
    roll: [2, 2],
    answers: [
      {
        rank: 1,
        moveText: 'bar/23* 6/2 3/1',
        movements: [
          {
            from: 'bar',
            to: 23,
            die: 2,
            hit: true,
          },
          {
            from: 6,
            to: 4,
            die: 2,
            hit: false,
          },
          {
            from: 4,
            to: 2,
            die: 2,
            hit: false,
          },
          {
            from: 3,
            to: 1,
            die: 2,
            hit: false,
          },
        ],
        finalKey:
          '0,2,2,2,2,0,2,0,-1,0,0,2,0,0,0,0,0,-2,-2,-2,-2,-3,-2,1,2|0,1|0,0',
        equity: -1.249,
        equityLoss: 0,
      },
      {
        rank: 2,
        moveText: 'bar/23* 11/9(2) 3/1',
        movements: [
          {
            from: 'bar',
            to: 23,
            die: 2,
            hit: true,
          },
          {
            from: 11,
            to: 9,
            die: 2,
            hit: false,
          },
          {
            from: 11,
            to: 9,
            die: 2,
            hit: false,
          },
          {
            from: 3,
            to: 1,
            die: 2,
            hit: false,
          },
        ],
        finalKey:
          '0,2,1,2,2,0,3,0,-1,2,0,0,0,0,0,0,0,-2,-2,-2,-2,-3,-2,1,2|0,1|0,0',
        equity: -1.315,
        equityLoss: 0.06599999999999984,
      },
      {
        rank: 3,
        moveText: 'bar/23* 4/2(2) 3/1',
        movements: [
          {
            from: 'bar',
            to: 23,
            die: 2,
            hit: true,
          },
          {
            from: 4,
            to: 2,
            die: 2,
            hit: false,
          },
          {
            from: 4,
            to: 2,
            die: 2,
            hit: false,
          },
          {
            from: 3,
            to: 1,
            die: 2,
            hit: false,
          },
        ],
        finalKey:
          '0,2,3,2,0,0,3,0,-1,0,0,2,0,0,0,0,0,-2,-2,-2,-2,-3,-2,1,2|0,1|0,0',
        equity: -1.315,
        equityLoss: 0.06599999999999984,
      },
      {
        rank: 4,
        moveText: 'bar/23* 11/7 3/1',
        movements: [
          {
            from: 'bar',
            to: 23,
            die: 2,
            hit: true,
          },
          {
            from: 11,
            to: 9,
            die: 2,
            hit: false,
          },
          {
            from: 9,
            to: 7,
            die: 2,
            hit: false,
          },
          {
            from: 3,
            to: 1,
            die: 2,
            hit: false,
          },
        ],
        finalKey:
          '0,2,1,2,2,0,3,1,-1,0,0,1,0,0,0,0,0,-2,-2,-2,-2,-3,-2,1,2|0,1|0,0',
        equity: -1.366,
        equityLoss: 0.11699999999999999,
      },
      {
        rank: 5,
        moveText: 'bar/23* 11/9(2) 6/4',
        movements: [
          {
            from: 'bar',
            to: 23,
            die: 2,
            hit: true,
          },
          {
            from: 11,
            to: 9,
            die: 2,
            hit: false,
          },
          {
            from: 11,
            to: 9,
            die: 2,
            hit: false,
          },
          {
            from: 6,
            to: 4,
            die: 2,
            hit: false,
          },
        ],
        finalKey:
          '0,1,1,3,3,0,2,0,-1,2,0,0,0,0,0,0,0,-2,-2,-2,-2,-3,-2,1,2|0,1|0,0',
        equity: -1.384,
        equityLoss: 0.1349999999999998,
      },
      {
        rank: 6,
        moveText: 'bar/23* 11/9(2) 4/2',
        movements: [
          {
            from: 'bar',
            to: 23,
            die: 2,
            hit: true,
          },
          {
            from: 11,
            to: 9,
            die: 2,
            hit: false,
          },
          {
            from: 11,
            to: 9,
            die: 2,
            hit: false,
          },
          {
            from: 4,
            to: 2,
            die: 2,
            hit: false,
          },
        ],
        finalKey:
          '0,1,2,3,1,0,3,0,-1,2,0,0,0,0,0,0,0,-2,-2,-2,-2,-3,-2,1,2|0,1|0,0',
        equity: -1.396,
        equityLoss: 0.1469999999999998,
      },
      {
        rank: 7,
        moveText: 'bar/23* 11/9 6/2',
        movements: [
          {
            from: 'bar',
            to: 23,
            die: 2,
            hit: true,
          },
          {
            from: 11,
            to: 9,
            die: 2,
            hit: false,
          },
          {
            from: 6,
            to: 4,
            die: 2,
            hit: false,
          },
          {
            from: 4,
            to: 2,
            die: 2,
            hit: false,
          },
        ],
        finalKey:
          '0,1,2,3,2,0,2,0,-1,1,0,1,0,0,0,0,0,-2,-2,-2,-2,-3,-2,1,2|0,1|0,0',
        equity: -1.405,
        equityLoss: 0.15599999999999992,
      },
      {
        rank: 8,
        moveText: 'bar/23* 6/2 6/4',
        movements: [
          {
            from: 'bar',
            to: 23,
            die: 2,
            hit: true,
          },
          {
            from: 6,
            to: 4,
            die: 2,
            hit: false,
          },
          {
            from: 6,
            to: 4,
            die: 2,
            hit: false,
          },
          {
            from: 4,
            to: 2,
            die: 2,
            hit: false,
          },
        ],
        finalKey:
          '0,1,2,3,3,0,1,0,-1,0,0,2,0,0,0,0,0,-2,-2,-2,-2,-3,-2,1,2|0,1|0,0',
        equity: -1.41,
        equityLoss: 0.1609999999999998,
      },
      {
        rank: 9,
        moveText: 'bar/23* 11/9 4/2 3/1',
        movements: [
          {
            from: 'bar',
            to: 23,
            die: 2,
            hit: true,
          },
          {
            from: 11,
            to: 9,
            die: 2,
            hit: false,
          },
          {
            from: 4,
            to: 2,
            die: 2,
            hit: false,
          },
          {
            from: 3,
            to: 1,
            die: 2,
            hit: false,
          },
        ],
        finalKey:
          '0,2,2,2,1,0,3,0,-1,1,0,1,0,0,0,0,0,-2,-2,-2,-2,-3,-2,1,2|0,1|0,0',
        equity: -1.411,
        equityLoss: 0.16199999999999992,
      },
      {
        rank: 10,
        moveText: 'bar/23* 6/4(3)',
        movements: [
          {
            from: 'bar',
            to: 23,
            die: 2,
            hit: true,
          },
          {
            from: 6,
            to: 4,
            die: 2,
            hit: false,
          },
          {
            from: 6,
            to: 4,
            die: 2,
            hit: false,
          },
          {
            from: 6,
            to: 4,
            die: 2,
            hit: false,
          },
        ],
        finalKey:
          '0,1,1,3,5,0,0,0,-1,0,0,2,0,0,0,0,0,-2,-2,-2,-2,-3,-2,1,2|0,1|0,0',
        equity: -1.451,
        equityLoss: 0.20199999999999996,
      },
      {
        rank: 11,
        moveText: 'bar/23* 6/4(2) 3/1',
        movements: [
          {
            from: 'bar',
            to: 23,
            die: 2,
            hit: true,
          },
          {
            from: 6,
            to: 4,
            die: 2,
            hit: false,
          },
          {
            from: 6,
            to: 4,
            die: 2,
            hit: false,
          },
          {
            from: 3,
            to: 1,
            die: 2,
            hit: false,
          },
        ],
        finalKey:
          '0,2,1,2,4,0,1,0,-1,0,0,2,0,0,0,0,0,-2,-2,-2,-2,-3,-2,1,2|0,1|0,0',
        equity: -1.412,
        equityLoss: 0.1629999999999998,
      },
      {
        rank: 12,
        moveText: 'bar/23* 11/9 6/4 3/1',
        movements: [
          {
            from: 'bar',
            to: 23,
            die: 2,
            hit: true,
          },
          {
            from: 11,
            to: 9,
            die: 2,
            hit: false,
          },
          {
            from: 6,
            to: 4,
            die: 2,
            hit: false,
          },
          {
            from: 3,
            to: 1,
            die: 2,
            hit: false,
          },
        ],
        finalKey:
          '0,2,1,2,3,0,2,0,-1,1,0,1,0,0,0,0,0,-2,-2,-2,-2,-3,-2,1,2|0,1|0,0',
        equity: -1.416,
        equityLoss: 0.16699999999999982,
      },
      {
        rank: 13,
        moveText: 'bar/23* 3/1(3)',
        movements: [
          {
            from: 'bar',
            to: 23,
            die: 2,
            hit: true,
          },
          {
            from: 3,
            to: 1,
            die: 2,
            hit: false,
          },
          {
            from: 3,
            to: 1,
            die: 2,
            hit: false,
          },
          {
            from: 3,
            to: 1,
            die: 2,
            hit: false,
          },
        ],
        finalKey:
          '0,4,1,0,2,0,3,0,-1,0,0,2,0,0,0,0,0,-2,-2,-2,-2,-3,-2,1,2|0,1|0,0',
        equity: -1.423,
        equityLoss: 0.17399999999999993,
      },
      {
        rank: 14,
        moveText: 'bar/23* 11/7 11/9',
        movements: [
          {
            from: 'bar',
            to: 23,
            die: 2,
            hit: true,
          },
          {
            from: 11,
            to: 9,
            die: 2,
            hit: false,
          },
          {
            from: 11,
            to: 9,
            die: 2,
            hit: false,
          },
          {
            from: 9,
            to: 7,
            die: 2,
            hit: false,
          },
        ],
        finalKey:
          '0,1,1,3,2,0,3,1,-1,1,0,0,0,0,0,0,0,-2,-2,-2,-2,-3,-2,1,2|0,1|0,0',
        equity: -1.436,
        equityLoss: 0.18699999999999983,
      },
      {
        rank: 15,
        moveText: 'bar/23* 6/4 3/1(2)',
        movements: [
          {
            from: 'bar',
            to: 23,
            die: 2,
            hit: true,
          },
          {
            from: 6,
            to: 4,
            die: 2,
            hit: false,
          },
          {
            from: 3,
            to: 1,
            die: 2,
            hit: false,
          },
          {
            from: 3,
            to: 1,
            die: 2,
            hit: false,
          },
        ],
        finalKey:
          '0,3,1,1,3,0,2,0,-1,0,0,2,0,0,0,0,0,-2,-2,-2,-2,-3,-2,1,2|0,1|0,0',
        equity: -1.439,
        equityLoss: 0.18999999999999995,
      },
      {
        rank: 16,
        moveText: 'bar/23* 6/2 4/2',
        movements: [
          {
            from: 'bar',
            to: 23,
            die: 2,
            hit: true,
          },
          {
            from: 6,
            to: 4,
            die: 2,
            hit: false,
          },
          {
            from: 4,
            to: 2,
            die: 2,
            hit: false,
          },
          {
            from: 4,
            to: 2,
            die: 2,
            hit: false,
          },
        ],
        finalKey:
          '0,1,3,3,1,0,2,0,-1,0,0,2,0,0,0,0,0,-2,-2,-2,-2,-3,-2,1,2|0,1|0,0',
        equity: -1.447,
        equityLoss: 0.19799999999999995,
      },
      {
        rank: 17,
        moveText: 'bar/23* 11/5',
        movements: [
          {
            from: 'bar',
            to: 23,
            die: 2,
            hit: true,
          },
          {
            from: 11,
            to: 9,
            die: 2,
            hit: false,
          },
          {
            from: 9,
            to: 7,
            die: 2,
            hit: false,
          },
          {
            from: 7,
            to: 5,
            die: 2,
            hit: false,
          },
        ],
        finalKey:
          '0,1,1,3,2,1,3,0,-1,0,0,1,0,0,0,0,0,-2,-2,-2,-2,-3,-2,1,2|0,1|0,0',
        equity: -1.45,
        equityLoss: 0.20099999999999985,
      },
      {
        rank: 18,
        moveText: 'bar/23* 4/2 3/1(2)',
        movements: [
          {
            from: 'bar',
            to: 23,
            die: 2,
            hit: true,
          },
          {
            from: 4,
            to: 2,
            die: 2,
            hit: false,
          },
          {
            from: 3,
            to: 1,
            die: 2,
            hit: false,
          },
          {
            from: 3,
            to: 1,
            die: 2,
            hit: false,
          },
        ],
        finalKey:
          '0,3,2,1,1,0,3,0,-1,0,0,2,0,0,0,0,0,-2,-2,-2,-2,-3,-2,1,2|0,1|0,0',
        equity: -1.452,
        equityLoss: 0.20299999999999985,
      },
      {
        rank: 19,
        moveText: 'bar/23* 11/7 6/4',
        movements: [
          {
            from: 'bar',
            to: 23,
            die: 2,
            hit: true,
          },
          {
            from: 11,
            to: 9,
            die: 2,
            hit: false,
          },
          {
            from: 9,
            to: 7,
            die: 2,
            hit: false,
          },
          {
            from: 6,
            to: 4,
            die: 2,
            hit: false,
          },
        ],
        finalKey:
          '0,1,1,3,3,0,2,1,-1,0,0,1,0,0,0,0,0,-2,-2,-2,-2,-3,-2,1,2|0,1|0,0',
        equity: -1.462,
        equityLoss: 0.21299999999999986,
      },
      {
        rank: 20,
        moveText: 'bar/23* 11/9 4/2(2)',
        movements: [
          {
            from: 'bar',
            to: 23,
            die: 2,
            hit: true,
          },
          {
            from: 11,
            to: 9,
            die: 2,
            hit: false,
          },
          {
            from: 4,
            to: 2,
            die: 2,
            hit: false,
          },
          {
            from: 4,
            to: 2,
            die: 2,
            hit: false,
          },
        ],
        finalKey:
          '0,1,3,3,0,0,3,0,-1,1,0,1,0,0,0,0,0,-2,-2,-2,-2,-3,-2,1,2|0,1|0,0',
        equity: -1.466,
        equityLoss: 0.21699999999999986,
      },
      {
        rank: 21,
        moveText: 'bar/23* 11/7 4/2',
        movements: [
          {
            from: 'bar',
            to: 23,
            die: 2,
            hit: true,
          },
          {
            from: 11,
            to: 9,
            die: 2,
            hit: false,
          },
          {
            from: 9,
            to: 7,
            die: 2,
            hit: false,
          },
          {
            from: 4,
            to: 2,
            die: 2,
            hit: false,
          },
        ],
        finalKey:
          '0,1,2,3,1,0,3,1,-1,0,0,1,0,0,0,0,0,-2,-2,-2,-2,-3,-2,1,2|0,1|0,0',
        equity: -1.503,
        equityLoss: 0.2539999999999998,
      },
      {
        rank: 22,
        moveText: 'bar/23* 11/9 3/1(2)',
        movements: [
          {
            from: 'bar',
            to: 23,
            die: 2,
            hit: true,
          },
          {
            from: 11,
            to: 9,
            die: 2,
            hit: false,
          },
          {
            from: 3,
            to: 1,
            die: 2,
            hit: false,
          },
          {
            from: 3,
            to: 1,
            die: 2,
            hit: false,
          },
        ],
        finalKey:
          '0,3,1,1,2,0,3,0,-1,1,0,1,0,0,0,0,0,-2,-2,-2,-2,-3,-2,1,2|0,1|0,0',
        equity: -1.546,
        equityLoss: 0.29699999999999993,
      },
      {
        rank: 23,
        moveText: 'bar/23* 11/9 6/4(2)',
        movements: [
          {
            from: 'bar',
            to: 23,
            die: 2,
            hit: true,
          },
          {
            from: 11,
            to: 9,
            die: 2,
            hit: false,
          },
          {
            from: 6,
            to: 4,
            die: 2,
            hit: false,
          },
          {
            from: 6,
            to: 4,
            die: 2,
            hit: false,
          },
        ],
        finalKey:
          '0,1,1,3,4,0,1,0,-1,1,0,1,0,0,0,0,0,-2,-2,-2,-2,-3,-2,1,2|0,1|0,0',
        equity: -1.606,
        equityLoss: 0.357,
      },
    ],
  },
  {
    id: 'curated-018',
    kind: 'play',
    theme: 'holding-game',
    source: 'curated',
    board: {
      points: [
        0, 0, 1, 2, 0, -1, 4, -1, 2, 0, -2, 0, 0, 2, -1, 0, 0, -2, -2, -2, -2,
        -2, 1, 3, 0,
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
      matchLength: 0,
      score: {
        white: 0,
        black: 0,
      },
      cube: {
        value: 1,
        owner: 'center',
      },
    },
    roll: [3, 6],
    answers: [
      {
        rank: 1,
        moveText: '22/13',
        movements: [
          {
            from: 22,
            to: 16,
            die: 6,
            hit: false,
          },
          {
            from: 16,
            to: 13,
            die: 3,
            hit: false,
          },
        ],
        finalKey:
          '0,0,1,2,0,-1,4,-1,2,0,-2,0,0,3,-1,0,0,-2,-2,-2,-2,-2,0,3,0|0,0|0,0',
        equity: -1.066,
        equityLoss: 0,
      },
      {
        rank: 2,
        moveText: '22/16 6/3',
        movements: [
          {
            from: 6,
            to: 3,
            die: 3,
            hit: false,
          },
          {
            from: 22,
            to: 16,
            die: 6,
            hit: false,
          },
        ],
        finalKey:
          '0,0,1,3,0,-1,3,-1,2,0,-2,0,0,2,-1,0,1,-2,-2,-2,-2,-2,0,3,0|0,0|0,0',
        equity: -1.223,
        equityLoss: 0.15700000000000003,
      },
      {
        rank: 3,
        moveText: '8/5* 8/2',
        movements: [
          {
            from: 8,
            to: 5,
            die: 3,
            hit: true,
          },
          {
            from: 8,
            to: 2,
            die: 6,
            hit: false,
          },
        ],
        finalKey:
          '0,0,2,2,0,1,4,-1,0,0,-2,0,0,2,-1,0,0,-2,-2,-2,-2,-2,1,3,0|0,1|0,0',
        equity: -1.231,
        equityLoss: 0.16500000000000004,
      },
      {
        rank: 4,
        moveText: '8/2 6/3',
        movements: [
          {
            from: 6,
            to: 3,
            die: 3,
            hit: false,
          },
          {
            from: 8,
            to: 2,
            die: 6,
            hit: false,
          },
        ],
        finalKey:
          '0,0,2,3,0,-1,3,-1,1,0,-2,0,0,2,-1,0,0,-2,-2,-2,-2,-2,1,3,0|0,0|0,0',
        equity: -1.278,
        equityLoss: 0.21199999999999997,
      },
      {
        rank: 5,
        moveText: '13/7*/4',
        movements: [
          {
            from: 13,
            to: 7,
            die: 6,
            hit: true,
          },
          {
            from: 7,
            to: 4,
            die: 3,
            hit: false,
          },
        ],
        finalKey:
          '0,0,1,2,1,-1,4,0,2,0,-2,0,0,1,-1,0,0,-2,-2,-2,-2,-2,1,3,0|0,1|0,0',
        equity: -1.321,
        equityLoss: 0.2549999999999999,
      },
      {
        rank: 6,
        moveText: '13/7* 6/3',
        movements: [
          {
            from: 6,
            to: 3,
            die: 3,
            hit: false,
          },
          {
            from: 13,
            to: 7,
            die: 6,
            hit: true,
          },
        ],
        finalKey:
          '0,0,1,3,0,-1,3,1,2,0,-2,0,0,1,-1,0,0,-2,-2,-2,-2,-2,1,3,0|0,1|0,0',
        equity: -1.334,
        equityLoss: 0.268,
      },
      {
        rank: 7,
        moveText: '13/7* 8/5*',
        movements: [
          {
            from: 8,
            to: 5,
            die: 3,
            hit: true,
          },
          {
            from: 13,
            to: 7,
            die: 6,
            hit: true,
          },
        ],
        finalKey:
          '0,0,1,2,0,1,4,1,1,0,-2,0,0,1,-1,0,0,-2,-2,-2,-2,-2,1,3,0|0,2|0,0',
        equity: -1.336,
        equityLoss: 0.27,
      },
      {
        rank: 8,
        moveText: '22/16 8/5*',
        movements: [
          {
            from: 8,
            to: 5,
            die: 3,
            hit: true,
          },
          {
            from: 22,
            to: 16,
            die: 6,
            hit: false,
          },
        ],
        finalKey:
          '0,0,1,2,0,1,4,-1,1,0,-2,0,0,2,-1,0,1,-2,-2,-2,-2,-2,0,3,0|0,1|0,0',
        equity: -1.34,
        equityLoss: 0.274,
      },
    ],
  },
  {
    id: 'curated-019',
    kind: 'play',
    theme: 'bear-off',
    source: 'curated',
    board: {
      points: [
        0, 3, 3, 2, 2, -1, 0, 0, 0, 0, 0, 0, -2, 0, 0, 0, 0, -2, -2, -5, 0, 0,
        0, -1, 0,
      ],
      bar: {
        white: 0,
        black: 2,
      },
      off: {
        white: 5,
        black: 0,
      },
    },
    hero: 'white',
    match: {
      matchLength: 0,
      score: {
        white: 0,
        black: 0,
      },
      cube: {
        value: 1,
        owner: 'center',
      },
    },
    roll: [2, 1],
    answers: [
      {
        rank: 1,
        moveText: '2/off 1/off',
        movements: [
          {
            from: 2,
            to: 'off',
            die: 2,
            hit: false,
          },
          {
            from: 1,
            to: 'off',
            die: 1,
            hit: false,
          },
        ],
        finalKey:
          '0,2,2,2,2,-1,0,0,0,0,0,0,-2,0,0,0,0,-2,-2,-5,0,0,0,-1,0|0,2|7,0',
        equity: 2.113,
        equityLoss: 0,
      },
      {
        rank: 2,
        moveText: '3/2 3/1',
        movements: [
          {
            from: 3,
            to: 1,
            die: 2,
            hit: false,
          },
          {
            from: 3,
            to: 2,
            die: 1,
            hit: false,
          },
        ],
        finalKey:
          '0,4,4,0,2,-1,0,0,0,0,0,0,-2,0,0,0,0,-2,-2,-5,0,0,0,-1,0|0,2|5,0',
        equity: 1.945,
        equityLoss: 0.16799999999999993,
      },
      {
        rank: 3,
        moveText: '4/3 4/2',
        movements: [
          {
            from: 4,
            to: 2,
            die: 2,
            hit: false,
          },
          {
            from: 4,
            to: 3,
            die: 1,
            hit: false,
          },
        ],
        finalKey:
          '0,3,4,3,0,-1,0,0,0,0,0,0,-2,0,0,0,0,-2,-2,-5,0,0,0,-1,0|0,2|5,0',
        equity: 1.943,
        equityLoss: 0.16999999999999993,
      },
      {
        rank: 4,
        moveText: '4/3 2/off',
        movements: [
          {
            from: 2,
            to: 'off',
            die: 2,
            hit: false,
          },
          {
            from: 4,
            to: 3,
            die: 1,
            hit: false,
          },
        ],
        finalKey:
          '0,3,2,3,1,-1,0,0,0,0,0,0,-2,0,0,0,0,-2,-2,-5,0,0,0,-1,0|0,2|6,0',
        equity: 1.75,
        equityLoss: 0.363,
      },
      {
        rank: 5,
        moveText: '4/2 1/off',
        movements: [
          {
            from: 4,
            to: 2,
            die: 2,
            hit: false,
          },
          {
            from: 1,
            to: 'off',
            die: 1,
            hit: false,
          },
        ],
        finalKey:
          '0,2,4,2,1,-1,0,0,0,0,0,0,-2,0,0,0,0,-2,-2,-5,0,0,0,-1,0|0,2|6,0',
        equity: 1.662,
        equityLoss: 0.45100000000000007,
      },
      {
        rank: 6,
        moveText: '4/1',
        movements: [
          {
            from: 4,
            to: 2,
            die: 2,
            hit: false,
          },
          {
            from: 2,
            to: 1,
            die: 1,
            hit: false,
          },
        ],
        finalKey:
          '0,4,3,2,1,-1,0,0,0,0,0,0,-2,0,0,0,0,-2,-2,-5,0,0,0,-1,0|0,2|5,0',
        equity: 1.632,
        equityLoss: 0.4810000000000001,
      },
      {
        rank: 7,
        moveText: '3/off',
        movements: [
          {
            from: 3,
            to: 1,
            die: 2,
            hit: false,
          },
          {
            from: 1,
            to: 'off',
            die: 1,
            hit: false,
          },
        ],
        finalKey:
          '0,3,3,1,2,-1,0,0,0,0,0,0,-2,0,0,0,0,-2,-2,-5,0,0,0,-1,0|0,2|6,0',
        equity: 1.586,
        equityLoss: 0.5269999999999999,
      },
      {
        rank: 8,
        moveText: '2/1 2/off',
        movements: [
          {
            from: 2,
            to: 'off',
            die: 2,
            hit: false,
          },
          {
            from: 2,
            to: 1,
            die: 1,
            hit: false,
          },
        ],
        finalKey:
          '0,4,1,2,2,-1,0,0,0,0,0,0,-2,0,0,0,0,-2,-2,-5,0,0,0,-1,0|0,2|6,0',
        equity: 1.446,
        equityLoss: 0.667,
      },
      {
        rank: 9,
        moveText: '3/1 2/1',
        movements: [
          {
            from: 3,
            to: 1,
            die: 2,
            hit: false,
          },
          {
            from: 2,
            to: 1,
            die: 1,
            hit: false,
          },
        ],
        finalKey:
          '0,5,2,1,2,-1,0,0,0,0,0,0,-2,0,0,0,0,-2,-2,-5,0,0,0,-1,0|0,2|5,0',
        equity: 1.544,
        equityLoss: 0.569,
      },
      {
        rank: 10,
        moveText: '4/2 3/2',
        movements: [
          {
            from: 4,
            to: 2,
            die: 2,
            hit: false,
          },
          {
            from: 3,
            to: 2,
            die: 1,
            hit: false,
          },
        ],
        finalKey:
          '0,3,5,1,1,-1,0,0,0,0,0,0,-2,0,0,0,0,-2,-2,-5,0,0,0,-1,0|0,2|5,0',
        equity: 1.264,
        equityLoss: 0.849,
      },
    ],
  },
  {
    id: 'curated-020',
    kind: 'play',
    theme: 'bear-off',
    source: 'curated',
    board: {
      points: [
        0, 4, 3, 3, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, -1, 0, -2, -2,
        -2, -4,
      ],
      bar: {
        white: 0,
        black: 0,
      },
      off: {
        white: 4,
        black: 4,
      },
    },
    hero: 'white',
    match: {
      matchLength: 0,
      score: {
        white: 0,
        black: 0,
      },
      cube: {
        value: 1,
        owner: 'center',
      },
    },
    roll: [1, 2],
    answers: [
      {
        rank: 1,
        moveText: '2/off 1/off',
        movements: [
          {
            from: 1,
            to: 'off',
            die: 1,
            hit: false,
          },
          {
            from: 2,
            to: 'off',
            die: 2,
            hit: false,
          },
        ],
        finalKey:
          '0,3,2,3,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,-1,0,-2,-2,-2,-4|0,0|6,4',
        equity: 0.6,
        equityLoss: 0,
      },
      {
        rank: 2,
        moveText: '5/3 1/off',
        movements: [
          {
            from: 1,
            to: 'off',
            die: 1,
            hit: false,
          },
          {
            from: 5,
            to: 3,
            die: 2,
            hit: false,
          },
        ],
        finalKey:
          '0,3,3,4,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,-1,0,-2,-2,-2,-4|0,0|5,4',
        equity: 0.482,
        equityLoss: 0.118,
      },
      {
        rank: 3,
        moveText: '5/4 2/off',
        movements: [
          {
            from: 5,
            to: 4,
            die: 1,
            hit: false,
          },
          {
            from: 2,
            to: 'off',
            die: 2,
            hit: false,
          },
        ],
        finalKey:
          '0,4,2,3,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,-1,0,-2,-2,-2,-4|0,0|5,4',
        equity: 0.468,
        equityLoss: 0.13199999999999995,
      },
      {
        rank: 4,
        moveText: '3/off',
        movements: [
          {
            from: 1,
            to: 'off',
            die: 1,
            hit: false,
          },
          {
            from: 3,
            to: 1,
            die: 2,
            hit: false,
          },
        ],
        finalKey:
          '0,4,3,2,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,-1,0,-2,-2,-2,-4|0,0|5,4',
        equity: 0.235,
        equityLoss: 0.365,
      },
      {
        rank: 5,
        moveText: '2/1 2/off',
        movements: [
          {
            from: 2,
            to: 1,
            die: 1,
            hit: false,
          },
          {
            from: 2,
            to: 'off',
            die: 2,
            hit: false,
          },
        ],
        finalKey:
          '0,5,1,3,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,-1,0,-2,-2,-2,-4|0,0|5,4',
        equity: 0.091,
        equityLoss: 0.509,
      },
      {
        rank: 6,
        moveText: '3/2 3/1',
        movements: [
          {
            from: 3,
            to: 2,
            die: 1,
            hit: false,
          },
          {
            from: 3,
            to: 1,
            die: 2,
            hit: false,
          },
        ],
        finalKey:
          '0,5,4,1,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,-1,0,-2,-2,-2,-4|0,0|4,4',
        equity: -0.405,
        equityLoss: 1.005,
      },
      {
        rank: 7,
        moveText: '5/4 3/1',
        movements: [
          {
            from: 5,
            to: 4,
            die: 1,
            hit: false,
          },
          {
            from: 3,
            to: 1,
            die: 2,
            hit: false,
          },
        ],
        finalKey:
          '0,5,3,2,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,-1,0,-2,-2,-2,-4|0,0|4,4',
        equity: -0.407,
        equityLoss: 1.007,
      },
      {
        rank: 8,
        moveText: '5/2',
        movements: [
          {
            from: 3,
            to: 2,
            die: 1,
            hit: false,
          },
          {
            from: 5,
            to: 3,
            die: 2,
            hit: false,
          },
        ],
        finalKey:
          '0,4,4,3,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,-1,0,-2,-2,-2,-4|0,0|4,4',
        equity: -0.413,
        equityLoss: 1.013,
      },
      {
        rank: 9,
        moveText: '3/1 2/1',
        movements: [
          {
            from: 2,
            to: 1,
            die: 1,
            hit: false,
          },
          {
            from: 3,
            to: 1,
            die: 2,
            hit: false,
          },
        ],
        finalKey:
          '0,6,2,2,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,-1,0,-2,-2,-2,-4|0,0|4,4',
        equity: -0.445,
        equityLoss: 1.045,
      },
      {
        rank: 10,
        moveText: '5/3 2/1',
        movements: [
          {
            from: 2,
            to: 1,
            die: 1,
            hit: false,
          },
          {
            from: 5,
            to: 3,
            die: 2,
            hit: false,
          },
        ],
        finalKey:
          '0,5,2,4,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,-1,0,-2,-2,-2,-4|0,0|4,4',
        equity: -0.464,
        equityLoss: 1.064,
      },
    ],
  },
  {
    id: 'curated-021',
    kind: 'play',
    theme: 'bear-off',
    source: 'curated',
    board: {
      points: [
        0, 3, 3, 3, 1, 2, -1, 0, 0, 0, 0, 0, 0, 0, 0, 0, -1, -2, -2, -4, -2, 0,
        0, -1, -2,
      ],
      bar: {
        white: 0,
        black: 0,
      },
      off: {
        white: 3,
        black: 0,
      },
    },
    hero: 'white',
    match: {
      matchLength: 0,
      score: {
        white: 0,
        black: 0,
      },
      cube: {
        value: 1,
        owner: 'center',
      },
    },
    roll: [1, 3],
    answers: [
      {
        rank: 1,
        moveText: '3/off 1/off',
        movements: [
          {
            from: 1,
            to: 'off',
            die: 1,
            hit: false,
          },
          {
            from: 3,
            to: 'off',
            die: 3,
            hit: false,
          },
        ],
        finalKey:
          '0,2,3,2,1,2,-1,0,0,0,0,0,0,0,0,0,-1,-2,-2,-4,-2,0,0,-1,-2|0,0|5,0',
        equity: 1.151,
        equityLoss: 0,
      },
      {
        rank: 2,
        moveText: '5/2 1/off',
        movements: [
          {
            from: 1,
            to: 'off',
            die: 1,
            hit: false,
          },
          {
            from: 5,
            to: 2,
            die: 3,
            hit: false,
          },
        ],
        finalKey:
          '0,2,4,3,1,1,-1,0,0,0,0,0,0,0,0,0,-1,-2,-2,-4,-2,0,0,-1,-2|0,0|4,0',
        equity: 1.054,
        equityLoss: 0.09699999999999998,
      },
      {
        rank: 3,
        moveText: '5/4 3/off',
        movements: [
          {
            from: 5,
            to: 4,
            die: 1,
            hit: false,
          },
          {
            from: 3,
            to: 'off',
            die: 3,
            hit: false,
          },
        ],
        finalKey:
          '0,3,3,2,2,1,-1,0,0,0,0,0,0,0,0,0,-1,-2,-2,-4,-2,0,0,-1,-2|0,0|4,0',
        equity: 1.052,
        equityLoss: 0.09899999999999998,
      },
      {
        rank: 4,
        moveText: '3/2 3/off',
        movements: [
          {
            from: 3,
            to: 2,
            die: 1,
            hit: false,
          },
          {
            from: 3,
            to: 'off',
            die: 3,
            hit: false,
          },
        ],
        finalKey:
          '0,3,4,1,1,2,-1,0,0,0,0,0,0,0,0,0,-1,-2,-2,-4,-2,0,0,-1,-2|0,0|4,0',
        equity: 1.047,
        equityLoss: 0.10400000000000009,
      },
      {
        rank: 5,
        moveText: '4/off',
        movements: [
          {
            from: 4,
            to: 3,
            die: 1,
            hit: false,
          },
          {
            from: 3,
            to: 'off',
            die: 3,
            hit: false,
          },
        ],
        finalKey:
          '0,3,3,3,0,2,-1,0,0,0,0,0,0,0,0,0,-1,-2,-2,-4,-2,0,0,-1,-2|0,0|4,0',
        equity: 1.046,
        equityLoss: 0.10499999999999998,
      },
      {
        rank: 6,
        moveText: '3/off 2/1',
        movements: [
          {
            from: 2,
            to: 1,
            die: 1,
            hit: false,
          },
          {
            from: 3,
            to: 'off',
            die: 3,
            hit: false,
          },
        ],
        finalKey:
          '0,4,2,2,1,2,-1,0,0,0,0,0,0,0,0,0,-1,-2,-2,-4,-2,0,0,-1,-2|0,0|4,0',
        equity: 1.045,
        equityLoss: 0.1060000000000001,
      },
      {
        rank: 7,
        moveText: '5/4 5/2',
        movements: [
          {
            from: 5,
            to: 4,
            die: 1,
            hit: false,
          },
          {
            from: 5,
            to: 2,
            die: 3,
            hit: false,
          },
        ],
        finalKey:
          '0,3,4,3,2,0,-1,0,0,0,0,0,0,0,0,0,-1,-2,-2,-4,-2,0,0,-1,-2|0,0|3,0',
        equity: 1.043,
        equityLoss: 0.1080000000000001,
      },
      {
        rank: 8,
        moveText: '5/2 3/2',
        movements: [
          {
            from: 3,
            to: 2,
            die: 1,
            hit: false,
          },
          {
            from: 5,
            to: 2,
            die: 3,
            hit: false,
          },
        ],
        finalKey:
          '0,3,5,2,1,1,-1,0,0,0,0,0,0,0,0,0,-1,-2,-2,-4,-2,0,0,-1,-2|0,0|3,0',
        equity: 1.039,
        equityLoss: 0.1120000000000001,
      },
      {
        rank: 9,
        moveText: '5/2 4/3',
        movements: [
          {
            from: 4,
            to: 3,
            die: 1,
            hit: false,
          },
          {
            from: 5,
            to: 2,
            die: 3,
            hit: false,
          },
        ],
        finalKey:
          '0,3,4,4,0,1,-1,0,0,0,0,0,0,0,0,0,-1,-2,-2,-4,-2,0,0,-1,-2|0,0|3,0',
        equity: 1.038,
        equityLoss: 0.11299999999999999,
      },
      {
        rank: 10,
        moveText: '5/1',
        movements: [
          {
            from: 5,
            to: 4,
            die: 1,
            hit: false,
          },
          {
            from: 4,
            to: 1,
            die: 3,
            hit: false,
          },
        ],
        finalKey:
          '0,4,3,3,1,1,-1,0,0,0,0,0,0,0,0,0,-1,-2,-2,-4,-2,0,0,-1,-2|0,0|3,0',
        equity: 1.037,
        equityLoss: 0.1140000000000001,
      },
      {
        rank: 11,
        moveText: '4/1 3/2',
        movements: [
          {
            from: 3,
            to: 2,
            die: 1,
            hit: false,
          },
          {
            from: 4,
            to: 1,
            die: 3,
            hit: false,
          },
        ],
        finalKey:
          '0,4,4,2,0,2,-1,0,0,0,0,0,0,0,0,0,-1,-2,-2,-4,-2,0,0,-1,-2|0,0|3,0',
        equity: 1.032,
        equityLoss: 0.119,
      },
      {
        rank: 12,
        moveText: '4/1 2/1',
        movements: [
          {
            from: 2,
            to: 1,
            die: 1,
            hit: false,
          },
          {
            from: 4,
            to: 1,
            die: 3,
            hit: false,
          },
        ],
        finalKey:
          '0,5,2,3,0,2,-1,0,0,0,0,0,0,0,0,0,-1,-2,-2,-4,-2,0,0,-1,-2|0,0|3,0',
        equity: 1.03,
        equityLoss: 0.121,
      },
    ],
  },
  {
    id: 'curated-022',
    kind: 'play',
    theme: 'bear-off',
    source: 'curated',
    board: {
      points: [
        0, 2, 2, 3, 3, 2, 3, 0, 0, 0, 0, -1, 0, 0, 0, 0, -1, 0, 0, 0, 0, 0, 0,
        -4, -8,
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
      matchLength: 0,
      score: {
        white: 0,
        black: 0,
      },
      cube: {
        value: 1,
        owner: 'center',
      },
    },
    roll: [2, 1],
    answers: [
      {
        rank: 1,
        moveText: '3/off',
        movements: [
          {
            from: 2,
            to: 'off',
            die: 2,
            hit: false,
          },
          {
            from: 3,
            to: 2,
            die: 1,
            hit: false,
          },
        ],
        finalKey:
          '0,2,2,2,3,2,3,0,0,0,0,-1,0,0,0,0,-1,0,0,0,0,0,0,-4,-8|0,1|1,0',
        equity: 1.249,
        equityLoss: 0,
      },
      {
        rank: 2,
        moveText: '6/5 3/1',
        movements: [
          {
            from: 3,
            to: 1,
            die: 2,
            hit: false,
          },
          {
            from: 6,
            to: 5,
            die: 1,
            hit: false,
          },
        ],
        finalKey:
          '0,3,2,2,3,3,2,0,0,0,0,-1,0,0,0,0,-1,0,0,0,0,0,0,-4,-8|0,1|0,0',
        equity: 1.199,
        equityLoss: 0.050000000000000044,
      },
      {
        rank: 3,
        moveText: '6/5 4/2',
        movements: [
          {
            from: 4,
            to: 2,
            die: 2,
            hit: false,
          },
          {
            from: 6,
            to: 5,
            die: 1,
            hit: false,
          },
        ],
        finalKey:
          '0,2,3,3,2,3,2,0,0,0,0,-1,0,0,0,0,-1,0,0,0,0,0,0,-4,-8|0,1|0,0',
        equity: 1.192,
        equityLoss: 0.05700000000000016,
      },
      {
        rank: 4,
        moveText: '4/2 1/off',
        movements: [
          {
            from: 4,
            to: 2,
            die: 2,
            hit: false,
          },
          {
            from: 1,
            to: 'off',
            die: 1,
            hit: false,
          },
        ],
        finalKey:
          '0,1,3,3,2,2,3,0,0,0,0,-1,0,0,0,0,-1,0,0,0,0,0,0,-4,-8|0,1|1,0',
        equity: 1.189,
        equityLoss: 0.06000000000000005,
      },
      {
        rank: 5,
        moveText: '4/1',
        movements: [
          {
            from: 3,
            to: 1,
            die: 2,
            hit: false,
          },
          {
            from: 4,
            to: 3,
            die: 1,
            hit: false,
          },
        ],
        finalKey:
          '0,3,2,3,2,2,3,0,0,0,0,-1,0,0,0,0,-1,0,0,0,0,0,0,-4,-8|0,1|0,0',
        equity: 1.185,
        equityLoss: 0.06400000000000006,
      },
      {
        rank: 6,
        moveText: '6/4 3/2',
        movements: [
          {
            from: 6,
            to: 4,
            die: 2,
            hit: false,
          },
          {
            from: 3,
            to: 2,
            die: 1,
            hit: false,
          },
        ],
        finalKey:
          '0,2,3,2,4,2,2,0,0,0,0,-1,0,0,0,0,-1,0,0,0,0,0,0,-4,-8|0,1|0,0',
        equity: 1.178,
        equityLoss: 0.07100000000000017,
      },
      {
        rank: 7,
        moveText: '6/3',
        movements: [
          {
            from: 5,
            to: 3,
            die: 2,
            hit: false,
          },
          {
            from: 6,
            to: 5,
            die: 1,
            hit: false,
          },
        ],
        finalKey:
          '0,2,2,4,3,2,2,0,0,0,0,-1,0,0,0,0,-1,0,0,0,0,0,0,-4,-8|0,1|0,0',
        equity: 1.171,
        equityLoss: 0.07800000000000007,
      },
      {
        rank: 8,
        moveText: '6/5 2/off',
        movements: [
          {
            from: 2,
            to: 'off',
            die: 2,
            hit: false,
          },
          {
            from: 6,
            to: 5,
            die: 1,
            hit: false,
          },
        ],
        finalKey:
          '0,2,1,3,3,3,2,0,0,0,0,-1,0,0,0,0,-1,0,0,0,0,0,0,-4,-8|0,1|1,0',
        equity: 1.163,
        equityLoss: 0.08600000000000008,
      },
      {
        rank: 9,
        moveText: '6/4 1/off',
        movements: [
          {
            from: 6,
            to: 4,
            die: 2,
            hit: false,
          },
          {
            from: 1,
            to: 'off',
            die: 1,
            hit: false,
          },
        ],
        finalKey:
          '0,1,2,3,4,2,2,0,0,0,0,-1,0,0,0,0,-1,0,0,0,0,0,0,-4,-8|0,1|1,0',
        equity: 1.159,
        equityLoss: 0.09000000000000008,
      },
      {
        rank: 10,
        moveText: '4/2 3/2',
        movements: [
          {
            from: 4,
            to: 2,
            die: 2,
            hit: false,
          },
          {
            from: 3,
            to: 2,
            die: 1,
            hit: false,
          },
        ],
        finalKey:
          '0,2,4,2,2,2,3,0,0,0,0,-1,0,0,0,0,-1,0,0,0,0,0,0,-4,-8|0,1|0,0',
        equity: 1.156,
        equityLoss: 0.0930000000000002,
      },
      {
        rank: 11,
        moveText: '2/1 2/off',
        movements: [
          {
            from: 2,
            to: 'off',
            die: 2,
            hit: false,
          },
          {
            from: 2,
            to: 1,
            die: 1,
            hit: false,
          },
        ],
        finalKey:
          '0,3,0,3,3,2,3,0,0,0,0,-1,0,0,0,0,-1,0,0,0,0,0,0,-4,-8|0,1|1,0',
        equity: 1.114,
        equityLoss: 0.135,
      },
      {
        rank: 12,
        moveText: '4/3 2/off',
        movements: [
          {
            from: 2,
            to: 'off',
            die: 2,
            hit: false,
          },
          {
            from: 4,
            to: 3,
            die: 1,
            hit: false,
          },
        ],
        finalKey:
          '0,2,1,4,2,2,3,0,0,0,0,-1,0,0,0,0,-1,0,0,0,0,0,0,-4,-8|0,1|1,0',
        equity: 1.113,
        equityLoss: 0.13600000000000012,
      },
      {
        rank: 13,
        moveText: '5/4 5/3',
        movements: [
          {
            from: 5,
            to: 3,
            die: 2,
            hit: false,
          },
          {
            from: 5,
            to: 4,
            die: 1,
            hit: false,
          },
        ],
        finalKey:
          '0,2,2,4,4,0,3,0,0,0,0,-1,0,0,0,0,-1,0,0,0,0,0,0,-4,-8|0,1|0,0',
        equity: 1.075,
        equityLoss: 0.17400000000000015,
      },
      {
        rank: 14,
        moveText: '2/off 1/off',
        movements: [
          {
            from: 2,
            to: 'off',
            die: 2,
            hit: false,
          },
          {
            from: 1,
            to: 'off',
            die: 1,
            hit: false,
          },
        ],
        finalKey:
          '0,1,1,3,3,2,3,0,0,0,0,-1,0,0,0,0,-1,0,0,0,0,0,0,-4,-8|0,1|2,0',
        equity: 1.063,
        equityLoss: 0.18600000000000017,
      },
      {
        rank: 15,
        moveText: '6/4 2/1',
        movements: [
          {
            from: 6,
            to: 4,
            die: 2,
            hit: false,
          },
          {
            from: 2,
            to: 1,
            die: 1,
            hit: false,
          },
        ],
        finalKey:
          '0,3,1,3,4,2,2,0,0,0,0,-1,0,0,0,0,-1,0,0,0,0,0,0,-4,-8|0,1|0,0',
        equity: 1.056,
        equityLoss: 0.19300000000000006,
      },
      {
        rank: 16,
        moveText: '5/2',
        movements: [
          {
            from: 4,
            to: 2,
            die: 2,
            hit: false,
          },
          {
            from: 5,
            to: 4,
            die: 1,
            hit: false,
          },
        ],
        finalKey:
          '0,2,3,3,3,1,3,0,0,0,0,-1,0,0,0,0,-1,0,0,0,0,0,0,-4,-8|0,1|0,0',
        equity: 1.051,
        equityLoss: 0.19800000000000018,
      },
      {
        rank: 17,
        moveText: '6/5 6/4',
        movements: [
          {
            from: 6,
            to: 4,
            die: 2,
            hit: false,
          },
          {
            from: 6,
            to: 5,
            die: 1,
            hit: false,
          },
        ],
        finalKey:
          '0,2,2,3,4,3,1,0,0,0,0,-1,0,0,0,0,-1,0,0,0,0,0,0,-4,-8|0,1|0,0',
        equity: 1.048,
        equityLoss: 0.20100000000000007,
      },
      {
        rank: 18,
        moveText: '3/2 3/1',
        movements: [
          {
            from: 3,
            to: 1,
            die: 2,
            hit: false,
          },
          {
            from: 3,
            to: 2,
            die: 1,
            hit: false,
          },
        ],
        finalKey:
          '0,3,3,1,3,2,3,0,0,0,0,-1,0,0,0,0,-1,0,0,0,0,0,0,-4,-8|0,1|0,0',
        equity: 1.046,
        equityLoss: 0.20300000000000007,
      },
      {
        rank: 19,
        moveText: '5/3 4/3',
        movements: [
          {
            from: 5,
            to: 3,
            die: 2,
            hit: false,
          },
          {
            from: 4,
            to: 3,
            die: 1,
            hit: false,
          },
        ],
        finalKey:
          '0,2,2,5,2,1,3,0,0,0,0,-1,0,0,0,0,-1,0,0,0,0,0,0,-4,-8|0,1|0,0',
        equity: 1.042,
        equityLoss: 0.20700000000000007,
      },
      {
        rank: 20,
        moveText: '5/4 3/1',
        movements: [
          {
            from: 3,
            to: 1,
            die: 2,
            hit: false,
          },
          {
            from: 5,
            to: 4,
            die: 1,
            hit: false,
          },
        ],
        finalKey:
          '0,3,2,2,4,1,3,0,0,0,0,-1,0,0,0,0,-1,0,0,0,0,0,0,-4,-8|0,1|0,0',
        equity: 1.04,
        equityLoss: 0.20900000000000007,
      },
      {
        rank: 21,
        moveText: '3/1 2/1',
        movements: [
          {
            from: 3,
            to: 1,
            die: 2,
            hit: false,
          },
          {
            from: 2,
            to: 1,
            die: 1,
            hit: false,
          },
        ],
        finalKey:
          '0,4,1,2,3,2,3,0,0,0,0,-1,0,0,0,0,-1,0,0,0,0,0,0,-4,-8|0,1|0,0',
        equity: 1.037,
        equityLoss: 0.2120000000000002,
      },
      {
        rank: 22,
        moveText: '4/3 4/2',
        movements: [
          {
            from: 4,
            to: 2,
            die: 2,
            hit: false,
          },
          {
            from: 4,
            to: 3,
            die: 1,
            hit: false,
          },
        ],
        finalKey:
          '0,2,3,4,1,2,3,0,0,0,0,-1,0,0,0,0,-1,0,0,0,0,0,0,-4,-8|0,1|0,0',
        equity: 1.036,
        equityLoss: 0.21300000000000008,
      },
      {
        rank: 23,
        moveText: '6/4 5/4',
        movements: [
          {
            from: 6,
            to: 4,
            die: 2,
            hit: false,
          },
          {
            from: 5,
            to: 4,
            die: 1,
            hit: false,
          },
        ],
        finalKey:
          '0,2,2,3,5,1,2,0,0,0,0,-1,0,0,0,0,-1,0,0,0,0,0,0,-4,-8|0,1|0,0',
        equity: 1.022,
        equityLoss: 0.2270000000000001,
      },
      {
        rank: 24,
        moveText: '5/3 1/off',
        movements: [
          {
            from: 5,
            to: 3,
            die: 2,
            hit: false,
          },
          {
            from: 1,
            to: 'off',
            die: 1,
            hit: false,
          },
        ],
        finalKey:
          '0,1,2,4,3,1,3,0,0,0,0,-1,0,0,0,0,-1,0,0,0,0,0,0,-4,-8|0,1|1,0',
        equity: 0.972,
        equityLoss: 0.27700000000000014,
      },
      {
        rank: 25,
        moveText: '5/4 2/off',
        movements: [
          {
            from: 2,
            to: 'off',
            die: 2,
            hit: false,
          },
          {
            from: 5,
            to: 4,
            die: 1,
            hit: false,
          },
        ],
        finalKey:
          '0,2,1,3,4,1,3,0,0,0,0,-1,0,0,0,0,-1,0,0,0,0,0,0,-4,-8|0,1|1,0',
        equity: 0.965,
        equityLoss: 0.28400000000000014,
      },
      {
        rank: 26,
        moveText: '5/3 2/1',
        movements: [
          {
            from: 5,
            to: 3,
            die: 2,
            hit: false,
          },
          {
            from: 2,
            to: 1,
            die: 1,
            hit: false,
          },
        ],
        finalKey:
          '0,3,1,4,3,1,3,0,0,0,0,-1,0,0,0,0,-1,0,0,0,0,0,0,-4,-8|0,1|0,0',
        equity: 0.921,
        equityLoss: 0.32800000000000007,
      },
    ],
  },
  {
    id: 'curated-023',
    kind: 'play',
    theme: 'bear-off',
    source: 'curated',
    board: {
      points: [
        0, 3, 2, 2, 3, 2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, -1, 0, -3, 0,
        -5, -3,
      ],
      bar: {
        white: 0,
        black: 3,
      },
      off: {
        white: 3,
        black: 0,
      },
    },
    hero: 'white',
    match: {
      matchLength: 0,
      score: {
        white: 0,
        black: 0,
      },
      cube: {
        value: 1,
        owner: 'center',
      },
    },
    roll: [1, 2],
    answers: [
      {
        rank: 1,
        moveText: '4/2 1/off',
        movements: [
          {
            from: 1,
            to: 'off',
            die: 1,
            hit: false,
          },
          {
            from: 4,
            to: 2,
            die: 2,
            hit: false,
          },
        ],
        finalKey:
          '0,2,3,2,2,2,0,0,0,0,0,0,0,0,0,0,0,0,0,-1,0,-3,0,-5,-3|0,3|4,0',
        equity: 2.006,
        equityLoss: 0,
      },
      {
        rank: 2,
        moveText: '4/1',
        movements: [
          {
            from: 4,
            to: 3,
            die: 1,
            hit: false,
          },
          {
            from: 3,
            to: 1,
            die: 2,
            hit: false,
          },
        ],
        finalKey:
          '0,4,2,2,2,2,0,0,0,0,0,0,0,0,0,0,0,0,0,-1,0,-3,0,-5,-3|0,3|3,0',
        equity: 1.936,
        equityLoss: 0.06999999999999984,
      },
      {
        rank: 3,
        moveText: '5/4 5/3',
        movements: [
          {
            from: 5,
            to: 4,
            die: 1,
            hit: false,
          },
          {
            from: 5,
            to: 3,
            die: 2,
            hit: false,
          },
        ],
        finalKey:
          '0,3,2,3,4,0,0,0,0,0,0,0,0,0,0,0,0,0,0,-1,0,-3,0,-5,-3|0,3|3,0',
        equity: 1.918,
        equityLoss: 0.08799999999999986,
      },
      {
        rank: 4,
        moveText: '5/3 1/off',
        movements: [
          {
            from: 1,
            to: 'off',
            die: 1,
            hit: false,
          },
          {
            from: 5,
            to: 3,
            die: 2,
            hit: false,
          },
        ],
        finalKey:
          '0,2,2,3,3,1,0,0,0,0,0,0,0,0,0,0,0,0,0,-1,0,-3,0,-5,-3|0,3|4,0',
        equity: 1.882,
        equityLoss: 0.12399999999999989,
      },
      {
        rank: 5,
        moveText: '2/off 1/off',
        movements: [
          {
            from: 1,
            to: 'off',
            die: 1,
            hit: false,
          },
          {
            from: 2,
            to: 'off',
            die: 2,
            hit: false,
          },
        ],
        finalKey:
          '0,2,1,2,3,2,0,0,0,0,0,0,0,0,0,0,0,0,0,-1,0,-3,0,-5,-3|0,3|5,0',
        equity: 1.839,
        equityLoss: 0.16699999999999982,
      },
      {
        rank: 6,
        moveText: '3/2 3/1',
        movements: [
          {
            from: 3,
            to: 2,
            die: 1,
            hit: false,
          },
          {
            from: 3,
            to: 1,
            die: 2,
            hit: false,
          },
        ],
        finalKey:
          '0,4,3,0,3,2,0,0,0,0,0,0,0,0,0,0,0,0,0,-1,0,-3,0,-5,-3|0,3|3,0',
        equity: 1.812,
        equityLoss: 0.19399999999999973,
      },
      {
        rank: 7,
        moveText: '2/1 2/off',
        movements: [
          {
            from: 2,
            to: 1,
            die: 1,
            hit: false,
          },
          {
            from: 2,
            to: 'off',
            die: 2,
            hit: false,
          },
        ],
        finalKey:
          '0,4,0,2,3,2,0,0,0,0,0,0,0,0,0,0,0,0,0,-1,0,-3,0,-5,-3|0,3|4,0',
        equity: 1.805,
        equityLoss: 0.20099999999999985,
      },
      {
        rank: 8,
        moveText: '4/3 2/off',
        movements: [
          {
            from: 4,
            to: 3,
            die: 1,
            hit: false,
          },
          {
            from: 2,
            to: 'off',
            die: 2,
            hit: false,
          },
        ],
        finalKey:
          '0,3,1,3,2,2,0,0,0,0,0,0,0,0,0,0,0,0,0,-1,0,-3,0,-5,-3|0,3|4,0',
        equity: 1.803,
        equityLoss: 0.20299999999999985,
      },
      {
        rank: 9,
        moveText: '3/off',
        movements: [
          {
            from: 3,
            to: 2,
            die: 1,
            hit: false,
          },
          {
            from: 2,
            to: 'off',
            die: 2,
            hit: false,
          },
        ],
        finalKey:
          '0,3,2,1,3,2,0,0,0,0,0,0,0,0,0,0,0,0,0,-1,0,-3,0,-5,-3|0,3|4,0',
        equity: 1.76,
        equityLoss: 0.24599999999999977,
      },
      {
        rank: 10,
        moveText: '5/3 4/3',
        movements: [
          {
            from: 4,
            to: 3,
            die: 1,
            hit: false,
          },
          {
            from: 5,
            to: 3,
            die: 2,
            hit: false,
          },
        ],
        finalKey:
          '0,3,2,4,2,1,0,0,0,0,0,0,0,0,0,0,0,0,0,-1,0,-3,0,-5,-3|0,3|3,0',
        equity: 1.756,
        equityLoss: 0.24999999999999978,
      },
      {
        rank: 11,
        moveText: '5/2',
        movements: [
          {
            from: 5,
            to: 4,
            die: 1,
            hit: false,
          },
          {
            from: 4,
            to: 2,
            die: 2,
            hit: false,
          },
        ],
        finalKey:
          '0,3,3,2,3,1,0,0,0,0,0,0,0,0,0,0,0,0,0,-1,0,-3,0,-5,-3|0,3|3,0',
        equity: 1.755,
        equityLoss: 0.2509999999999999,
      },
      {
        rank: 12,
        moveText: '4/3 4/2',
        movements: [
          {
            from: 4,
            to: 3,
            die: 1,
            hit: false,
          },
          {
            from: 4,
            to: 2,
            die: 2,
            hit: false,
          },
        ],
        finalKey:
          '0,3,3,3,1,2,0,0,0,0,0,0,0,0,0,0,0,0,0,-1,0,-3,0,-5,-3|0,3|3,0',
        equity: 1.725,
        equityLoss: 0.2809999999999997,
      },
      {
        rank: 13,
        moveText: '4/2 3/2',
        movements: [
          {
            from: 3,
            to: 2,
            die: 1,
            hit: false,
          },
          {
            from: 4,
            to: 2,
            die: 2,
            hit: false,
          },
        ],
        finalKey:
          '0,3,4,1,2,2,0,0,0,0,0,0,0,0,0,0,0,0,0,-1,0,-3,0,-5,-3|0,3|3,0',
        equity: 1.702,
        equityLoss: 0.3039999999999998,
      },
      {
        rank: 14,
        moveText: '5/4 2/off',
        movements: [
          {
            from: 5,
            to: 4,
            die: 1,
            hit: false,
          },
          {
            from: 2,
            to: 'off',
            die: 2,
            hit: false,
          },
        ],
        finalKey:
          '0,3,1,2,4,1,0,0,0,0,0,0,0,0,0,0,0,0,0,-1,0,-3,0,-5,-3|0,3|4,0',
        equity: 1.556,
        equityLoss: 0.44999999999999973,
      },
      {
        rank: 15,
        moveText: '5/3 2/1',
        movements: [
          {
            from: 2,
            to: 1,
            die: 1,
            hit: false,
          },
          {
            from: 5,
            to: 3,
            die: 2,
            hit: false,
          },
        ],
        finalKey:
          '0,4,1,3,3,1,0,0,0,0,0,0,0,0,0,0,0,0,0,-1,0,-3,0,-5,-3|0,3|3,0',
        equity: 1.537,
        equityLoss: 0.46899999999999986,
      },
      {
        rank: 16,
        moveText: '3/1 2/1',
        movements: [
          {
            from: 2,
            to: 1,
            die: 1,
            hit: false,
          },
          {
            from: 3,
            to: 1,
            die: 2,
            hit: false,
          },
        ],
        finalKey:
          '0,5,1,1,3,2,0,0,0,0,0,0,0,0,0,0,0,0,0,-1,0,-3,0,-5,-3|0,3|3,0',
        equity: 1.502,
        equityLoss: 0.5039999999999998,
      },
      {
        rank: 17,
        moveText: '5/4 3/1',
        movements: [
          {
            from: 5,
            to: 4,
            die: 1,
            hit: false,
          },
          {
            from: 3,
            to: 1,
            die: 2,
            hit: false,
          },
        ],
        finalKey:
          '0,4,2,1,4,1,0,0,0,0,0,0,0,0,0,0,0,0,0,-1,0,-3,0,-5,-3|0,3|3,0',
        equity: 1.494,
        equityLoss: 0.5119999999999998,
      },
    ],
  },
  {
    id: 'curated-024',
    kind: 'play',
    theme: 'bear-off',
    source: 'curated',
    board: {
      points: [
        0, 2, 2, 4, 2, 3, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, -2, -2, -3,
        -5, 0,
      ],
      bar: {
        white: 0,
        black: 3,
      },
      off: {
        white: 2,
        black: 0,
      },
    },
    hero: 'white',
    match: {
      matchLength: 0,
      score: {
        white: 0,
        black: 0,
      },
      cube: {
        value: 1,
        owner: 'center',
      },
    },
    roll: [1, 4],
    answers: [
      {
        rank: 1,
        moveText: '5/off',
        movements: [
          {
            from: 5,
            to: 4,
            die: 1,
            hit: false,
          },
          {
            from: 4,
            to: 'off',
            die: 4,
            hit: false,
          },
        ],
        finalKey:
          '0,2,2,4,2,2,0,0,0,0,0,0,0,0,0,0,0,0,0,0,-2,-2,-3,-5,0|0,3|3,0',
        equity: 1.903,
        equityLoss: 0,
      },
      {
        rank: 2,
        moveText: '5/1 3/2',
        movements: [
          {
            from: 3,
            to: 2,
            die: 1,
            hit: false,
          },
          {
            from: 5,
            to: 1,
            die: 4,
            hit: false,
          },
        ],
        finalKey:
          '0,3,3,3,2,2,0,0,0,0,0,0,0,0,0,0,0,0,0,0,-2,-2,-3,-5,0|0,3|2,0',
        equity: 1.847,
        equityLoss: 0.05600000000000005,
      },
      {
        rank: 3,
        moveText: '4/3 4/off',
        movements: [
          {
            from: 4,
            to: 3,
            die: 1,
            hit: false,
          },
          {
            from: 4,
            to: 'off',
            die: 4,
            hit: false,
          },
        ],
        finalKey:
          '0,2,2,5,0,3,0,0,0,0,0,0,0,0,0,0,0,0,0,0,-2,-2,-3,-5,0|0,3|3,0',
        equity: 1.776,
        equityLoss: 0.127,
      },
      {
        rank: 4,
        moveText: '4/off 3/2',
        movements: [
          {
            from: 3,
            to: 2,
            die: 1,
            hit: false,
          },
          {
            from: 4,
            to: 'off',
            die: 4,
            hit: false,
          },
        ],
        finalKey:
          '0,2,3,3,1,3,0,0,0,0,0,0,0,0,0,0,0,0,0,0,-2,-2,-3,-5,0|0,3|3,0',
        equity: 1.627,
        equityLoss: 0.276,
      },
      {
        rank: 5,
        moveText: '5/4 5/1',
        movements: [
          {
            from: 5,
            to: 4,
            die: 1,
            hit: false,
          },
          {
            from: 5,
            to: 1,
            die: 4,
            hit: false,
          },
        ],
        finalKey:
          '0,3,2,4,3,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,-2,-2,-3,-5,0|0,3|2,0',
        equity: 1.617,
        equityLoss: 0.28600000000000003,
      },
      {
        rank: 6,
        moveText: '5/1 4/3',
        movements: [
          {
            from: 4,
            to: 3,
            die: 1,
            hit: false,
          },
          {
            from: 5,
            to: 1,
            die: 4,
            hit: false,
          },
        ],
        finalKey:
          '0,3,2,5,1,2,0,0,0,0,0,0,0,0,0,0,0,0,0,0,-2,-2,-3,-5,0|0,3|2,0',
        equity: 1.49,
        equityLoss: 0.41300000000000003,
      },
      {
        rank: 7,
        moveText: '5/1 2/1',
        movements: [
          {
            from: 2,
            to: 1,
            die: 1,
            hit: false,
          },
          {
            from: 5,
            to: 1,
            die: 4,
            hit: false,
          },
        ],
        finalKey:
          '0,4,1,4,2,2,0,0,0,0,0,0,0,0,0,0,0,0,0,0,-2,-2,-3,-5,0|0,3|2,0',
        equity: 1.461,
        equityLoss: 0.44199999999999995,
      },
      {
        rank: 8,
        moveText: '4/off 1/off',
        movements: [
          {
            from: 1,
            to: 'off',
            die: 1,
            hit: false,
          },
          {
            from: 4,
            to: 'off',
            die: 4,
            hit: false,
          },
        ],
        finalKey:
          '0,1,2,4,1,3,0,0,0,0,0,0,0,0,0,0,0,0,0,0,-2,-2,-3,-5,0|0,3|4,0',
        equity: 1.273,
        equityLoss: 0.6300000000000001,
      },
      {
        rank: 9,
        moveText: '4/off 2/1',
        movements: [
          {
            from: 2,
            to: 1,
            die: 1,
            hit: false,
          },
          {
            from: 4,
            to: 'off',
            die: 4,
            hit: false,
          },
        ],
        finalKey:
          '0,3,1,4,1,3,0,0,0,0,0,0,0,0,0,0,0,0,0,0,-2,-2,-3,-5,0|0,3|3,0',
        equity: 1.248,
        equityLoss: 0.655,
      },
    ],
  },
  {
    id: 'curated-025',
    kind: 'cube',
    theme: 'cube-handling',
    source: 'curated',
    board: {
      points: [
        0, -1, 0, 2, 2, 0, 4, 1, 1, 0, 0, 0, -2, 3, 0, 1, 0, -2, -2, -5, 1, 0,
        0, -1, 0,
      ],
      bar: {
        white: 0,
        black: 2,
      },
      off: {
        white: 0,
        black: 0,
      },
    },
    hero: 'white',
    match: {
      matchLength: 0,
      score: {
        white: 0,
        black: 0,
      },
      cube: {
        value: 1,
        owner: 'center',
      },
    },
    decision: 'offer',
    choices: [
      {
        action: 'no-double',
        equity: 1.309,
        equityLoss: 0,
      },
      {
        action: 'double',
        equity: 1,
        equityLoss: 0.309,
      },
    ],
    verdict: 'Too good to double, pass',
  },
  {
    id: 'curated-026',
    kind: 'cube',
    theme: 'cube-handling',
    source: 'curated',
    board: {
      points: [
        0, 0, 2, 2, 2, 2, 3, 1, 0, 0, 0, 0, -3, 0, 0, 0, -2, -3, 1, -6, 0, 0, 1,
        0, 1,
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
      matchLength: 0,
      score: {
        white: 0,
        black: 0,
      },
      cube: {
        value: 1,
        owner: 'center',
      },
    },
    decision: 'offer',
    choices: [
      {
        action: 'no-double',
        equity: 1.302,
        equityLoss: 0,
      },
      {
        action: 'double',
        equity: 1,
        equityLoss: 0.302,
      },
    ],
    verdict: 'Too good to double, pass',
  },
  {
    id: 'curated-027',
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
      matchLength: 0,
      score: {
        white: 0,
        black: 0,
      },
      cube: {
        value: 1,
        owner: 'center',
      },
    },
    decision: 'offer',
    choices: [
      {
        action: 'no-double',
        equity: 0.329,
        equityLoss: 0,
      },
      {
        action: 'double',
        equity: 0.162,
        equityLoss: 0.167,
      },
    ],
    verdict: 'No double, take',
  },
  {
    id: 'curated-028',
    kind: 'cube',
    theme: 'cube-handling',
    source: 'curated',
    board: {
      points: [
        0, -1, 0, 0, 0, -2, 5, 0, 4, 0, 0, 0, -3, 4, -1, 0, 1, -2, -2, -4, 0, 0,
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
      matchLength: 0,
      score: {
        white: 0,
        black: 0,
      },
      cube: {
        value: 1,
        owner: 'center',
      },
    },
    decision: 'offer',
    choices: [
      {
        action: 'no-double',
        equity: -0.042,
        equityLoss: 0,
      },
      {
        action: 'double',
        equity: -0.409,
        equityLoss: 0.367,
      },
    ],
    verdict: 'No double, take',
  },
  {
    id: 'curated-029',
    kind: 'cube',
    theme: 'cube-handling',
    source: 'curated',
    board: {
      points: [
        0, 0, 1, 2, 2, 3, 2, 2, 0, 0, 0, 0, -1, 0, 1, 0, 0, -3, 0, -3, 0, -4, 2,
        -2, -2,
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
      matchLength: 0,
      score: {
        white: 0,
        black: 0,
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
        equity: -0.811,
        equityLoss: 0,
      },
      {
        action: 'pass',
        equity: -1,
        equityLoss: 0.189,
      },
    ],
    verdict: 'Double, take',
  },
  {
    id: 'curated-030',
    kind: 'cube',
    theme: 'cube-handling',
    source: 'curated',
    board: {
      points: [
        0, 2, 0, 0, -1, 2, 5, 0, 1, 0, 0, 0, -5, 3, 0, 0, 1, -4, 0, -5, 0, 0, 0,
        0, 1,
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
      matchLength: 0,
      score: {
        white: 0,
        black: 0,
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
        equity: 0.802,
        equityLoss: 0,
      },
      {
        action: 'no-double',
        equity: 0.702,
        equityLoss: 0.1,
      },
    ],
    verdict: 'Double, take',
  },
];
