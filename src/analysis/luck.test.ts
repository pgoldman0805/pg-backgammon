import { describe, expect, it } from 'vitest';
import type { Engine, EnginePosition } from '../engine';
import { createFakeEngine } from '../engine/fake';
import { createBoard, type DiceRoll } from '../rules';
import { rollLuck } from './luck';

/** A pure race: White (→1) against Black (→24), no contact left. */
const raceBoard = createBoard({
  white: { points: { 6: 5, 8: 5, 13: 5 } },
  black: { points: { 19: 5, 20: 5, 21: 5 } },
});
const whiteOnRoll: EnginePosition = { board: raceBoard, onRoll: 'white' };

async function best(
  engine: Engine,
  position: EnginePosition,
  roll: DiceRoll,
): Promise<number> {
  const ranked = await engine.rankPlays(position, roll);
  return ranked[0].equity;
}

describe('rollLuck', () => {
  it('is the realized best-play equity minus the pre-roll expectation', async () => {
    const engine = createFakeEngine();
    const actualBest = await best(engine, whiteOnRoll, [6, 5]);
    const expectation = (await engine.evaluate(whiteOnRoll)).cubefulEquity;

    const luck = await rollLuck(engine, whiteOnRoll, actualBest);
    expect(luck).toBeCloseTo(actualBest - expectation, 10);
  });

  it('rates a big roll luckier than a small one from the same spot', async () => {
    const engine = createFakeEngine();
    const big = await rollLuck(
      engine,
      whiteOnRoll,
      await best(engine, whiteOnRoll, [6, 6]),
    );
    const small = await rollLuck(
      engine,
      whiteOnRoll,
      await best(engine, whiteOnRoll, [2, 1]),
    );
    expect(big).toBeGreaterThan(small);
  });

  it('measures luck against a common baseline, so roll order cancels out', async () => {
    const engine = createFakeEngine();
    // Two rolls of equal best-play value have equal luck: the baseline is the
    // one position evaluation, shared across every roll from that spot.
    const a = await rollLuck(engine, whiteOnRoll, 0.4);
    const b = await rollLuck(engine, whiteOnRoll, 0.4);
    expect(a).toBe(b);
  });
});
