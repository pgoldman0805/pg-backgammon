// @vitest-environment node
/**
 * Contract tests against the real vendored gnubg WASM build, loaded directly
 * in Node (the worker wrapper stays thin; its state machine is tested with a
 * fake transport in client.test.ts).
 */
import { beforeAll, describe, expect, it } from 'vitest';
import type { DiceRoll } from '../../rules';
import { initialBoard, legalPlays } from '../../rules';
import type { GnubgSession } from '../session';
import type { EnginePosition } from '../types';
import { loadGnubgSession } from './loadGnubg';

const OPENING: EnginePosition = {
  board: initialBoard(),
  onRoll: 'white',
  match: { matchLength: 7, score: { white: 0, black: 0 } },
};

let session: GnubgSession;

beforeAll(async () => {
  session = await loadGnubgSession();
}, 120_000);

describe('gnubg WASM contract', () => {
  it('ranks 8/5 6/5 top for the opening 3-1 at full strength', () => {
    const ranked = session.rankPlays(OPENING, [3, 1]);
    expect(ranked[0].moveText).toBe('8/5 6/5');
    expect(ranked[0].equity).toBeGreaterThan(0.05);
    expect(ranked[0].equity).toBeLessThan(0.5);
    expect(ranked[0].play.movements).toHaveLength(2);
    // Every legal play is ranked, each joined to a rules-engine play.
    expect(ranked).toHaveLength(
      legalPlays(OPENING.board, 'white', [3, 1]).length,
    );
    // Losses grow down the list.
    expect(ranked.at(-1)?.equityLoss).toBeGreaterThan(0.1);
  });

  it('ranks 8/5 6/5 top at expert (clean 0-ply) too', () => {
    const ranked = session.rankPlays(OPENING, [3, 1], {
      difficulty: 'expert',
    });
    expect(ranked[0].moveText).toBe('8/5 6/5');
    // Known clean 0-ply equity of the opening 3-1 point play.
    expect(ranked[0].equity).toBeCloseTo(0.219, 2);
  });

  it('evaluates the opening position with sane 2-ply chances', () => {
    const evaluation = session.evaluate(OPENING);
    expect(evaluation.plies).toBe(2);
    expect(evaluation.chances.win).toBeGreaterThan(0.45);
    expect(evaluation.chances.win).toBeLessThan(0.6);
    expect(evaluation.chances.win + evaluation.chances.lose).toBeCloseTo(1, 5);
    expect(Math.abs(evaluation.equity)).toBeLessThan(0.2);
  });

  it('analyzes the opening cube decision as no double', () => {
    const analysis = session.cubeInfo(OPENING);
    expect(analysis.properAction.toLowerCase()).toContain('no double');
    expect(analysis.options.length).toBeGreaterThanOrEqual(3);
    expect(analysis.chances.win).toBeGreaterThan(0.4);
  });

  it('produces identical difficulty-noised rankings on repeat (seeded)', () => {
    const first = session.rankPlays(OPENING, [2, 1], {
      difficulty: 'beginner',
    });
    const second = session.rankPlays(OPENING, [2, 1], {
      difficulty: 'beginner',
    });
    expect(first).toEqual(second);
  });

  it('measurably degrades play quality at beginner versus expert', () => {
    const rolls: readonly DiceRoll[] = [
      [2, 1],
      [4, 3],
      [5, 2],
      [6, 2],
      [3, 2],
      [5, 4],
    ];
    let totalLoss = 0;
    let deviations = 0;
    for (const roll of rolls) {
      const clean = session.rankPlays(OPENING, roll, {
        difficulty: 'expert',
      });
      const noisy = session.rankPlays(OPENING, roll, {
        difficulty: 'beginner',
      });
      const pick = clean.find((p) => p.moveText === noisy[0].moveText);
      expect(pick).toBeDefined();
      totalLoss += pick?.equityLoss ?? 0;
      if (noisy[0].moveText !== clean[0].moveText) {
        deviations++;
      }
    }
    expect(deviations).toBeGreaterThan(0);
    expect(totalLoss).toBeGreaterThan(0);
  });
});
