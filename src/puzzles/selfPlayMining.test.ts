/**
 * The shared self-play mining core (ticket 18): the pipeline behind both the
 * offline curated miner and the in-app "Find new puzzles" generator —
 * self-play games, cheap screening, full-strength confirmation, theme
 * tagging, margin windows and diversity caps. Driven here by a scripted
 * deterministic engine, so the whole pipeline is testable without the WASM.
 */

import { describe, expect, it } from 'vitest';
import { scriptedMiningEngine } from '../test/miningEngine';
import { puzzleContentKey } from './contentKey';
import {
  mineSelfPlayPuzzles,
  type SelfPlayMiningOptions,
  type SelfPlayMiningProgress,
} from './selfPlayMining';
import { PUZZLE_THEMES } from './types';

function baseOptions(): SelfPlayMiningOptions {
  return {
    engine: scriptedMiningEngine(),
    source: 'generated',
    seed: 42,
    target: { keepers: 3 },
    maxGames: 20,
  };
}

describe('mineSelfPlayPuzzles', () => {
  it('mines a deterministic batch of keepers from seeded self-play', async () => {
    const first = await mineSelfPlayPuzzles(baseOptions());
    const second = await mineSelfPlayPuzzles(baseOptions());

    expect(first.puzzles).toEqual(second.puzzles);
    expect(first.puzzles).toHaveLength(3);
    expect(first.stats.games).toBe(second.stats.games);
    for (const puzzle of first.puzzles) {
      expect(puzzle.source).toBe('generated');
      expect(puzzle.hero).toBe('white');
      expect(puzzle.id).toBe('pending');
      if (puzzle.kind === 'play') {
        // The clear-best margin window holds on the stored answer table.
        expect(puzzle.answers.length).toBeGreaterThanOrEqual(4);
        const margin = puzzle.answers[1].equityLoss;
        expect(margin).toBeGreaterThanOrEqual(0.05);
        expect(margin).toBeLessThanOrEqual(0.3);
      } else {
        const margin = puzzle.choices[1].equityLoss;
        expect(margin).toBeGreaterThanOrEqual(0.05);
        expect(margin).toBeLessThanOrEqual(0.45);
      }
    }
  });

  it('skips positions whose content key is already stored', async () => {
    const first = await mineSelfPlayPuzzles(baseOptions());
    const existing = first.puzzles.map(puzzleContentKey);

    const second = await mineSelfPlayPuzzles({
      ...baseOptions(),
      existingContentKeys: existing,
    });

    // The same seed revisits the same positions; none may come back.
    const fresh = second.puzzles.map(puzzleContentKey);
    for (const key of fresh) {
      expect(existing).not.toContain(key);
    }
    expect(new Set(fresh).size).toBe(fresh.length);
  });

  it('stops when shouldStop flips, keeping the keepers found so far', async () => {
    let keepers = 0;
    const result = await mineSelfPlayPuzzles({
      ...baseOptions(),
      target: { keepers: 10 },
      onPuzzle: () => {
        keepers++;
      },
      shouldStop: () => keepers >= 1,
    });
    expect(result.puzzles).toHaveLength(1);
  });

  it('reports games and keepers as the run progresses', async () => {
    const seen: SelfPlayMiningProgress[] = [];
    const result = await mineSelfPlayPuzzles({
      ...baseOptions(),
      onProgress: (progress) => seen.push(progress),
    });

    expect(seen[0]).toEqual({ games: 1, keepers: 0 });
    expect(seen.at(-1)).toEqual({
      games: result.stats.games,
      keepers: result.puzzles.length,
    });
    for (let i = 1; i < seen.length; i++) {
      expect(seen[i].games).toBeGreaterThanOrEqual(seen[i - 1].games);
      expect(seen[i].keepers).toBeGreaterThanOrEqual(seen[i - 1].keepers);
    }
  });

  it('caps cube puzzles per flavor within one batch', async () => {
    // The scripted engine always answers "Double, take", so every cube keeper
    // lands in the offer-double or response-take bucket: at most 2 of each.
    const result = await mineSelfPlayPuzzles({
      ...baseOptions(),
      target: { keepers: 12 },
      maxGames: 60,
    });
    const flavors = new Map<string, number>();
    for (const puzzle of result.puzzles) {
      if (puzzle.kind === 'cube') {
        const flavor = `${puzzle.decision}-${puzzle.choices[0].action}`;
        flavors.set(flavor, (flavors.get(flavor) ?? 0) + 1);
      }
    }
    for (const count of flavors.values()) {
      expect(count).toBeLessThanOrEqual(2);
    }
  });

  it('fills per-theme targets in the curated mode without overshooting', async () => {
    const result = await mineSelfPlayPuzzles({
      ...baseOptions(),
      source: 'curated',
      target: { perTheme: 1 },
      maxGames: 40,
    });
    const byTheme = new Map<string, number>();
    for (const puzzle of result.puzzles) {
      expect(puzzle.source).toBe('curated');
      byTheme.set(puzzle.theme, (byTheme.get(puzzle.theme) ?? 0) + 1);
    }
    for (const theme of PUZZLE_THEMES) {
      expect(byTheme.get(theme) ?? 0).toBeLessThanOrEqual(1);
    }
    // Self-play always reaches bear-offs and double-worthy positions.
    expect(byTheme.get('bear-off')).toBe(1);
    expect(byTheme.get('cube-handling')).toBe(1);
  });
});
