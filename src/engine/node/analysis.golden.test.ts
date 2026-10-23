// @vitest-environment node
/**
 * Golden test for the analyzer (ticket 08, spec testing decision): a small
 * scripted game analyzed against the real vendored gnubg WASM, with
 * hand-verified equity losses, classifications and error rate.
 *
 * The script plays well-studied opening positions so the pinned numbers can
 * be sanity-checked against published opening theory: 24/23 13/10 on the
 * opening 3-1 is a textbook blunder (the 8/5 6/5 point play is best), the
 * 6-5 lover's leap is best, and doubling an even opening position is wrong.
 */
import { beforeAll, describe, expect, it } from 'vitest';
// Direct module imports keep the node-typed program free of browser-typed
// code (the analysis index pulls in the worker client and React wiring).
import { analyzeMatch } from '../../analysis/analyze';
import { deepenDecision } from '../../analysis/deepen';
import {
  acceptResignation,
  commitMatchPlay,
  type MatchRecord,
  matchMovement,
  offerDouble,
  offerResignation,
  rollTurn,
  startMatch,
  takeDouble,
} from '../../rules';
import { scriptedDice } from '../../test/dice';
import type { GnubgSession } from '../session';
import type { Engine } from '../types';
import { loadGnubgSession } from './loadGnubg';

let session: GnubgSession;

beforeAll(async () => {
  session = await loadGnubgSession();
}, 120_000);

/** The async Engine seam over the synchronous Node-loaded session. */
function engineOverSession(): Engine {
  return {
    status: 'ready',
    onStatusChange: () => () => {},
    initialize: () => Promise.resolve(),
    evaluate: (position) => Promise.resolve(session.evaluate(position)),
    rankPlays: (position, roll, options) =>
      Promise.resolve(session.rankPlays(position, roll, options)),
    cubeInfo: (position, options) =>
      Promise.resolve(session.cubeInfo(position, options)),
    dispose: () => {},
  };
}

/**
 * The scripted game, in a 7-point match:
 *   1. White opens 3-1 with 24/23 13/10 (a known blunder; 8/5 6/5 is best).
 *   2. Black doubles the roughly even position (wrong double); White takes
 *      (clearly correct — passing hands over a point).
 *   3. Black plays the 6-5 lover's leap 24/18 18/13 (best).
 *   4. White silently holds the 2-cube (correct) and plays 6-2 as
 *      24/18 13/11 (best or near-best).
 *   5. White resigns a single; the resignation itself is not analyzed.
 */
function goldenRecord(): MatchRecord {
  let match = startMatch(7, scriptedDice(3, 1));
  match = matchMovement(match, 24, 1);
  match = matchMovement(match, 13, 3);
  match = commitMatchPlay(match);
  match = takeDouble(offerDouble(match));
  match = rollTurn(match, scriptedDice(6, 5));
  match = matchMovement(match, 1, 6);
  match = matchMovement(match, 7, 5);
  match = commitMatchPlay(match);
  match = rollTurn(match, scriptedDice(6, 2));
  match = matchMovement(match, 24, 6);
  match = matchMovement(match, 13, 2);
  match = commitMatchPlay(match);
  match = acceptResignation(offerResignation(match, 'white', 'single'));
  return { length: match.length, games: match.games };
}

describe('post-game analysis against the real engine', () => {
  it('produces the hand-verified review of the scripted game', async () => {
    const analysis = await analyzeMatch(goldenRecord(), {
      engine: engineOverSession(),
      now: () => 0,
    });

    expect(analysis.format).toBe(1);
    expect(analysis.games).toHaveLength(1);
    const decisions = analysis.games[0].decisions;
    expect(
      decisions.map((d) =>
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

    // Play 1 — White's 24/23 13/10 is a textbook blunder: the engine ranks
    // it #2 of 16, 0.230 behind the 8/5 6/5 point play (2-ply +0.219).
    const opening = decisions[0];
    expect(opening).toMatchObject({
      kind: 'play',
      player: 'white',
      moveText: '24/23 13/10',
      rank: 2,
      totalPlays: 16,
      classification: 'blunder',
      plies: 2,
    });
    expect(opening.equityLoss).toBeCloseTo(0.23, 3);
    if (opening.kind === 'play') {
      expect(opening.alternatives[0].moveText).toBe('8/5 6/5');
      expect(opening.alternatives[0].equity).toBeCloseTo(0.219, 3);
      expect(opening.alternatives.find((a) => a.played)?.moveText).toBe(
        '24/23 13/10',
      );
    }

    // Black doubles a dead-even position: a 0.337 wrong double (the engine
    // says "No double, take": +0.011 rolling on, -0.326 doubled and taken).
    const double = decisions[1];
    expect(double).toMatchObject({
      kind: 'cube',
      player: 'black',
      action: 'double',
      cubeValue: 1,
      error: 'wrong-double',
      classification: 'blunder',
      properAction: 'No double, take',
    });
    expect(double.equityLoss).toBeCloseTo(0.337, 3);
    if (double.kind === 'cube') {
      expect(double.noDoubleEquity).toBeCloseTo(0.011, 3);
      expect(double.doubleTakeEquity).toBeCloseTo(-0.326, 3);
      expect(double.doublePassEquity).toBeCloseTo(1, 3);
    }

    // White's take is clearly correct (passing concedes a full point).
    expect(decisions[2]).toMatchObject({
      kind: 'cube',
      player: 'white',
      action: 'take',
      error: null,
      classification: 'ok',
      equityLoss: 0,
    });

    // Black's 6-5 lover's leap is the engine's best play: no loss.
    expect(decisions[3]).toMatchObject({
      kind: 'play',
      player: 'black',
      moveText: '24/13',
      rank: 1,
      classification: 'ok',
      equityLoss: 0,
    });

    // White correctly holds the 2-cube ("No redouble, take").
    const hold = decisions[4];
    expect(hold).toMatchObject({
      kind: 'cube',
      player: 'white',
      action: 'no-double',
      cubeValue: 2,
      error: null,
      classification: 'ok',
      equityLoss: 0,
    });
    expect(hold.kind === 'cube' && hold.properAction).toMatch(/no redouble/i);

    // With builders on the 10- and 6-points, the 6-2 belongs on the 4-point:
    // 10/4 6/4 is best, and the routine 24/18 13/11 run drops 0.174.
    const run = decisions[5];
    expect(run).toMatchObject({
      kind: 'play',
      player: 'white',
      moveText: '24/18 13/11',
      rank: 4,
      totalPlays: 25,
      classification: 'blunder',
    });
    expect(run.equityLoss).toBeCloseTo(0.174, 3);
    if (run.kind === 'play') {
      expect(run.alternatives[0].moveText).toBe('10/4 6/4');
    }

    // Error rate = total equity lost / unforced decisions, per player:
    // White lost 0.230 + 0 + 0 + 0.174 = 0.404 over 4 decisions;
    // Black lost 0.337 + 0 = 0.337 over 2 decisions.
    expect(analysis.white.decisions).toBe(4);
    expect(analysis.white.equityLost).toBeCloseTo(0.404, 3);
    expect(analysis.white.errorRate).toBeCloseTo(0.101, 3);
    expect(analysis.white.blunders).toBe(2);
    expect(analysis.black.decisions).toBe(2);
    expect(analysis.black.equityLost).toBeCloseTo(0.337, 3);
    expect(analysis.black.errorRate).toBeCloseTo(0.1685, 3);
    expect(analysis.black.blunders).toBe(1);
  }, 300_000);

  it('deepens a single decision to 3-ply and visibly refines the numbers', async () => {
    const record = goldenRecord();
    const engine = engineOverSession();
    const analysis = await analyzeMatch(record, { engine, now: () => 0 });

    // The opening blunder at 3-ply: same verdict, visibly refined equities
    // (8/5 6/5 moves from +0.219 to +0.233; the loss from 0.230 to 0.242).
    const deepened = await deepenDecision(record, analysis, {
      gameIndex: 0,
      decisionIndex: 0,
      engine,
      now: () => 0,
    });
    const play = deepened.games[0].decisions[0];
    expect(play).toMatchObject({
      kind: 'play',
      plies: 3,
      rank: 2,
      classification: 'blunder',
    });
    expect(play.equityLoss).toBeCloseTo(0.242, 3);
    expect(play.equityLoss).not.toBeCloseTo(0.23, 3);
    if (play.kind === 'play') {
      expect(play.alternatives[0].equity).toBeCloseTo(0.233, 3);
    }
    // The untouched decisions and the totals follow along.
    expect(deepened.games[0].decisions[1]).toEqual(
      analysis.games[0].decisions[1],
    );
    expect(deepened.white.equityLost).toBeCloseTo(0.416, 3);

    // Deepening the double refreshes both halves of the cube decision.
    const deepCube = await deepenDecision(record, analysis, {
      gameIndex: 0,
      decisionIndex: 1,
      engine,
      now: () => 0,
    });
    const deepDouble = deepCube.games[0].decisions[1];
    expect(deepDouble).toMatchObject({
      kind: 'cube',
      action: 'double',
      plies: 3,
      error: 'wrong-double',
      classification: 'blunder',
    });
    if (deepDouble.kind === 'cube') {
      expect(deepDouble.noDoubleEquity).toBeCloseTo(0.009, 3);
    }
    expect(deepCube.games[0].decisions[2]).toMatchObject({
      kind: 'cube',
      action: 'take',
      plies: 3,
      error: null,
    });
  }, 300_000);
});
