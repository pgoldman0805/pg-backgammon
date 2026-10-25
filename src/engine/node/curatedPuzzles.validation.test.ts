// @vitest-environment node
/**
 * Curated-set validation against the real gnubg WASM build. Structural
 * guarantees (coverage of all legal plays, clear margins, theme distribution)
 * are checked for EVERY bundled puzzle from the stored data alone; the
 * engine re-evaluation — the expensive part — runs over a deterministic
 * seeded sample spanning every theme and both puzzle kinds, keeping
 * `npm test` fast. `npm run validate:puzzles` re-evaluates the entire set
 * with the same checks (scripts/validatePuzzles.ts).
 */

import { beforeAll, describe, expect, it } from 'vitest';
import { BUNDLED_PUZZLES } from '../../puzzles/bundledSet';
import { boardKey } from '../../puzzles/grade';
import type { CubePuzzle, PlayPuzzle } from '../../puzzles/types';
import { MINEABLE_THEMES, PUZZLE_THEMES } from '../../puzzles/types';
import { selectValidationSample } from '../../puzzles/validationSample';
import { applyMovement, legalPlays } from '../../rules';
import type { GnubgSession } from '../session';
import { checkPuzzle, MARGIN_MIN } from './curatedValidation';
import { loadGnubgSession } from './loadGnubg';

/** WASM re-evaluation budget per `npm test` run: 6 per theme. */
const SAMPLE_PER_THEME = 6;
const SAMPLE_SEED = 20261023;
/** The hand-authored Basics theme (ticket 33) ships fewer than the mined. */
const BASICS_MIN = 12;

// The whole bundled set is validated: the hand-authored Basics theme plus
// the self-play-mined curated themes (ticket 33).
const playPuzzles = BUNDLED_PUZZLES.filter(
  (p): p is PlayPuzzle => p.kind === 'play',
);
const cubePuzzles = BUNDLED_PUZZLES.filter(
  (p): p is CubePuzzle => p.kind === 'cube',
);

describe('bundled set shape (stored data alone, full set)', () => {
  it('ships Basics (ticket 33) and at least 25 per mined theme', () => {
    expect(BUNDLED_PUZZLES.length).toBeGreaterThanOrEqual(125);
    expect(
      BUNDLED_PUZZLES.filter((p) => p.theme === 'basics').length,
      'theme basics',
    ).toBeGreaterThanOrEqual(BASICS_MIN);
    for (const theme of MINEABLE_THEMES) {
      expect(
        BUNDLED_PUZZLES.filter((p) => p.theme === theme).length,
        `theme ${theme}`,
      ).toBeGreaterThanOrEqual(25);
    }
  });

  it('orders Basics first, before the advanced themes (ticket 33)', () => {
    expect(PUZZLE_THEMES[0]).toBe('basics');
  });

  it('has unique ids, white as hero, and curated as source', () => {
    const ids = new Set(BUNDLED_PUZZLES.map((p) => p.id));
    expect(ids.size).toBe(BUNDLED_PUZZLES.length);
    for (const puzzle of BUNDLED_PUZZLES) {
      expect(puzzle.hero).toBe('white');
      expect(puzzle.source).toBe('curated');
    }
  });

  it('mixes cube flavors: both offer and response decisions ship', () => {
    const decisions = new Set(cubePuzzles.map((p) => p.decision));
    expect(decisions).toEqual(new Set(['offer', 'response']));
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
    for (const puzzle of BUNDLED_PUZZLES) {
      const losses =
        puzzle.kind === 'play'
          ? puzzle.answers.map((a) => a.equityLoss)
          : puzzle.choices.map((c) => c.equityLoss);
      expect(losses[0], puzzle.id).toBe(0);
      expect(losses[1], puzzle.id).toBeGreaterThanOrEqual(MARGIN_MIN);
    }
  });
});

describe('stored answers match a fresh full-strength evaluation (sample)', () => {
  const sample = selectValidationSample(
    BUNDLED_PUZZLES,
    SAMPLE_PER_THEME,
    SAMPLE_SEED,
  );

  it('spans every theme and both puzzle kinds', () => {
    expect(new Set(sample.map((p) => p.theme))).toEqual(new Set(PUZZLE_THEMES));
    expect(new Set(sample.map((p) => p.kind))).toEqual(
      new Set(['play', 'cube']),
    );
  });

  let session: GnubgSession;

  beforeAll(async () => {
    session = await loadGnubgSession();
  }, 180_000);

  for (const puzzle of sample) {
    it(`${puzzle.id} (${puzzle.theme} ${puzzle.kind}): stored answers still hold`, () => {
      expect(checkPuzzle(session, puzzle)).toEqual([]);
    }, 60_000);
  }
});
