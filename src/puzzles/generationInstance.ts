/**
 * The app-wide shared puzzle generation service (ticket 18): one runner over
 * the shared analyzer, so every self-play mining call passes the analyzer's
 * priority gate at background priority — play, tutor and analysis always jump
 * ahead. Module-level, so a running batch survives page navigation; the
 * Puzzles page only observes it. The analyzer (and so the engine) is resolved
 * lazily — the engine spins up only when a batch actually starts.
 */

import { getMatchAnalyzer } from '../analysis';
import { getBlunderPuzzleStorage } from '../storage/blunderPuzzles';
import { getGeneratedPuzzleStorage } from '../storage/generatedPuzzles';
import { CURATED_PUZZLES } from './curatedSet';
import {
  createPuzzleGenerationService,
  type PuzzleGenerationService,
} from './generationService';

let shared: PuzzleGenerationService | null = null;

export function getPuzzleGenerationService(): PuzzleGenerationService {
  if (!shared) {
    shared = createPuzzleGenerationService({
      engine: {
        // Self-play screening runs weakened (clean 0-ply), like the offline
        // miner; confirmation and cube analysis at full strength. All three
        // pass the gate at background priority.
        screenPlays: (position, roll) =>
          getMatchAnalyzer().rankPlays(position, roll, 'background', {
            difficulty: 'expert',
          }),
        rankPlays: (position, roll) =>
          getMatchAnalyzer().rankPlays(position, roll, 'background'),
        cubeInfo: (position) =>
          getMatchAnalyzer().cubeInfo(position, 'background'),
      },
      storage: getGeneratedPuzzleStorage(),
      curated: CURATED_PUZZLES,
      blunders: getBlunderPuzzleStorage(),
    });
  }
  return shared;
}
