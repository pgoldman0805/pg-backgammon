import { describe, expect, it } from 'vitest';
import { applyMovement, initialBoard, legalPlays } from '../rules';
import { createFakeEngine } from './fake';
import type { EngineStatus } from './types';

const OPENING = { board: initialBoard(), onRoll: 'white' } as const;

describe('createFakeEngine', () => {
  it('honors the Engine lifecycle contract', async () => {
    const engine = createFakeEngine();
    expect(engine.status).toBe('idle');
    const seen: EngineStatus[] = [];
    engine.onStatusChange((status) => seen.push(status));
    await engine.initialize();
    expect(engine.status).toBe('ready');
    expect(seen).toEqual(['loading', 'ready']);
    engine.dispose();
    expect(engine.status).toBe('idle');
  });

  it('ranks exactly the legal plays, best first, without initialization fuss', async () => {
    const engine = createFakeEngine();
    const ranked = await engine.rankPlays(OPENING, [3, 1]);
    expect(ranked).toHaveLength(
      legalPlays(OPENING.board, 'white', [3, 1]).length,
    );
    expect(ranked[0].rank).toBe(1);
    expect(ranked[0].equityLoss).toBe(0);
    for (let i = 1; i < ranked.length; i++) {
      expect(ranked[i].equity).toBeLessThanOrEqual(ranked[i - 1].equity);
      expect(ranked[i].equityLoss).toBeGreaterThanOrEqual(0);
    }
    // Each ranked play is a real legal play with applicable movements.
    let board = OPENING.board;
    for (const movement of ranked[0].play.movements) {
      board = applyMovement(board, 'white', movement);
    }
    expect(board).not.toEqual(OPENING.board);
  });

  it('is deterministic across calls and engines', async () => {
    const a = await createFakeEngine().rankPlays(OPENING, [3, 1]);
    const b = await createFakeEngine().rankPlays(OPENING, [3, 1]);
    expect(a).toEqual(b);
  });

  it('visibly refines equities at deep effort, deterministically', async () => {
    const engine = createFakeEngine();
    const standard = await engine.rankPlays(OPENING, [3, 1]);
    const deepA = await engine.rankPlays(OPENING, [3, 1], { effort: 'deep' });
    const deepB = await engine.rankPlays(OPENING, [3, 1], { effort: 'deep' });
    expect(deepA).toEqual(deepB);
    expect(deepA.map((p) => p.equity)).not.toEqual(
      standard.map((p) => p.equity),
    );
    // A refinement, not a different opinion: equities barely move.
    const sameText = standard.find((p) => p.moveText === deepA[0].moveText);
    expect(sameText).toBeDefined();
    expect(Math.abs((sameText?.equity ?? 0) - deepA[0].equity)).toBeLessThan(
      0.05,
    );
  });

  it('refines the cube analysis at deep effort, deterministically', async () => {
    const engine = createFakeEngine();
    const standard = await engine.cubeInfo(OPENING);
    const deepA = await engine.cubeInfo(OPENING, { effort: 'deep' });
    const deepB = await engine.cubeInfo(OPENING, { effort: 'deep' });
    expect(deepA).toEqual(deepB);
    expect(deepA.cubelessEquity).not.toBe(standard.cubelessEquity);
    expect(
      Math.abs(deepA.cubelessEquity - standard.cubelessEquity),
    ).toBeLessThan(0.05);
  });

  it('applies the shared difficulty noise deterministically', async () => {
    const engine = createFakeEngine();
    const clean = await engine.rankPlays(OPENING, [3, 1]);
    const noisyA = await engine.rankPlays(OPENING, [3, 1], {
      difficulty: 'beginner',
    });
    const noisyB = await engine.rankPlays(OPENING, [3, 1], {
      difficulty: 'beginner',
    });
    expect(noisyA).toEqual(noisyB);
    expect(noisyA.map((p) => p.equity)).not.toEqual(clean.map((p) => p.equity));
  });

  it('returns an empty ranking for a dance', async () => {
    const engine = createFakeEngine();
    const points = new Array<number>(25).fill(0);
    points[13] = 5;
    points[8] = 4;
    points[6] = 3;
    points[5] = 2;
    for (let p = 19; p <= 24; p++) {
      points[p] = -2;
    }
    points[12] = -3;
    const board = {
      points,
      bar: { white: 1, black: 0 },
      off: { white: 0, black: 0 },
    };
    expect(await engine.rankPlays({ board, onRoll: 'white' }, [3, 1])).toEqual(
      [],
    );
  });

  it('evaluates deterministically with coherent chances', async () => {
    const engine = createFakeEngine();
    const evaluation = await engine.evaluate(OPENING);
    expect(evaluation).toEqual(await engine.evaluate(OPENING));
    expect(evaluation.chances.win + evaluation.chances.lose).toBeCloseTo(1, 10);
    expect(evaluation.chances.win).toBeGreaterThan(0);
    expect(evaluation.chances.win).toBeLessThan(1);
  });

  it('produces a cube analysis with the standard three options', async () => {
    const engine = createFakeEngine();
    const analysis = await engine.cubeInfo(OPENING);
    expect(analysis.options.map((o) => o.action)).toEqual([
      'No double',
      'Double, take',
      'Double, pass',
    ]);
    expect(analysis.properAction.length).toBeGreaterThan(0);
  });
});
