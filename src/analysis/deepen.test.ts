import { describe, expect, it } from 'vitest';
import { createFakeEngine } from '../engine/fake';
import { cubeGameMatch as cubeGame, recordOf } from '../test/match';
import { analyzeMatch } from './analyze';
import { deepenDecision } from './deepen';

describe('deepenDecision', () => {
  it('re-analyzes one play at 3-ply and refreshes the summaries', async () => {
    const record = recordOf(cubeGame());
    const engine = createFakeEngine();
    const base = await analyzeMatch(record, { engine, now: () => 1 });
    const target = base.games[0].decisions.findIndex((d) => d.kind === 'play');

    const deepened = await deepenDecision(record, base, {
      gameIndex: 0,
      decisionIndex: target,
      engine,
      now: () => 2,
    });

    const before = base.games[0].decisions[target];
    const after = deepened.games[0].decisions[target];
    expect(after.kind).toBe('play');
    expect(after.plies).toBe(3);
    expect(after).not.toEqual(before);
    expect(deepened.analyzedAt).toBe(2);
    // Untouched decisions stay identical; totals follow the new numbers.
    expect(deepened.games[0].decisions.filter((_, i) => i !== target)).toEqual(
      base.games[0].decisions.filter((_, i) => i !== target),
    );
    const lost = deepened.games[0].decisions.reduce(
      (sum, d) => sum + d.equityLoss,
      0,
    );
    expect(
      deepened.games[0].white.equityLost + deepened.games[0].black.equityLost,
    ).toBeCloseTo(lost, 10);
  });

  it('deepening either side of a double refreshes both entries', async () => {
    const record = recordOf(cubeGame());
    const engine = createFakeEngine();
    const base = await analyzeMatch(record, { engine, now: () => 1 });
    const doubleIndex = base.games[0].decisions.findIndex(
      (d) => d.kind === 'cube' && d.action === 'double',
    );
    const takeIndex = base.games[0].decisions.findIndex(
      (d) => d.kind === 'cube' && d.action === 'take',
    );

    const deepened = await deepenDecision(record, base, {
      gameIndex: 0,
      decisionIndex: takeIndex,
      engine,
      now: () => 2,
    });

    expect(deepened.games[0].decisions[doubleIndex].plies).toBe(3);
    expect(deepened.games[0].decisions[takeIndex].plies).toBe(3);
  });

  it('is idempotent for an already-deepened decision', async () => {
    const record = recordOf(cubeGame());
    const engine = createFakeEngine();
    const base = await analyzeMatch(record, { engine, now: () => 1 });
    const once = await deepenDecision(record, base, {
      gameIndex: 0,
      decisionIndex: 0,
      engine,
      now: () => 2,
    });
    const twice = await deepenDecision(record, once, {
      gameIndex: 0,
      decisionIndex: 0,
      engine,
      now: () => 2,
    });
    expect(twice).toEqual(once);
  });
});
