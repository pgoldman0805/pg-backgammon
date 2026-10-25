import { describe, expect, it } from 'vitest';
import type { Engine, EnginePosition } from '../engine';
import { createFakeEngine } from '../engine/fake';
import { createBoard, type DiceRoll, opponent } from '../rules';
import {
  ALL_ROLLS,
  bestRollEquity,
  OPENING_ROLLS,
  rollLuck,
  rollWeight,
} from './luck';

/** A pure race: White (→1) ahead-ish of Black (→24), no contact left. */
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

describe('the 21 dice rolls', () => {
  it('lists all 21 distinct rolls, weighted to the 36 outcomes', () => {
    expect(ALL_ROLLS).toHaveLength(21);
    expect(ALL_ROLLS.reduce((sum, r) => sum + rollWeight(r), 0)).toBe(36);
    const doubles = ALL_ROLLS.filter((r) => r[0] === r[1]);
    expect(doubles).toHaveLength(6);
    for (const double of doubles) {
      expect(rollWeight(double)).toBe(1);
    }
  });

  it('lists the 15 non-double opening rolls, weighted to 30 outcomes', () => {
    expect(OPENING_ROLLS).toHaveLength(15);
    expect(OPENING_ROLLS.every((r) => r[0] !== r[1])).toBe(true);
    expect(OPENING_ROLLS.reduce((sum, r) => sum + rollWeight(r), 0)).toBe(30);
  });
});

describe('rollLuck', () => {
  it('is the actual roll best-equity minus the 21-roll weighted average', async () => {
    const engine = createFakeEngine();
    const actual: DiceRoll = [6, 5];
    const actualBest = await best(engine, whiteOnRoll, actual);

    // Independently recompute the baseline from the same deterministic fake.
    let weighted = 0;
    let weight = 0;
    for (const roll of ALL_ROLLS) {
      weighted += rollWeight(roll) * (await best(engine, whiteOnRoll, roll));
      weight += rollWeight(roll);
    }
    const expected = actualBest - weighted / weight;

    const luck = await rollLuck(engine, whiteOnRoll, actual, actualBest);
    expect(luck).toBeCloseTo(expected, 10);
  });

  it('rates a big roll luckier than a small one from the same spot', async () => {
    const engine = createFakeEngine();
    const bigBest = await best(engine, whiteOnRoll, [6, 6]);
    const smallBest = await best(engine, whiteOnRoll, [2, 1]);
    const big = await rollLuck(engine, whiteOnRoll, [6, 6], bigBest);
    const small = await rollLuck(engine, whiteOnRoll, [2, 1], smallBest);
    expect(big).toBeGreaterThan(small);
    expect(big).toBeGreaterThan(0);
    expect(small).toBeLessThan(0);
  });

  it('reuses the supplied best-equity for the actual roll (no re-ranking)', async () => {
    const fake = createFakeEngine();
    const ranked: string[] = [];
    const engine: Engine = {
      ...fake,
      rankPlays(position, roll, options) {
        ranked.push(`${roll[0]}${roll[1]}`);
        return fake.rankPlays(position, roll, options);
      },
    };
    await rollLuck(engine, whiteOnRoll, [6, 5], 0.5);
    expect(ranked).not.toContain('65');
    expect(ranked).not.toContain('56');
  });

  it('excludes doubles from the baseline for the opening roll', async () => {
    const engine = createFakeEngine();
    const actual: DiceRoll = [3, 1];
    const actualBest = await best(engine, whiteOnRoll, actual);
    let weighted = 0;
    let weight = 0;
    for (const roll of OPENING_ROLLS) {
      weighted += rollWeight(roll) * (await best(engine, whiteOnRoll, roll));
      weight += rollWeight(roll);
    }
    const expected = actualBest - weighted / weight;

    const luck = await rollLuck(
      engine,
      whiteOnRoll,
      actual,
      actualBest,
      OPENING_ROLLS,
    );
    expect(luck).toBeCloseTo(expected, 10);
  });
});

describe('bestRollEquity on a dance', () => {
  it('values a dancing roll as the no-move position, opponent to play', async () => {
    const engine = createFakeEngine();
    // White has two on the bar; Black's home board (19-24) is shut, so a
    // 6-6 cannot enter — a dance with no legal play.
    const closed = createBoard({
      white: { points: { 6: 5, 8: 5, 13: 3 }, bar: 2 },
      black: {
        points: { 18: 3, 19: 2, 20: 2, 21: 2, 22: 2, 23: 2, 24: 2 },
      },
    });
    const position: EnginePosition = { board: closed, onRoll: 'white' };

    expect(await engine.rankPlays(position, [6, 6])).toHaveLength(0);
    const danced = await bestRollEquity(engine, position, [6, 6]);
    const evaluated = await engine.evaluate({
      ...position,
      onRoll: opponent('white'),
    });
    expect(danced).toBeCloseTo(-evaluated.cubefulEquity, 10);
  });
});
