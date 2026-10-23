// @vitest-environment node
/**
 * Curated-set validation against the real gnubg WASM build: every bundled
 * puzzle's stored answer data is re-evaluated at full strength, so a stale
 * or wrong answer can never ship. Structural guarantees (coverage of all
 * legal plays, clear margins, theme distribution) are checked from the
 * stored data alone.
 */

import { beforeAll, describe, expect, it } from 'vitest';
import { CURATED_PUZZLES } from '../../puzzles/curatedSet';
import { boardKey } from '../../puzzles/grade';
import { deriveCubeChoices, toEnginePosition } from '../../puzzles/mining';
import type { CubePuzzle, PlayPuzzle } from '../../puzzles/types';
import { PUZZLE_THEMES } from '../../puzzles/types';
import { applyMovement, legalPlays } from '../../rules';
import type { GnubgSession } from '../session';
import { loadGnubgSession } from './loadGnubg';

const MARGIN_MIN = 0.05;
/**
 * gnubg's evaluation cache lets deep rows wobble by about a thousandth
 * between session histories; grading tolerance is 0.02, so validating to
 * half a hundredth still catches any answer that could mis-grade.
 */
const EQUITY_DIGITS = 2; // toBeCloseTo: |diff| < 0.005
const MARGIN_WOBBLE = 0.01;

const playPuzzles = CURATED_PUZZLES.filter(
  (p): p is PlayPuzzle => p.kind === 'play',
);
const cubePuzzles = CURATED_PUZZLES.filter(
  (p): p is CubePuzzle => p.kind === 'cube',
);

describe('curated set shape (stored data alone)', () => {
  it('ships at least 25 puzzles, at least 5 per theme', () => {
    expect(CURATED_PUZZLES.length).toBeGreaterThanOrEqual(25);
    for (const theme of PUZZLE_THEMES) {
      expect(
        CURATED_PUZZLES.filter((p) => p.theme === theme).length,
        `theme ${theme}`,
      ).toBeGreaterThanOrEqual(5);
    }
  });

  it('has unique ids, white as hero, and curated as source', () => {
    const ids = new Set(CURATED_PUZZLES.map((p) => p.id));
    expect(ids.size).toBe(CURATED_PUZZLES.length);
    for (const puzzle of CURATED_PUZZLES) {
      expect(puzzle.hero).toBe('white');
      expect(puzzle.source).toBe('curated');
    }
  });

  it('every play puzzle covers each distinct legal final position', () => {
    for (const puzzle of playPuzzles) {
      const finals = new Set(
        legalPlays(puzzle.board, 'white', puzzle.roll).map((play) =>
          boardKey(
            play.movements.reduce(
              (b, m) => applyMovement(b, 'white', m),
              puzzle.board,
            ),
          ),
        ),
      );
      const stored = new Set(puzzle.answers.map((a) => a.finalKey));
      expect(stored, puzzle.id).toEqual(finals);
      // Each answer's movements reproduce its own final key.
      for (const answer of puzzle.answers) {
        const replayed = answer.movements.reduce(
          (b, m) => applyMovement(b, 'white', m),
          puzzle.board,
        );
        expect(boardKey(replayed), `${puzzle.id} ${answer.moveText}`).toBe(
          answer.finalKey,
        );
      }
    }
  });

  it('every puzzle has a clear best and a tempting alternative', () => {
    for (const puzzle of CURATED_PUZZLES) {
      const losses =
        puzzle.kind === 'play'
          ? puzzle.answers.map((a) => a.equityLoss)
          : puzzle.choices.map((c) => c.equityLoss);
      expect(losses[0], puzzle.id).toBe(0);
      expect(losses[1], puzzle.id).toBeGreaterThanOrEqual(MARGIN_MIN);
    }
  });
});

describe('stored answers match a fresh full-strength evaluation', () => {
  let session: GnubgSession;

  beforeAll(async () => {
    session = await loadGnubgSession();
  }, 180_000);

  for (const puzzle of playPuzzles) {
    it(`${puzzle.id} (${puzzle.theme}): best play and equities still hold`, () => {
      const fresh = session.rankPlays(toEnginePosition(puzzle), puzzle.roll);
      const freshBestKey = boardKey(
        fresh[0].play.movements.reduce(
          (b, m) => applyMovement(b, 'white', m),
          puzzle.board,
        ),
      );
      expect(freshBestKey).toBe(puzzle.answers[0].finalKey);
      expect(fresh[0].equity).toBeCloseTo(
        puzzle.answers[0].equity,
        EQUITY_DIGITS,
      );
      expect(fresh[1].equityLoss).toBeGreaterThanOrEqual(
        MARGIN_MIN - MARGIN_WOBBLE,
      );

      // The whole stored table is fresh, not just the top row.
      const freshByKey = new Map(
        fresh.map((entry) => [
          boardKey(
            entry.play.movements.reduce(
              (b, m) => applyMovement(b, 'white', m),
              puzzle.board,
            ),
          ),
          entry,
        ]),
      );
      for (const answer of puzzle.answers) {
        const entry = freshByKey.get(answer.finalKey);
        expect(entry, `${puzzle.id} ${answer.moveText}`).toBeDefined();
        expect(entry?.equity).toBeCloseTo(answer.equity, EQUITY_DIGITS);
      }
    }, 60_000);
  }

  for (const puzzle of cubePuzzles) {
    it(`${puzzle.id} (${puzzle.decision}): cube verdict and equities still hold`, () => {
      const analysis = session.cubeInfo(toEnginePosition(puzzle));
      const derived = deriveCubeChoices(analysis, puzzle.decision);
      expect(derived.verdict).toBe(puzzle.verdict);
      expect(derived.choices[0].action).toBe(puzzle.choices[0].action);
      for (const [index, choice] of derived.choices.entries()) {
        expect(choice.action).toBe(puzzle.choices[index].action);
        expect(choice.equity).toBeCloseTo(
          puzzle.choices[index].equity,
          EQUITY_DIGITS,
        );
      }
      expect(derived.choices[1].equityLoss).toBeGreaterThanOrEqual(
        MARGIN_MIN - MARGIN_WOBBLE,
      );
    }, 60_000);
  }
});
