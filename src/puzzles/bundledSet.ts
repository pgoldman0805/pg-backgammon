/**
 * The complete set of puzzles that ships with the app: the hand-authored
 * "Basics" fundamentals (ticket 33) followed by the self-play-mined curated
 * set. Both are graded at full engine strength and re-validated against the
 * real WASM build (curatedPuzzles.validation.test.ts); grouping into themes
 * for display is done by the Puzzles page in theme order (basics first).
 *
 * Keeping the two source files separate lets the large mined set regenerate
 * (npm run mine:puzzles) without disturbing the small authored Basics set
 * (npm run mine:basics), and vice versa.
 */

import { BASICS_PUZZLES } from './basicsSet';
import { CURATED_PUZZLES } from './curatedSet';
import type { Puzzle } from './types';

/** Basics first, then the mined curated set — the drill order of the app. */
export const BUNDLED_PUZZLES: readonly Puzzle[] = [
  ...BASICS_PUZZLES,
  ...CURATED_PUZZLES,
];
