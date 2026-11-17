/**
 * Blunder puzzle mining (spec story 35, GLOSSARY "Blunder puzzle"): every
 * decision the human blundered in an analyzed vs-computer match becomes a
 * drillable puzzle carrying the same stored answer data curated puzzles do.
 * Pure core: a StoredMatch (record + analysis) in, new puzzles out, with
 * dedupe by origin and by position+question content.
 */

import { describe, expect, it } from 'vitest';
import type {
  AnalyzedCube,
  AnalyzedDecision,
  AnalyzedPlay,
  GameAnalysis,
  MatchAnalysis,
  PlayAlternative,
  PlayerSummary,
} from '../analysis';
import { CLASSIFICATION_THRESHOLDS } from '../engine/analysis';
import type { RankedPlay } from '../engine/types';
import {
  applyMovement,
  type BoardState,
  type CheckerMovement,
  type DiceRoll,
  type MatchGameRecord,
} from '../rules';
import { storedMatchFixture } from '../storage/storageContract';
import type { StoredMatch } from '../storage/types';
import { cubeGameMatch, recordOf } from '../test/match';
import { mineBlunderPuzzles } from './blunderMining';
import { boardKey } from './grade';
import type { PlayPuzzle, Puzzle } from './types';

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

function alternative(
  moveText: string,
  equity: number,
  equityLoss: number,
  played: boolean,
  movements: readonly CheckerMovement[],
): PlayAlternative {
  return { moveText, equity, equityLoss, played, movements };
}

const move = (
  from: CheckerMovement['from'],
  to: CheckerMovement['to'],
  die: CheckerMovement['die'],
): CheckerMovement => ({ from, to, die, hit: false });

/** The one-game record behind every fixture: see src/test/match.ts. */
const record = recordOf(cubeGameMatch(2));
const game: MatchGameRecord = record.games[0];

/** The board faced before play `n` (replayed straight off the record). */
function boardBefore(n: number, from: MatchGameRecord = game): BoardState {
  let board = from.game.initialBoard;
  for (const play of from.game.plays.slice(0, n)) {
    for (const movement of play.movements) {
      board = applyMovement(board, play.player, movement);
    }
  }
  return board;
}

/**
 * White's 6-2 at play 2, analyzed: three distinct legal plays, all stored
 * (totalPlays === alternatives.length, a complete answer table).
 */
const completePlayBlunder: AnalyzedPlay = {
  kind: 'play',
  player: 'white',
  playIndex: 2,
  roll: [6, 2],
  moveText: '24/18 13/11',
  rank: 3,
  totalPlays: 3,
  alternatives: [
    alternative('24/16', 0.1, 0, false, [move(24, 18, 6), move(18, 16, 2)]),
    alternative('13/7 13/11', 0.05, 0.05, false, [
      move(13, 7, 6),
      move(13, 11, 2),
    ]),
    alternative('24/18 13/11', -0.074, 0.174, true, [
      move(24, 18, 6),
      move(13, 11, 2),
    ]),
  ],
  equityLoss: 0.174,
  classification: 'blunder',
  plies: 2,
};

function minedMatch(
  decisions: readonly AnalyzedDecision[],
  overrides: Partial<StoredMatch> = {},
): StoredMatch {
  return storedMatchFixture({
    id: 'm1',
    config: { length: 2, mode: 'computer', difficulty: 'casual' },
    status: 'finished',
    record,
    score: { white: 0, black: 2 },
    winner: 'black',
    analysis: analysisOf(decisions),
    ...overrides,
  });
}

/** A rankPlays stub that records calls; defaults to failing when reached. */
function rankPlaysStub(result?: readonly RankedPlay[]): {
  calls: Array<{
    position: Parameters<
      Parameters<typeof mineBlunderPuzzles>[1]['rankPlays']
    >[0];
    roll: DiceRoll;
  }>;
  rankPlays: Parameters<typeof mineBlunderPuzzles>[1]['rankPlays'];
} {
  const calls: ReturnType<typeof rankPlaysStub>['calls'] = [];
  return {
    calls,
    async rankPlays(position, roll) {
      calls.push({ position, roll });
      if (!result) {
        throw new Error('this test expected no engine completion');
      }
      return result;
    },
  };
}

const CHANCES = {
  win: 0.5,
  winGammon: 0.1,
  winBackgammon: 0.01,
  lose: 0.5,
  loseGammon: 0.1,
  loseBackgammon: 0.01,
};

function rankedPlay(
  rank: number,
  moveText: string,
  equity: number,
  equityLoss: number,
  movements: readonly CheckerMovement[],
): RankedPlay {
  return {
    rank,
    play: { player: 'white', roll: [3, 1], movements },
    moveText,
    equity,
    equityLoss,
    chances: CHANCES,
  };
}

/**
 * White's opening 3-1 at play 0: 18 legal plays but only the top five stored
 * — the table must be completed by one engine ranking.
 */
const incompletePlayBlunder: AnalyzedPlay = {
  kind: 'play',
  player: 'white',
  playIndex: 0,
  roll: [3, 1],
  moveText: '8/5 6/5',
  rank: 6,
  totalPlays: 18,
  alternatives: [
    alternative('8/5 6/5', 0.219, 0, false, [move(8, 5, 3), move(6, 5, 1)]),
    alternative('24/23 13/10', 0.1, 0.119, false, [
      move(24, 23, 1),
      move(13, 10, 3),
    ]),
    alternative('13/10 6/5', 0.09, 0.129, false, [
      move(13, 10, 3),
      move(6, 5, 1),
    ]),
    alternative('24/20', 0.08, 0.139, false, [
      move(24, 23, 1),
      move(23, 20, 3),
    ]),
    alternative('13/9', 0.07, 0.149, false, [move(13, 10, 3), move(10, 9, 1)]),
  ],
  equityLoss: 0.12,
  classification: 'blunder',
  plies: 2,
};

describe('mining a play blunder with a complete stored table', () => {
  it('builds the puzzle from the analysis alone', async () => {
    const stub = rankPlaysStub();
    const puzzles = await mineBlunderPuzzles(
      minedMatch([completePlayBlunder]),
      {
        existing: [],
        rankPlays: stub.rankPlays,
      },
    );

    expect(stub.calls).toHaveLength(0);
    expect(puzzles).toHaveLength(1);
    const puzzle = puzzles[0] as PlayPuzzle;
    expect(puzzle.kind).toBe('play');
    expect(puzzle.id).toBe('blunder:m1:0:0');
    expect(puzzle.source).toBe('blunder');
    expect(puzzle.origin).toEqual({ matchId: 'm1', game: 0, decision: 0 });
    expect(puzzle.hero).toBe('white');
    // No heuristic names this early contact position: the documented
    // fallback for non-race checker-play blunders is 'priming'.
    expect(puzzle.theme).toBe('priming');
    expect(puzzle.roll).toEqual([6, 2]);
    expect(puzzle.board).toEqual(boardBefore(2));
    // The cube was taken by White at value 2 before this play.
    expect(puzzle.match).toEqual({
      matchLength: 2,
      score: { white: 0, black: 0 },
      cube: { value: 2, owner: 'white' },
      crawford: false,
    });
    expect(
      puzzle.answers.map((a) => [a.rank, a.moveText, a.equity, a.equityLoss]),
    ).toEqual([
      [1, '24/16', 0.1, 0],
      [2, '13/7 13/11', 0.05, 0.05],
      [3, '24/18 13/11', -0.074, 0.174],
    ]);
    // Every answer's final key replays from the puzzle board.
    for (const answer of puzzle.answers) {
      const final = answer.movements.reduce(
        (b, m) => applyMovement(b, 'white', m),
        puzzle.board,
      );
      expect(answer.finalKey).toBe(boardKey(final));
    }
  });
});

/** Black's double at play 1, correct ("Double, pass"; White should drop). */
const blackDouble: AnalyzedCube = {
  kind: 'cube',
  player: 'black',
  playIndex: 1,
  action: 'double',
  cubeValue: 1,
  properAction: 'Double, pass',
  noDoubleEquity: 0.4,
  doubleTakeEquity: 1.3,
  doublePassEquity: 1.0,
  error: null,
  equityLoss: 0,
  classification: 'ok',
  plies: 2,
};

/** White's answer: a wrong take blundering 0.3 (doubler-view equities). */
const whiteWrongTake: AnalyzedCube = {
  ...blackDouble,
  player: 'white',
  action: 'take',
  error: 'wrong-take',
  equityLoss: 0.3,
  classification: 'blunder',
};

describe('mining cube blunders', () => {
  it('turns a wrong take into a response puzzle from stored equities alone', async () => {
    const stub = rankPlaysStub();
    const puzzles = await mineBlunderPuzzles(
      minedMatch([blackDouble, whiteWrongTake]),
      { existing: [], rankPlays: stub.rankPlays },
    );

    expect(stub.calls).toHaveLength(0);
    expect(puzzles).toHaveLength(1);
    const puzzle = puzzles[0];
    expect(puzzle).toMatchObject({
      id: 'blunder:m1:0:1',
      kind: 'cube',
      theme: 'cube-handling',
      source: 'blunder',
      origin: { matchId: 'm1', game: 0, decision: 1 },
      hero: 'white',
      decision: 'response',
      verdict: 'Double, pass',
      match: {
        matchLength: 2,
        score: { white: 0, black: 0 },
        cube: { value: 1, owner: 'center' },
        crawford: false,
      },
    });
    expect(puzzle.board).toEqual(boardBefore(1));
    expect(puzzle.kind === 'cube' && puzzle.choices).toEqual([
      { action: 'pass', equity: -1.0, equityLoss: 0 },
      { action: 'take', equity: -1.3, equityLoss: 0.3 },
    ]);
  });

  it('turns a missed double into an offer puzzle at the pre-roll position', async () => {
    // At length 7 the taken 2-cube is live, so White's silent pre-roll at
    // play 2 is a cube opportunity the analyzer costed.
    const record7 = recordOf(cubeGameMatch(7));
    const missedDouble: AnalyzedCube = {
      kind: 'cube',
      player: 'white',
      playIndex: 2,
      action: 'no-double',
      cubeValue: 2,
      properAction: 'Redouble, take',
      noDoubleEquity: 0.3,
      doubleTakeEquity: 0.45,
      doublePassEquity: 1.0,
      error: 'missed-double',
      equityLoss: 0.15,
      classification: 'blunder',
      plies: 2,
    };
    const stub = rankPlaysStub();
    const puzzles = await mineBlunderPuzzles(
      minedMatch([missedDouble], {
        config: { length: 7, mode: 'computer', difficulty: 'casual' },
        record: record7,
      }),
      { existing: [], rankPlays: stub.rankPlays },
    );

    expect(puzzles).toHaveLength(1);
    const puzzle = puzzles[0];
    expect(puzzle).toMatchObject({
      id: 'blunder:m1:0:0',
      kind: 'cube',
      decision: 'offer',
      hero: 'white',
      verdict: 'Redouble, take',
      match: {
        matchLength: 7,
        score: { white: 0, black: 0 },
        cube: { value: 2, owner: 'white' },
        crawford: false,
      },
    });
    expect(puzzle.board).toEqual(boardBefore(2, record7.games[0]));
    expect(puzzle.kind === 'cube' && puzzle.choices).toEqual([
      { action: 'double', equity: 0.45, equityLoss: 0 },
      { action: 'no-double', equity: 0.3, equityLoss: 0.15 },
    ]);
  });
});

describe('what gets mined at all', () => {
  const stub = () => rankPlaysStub();

  it('uses the shared blunder threshold, inclusive', async () => {
    const atThreshold = {
      ...completePlayBlunder,
      equityLoss: CLASSIFICATION_THRESHOLDS.blunder,
    };
    const justBelow = {
      ...completePlayBlunder,
      equityLoss: CLASSIFICATION_THRESHOLDS.blunder - 0.0001,
      classification: 'error' as const,
    };
    expect(
      await mineBlunderPuzzles(minedMatch([atThreshold]), {
        existing: [],
        rankPlays: stub().rankPlays,
      }),
    ).toHaveLength(1);
    expect(
      await mineBlunderPuzzles(minedMatch([justBelow]), {
        existing: [],
        rankPlays: stub().rankPlays,
      }),
    ).toHaveLength(0);
  });

  it("skips the computer's blunders", async () => {
    const blackBlunder = { ...completePlayBlunder, player: 'black' as const };
    expect(
      await mineBlunderPuzzles(minedMatch([blackBlunder]), {
        existing: [],
        rankPlays: stub().rankPlays,
      }),
    ).toHaveLength(0);
  });

  it("mines the local side's blunders as Black-hero puzzles for a remote Black player", async () => {
    const blackPlay = game.game.plays[1];
    expect(blackPlay.player).toBe('black');
    const blackBlunder: AnalyzedPlay = {
      kind: 'play',
      player: 'black',
      playIndex: 1,
      roll: [6, 5],
      moveText: 'blunder',
      rank: 1,
      totalPlays: 1,
      alternatives: [alternative('blunder', 0, 0.3, true, blackPlay.movements)],
      equityLoss: 0.3,
      classification: 'blunder',
      plies: 2,
    };
    const remote = minedMatch([blackBlunder, completePlayBlunder], {
      config: { length: 2, mode: 'remote', localSide: 'black' },
    });

    const puzzles = await mineBlunderPuzzles(remote, {
      existing: [],
      rankPlays: stub().rankPlays,
    });

    // Only Black's decision is mined; White's is the opponent's.
    expect(puzzles).toHaveLength(1);
    const puzzle = puzzles[0] as PlayPuzzle;
    expect(puzzle.hero).toBe('black');
    expect(puzzle.board).toEqual(boardBefore(1));
    const final = blackPlay.movements.reduce(
      (b, movement) => applyMovement(b, 'black', movement),
      boardBefore(1),
    );
    expect(puzzle.answers[0].finalKey).toBe(boardKey(final));
  });

  it('skips hot-seat matches entirely', async () => {
    const hotseat = minedMatch([completePlayBlunder], {
      config: { length: 2, mode: 'hotseat', difficulty: 'casual' },
    });
    expect(
      await mineBlunderPuzzles(hotseat, {
        existing: [],
        rankPlays: stub().rankPlays,
      }),
    ).toHaveLength(0);
  });

  it('skips tutor-assisted games (the player had live help)', async () => {
    const assisted = minedMatch([completePlayBlunder], {
      record: {
        ...record,
        games: [{ ...record.games[0], tutorAssisted: true }],
      },
    });
    expect(
      await mineBlunderPuzzles(assisted, {
        existing: [],
        rankPlays: stub().rankPlays,
      }),
    ).toHaveLength(0);
  });

  it('skips unfinished matches and anything without a readable analysis', async () => {
    expect(
      await mineBlunderPuzzles(
        minedMatch([completePlayBlunder], { status: 'in-progress' }),
        { existing: [], rankPlays: stub().rankPlays },
      ),
    ).toHaveLength(0);
    expect(
      await mineBlunderPuzzles(
        minedMatch([completePlayBlunder], { analysis: { format: 99 } }),
        { existing: [], rankPlays: stub().rankPlays },
      ),
    ).toHaveLength(0);
    expect(
      await mineBlunderPuzzles(
        minedMatch([completePlayBlunder], {
          analysis: undefined,
        }),
        { existing: [], rankPlays: stub().rankPlays },
      ),
    ).toHaveLength(0);
  });
});

describe('dedupe', () => {
  it('skips a blunder already mined by origin, without touching the engine', async () => {
    const first = await mineBlunderPuzzles(minedMatch([completePlayBlunder]), {
      existing: [],
      rankPlays: rankPlaysStub().rankPlays,
    });
    // Re-mining (e.g. after deepening bumped analyzedAt) finds nothing new —
    // and an incomplete-table blunder never reaches the engine either.
    const probe = rankPlaysStub();
    const again = await mineBlunderPuzzles(
      minedMatch([{ ...incompletePlayBlunder, playIndex: 2, roll: [6, 2] }]),
      { existing: first, rankPlays: probe.rankPlays },
    );
    expect(again).toHaveLength(0);
    expect(probe.calls).toHaveLength(0);
  });

  it('skips an identical position + question mined from another game, keeping the earliest', async () => {
    const [original] = await mineBlunderPuzzles(
      minedMatch([completePlayBlunder]),
      { existing: [], rankPlays: rankPlaysStub().rankPlays },
    );
    const fromOtherMatch: Puzzle = {
      ...original,
      id: 'blunder:m0:1:4',
      origin: { matchId: 'm0', game: 1, decision: 4 },
    };
    const mined = await mineBlunderPuzzles(minedMatch([completePlayBlunder]), {
      existing: [fromOtherMatch],
      rankPlays: rankPlaysStub().rankPlays,
    });
    expect(mined).toHaveLength(0);
  });

  it('mines one puzzle when the same run meets the same content twice', async () => {
    const mined = await mineBlunderPuzzles(
      minedMatch([completePlayBlunder, completePlayBlunder]),
      { existing: [], rankPlays: rankPlaysStub().rankPlays },
    );
    expect(mined).toHaveLength(1);
  });
});

describe('mining a play blunder whose stored table is partial', () => {
  it('completes the answer table with one engine ranking', async () => {
    const stub = rankPlaysStub([
      rankedPlay(1, '8/5 6/5', 0.219, 0, [move(8, 5, 3), move(6, 5, 1)]),
      rankedPlay(2, '24/23 13/10', -0.011, 0.23, [
        move(24, 23, 1),
        move(13, 10, 3),
      ]),
    ]);
    const puzzles = await mineBlunderPuzzles(
      minedMatch([incompletePlayBlunder]),
      { existing: [], rankPlays: stub.rankPlays },
    );

    expect(stub.calls).toHaveLength(1);
    expect(stub.calls[0].roll).toEqual([3, 1]);
    expect(stub.calls[0].position.board).toEqual(boardBefore(0));
    expect(stub.calls[0].position.onRoll).toBe('white');
    expect(stub.calls[0].position.match).toMatchObject({
      matchLength: 2,
      score: { white: 0, black: 0 },
      cube: { value: 1, owner: 'center' },
    });

    expect(puzzles).toHaveLength(1);
    const puzzle = puzzles[0] as PlayPuzzle;
    expect(puzzle.id).toBe('blunder:m1:0:0');
    expect(puzzle.board).toEqual(boardBefore(0));
    expect(
      puzzle.answers.map((a) => [a.rank, a.moveText, a.equity, a.equityLoss]),
    ).toEqual([
      [1, '8/5 6/5', 0.219, 0],
      [2, '24/23 13/10', -0.011, 0.23],
    ]);
    for (const answer of puzzle.answers) {
      const final = answer.movements.reduce(
        (b, m) => applyMovement(b, 'white', m),
        puzzle.board,
      );
      expect(answer.finalKey).toBe(boardKey(final));
    }
  });
});
