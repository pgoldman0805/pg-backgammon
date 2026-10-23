import { describe, expect, it } from 'vitest';
import { parseCubeAnalysis, parseEvalOutput, parseHintMoves } from './parse';

// Fixtures below are verbatim output captured from the vendored gnubg-WASM
// build (gnubg 1.05.000 / gnubg-web) on 2026-10-22.

const HINT_0PLY = [
  '    1. Cubeful 0-ply    8/5 6/5                      Eq.:  +0.219',
  '       0.551 0.174 0.013 - 0.449 0.124 0.005',
  '        0-ply cubeful prune [expert]',
  '    2. Cubeful 0-ply    24/23 13/10                  Eq.:  -0.012 ( -0.231)',
  '       0.497 0.137 0.008 - 0.503 0.140 0.007',
  '        0-ply cubeful prune [expert]',
];

const HINT_2PLY_MIXED = [
  '    1. Cubeful 2-ply    8/5 6/5                      Eq.:  +0.219',
  '       0.551 0.170 0.008 - 0.449 0.117 0.005',
  '        2-ply cubeful prune [world class]',
  '    2. Cubeful 2-ply    24/23 13/10                  Eq.:  -0.011 ( -0.230)',
  '       0.496 0.139 0.006 - 0.504 0.138 0.006',
  '        2-ply cubeful prune [world class]',
  '    3. Cubeful 0-ply    24/20                        Eq.:  -0.020 ( -0.239)',
  '       0.497 0.125 0.005 - 0.503 0.135 0.004',
  '        0-ply cubeful prune [expert]',
];

const HINT_BEAROFF = [
  '    1. Cubeful 0-ply    6/5 6/off                    Eq.:  +1.392',
  '       0.793 0.593 0.099 - 0.207 0.000 0.000',
  '        0-ply cubeful prune [expert]',
];

const EVAL_OUTPUT = [
  'Position ID:\t4HPwATDgc/ABMA',
  'Match ID:\tcAngAAAAAAAE',
  '',
  'Evaluator: \tContact',
  '',
  '',
  '        Win     W(g)    W(bg)   L(g)    L(bg)   Equity    Cubeful  ',
  'static: 0.522   0.154   0.008   0.130   0.008    +0.068    +0.093   ',
  ' 1 ply: 0.527   0.148   0.009   0.129   0.005    +0.077    +0.106   ',
  ' 2 ply: 0.525   0.149   0.007   0.125   0.005    +0.077    +0.106   ',
  '',
];

const CUBE_MATCH = [
  '',
  'Cube analysis',
  '2-ply cubeless equity  +0.077 (Money:  +0.076)',
  '  0.525 0.149 0.007 - 0.475 0.125 0.005',
  'Cubeful equities:',
  '1. No double            +0.106',
  '2. Double, pass         +1.000  ( +0.894)',
  '3. Double, take         -0.173  ( -0.279)',
  'Proper cube action: No double, take (23.8%)',
  '',
];

const CUBE_MONEY = [
  '',
  'Cube analysis',
  '2-ply cubeless equity  +0.076',
  '  0.525 0.149 0.007 - 0.475 0.125 0.005',
  'Cubeful equities:',
  '1. No double            +0.105',
  '2. Double, pass         +1.000  ( +0.895)',
  '3. Double, take         -0.171  ( -0.276)',
  'Proper cube action: No double, take (23.6%)',
  '',
];

describe('parseHintMoves', () => {
  it('parses ranked moves with equities and win chances', () => {
    const moves = parseHintMoves(HINT_0PLY);
    expect(moves).toHaveLength(2);
    expect(moves[0]).toEqual({
      rank: 1,
      moveText: '8/5 6/5',
      equity: 0.219,
      chances: {
        win: 0.551,
        winGammon: 0.174,
        winBackgammon: 0.013,
        lose: 0.449,
        loseGammon: 0.124,
        loseBackgammon: 0.005,
      },
    });
    expect(moves[1].moveText).toBe('24/23 13/10');
    expect(moves[1].equity).toBe(-0.012);
  });

  it('parses mixed-ply lists (move-filter cutoff)', () => {
    const moves = parseHintMoves(HINT_2PLY_MIXED);
    expect(moves.map((m) => m.moveText)).toEqual([
      '8/5 6/5',
      '24/23 13/10',
      '24/20',
    ]);
    expect(moves[2].equity).toBe(-0.02);
  });

  it('parses bear-off notation and equities above 1', () => {
    const moves = parseHintMoves(HINT_BEAROFF);
    expect(moves[0].moveText).toBe('6/5 6/off');
    expect(moves[0].equity).toBe(1.392);
  });

  it('returns an empty list when no move lines are present', () => {
    expect(parseHintMoves(['board:x:y:...', 'You cannot move.'])).toEqual([]);
  });
});

describe('parseEvalOutput', () => {
  it('parses the static/1-ply/2-ply evaluation rows', () => {
    const rows = parseEvalOutput(EVAL_OUTPUT);
    expect(rows).toHaveLength(3);
    expect(rows[0]).toEqual({
      plies: 0,
      equity: 0.068,
      cubefulEquity: 0.093,
      chances: {
        win: 0.522,
        winGammon: 0.154,
        winBackgammon: 0.008,
        lose: 0.478,
        loseGammon: 0.13,
        loseBackgammon: 0.008,
      },
    });
    expect(rows[2].plies).toBe(2);
    expect(rows[2].equity).toBe(0.077);
    expect(rows[2].cubefulEquity).toBe(0.106);
  });
});

describe('parseCubeAnalysis', () => {
  it('parses a match-play cube analysis block', () => {
    const analysis = parseCubeAnalysis(CUBE_MATCH);
    expect(analysis.cubelessEquity).toBe(0.077);
    expect(analysis.chances.win).toBe(0.525);
    expect(analysis.chances.lose).toBe(0.475);
    expect(analysis.options).toEqual([
      { action: 'No double', equity: 0.106, equityDiff: 0 },
      { action: 'Double, pass', equity: 1.0, equityDiff: 0.894 },
      { action: 'Double, take', equity: -0.173, equityDiff: -0.279 },
    ]);
    expect(analysis.properAction).toBe('No double, take');
  });

  it('parses a money-game block (no Money suffix)', () => {
    const analysis = parseCubeAnalysis(CUBE_MONEY);
    expect(analysis.cubelessEquity).toBe(0.076);
    expect(analysis.options[2].equity).toBe(-0.171);
    expect(analysis.properAction).toBe('No double, take');
  });
});
