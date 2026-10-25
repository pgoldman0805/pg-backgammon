// @vitest-environment node
/**
 * Golden positions for the analyzer (ticket 45), pinned against the real
 * vendored gnubg WASM. The scripted-game golden (analysis.golden.test.ts)
 * covers the opening; this file extends coverage past it to the three phases
 * that stress the analyzer differently: a pure BEAR-OFF race, a BACKGAME, and
 * a SCORE-DEPENDENT cube decision whose take point moves with the match score.
 *
 * Every number below was read from the real engine and cross-checked against
 * backgammon theory (noted at each assertion); the equities are deterministic
 * at full strength, so they pin to three decimals exactly like the opening
 * golden. Positions are hand-built with the rules-engine board constructor so
 * the checker layout is legible in source. These drive the real analyzer
 * (analyzePlayMoment / analyzeCubeMoment / assembleGameAnalysis) over the
 * node-loaded session, so ranks, equity losses, classifications, cube errors
 * and per-player error rate are all exercised against ground truth.
 */
import { beforeAll, describe, expect, it } from 'vitest';
import {
  analyzeCubeMoment,
  analyzePlayMoment,
  assembleGameAnalysis,
} from '../../analysis/analyze';
import type { CubeActionMoment, PlayMoment } from '../../analysis/walk';
import {
  type CheckerMovement,
  createBoard,
  type DiceRoll,
  isRace,
  type Player,
} from '../../rules';
import type { GnubgSession } from '../session';
import type { Engine, EnginePosition, MatchContext } from '../types';
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

const CENTERED_CUBE = { value: 1, owner: 'center' as const };

/** The movements of a specific engine-ranked play, to replay it as "played". */
function movementsFor(
  position: EnginePosition,
  roll: DiceRoll,
  moveText: string,
): readonly CheckerMovement[] {
  const ranked = session.rankPlays(position, roll);
  const found = ranked.find((p) => p.moveText === moveText);
  if (!found) {
    throw new Error(
      `no play "${moveText}" for ${roll[0]}-${roll[1]}; got ` +
        ranked.map((p) => p.moveText).join(', '),
    );
  }
  return found.play.movements;
}

/** Build a play moment faced from `position`, as if `moveText` were committed. */
function playMoment(
  position: EnginePosition,
  roll: DiceRoll,
  moveText: string,
  player: Player = 'white',
): PlayMoment {
  const played = movementsFor(position, roll, moveText);
  return {
    kind: 'play',
    playIndex: 0,
    player,
    roll,
    board: position.board,
    context: position.match as MatchContext,
    played,
    legalPlayCount: session.rankPlays(position, roll).length,
  };
}

describe('golden bear-off: a pure race', () => {
  // Equal pip counts (51 each), White on roll, every checker home: a pure
  // race with no contact and no gammon in sight.
  const position: EnginePosition = {
    board: createBoard({
      white: { points: { 6: 2, 5: 2, 4: 3, 3: 3, 2: 3, 1: 2 } },
      black: { points: { 19: 2, 20: 2, 21: 3, 22: 3, 23: 3, 24: 2 } },
    }),
    onRoll: 'white',
    match: {
      matchLength: 0,
      score: { white: 0, black: 0 },
      cube: CENTERED_CUBE,
    },
  };

  it('is a contact-free race the on-roll player narrowly leads', () => {
    expect(isRace(position.board)).toBe(true);
    const evaluation = session.evaluate(position);
    // On roll in an equal race, White is the favourite but it is no runaway.
    expect(evaluation.chances.win).toBeCloseTo(0.655, 2);
    expect(evaluation.chances.winGammon).toBe(0);
    expect(evaluation.chances.loseGammon).toBe(0);
    expect(evaluation.equity).toBeCloseTo(0.309, 2);
  });

  it('ranks bearing two men off best and bearing one off the 6 a blunder', async () => {
    const engine = engineOverSession();
    // Textbook: with 4-2, taking two men off (4/off 2/off) beats bearing a
    // single checker off the 6-point — the engine confirms a 0.154 gap.
    const blunder = await analyzePlayMoment(
      playMoment(position, [4, 2], '6/off'),
      engine,
    );
    expect(blunder).toMatchObject({
      kind: 'play',
      player: 'white',
      moveText: '6/off',
      rank: 2,
      totalPlays: 14,
      classification: 'blunder',
      plies: 2,
    });
    expect(blunder.equityLoss).toBeCloseTo(0.154, 3);
    if (blunder.kind === 'play') {
      expect(blunder.alternatives[0].moveText).toBe('4/off 2/off');
      expect(blunder.alternatives[0].equity).toBeCloseTo(0.311, 3);
      expect(blunder.alternatives[0].played).toBe(false);
      expect(blunder.alternatives.find((a) => a.played)?.moveText).toBe(
        '6/off',
      );
    }

    // The best play itself: rank 1, nothing lost.
    const best = await analyzePlayMoment(
      playMoment(position, [4, 2], '4/off 2/off'),
      engine,
    );
    expect(best).toMatchObject({ rank: 1, classification: 'ok' });
    expect(best.equityLoss).toBe(0);

    // Per-player error rate over these two White decisions: 0.154 across 2
    // unforced plays = 0.077, one blunder.
    const game = assembleGameAnalysis([blunder, best]);
    expect(game.white.decisions).toBe(2);
    expect(game.white.equityLost).toBeCloseTo(0.154, 3);
    expect(game.white.errorRate).toBeCloseTo(0.077, 3);
    expect(game.white.blunders).toBe(1);
  }, 120_000);
});

describe('golden backgame: White in against a 1-3 backgame', () => {
  // Black holds the 1- and 3-point anchors deep in White's home (a 1-3
  // backgame) with timing on the midpoint; White is well ahead in the race
  // with a six-prime-ish structure and on roll.
  const position: EnginePosition = {
    board: createBoard({
      white: { points: { 9: 3, 8: 3, 7: 2, 6: 3, 5: 2, 4: 2 } },
      black: { points: { 1: 2, 3: 2, 13: 3, 19: 2, 20: 2, 21: 2, 22: 2 } },
    }),
    onRoll: 'white',
    match: {
      matchLength: 0,
      score: { white: 0, black: 0 },
      cube: CENTERED_CUBE,
    },
  };

  it('still has contact and heavy gammon stakes for the leader', () => {
    expect(isRace(position.board)).toBe(false);
    const evaluation = session.evaluate(position);
    // White a clear favourite, winning a quarter of the time by gammon; the
    // backgame keeps Black alive (~35% wins) via return shots.
    expect(evaluation.chances.win).toBeCloseTo(0.652, 2);
    expect(evaluation.chances.winGammon).toBeCloseTo(0.25, 2);
    expect(evaluation.chances.loseGammon).toBeCloseTo(0.026, 2);
    expect(evaluation.equity).toBeCloseTo(0.545, 2);
  });

  it('is a correct double the backgame can still take', async () => {
    const engine = engineOverSession();
    const analysis = session.cubeInfo(position);
    // "Double, take": White should turn the cube, and Black's return shots
    // and gammon chances are just enough to take rather than pass.
    expect(analysis.properAction).toBe('Double, take');

    // Replaying the take: doubling is right, the take is right, and passing
    // would throw away 0.147 (doublePass 1 vs the 0.853 take).
    const [doubled, taken] = await analyzeCubeMoment(
      {
        kind: 'cube-action',
        playIndex: 0,
        doubler: 'white',
        responder: 'black',
        response: 'take',
        board: position.board,
        context: position.match as MatchContext,
      } satisfies CubeActionMoment,
      engine,
    );
    expect(doubled).toMatchObject({
      kind: 'cube',
      player: 'white',
      action: 'double',
      error: null,
      equityLoss: 0,
    });
    expect(doubled.noDoubleEquity).toBeCloseTo(0.82, 3);
    expect(doubled.doubleTakeEquity).toBeCloseTo(0.853, 3);
    expect(doubled.doublePassEquity).toBeCloseTo(1, 3);
    expect(taken).toMatchObject({
      player: 'black',
      action: 'take',
      error: null,
      equityLoss: 0,
    });

    // The same double passed instead would be a wrong-pass blunder of 0.147.
    const [, passed] = await analyzeCubeMoment(
      {
        kind: 'cube-action',
        playIndex: 0,
        doubler: 'white',
        responder: 'black',
        response: 'pass',
        board: position.board,
        context: position.match as MatchContext,
      } satisfies CubeActionMoment,
      engine,
    );
    expect(passed).toMatchObject({
      player: 'black',
      action: 'pass',
      error: 'wrong-pass',
      classification: 'blunder',
    });
    expect(passed.equityLoss).toBeCloseTo(0.147, 3);
  }, 120_000);

  it('rates safe consolidation best and crashing the board catastrophic', async () => {
    const engine = engineOverSession();
    // With 5-2, consolidating onto the 2-point (9/2) holds the structure;
    // stripping two points to bury on the 2 (7/2 4/2) is the worst of the 9
    // plays and hands Black the game — a 1.248 blunder.
    const crash = await analyzePlayMoment(
      playMoment(position, [5, 2], '7/2 4/2'),
      engine,
    );
    expect(crash).toMatchObject({
      kind: 'play',
      player: 'white',
      moveText: '7/2 4/2',
      rank: 9,
      totalPlays: 9,
      classification: 'blunder',
    });
    expect(crash.equityLoss).toBeCloseTo(1.248, 3);
    if (crash.kind === 'play') {
      expect(crash.alternatives[0].moveText).toBe('9/2');
      expect(crash.alternatives[0].equity).toBeCloseTo(0.848, 3);
      expect(crash.alternatives.find((a) => a.played)?.equity).toBeCloseTo(
        -0.4,
        3,
      );
    }
  }, 120_000);
});

describe('golden score-dependent cube: a shifting take point', () => {
  // A gammonish position (White ~80% wins, ~14% gammons) with Black holding
  // back-checkers. Money: Black must pass. At 2-away/4-away the trailer's
  // take point drops — a gammon loss costs nothing beyond the single that
  // already loses the match — so the same double becomes a take.
  const board = createBoard({
    white: { points: { 8: 3, 6: 2, 5: 2, 4: 2, 3: 2, 13: 4 } },
    black: { points: { 1: 2, 24: 2, 23: 2, 22: 2, 21: 3, 19: 2, 20: 2 } },
  });
  const MONEY: MatchContext = {
    matchLength: 0,
    score: { white: 0, black: 0 },
    cube: CENTERED_CUBE,
  };
  // 7-point match, White 5 (2-away) doubling Black 3 (4-away).
  const TWO_AWAY_FOUR_AWAY: MatchContext = {
    matchLength: 7,
    score: { white: 5, black: 3 },
    cube: CENTERED_CUBE,
  };

  it('is a clear money pass that Black must decline', async () => {
    const engine = engineOverSession();
    const analysis = session.cubeInfo({ board, onRoll: 'white', match: MONEY });
    expect(analysis.properAction).toBe('Double, pass');

    const [doubled, taken] = await analyzeCubeMoment(
      {
        kind: 'cube-action',
        playIndex: 0,
        doubler: 'white',
        responder: 'black',
        response: 'take',
        board,
        context: MONEY,
      } satisfies CubeActionMoment,
      engine,
    );
    // The double is correct (a market-losing gammon threat).
    expect(doubled).toMatchObject({ action: 'double', error: null });
    expect(doubled.noDoubleEquity).toBeCloseTo(0.903, 3);
    expect(doubled.doubleTakeEquity).toBeCloseTo(1.287, 3);
    expect(doubled.doublePassEquity).toBeCloseTo(1, 3);
    // Taking for money is a 0.287 blunder: the position plays past the drop.
    expect(taken).toMatchObject({
      player: 'black',
      action: 'take',
      error: 'wrong-take',
      classification: 'blunder',
    });
    expect(taken.equityLoss).toBeCloseTo(0.287, 3);
  }, 120_000);

  it('becomes a take at 2-away/4-away as the take point drops', async () => {
    const engine = engineOverSession();
    const analysis = session.cubeInfo({
      board,
      onRoll: 'white',
      match: TWO_AWAY_FOUR_AWAY,
    });
    // At this score the leader should even hold the cube: the undoubled
    // gammon already wins the match.
    expect(analysis.properAction).toBe('No double, take');

    const [, taken] = await analyzeCubeMoment(
      {
        kind: 'cube-action',
        playIndex: 0,
        doubler: 'white',
        responder: 'black',
        response: 'take',
        board,
        context: TWO_AWAY_FOUR_AWAY,
      } satisfies CubeActionMoment,
      engine,
    );
    expect(taken.doubleTakeEquity).toBeCloseTo(0.873, 3);
    expect(taken.doublePassEquity).toBeCloseTo(1, 3);
    // The identical take is now correct — the money blunder has vanished.
    expect(taken).toMatchObject({
      player: 'black',
      action: 'take',
      error: null,
      equityLoss: 0,
      classification: 'ok',
    });
  }, 120_000);
});
