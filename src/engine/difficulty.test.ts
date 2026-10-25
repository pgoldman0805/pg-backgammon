import { describe, expect, it } from 'vitest';
import {
  applyCubeDifficulty,
  applyDifficultyNoise,
  DIFFICULTY_SETTINGS,
  type DifficultySettings,
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
  it('keeps Expert and World-class at full strength (clean 0-ply / 2-ply)', () => {
    expect(DIFFICULTY_SETTINGS.expert).toEqual({
      plies: 0,
      noise: 0,
      bias: 0,
    });
    expect(DIFFICULTY_SETTINGS['world-class']).toEqual({
      plies: 2,
      noise: 0,
      bias: 0,
    });
  });

  it('weakens every lower level with both random noise and human-error bias', () => {
    for (const level of ['beginner', 'casual', 'intermediate'] as const) {
      expect(DIFFICULTY_SETTINGS[level].plies).toBe(0);
      expect(DIFFICULTY_SETTINGS[level].noise).toBeGreaterThan(0);
      expect(DIFFICULTY_SETTINGS[level].bias).toBeGreaterThan(0);
    }
  });

  it('widens monotonically toward Beginner in both noise and bias', () => {
    const rising = ['intermediate', 'casual', 'beginner'] as const;
    for (let i = 1; i < rising.length; i++) {
      expect(DIFFICULTY_SETTINGS[rising[i]].noise).toBeGreaterThan(
        DIFFICULTY_SETTINGS[rising[i - 1]].noise,
      );
      expect(DIFFICULTY_SETTINGS[rising[i]].bias).toBeGreaterThan(
        DIFFICULTY_SETTINGS[rising[i - 1]].bias,
      );
    }
  });

  it('opens a real gap at the bottom (Beginner noise clears Intermediate by >2x)', () => {
    expect(DIFFICULTY_SETTINGS.beginner.noise).toBeGreaterThan(
      2 * DIFFICULTY_SETTINGS.intermediate.noise,
    );
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

/** Pure symmetric noise, no human-error bias (isolates the random-slip term). */
const pureNoise = (noise: number): DifficultySettings => ({
  plies: 0,
  noise,
  bias: 0,
});

describe('applyDifficultyNoise', () => {
  const moves = [
    { moveText: '8/5 6/5', equity: 0.219 },
    { moveText: '24/23 13/10', equity: -0.012 },
    { moveText: '24/20', equity: -0.02 },
  ];

  it('returns the input untouched at zero noise and zero bias', () => {
    expect(
      applyDifficultyNoise(moves, DIFFICULTY_SETTINGS.expert, 'position-key'),
    ).toEqual(moves);
    expect(
      applyDifficultyNoise(
        moves,
        DIFFICULTY_SETTINGS['world-class'],
        'position-key',
      ),
    ).toEqual(moves);
  });

  it('is deterministic for the same position seed', () => {
    const a = applyDifficultyNoise(
      moves,
      DIFFICULTY_SETTINGS.beginner,
      'position-key',
    );
    const b = applyDifficultyNoise(
      moves,
      DIFFICULTY_SETTINGS.beginner,
      'position-key',
    );
    expect(a).toEqual(b);
  });

  it('perturbs equities within plausible noise bounds', () => {
    const noisy = applyDifficultyNoise(moves, pureNoise(0.06), 'position-key');
    for (const move of noisy) {
      const original = moves.find((m) => m.moveText === move.moveText);
      expect(original).toBeDefined();
      expect(move.equity).not.toBe(original?.equity);
      expect(Math.abs(move.equity - (original?.equity ?? 0))).toBeLessThan(0.4);
    }
  });

  it('returns moves sorted by perturbed equity, best first', () => {
    const noisy = applyDifficultyNoise(
      moves,
      DIFFICULTY_SETTINGS.beginner,
      'position-key',
    );
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
      const noisy = applyDifficultyNoise(
        pair,
        pureNoise(0.06),
        `position-${i}`,
      );
      if (noisy[0].moveText === 'second') {
        flips++;
      }
    }
    expect(flips).toBeGreaterThan(trials * 0.1);
    expect(flips).toBeLessThan(trials * 0.9);
  });

  // --- Human-error bias (the "textured" weakening) --------------------------

  /** Fraction of sampled positions where `tempt` is chosen over `best`. */
  function chosenRate(
    best: { moveText: string; equity: number },
    tempt: { moveText: string; equity: number },
    settings: DifficultySettings,
    trials = 500,
  ): number {
    let chosen = 0;
    for (let i = 0; i < trials; i++) {
      // Best listed first, as the clean engine would rank it.
      const ranked = applyDifficultyNoise([best, tempt], settings, `p-${i}`);
      if (ranked[0].moveText === tempt.moveText) {
        chosen++;
      }
    }
    return chosen / trials;
  }

  it('biases Beginner toward hitting over a quiet, better play (over-hitting)', () => {
    // A quiet builder is the real best (+0.10); a hit (gnubg marks it "*") is
    // clearly worse (+0.06) but tempting to a beginner.
    const quietBest = { moveText: '13/11 13/7', equity: 0.1 };
    const tempingHit = { moveText: '13/7* 8/5', equity: 0.06 };

    const withBias = chosenRate(
      quietBest,
      tempingHit,
      DIFFICULTY_SETTINGS.beginner,
    );
    const noiseOnly = chosenRate(
      quietBest,
      tempingHit,
      pureNoise(DIFFICULTY_SETTINGS.beginner.noise),
    );

    // The bias pulls the choice toward the hit well beyond symmetric noise,
    // and makes the (worse) hit the majority choice: recognizable over-hitting.
    expect(withBias).toBeGreaterThan(noiseOnly + 0.1);
    expect(withBias).toBeGreaterThan(0.5);
  });

  it('biases Beginner toward running a back checker over a better play', () => {
    const quietBest = { moveText: '13/10 6/5', equity: 0.1 };
    // A back checker breaks out of the opponent's home board (origin point 24).
    const running = { moveText: '24/20 13/11', equity: 0.07 };

    const withBias = chosenRate(
      quietBest,
      running,
      DIFFICULTY_SETTINGS.beginner,
    );
    const noiseOnly = chosenRate(
      quietBest,
      running,
      pureNoise(DIFFICULTY_SETTINGS.beginner.noise),
    );

    expect(withBias).toBeGreaterThan(noiseOnly + 0.05);
    expect(withBias).toBeGreaterThan(0.5);
  });

  it('does not bias a play that offers no beginner temptation', () => {
    const best = { moveText: '13/11 13/7', equity: 0.1 };
    const other = { moveText: '13/10 8/5', equity: 0.06 };
    // Neither move hits or runs a back checker: with the same symmetric noise,
    // bias changes nothing, so Beginner and a noise-only model agree exactly.
    expect(chosenRate(best, other, DIFFICULTY_SETTINGS.beginner)).toBe(
      chosenRate(best, other, pureNoise(DIFFICULTY_SETTINGS.beginner.noise)),
    );
  });

  it('biases harder at Beginner than at Intermediate (same temptation)', () => {
    const quietBest = { moveText: '13/11 13/7', equity: 0.1 };
    const tempingHit = { moveText: '13/7* 8/5', equity: 0.06 };
    expect(
      chosenRate(quietBest, tempingHit, DIFFICULTY_SETTINGS.beginner),
    ).toBeGreaterThan(
      chosenRate(quietBest, tempingHit, DIFFICULTY_SETTINGS.intermediate),
    );
  });

  // --- Monotonic strength gap across the five levels ------------------------

  /**
   * Mean true-equity lost by the level's chosen play over a fixed pool of
   * sampled positions. Each position lists its plays best-first by true
   * equity; some offer a tempting (hit / back-checker) alternative. Lower mean
   * loss = stronger play.
   */
  function meanEquityLoss(settings: DifficultySettings): number {
    const pool = samplePositions();
    let total = 0;
    for (let i = 0; i < pool.length; i++) {
      const moves = pool[i];
      const chosen = applyDifficultyNoise(moves, settings, `gap-${i}`)[0];
      const trueBest = Math.max(...moves.map((m) => m.equity));
      const trueChosen =
        moves.find((m) => m.moveText === chosen.moveText)?.equity ?? trueBest;
      total += trueBest - trueChosen;
    }
    return total / pool.length;
  }

  it('shows a measurable, monotonic strength gap across the five levels', () => {
    const loss = (level: keyof typeof DIFFICULTY_SETTINGS) =>
      meanEquityLoss(DIFFICULTY_SETTINGS[level]);

    const beginner = loss('beginner');
    const casual = loss('casual');
    const intermediate = loss('intermediate');

    expect(beginner).toBeGreaterThan(casual);
    expect(casual).toBeGreaterThan(intermediate);
    expect(intermediate).toBeGreaterThan(0);
    // Expert and World-class never give up equity: they pick the true best.
    expect(loss('expert')).toBe(0);
    expect(loss('world-class')).toBe(0);
  });

  it('separates Beginner from Intermediate by a wide margin, not a sliver', () => {
    expect(meanEquityLoss(DIFFICULTY_SETTINGS.beginner)).toBeGreaterThan(
      2 * meanEquityLoss(DIFFICULTY_SETTINGS.intermediate),
    );
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

/**
 * A fixed pool of synthetic checker-play positions for the strength-gap test:
 * each is a plays list ranked best-first by true equity, with a blend of
 * tempting (hit / back-checker) and quiet alternatives so the human-error bias
 * and the random slips both get exercised.
 */
function samplePositions(): { moveText: string; equity: number }[][] {
  const pool: { moveText: string; equity: number }[][] = [];
  for (let i = 0; i < 400; i++) {
    const gap = 0.02 + (i % 5) * 0.015; // 0.02 .. 0.08
    const flavor = i % 3;
    if (flavor === 0) {
      // Quiet best vs a tempting hit.
      pool.push([
        { moveText: '13/11 13/8', equity: 0.1 },
        { moveText: '13/8* 6/5', equity: 0.1 - gap },
        { moveText: '24/18 13/11', equity: 0.1 - gap - 0.02 },
      ]);
    } else if (flavor === 1) {
      // Quiet best vs running a back checker.
      pool.push([
        { moveText: '13/9 8/5', equity: 0.05 },
        { moveText: '24/20 13/11', equity: 0.05 - gap },
        { moveText: '8/5 6/4', equity: 0.05 - gap - 0.02 },
      ]);
    } else {
      // No temptation: only quiet plays, close together.
      pool.push([
        { moveText: '13/10 13/8', equity: 0.0 },
        { moveText: '13/8 8/6', equity: -gap },
        { moveText: '13/11 6/3', equity: -gap - 0.02 },
      ]);
    }
  }
  return pool;
}
