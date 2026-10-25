/**
 * Full-set curated-puzzle validation (ticket 17): re-evaluates EVERY bundled
 * puzzle's stored answer data against the real gnubg WASM engine — the same
 * checks the in-suite validation test runs over its deterministic sample
 * (src/engine/node/curatedValidation.ts). Run after regenerating the set:
 *
 *   npm run validate:puzzles
 *
 * Exits non-zero if any stored answer no longer matches the engine.
 */

import {
  checkPlayDepthAgreement,
  checkPuzzle,
} from '../src/engine/node/curatedValidation';
import { loadGnubgSession } from '../src/engine/node/loadGnubg';
import { BUNDLED_PUZZLES } from '../src/puzzles/bundledSet';
import { PUZZLE_THEMES } from '../src/puzzles/types';

export async function validatePuzzles(): Promise<void> {
  console.log('Loading gnubg WASM…');
  const session = await loadGnubgSession();
  const started = Date.now();

  let checked = 0;
  let failed = 0;
  let depthFlips = 0;
  for (const puzzle of BUNDLED_PUZZLES) {
    const problems = checkPuzzle(session, puzzle);
    // Ticket 35 agreement gate: a play puzzle's 2-ply best must still be best
    // at 3-ply — its top play must not flip at greater depth.
    if (puzzle.kind === 'play') {
      const flips = checkPlayDepthAgreement(session, puzzle);
      if (flips.length > 0) {
        depthFlips++;
      }
      problems.push(...flips);
    }
    checked++;
    if (problems.length > 0) {
      failed++;
      console.error(`FAIL ${puzzle.id} (${puzzle.theme} ${puzzle.kind}):`);
      for (const problem of problems) {
        console.error(`  - ${problem}`);
      }
    }
    if (checked % 25 === 0) {
      console.log(
        `  ${checked}/${BUNDLED_PUZZLES.length} re-evaluated ` +
          `(${Math.round((Date.now() - started) / 1000)}s)`,
      );
    }
  }

  const plays = BUNDLED_PUZZLES.filter((p) => p.kind === 'play').length;
  const cubes = BUNDLED_PUZZLES.length - plays;
  const themeCounts = PUZZLE_THEMES.map(
    (theme) =>
      `${theme} ${BUNDLED_PUZZLES.filter((p) => p.theme === theme).length}`,
  ).join(', ');
  console.log('');
  console.log(
    `Validated ${checked} puzzles (${plays} play, ${cubes} cube; ` +
      `${themeCounts}) against the WASM engine in ` +
      `${Math.round((Date.now() - started) / 1000)}s: ` +
      `${checked - failed} ok, ${failed} failed ` +
      `(${depthFlips} play puzzles flipped top play at 3-ply).`,
  );
  if (failed > 0) {
    process.exitCode = 1;
  }
}
