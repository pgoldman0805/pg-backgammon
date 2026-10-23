import { describe, expect, it } from 'vitest';
import type { CubeAnalysis } from '../engine';
import { costCubeResponse, costDoubleDecision, cubeEquities } from './cube';

/** A cube analysis in gnubg's shape (doubler's perspective). */
function analysis(
  noDouble: number,
  doubleTake: number,
  doublePass: number,
  labels: [string, string, string] = [
    'No double',
    'Double, take',
    'Double, pass',
  ],
): CubeAnalysis {
  return {
    cubelessEquity: noDouble,
    chances: {
      win: 0.5,
      winGammon: 0.1,
      winBackgammon: 0.01,
      lose: 0.5,
      loseGammon: 0.1,
      loseBackgammon: 0.01,
    },
    options: [
      { action: labels[0], equity: noDouble, equityDiff: 0 },
      {
        action: labels[1],
        equity: doubleTake,
        equityDiff: doubleTake - noDouble,
      },
      {
        action: labels[2],
        equity: doublePass,
        equityDiff: doublePass - noDouble,
      },
    ],
    properAction: 'No double, take',
  };
}

describe('cubeEquities', () => {
  it('extracts the three cubeful equities by gnubg label', () => {
    expect(cubeEquities(analysis(0.3, 0.45, 1))).toEqual({
      noDouble: 0.3,
      doubleTake: 0.45,
      doublePass: 1,
    });
  });

  it('understands the redouble vocabulary', () => {
    const eq = cubeEquities(
      analysis(0.3, 0.45, 1, [
        'No redouble',
        'Redouble, take',
        'Redouble, pass',
      ]),
    );
    expect(eq).toEqual({ noDouble: 0.3, doubleTake: 0.45, doublePass: 1 });
  });

  it('throws when an option is missing', () => {
    const broken = analysis(0.3, 0.45, 1);
    expect(() =>
      cubeEquities({ ...broken, options: broken.options.slice(0, 2) }),
    ).toThrow(/cube/i);
  });
});

describe('costDoubleDecision', () => {
  it('costs a missed double against the opponent’s best response', () => {
    // Doubling is right: min(0.55 take, 1.0 pass) = 0.55 > 0.4 no-double.
    const result = costDoubleDecision(
      { noDouble: 0.4, doubleTake: 0.55, doublePass: 1 },
      false,
    );
    expect(result.error).toBe('missed-double');
    expect(result.equityLoss).toBeCloseTo(0.15, 10);
  });

  it('costs a wrong double against holding the cube', () => {
    // Doubling is wrong: min(0.1 take, 1.0 pass) = 0.1 < 0.3 no-double.
    const result = costDoubleDecision(
      { noDouble: 0.3, doubleTake: 0.1, doublePass: 1 },
      true,
    );
    expect(result.error).toBe('wrong-double');
    expect(result.equityLoss).toBeCloseTo(0.2, 10);
  });

  it('finds no error in a correct double or a correct hold', () => {
    const equities = { noDouble: 0.4, doubleTake: 0.55, doublePass: 1 };
    expect(costDoubleDecision(equities, true)).toEqual({
      error: null,
      equityLoss: 0,
    });
    const hold = { noDouble: 0.4, doubleTake: 0.3, doublePass: 1 };
    expect(costDoubleDecision(hold, false)).toEqual({
      error: null,
      equityLoss: 0,
    });
  });

  it('treats a too-good position (pass < take) as a missed double too', () => {
    // Cashing is right: min(0.9, 1.0)=0.9 > 0.8? no wait — too good means
    // playing on beats doubling: noDouble 1.1 > min(1.3, 1.0)=1.0 → no error.
    const tooGood = { noDouble: 1.1, doubleTake: 1.3, doublePass: 1 };
    expect(costDoubleDecision(tooGood, false).error).toBeNull();
    // And doubling such a position costs the difference.
    expect(costDoubleDecision(tooGood, true)).toEqual({
      error: 'wrong-double',
      equityLoss: expect.closeTo(0.1, 10),
    });
  });
});

describe('costCubeResponse', () => {
  it('costs a wrong take when passing was cheaper', () => {
    const result = costCubeResponse(
      { noDouble: 0.9, doubleTake: 1.4, doublePass: 1 },
      'take',
    );
    expect(result.error).toBe('wrong-take');
    expect(result.equityLoss).toBeCloseTo(0.4, 10);
  });

  it('costs a wrong pass when taking was cheaper', () => {
    const result = costCubeResponse(
      { noDouble: 0.4, doubleTake: 0.55, doublePass: 1 },
      'pass',
    );
    expect(result.error).toBe('wrong-pass');
    expect(result.equityLoss).toBeCloseTo(0.45, 10);
  });

  it('finds no error in the correct response', () => {
    expect(
      costCubeResponse(
        { noDouble: 0.4, doubleTake: 0.55, doublePass: 1 },
        'take',
      ),
    ).toEqual({ error: null, equityLoss: 0 });
    expect(
      costCubeResponse(
        { noDouble: 0.9, doubleTake: 1.4, doublePass: 1 },
        'pass',
      ),
    ).toEqual({ error: null, equityLoss: 0 });
  });
});
