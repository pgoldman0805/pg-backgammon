/**
 * The bundled "Basics" puzzle set (GLOSSARY "Curated puzzle", "Theme").
 *
 * GENERATED FILE — do not edit by hand. Regenerate with:
 *   npm run mine:basics
 * (scripts/mineBasics.ts: small hand-authored teaching positions —
 * hitting, entering from the bar, making a point, escaping, bearing off —
 * each graded at full strength by the real gnubg WASM engine and kept only
 * when a clear best play exists. No positions are copied from books or other
 * published sources.)
 *
 * curatedPuzzles.validation.test.ts re-evaluates every stored answer against
 * the real WASM engine (the Basics set is bundled with the curated set), so
 * stale or wrong answer data cannot ship.
 */

// biome-ignore-all lint/suspicious/noApproximativeNumericConstant: engine equities are data, not math constants
import type { Puzzle } from './types';

export const BASICS_PUZZLES: readonly Puzzle[] = [
  {
    id: 'basics-001',
    kind: 'play',
    theme: 'basics',
    source: 'curated',
    board: {
      points: [
        0, -2, 0, 0, 0, 0, 5, 0, 3, 0, 0, 0, -5, 5, 0, 0, 0, -3, 0, -5, 0, 0, 0,
        0, 2,
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
    roll: [3, 1],
    answers: [
      {
        rank: 1,
        moveText: '8/5 6/5',
        movements: [
          {
            from: 8,
            to: 5,
            die: 3,
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
          '0,-2,0,0,0,2,4,0,2,0,0,0,-5,5,0,0,0,-3,0,-5,0,0,0,0,2|0,0|0,0',
        equity: 0.218,
        equityLoss: 0,
      },
      {
        rank: 2,
        moveText: '24/23 13/10',
        movements: [
          {
            from: 13,
            to: 10,
            die: 3,
            hit: false,
          },
          {
            from: 24,
            to: 23,
            die: 1,
            hit: false,
          },
        ],
        finalKey:
          '0,-2,0,0,0,0,5,0,3,0,1,0,-5,4,0,0,0,-3,0,-5,0,0,0,1,1|0,0|0,0',
        equity: -0.011,
        equityLoss: 0.229,
      },
      {
        rank: 3,
        moveText: '24/20',
        movements: [
          {
            from: 24,
            to: 21,
            die: 3,
            hit: false,
          },
          {
            from: 21,
            to: 20,
            die: 1,
            hit: false,
          },
        ],
        finalKey:
          '0,-2,0,0,0,0,5,0,3,0,0,0,-5,5,0,0,0,-3,0,-5,1,0,0,0,1|0,0|0,0',
        equity: -0.025,
        equityLoss: 0.243,
      },
      {
        rank: 4,
        moveText: '13/9',
        movements: [
          {
            from: 13,
            to: 10,
            die: 3,
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
          '0,-2,0,0,0,0,5,0,3,1,0,0,-5,4,0,0,0,-3,0,-5,0,0,0,0,2|0,0|0,0',
        equity: -0.026,
        equityLoss: 0.244,
      },
      {
        rank: 5,
        moveText: '13/10 6/5',
        movements: [
          {
            from: 13,
            to: 10,
            die: 3,
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
          '0,-2,0,0,0,1,4,0,3,0,1,0,-5,4,0,0,0,-3,0,-5,0,0,0,0,2|0,0|0,0',
        equity: -0.028,
        equityLoss: 0.246,
      },
      {
        rank: 6,
        moveText: '24/23 24/21',
        movements: [
          {
            from: 24,
            to: 21,
            die: 3,
            hit: false,
          },
          {
            from: 24,
            to: 23,
            die: 1,
            hit: false,
          },
        ],
        finalKey:
          '0,-2,0,0,0,0,5,0,3,0,0,0,-5,5,0,0,0,-3,0,-5,0,1,0,1,0|0,0|0,0',
        equity: -0.038,
        equityLoss: 0.256,
      },
      {
        rank: 7,
        moveText: '24/21 6/5',
        movements: [
          {
            from: 24,
            to: 21,
            die: 3,
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
          '0,-2,0,0,0,1,4,0,3,0,0,0,-5,5,0,0,0,-3,0,-5,0,1,0,0,1|0,0|0,0',
        equity: -0.047,
        equityLoss: 0.265,
      },
      {
        rank: 8,
        moveText: '24/23 6/3',
        movements: [
          {
            from: 6,
            to: 3,
            die: 3,
            hit: false,
          },
          {
            from: 24,
            to: 23,
            die: 1,
            hit: false,
          },
        ],
        finalKey:
          '0,-2,0,1,0,0,4,0,3,0,0,0,-5,5,0,0,0,-3,0,-5,0,0,0,1,1|0,0|0,0',
        equity: -0.131,
        equityLoss: 0.349,
      },
      {
        rank: 9,
        moveText: '24/23 8/5',
        movements: [
          {
            from: 8,
            to: 5,
            die: 3,
            hit: false,
          },
          {
            from: 24,
            to: 23,
            die: 1,
            hit: false,
          },
        ],
        finalKey:
          '0,-2,0,0,0,1,5,0,2,0,0,0,-5,5,0,0,0,-3,0,-5,0,0,0,1,1|0,0|0,0',
        equity: -0.109,
        equityLoss: 0.327,
      },
      {
        rank: 10,
        moveText: '24/21 8/7',
        movements: [
          {
            from: 24,
            to: 21,
            die: 3,
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
          '0,-2,0,0,0,0,5,1,2,0,0,0,-5,5,0,0,0,-3,0,-5,0,1,0,0,1|0,0|0,0',
        equity: -0.113,
        equityLoss: 0.331,
      },
      {
        rank: 11,
        moveText: '13/10 8/7',
        movements: [
          {
            from: 13,
            to: 10,
            die: 3,
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
          '0,-2,0,0,0,0,5,1,2,0,1,0,-5,4,0,0,0,-3,0,-5,0,0,0,0,2|0,0|0,0',
        equity: -0.114,
        equityLoss: 0.332,
      },
      {
        rank: 12,
        moveText: '8/4',
        movements: [
          {
            from: 8,
            to: 5,
            die: 3,
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
          '0,-2,0,0,1,0,5,0,2,0,0,0,-5,5,0,0,0,-3,0,-5,0,0,0,0,2|0,0|0,0',
        equity: -0.154,
        equityLoss: 0.372,
      },
      {
        rank: 13,
        moveText: '6/2',
        movements: [
          {
            from: 6,
            to: 3,
            die: 3,
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
          '0,-2,1,0,0,0,4,0,3,0,0,0,-5,5,0,0,0,-3,0,-5,0,0,0,0,2|0,0|0,0',
        equity: -0.185,
        equityLoss: 0.403,
      },
      {
        rank: 14,
        moveText: '6/5 6/3',
        movements: [
          {
            from: 6,
            to: 3,
            die: 3,
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
          '0,-2,0,1,0,1,3,0,3,0,0,0,-5,5,0,0,0,-3,0,-5,0,0,0,0,2|0,0|0,0',
        equity: -0.194,
        equityLoss: 0.41200000000000003,
      },
      {
        rank: 15,
        moveText: '8/7 6/3',
        movements: [
          {
            from: 6,
            to: 3,
            die: 3,
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
          '0,-2,0,1,0,0,4,1,2,0,0,0,-5,5,0,0,0,-3,0,-5,0,0,0,0,2|0,0|0,0',
        equity: -0.212,
        equityLoss: 0.43,
      },
      {
        rank: 16,
        moveText: '8/7 8/5',
        movements: [
          {
            from: 8,
            to: 5,
            die: 3,
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
          '0,-2,0,0,0,1,5,1,1,0,0,0,-5,5,0,0,0,-3,0,-5,0,0,0,0,2|0,0|0,0',
        equity: -0.314,
        equityLoss: 0.532,
      },
    ],
  },
  {
    id: 'basics-002',
    kind: 'play',
    theme: 'basics',
    source: 'curated',
    board: {
      points: [
        0, -2, 0, 0, 0, 0, 5, 0, 3, 0, 0, 0, -5, 5, 0, 0, 0, -3, 0, -5, 0, 0, 0,
        0, 2,
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
    roll: [4, 2],
    answers: [
      {
        rank: 1,
        moveText: '8/4 6/4',
        movements: [
          {
            from: 8,
            to: 4,
            die: 4,
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
          '0,-2,0,0,2,0,4,0,2,0,0,0,-5,5,0,0,0,-3,0,-5,0,0,0,0,2|0,0|0,0',
        equity: 0.16,
        equityLoss: 0,
      },
      {
        rank: 2,
        moveText: '24/20 13/11',
        movements: [
          {
            from: 24,
            to: 20,
            die: 4,
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
          '0,-2,0,0,0,0,5,0,3,0,0,1,-5,4,0,0,0,-3,0,-5,1,0,0,0,1|0,0|0,0',
        equity: 0.017,
        equityLoss: 0.14300000000000002,
      },
      {
        rank: 3,
        moveText: '24/22 13/9',
        movements: [
          {
            from: 13,
            to: 9,
            die: 4,
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
          '0,-2,0,0,0,0,5,0,3,1,0,0,-5,4,0,0,0,-3,0,-5,0,0,1,0,1|0,0|0,0',
        equity: 0.015,
        equityLoss: 0.14500000000000002,
      },
      {
        rank: 4,
        moveText: '13/11 13/9',
        movements: [
          {
            from: 13,
            to: 9,
            die: 4,
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
          '0,-2,0,0,0,0,5,0,3,1,0,1,-5,3,0,0,0,-3,0,-5,0,0,0,0,2|0,0|0,0',
        equity: 0.013,
        equityLoss: 0.147,
      },
      {
        rank: 5,
        moveText: '24/18',
        movements: [
          {
            from: 24,
            to: 20,
            die: 4,
            hit: false,
          },
          {
            from: 20,
            to: 18,
            die: 2,
            hit: false,
          },
        ],
        finalKey:
          '0,-2,0,0,0,0,5,0,3,0,0,0,-5,5,0,0,0,-3,1,-5,0,0,0,0,1|0,0|0,0',
        equity: -0.029,
        equityLoss: 0.189,
      },
      {
        rank: 6,
        moveText: '24/22 24/20',
        movements: [
          {
            from: 24,
            to: 20,
            die: 4,
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
          '0,-2,0,0,0,0,5,0,3,0,0,0,-5,5,0,0,0,-3,0,-5,1,0,1,0,0|0,0|0,0',
        equity: -0.03,
        equityLoss: 0.19,
      },
      {
        rank: 7,
        moveText: '13/9 6/4',
        movements: [
          {
            from: 13,
            to: 9,
            die: 4,
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
          '0,-2,0,0,1,0,4,0,3,1,0,0,-5,4,0,0,0,-3,0,-5,0,0,0,0,2|0,0|0,0',
        equity: -0.06,
        equityLoss: 0.22,
      },
      {
        rank: 8,
        moveText: '24/20 6/4',
        movements: [
          {
            from: 24,
            to: 20,
            die: 4,
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
          '0,-2,0,0,1,0,4,0,3,0,0,0,-5,5,0,0,0,-3,0,-5,1,0,0,0,1|0,0|0,0',
        equity: -0.074,
        equityLoss: 0.23399999999999999,
      },
      {
        rank: 9,
        moveText: '24/20 8/6',
        movements: [
          {
            from: 24,
            to: 20,
            die: 4,
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
          '0,-2,0,0,0,0,6,0,2,0,0,0,-5,5,0,0,0,-3,0,-5,1,0,0,0,1|0,0|0,0',
        equity: -0.083,
        equityLoss: 0.243,
      },
      {
        rank: 10,
        moveText: '13/7',
        movements: [
          {
            from: 13,
            to: 9,
            die: 4,
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
          '0,-2,0,0,0,0,5,1,3,0,0,0,-5,4,0,0,0,-3,0,-5,0,0,0,0,2|0,0|0,0',
        equity: -0.084,
        equityLoss: 0.244,
      },
      {
        rank: 11,
        moveText: '13/9 8/6',
        movements: [
          {
            from: 13,
            to: 9,
            die: 4,
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
          '0,-2,0,0,0,0,6,0,2,1,0,0,-5,4,0,0,0,-3,0,-5,0,0,0,0,2|0,0|0,0',
        equity: -0.084,
        equityLoss: 0.244,
      },
      {
        rank: 12,
        moveText: '24/22 8/4',
        movements: [
          {
            from: 8,
            to: 4,
            die: 4,
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
          '0,-2,0,0,1,0,5,0,2,0,0,0,-5,5,0,0,0,-3,0,-5,0,0,1,0,1|0,0|0,0',
        equity: -0.114,
        equityLoss: 0.274,
      },
      {
        rank: 13,
        moveText: '13/11 8/4',
        movements: [
          {
            from: 8,
            to: 4,
            die: 4,
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
          '0,-2,0,0,1,0,5,0,2,0,0,1,-5,4,0,0,0,-3,0,-5,0,0,0,0,2|0,0|0,0',
        equity: -0.117,
        equityLoss: 0.277,
      },
      {
        rank: 14,
        moveText: '24/22 6/2',
        movements: [
          {
            from: 6,
            to: 2,
            die: 4,
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
          '0,-2,1,0,0,0,4,0,3,0,0,0,-5,5,0,0,0,-3,0,-5,0,0,1,0,1|0,0|0,0',
        equity: -0.129,
        equityLoss: 0.28900000000000003,
      },
      {
        rank: 15,
        moveText: '13/11 6/2',
        movements: [
          {
            from: 6,
            to: 2,
            die: 4,
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
          '0,-2,1,0,0,0,4,0,3,0,0,1,-5,4,0,0,0,-3,0,-5,0,0,0,0,2|0,0|0,0',
        equity: -0.146,
        equityLoss: 0.306,
      },
      {
        rank: 16,
        moveText: '8/2',
        movements: [
          {
            from: 6,
            to: 2,
            die: 4,
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
          '0,-2,1,0,0,0,5,0,2,0,0,0,-5,5,0,0,0,-3,0,-5,0,0,0,0,2|0,0|0,0',
        equity: -0.218,
        equityLoss: 0.378,
      },
      {
        rank: 17,
        moveText: '6/4 6/2',
        movements: [
          {
            from: 6,
            to: 2,
            die: 4,
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
          '0,-2,1,0,1,0,3,0,3,0,0,0,-5,5,0,0,0,-3,0,-5,0,0,0,0,2|0,0|0,0',
        equity: -0.257,
        equityLoss: 0.41700000000000004,
      },
      {
        rank: 18,
        moveText: '8/6 8/4',
        movements: [
          {
            from: 8,
            to: 4,
            die: 4,
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
          '0,-2,0,0,1,0,6,0,1,0,0,0,-5,5,0,0,0,-3,0,-5,0,0,0,0,2|0,0|0,0',
        equity: -0.289,
        equityLoss: 0.44899999999999995,
      },
    ],
  },
  {
    id: 'basics-003',
    kind: 'play',
    theme: 'basics',
    source: 'curated',
    board: {
      points: [
        0, -2, 0, 0, 0, 0, 5, 0, 3, 0, 0, 0, -5, 5, 0, 0, 0, -3, 0, -5, 0, 0, 0,
        0, 2,
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
    roll: [6, 1],
    answers: [
      {
        rank: 1,
        moveText: '13/7 8/7',
        movements: [
          {
            from: 13,
            to: 7,
            die: 6,
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
          '0,-2,0,0,0,0,5,2,2,0,0,0,-5,4,0,0,0,-3,0,-5,0,0,0,0,2|0,0|0,0',
        equity: 0.136,
        equityLoss: 0,
      },
      {
        rank: 2,
        moveText: '24/23 24/18',
        movements: [
          {
            from: 24,
            to: 18,
            die: 6,
            hit: false,
          },
          {
            from: 24,
            to: 23,
            die: 1,
            hit: false,
          },
        ],
        finalKey:
          '0,-2,0,0,0,0,5,0,3,0,0,0,-5,5,0,0,0,-3,1,-5,0,0,0,1,0|0,0|0,0',
        equity: -0.041,
        equityLoss: 0.17700000000000002,
      },
      {
        rank: 3,
        moveText: '24/23 13/7',
        movements: [
          {
            from: 13,
            to: 7,
            die: 6,
            hit: false,
          },
          {
            from: 24,
            to: 23,
            die: 1,
            hit: false,
          },
        ],
        finalKey:
          '0,-2,0,0,0,0,5,1,3,0,0,0,-5,4,0,0,0,-3,0,-5,0,0,0,1,1|0,0|0,0',
        equity: -0.068,
        equityLoss: 0.20400000000000001,
      },
      {
        rank: 4,
        moveText: '13/6',
        movements: [
          {
            from: 13,
            to: 7,
            die: 6,
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
          '0,-2,0,0,0,0,6,0,3,0,0,0,-5,4,0,0,0,-3,0,-5,0,0,0,0,2|0,0|0,0',
        equity: -0.081,
        equityLoss: 0.21700000000000003,
      },
      {
        rank: 5,
        moveText: '24/18 6/5',
        movements: [
          {
            from: 24,
            to: 18,
            die: 6,
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
          '0,-2,0,0,0,1,4,0,3,0,0,0,-5,5,0,0,0,-3,1,-5,0,0,0,0,1|0,0|0,0',
        equity: -0.095,
        equityLoss: 0.231,
      },
      {
        rank: 6,
        moveText: '13/7 6/5',
        movements: [
          {
            from: 13,
            to: 7,
            die: 6,
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
          '0,-2,0,0,0,1,4,1,3,0,0,0,-5,4,0,0,0,-3,0,-5,0,0,0,0,2|0,0|0,0',
        equity: -0.101,
        equityLoss: 0.23700000000000002,
      },
      {
        rank: 7,
        moveText: '24/18 8/7',
        movements: [
          {
            from: 24,
            to: 18,
            die: 6,
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
          '0,-2,0,0,0,0,5,1,2,0,0,0,-5,5,0,0,0,-3,1,-5,0,0,0,0,1|0,0|0,0',
        equity: -0.131,
        equityLoss: 0.267,
      },
      {
        rank: 8,
        moveText: '24/23 8/2',
        movements: [
          {
            from: 8,
            to: 2,
            die: 6,
            hit: false,
          },
          {
            from: 24,
            to: 23,
            die: 1,
            hit: false,
          },
        ],
        finalKey:
          '0,-2,1,0,0,0,5,0,2,0,0,0,-5,5,0,0,0,-3,0,-5,0,0,0,1,1|0,0|0,0',
        equity: -0.187,
        equityLoss: 0.323,
      },
      {
        rank: 9,
        moveText: '8/2 6/5',
        movements: [
          {
            from: 8,
            to: 2,
            die: 6,
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
          '0,-2,1,0,0,1,4,0,2,0,0,0,-5,5,0,0,0,-3,0,-5,0,0,0,0,2|0,0|0,0',
        equity: -0.239,
        equityLoss: 0.375,
      },
      {
        rank: 10,
        moveText: '8/7 8/2',
        movements: [
          {
            from: 8,
            to: 2,
            die: 6,
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
          '0,-2,1,0,0,0,5,1,1,0,0,0,-5,5,0,0,0,-3,0,-5,0,0,0,0,2|0,0|0,0',
        equity: -0.392,
        equityLoss: 0.528,
      },
    ],
  },
  {
    id: 'basics-004',
    kind: 'play',
    theme: 'basics',
    source: 'curated',
    board: {
      points: [
        0, -1, 0, 0, 0, -1, 5, 0, 3, 0, 0, 0, -5, 5, 0, 0, 0, -3, 0, -5, 0, 0,
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
    roll: [3, 1],
    answers: [
      {
        rank: 1,
        moveText: '8/5* 6/5',
        movements: [
          {
            from: 8,
            to: 5,
            die: 3,
            hit: true,
          },
          {
            from: 6,
            to: 5,
            die: 1,
            hit: false,
          },
        ],
        finalKey:
          '0,-1,0,0,0,2,4,0,2,0,0,0,-5,5,0,0,0,-3,0,-5,0,0,0,0,2|0,1|0,0',
        equity: 0.3,
        equityLoss: 0,
      },
      {
        rank: 2,
        moveText: '24/21 6/5*',
        movements: [
          {
            from: 24,
            to: 21,
            die: 3,
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
          '0,-1,0,0,0,1,4,0,3,0,0,0,-5,5,0,0,0,-3,0,-5,0,1,0,0,1|0,1|0,0',
        equity: -0.037,
        equityLoss: 0.33699999999999997,
      },
      {
        rank: 3,
        moveText: '13/10 6/5*',
        movements: [
          {
            from: 13,
            to: 10,
            die: 3,
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
          '0,-1,0,0,0,1,4,0,3,0,1,0,-5,4,0,0,0,-3,0,-5,0,0,0,0,2|0,1|0,0',
        equity: -0.047,
        equityLoss: 0.347,
      },
      {
        rank: 4,
        moveText: '24/23 8/5*',
        movements: [
          {
            from: 8,
            to: 5,
            die: 3,
            hit: true,
          },
          {
            from: 24,
            to: 23,
            die: 1,
            hit: false,
          },
        ],
        finalKey:
          '0,-1,0,0,0,1,5,0,2,0,0,0,-5,5,0,0,0,-3,0,-5,0,0,0,1,1|0,1|0,0',
        equity: -0.102,
        equityLoss: 0.40199999999999997,
      },
      {
        rank: 5,
        moveText: '24/20',
        movements: [
          {
            from: 24,
            to: 21,
            die: 3,
            hit: false,
          },
          {
            from: 21,
            to: 20,
            die: 1,
            hit: false,
          },
        ],
        finalKey:
          '0,-1,0,0,0,-1,5,0,3,0,0,0,-5,5,0,0,0,-3,0,-5,1,0,0,0,1|0,0|0,0',
        equity: -0.131,
        equityLoss: 0.431,
      },
      {
        rank: 6,
        moveText: '8/5*/4',
        movements: [
          {
            from: 8,
            to: 5,
            die: 3,
            hit: true,
          },
          {
            from: 5,
            to: 4,
            die: 1,
            hit: false,
          },
        ],
        finalKey:
          '0,-1,0,0,1,0,5,0,2,0,0,0,-5,5,0,0,0,-3,0,-5,0,0,0,0,2|0,1|0,0',
        equity: -0.135,
        equityLoss: 0.435,
      },
      {
        rank: 7,
        moveText: '24/23 24/21',
        movements: [
          {
            from: 24,
            to: 21,
            die: 3,
            hit: false,
          },
          {
            from: 24,
            to: 23,
            die: 1,
            hit: false,
          },
        ],
        finalKey:
          '0,-1,0,0,0,-1,5,0,3,0,0,0,-5,5,0,0,0,-3,0,-5,0,1,0,1,0|0,0|0,0',
        equity: -0.147,
        equityLoss: 0.44699999999999995,
      },
      {
        rank: 8,
        moveText: '6/5*/2',
        movements: [
          {
            from: 6,
            to: 5,
            die: 1,
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
          '0,-1,1,0,0,0,4,0,3,0,0,0,-5,5,0,0,0,-3,0,-5,0,0,0,0,2|0,1|0,0',
        equity: -0.155,
        equityLoss: 0.45499999999999996,
      },
      {
        rank: 9,
        moveText: '24/23 13/10',
        movements: [
          {
            from: 13,
            to: 10,
            die: 3,
            hit: false,
          },
          {
            from: 24,
            to: 23,
            die: 1,
            hit: false,
          },
        ],
        finalKey:
          '0,-1,0,0,0,-1,5,0,3,0,1,0,-5,4,0,0,0,-3,0,-5,0,0,0,1,1|0,0|0,0',
        equity: -0.195,
        equityLoss: 0.495,
      },
      {
        rank: 10,
        moveText: '13/9',
        movements: [
          {
            from: 13,
            to: 10,
            die: 3,
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
          '0,-1,0,0,0,-1,5,0,3,1,0,0,-5,4,0,0,0,-3,0,-5,0,0,0,0,2|0,0|0,0',
        equity: -0.209,
        equityLoss: 0.509,
      },
      {
        rank: 11,
        moveText: '6/5* 6/3',
        movements: [
          {
            from: 6,
            to: 3,
            die: 3,
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
          '0,-1,0,1,0,1,3,0,3,0,0,0,-5,5,0,0,0,-3,0,-5,0,0,0,0,2|0,1|0,0',
        equity: -0.225,
        equityLoss: 0.525,
      },
      {
        rank: 12,
        moveText: '24/23 6/3',
        movements: [
          {
            from: 6,
            to: 3,
            die: 3,
            hit: false,
          },
          {
            from: 24,
            to: 23,
            die: 1,
            hit: false,
          },
        ],
        finalKey:
          '0,-1,0,1,0,-1,4,0,3,0,0,0,-5,5,0,0,0,-3,0,-5,0,0,0,1,1|0,0|0,0',
        equity: -0.227,
        equityLoss: 0.527,
      },
      {
        rank: 13,
        moveText: '24/21 8/7',
        movements: [
          {
            from: 24,
            to: 21,
            die: 3,
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
          '0,-1,0,0,0,-1,5,1,2,0,0,0,-5,5,0,0,0,-3,0,-5,0,1,0,0,1|0,0|0,0',
        equity: -0.242,
        equityLoss: 0.542,
      },
      {
        rank: 14,
        moveText: '8/4',
        movements: [
          {
            from: 8,
            to: 7,
            die: 1,
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
          '0,-1,0,0,1,-1,5,0,2,0,0,0,-5,5,0,0,0,-3,0,-5,0,0,0,0,2|0,0|0,0',
        equity: -0.272,
        equityLoss: 0.5720000000000001,
      },
      {
        rank: 15,
        moveText: '8/7 8/5*',
        movements: [
          {
            from: 8,
            to: 5,
            die: 3,
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
          '0,-1,0,0,0,1,5,1,1,0,0,0,-5,5,0,0,0,-3,0,-5,0,0,0,0,2|0,1|0,0',
        equity: -0.291,
        equityLoss: 0.591,
      },
      {
        rank: 16,
        moveText: '6/2',
        movements: [
          {
            from: 6,
            to: 3,
            die: 3,
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
          '0,-1,1,0,0,-1,4,0,3,0,0,0,-5,5,0,0,0,-3,0,-5,0,0,0,0,2|0,0|0,0',
        equity: -0.302,
        equityLoss: 0.602,
      },
      {
        rank: 17,
        moveText: '13/10 8/7',
        movements: [
          {
            from: 13,
            to: 10,
            die: 3,
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
          '0,-1,0,0,0,-1,5,1,2,0,1,0,-5,4,0,0,0,-3,0,-5,0,0,0,0,2|0,0|0,0',
        equity: -0.313,
        equityLoss: 0.613,
      },
      {
        rank: 18,
        moveText: '8/7 6/3',
        movements: [
          {
            from: 6,
            to: 3,
            die: 3,
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
          '0,-1,0,1,0,-1,4,1,2,0,0,0,-5,5,0,0,0,-3,0,-5,0,0,0,0,2|0,0|0,0',
        equity: -0.315,
        equityLoss: 0.615,
      },
    ],
  },
  {
    id: 'basics-005',
    kind: 'play',
    theme: 'basics',
    source: 'curated',
    board: {
      points: [
        0, -1, 0, 0, -1, 0, 4, 0, 4, 0, 0, 0, -5, 5, 0, 0, 0, -3, 0, -5, 0, 0,
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
    roll: [4, 2],
    answers: [
      {
        rank: 1,
        moveText: '8/4* 6/4',
        movements: [
          {
            from: 8,
            to: 4,
            die: 4,
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
          '0,-1,0,0,2,0,3,0,3,0,0,0,-5,5,0,0,0,-3,0,-5,0,0,0,0,2|0,1|0,0',
        equity: 0.249,
        equityLoss: 0,
      },
      {
        rank: 2,
        moveText: '24/22 8/4*',
        movements: [
          {
            from: 8,
            to: 4,
            die: 4,
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
          '0,-1,0,0,1,0,4,0,3,0,0,0,-5,5,0,0,0,-3,0,-5,0,0,1,0,1|0,1|0,0',
        equity: -0.057,
        equityLoss: 0.306,
      },
      {
        rank: 3,
        moveText: '24/20 6/4*',
        movements: [
          {
            from: 24,
            to: 20,
            die: 4,
            hit: false,
          },
          {
            from: 6,
            to: 4,
            die: 2,
            hit: true,
          },
        ],
        finalKey:
          '0,-1,0,0,1,0,3,0,4,0,0,0,-5,5,0,0,0,-3,0,-5,1,0,0,0,1|0,1|0,0',
        equity: -0.063,
        equityLoss: 0.312,
      },
      {
        rank: 4,
        moveText: '13/11 8/4*',
        movements: [
          {
            from: 8,
            to: 4,
            die: 4,
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
          '0,-1,0,0,1,0,4,0,3,0,0,1,-5,4,0,0,0,-3,0,-5,0,0,0,0,2|0,1|0,0',
        equity: -0.064,
        equityLoss: 0.313,
      },
      {
        rank: 5,
        moveText: '13/9 6/4*',
        movements: [
          {
            from: 13,
            to: 9,
            die: 4,
            hit: false,
          },
          {
            from: 6,
            to: 4,
            die: 2,
            hit: true,
          },
        ],
        finalKey:
          '0,-1,0,0,1,0,3,0,4,1,0,0,-5,4,0,0,0,-3,0,-5,0,0,0,0,2|0,1|0,0',
        equity: -0.078,
        equityLoss: 0.327,
      },
      {
        rank: 6,
        moveText: '24/20 13/11',
        movements: [
          {
            from: 24,
            to: 20,
            die: 4,
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
          '0,-1,0,0,-1,0,4,0,4,0,0,1,-5,4,0,0,0,-3,0,-5,1,0,0,0,1|0,0|0,0',
        equity: -0.093,
        equityLoss: 0.34199999999999997,
      },
      {
        rank: 7,
        moveText: '24/20 8/6',
        movements: [
          {
            from: 24,
            to: 20,
            die: 4,
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
          '0,-1,0,0,-1,0,5,0,3,0,0,0,-5,5,0,0,0,-3,0,-5,1,0,0,0,1|0,0|0,0',
        equity: -0.111,
        equityLoss: 0.36,
      },
      {
        rank: 8,
        moveText: '24/22 24/20',
        movements: [
          {
            from: 24,
            to: 20,
            die: 4,
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
          '0,-1,0,0,-1,0,4,0,4,0,0,0,-5,5,0,0,0,-3,0,-5,1,0,1,0,0|0,0|0,0',
        equity: -0.117,
        equityLoss: 0.366,
      },
      {
        rank: 9,
        moveText: '24/18',
        movements: [
          {
            from: 24,
            to: 20,
            die: 4,
            hit: false,
          },
          {
            from: 20,
            to: 18,
            die: 2,
            hit: false,
          },
        ],
        finalKey:
          '0,-1,0,0,-1,0,4,0,4,0,0,0,-5,5,0,0,0,-3,1,-5,0,0,0,0,1|0,0|0,0',
        equity: -0.126,
        equityLoss: 0.375,
      },
      {
        rank: 10,
        moveText: '24/22 13/9',
        movements: [
          {
            from: 13,
            to: 9,
            die: 4,
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
          '0,-1,0,0,-1,0,4,0,4,1,0,0,-5,4,0,0,0,-3,0,-5,0,0,1,0,1|0,0|0,0',
        equity: -0.135,
        equityLoss: 0.384,
      },
      {
        rank: 11,
        moveText: '8/6 8/4*',
        movements: [
          {
            from: 8,
            to: 4,
            die: 4,
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
          '0,-1,0,0,1,0,5,0,2,0,0,0,-5,5,0,0,0,-3,0,-5,0,0,0,0,2|0,1|0,0',
        equity: -0.14,
        equityLoss: 0.389,
      },
      {
        rank: 12,
        moveText: '8/4*/2',
        movements: [
          {
            from: 8,
            to: 4,
            die: 4,
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
          '0,-1,1,0,0,0,4,0,3,0,0,0,-5,5,0,0,0,-3,0,-5,0,0,0,0,2|0,1|0,0',
        equity: -0.166,
        equityLoss: 0.41500000000000004,
      },
      {
        rank: 13,
        moveText: '13/11 13/9',
        movements: [
          {
            from: 13,
            to: 9,
            die: 4,
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
          '0,-1,0,0,-1,0,4,0,4,1,0,1,-5,3,0,0,0,-3,0,-5,0,0,0,0,2|0,0|0,0',
        equity: -0.198,
        equityLoss: 0.447,
      },
      {
        rank: 14,
        moveText: '13/9 8/6',
        movements: [
          {
            from: 13,
            to: 9,
            die: 4,
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
          '0,-1,0,0,-1,0,5,0,3,1,0,0,-5,4,0,0,0,-3,0,-5,0,0,0,0,2|0,0|0,0',
        equity: -0.201,
        equityLoss: 0.45,
      },
      {
        rank: 15,
        moveText: '13/7',
        movements: [
          {
            from: 13,
            to: 9,
            die: 4,
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
          '0,-1,0,0,-1,0,4,1,4,0,0,0,-5,4,0,0,0,-3,0,-5,0,0,0,0,2|0,0|0,0',
        equity: -0.22,
        equityLoss: 0.469,
      },
      {
        rank: 16,
        moveText: '24/22 6/2',
        movements: [
          {
            from: 6,
            to: 2,
            die: 4,
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
          '0,-1,1,0,-1,0,3,0,4,0,0,0,-5,5,0,0,0,-3,0,-5,0,0,1,0,1|0,0|0,0',
        equity: -0.232,
        equityLoss: 0.481,
      },
      {
        rank: 17,
        moveText: '13/11 6/2',
        movements: [
          {
            from: 6,
            to: 2,
            die: 4,
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
          '0,-1,1,0,-1,0,3,0,4,0,0,1,-5,4,0,0,0,-3,0,-5,0,0,0,0,2|0,0|0,0',
        equity: -0.277,
        equityLoss: 0.526,
      },
      {
        rank: 18,
        moveText: '8/2',
        movements: [
          {
            from: 6,
            to: 2,
            die: 4,
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
          '0,-1,1,0,-1,0,4,0,3,0,0,0,-5,5,0,0,0,-3,0,-5,0,0,0,0,2|0,0|0,0',
        equity: -0.286,
        equityLoss: 0.5349999999999999,
      },
      {
        rank: 19,
        moveText: '6/4* 6/2',
        movements: [
          {
            from: 6,
            to: 2,
            die: 4,
            hit: false,
          },
          {
            from: 6,
            to: 4,
            die: 2,
            hit: true,
          },
        ],
        finalKey:
          '0,-1,1,0,1,0,2,0,4,0,0,0,-5,5,0,0,0,-3,0,-5,0,0,0,0,2|0,1|0,0',
        equity: -0.334,
        equityLoss: 0.583,
      },
    ],
  },
  {
    id: 'basics-006',
    kind: 'play',
    theme: 'basics',
    source: 'curated',
    board: {
      points: [
        0, -2, 0, -1, 2, 3, 3, 0, 3, 0, 1, 0, -5, 3, 0, 0, 0, 0, 0, -4, 0, 0, 0,
        0, -3,
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
    roll: [5, 2],
    answers: [
      {
        rank: 1,
        moveText: '8/3* 5/3',
        movements: [
          {
            from: 8,
            to: 3,
            die: 5,
            hit: true,
          },
          {
            from: 5,
            to: 3,
            die: 2,
            hit: false,
          },
        ],
        finalKey:
          '0,-2,0,2,2,2,3,0,2,0,1,0,-5,3,0,0,0,0,0,-4,0,0,0,0,-3|0,1|0,0',
        equity: 1.29,
        equityLoss: 0,
      },
      {
        rank: 2,
        moveText: '13/11 8/3*',
        movements: [
          {
            from: 8,
            to: 3,
            die: 5,
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
          '0,-2,0,1,2,3,3,0,2,0,1,1,-5,2,0,0,0,0,0,-4,0,0,0,0,-3|0,1|0,0',
        equity: 1.205,
        equityLoss: 0.08499999999999996,
      },
      {
        rank: 3,
        moveText: '10/3*',
        movements: [
          {
            from: 8,
            to: 3,
            die: 5,
            hit: true,
          },
          {
            from: 10,
            to: 8,
            die: 2,
            hit: false,
          },
        ],
        finalKey:
          '0,-2,0,1,2,3,3,0,3,0,0,0,-5,3,0,0,0,0,0,-4,0,0,0,0,-3|0,1|0,0',
        equity: 1.198,
        equityLoss: 0.09200000000000008,
      },
      {
        rank: 4,
        moveText: '8/3* 6/4',
        movements: [
          {
            from: 8,
            to: 3,
            die: 5,
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
          '0,-2,0,1,3,3,2,0,2,0,1,0,-5,3,0,0,0,0,0,-4,0,0,0,0,-3|0,1|0,0',
        equity: 1.195,
        equityLoss: 0.09499999999999997,
      },
      {
        rank: 5,
        moveText: '13/8 5/3*',
        movements: [
          {
            from: 13,
            to: 8,
            die: 5,
            hit: false,
          },
          {
            from: 5,
            to: 3,
            die: 2,
            hit: true,
          },
        ],
        finalKey:
          '0,-2,0,1,2,2,3,0,4,0,1,0,-5,2,0,0,0,0,0,-4,0,0,0,0,-3|0,1|0,0',
        equity: 1.187,
        equityLoss: 0.10299999999999998,
      },
      {
        rank: 6,
        moveText: '8/6 8/3*',
        movements: [
          {
            from: 8,
            to: 3,
            die: 5,
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
          '0,-2,0,1,2,3,4,0,1,0,1,0,-5,3,0,0,0,0,0,-4,0,0,0,0,-3|0,1|0,0',
        equity: 1.16,
        equityLoss: 0.13000000000000012,
      },
      {
        rank: 7,
        moveText: '13/11 10/5',
        movements: [
          {
            from: 10,
            to: 5,
            die: 5,
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
          '0,-2,0,-1,2,4,3,0,3,0,0,1,-5,2,0,0,0,0,0,-4,0,0,0,0,-3|0,0|0,0',
        equity: 1.15,
        equityLoss: 0.14000000000000012,
      },
      {
        rank: 8,
        moveText: '13/6',
        movements: [
          {
            from: 13,
            to: 8,
            die: 5,
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
          '0,-2,0,-1,2,3,4,0,3,0,1,0,-5,2,0,0,0,0,0,-4,0,0,0,0,-3|0,0|0,0',
        equity: 1.145,
        equityLoss: 0.14500000000000002,
      },
      {
        rank: 9,
        moveText: '10/5 8/6',
        movements: [
          {
            from: 10,
            to: 5,
            die: 5,
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
          '0,-2,0,-1,2,4,4,0,2,0,0,0,-5,3,0,0,0,0,0,-4,0,0,0,0,-3|0,0|0,0',
        equity: 1.143,
        equityLoss: 0.14700000000000002,
      },
      {
        rank: 10,
        moveText: '13/8 10/8',
        movements: [
          {
            from: 13,
            to: 8,
            die: 5,
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
          '0,-2,0,-1,2,3,3,0,5,0,0,0,-5,2,0,0,0,0,0,-4,0,0,0,0,-3|0,0|0,0',
        equity: 1.133,
        equityLoss: 0.15700000000000003,
      },
      {
        rank: 11,
        moveText: '10/5 6/4',
        movements: [
          {
            from: 10,
            to: 5,
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
          '0,-2,0,-1,3,4,2,0,3,0,0,0,-5,3,0,0,0,0,0,-4,0,0,0,0,-3|0,0|0,0',
        equity: 1.133,
        equityLoss: 0.15700000000000003,
      },
      {
        rank: 12,
        moveText: '13/8 6/4',
        movements: [
          {
            from: 13,
            to: 8,
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
          '0,-2,0,-1,3,3,2,0,4,0,1,0,-5,2,0,0,0,0,0,-4,0,0,0,0,-3|0,0|0,0',
        equity: 1.131,
        equityLoss: 0.15900000000000003,
      },
      {
        rank: 13,
        moveText: '13/11 13/8',
        movements: [
          {
            from: 13,
            to: 8,
            die: 5,
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
          '0,-2,0,-1,2,3,3,0,4,0,1,1,-5,1,0,0,0,0,0,-4,0,0,0,0,-3|0,0|0,0',
        equity: 1.081,
        equityLoss: 0.20900000000000007,
      },
      {
        rank: 14,
        moveText: '10/5 4/2',
        movements: [
          {
            from: 10,
            to: 5,
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
          '0,-2,1,-1,1,4,3,0,3,0,0,0,-5,3,0,0,0,0,0,-4,0,0,0,0,-3|0,0|0,0',
        equity: 0.98,
        equityLoss: 0.31000000000000005,
      },
      {
        rank: 15,
        moveText: '13/8 4/2',
        movements: [
          {
            from: 13,
            to: 8,
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
          '0,-2,1,-1,1,3,3,0,4,0,1,0,-5,2,0,0,0,0,0,-4,0,0,0,0,-3|0,0|0,0',
        equity: 0.965,
        equityLoss: 0.32500000000000007,
      },
      {
        rank: 16,
        moveText: '8/3* 4/2',
        movements: [
          {
            from: 8,
            to: 3,
            die: 5,
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
          '0,-2,1,1,1,3,3,0,2,0,1,0,-5,3,0,0,0,0,0,-4,0,0,0,0,-3|0,1|0,0',
        equity: 0.946,
        equityLoss: 0.3440000000000001,
      },
    ],
  },
  {
    id: 'basics-007',
    kind: 'play',
    theme: 'basics',
    source: 'curated',
    board: {
      points: [
        0, -2, 0, 0, 0, 0, 5, 0, 4, 1, 1, 0, -5, 4, 0, 0, 0, -3, 0, -3, 0, 0, 0,
        0, -2,
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
    roll: [5, 6],
    answers: [
      {
        rank: 1,
        moveText: '10/4 9/4',
        movements: [
          {
            from: 9,
            to: 4,
            die: 5,
            hit: false,
          },
          {
            from: 10,
            to: 4,
            die: 6,
            hit: false,
          },
        ],
        finalKey:
          '0,-2,0,0,2,0,5,0,4,0,0,0,-5,4,0,0,0,-3,0,-3,0,0,0,0,-2|0,0|0,0',
        equity: 0.974,
        equityLoss: 0,
      },
      {
        rank: 2,
        moveText: '9/3 8/3',
        movements: [
          {
            from: 8,
            to: 3,
            die: 5,
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
          '0,-2,0,2,0,0,5,0,3,0,1,0,-5,4,0,0,0,-3,0,-3,0,0,0,0,-2|0,0|0,0',
        equity: 0.889,
        equityLoss: 0.08499999999999996,
      },
      {
        rank: 3,
        moveText: '13/8 10/4',
        movements: [
          {
            from: 13,
            to: 8,
            die: 5,
            hit: false,
          },
          {
            from: 10,
            to: 4,
            die: 6,
            hit: false,
          },
        ],
        finalKey:
          '0,-2,0,0,1,0,5,0,5,1,0,0,-5,3,0,0,0,-3,0,-3,0,0,0,0,-2|0,0|0,0',
        equity: 0.455,
        equityLoss: 0.5189999999999999,
      },
      {
        rank: 4,
        moveText: '13/8 9/3',
        movements: [
          {
            from: 13,
            to: 8,
            die: 5,
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
          '0,-2,0,1,0,0,5,0,5,0,1,0,-5,3,0,0,0,-3,0,-3,0,0,0,0,-2|0,0|0,0',
        equity: 0.438,
        equityLoss: 0.536,
      },
      {
        rank: 5,
        moveText: '13/2',
        movements: [
          {
            from: 13,
            to: 8,
            die: 5,
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
          '0,-2,1,0,0,0,5,0,4,1,1,0,-5,3,0,0,0,-3,0,-3,0,0,0,0,-2|0,0|0,0',
        equity: 0.339,
        equityLoss: 0.635,
      },
      {
        rank: 6,
        moveText: '13/8 13/7',
        movements: [
          {
            from: 13,
            to: 8,
            die: 5,
            hit: false,
          },
          {
            from: 13,
            to: 7,
            die: 6,
            hit: false,
          },
        ],
        finalKey:
          '0,-2,0,0,0,0,5,1,5,1,1,0,-5,2,0,0,0,-3,0,-3,0,0,0,0,-2|0,0|0,0',
        equity: 0.293,
        equityLoss: 0.681,
      },
      {
        rank: 7,
        moveText: '10/5 9/3',
        movements: [
          {
            from: 10,
            to: 5,
            die: 5,
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
          '0,-2,0,1,0,1,5,0,4,0,0,0,-5,4,0,0,0,-3,0,-3,0,0,0,0,-2|0,0|0,0',
        equity: 0.278,
        equityLoss: 0.696,
      },
      {
        rank: 8,
        moveText: '10/4 8/3',
        movements: [
          {
            from: 8,
            to: 3,
            die: 5,
            hit: false,
          },
          {
            from: 10,
            to: 4,
            die: 6,
            hit: false,
          },
        ],
        finalKey:
          '0,-2,0,1,1,0,5,0,3,1,0,0,-5,4,0,0,0,-3,0,-3,0,0,0,0,-2|0,0|0,0',
        equity: 0.245,
        equityLoss: 0.729,
      },
      {
        rank: 9,
        moveText: '9/4 8/2',
        movements: [
          {
            from: 9,
            to: 4,
            die: 5,
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
          '0,-2,1,0,1,0,5,0,3,0,1,0,-5,4,0,0,0,-3,0,-3,0,0,0,0,-2|0,0|0,0',
        equity: 0.208,
        equityLoss: 0.766,
      },
      {
        rank: 10,
        moveText: '10/5 8/2',
        movements: [
          {
            from: 10,
            to: 5,
            die: 5,
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
          '0,-2,1,0,0,1,5,0,3,1,0,0,-5,4,0,0,0,-3,0,-3,0,0,0,0,-2|0,0|0,0',
        equity: 0.195,
        equityLoss: 0.7789999999999999,
      },
      {
        rank: 11,
        moveText: '13/7 10/5',
        movements: [
          {
            from: 10,
            to: 5,
            die: 5,
            hit: false,
          },
          {
            from: 13,
            to: 7,
            die: 6,
            hit: false,
          },
        ],
        finalKey:
          '0,-2,0,0,0,1,5,1,4,1,0,0,-5,3,0,0,0,-3,0,-3,0,0,0,0,-2|0,0|0,0',
        equity: 0.181,
        equityLoss: 0.7929999999999999,
      },
      {
        rank: 12,
        moveText: '13/7 9/4',
        movements: [
          {
            from: 9,
            to: 4,
            die: 5,
            hit: false,
          },
          {
            from: 13,
            to: 7,
            die: 6,
            hit: false,
          },
        ],
        finalKey:
          '0,-2,0,0,1,0,5,1,4,0,1,0,-5,3,0,0,0,-3,0,-3,0,0,0,0,-2|0,0|0,0',
        equity: 0.159,
        equityLoss: 0.815,
      },
      {
        rank: 13,
        moveText: '13/7 8/3',
        movements: [
          {
            from: 8,
            to: 3,
            die: 5,
            hit: false,
          },
          {
            from: 13,
            to: 7,
            die: 6,
            hit: false,
          },
        ],
        finalKey:
          '0,-2,0,1,0,0,5,1,3,1,1,0,-5,3,0,0,0,-3,0,-3,0,0,0,0,-2|0,0|0,0',
        equity: 0.116,
        equityLoss: 0.858,
      },
      {
        rank: 14,
        moveText: '8/3 8/2',
        movements: [
          {
            from: 8,
            to: 3,
            die: 5,
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
          '0,-2,1,1,0,0,5,0,2,1,1,0,-5,4,0,0,0,-3,0,-3,0,0,0,0,-2|0,0|0,0',
        equity: 0.027,
        equityLoss: 0.947,
      },
    ],
  },
  {
    id: 'basics-008',
    kind: 'play',
    theme: 'basics',
    source: 'curated',
    board: {
      points: [
        0, -2, 0, 0, 0, 0, 5, 0, 4, 0, 0, 0, -4, 5, 0, 0, 0, -4, 0, -3, -2, 0,
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
    roll: [6, 5],
    answers: [
      {
        rank: 1,
        moveText: '24/13',
        movements: [
          {
            from: 24,
            to: 18,
            die: 6,
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
          '0,-2,0,0,0,0,5,0,4,0,0,0,-4,6,0,0,0,-4,0,-3,-2,0,0,0,0|0,0|0,0',
        equity: 0.274,
        equityLoss: 0,
      },
      {
        rank: 2,
        moveText: '24/18 13/8',
        movements: [
          {
            from: 24,
            to: 18,
            die: 6,
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
          '0,-2,0,0,0,0,5,0,5,0,0,0,-4,4,0,0,0,-4,1,-3,-2,0,0,0,0|0,0|0,0',
        equity: -0.144,
        equityLoss: 0.41800000000000004,
      },
      {
        rank: 3,
        moveText: '13/8 13/7',
        movements: [
          {
            from: 13,
            to: 7,
            die: 6,
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
          '0,-2,0,0,0,0,5,1,5,0,0,0,-4,3,0,0,0,-4,0,-3,-2,0,0,0,1|0,0|0,0',
        equity: -0.253,
        equityLoss: 0.527,
      },
      {
        rank: 4,
        moveText: '13/2',
        movements: [
          {
            from: 8,
            to: 2,
            die: 6,
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
          '0,-2,1,0,0,0,5,0,4,0,0,0,-4,4,0,0,0,-4,0,-3,-2,0,0,0,1|0,0|0,0',
        equity: -0.296,
        equityLoss: 0.5700000000000001,
      },
      {
        rank: 5,
        moveText: '24/18 8/3',
        movements: [
          {
            from: 24,
            to: 18,
            die: 6,
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
          '0,-2,0,1,0,0,5,0,3,0,0,0,-4,5,0,0,0,-4,1,-3,-2,0,0,0,0|0,0|0,0',
        equity: -0.414,
        equityLoss: 0.688,
      },
      {
        rank: 6,
        moveText: '13/7 8/3',
        movements: [
          {
            from: 13,
            to: 7,
            die: 6,
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
          '0,-2,0,1,0,0,5,1,3,0,0,0,-4,4,0,0,0,-4,0,-3,-2,0,0,0,1|0,0|0,0',
        equity: -0.428,
        equityLoss: 0.702,
      },
      {
        rank: 7,
        moveText: '8/3 8/2',
        movements: [
          {
            from: 8,
            to: 2,
            die: 6,
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
          '0,-2,1,1,0,0,5,0,2,0,0,0,-4,5,0,0,0,-4,0,-3,-2,0,0,0,1|0,0|0,0',
        equity: -0.519,
        equityLoss: 0.793,
      },
    ],
  },
  {
    id: 'basics-009',
    kind: 'play',
    theme: 'basics',
    source: 'curated',
    board: {
      points: [
        0, -2, 0, 0, 0, 0, 5, 0, 5, 0, 0, 0, -4, 4, 0, 0, -3, 0, 0, -3, -3, 0,
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
    roll: [5, 5],
    answers: [
      {
        rank: 1,
        moveText: '23/13 8/3(2)',
        movements: [
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
            from: 23,
            to: 18,
            die: 5,
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
          '0,-2,0,2,0,0,5,0,3,0,0,0,-4,5,0,0,-3,0,0,-3,-3,0,0,0,0|0,0|0,0',
        equity: 0.588,
        equityLoss: 0,
      },
      {
        rank: 2,
        moveText: '23/8 13/8',
        movements: [
          {
            from: 13,
            to: 8,
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
            from: 23,
            to: 18,
            die: 5,
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
          '0,-2,0,0,0,0,5,0,7,0,0,0,-4,3,0,0,-3,0,0,-3,-3,0,0,0,0|0,0|0,0',
        equity: 0.32,
        equityLoss: 0.26799999999999996,
      },
      {
        rank: 3,
        moveText: '23/3',
        movements: [
          {
            from: 8,
            to: 3,
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
            from: 23,
            to: 18,
            die: 5,
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
          '0,-2,0,1,0,0,5,0,5,0,0,0,-4,4,0,0,-3,0,0,-3,-3,0,0,0,0|0,0|0,0',
        equity: 0.24,
        equityLoss: 0.348,
      },
      {
        rank: 4,
        moveText: '23/18 13/3 8/3',
        movements: [
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
            from: 13,
            to: 8,
            die: 5,
            hit: false,
          },
          {
            from: 23,
            to: 18,
            die: 5,
            hit: false,
          },
        ],
        finalKey:
          '0,-2,0,2,0,0,5,0,4,0,0,0,-4,3,0,0,-3,0,1,-3,-3,0,0,0,0|0,0|0,0',
        equity: 0.18,
        equityLoss: 0.408,
      },
      {
        rank: 5,
        moveText: '13/3 8/3(2)',
        movements: [
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
            from: 8,
            to: 3,
            die: 5,
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
          '0,-2,0,3,0,0,5,0,3,0,0,0,-4,3,0,0,-3,0,0,-3,-3,0,0,1,0|0,0|0,0',
        equity: 0.154,
        equityLoss: 0.43399999999999994,
      },
      {
        rank: 6,
        moveText: '13/3(2)',
        movements: [
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
            from: 13,
            to: 8,
            die: 5,
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
          '0,-2,0,2,0,0,5,0,5,0,0,0,-4,2,0,0,-3,0,0,-3,-3,0,0,1,0|0,0|0,0',
        equity: 0.151,
        equityLoss: 0.43699999999999994,
      },
      {
        rank: 7,
        moveText: '23/18 8/3(3)',
        movements: [
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
            from: 8,
            to: 3,
            die: 5,
            hit: false,
          },
          {
            from: 23,
            to: 18,
            die: 5,
            hit: false,
          },
        ],
        finalKey:
          '0,-2,0,3,0,0,5,0,2,0,0,0,-4,4,0,0,-3,0,1,-3,-3,0,0,0,0|0,0|0,0',
        equity: 0.085,
        equityLoss: 0.503,
      },
      {
        rank: 8,
        moveText: '8/3(4)',
        movements: [
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
          '0,-2,0,4,0,0,5,0,1,0,0,0,-4,4,0,0,-3,0,0,-3,-3,0,0,1,0|0,0|0,0',
        equity: -0.117,
        equityLoss: 0.705,
      },
      {
        rank: 9,
        moveText: '23/18 13/3 13/8',
        movements: [
          {
            from: 8,
            to: 3,
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
            from: 13,
            to: 8,
            die: 5,
            hit: false,
          },
          {
            from: 23,
            to: 18,
            die: 5,
            hit: false,
          },
        ],
        finalKey:
          '0,-2,0,1,0,0,5,0,6,0,0,0,-4,2,0,0,-3,0,1,-3,-3,0,0,0,0|0,0|0,0',
        equity: -0.176,
        equityLoss: 0.764,
      },
      {
        rank: 10,
        moveText: '13/8(4)',
        movements: [
          {
            from: 13,
            to: 8,
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
            from: 13,
            to: 8,
            die: 5,
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
          '0,-2,0,0,0,0,5,0,9,0,0,0,-4,0,0,0,-3,0,0,-3,-3,0,0,1,0|0,0|0,0',
        equity: -0.238,
        equityLoss: 0.826,
      },
      {
        rank: 11,
        moveText: '23/18 13/8(3)',
        movements: [
          {
            from: 13,
            to: 8,
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
            from: 13,
            to: 8,
            die: 5,
            hit: false,
          },
          {
            from: 23,
            to: 18,
            die: 5,
            hit: false,
          },
        ],
        finalKey:
          '0,-2,0,0,0,0,5,0,8,0,0,0,-4,1,0,0,-3,0,1,-3,-3,0,0,0,0|0,0|0,0',
        equity: -0.338,
        equityLoss: 0.9259999999999999,
      },
      {
        rank: 12,
        moveText: '13/3 13/8(2)',
        movements: [
          {
            from: 8,
            to: 3,
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
            from: 13,
            to: 8,
            die: 5,
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
          '0,-2,0,1,0,0,5,0,7,0,0,0,-4,1,0,0,-3,0,0,-3,-3,0,0,1,0|0,0|0,0',
        equity: -0.416,
        equityLoss: 1.004,
      },
    ],
  },
  {
    id: 'basics-010',
    kind: 'play',
    theme: 'basics',
    source: 'curated',
    board: {
      points: [
        0, 0, 3, 3, 3, 3, 3, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, -7,
        -8,
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
    roll: [6, 5],
    answers: [
      {
        rank: 1,
        moveText: '6/off 5/off',
        movements: [
          {
            from: 6,
            to: 'off',
            die: 6,
            hit: false,
          },
          {
            from: 5,
            to: 'off',
            die: 5,
            hit: false,
          },
        ],
        finalKey: '0,0,3,3,3,2,2,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,-7,-8|0,0|2,0',
        equity: -0.668,
        equityLoss: 0,
      },
      {
        rank: 2,
        moveText: '6/1 6/off',
        movements: [
          {
            from: 6,
            to: 'off',
            die: 6,
            hit: false,
          },
          {
            from: 6,
            to: 1,
            die: 5,
            hit: false,
          },
        ],
        finalKey: '0,1,3,3,3,3,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,-7,-8|0,0|1,0',
        equity: -0.837,
        equityLoss: 0.16899999999999993,
      },
    ],
  },
  {
    id: 'basics-011',
    kind: 'play',
    theme: 'basics',
    source: 'curated',
    board: {
      points: [
        0, 3, 5, -2, 2, 3, 2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
        -6, -7,
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
    roll: [6, 4],
    answers: [
      {
        rank: 1,
        moveText: '6/2 6/off',
        movements: [
          {
            from: 6,
            to: 'off',
            die: 6,
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
          '0,3,6,-2,2,3,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,-6,-7|0,0|1,0',
        equity: 1.014,
        equityLoss: 0,
      },
      {
        rank: 2,
        moveText: '6/off 5/1',
        movements: [
          {
            from: 6,
            to: 'off',
            die: 6,
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
          '0,4,5,-2,2,2,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,-6,-7|0,0|1,0',
        equity: 0.926,
        equityLoss: 0.08799999999999997,
      },
      {
        rank: 3,
        moveText: '6/off 4/off',
        movements: [
          {
            from: 6,
            to: 'off',
            die: 6,
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
          '0,3,5,-2,1,3,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,-6,-7|0,0|2,0',
        equity: 0.8,
        equityLoss: 0.21399999999999997,
      },
    ],
  },
  {
    id: 'basics-012',
    kind: 'play',
    theme: 'basics',
    source: 'curated',
    board: {
      points: [
        0, 0, 3, 4, 3, 3, 2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, -7,
        -8,
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
    roll: [6, 4],
    answers: [
      {
        rank: 1,
        moveText: '6/off 4/off',
        movements: [
          {
            from: 6,
            to: 'off',
            die: 6,
            hit: false,
          },
          {
            from: 4,
            to: 'off',
            die: 4,
            hit: false,
          },
        ],
        finalKey: '0,0,3,4,2,3,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,-7,-8|0,0|2,0',
        equity: -0.537,
        equityLoss: 0,
      },
      {
        rank: 2,
        moveText: '6/off 5/1',
        movements: [
          {
            from: 6,
            to: 'off',
            die: 6,
            hit: false,
          },
          {
            from: 5,
            to: 1,
            die: 4,
            hit: false,
          },
        ],
        finalKey: '0,1,3,4,3,2,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,-7,-8|0,0|1,0',
        equity: -0.704,
        equityLoss: 0.16699999999999993,
      },
      {
        rank: 3,
        moveText: '6/2 6/off',
        movements: [
          {
            from: 6,
            to: 'off',
            die: 6,
            hit: false,
          },
          {
            from: 6,
            to: 2,
            die: 4,
            hit: false,
          },
        ],
        finalKey: '0,0,4,4,3,3,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,-7,-8|0,0|1,0',
        equity: -0.904,
        equityLoss: 0.367,
      },
    ],
  },
];
