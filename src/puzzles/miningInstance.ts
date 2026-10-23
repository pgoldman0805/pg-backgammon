/**
 * The app-wide shared blunder mining service: one observer over the shared
 * match storage and blunder-puzzle storage, completing play answer tables
 * through the shared analyzer's priority gate at background priority. The
 * analyzer (and so the engine) is resolved lazily — it spins up only when a
 * table actually needs the engine.
 */

import { getMatchAnalyzer } from '../analysis';
import { getBlunderPuzzleStorage } from '../storage/blunderPuzzles';
import { getObservableMatchStorage } from '../storage/instance';
import {
  type BlunderMiningService,
  createBlunderMiningService,
} from './blunderMiningService';

let shared: BlunderMiningService | null = null;

export function getBlunderMiningService(): BlunderMiningService {
  if (!shared) {
    const matches = getObservableMatchStorage();
    shared = createBlunderMiningService({
      matches,
      events: matches,
      puzzles: getBlunderPuzzleStorage(),
      rankPlays: (position, roll) =>
        getMatchAnalyzer().rankPlays(position, roll, 'background'),
    });
  }
  return shared;
}
