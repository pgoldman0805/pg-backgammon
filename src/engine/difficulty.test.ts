import { describe, expect, it } from 'vitest';
import {
  applyCubeDifficulty,
  applyDifficultyNoise,
  DIFFICULTY_SETTINGS,
  seededGaussian,
} from './difficulty';
import type { CubeAnalysis } from './types';

/** A money-game cube analysis with the three standard options. */
function cubeAnalysis(
  noDouble: number,
  doubleTake: number,
  doublePass: number,
  properAction: string,
): CubeAnalysis {
  return {
    cubelessEquity: noDouble,
    chances: {
      win: 0.6,
      winGammon: 0.1,
      winBackgammon: 0.01,
      lose: 0.4,
      loseGammon: 0.08,
      loseBackgammon: 0.005,
    },
    options: [
      { action: 'No double', equity: noDouble, equityDiff: 0 },
      {
        action: 'Double, take',
        equity: doubleTake,
        equityDiff: doubleTake - noDouble,
      },
      {
        action: 'Double, pass',
        equity: doublePass,
        equityDiff: doublePass - noDouble,
      },
    ],
    properAction,
  };
}

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

describe('applyCubeDifficulty', () => {
  // A borderline double: holding (+0.50) barely beats the doubled-take value
  // (+0.52); the opponent passes nothing, so the proper action is Double, take.
  const borderlineDouble = cubeAnalysis(0.5, 0.52, 1, 'Double, take');

  it('returns the analysis untouched at zero noise', () => {
    expect(applyCubeDifficulty(borderlineDouble, 0, 'pos')).toEqual(
      borderlineDouble,
    );
  });

  it('leaves Expert and World-class engine-correct (their noise is zero)', () => {
    for (const level of ['expert', 'world-class'] as const) {
      const { noise } = DIFFICULTY_SETTINGS[level];
      expect(applyCubeDifficulty(borderlineDouble, noise, 'pos')).toEqual(
        borderlineDouble,
      );
    }
  });

  it('is deterministic for the same position seed', () => {
    const a = applyCubeDifficulty(borderlineDouble, 0.06, 'pos');
    const b = applyCubeDifficulty(borderlineDouble, 0.06, 'pos');
    expect(a).toEqual(b);
  });

  it('perturbs the three cubeful equities within plausible bounds', () => {
    const noisy = applyCubeDifficulty(borderlineDouble, 0.06, 'pos');
    expect(noisy.options.map((o) => o.action)).toEqual([
      'No double',
      'Double, take',
      'Double, pass',
    ]);
    for (const option of noisy.options) {
      const original = borderlineDouble.options.find(
        (o) => o.action === option.action,
      );
      expect(option.equity).not.toBe(original?.equity);
      expect(Math.abs(option.equity - (original?.equity ?? 0))).toBeLessThan(
        0.4,
      );
    }
  });

  it('flips a borderline double sometimes but not always (degrades cube play)', () => {
    let noDoubles = 0;
    const trials = 300;
    for (let i = 0; i < trials; i++) {
      const verdict = applyCubeDifficulty(borderlineDouble, 0.06, `pos-${i}`);
      if (/^no double/i.test(verdict.properAction)) {
        noDoubles++;
      }
    }
    expect(noDoubles).toBeGreaterThan(trials * 0.1);
    expect(noDoubles).toBeLessThan(trials * 0.9);
  });

  it('keeps a clear double correct almost always', () => {
    // Doubling is worth +0.80 vs holding at -0.20: a wide, obvious double.
    const clear = cubeAnalysis(-0.2, 0.8, 1, 'Double, take');
    let doubles = 0;
    const trials = 300;
    for (let i = 0; i < trials; i++) {
      const verdict = applyCubeDifficulty(clear, 0.06, `clear-${i}`);
      if (/^double/i.test(verdict.properAction)) {
        doubles++;
      }
    }
    expect(doubles).toBeGreaterThan(trials * 0.95);
  });

  it('flips a borderline take/pass decision over sampled positions', () => {
    // Double, take vs Double, pass are neck and neck (+0.98 vs +1.00): the
    // responder's take/pass should waver under noise.
    const borderlineTake = cubeAnalysis(0.4, 0.98, 1, 'Double, take');
    let passes = 0;
    const trials = 300;
    for (let i = 0; i < trials; i++) {
      const verdict = applyCubeDifficulty(borderlineTake, 0.06, `take-${i}`);
      if (/pass$/i.test(verdict.properAction)) {
        passes++;
      }
    }
    expect(passes).toBeGreaterThan(trials * 0.1);
    expect(passes).toBeLessThan(trials * 0.9);
  });

  it('weakens more at Beginner than at Intermediate', () => {
    const flipRate = (noise: number): number => {
      let flips = 0;
      const trials = 400;
      for (let i = 0; i < trials; i++) {
        const verdict = applyCubeDifficulty(borderlineDouble, noise, `r-${i}`);
        if (/^no double/i.test(verdict.properAction)) {
          flips++;
        }
      }
      return flips / trials;
    };
    expect(flipRate(DIFFICULTY_SETTINGS.beginner.noise)).toBeGreaterThan(
      flipRate(DIFFICULTY_SETTINGS.intermediate.noise),
    );
  });

  it('leaves a non-standard (take/pass response) analysis untouched', () => {
    const response: CubeAnalysis = {
      cubelessEquity: 0.3,
      chances: borderlineDouble.chances,
      options: [
        { action: 'Take', equity: 0.3, equityDiff: 0 },
        { action: 'Pass', equity: 1, equityDiff: 0.7 },
      ],
      properAction: 'Take',
    };
    expect(applyCubeDifficulty(response, 0.06, 'pos')).toEqual(response);
  });
});
