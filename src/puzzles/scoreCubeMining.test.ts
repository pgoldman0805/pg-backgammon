import { describe, expect, it } from 'vitest';
import type { CubeAnalysis, EnginePosition } from '../engine/types';
import { type BoardState, createBoard } from '../rules';
import {
  mineScoreCubePuzzles,
  type ScoreCubeCandidate,
  type ScoreCubeEngine,
} from './scoreCubeMining';

const CHANCES = {
  win: 0.6,
  winGammon: 0.2,
  winBackgammon: 0.01,
  lose: 0.4,
  loseGammon: 0.1,
  loseBackgammon: 0.005,
};

/** A doubler-perspective cube analysis with the three standard options. */
function analysis(
  noDouble: number,
  take: number,
  pass: number,
  properAction: string,
): CubeAnalysis {
  return {
    cubelessEquity: noDouble,
    chances: CHANCES,
    options: [
      { action: 'No double', equity: noDouble, equityDiff: 0 },
      { action: 'Double, take', equity: take, equityDiff: take - noDouble },
      { action: 'Double, pass', equity: pass, equityDiff: pass - noDouble },
    ],
    properAction,
  };
}

/** Distinct boards so the fake engine can key its scripted answers by board. */
function distinctBoard(whitePoint: number): BoardState {
  return createBoard({
    white: { points: { [whitePoint]: 2, 13: 5, 8: 3, 6: 5 } },
    black: { points: { 1: 2, 12: 5, 17: 3, 19: 5 } },
  });
}

const TWO_AWAY_FOUR_AWAY = {
  matchLength: 7,
  score: { white: 5, black: 3 },
} as const;

/** An engine scripted per (board, matchLength): money vs the one score. */
function scriptedEngine(
  table: Map<BoardState, { money: CubeAnalysis; score: CubeAnalysis }>,
): ScoreCubeEngine {
  return {
    cubeInfo: async (position: EnginePosition) => {
      const entry = table.get(position.board);
      if (!entry) {
        throw new Error('no scripted analysis for this board');
      }
      return position.match && position.match.matchLength > 0
        ? entry.score
        : entry.money;
    },
  };
}

describe('mineScoreCubePuzzles', () => {
  it('keeps an offer whose answer flips from double (money) to no-double (score)', async () => {
    const board = distinctBoard(24);
    const candidate: ScoreCubeCandidate = { board, decision: 'offer' };
    const table = new Map([
      [
        board,
        {
          // Money: doubling is right (min(take,pass)=1.0 > 0.903).
          money: analysis(0.903, 1.287, 1.0, 'Double, pass'),
          // At 2-away/4-away holding the cube is right (0.95 < 1.0).
          score: analysis(1.0, 1.2, 0.95, 'No double, take'),
        },
      ],
    ]);

    const kept = await mineScoreCubePuzzles({
      engine: scriptedEngine(table),
      candidates: [candidate],
      contexts: [TWO_AWAY_FOUR_AWAY],
      source: 'curated',
    });

    expect(kept).toHaveLength(1);
    expect(kept[0].decision).toBe('offer');
    expect(kept[0].match).toEqual({
      matchLength: 7,
      score: { white: 5, black: 3 },
      cube: { value: 1, owner: 'center' },
      crawford: undefined,
    });
    expect(kept[0].choices[0].action).toBe('no-double');
    expect(kept[0].verdict).toBe('No double, take');
    expect(kept[0].choices[0].equityLoss).toBe(0);
    expect(kept[0].choices[1].equityLoss).toBeGreaterThanOrEqual(0.05);
  });

  it('keeps a response whose answer flips from pass (money) to take (score)', async () => {
    const board = distinctBoard(23);
    const table = new Map([
      [
        board,
        {
          money: analysis(0.9, 1.287, 1.0, 'Double, pass'),
          score: analysis(0.9, 0.9, 1.0, 'Double, take'),
        },
      ],
    ]);

    const kept = await mineScoreCubePuzzles({
      engine: scriptedEngine(table),
      candidates: [{ board, decision: 'response' }],
      contexts: [TWO_AWAY_FOUR_AWAY],
      source: 'curated',
    });

    expect(kept).toHaveLength(1);
    expect(kept[0].decision).toBe('response');
    expect(kept[0].choices[0].action).toBe('take');
    expect(kept[0].verdict).toBe('Double, take');
  });

  it('skips a position whose answer does not change with the score', async () => {
    const board = distinctBoard(22);
    const sameEither = analysis(0.9, 1.3, 1.0, 'Double, pass');
    const table = new Map([[board, { money: sameEither, score: sameEither }]]);

    const kept = await mineScoreCubePuzzles({
      engine: scriptedEngine(table),
      candidates: [{ board, decision: 'offer' }],
      contexts: [TWO_AWAY_FOUR_AWAY],
      source: 'curated',
    });

    expect(kept).toHaveLength(0);
  });

  it('caps how many puzzles one score context contributes', async () => {
    const boards = [distinctBoard(24), distinctBoard(23), distinctBoard(22)];
    const table = new Map(
      boards.map((board) => [
        board,
        {
          money: analysis(0.903, 1.287, 1.0, 'Double, pass'),
          score: analysis(1.0, 1.2, 0.95, 'No double, take'),
        },
      ]),
    );

    const kept = await mineScoreCubePuzzles({
      engine: scriptedEngine(table),
      candidates: boards.map((board) => ({
        board,
        decision: 'offer' as const,
      })),
      contexts: [TWO_AWAY_FOUR_AWAY],
      source: 'curated',
      quality: { perContextCap: 2 },
    });

    expect(kept).toHaveLength(2);
  });
});
