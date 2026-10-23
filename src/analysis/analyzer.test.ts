import { describe, expect, it } from 'vitest';
import type { Engine } from '../engine';
import { createFakeEngine } from '../engine/fake';
import {
  acceptResignation,
  commitMatchPlay,
  initialBoard,
  matchMovement,
  nextGame,
  offerDouble,
  offerResignation,
  passDouble,
  startMatch,
} from '../rules';
import { scriptedDice } from '../test/dice';
import { cubeGameMatch as cubeGame, recordOf } from '../test/match';
import { analyzeMatch } from './analyze';
import { createMatchAnalyzer } from './analyzer';

/** Wrap an engine, counting its analysis calls. */
function counted(engine: Engine): Engine & { calls: number } {
  const wrapped = {
    ...engine,
    calls: 0,
    rankPlays: ((...args: Parameters<Engine['rankPlays']>) => {
      wrapped.calls += 1;
      return engine.rankPlays(...args);
    }) as Engine['rankPlays'],
    cubeInfo: ((...args: Parameters<Engine['cubeInfo']>) => {
      wrapped.calls += 1;
      return engine.cubeInfo(...args);
    }) as Engine['cubeInfo'],
  };
  return wrapped;
}

describe('analyzePosition', () => {
  const position = {
    board: startMatch(7, scriptedDice(3, 1)).game.board,
    onRoll: 'white',
    match: { matchLength: 7, score: { white: 0, black: 0 } },
  } as const;

  it('ranks the plays of a single position when dice are given', async () => {
    const analyzer = createMatchAnalyzer({ engine: createFakeEngine() });

    const result = await analyzer.analyzePosition(position, [3, 1]);

    expect(result.kind).toBe('plays');
    if (result.kind === 'plays') {
      expect(result.plays.length).toBeGreaterThan(1);
      expect(result.plays[0].rank).toBe(1);
      expect(result.plays[0].equityLoss).toBe(0);
    }
  });

  it('analyzes the cube decision when no dice are given', async () => {
    const analyzer = createMatchAnalyzer({ engine: createFakeEngine() });

    const result = await analyzer.analyzePosition(position, null);

    expect(result.kind).toBe('cube');
    if (result.kind === 'cube') {
      expect(result.cube.properAction).toMatch(/double/i);
      expect(result.cube.options.length).toBeGreaterThan(0);
    }
  });
});

describe('createMatchAnalyzer', () => {
  it('produces the same analysis as the plain pipeline', async () => {
    const record = recordOf(cubeGame());
    const analyzer = createMatchAnalyzer({
      engine: createFakeEngine(),
      now: () => 7,
    });
    const direct = await analyzeMatch(record, {
      engine: createFakeEngine(),
      now: () => 7,
    });
    expect(await analyzer.analyzeMatch(record)).toEqual(direct);
  });

  it('caches per game: a game analyzed in the background is free at match end', async () => {
    const match = cubeGame();
    const record = recordOf(match);
    const engine = counted(createFakeEngine());
    const analyzer = createMatchAnalyzer({ engine, now: () => 7 });

    await analyzer.analyzeGame(record.games[0], {
      length: 7,
      score: { white: 0, black: 0 },
    });
    const callsAfterGame = engine.calls;
    expect(callsAfterGame).toBeGreaterThan(0);

    await analyzer.analyzeMatch(record);
    expect(engine.calls).toBe(callsAfterGame);
  });

  it('does not poison the cache when analysis fails', async () => {
    const fake = createFakeEngine();
    let failures = 1;
    const flaky: Engine = {
      ...fake,
      rankPlays: (...args) => {
        if (failures > 0) {
          failures -= 1;
          return Promise.reject(new Error('engine busy'));
        }
        return fake.rankPlays(...args);
      },
    };
    const record = recordOf(cubeGame());
    const analyzer = createMatchAnalyzer({ engine: flaky, now: () => 7 });

    await expect(analyzer.analyzeMatch(record)).rejects.toThrow('engine busy');
    const direct = await analyzeMatch(record, {
      engine: createFakeEngine(),
      now: () => 7,
    });
    expect(await analyzer.analyzeMatch(record)).toEqual(direct);
  });

  it('reports game and position progress while analyzing a match', async () => {
    // Two games: a double passed, then a resigned game.
    let match = startMatch(7, scriptedDice(3, 1));
    match = matchMovement(match, 8, 3);
    match = matchMovement(match, 6, 1);
    match = commitMatchPlay(match);
    match = passDouble(offerDouble(match));
    match = nextGame(match, scriptedDice(5, 6));
    match = matchMovement(match, 1, 6);
    match = matchMovement(match, 7, 5);
    match = commitMatchPlay(match);
    match = acceptResignation(offerResignation(match, 'white', 'single'));

    const analyzer = createMatchAnalyzer({
      engine: createFakeEngine(),
      now: () => 7,
    });
    const seen: string[] = [];
    await analyzer.analyzeMatch(recordOf(match), {
      onProgress: (p) =>
        seen.push(`${p.game}/${p.games}:${p.position}/${p.positions}`),
    });
    // Game 1 has a play and a double; game 2 has a play.
    expect(seen).toEqual(['1/2:1/2', '1/2:2/2', '2/2:1/1']);
  });

  it('ranks plays for puzzle mining at full strength (ticket 12)', async () => {
    const engine = counted(createFakeEngine());
    const analyzer = createMatchAnalyzer({ engine, now: () => 7 });
    const position = { board: initialBoard(), onRoll: 'white' as const };

    const direct = await createFakeEngine().rankPlays(position, [3, 1]);
    expect(await analyzer.rankPlays(position, [3, 1], 'background')).toEqual(
      direct,
    );
    expect(engine.calls).toBe(1);
  });

  it('queues background mining rankings behind user-priority work', async () => {
    const fake = createFakeEngine();
    let release!: () => void;
    const held = new Promise<void>((resolve) => {
      release = resolve;
    });
    let first = true;
    const engine: Engine = {
      ...fake,
      rankPlays: async (position, roll, options) => {
        if (first) {
          first = false;
          await held;
        }
        return fake.rankPlays(position, roll, options);
      },
    };
    const analyzer = createMatchAnalyzer({ engine, now: () => 7 });
    const position = { board: initialBoard(), onRoll: 'white' as const };

    const order: string[] = [];
    const busy = analyzer
      .rankPlays(position, [3, 1], 'background')
      .then(() => order.push('held'));
    const mining = analyzer
      .rankPlays(position, [6, 2], 'background')
      .then(() => order.push('mining'));
    const user = analyzer
      .rankPlays(position, [5, 3], 'user')
      .then(() => order.push('user'));
    release();
    await Promise.all([busy, mining, user]);
    expect(order).toEqual(['held', 'user', 'mining']);
  });

  it('deepens through the same engine and keeps the refined match analysis', async () => {
    const record = recordOf(cubeGame());
    const analyzer = createMatchAnalyzer({
      engine: createFakeEngine(),
      now: () => 7,
    });
    const base = await analyzer.analyzeMatch(record);
    const deepened = await analyzer.deepen(record, base, {
      gameIndex: 0,
      decisionIndex: 0,
    });
    expect(deepened.games[0].decisions[0].plies).toBe(3);
  });
});
