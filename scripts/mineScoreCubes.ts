/**
 * Score-dependent cube mining (ticket 38): a thin node driver over the shared
 * score-cube miner (src/puzzles/scoreCubeMining.ts). The real gnubg WASM
 * engine re-evaluates the app's own curated cube positions (plus one guaranteed
 * gammon-threat seed) at representative match scores — 2-away/2-away, a
 * gammon-go leader, the trailer's mirror, and near-the-end scores — keeping
 * only positions where the right cube action genuinely shifts with the score.
 * Every stored answer is the engine's cubeful equity AT THAT SCORE, so grading
 * and the reveal reflect the score, not money equities.
 *
 * Output: src/puzzles/scoreCubeSet.ts (regenerated in place).
 * Run with: npm run mine:score-cubes
 *
 * curatedPuzzles.validation.test.ts (and npm run validate:puzzles) re-evaluate
 * every stored answer against the real WASM engine, so stale data cannot ship.
 */

import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { loadGnubgSession } from '../src/engine/node/loadGnubg';
import { CURATED_PUZZLES } from '../src/puzzles/curatedSet';
import { scoreContextLabel } from '../src/puzzles/mining';
import {
  mineScoreCubePuzzles,
  type ScoreContext,
  type ScoreCubeCandidate,
  type ScoreCubeEngine,
} from '../src/puzzles/scoreCubeMining';
import type {
  CubePuzzle,
  Puzzle,
  PuzzleMatchContext,
} from '../src/puzzles/types';
import { createBoard } from '../src/rules';

/**
 * Representative match scores every candidate is probed at (7-point match,
 * hero = White). Each is a score where the take point is known to move:
 * 2-away/2-away (a very wide doubling window), the gammon-go leader and its
 * trailer mirror, and the near-the-end scores where a dead-ish cube and
 * match-winning gammons reshape the decision.
 */
const SCORE_CONTEXTS: readonly ScoreContext[] = [
  { matchLength: 7, score: { white: 5, black: 5 } }, // 2-away/2-away
  { matchLength: 7, score: { white: 5, black: 3 } }, // 2-away/4-away (gammon-go)
  { matchLength: 7, score: { white: 3, black: 5 } }, // 4-away/2-away
  { matchLength: 7, score: { white: 4, black: 6 } }, // 3-away/1-away
  { matchLength: 7, score: { white: 6, black: 4 } }, // 1-away/3-away
];

/**
 * A guaranteed gammon-threat seed (the golden position from
 * positions.golden.test.ts): a clear money pass that becomes a take — and a
 * no-double — once a gammon wins the match. White on roll, so an 'offer'.
 */
const GAMMON_THREAT = createBoard({
  white: { points: { 8: 3, 6: 2, 5: 2, 4: 2, 3: 2, 13: 4 } },
  black: { points: { 1: 2, 24: 2, 23: 2, 22: 2, 21: 3, 19: 2, 20: 2 } },
});

function log(message: string): void {
  console.log(message);
}

/** The curated cube positions (board + flavor), posed for White. */
function curatedCubeCandidates(): ScoreCubeCandidate[] {
  return CURATED_PUZZLES.filter((p): p is CubePuzzle => p.kind === 'cube').map(
    (p) => ({ board: p.board, decision: p.decision }),
  );
}

function render(puzzles: readonly Puzzle[]): string {
  return `/**
 * Score-dependent cube puzzles (GLOSSARY "Cube decision"; ticket 38).
 *
 * GENERATED FILE — do not edit by hand. Regenerate with:
 *   npm run mine:score-cubes
 * (scripts/mineScoreCubes.ts: the gnubg WASM engine re-evaluates curated cube
 * positions at representative match scores and keeps the ones whose right
 * answer shifts with the score. Every answer is the engine's cubeful equity
 * AT THAT SCORE. No positions are copied from books or other published
 * sources.)
 *
 * curatedPuzzles.validation.test.ts re-evaluates every stored answer against
 * the real WASM engine (with the puzzle's own match score), so stale or wrong
 * answer data cannot ship.
 */

// biome-ignore-all lint/suspicious/noApproximativeNumericConstant: engine equities are data, not math constants
import type { Puzzle } from './types';

export const SCORE_CUBE_PUZZLES: readonly Puzzle[] = ${JSON.stringify(
    puzzles,
    null,
    2,
  )};
`;
}

function labelOf(match: PuzzleMatchContext): string {
  return scoreContextLabel(match);
}

export async function mineScoreCubes(): Promise<void> {
  log('Loading gnubg WASM…');
  const session = await loadGnubgSession();
  const engine: ScoreCubeEngine = {
    cubeInfo: async (position) => session.cubeInfo(position),
  };

  const candidates: ScoreCubeCandidate[] = [
    { board: GAMMON_THREAT, decision: 'offer' },
    ...curatedCubeCandidates(),
  ];

  const started = Date.now();
  log(
    `Probing ${candidates.length} candidate positions at ` +
      `${SCORE_CONTEXTS.length} scores…`,
  );

  const mined = await mineScoreCubePuzzles({
    engine,
    candidates,
    contexts: SCORE_CONTEXTS,
    source: 'curated',
  });

  // Stable ids ordered by discovery.
  const puzzles: Puzzle[] = mined.map((puzzle, index) => ({
    ...puzzle,
    id: `score-cube-${String(index + 1).padStart(3, '0')}`,
  }));

  const target = fileURLToPath(
    new URL('../src/puzzles/scoreCubeSet.ts', import.meta.url),
  );
  writeFileSync(target, render(puzzles));

  log('');
  log(
    `Mined ${puzzles.length} score-dependent cube puzzles in ` +
      `${Math.round((Date.now() - started) / 1000)}s:`,
  );
  for (const puzzle of puzzles as CubePuzzle[]) {
    log(
      `  ${puzzle.id} ${labelOf(puzzle.match)} ${puzzle.decision}: ${puzzle.verdict}`,
    );
  }
  log(`Wrote ${target}`);
  if (puzzles.length === 0) {
    log('WARNING: no score-dependent cube puzzles were found.');
  }
}
