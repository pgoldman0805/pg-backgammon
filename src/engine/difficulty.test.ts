import { describe, expect, it } from 'vitest';
import {
  applyDifficultyNoise,
  DIFFICULTY_SETTINGS,
  seededGaussian,
} from './difficulty';

describe('DIFFICULTY_SETTINGS', () => {
  it('matches the ADR-0001 difficulty recipe', () => {
    expect(DIFFICULTY_SETTINGS).toEqual({
      beginner: { plies: 0, noise: 0.06 },
      casual: { plies: 0, noise: 0.05 },
      intermediate: { plies: 0, noise: 0.03 },
      expert: { plies: 0, noise: 0 },
      'world-class': { plies: 2, noise: 0 },
    });
  });
});

describe('seededGaussian', () => {
  it('is deterministic for the same seed', () => {
    expect(seededGaussian('pos|31|8/5 6/5')).toBe(
      seededGaussian('pos|31|8/5 6/5'),
    );
  });

  it('differs across seeds', () => {
    expect(seededGaussian('seed-a')).not.toBe(seededGaussian('seed-b'));
  });

  it('is roughly standard normal over many seeds', () => {
    const samples = Array.from({ length: 2000 }, (_, i) =>
      seededGaussian(`sample-${i}`),
    );
    const mean = samples.reduce((a, b) => a + b, 0) / samples.length;
    const variance =
      samples.reduce((a, b) => a + (b - mean) ** 2, 0) / samples.length;
    expect(Math.abs(mean)).toBeLessThan(0.1);
    expect(variance).toBeGreaterThan(0.8);
    expect(variance).toBeLessThan(1.2);
  });
});

describe('applyDifficultyNoise', () => {
  const moves = [
    { moveText: '8/5 6/5', equity: 0.219 },
    { moveText: '24/23 13/10', equity: -0.012 },
    { moveText: '24/20', equity: -0.02 },
  ];

  it('returns the input untouched at zero noise', () => {
    expect(applyDifficultyNoise(moves, 0, 'position-key')).toEqual(moves);
  });

  it('is deterministic for the same position seed', () => {
    const a = applyDifficultyNoise(moves, 0.06, 'position-key');
    const b = applyDifficultyNoise(moves, 0.06, 'position-key');
    expect(a).toEqual(b);
  });

  it('perturbs equities within plausible noise bounds', () => {
    const noisy = applyDifficultyNoise(moves, 0.06, 'position-key');
    for (const move of noisy) {
      const original = moves.find((m) => m.moveText === move.moveText);
      expect(original).toBeDefined();
      expect(move.equity).not.toBe(original?.equity);
      expect(Math.abs(move.equity - (original?.equity ?? 0))).toBeLessThan(0.4);
    }
  });

  it('returns moves sorted by noisy equity, best first', () => {
    const noisy = applyDifficultyNoise(moves, 0.06, 'position-key');
    for (let i = 1; i < noisy.length; i++) {
      expect(noisy[i - 1].equity).toBeGreaterThanOrEqual(noisy[i].equity);
    }
  });

  it('flips close decisions sometimes but not always (degrades play)', () => {
    let flips = 0;
    const trials = 200;
    for (let i = 0; i < trials; i++) {
      const pair = [
        { moveText: 'best', equity: 0.03 },
        { moveText: 'second', equity: 0.01 },
      ];
      const noisy = applyDifficultyNoise(pair, 0.06, `position-${i}`);
      if (noisy[0].moveText === 'second') {
        flips++;
      }
    }
    expect(flips).toBeGreaterThan(trials * 0.1);
    expect(flips).toBeLessThan(trials * 0.9);
  });
});
