import { describe, expect, it } from 'vitest';
import {
  CLASSIFICATION_THRESHOLDS,
  classifyEquityLoss,
  equityLoss,
} from './analysis';

describe('equityLoss', () => {
  it('is the equity given up versus the best choice', () => {
    expect(equityLoss(0.219, -0.012)).toBeCloseTo(0.231, 10);
  });

  it('is zero when the best choice was made', () => {
    expect(equityLoss(0.219, 0.219)).toBe(0);
  });

  it('clamps to zero when the chosen equity exceeds best (mixed-ply noise)', () => {
    expect(equityLoss(0.1, 0.11)).toBe(0);
  });
});

describe('classifyEquityLoss', () => {
  it('classifies losses below 0.02 as ok', () => {
    expect(classifyEquityLoss(0)).toBe('ok');
    expect(classifyEquityLoss(0.019)).toBe('ok');
  });

  it('classifies losses from 0.02 as dubious', () => {
    expect(classifyEquityLoss(0.02)).toBe('dubious');
    expect(classifyEquityLoss(0.039)).toBe('dubious');
  });

  it('classifies losses from 0.04 as error', () => {
    expect(classifyEquityLoss(0.04)).toBe('error');
    expect(classifyEquityLoss(0.079)).toBe('error');
  });

  it('classifies losses from 0.08 as blunder', () => {
    expect(classifyEquityLoss(0.08)).toBe('blunder');
    expect(classifyEquityLoss(0.5)).toBe('blunder');
  });
});

describe('CLASSIFICATION_THRESHOLDS', () => {
  it('matches the gnubg/XG conventions from the spec', () => {
    expect(CLASSIFICATION_THRESHOLDS).toEqual({
      dubious: 0.02,
      error: 0.04,
      blunder: 0.08,
    });
  });
});
