/**
 * Pure mining helpers: color-mirroring (curated puzzles are always posed for
 * White), hero-perspective cube choices derived from a gnubg cube analysis,
 * and the theme heuristics the mining script tags positions with.
 */

import { describe, expect, it } from 'vitest';
import type { CubeAnalysis } from '../engine/types';
import { createBoard, initialBoard, pipCount } from '../rules';
import {
  classifyPlayTheme,
  deriveCubeChoices,
  mirrorBoard,
  mirrorMovement,
  toEnginePosition,
} from './mining';
import type { CubePuzzle } from './types';

describe('mirrorBoard', () => {
  it('swaps colors and reflects points so black-on-roll becomes white-on-roll', () => {
    const board = createBoard({
      white: { points: { 24: 2, 13: 5, 8: 3, 6: 5 } },
      black: { points: { 1: 2, 12: 5, 17: 3, 19: 5 } },
    });
    // The standard start is its own mirror image.
    expect(mirrorBoard(board)).toEqual(initialBoard());
  });

  it('mirrors bar and off counts', () => {
    const board = createBoard({
      white: { points: { 6: 13 }, bar: 1, off: 1 },
      black: { points: { 19: 12 }, bar: 2, off: 1 },
    });
    const mirrored = mirrorBoard(board);
    expect(mirrored.bar).toEqual({ white: 2, black: 1 });
    expect(mirrored.off).toEqual({ white: 1, black: 1 });
    expect(mirrored.points[6]).toBe(12);
    expect(mirrored.points[19]).toBe(-13);
    // Pip counts swap sides exactly.
    expect(pipCount(mirrored, 'white')).toBe(pipCount(board, 'black'));
  });
});

describe('mirrorMovement', () => {
  it('reflects point-to-point movements and keeps bar/off endpoints', () => {
    expect(mirrorMovement({ from: 1, to: 5, die: 4, hit: true })).toEqual({
      from: 24,
      to: 20,
      die: 4,
      hit: true,
    });
    expect(mirrorMovement({ from: 'bar', to: 21, die: 4, hit: false })).toEqual(
      { from: 'bar', to: 4, die: 4, hit: false },
    );
    expect(mirrorMovement({ from: 3, to: 'off', die: 3, hit: false })).toEqual({
      from: 22,
      to: 'off',
      die: 3,
      hit: false,
    });
  });
});

const analysis: CubeAnalysis = {
  cubelessEquity: 0.45,
  chances: {
    win: 0.68,
    winGammon: 0.2,
    winBackgammon: 0.01,
    lose: 0.32,
    loseGammon: 0.05,
    loseBackgammon: 0.0,
  },
  options: [
    { action: 'No double', equity: 0.712, equityDiff: 0 },
    { action: 'Double, take', equity: 0.861, equityDiff: 0.149 },
    { action: 'Double, pass', equity: 1.0, equityDiff: 0.288 },
  ],
  properAction: 'Double, take',
};

describe('deriveCubeChoices', () => {
  it('derives the doubler view: double equity assumes the better response', () => {
    const { choices, verdict } = deriveCubeChoices(analysis, 'offer');
    expect(verdict).toBe('Double, take');
    expect(choices).toEqual([
      { action: 'double', equity: 0.861, equityLoss: 0 },
      { action: 'no-double', equity: 0.712, equityLoss: 0.149 },
    ]);
  });

  it('derives the responder view with negated equities', () => {
    const { choices } = deriveCubeChoices(analysis, 'response');
    expect(choices).toEqual([
      { action: 'take', equity: -0.861, equityLoss: 0 },
      { action: 'pass', equity: -1.0, equityLoss: 0.139 },
    ]);
  });

  it('prefers no-double when the position is too good or not strong enough', () => {
    const tooGood: CubeAnalysis = {
      ...analysis,
      options: [
        { action: 'No double', equity: 1.12, equityDiff: 0 },
        { action: 'Double, take', equity: 1.3, equityDiff: 0 },
        { action: 'Double, pass', equity: 1.0, equityDiff: 0 },
      ],
      properAction: 'Too good to double, pass',
    };
    const { choices } = deriveCubeChoices(tooGood, 'offer');
    expect(choices[0]).toEqual({
      action: 'no-double',
      equity: 1.12,
      equityLoss: 0,
    });
    expect(choices[1].action).toBe('double');
    expect(choices[1].equityLoss).toBeCloseTo(0.12, 10);
  });
});

describe('classifyPlayTheme (hero = white, on roll)', () => {
  it('tags a position with every white checker home as bear-off', () => {
    const board = createBoard({
      white: { points: { 6: 4, 5: 4, 4: 3, 2: 2 }, off: 2 },
      black: { points: { 19: 10, 20: 5 } },
    });
    expect(classifyPlayTheme(board)).toBe('bear-off');
  });

  it('tags an attack on an anchorless opponent with bar checkers as blitzing', () => {
    const board = createBoard({
      white: { points: { 6: 3, 5: 3, 4: 2, 8: 3, 13: 4 } },
      black: { points: { 24: 2, 22: 1, 12: 4, 17: 4, 3: 1, 1: 1 }, bar: 2 },
    });
    expect(classifyPlayTheme(board)).toBe('blitzing');
  });

  it('tags consecutive made points with enemy checkers trapped behind as priming', () => {
    const board = createBoard({
      white: { points: { 8: 2, 7: 2, 6: 2, 5: 2, 13: 5, 24: 2 } },
      black: { points: { 1: 2, 3: 2, 12: 4, 19: 5, 17: 2 } },
    });
    expect(classifyPlayTheme(board)).toBe('priming');
  });

  it('tags a high anchor while well behind in the race as a holding game', () => {
    const board = createBoard({
      white: { points: { 20: 2, 13: 5, 6: 5, 8: 3 } },
      black: { points: { 4: 2, 19: 4, 21: 4, 23: 3, 22: 2 } },
    });
    const white = pipCount(board, 'white');
    const black = pipCount(board, 'black');
    expect(white - black).toBeGreaterThanOrEqual(10);
    expect(classifyPlayTheme(board)).toBe('holding-game');
  });

  it('returns null for a themeless early position', () => {
    expect(classifyPlayTheme(initialBoard())).toBeNull();
  });
});

describe('toEnginePosition', () => {
  it('poses play and offer puzzles with the hero on roll', () => {
    const board = initialBoard();
    const base = {
      id: 'c',
      theme: 'cube-handling',
      source: 'curated',
      board,
      hero: 'white',
      match: {
        matchLength: 0,
        score: { white: 0, black: 0 },
        cube: { value: 1, owner: 'center' },
      },
    } as const;
    const offer: CubePuzzle = {
      ...base,
      kind: 'cube',
      decision: 'offer',
      choices: [],
      verdict: 'Double, take',
    };
    expect(toEnginePosition(offer).onRoll).toBe('white');
  });

  it('poses response puzzles with the doubler (the opponent) on roll', () => {
    const board = initialBoard();
    const response: CubePuzzle = {
      id: 'c',
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
      decision: 'response',
      choices: [],
      verdict: 'Double, take',
    };
    const position = toEnginePosition(response);
    expect(position.onRoll).toBe('black');
    expect(position.match?.cube).toEqual({ value: 1, owner: 'center' });
  });
});
