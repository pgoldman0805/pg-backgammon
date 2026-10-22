import type { Die } from './types';

/**
 * Source of individual die rolls. The engine's only randomness boundary:
 * production uses {@link createSeededDice}; tests may script rolls.
 */
export interface DiceSource {
  rollDie(): Die;
}

/** mulberry32: a small, fast, well-distributed 32-bit PRNG. */
function mulberry32(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return (t ^ (t >>> 14)) >>> 0;
  };
}

// Largest multiple of 6 that fits in 32 bits; values at or above it are
// rejected so every face has exactly equal probability (no modulo bias).
const REJECTION_LIMIT = Math.floor(2 ** 32 / 6) * 6;

/**
 * A fair, deterministic dice source: the same seed always yields the same
 * roll sequence. Uses rejection sampling for exact uniformity.
 */
export function createSeededDice(seed: number): DiceSource {
  const next = mulberry32(seed);
  return {
    rollDie(): Die {
      let value = next();
      while (value >= REJECTION_LIMIT) {
        value = next();
      }
      return ((value % 6) + 1) as Die;
    },
  };
}
