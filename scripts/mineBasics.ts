/**
 * Basics-theme puzzle authoring (ticket 33). Unlike the five advanced themes
 * (scripts/minePuzzles.ts, mined from engine self-play), the "Basics" theme
 * teaches fundamentals — hitting, entering from the bar, making a point,
 * escaping a back checker, bearing off safely — so its positions are
 * hand-authored to be mechanically simple, with an obviously-correct best
 * play. Each authored position is still graded at full strength by the real
 * gnubg WASM engine, and only kept when the engine confirms a clear best
 * (second-best loses at least MARGIN_MIN). No positions are copied from books
 * or other published sources; they are small constructed teaching shapes.
 *
 * Output: src/puzzles/basicsSet.ts (regenerated in place).
 * Run with: npm run mine:basics
 */

import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { loadGnubgSession } from '../src/engine/node/loadGnubg';
import type { RankedPlay } from '../src/engine/types';
import { boardKey } from '../src/puzzles/grade';
import type {
  PlayAnswer,
  PlayPuzzle,
  PuzzleMatchContext,
} from '../src/puzzles/types';
import type { BoardSpec, BoardState, DiceRoll } from '../src/rules';
import { applyMovement, createBoard } from '../src/rules';

/** A clear best must beat the second-best by at least this much equity. */
const MARGIN_MIN = 0.05;

/** Every basics position is a money-play question, like the curated set. */
const MONEY: PuzzleMatchContext = {
  matchLength: 0,
  score: { white: 0, black: 0 },
  cube: { value: 1, owner: 'center' },
};

interface Seed {
  /** A short note on the fundamental the position teaches. */
  readonly lesson: string;
  readonly white: BoardSpec['white'];
  readonly black: BoardSpec['black'];
  readonly roll: DiceRoll;
}

/**
 * The standard opening position, White to play — the home of several of the
 * most fundamental "how do I play this roll?" lessons.
 */
const OPENING: BoardSpec = {
  white: { points: { 24: 2, 13: 5, 8: 3, 6: 5 } },
  black: { points: { 1: 2, 12: 5, 17: 3, 19: 5 } },
};

/**
 * Hand-authored teaching positions, White to play. White moves high→low
 * (home 1-6, bears off from 1-6, enters from the bar on 19-24); Black moves
 * low→high (home 19-24, enters on 1-6). Each is constructed so the mechanic
 * named in `lesson` is the clearly-correct play; the engine is the judge.
 */
const SEEDS: Seed[] = [
  // --- Making a point from the opening (one clearly-best way) ----------
  {
    lesson: 'Opening 3-1: make your five point, the best point to own.',
    white: OPENING.white,
    black: OPENING.black,
    roll: [3, 1],
  },
  {
    lesson: 'Opening 4-2: make your four point.',
    white: OPENING.white,
    black: OPENING.black,
    roll: [4, 2],
  },
  {
    lesson: 'Opening 6-1: make your bar point.',
    white: OPENING.white,
    black: OPENING.black,
    roll: [6, 1],
  },
  {
    lesson: 'Opening 5-3: make your three point.',
    white: OPENING.white,
    black: OPENING.black,
    roll: [5, 3],
  },
  {
    lesson: 'Opening 6-5: run a back checker all the way to the midpoint.',
    white: OPENING.white,
    black: OPENING.black,
    roll: [6, 5],
  },
  // --- Hit and cover: make a point on the enemy blot -------------------
  {
    lesson: 'Make your five point on the blot — hit and cover at once.',
    white: { points: { 24: 2, 13: 5, 8: 3, 6: 5 } },
    black: { points: { 5: 1, 1: 1, 12: 5, 17: 3, 19: 5 } },
    roll: [3, 1],
  },
  {
    lesson: 'Make your four point on the blot — hit and cover at once.',
    white: { points: { 24: 2, 13: 5, 8: 4, 6: 4 } },
    black: { points: { 4: 1, 1: 1, 12: 5, 17: 3, 19: 5 } },
    roll: [4, 2],
  },
  {
    lesson: 'Hit deep and make a home point against the blot.',
    white: { points: { 13: 3, 10: 1, 8: 3, 6: 3, 5: 3, 4: 2 } },
    black: { points: { 3: 1, 12: 5, 1: 2, 19: 4, 24: 3 } },
    roll: [5, 2],
  },
  {
    lesson: 'Make the four point with two spare builders.',
    white: { points: { 13: 4, 8: 4, 6: 5, 10: 1, 9: 1 } },
    black: { points: { 24: 2, 12: 5, 1: 2, 19: 3, 17: 3 } },
    roll: [5, 6],
  },
  // --- Escaping a back checker -----------------------------------------
  {
    lesson: 'Run your lone back checker to safety.',
    white: { points: { 24: 1, 13: 5, 8: 4, 6: 5 } },
    black: { points: { 1: 2, 12: 4, 17: 4, 19: 3, 20: 2 } },
    roll: [6, 5],
  },
  {
    lesson: 'Run the straggler all the way to the midpoint.',
    white: { points: { 23: 1, 13: 4, 8: 5, 6: 5 } },
    black: { points: { 1: 2, 12: 4, 16: 3, 19: 3, 20: 3 } },
    roll: [5, 5],
  },
  {
    lesson: 'Escape both back checkers with a big double.',
    white: { points: { 24: 2, 13: 5, 8: 4, 6: 4 } },
    black: { points: { 1: 2, 12: 4, 16: 3, 19: 3, 20: 3 } },
    roll: [4, 4],
  },
  // --- Bearing off -----------------------------------------------------
  {
    lesson: 'Bear off two men when the coast is clear.',
    white: { points: { 6: 3, 5: 3, 4: 3, 3: 3, 2: 3 } },
    black: { points: { 24: 8, 23: 7 } },
    roll: [6, 5],
  },
  {
    lesson: 'Bear off without leaving a shot to the anchor.',
    white: { points: { 6: 2, 5: 3, 4: 2, 2: 5, 1: 3 } },
    black: { points: { 3: 2, 24: 7, 23: 6 } },
    roll: [6, 4],
  },
  {
    lesson: 'Clear your highest point to stay ahead in the race.',
    white: { points: { 6: 2, 5: 3, 4: 3, 3: 4, 2: 3 } },
    black: { points: { 24: 8, 23: 7 } },
    roll: [6, 4],
  },
];

function buildAnswers(
  board: BoardState,
  ranked: readonly RankedPlay[],
): PlayAnswer[] {
  return ranked.map((entry) => {
    const movements = [...entry.play.movements];
    const final = movements.reduce(
      (b, m) => applyMovement(b, 'white', m),
      board,
    );
    return {
      rank: entry.rank,
      moveText: entry.moveText,
      movements,
      finalKey: boardKey(final),
      equity: entry.equity,
      equityLoss: entry.equityLoss,
    };
  });
}

function render(puzzles: readonly PlayPuzzle[]): string {
  return `/**
 * The bundled "Basics" puzzle set (GLOSSARY "Curated puzzle", "Theme").
 *
 * GENERATED FILE — do not edit by hand. Regenerate with:
 *   npm run mine:basics
 * (scripts/mineBasics.ts: small hand-authored teaching positions —
 * hitting, entering from the bar, making a point, escaping, bearing off —
 * each graded at full strength by the real gnubg WASM engine and kept only
 * when a clear best play exists. No positions are copied from books or other
 * published sources.)
 *
 * curatedPuzzles.validation.test.ts re-evaluates every stored answer against
 * the real WASM engine (the Basics set is bundled with the curated set), so
 * stale or wrong answer data cannot ship.
 */

// biome-ignore-all lint/suspicious/noApproximativeNumericConstant: engine equities are data, not math constants
import type { Puzzle } from './types';

export const BASICS_PUZZLES: readonly Puzzle[] = ${JSON.stringify(
    puzzles,
    null,
    2,
  )};
`;
}

export async function mineBasics(): Promise<void> {
  console.log('Loading gnubg WASM…');
  const session = await loadGnubgSession();
  const kept: PlayPuzzle[] = [];
  let serial = 0;

  for (const seed of SEEDS) {
    let board: BoardState;
    try {
      board = createBoard({ white: seed.white, black: seed.black });
    } catch (error) {
      console.log(`  SKIP (illegal position) "${seed.lesson}": ${error}`);
      continue;
    }
    // Match exactly how curatedValidation re-evaluates (toEnginePosition):
    // hero on roll, the money context stored on the puzzle. Encoding-identical
    // so the stored equities re-validate without cache drift.
    const ranked = session.rankPlays(
      {
        board,
        onRoll: 'white',
        match: {
          matchLength: MONEY.matchLength,
          score: MONEY.score,
          cube: MONEY.cube,
        },
      },
      seed.roll,
    );
    if (ranked.length < 2) {
      console.log(`  SKIP (only ${ranked.length} legal play) "${seed.lesson}"`);
      continue;
    }
    const margin = ranked[1].equityLoss;
    const best = ranked[0];
    const flag = margin >= MARGIN_MIN ? 'KEEP' : 'drop';
    console.log(
      `  ${flag} [${seed.roll[0]}-${seed.roll[1]}] best ${best.moveText} ` +
        `(eq ${best.equity.toFixed(3)}), 2nd loses ${margin.toFixed(3)}, ` +
        `${ranked.length} plays — ${seed.lesson}`,
    );
    if (margin < MARGIN_MIN) {
      continue;
    }
    serial++;
    kept.push({
      id: `basics-${String(serial).padStart(3, '0')}`,
      kind: 'play',
      theme: 'basics',
      source: 'curated',
      board,
      hero: 'white',
      match: MONEY,
      roll: seed.roll,
      answers: buildAnswers(board, ranked),
    });
  }

  const target = fileURLToPath(
    new URL('../src/puzzles/basicsSet.ts', import.meta.url),
  );
  writeFileSync(target, render(kept));
  console.log('');
  console.log(`Kept ${kept.length} of ${SEEDS.length} authored positions.`);
  console.log(`Wrote ${target}`);
}
