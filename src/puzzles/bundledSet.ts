/**
 * The complete set of puzzles that ships with the app: the hand-authored
 * "Basics" fundamentals (ticket 33), the self-play-mined curated set, and the
 * score-dependent cube puzzles (ticket 38). All are graded at full engine
 * strength and re-validated against the real WASM build
 * (curatedPuzzles.validation.test.ts); grouping into themes for display is
 * done by the Puzzles page in theme order (basics first).
 *
 * Keeping the source files separate lets each regenerate independently —
 * npm run mine:puzzles, mine:basics, mine:score-cubes — without disturbing
 * the others.
 */

import { BASICS_PUZZLES } from './basicsSet';
import { CURATED_PUZZLES } from './curatedSet';
import { SCORE_CUBE_PUZZLES } from './scoreCubeSet';
import type { Puzzle } from './types';

/**
 * Basics first, then the mined curated set, then the score-dependent cube
 * puzzles — the drill order of the app. The score cubes join the cube-handling
 * theme (ticket 38); they carry a match score, so the same board at two scores
 * is two distinct drills.
 */
export const BUNDLED_PUZZLES: readonly Puzzle[] = [
  ...BASICS_PUZZLES,
  ...CURATED_PUZZLES,
  ...SCORE_CUBE_PUZZLES,
];
