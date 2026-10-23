/**
 * The blunder mining service (ticket 12's trigger): mining runs without user
 * action — it observes match puts (the moment auto-analysis or the Analyze
 * page persists an analysis) and catches up over already-analyzed matches
 * that were never mined (pre-existing history gains puzzles). Idempotent via
 * per-match mined stamps; failures are swallowed and retried on the next
 * catch-up.
 */

import { describe, expect, it } from 'vitest';
import type {
  AnalyzedCube,
  AnalyzedDecision,
  AnalyzedPlay,
  GameAnalysis,
  MatchAnalysis,
  PlayerSummary,
} from '../analysis';
import type { RankedPlay } from '../engine/types';
import type { CheckerMovement, DiceRoll } from '../rules';
import { createMemoryBlunderPuzzleStorage } from '../storage/blunderPuzzles';
import { createMemoryStorage } from '../storage/memory';
import { createObservableMatchStorage } from '../storage/observe';
import { storedMatchFixture } from '../storage/storageContract';
import type { StoredMatch } from '../storage/types';
import { cubeGameMatch, recordOf } from '../test/match';
import { createBlunderMiningService } from './blunderMiningService';

const SUMMARY: PlayerSummary = {
  decisions: 0,
  equityLost: 0,
  errorRate: 0,
  blunders: 0,
  errors: 0,
  dubious: 0,
};

function analysisOf(
  decisions: readonly AnalyzedDecision[],
  analyzedAt = 111,
): MatchAnalysis {
  const game: GameAnalysis = { decisions, white: SUMMARY, black: SUMMARY };
  return {
    format: 1,
    analyzedAt,
    games: [game],
    white: SUMMARY,
    black: SUMMARY,
  };
}

const record = recordOf(cubeGameMatch(2));

/** White's wrong take of Black's double at play 1: a cube blunder. */
const whiteWrongTake: AnalyzedCube = {
  kind: 'cube',
  player: 'white',
  playIndex: 1,
  action: 'take',
  cubeValue: 1,
  properAction: 'Double, pass',
  noDoubleEquity: 0.4,
  doubleTakeEquity: 1.3,
  doublePassEquity: 1.0,
  error: 'wrong-take',
  equityLoss: 0.3,
  classification: 'blunder',
  plies: 2,
};

const move = (
  from: CheckerMovement['from'],
  to: CheckerMovement['to'],
  die: CheckerMovement['die'],
): CheckerMovement => ({ from, to, die, hit: false });

/** White's opening blunder with a partial table: needs one engine ranking. */
const incompletePlay: AnalyzedPlay = {
  kind: 'play',
  player: 'white',
  playIndex: 0,
  roll: [3, 1],
  moveText: '8/5 6/5',
  rank: 6,
  totalPlays: 18,
  alternatives: [
    {
      moveText: '8/5 6/5',
      equity: 0.219,
      equityLoss: 0,
      played: true,
      movements: [move(8, 5, 3), move(6, 5, 1)],
    },
  ],
  equityLoss: 0.12,
  classification: 'blunder',
  plies: 2,
};

const CHANCES = {
  win: 0.5,
  winGammon: 0.1,
  winBackgammon: 0.01,
  lose: 0.5,
  loseGammon: 0.1,
  loseBackgammon: 0.01,
};

const RANKED: readonly RankedPlay[] = [
  {
    rank: 1,
    play: {
      player: 'white',
      roll: [3, 1],
      movements: [move(8, 5, 3), move(6, 5, 1)],
    },
    moveText: '8/5 6/5',
    equity: 0.219,
    equityLoss: 0,
    chances: CHANCES,
  },
  {
    rank: 2,
    play: {
      player: 'white',
      roll: [3, 1],
      movements: [move(24, 23, 1), move(13, 10, 3)],
    },
    moveText: '24/23 13/10',
    equity: -0.011,
    equityLoss: 0.23,
    chances: CHANCES,
  },
];

function analyzedMatch(
  decisions: readonly AnalyzedDecision[],
  analyzedAt = 111,
  overrides: Partial<StoredMatch> = {},
): StoredMatch {
  return storedMatchFixture({
    id: 'm1',
    config: { length: 2, mode: 'computer', difficulty: 'casual' },
    status: 'finished',
    record,
    score: { white: 0, black: 2 },
    winner: 'black',
    analysis: analysisOf(decisions, analyzedAt),
    ...overrides,
  });
}

function engineStub(fail = false): {
  calls: DiceRoll[];
  rankPlays: (
    position: unknown,
    roll: DiceRoll,
  ) => Promise<readonly RankedPlay[]>;
} {
  const calls: DiceRoll[] = [];
  return {
    calls,
    async rankPlays(_position, roll) {
      calls.push(roll);
      if (fail) {
        throw new Error('engine unavailable');
      }
      return RANKED;
    },
  };
}

describe('catch-up mining', () => {
  it('mines analyzed finished matches that were never mined', async () => {
    const matches = createMemoryStorage([analyzedMatch([whiteWrongTake])]);
    const puzzles = createMemoryBlunderPuzzleStorage();
    const service = createBlunderMiningService({
      matches,
      puzzles,
      rankPlays: engineStub().rankPlays,
    });

    await service.catchUp();

    const stored = await puzzles.list();
    expect(stored.map((p) => p.id)).toEqual(['blunder:m1:0:0']);
    expect(await puzzles.loadMined()).toEqual({ m1: 111 });
  });

  it('skips matches already mined at the same analysis stamp', async () => {
    const engine = engineStub();
    const matches = createMemoryStorage([analyzedMatch([incompletePlay])]);
    const puzzles = createMemoryBlunderPuzzleStorage();
    const service = createBlunderMiningService({
      matches,
      puzzles,
      rankPlays: engine.rankPlays,
    });

    await service.catchUp();
    expect(engine.calls).toHaveLength(1);

    await service.catchUp();
    expect(engine.calls).toHaveLength(1);
    expect(await puzzles.list()).toHaveLength(1);
  });

  it('re-mines after a re-analysis, adding only the new blunders', async () => {
    const matches = createMemoryStorage([analyzedMatch([whiteWrongTake])]);
    const puzzles = createMemoryBlunderPuzzleStorage();
    const service = createBlunderMiningService({
      matches,
      puzzles,
      rankPlays: engineStub().rankPlays,
    });
    await service.catchUp();

    // Deepening appended nothing but reclassified another decision and
    // bumped analyzedAt: the match is re-mined, the old puzzle kept once.
    await matches.put(analyzedMatch([whiteWrongTake, incompletePlay], 222));
    await service.catchUp();

    const stored = await puzzles.list();
    expect(stored.map((p) => p.id).sort()).toEqual([
      'blunder:m1:0:0',
      'blunder:m1:0:1',
    ]);
    expect(await puzzles.loadMined()).toEqual({ m1: 222 });
  });

  it('swallows a mining failure, leaving the match unmined for a retry', async () => {
    const matches = createMemoryStorage([analyzedMatch([incompletePlay])]);
    const puzzles = createMemoryBlunderPuzzleStorage();
    const broken = createBlunderMiningService({
      matches,
      puzzles,
      rankPlays: engineStub(true).rankPlays,
    });

    await expect(broken.catchUp()).resolves.toBeUndefined();
    expect(await puzzles.list()).toEqual([]);
    expect(await puzzles.loadMined()).toEqual({});

    const healthy = createBlunderMiningService({
      matches,
      puzzles,
      rankPlays: engineStub().rankPlays,
    });
    await healthy.catchUp();
    expect(await puzzles.list()).toHaveLength(1);
    expect(await puzzles.loadMined()).toEqual({ m1: 111 });
  });
});

describe('observing analysis persistence', () => {
  it('mines the moment an analysis-bearing row is put, without user action', async () => {
    const matches = createObservableMatchStorage(createMemoryStorage());
    const puzzles = createMemoryBlunderPuzzleStorage();
    const service = createBlunderMiningService({
      matches,
      puzzles,
      rankPlays: engineStub().rankPlays,
      events: matches,
    });

    // The persister writes the finished row first, without analysis…
    await matches.put(
      analyzedMatch([whiteWrongTake], 111, { analysis: undefined }),
    );
    await service.settled();
    expect(await puzzles.list()).toEqual([]);

    // …then auto-analysis writes the analysis onto it.
    await matches.put(analyzedMatch([whiteWrongTake]));
    await service.settled();
    expect((await puzzles.list()).map((p) => p.id)).toEqual(['blunder:m1:0:0']);
  });

  it('stops observing once disposed', async () => {
    const matches = createObservableMatchStorage(createMemoryStorage());
    const puzzles = createMemoryBlunderPuzzleStorage();
    const service = createBlunderMiningService({
      matches,
      puzzles,
      rankPlays: engineStub().rankPlays,
      events: matches,
    });
    service.dispose();

    await matches.put(analyzedMatch([whiteWrongTake]));
    await service.settled();
    expect(await puzzles.list()).toEqual([]);
  });
});
