/**
 * The blunder mining service (ticket 12's trigger): a pure observer in the
 * style of autoAnalysis — it watches match puts on the shared storage (the
 * moment auto-analysis, the Analyze page or deepening persists an analysis)
 * and mines new blunder puzzles without user action; `catchUp()` additionally
 * sweeps the whole stored history for analyzed matches never mined (so
 * pre-existing games gain puzzles, e.g. when the Puzzles page loads).
 *
 * Idempotence: a per-match mined stamp (the analysis' analyzedAt) is written
 * only after a fully successful mining run; re-analysis or deepening bumps
 * the stamp and re-mines, with origin/content dedupe preventing duplicates.
 * Every failure is swallowed — an unmined match is simply retried on the next
 * catch-up. All work runs on one promise chain, so concurrent triggers never
 * interleave.
 */

import { isMatchAnalysis } from '../analysis';
import type { BlunderPuzzleStorage } from '../storage/blunderPuzzles';
import type { MatchPutEvents } from '../storage/observe';
import type { MatchStorage, StoredMatch } from '../storage/types';
import { type BlunderMiningDeps, mineBlunderPuzzles } from './blunderMining';

export interface BlunderMiningServiceOptions {
  readonly matches: MatchStorage;
  readonly puzzles: BlunderPuzzleStorage;
  /** Gate-bound, background-priority full-strength ranking. */
  readonly rankPlays: BlunderMiningDeps['rankPlays'];
  /** Put events to observe; omit to rely on catch-up alone (tests). */
  readonly events?: MatchPutEvents;
}

export interface BlunderMiningService {
  /** Mine every analyzed, finished match not yet covered; never rejects. */
  catchUp(): Promise<void>;
  /** Resolves when all currently queued mining work has finished. */
  settled(): Promise<void>;
  dispose(): void;
}

export function createBlunderMiningService(
  options: BlunderMiningServiceOptions,
): BlunderMiningService {
  const { matches, puzzles, rankPlays } = options;
  let disposed = false;
  /** All queued work, chained so runs never interleave. */
  let chain: Promise<void> = Promise.resolve();

  function enqueue(work: () => Promise<void>): Promise<void> {
    chain = chain.then(work).catch(() => {
      // Mining must never break anything above it; catch-up retries later.
    });
    return chain;
  }

  /** Mine one match if it carries an analysis newer than its mined stamp. */
  async function mineOne(match: StoredMatch): Promise<void> {
    if (disposed || match.status !== 'finished') {
      return;
    }
    const analysis = match.analysis;
    if (!isMatchAnalysis(analysis)) {
      return;
    }
    if ((await puzzles.loadMined())[match.id] === analysis.analyzedAt) {
      return;
    }
    const existing = await puzzles.list();
    const fresh = await mineBlunderPuzzles(match, { existing, rankPlays });
    if (disposed) {
      return;
    }
    await puzzles.putAll(fresh);
    // Marked only after a fully successful run: a failure above leaves the
    // match unmined, so the next catch-up retries it.
    await puzzles.markMined(match.id, analysis.analyzedAt);
  }

  const unsubscribe = options.events?.onMatchPut((match) => {
    void enqueue(() => mineOne(match));
  });

  return {
    catchUp() {
      return enqueue(async () => {
        for (const match of await matches.list()) {
          try {
            await mineOne(match);
          } catch {
            // One broken match must not stop the sweep.
          }
        }
      });
    },
    settled: () => chain,
    dispose() {
      disposed = true;
      unsubscribe?.();
    },
  };
}
