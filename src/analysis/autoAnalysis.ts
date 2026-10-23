/**
 * Background auto-analysis (spec story 20): a pure observer over the Play
 * store — subscribe/getState only, exactly like src/storage/persist.ts — that
 * analyzes each game the moment it finishes and, at match end, analyzes the
 * whole match and persists the result onto the finished StoredMatch row.
 *
 * The finished row is written by the persister (a sibling observer), so this
 * module finds it by its deterministic record content, retrying briefly while
 * the persister's debounce settles. Analysis never blocks play and never
 * throws into it: every failure is swallowed, and interrupted work simply
 * restarts when the match is next opened in Analyze.
 */

import type { MatchRecord, MatchState } from '../rules';
import type { MatchStorage, MatchStoreLike, StoredMatch } from '../storage';
import type { MatchAnalyzer } from './analyzer';
import type { MatchAnalysis } from './types';
import { isMatchAnalysis } from './types';
import { matchStandings } from './walk';

export interface AutoAnalysisOptions {
  readonly store: MatchStoreLike;
  readonly storage: MatchStorage;
  readonly analyzer: MatchAnalyzer;
  /** Awaitable pause between row-lookup retries; injectable for tests. */
  readonly sleep?: (ms: number) => Promise<void>;
}

export interface AutoAnalysis {
  /** Resolves when all currently queued analysis work has finished. */
  settled(): Promise<void>;
  dispose(): void;
}

/** Pauses before each retry of the finished-row lookup. */
const RETRY_DELAYS_MS = [300, 700, 1500, 3000];

const defaultSleep = (ms: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, ms));

/** Write the analysis onto the stored row holding exactly this record. */
async function persistOntoRow(
  storage: MatchStorage,
  record: MatchRecord,
  analysis: MatchAnalysis,
  sleep: (ms: number) => Promise<void>,
): Promise<void> {
  const fingerprint = JSON.stringify(record);
  for (let attempt = 0; attempt <= RETRY_DELAYS_MS.length; attempt++) {
    const rows = await storage.list();
    const row = rows.find(
      (candidate: StoredMatch) =>
        candidate.status === 'finished' &&
        JSON.stringify(candidate.record) === fingerprint,
    );
    if (row) {
      if (!isMatchAnalysis(row.analysis)) {
        await storage.put({ ...row, analysis });
      }
      return;
    }
    if (attempt < RETRY_DELAYS_MS.length) {
      await sleep(RETRY_DELAYS_MS[attempt]);
    }
  }
}

export function createAutoAnalysis(options: AutoAnalysisOptions): AutoAnalysis {
  const { store, storage, analyzer } = options;
  const sleep = options.sleep ?? defaultSleep;

  let disposed = false;
  /** Games of the current match already handed to the analyzer. */
  let enqueuedGames = 0;
  /** The match-over state already being persisted (never twice). */
  let persisted: MatchState | null = null;
  /** All queued work, chained so settled() can await it. */
  let chain: Promise<void> = Promise.resolve();

  function enqueue(work: () => Promise<void>): void {
    chain = chain.then(work).catch(() => {
      // Analysis must never break play; Analyze re-runs it on demand.
    });
  }

  function check(): void {
    if (disposed) {
      return;
    }
    const match = store.getState().match;
    if (!match) {
      enqueuedGames = 0;
      return;
    }
    if (match.games.length < enqueuedGames) {
      // A fresh match replaced the old one.
      enqueuedGames = 0;
    }
    if (match.games.length > enqueuedGames) {
      const record: MatchRecord = {
        length: match.length,
        games: match.games,
      };
      const standings = matchStandings(record);
      for (let i = enqueuedGames; i < match.games.length; i++) {
        const game = record.games[i];
        const standing = standings[i];
        enqueue(async () => {
          await analyzer.analyzeGame(game, standing, 'background');
        });
      }
      enqueuedGames = match.games.length;
    }
    if (match.phase === 'match-over' && persisted !== match) {
      persisted = match;
      const record: MatchRecord = {
        length: match.length,
        games: match.games,
      };
      enqueue(async () => {
        const analysis = await analyzer.analyzeMatch(record, {
          priority: 'background',
        });
        if (!disposed) {
          await persistOntoRow(storage, record, analysis, sleep);
        }
      });
    }
  }

  const unsubscribe = store.subscribe(check);
  check();

  return {
    settled: () => chain,
    dispose() {
      disposed = true;
      unsubscribe();
    },
  };
}
