import { describe, expect, it } from 'vitest';
import { createFakeEngine } from '../engine/fake';
import {
  acceptResignation,
  commitMatchPlay,
  createBoard,
  createGame,
  createMatch,
  type MatchState,
  matchMovement,
  nextGame,
  offerDouble,
  offerResignation,
  passDouble,
  startMatch,
} from '../rules';
import { scriptedDice } from '../test/dice';
import { cubeGameMatch as cubeGame } from '../test/match';
import { analyzeGame, analyzeMatch } from './analyze';
import { isMatchAnalysis } from './types';

const STANDING = { length: 7, score: { white: 0, black: 0 } } as const;

describe('analyzeGame', () => {
  it('scores every unforced play and cube decision, in game order', async () => {
    const analysis = await analyzeGame(cubeGame().games[0], STANDING, {
      engine: createFakeEngine(),
    });

    expect(
      analysis.decisions.map((d) =>
        d.kind === 'play'
          ? `play@${d.playIndex}`
          : `${d.action}@${d.playIndex}`,
      ),
    ).toEqual([
      'play@0',
      'double@1',
      'take@1',
      'play@1',
      'no-double@2',
      'play@2',
    ]);
  });

  it('costs the plays against the engine’s best with shared thresholds', async () => {
    const analysis = await analyzeGame(cubeGame().games[0], STANDING, {
      engine: createFakeEngine(),
    });
    const plays = analysis.decisions.filter((d) => d.kind === 'play');

    for (const play of plays) {
      expect(play.plies).toBe(2);
      expect(play.equityLoss).toBeGreaterThanOrEqual(0);
      expect(play.rank).toBeGreaterThanOrEqual(1);
      expect(play.totalPlays).toBeGreaterThan(1);
      // The alternatives carry the best play first and the played play somewhere.
      expect(play.alternatives[0].equityLoss).toBe(0);
      const played = play.alternatives.filter((a) => a.played);
      expect(played).toHaveLength(1);
      expect(played[0].moveText).toBe(play.moveText);
      expect(played[0].equityLoss).toBeCloseTo(play.equityLoss, 10);
      expect(play.alternatives.length).toBeLessThanOrEqual(6);
    }
  });

  it('classifies Black’s early double as a costed cube error', async () => {
    const analysis = await analyzeGame(cubeGame().games[0], STANDING, {
      engine: createFakeEngine(),
    });
    const double = analysis.decisions.find(
      (d) => d.kind === 'cube' && d.action === 'double',
    );

    // Hand-worked from the fake's documented heuristic (equity = pip lead/50):
    // Black trails by 4 pips after 8/5 6/5, so no-double = -0.08 and
    // double/take doubles it to -0.16: a 0.08 wrong double — a blunder.
    expect(double).toMatchObject({
      player: 'black',
      cubeValue: 1,
      error: 'wrong-double',
      classification: 'blunder',
    });
    expect(double?.equityLoss).toBeCloseTo(0.08, 6);

    const take = analysis.decisions.find(
      (d) => d.kind === 'cube' && d.action === 'take',
    );
    expect(take).toMatchObject({
      player: 'white',
      error: null,
      classification: 'ok',
      equityLoss: 0,
    });

    const held = analysis.decisions.find(
      (d) => d.kind === 'cube' && d.action === 'no-double',
    );
    expect(held).toMatchObject({
      player: 'white',
      cubeValue: 2,
      error: null,
      classification: 'ok',
    });
  });

  it('summarizes per player: error rate is equity lost over decisions', async () => {
    const analysis = await analyzeGame(cubeGame().games[0], STANDING, {
      engine: createFakeEngine(),
    });

    for (const player of ['white', 'black'] as const) {
      const mine = analysis.decisions.filter((d) => d.player === player);
      const summary = analysis[player];
      expect(summary.decisions).toBe(mine.length);
      const lost = mine.reduce((sum, d) => sum + d.equityLoss, 0);
      expect(summary.equityLost).toBeCloseTo(lost, 10);
      expect(summary.errorRate).toBeCloseTo(lost / mine.length, 10);
      expect(summary.blunders).toBe(
        mine.filter((d) => d.classification === 'blunder').length,
      );
    }
    // White: two plays, the take and the silent hold; Black: a play and the double.
    expect(analysis.white.decisions).toBe(4);
    expect(analysis.black.decisions).toBe(2);
    expect(analysis.black.blunders).toBe(1);
  });

  it('skips forced plays and dances entirely', async () => {
    // White's only legal play is entering from the bar with the 1.
    const board = createBoard({
      white: { points: { 6: 5, 8: 4, 13: 4 }, bar: 2 },
      black: { points: { 19: 2, 20: 2, 21: 2, 22: 2, 23: 2, 12: 5 } },
    });
    let match = createMatch({
      length: 7,
      game: createGame({ board, player: 'white', roll: [3, 1] }),
    });
    match = matchMovement(match, 'bar', 1);
    match = commitMatchPlay(match);
    const settled = acceptResignation(
      offerResignation(match, 'white', 'single'),
    );

    const analysis = await analyzeGame(settled.games[0], STANDING, {
      engine: createFakeEngine(),
    });
    expect(analysis.decisions).toEqual([]);
    expect(analysis.white.decisions).toBe(0);
    expect(analysis.white.errorRate).toBe(0);
  });

  it('is deterministic', async () => {
    const game = cubeGame().games[0];
    const a = await analyzeGame(game, STANDING, { engine: createFakeEngine() });
    const b = await analyzeGame(game, STANDING, { engine: createFakeEngine() });
    expect(a).toEqual(b);
  });
});

describe('analyzeMatch', () => {
  function twoGameMatch(): MatchState {
    // Game 1: White plays, Black doubles, White passes (Black +1).
    let match = startMatch(7, scriptedDice(3, 1));
    match = matchMovement(match, 8, 3);
    match = matchMovement(match, 6, 1);
    match = commitMatchPlay(match);
    match = passDouble(offerDouble(match));
    // Game 2: Black wins the opening roll 6-5, plays the lover's leap,
    // and White resigns a single at its first pre-roll.
    match = nextGame(match, scriptedDice(5, 6));
    match = matchMovement(match, 1, 6);
    match = matchMovement(match, 7, 5);
    match = commitMatchPlay(match);
    return acceptResignation(offerResignation(match, 'white', 'single'));
  }

  it('analyzes every game at its standing and totals the summaries', async () => {
    const match = twoGameMatch();
    const record = { length: match.length, games: match.games };
    const analysis = await analyzeMatch(record, {
      engine: createFakeEngine(),
      now: () => 1234,
    });

    expect(analysis.format).toBe(1);
    expect(analysis.analyzedAt).toBe(1234);
    expect(analysis.games).toHaveLength(2);
    for (const player of ['white', 'black'] as const) {
      expect(analysis[player].decisions).toBe(
        analysis.games[0][player].decisions +
          analysis.games[1][player].decisions,
      );
      expect(analysis[player].equityLost).toBeCloseTo(
        analysis.games[0][player].equityLost +
          analysis.games[1][player].equityLost,
        10,
      );
    }
    expect(isMatchAnalysis(analysis)).toBe(true);
    expect(isMatchAnalysis({ format: 99 })).toBe(false);
    expect(isMatchAnalysis(null)).toBe(false);
  });

  it('reports progress per analyzed position', async () => {
    const match = cubeGame();
    const record = { length: match.length, games: match.games };
    const seen: Array<[number, number]> = [];
    await analyzeMatch(record, {
      engine: createFakeEngine(),
      onProgress: (done, total) => seen.push([done, total]),
    });

    // Five engine round-trips: three plays, the double, the silent hold.
    expect(seen).toHaveLength(5);
    expect(seen.at(-1)).toEqual([5, 5]);
    expect(seen.every(([done, total]) => done <= total && total === 5)).toBe(
      true,
    );
  });

  it('survives JSON round-tripping (plain serializable data)', async () => {
    const match = cubeGame();
    const record = { length: match.length, games: match.games };
    const analysis = await analyzeMatch(record, {
      engine: createFakeEngine(),
      now: () => 1,
    });
    expect(JSON.parse(JSON.stringify(analysis))).toEqual(analysis);
  });
});
