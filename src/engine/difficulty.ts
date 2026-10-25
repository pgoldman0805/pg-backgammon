/**
 * The difficulty layer (ADR-0001): every opponent strength is the same
 * engine deliberately weakened — reduced lookahead plus seeded perturbation
 * of the evaluations, seeded by position so the same decision always gets the
 * same perturbation (reproducible games and tests).
 *
 * The weakening at lower levels is *human-textured*, not just random. Two
 * terms combine over each candidate play's clean equity:
 *
 *   1. Random slips — symmetric, zero-mean Gaussian noise of s.d. `noise`.
 *      These are the ordinary "didn't see it" errors; their spread widens
 *      sharply toward Beginner so the bottom level is genuinely beatable and
 *      clearly distinct from Intermediate rather than compressing into a
 *      narrow upper band.
 *
 *   2. Human-error bias — a *directional* equity bonus of magnitude `bias`
 *      added to plays that match recognizable beginner temptations, so a
 *      weakened opponent systematically errs the way a weaker human does
 *      rather than coin-flipping uniformly:
 *        - over-hitting: a play that hits (gnubg marks the hit with "*");
 *        - running a back checker: a play that breaks a back checker out of
 *          the opponent's home board / deep anchor zone.
 *      The two beginner mistakes the spec names that are *not* modeled here —
 *      under-valuing gammon chances and timing/priming danger — need
 *      per-play win/gammon distributions that this seam does not carry
 *      uniformly (the fake engine has no gammon model), so they are left for
 *      a later pass; see the ticket-36 comment.
 *
 * Expert (clean 0-ply) and World-class (clean 2-ply) carry zero of both, so
 * they, and every analysis/Tutor call, stay exactly engine-correct.
 *
 * gnubg has a native `noise ... deterministic on` mode, but in the vendored
 * WASM build it produces saturated, implausible evaluations (verified
 * empirically — equities jump to ~+1.0 at the opening), so the perturbation
 * is applied here in TypeScript over clean engine equities instead.
 */

import type { CubeAnalysis, CubeDecisionOption, Difficulty } from './types';

export interface DifficultySettings {
  /** Engine lookahead for this strength. */
  readonly plies: 0 | 2;
  /** Standard deviation of the symmetric Gaussian equity noise (0 = clean). */
  readonly noise: number;
  /**
   * Magnitude (in EMG) of the directional human-error bias toward beginner
   * temptations (over-hitting, running a back checker). 0 = no bias.
   */
  readonly bias: number;
}

export const DIFFICULTY_SETTINGS: Readonly<
  Record<Difficulty, DifficultySettings>
> = {
  beginner: { plies: 0, noise: 0.12, bias: 0.12 },
  casual: { plies: 0, noise: 0.07, bias: 0.06 },
  intermediate: { plies: 0, noise: 0.035, bias: 0.02 },
  expert: { plies: 0, noise: 0, bias: 0 },
  'world-class': { plies: 2, noise: 0, bias: 0 },
};

/**
 * Relative pull of each modeled temptation, multiplied by a level's `bias`.
 * Hitting is the stronger reflex; running a back checker is a touch milder.
 */
const HIT_WEIGHT = 1;
const RUN_WEIGHT = 0.6;

/**
 * Lowest origin point (hero-relative) that counts as "a back checker": points
 * 20–24 are the opponent's home board and the deep anchor zone a beginner is
 * too eager to run from.
 */
const BACK_CHECKER_POINT = 20;

/**
 * How strongly a play tempts a weaker human, as a multiple of `bias`, read
 * straight from gnubg's hero-relative move notation (so it is side-agnostic):
 * a hit is flagged with "*", and a back checker is any token that advances a
 * checker off point 20–24. A play can be doubly tempting (a running hit).
 */
export function humanTemptation(moveText: string): number {
  let weight = 0;
  if (moveText.includes('*')) {
    weight += HIT_WEIGHT;
  }
  for (const token of moveText.trim().split(/\s+/)) {
    const origin = Number.parseInt(token.replace(/\*/g, ''), 10);
    if (Number.isInteger(origin) && origin >= BACK_CHECKER_POINT) {
      weight += RUN_WEIGHT;
      break;
    }
  }
  return weight;
}

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
 * Perturb each move's equity for a weakened difficulty and re-sort best first.
 *
 * Two position-seeded terms are added to every candidate's clean equity:
 * symmetric Gaussian noise of s.d. `settings.noise` (random slips), and a
 * directional `settings.bias × humanTemptation(move)` bonus that pulls the
 * choice toward characteristic beginner mistakes. The seed combines the
 * position key with each move's notation, so every candidate gets independent
 * but reproducible noise. A level with zero noise and zero bias (Expert,
 * World-class) returns the input unchanged.
 */
export function applyDifficultyNoise<
  T extends { readonly moveText: string; readonly equity: number },
>(
  moves: readonly T[],
  settings: Pick<DifficultySettings, 'noise' | 'bias'>,
  positionSeed: string,
): T[] {
  const { noise, bias } = settings;
  if (noise === 0 && bias === 0) {
    return [...moves];
  }
  return moves
    .map((move) => ({
      ...move,
      equity:
        move.equity +
        noise * seededGaussian(`${positionSeed}|${move.moveText}`) +
        bias * humanTemptation(move.moveText),
    }))
    .sort((a, b) => b.equity - a.equity);
}

/** Match a cube option by its role in the standard three-way doubler analysis. */
function findOption(
  options: readonly CubeDecisionOption[],
  pattern: RegExp,
): CubeDecisionOption | undefined {
  return options.find((option) => pattern.test(option.action));
}

/**
 * gnubg's proper cube action, derived from the three cubeful equities of a
 * standard doubler analysis (on-roll / doubler perspective). The responder
 * minimizes the doubler's equity, so a take is chosen only when it leaves the
 * doubler worse off than a pass; the value of doubling is that choice, and the
 * double is correct when it beats holding the cube. The affirmative/negative
 * wording comes from the options so "Redouble"/"No redouble" carry through.
 *
 * Returns null for any non-standard shape (e.g. a bare take/pass response),
 * which the caller treats as "leave the verdict as-is". Sharing this one
 * derivation keeps the fake engine's verdict consistent with the perturbation,
 * so a weakened opponent only ever deviates through noise, never a rule change.
 */
export function cubeProperAction(
  options: readonly CubeDecisionOption[],
): string | null {
  const noDouble = findOption(options, /^no\b/i);
  const take = findOption(options, /take$/i);
  const pass = findOption(options, /pass$/i);
  if (!noDouble || !take || !pass) {
    return null;
  }
  const responderTakes = take.equity < pass.equity;
  const doubleValue = responderTakes ? take.equity : pass.equity;
  const shouldDouble = doubleValue > noDouble.equity;
  const affirmative = take.action.split(',')[0].trim();
  const doublePart = shouldDouble ? affirmative : noDouble.action;
  return `${doublePart}, ${responderTakes ? 'take' : 'pass'}`;
}

/**
 * The cube-play analog of {@link applyDifficultyNoise}: perturb a cube
 * decision with position-seeded Gaussian noise so a weakened opponent makes
 * loose or missed doubles and wrong takes/passes at a rate that scales with
 * the level's checker-play noise. Each of the three cubeful equities
 * (no-double / double-take / double-pass) gets independent, reproducible
 * noise of the given standard deviation, then the proper action is recomputed
 * from the noisy equities — so a close decision flips often and a clear one
 * almost never. Zero noise returns the analysis unchanged, which keeps Expert,
 * World-class, and every analysis/Tutor call engine-correct.
 *
 * Only the standard three-option doubler analysis is perturbed; any other
 * shape (e.g. a bare take/pass response) is returned untouched.
 */
export function applyCubeDifficulty(
  analysis: CubeAnalysis,
  noise: number,
  positionSeed: string,
): CubeAnalysis {
  if (noise === 0) {
    return analysis;
  }
  const noDouble = findOption(analysis.options, /^no\b/i);
  const take = findOption(analysis.options, /take$/i);
  const pass = findOption(analysis.options, /pass$/i);
  if (!noDouble || !take || !pass) {
    return analysis;
  }

  const noisyByAction = new Map<string, CubeDecisionOption>();
  for (const option of [noDouble, take, pass]) {
    noisyByAction.set(option.action, {
      ...option,
      equity:
        option.equity +
        noise * seededGaussian(`${positionSeed}|cube|${option.action}`),
    });
  }
  const noisyOptions = analysis.options.map(
    (option) => noisyByAction.get(option.action) ?? option,
  );
  // Refresh gnubg's diff-against-first-listed convention over the noisy values.
  const base = noisyOptions[0].equity;
  const options = noisyOptions.map((option) => ({
    ...option,
    equityDiff: Number((option.equity - base).toFixed(6)),
  }));

  return {
    ...analysis,
    options,
    properAction: cubeProperAction(options) ?? analysis.properAction,
  };
}
