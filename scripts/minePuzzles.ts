/**
 * Curated-puzzle mining (ticket 11): a thin node driver over the shared
 * self-play mining core (src/puzzles/selfPlayMining.ts — the same pipeline
 * the in-app generator drives). The real gnubg WASM engine self-plays money
 * games at clean 0-ply, every decision point is screened cheaply, and
 * promising positions are confirmed at full strength (2-ply). A position
 * becomes a puzzle when it has a clear best answer (second-best loses at
 * least MARGIN_MIN) yet plausible-looking alternatives (second-best within
 * MARGIN_MAX, several distinct candidates). Themes are tagged by the
 * heuristics in src/puzzles/mining.ts. Positions come only from self-play —
 * nothing is copied from books or other published sources.
 *
 * Output: src/puzzles/curatedSet.ts (regenerated in place).
 * Run with: npm run mine:puzzles
 */

import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { loadGnubgSession } from '../src/engine/node/loadGnubg';
import {
  mineSelfPlayPuzzles,
  type SelfPlayMiningEngine,
} from '../src/puzzles/selfPlayMining';
import type { Puzzle, PuzzleTheme } from '../src/puzzles/types';
import { PUZZLE_THEMES } from '../src/puzzles/types';

/** How many puzzles each theme should ship with. */
const TARGET_PER_THEME = 30;
/** Acceptance floor: warn when any theme ships with fewer (ticket 17). */
const MIN_PER_THEME = 25;
/** 0-ply screen window for the second-best play's loss. */
const SCREEN_MIN = 0.02;
const SCREEN_MAX = 0.6;
/** Full-strength requirements: a clear best with tempting alternatives. */
const MARGIN_MIN = 0.05;
const MARGIN_MAX = 0.3;
const MIN_CANDIDATES = 4;
/** Diversity: per game, at most this many puzzles of one theme. */
const PER_GAME_THEME_CAP = 1;
/**
 * Diversity: at most this many cube puzzles of one flavor (verdict class).
 * Scaled with TARGET_PER_THEME (ticket 17 kept the 1/3-of-target ratio the
 * 6-puzzle set used; five flavors at the old cap of 2 would hard-limit the
 * cube theme to 10).
 */
const CUBE_BUCKET_CAP = 10;
/** Cube decisions: both sides' errors must be real but not absurd. */
const CUBE_MARGIN_MIN = 0.05;
const CUBE_MARGIN_MAX = 0.45;
/** Self-play budget (the loop stops early once every theme is full). */
const MAX_GAMES = 2000;
const MAX_TURNS_PER_GAME = 180;
const SEED = 20261022;

function log(message: string): void {
  console.log(message);
}

function render(puzzles: readonly Puzzle[]): string {
  return `/**
 * The bundled curated puzzle set (GLOSSARY "Curated puzzle").
 *
 * GENERATED FILE — do not edit by hand. Regenerate with:
 *   npm run mine:puzzles
 * (scripts/minePuzzles.ts: engine self-play sweeps positions, keeps the
 * instructive ones, and grades every answer at full strength. Themes are
 * tagged by position heuristics. No positions are copied from books or
 * other published sources.)
 *
 * curatedPuzzles.validation.test.ts re-evaluates every stored answer
 * against the real WASM engine, so stale or wrong answer data cannot ship.
 */

// biome-ignore-all lint/suspicious/noApproximativeNumericConstant: engine equities are data, not math constants
import type { Puzzle } from './types';

export const CURATED_PUZZLES: readonly Puzzle[] = ${JSON.stringify(
    puzzles,
    null,
    2,
  )};
`;
}

export async function minePuzzles(): Promise<void> {
  log('Loading gnubg WASM…');
  const session = await loadGnubgSession();
  /** The shared core is async; gnubg in node answers synchronously. */
  const engine: SelfPlayMiningEngine = {
    screenPlays: async (position, roll) =>
      session.rankPlays(position, roll, { difficulty: 'expert' }),
    rankPlays: async (position, roll) => session.rankPlays(position, roll),
    cubeInfo: async (position) => session.cubeInfo(position),
  };
  const started = Date.now();
  let loggedGames = 0;
  const byTheme = new Map<PuzzleTheme, Puzzle[]>(
    PUZZLE_THEMES.map((theme) => [theme, []]),
  );

  const result = await mineSelfPlayPuzzles({
    engine,
    source: 'curated',
    seed: SEED,
    target: { perTheme: TARGET_PER_THEME },
    maxGames: MAX_GAMES,
    maxTurnsPerGame: MAX_TURNS_PER_GAME,
    quality: {
      screenMin: SCREEN_MIN,
      screenMax: SCREEN_MAX,
      marginMin: MARGIN_MIN,
      marginMax: MARGIN_MAX,
      minCandidates: MIN_CANDIDATES,
      cubeMarginMin: CUBE_MARGIN_MIN,
      cubeMarginMax: CUBE_MARGIN_MAX,
    },
    diversity: {
      perGameThemeCap: PER_GAME_THEME_CAP,
      cubeBucketCap: CUBE_BUCKET_CAP,
    },
    onPuzzle(puzzle) {
      byTheme.get(puzzle.theme)?.push(puzzle);
      if (puzzle.kind === 'play') {
        const margin = puzzle.answers[1]?.equityLoss ?? 0;
        log(
          `  + ${puzzle.theme} play puzzle (margin ${margin.toFixed(3)}, ` +
            `${puzzle.answers.length} candidates)`,
        );
      } else {
        const margin = puzzle.choices[1]?.equityLoss ?? 0;
        log(
          `  + cube ${puzzle.decision} puzzle (${puzzle.verdict}, ` +
            `margin ${margin.toFixed(3)})`,
        );
      }
    },
    onProgress(progress) {
      if (progress.games % 20 === 0 && progress.games !== loggedGames) {
        loggedGames = progress.games;
        const counts = PUZZLE_THEMES.map(
          (theme) => `${theme} ${byTheme.get(theme)?.length ?? 0}`,
        ).join(', ');
        log(
          `game ${progress.games}: ${counts} ` +
            `(${Math.round((Date.now() - started) / 1000)}s)`,
        );
      }
    },
  });

  // Stable ids ordered by theme, then by discovery.
  const puzzles: Puzzle[] = [];
  let serial = 0;
  for (const theme of PUZZLE_THEMES) {
    for (const puzzle of byTheme.get(theme) ?? []) {
      serial++;
      puzzles.push({
        ...puzzle,
        id: `curated-${String(serial).padStart(3, '0')}`,
      } as Puzzle);
    }
  }

  const target = fileURLToPath(
    new URL('../src/puzzles/curatedSet.ts', import.meta.url),
  );
  writeFileSync(target, render(puzzles));

  log('');
  log(`Mined ${puzzles.length} puzzles in ${result.stats.games} games:`);
  for (const theme of PUZZLE_THEMES) {
    log(`  ${theme}: ${byTheme.get(theme)?.length ?? 0}`);
  }
  log(
    `play candidates screened ${result.stats.playScreened}, confirmed ` +
      `${result.stats.playConfirmed}; cube positions evaluated ` +
      `${result.stats.cubeEvaluated}, accepted ${result.stats.cubeAccepted}.`,
  );
  log(`Wrote ${target}`);
  for (const theme of PUZZLE_THEMES) {
    const count = mined.byTheme.get(theme)?.length ?? 0;
    if (count < MIN_PER_THEME) {
      log(
        `WARNING: ${theme} has ${count} < ${MIN_PER_THEME} puzzles — ` +
          'raise MAX_GAMES or loosen diversity caps.',
      );
    }
  }
}
