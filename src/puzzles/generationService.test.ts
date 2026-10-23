/**
 * The puzzle generation service (ticket 18): the app-wide "Find new puzzles"
 * runner. One batch at a time over the shared self-play mining core, keepers
 * persisted as they land (so cancelling keeps what was found), deduped by
 * content key against curated, blunder and previously generated puzzles,
 * observable progress for the Puzzles page, and failures that never throw.
 */

import { describe, expect, it } from 'vitest';
import { createMemoryGeneratedPuzzleStorage } from '../storage/generatedPuzzles';
import { scriptedMiningEngine } from '../test/miningEngine';
import { puzzleContentKey } from './contentKey';
import {
  createPuzzleGenerationService,
  type PuzzleGenerationServiceOptions,
} from './generationService';
import { mineSelfPlayPuzzles } from './selfPlayMining';
import type { Puzzle } from './types';

function baseOptions(
  overrides: Partial<PuzzleGenerationServiceOptions> = {},
): PuzzleGenerationServiceOptions {
  return {
    engine: scriptedMiningEngine(),
    storage: createMemoryGeneratedPuzzleStorage(),
    curated: [],
    blunders: { list: async () => [] },
    seed: () => 42,
    batch: { keepers: 3, maxGames: 20 },
    ...overrides,
  };
}

/** What the core finds for seed 42 with no dedupe, for cross-checking. */
async function referenceBatch(): Promise<readonly Puzzle[]> {
  const result = await mineSelfPlayPuzzles({
    engine: scriptedMiningEngine(),
    source: 'generated',
    seed: 42,
    target: { keepers: 3 },
    maxGames: 20,
  });
  return result.puzzles;
}

describe('createPuzzleGenerationService', () => {
  it('runs one batch, persists uniquely-named keepers, and reports completion', async () => {
    const options = baseOptions();
    const service = createPuzzleGenerationService(options);

    expect(service.status().running).toBe(false);
    service.start();
    expect(service.status().running).toBe(true);
    await service.settled();

    const stored = await options.storage.list();
    expect(stored).toHaveLength(3);
    expect(new Set(stored.map((p) => p.id)).size).toBe(3);
    for (const puzzle of stored) {
      expect(puzzle.id).toMatch(/^generated-42-\d+$/);
      expect(puzzle.source).toBe('generated');
    }
    const status = service.status();
    expect(status.running).toBe(false);
    expect(status.keepersFound).toBe(3);
    expect(status.gamesPlayed).toBeGreaterThanOrEqual(1);
    expect(status.lastOutcome).toMatchObject({ reason: 'target', keepers: 3 });
  });

  it('notifies observers as games and keepers progress', async () => {
    const service = createPuzzleGenerationService(baseOptions());
    const seen: Array<{ games: number; keepers: number }> = [];
    service.onChange(() => {
      const status = service.status();
      seen.push({ games: status.gamesPlayed, keepers: status.keepersFound });
    });

    service.start();
    await service.settled();

    expect(seen.length).toBeGreaterThan(0);
    expect(seen.at(-1)).toEqual({ games: seen.at(-1)?.games, keepers: 3 });
    for (let i = 1; i < seen.length; i++) {
      expect(seen[i].games).toBeGreaterThanOrEqual(seen[i - 1].games);
    }
  });

  it('dedupes against curated, blunder and already-generated puzzles', async () => {
    const reference = await referenceBatch();
    const [first, second, third] = reference;
    const storage = createMemoryGeneratedPuzzleStorage();
    const preStored = { ...third, id: 'generated-old-1' } as Puzzle;
    await storage.putAll([preStored]);

    const service = createPuzzleGenerationService(
      baseOptions({
        storage,
        curated: [{ ...first, id: 'curated-001', source: 'curated' } as Puzzle],
        blunders: {
          list: async () => [
            {
              ...second,
              id: 'blunder:m:0:0',
              source: 'blunder',
              origin: { matchId: 'm', game: 0, decision: 0 },
            } as Puzzle,
          ],
        },
      }),
    );
    service.start();
    await service.settled();

    const stored = await storage.list();
    // The pre-stored puzzle survives; nothing re-finds the known content.
    expect(stored.map((p) => p.id)).toContain('generated-old-1');
    const taken = new Set(reference.map(puzzleContentKey));
    for (const puzzle of stored) {
      if (puzzle.id === 'generated-old-1') {
        continue;
      }
      expect(taken.has(puzzleContentKey(puzzle))).toBe(false);
    }
  });

  it('cancel stops the batch and keeps the keepers found so far', async () => {
    const options = baseOptions({ batch: { keepers: 10, maxGames: 40 } });
    const service = createPuzzleGenerationService(options);
    service.onChange(() => {
      if (service.status().keepersFound >= 1) {
        service.cancel();
      }
    });

    service.start();
    await service.settled();

    const stored = await options.storage.list();
    expect(stored.length).toBeGreaterThanOrEqual(1);
    expect(stored.length).toBeLessThan(10);
    const status = service.status();
    expect(status.running).toBe(false);
    expect(status.lastOutcome?.reason).toBe('cancelled');
  });

  it('ignores start while a batch is already running', async () => {
    const options = baseOptions();
    const service = createPuzzleGenerationService(options);

    service.start();
    service.start();
    await service.settled();

    expect(await options.storage.list()).toHaveLength(3);
  });

  it('a second batch adds fresh content under fresh ids', async () => {
    const seeds = [42, 43];
    let batch = 0;
    const options = baseOptions({ seed: () => seeds[batch++] });
    const service = createPuzzleGenerationService(options);

    service.start();
    await service.settled();
    service.start();
    await service.settled();

    const stored = await options.storage.list();
    expect(stored).toHaveLength(6);
    expect(new Set(stored.map((p) => p.id)).size).toBe(6);
    expect(new Set(stored.map(puzzleContentKey)).size).toBe(6);
  });

  it('reports a failed batch as an error outcome instead of throwing', async () => {
    const storage = createMemoryGeneratedPuzzleStorage();
    const failing = {
      ...storage,
      putAll: async () => {
        throw new Error('quota exceeded');
      },
    };
    const service = createPuzzleGenerationService(
      baseOptions({ storage: failing }),
    );

    service.start();
    await service.settled();

    expect(service.status().running).toBe(false);
    expect(service.status().lastOutcome?.reason).toBe('error');
  });
});
