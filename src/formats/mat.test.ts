import { describe, expect, it } from 'vitest';
import type { MatchRecord } from '../rules';
import { generateFinishedMatch } from '../test/generateMatch';
import { cubeGameMatch, recordOf } from '../test/match';
import { exportMat, importMat, MatParseError } from './mat';

/**
 * Golden export: the shared cube-game fixture (White opens 3-1 with 8/5 6/5,
 * Black doubles, White takes, Black plays 6-5, White plays 6-2 then resigns
 * a single; at length 2 the doubled resignation ends the match 2-0) laid out
 * exactly as the gnubg 1.05 writer would: " N point match" header, per-game
 * score line with the left name padded to 31 columns, numbered move pairs
 * (left column player 0 padded to 27), " Doubles => N" / " Takes" cube
 * entries, and the "Wins N points" line in the winner's column.
 */
const CUBE_GAME_MAT = [
  ' 2 point match',
  '',
  ' Game 1',
  // " " + left name:score in 31 columns + right name:score.
  ` White : 0${' '.repeat(22)}Black : 0`,
  // "%3d) " + left entry in 27 columns + " " + right entry (cube entries
  // carry gnubg's leading space).
  `  1) 31: 8/5 6/5${' '.repeat(17)} Doubles => 2`,
  `  2)  Takes${' '.repeat(22)}65: 24/18 18/13`,
  `  3) 62: 24/18 13/11${' '.repeat(13)}Wins 2 points`,
  '',
  '',
].join('\n');

describe('exportMat', () => {
  it('lays out the cube-game fixture in gnubg writer conventions', () => {
    expect(exportMat(recordOf(cubeGameMatch(2)))).toBe(CUBE_GAME_MAT);
  });

  it('refuses games that did not start from the standard position', () => {
    const native = recordOf(cubeGameMatch(2));
    const doctored: MatchRecord = {
      ...native,
      games: [
        {
          ...native.games[0],
          game: {
            ...native.games[0].game,
            initialBoard: {
              ...native.games[0].game.initialBoard,
              points: [...native.games[0].game.initialBoard.points].reverse(),
            },
          },
        },
      ],
    };
    expect(() => exportMat(doctored)).toThrowError(/standard starting/i);
  });
});

describe('importMat', () => {
  it('reconstructs the cube-game record from its own export', () => {
    const native = recordOf(cubeGameMatch(2));

    const imported = importMat(CUBE_GAME_MAT);

    expect(imported.record).toEqual(native);
    expect(imported.players).toEqual({ white: 'White', black: 'Black' });
  });

  it('parses liberally: tag headers, loose casing, drifted columns, CRLF', () => {
    // The same match as another program might write it: "; [Tag ...]" header
    // lines, a capitalized header, tight unaligned columns, player names,
    // Windows line endings.
    const foreign = [
      '; [Site "GridGammon"]',
      '; [Event "casual game"]',
      '; [Player 1 "You"]',
      '; [EventDate "2026.10.22"]',
      '',
      '  2 Point Match',
      '',
      ' Game 1',
      ' You : 0   gnubg : 0',
      '1) 31: 8/5 6/5   Doubles => 2',
      ' 2) Takes   65: 24/18 18/13',
      '3) 62: 24/18 13/11   Wins 2 points',
      '',
    ].join('\r\n');

    const imported = importMat(foreign);

    expect(imported.record).toEqual(recordOf(cubeGameMatch(2)));
    expect(imported.players).toEqual({ white: 'You', black: 'gnubg' });
  });

  it('accepts "Cannot Move" where a writer spells out a dance', () => {
    // Seed 2's export contains a dance written as bare dice ("44:"): XG
    // writes the same turn as "44: Cannot Move".
    const text = exportMat(recordOf(generateFinishedMatch(2)));
    expect(text).toMatch(/[1-6][1-6]:\n/);
    const spelled = text.replace(/([1-6][1-6]:)\n/, '$1 Cannot Move\n');

    expect(importMat(spelled).record).toEqual(importMat(text).record);
  });

  it.each([
    ['hello world', /point match/i],
    [' 0 point match\n\n Game 1\n A : 0  B : 0\n', /money session/i],
    [
      CUBE_GAME_MAT.replace('8/5 6/5', '8/4 6/5'),
      /line 5: .*not a legal 3-1 play/i,
    ],
    [
      CUBE_GAME_MAT.replace('65: 24/18 18/13', '65:'),
      /line 6: .*legal plays exist/i,
    ],
    [
      CUBE_GAME_MAT.replace(' Doubles => 2', '             '),
      /take with no double/i,
    ],
    [
      CUBE_GAME_MAT.replace(' Takes', '      '),
      /line 6: .*double.*never taken or dropped/i,
    ],
    [
      CUBE_GAME_MAT.replace('Doubles => 2', 'Doubles => 4'),
      /line 5: .*does not follow/i,
    ],
    [CUBE_GAME_MAT.replace('Wins 2 points', 'Wins 3 points'), /line 7: /i],
    [
      CUBE_GAME_MAT.replace(' 2 point match', ' 9 point match'),
      /before either player reaches 9/i,
    ],
    [
      `${CUBE_GAME_MAT.split('\n').slice(0, 6).join('\n')}\n`,
      /ends without a result/i,
    ],
  ])('rejects malformed input with a clear error (%#)', (text, message) => {
    expect(() => importMat(text)).toThrowError(MatParseError);
    expect(() => importMat(text)).toThrowError(message);
  });
});

/** Native records normalized to what .mat can carry: only the deciding
 * opening-roll attempt survives (doubles rerolls are not written). */
function matRepresentable(record: MatchRecord): MatchRecord {
  return {
    ...record,
    games: record.games.map((game) => ({
      ...game,
      game: {
        ...game.game,
        openingRolls: game.game.openingRolls.slice(-1),
      },
    })),
  };
}

describe('.mat round-trip property', () => {
  it('export→import reproduces seeded generated match records', () => {
    for (let seed = 1; seed <= 20; seed++) {
      const match = generateFinishedMatch(seed);
      const native = recordOf(match);

      const imported = importMat(exportMat(native));

      expect(imported.record, `seed ${seed}`).toEqual(matRepresentable(native));
    }
  });
});
