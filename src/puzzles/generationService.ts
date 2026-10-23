/**
 * The puzzle generation service (ticket 18): runs the shared self-play
 * mining core (./selfPlayMining) as the in-app "Find new puzzles" action.
 * One batch at a time, bounded by a keeper target or a game cap, cancellable
 * between engine calls; keepers persist the moment they land, so cancelling
 * (or a crash) keeps everything already found. The service is a module-level
 * singleton in the app (./generationInstance), so a batch keeps running when
 * the Puzzles page unmounts — the page merely observes status changes.
 */

import type { GeneratedPuzzleStorage } from '../storage/generatedPuzzles';
import { puzzleContentKey } from './contentKey';
import {
  mineSelfPlayPuzzles,
  type SelfPlayMiningEngine,
} from './selfPlayMining';
import type { Puzzle } from './types';

/** One batch stops at this many keepers… */
export const BATCH_KEEPERS = 10;
/** …or after this many self-play games, whichever comes first. */
export const BATCH_GAME_CAP = 40;

export interface GenerationRunOutcome {
  /**
   * Why the batch ended: the keeper target was reached, the game cap ran
   * out, the player cancelled, or something failed (storage, engine).
   */
  readonly reason: 'target' | 'games' | 'cancelled' | 'error';
  readonly keepers: number;
  readonly games: number;
}

export interface GenerationStatus {
  readonly running: boolean;
  /** True after cancel() until the batch actually stops. */
  readonly cancelling: boolean;
  /** Games started in the current (or last) batch. */
  readonly gamesPlayed: number;
  /** Keepers found in the current (or last) batch. */
  readonly keepersFound: number;
  /** How the last finished batch ended; null before any batch ran. */
  readonly lastOutcome: GenerationRunOutcome | null;
}

export interface PuzzleGenerationServiceOptions {
  /** Gate-bound background-priority engine adapter (the analyzer's). */
  readonly engine: SelfPlayMiningEngine;
  readonly storage: GeneratedPuzzleStorage;
  /** Curated puzzles deduped against (the bundled set in the app). */
  readonly curated: readonly Puzzle[];
  /** Blunder puzzles deduped against (the shared mined store in the app). */
  readonly blunders: { list(): Promise<Puzzle[]> };
  /** Per-batch dice seed — also names the batch's puzzle ids. */
  readonly seed?: () => number;
  readonly batch?: {
    readonly keepers?: number;
    readonly maxGames?: number;
  };
}

export interface PuzzleGenerationService {
  /** Begin one batch; ignored while a batch is already running. */
  start(): void;
  /** Ask the running batch to stop; keepers found so far are kept. */
  cancel(): void;
  status(): GenerationStatus;
  /** Observe status changes; returns an unsubscribe function. */
  onChange(listener: () => void): () => void;
  /** Resolves when the current batch (if any) has finished; never rejects. */
  settled(): Promise<void>;
}

export function createPuzzleGenerationService(
  options: PuzzleGenerationServiceOptions,
): PuzzleGenerationService {
  const keepersTarget = options.batch?.keepers ?? BATCH_KEEPERS;
  const maxGames = options.batch?.maxGames ?? BATCH_GAME_CAP;
  const listeners = new Set<() => void>();

  let running = false;
  let cancelRequested = false;
  let gamesPlayed = 0;
  let keepersFound = 0;
  let lastOutcome: GenerationRunOutcome | null = null;
  let current: Promise<void> = Promise.resolve();

  function notify(): void {
    for (const listener of listeners) {
      try {
        listener();
      } catch {
        // Observers must never break the batch.
      }
    }
  }

  async function existingContentKeys(): Promise<Set<string>> {
    const keys = new Set<string>();
    for (const puzzle of options.curated) {
      keys.add(puzzleContentKey(puzzle));
    }
    for (const puzzle of await options.blunders.list()) {
      keys.add(puzzleContentKey(puzzle));
    }
    for (const puzzle of await options.storage.list()) {
      keys.add(puzzleContentKey(puzzle));
    }
    return keys;
  }

  async function runBatch(): Promise<void> {
    const seed = options.seed?.() ?? Date.now();
    let reason: GenerationRunOutcome['reason'] = 'games';
    try {
      const existing = await existingContentKeys();
      let serial = 0;
      let persistError: unknown = null;
      let persist: Promise<void> = Promise.resolve();

      const result = await mineSelfPlayPuzzles({
        engine: options.engine,
        source: 'generated',
        seed,
        target: { keepers: keepersTarget },
        maxGames,
        existingContentKeys: existing,
        shouldStop: () => cancelRequested,
        onProgress(progress) {
          gamesPlayed = progress.games;
          keepersFound = progress.keepers;
          notify();
        },
        onPuzzle(puzzle) {
          serial++;
          const named = { ...puzzle, id: `generated-${seed}-${serial}` };
          // Persist as found, chained so puts never interleave; a failure is
          // kept and surfaced once the batch settles.
          persist = persist
            .then(() => options.storage.putAll([named as Puzzle]))
            .catch((error) => {
              persistError ??= error;
            });
        },
      });

      await persist;
      if (persistError !== null) {
        throw persistError;
      }
      reason = cancelRequested
        ? 'cancelled'
        : result.puzzles.length >= keepersTarget
          ? 'target'
          : 'games';
    } catch {
      reason = 'error';
    } finally {
      lastOutcome = { reason, keepers: keepersFound, games: gamesPlayed };
      running = false;
      cancelRequested = false;
      notify();
    }
  }

  return {
    start() {
      if (running) {
        return;
      }
      running = true;
      cancelRequested = false;
      gamesPlayed = 0;
      keepersFound = 0;
      notify();
      current = runBatch();
    },

    cancel() {
      if (!running) {
        return;
      }
      cancelRequested = true;
      notify();
    },

    status() {
      return {
        running,
        cancelling: running && cancelRequested,
        gamesPlayed,
        keepersFound,
        lastOutcome,
      };
    },

    onChange(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },

    settled: () => current,
  };
}
