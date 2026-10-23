import { describe, expect, it } from 'vitest';
import { initialBoard } from '../rules';
import { createGnubgSession } from './session';
import type { EnginePosition } from './types';

const OPENING: EnginePosition = {
  board: initialBoard(),
  onRoll: 'white',
  match: { matchLength: 7, score: { white: 0, black: 0 } },
};

const HINT_31 = [
  '    1. Cubeful 0-ply    8/5 6/5                      Eq.:  +0.219',
  '       0.551 0.174 0.013 - 0.449 0.124 0.005',
  '        0-ply cubeful prune [expert]',
  '    2. Cubeful 0-ply    24/23 13/10                  Eq.:  -0.012 ( -0.231)',
  '       0.497 0.137 0.008 - 0.503 0.140 0.007',
  '        0-ply cubeful prune [expert]',
  '    3. Cubeful 0-ply    24/20                        Eq.:  -0.020 ( -0.239)',
  '       0.497 0.125 0.005 - 0.503 0.135 0.004',
  '        0-ply cubeful prune [expert]',
];

const EVAL_OUTPUT = [
  '        Win     W(g)    W(bg)   L(g)    L(bg)   Equity    Cubeful  ',
  'static: 0.522   0.154   0.008   0.130   0.008    +0.068    +0.093   ',
  ' 1 ply: 0.527   0.148   0.009   0.129   0.005    +0.077    +0.106   ',
  ' 2 ply: 0.525   0.149   0.007   0.125   0.005    +0.077    +0.106   ',
];

const CUBE_BLOCK = [
  'Cube analysis',
  '2-ply cubeless equity  +0.077 (Money:  +0.076)',
  '  0.525 0.149 0.007 - 0.475 0.125 0.005',
  'Cubeful equities:',
  '1. No double            +0.106',
  '2. Double, pass         +1.000  ( +0.894)',
  '3. Double, take         -0.173  ( -0.279)',
  'Proper cube action: No double, take (23.8%)',
];

interface Scripted {
  commands: string[];
  run: (command: string) => readonly string[];
}

function scriptedRun(
  responses: Record<string, readonly string[]> = {},
): Scripted {
  const commands: string[] = [];
  return {
    commands,
    run: (command: string) => {
      commands.push(command);
      for (const [prefix, lines] of Object.entries(responses)) {
        if (command.startsWith(prefix)) {
          return lines;
        }
      }
      return [];
    },
  };
}

describe('createGnubgSession', () => {
  it('ranks plays joined to legal rules-engine plays with equity losses', () => {
    const { run } = scriptedRun({ hint: HINT_31 });
    const session = createGnubgSession(run);
    const ranked = session.rankPlays(OPENING, [3, 1]);
    expect(ranked).toHaveLength(3);
    expect(ranked[0].moveText).toBe('8/5 6/5');
    expect(ranked[0].rank).toBe(1);
    expect(ranked[0].equity).toBe(0.219);
    expect(ranked[0].equityLoss).toBe(0);
    expect(ranked[0].play.movements).toHaveLength(2);
    expect(ranked[1].equityLoss).toBeCloseTo(0.231, 10);
    expect(ranked[2].play.player).toBe('white');
  });

  it('re-establishes the position before each hint (engine caches by position)', () => {
    const { run, commands } = scriptedRun({ hint: HINT_31 });
    const session = createGnubgSession(run);
    session.rankPlays(OPENING, [3, 1]);
    const hintIndex = commands.findIndex((c) => c.startsWith('hint'));
    const tail = commands.slice(0, hintIndex);
    expect(tail).toContain('clear hint');
    expect(tail.some((c) => c.startsWith('new match'))).toBe(true);
    expect(
      tail.some((c) =>
        c.startsWith('set xgid -b----E-C---eE---c-e----B-:0:0:1:31'),
      ),
    ).toBe(true);
  });

  it('requests full strength at 2-ply and difficulties at their plies', () => {
    const { run, commands } = scriptedRun({ hint: HINT_31 });
    const session = createGnubgSession(run);
    session.rankPlays(OPENING, [3, 1]);
    expect(commands).toContain('set evaluation chequerplay evaluation plies 2');
    session.rankPlays(OPENING, [3, 1], { difficulty: 'beginner' });
    expect(commands).toContain('set evaluation chequerplay evaluation plies 0');
  });

  it('applies deterministic difficulty noise to the ranking', () => {
    const { run } = scriptedRun({ hint: HINT_31 });
    const session = createGnubgSession(run);
    const clean = session.rankPlays(OPENING, [3, 1]);
    const noisyA = session.rankPlays(OPENING, [3, 1], {
      difficulty: 'beginner',
    });
    const noisyB = session.rankPlays(OPENING, [3, 1], {
      difficulty: 'beginner',
    });
    expect(noisyA).toEqual(noisyB);
    expect(noisyA.map((p) => p.equity)).not.toEqual(clean.map((p) => p.equity));
    // Ranks and losses are consistent with the noisy ordering.
    expect(noisyA[0].rank).toBe(1);
    expect(noisyA[0].equityLoss).toBe(0);
    for (let i = 1; i < noisyA.length; i++) {
      expect(noisyA[i].equity).toBeLessThanOrEqual(noisyA[i - 1].equity);
    }
  });

  it('returns an empty ranking for a dance without consulting the engine', () => {
    const { run, commands } = scriptedRun();
    const session = createGnubgSession(run);
    // White on the bar; black holds a full prime on 19-24, so entry with
    // either die (25-3=22, 25-1=24) is blocked: a dance.
    const danceBoard = {
      points: (() => {
        const points = new Array<number>(25).fill(0);
        points[13] = 5;
        points[8] = 4;
        points[6] = 3;
        points[5] = 2;
        for (let p = 19; p <= 24; p++) {
          points[p] = -2;
        }
        points[12] = -3;
        return points;
      })(),
      bar: { white: 1, black: 0 },
      off: { white: 0, black: 0 },
    };
    const before = commands.length;
    const ranked = session.rankPlays(
      { board: danceBoard, onRoll: 'white' },
      [3, 1],
    );
    expect(ranked).toEqual([]);
    expect(commands.slice(before).some((c) => c.startsWith('hint'))).toBe(
      false,
    );
  });

  it('evaluates a position from the 2-ply eval row', () => {
    const { run } = scriptedRun({ eval: EVAL_OUTPUT });
    const session = createGnubgSession(run);
    const evaluation = session.evaluate(OPENING);
    expect(evaluation).toEqual({
      plies: 2,
      equity: 0.077,
      cubefulEquity: 0.106,
      chances: {
        win: 0.525,
        winGammon: 0.149,
        winBackgammon: 0.007,
        lose: 0.475,
        loseGammon: 0.125,
        loseBackgammon: 0.005,
      },
    });
  });

  it('returns the cube analysis for the on-roll player', () => {
    const { run } = scriptedRun({ hint: CUBE_BLOCK });
    const session = createGnubgSession(run);
    const analysis = session.cubeInfo(OPENING);
    expect(analysis.properAction).toBe('No double, take');
    expect(analysis.options).toHaveLength(3);
  });

  it('ranks plays at 3-ply when asked for deep effort', () => {
    const { run, commands } = scriptedRun({ hint: HINT_31 });
    const session = createGnubgSession(run);
    session.rankPlays(OPENING, [3, 1], { effort: 'deep' });
    expect(commands).toContain('set evaluation chequerplay evaluation plies 3');
    // The 3-ply move filters are established up front, or no move would ever
    // reach the deeper-ply stage (same trap ticket 04 found at 2-ply).
    expect(
      commands.some((c) => c.startsWith('set evaluation movefilter 3 0')),
    ).toBe(true);
  });

  it('analyzes the cube at 3-ply when asked for deep effort, then restores', () => {
    const { run, commands } = scriptedRun({ hint: CUBE_BLOCK });
    const session = createGnubgSession(run);
    session.cubeInfo(OPENING, { effort: 'deep' });
    const deepIndex = commands.lastIndexOf(
      'set evaluation cubedecision evaluation plies 3',
    );
    expect(deepIndex).toBeGreaterThan(-1);
    const before = commands.length;
    session.cubeInfo(OPENING);
    expect(commands.slice(before)).toContain(
      'set evaluation cubedecision evaluation plies 2',
    );
  });

  it('throws when the engine rejects the position', () => {
    const { run } = scriptedRun({
      'set xgid': ["Not a valid XGID 'garbage'"],
    });
    const session = createGnubgSession(run);
    expect(() => session.evaluate(OPENING)).toThrow(/not a valid xgid/i);
  });
});
