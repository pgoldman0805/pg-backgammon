/**
 * The difficulty layer (ADR-0001): every opponent strength is the same
 * engine deliberately weakened — reduced lookahead plus Gaussian noise on
 * the evaluations, seeded by position so the same decision always gets the
 * same noise (reproducible games and tests).
 *
 * gnubg has a native `noise ... deterministic on` mode, but in the vendored
 * WASM build it produces saturated, implausible evaluations (verified
 * empirically — equities jump to ~+1.0 at the opening), so the perturbation
 * is applied here in TypeScript over clean engine equities instead.
 */

import type { Difficulty } from './types';

export interface DifficultySettings {
  /** Engine lookahead for this strength. */
  readonly plies: 0 | 2;
  /** Standard deviation of the Gaussian equity noise (0 = clean). */
  readonly noise: number;
}

export const DIFFICULTY_SETTINGS: Readonly<
  Record<Difficulty, DifficultySettings>
> = {
  beginner: { plies: 0, noise: 0.06 },
  casual: { plies: 0, noise: 0.05 },
  intermediate: { plies: 0, noise: 0.03 },
  expert: { plies: 0, noise: 0 },
  'world-class': { plies: 2, noise: 0 },
};

/**
 * Display labels for the five difficulties (GLOSSARY "Difficulty"), in
 * settings order: weakest first.
 */
export const DIFFICULTY_LABELS: Readonly<Record<Difficulty, string>> = {
  beginner: 'Beginner',
  casual: 'Casual',
  intermediate: 'Intermediate',
  expert: 'Expert',
  'world-class': 'World-class',
};

/** xmur3 string hash: seeds the PRNG from arbitrary text. */
function hashSeed(text: string): number {
  let h = 1779033703 ^ text.length;
  for (let i = 0; i < text.length; i++) {
    h = Math.imul(h ^ text.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  h = Math.imul(h ^ (h >>> 16), 2246822507);
  h = Math.imul(h ^ (h >>> 13), 3266489909);
  h ^= h >>> 16;
  return h >>> 0;
}

/** mulberry32: small deterministic PRNG over a 32-bit state. */
function mulberry32(state: number): () => number {
  let a = state;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Deterministic standard-normal sample derived from a string seed. */
export function seededGaussian(seed: string): number {
  const next = mulberry32(hashSeed(seed));
  // Box-Muller; u1 nudged away from 0 to keep log finite.
  const u1 = Math.max(next(), 1e-12);
  const u2 = next();
  return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
}

/**
 * Perturb each move's equity with position-seeded Gaussian noise of the
 * given standard deviation and re-sort best first. Zero noise returns the
 * input unchanged. The seed combines the position key with each move's
 * notation, so every candidate play gets independent but reproducible noise.
 */
export function applyDifficultyNoise<
  T extends { readonly moveText: string; readonly equity: number },
>(moves: readonly T[], noise: number, positionSeed: string): T[] {
  if (noise === 0) {
    return [...moves];
  }
  return moves
    .map((move) => ({
      ...move,
      equity:
        move.equity +
        noise * seededGaussian(`${positionSeed}|${move.moveText}`),
    }))
    .sort((a, b) => b.equity - a.equity);
}
