import { describe, expect, test } from 'vitest';
import { createSeededDice } from './dice';

describe('createSeededDice', () => {
  test('only ever rolls 1 through 6', () => {
    const dice = createSeededDice(1);
    for (let i = 0; i < 1000; i++) {
      const die = dice.rollDie();
      expect(die).toBeGreaterThanOrEqual(1);
      expect(die).toBeLessThanOrEqual(6);
      expect(Number.isInteger(die)).toBe(true);
    }
  });

  test('the same seed reproduces the same sequence', () => {
    const a = createSeededDice(42);
    const b = createSeededDice(42);
    const rollsA = Array.from({ length: 100 }, () => a.rollDie());
    const rollsB = Array.from({ length: 100 }, () => b.rollDie());
    expect(rollsA).toEqual(rollsB);
  });

  test('different seeds produce different sequences', () => {
    const a = createSeededDice(1);
    const b = createSeededDice(2);
    const rollsA = Array.from({ length: 100 }, () => a.rollDie());
    const rollsB = Array.from({ length: 100 }, () => b.rollDie());
    expect(rollsA).not.toEqual(rollsB);
  });

  test('all six faces appear with roughly uniform frequency', () => {
    const dice = createSeededDice(7);
    const counts = new Map<number, number>();
    const rolls = 60_000;
    for (let i = 0; i < rolls; i++) {
      const die = dice.rollDie();
      counts.set(die, (counts.get(die) ?? 0) + 1);
    }
    for (let face = 1; face <= 6; face++) {
      const count = counts.get(face) ?? 0;
      // Expected 10,000 per face; +/-6% is far beyond any plausible
      // statistical fluctuation for a fair generator.
      expect(count).toBeGreaterThan(9_400);
      expect(count).toBeLessThan(10_600);
    }
  });
});
