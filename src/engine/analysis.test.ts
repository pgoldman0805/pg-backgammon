import { describe, expect, it } from 'vitest';
import {
  CLASSIFICATION_THRESHOLDS,
  classifyEquityLoss,
  classifyPlayLoss,
  equityLoss,
  isOpeningPlay,
  OPENING_NOISE_MARGIN,
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

describe('isOpeningPlay', () => {
  it('counts the opening roll and the first reply', () => {
    expect(isOpeningPlay(0)).toBe(true);
    expect(isOpeningPlay(1)).toBe(true);
  });

  it('does not count the second reply onward', () => {
    expect(isOpeningPlay(2)).toBe(false);
    expect(isOpeningPlay(9)).toBe(false);
  });
});

describe('classifyPlayLoss (opening 2-ply-noise suppression)', () => {
  it('never flags an opening play as an error or blunder within the margin', () => {
    // 2-ply disagrees with rollout consensus on several well-known openings;
    // a loss inside the noise margin is not a mistake the analyzer corrects.
    expect(classifyPlayLoss(0.03, 0)).toBe('ok');
    expect(classifyPlayLoss(0.05, 0)).toBe('ok');
    expect(classifyPlayLoss(OPENING_NOISE_MARGIN - 0.001, 1)).toBe('ok');
  });

  it('still flags a clear opening blunder beyond the margin', () => {
    expect(classifyPlayLoss(OPENING_NOISE_MARGIN, 0)).not.toBe('ok');
    expect(classifyPlayLoss(0.3, 1)).toBe('blunder');
  });

  it('classifies a non-opening play by the normal thresholds', () => {
    expect(classifyPlayLoss(0.03, 2)).toBe('dubious');
    expect(classifyPlayLoss(0.05, 2)).toBe('error');
    expect(classifyPlayLoss(0.3, 5)).toBe('blunder');
  });

  it('keeps the noise margin above the error threshold, so errors are suppressed', () => {
    expect(OPENING_NOISE_MARGIN).toBeGreaterThan(
      CLASSIFICATION_THRESHOLDS.error,
    );
    expect(OPENING_NOISE_MARGIN).toBeLessThanOrEqual(
      CLASSIFICATION_THRESHOLDS.blunder,
    );
  });
});
