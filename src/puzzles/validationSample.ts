/**
 * Deterministic sampling of the curated set for WASM re-validation
 * (ticket 17): `npm test` re-evaluates only this seeded sample against the
 * real engine, while `npm run validate:puzzles` sweeps the entire set. Pure
 * and dependency-free so both the node validation test and the script can
 * share it.
 */

import { PUZZLE_THEMES, type Puzzle } from './types';

/** mulberry32: small deterministic PRNG over a 32-bit state. */
function mulberry32(state: number): () => number {
  let s = state;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Fold a string into the numeric seed (FNV-1a) for per-theme streams. */
function hashSeed(seed: number, salt: string): number {
  let hash = (0x811c9dc5 ^ seed) >>> 0;
  for (let i = 0; i < salt.length; i++) {
    hash ^= salt.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash;
}

/** Fisher–Yates with a seeded PRNG; returns a new array. */
function seededShuffle<T>(items: readonly T[], random: () => number): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

/**
 * Select up to `perTheme` puzzles from each theme, seeded and reproducible:
 * every theme present is represented, and within a theme every puzzle kind
 * it contains appears at least once (quota permitting), so the sample spans
 * play and cube puzzles no matter how lopsided a theme's mix is.
 */
export function selectValidationSample(
  puzzles: readonly Puzzle[],
  perTheme: number,
  seed: number,
): Puzzle[] {
  const sample: Puzzle[] = [];
  for (const theme of PUZZLE_THEMES) {
    const group = puzzles.filter((p) => p.theme === theme);
    const random = mulberry32(hashSeed(seed, theme));
    const shuffled = seededShuffle(group, random);
    // One of each kind first (shuffled order), then fill from the rest.
    const firstOfKind = new Map<Puzzle['kind'], Puzzle>();
    for (const puzzle of shuffled) {
      if (!firstOfKind.has(puzzle.kind)) {
        firstOfKind.set(puzzle.kind, puzzle);
      }
    }
    const leaders = [...firstOfKind.values()].slice(0, perTheme);
    const rest = shuffled.filter((p) => !leaders.includes(p));
    sample.push(...leaders, ...rest.slice(0, perTheme - leaders.length));
  }
  return sample;
}
