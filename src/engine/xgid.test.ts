import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { createBoard, type Die, initialBoard } from '../rules';
import type { EnginePosition } from './types';
import { decodeXgid, encodeXgid } from './xgid';

/** Opening position after white plays 8/5 6/5; black to roll. */
function boardAfterWhite31(): ReturnType<typeof createBoard> {
  return createBoard({
    white: { points: { 24: 2, 13: 5, 8: 2, 6: 4, 5: 2 } },
    black: { points: { 1: 2, 12: 5, 17: 3, 19: 5 } },
  });
}

describe('encodeXgid', () => {
  it('encodes the starting position, white to play 3-1 in a 7-point match', () => {
    // Worked example verified against gnubg's PositionFromXG in the format notes.
    expect(
      encodeXgid(
        {
          board: initialBoard(),
          onRoll: 'white',
          match: { matchLength: 7, score: { white: 0, black: 0 } },
        },
        [3, 1],
      ),
    ).toBe('-b----E-C---eE---c-e----B-:0:0:1:31:0:0:0:7:10');
  });

  it('encodes a money game with no dice rolled', () => {
    expect(encodeXgid({ board: initialBoard(), onRoll: 'white' })).toBe(
      '-b----E-C---eE---c-e----B-:0:0:1:00:0:0:0:0:10',
    );
  });

  it('encodes from the on-roll player perspective when black is on roll', () => {
    // Hand-derived: index i holds the hero's point i = absolute point 25-i,
    // uppercase = hero (black) checkers, lowercase = opponent (white).
    expect(
      encodeXgid(
        {
          board: boardAfterWhite31(),
          onRoll: 'black',
          match: { matchLength: 7, score: { white: 1, black: 2 } },
        },
        [5, 2],
      ),
    ).toBe('-b----E-C---eE---b-db---B-:0:0:1:52:2:1:0:7:10');
  });

  it('encodes cube value as log2 and owner relative to the on-roll player', () => {
    const position = {
      board: initialBoard(),
      onRoll: 'black',
      match: {
        matchLength: 7,
        score: { white: 0, black: 0 },
        cube: { value: 4, owner: 'black' },
      },
    } as const;
    expect(encodeXgid(position)).toBe(
      '-b----E-C---eE---c-e----B-:2:1:1:00:0:0:0:7:10',
    );
    expect(
      encodeXgid({
        ...position,
        match: { ...position.match, cube: { value: 2, owner: 'white' } },
      }),
    ).toBe('-b----E-C---eE---c-e----B-:1:-1:1:00:0:0:0:7:10');
  });

  it('marks the Crawford game in match play', () => {
    expect(
      encodeXgid({
        board: initialBoard(),
        onRoll: 'white',
        match: {
          matchLength: 7,
          score: { white: 6, black: 3 },
          crawford: true,
        },
      }),
    ).toBe('-b----E-C---eE---c-e----B-:0:0:1:00:6:3:1:7:10');
  });

  it('encodes a pending double as the D dice field', () => {
    expect(
      encodeXgid(
        {
          board: initialBoard(),
          onRoll: 'black',
          match: {
            matchLength: 7,
            score: { white: 2, black: 5 },
            cube: { value: 1, owner: 'center' },
          },
        },
        undefined,
        { pendingDouble: true },
      ),
    ).toBe('-b----E-C---eE---c-e----B-:0:0:1:D:5:2:0:7:10');
  });

  it('encodes checkers on the bar at the string edges', () => {
    // White: one on the bar (hero bar = index 25), 14 spread on points.
    // Black: one on the bar (opponent bar = index 0).
    const board = createBoard({
      white: { points: { 24: 2, 13: 5, 8: 3, 6: 4 }, bar: 1 },
      black: { points: { 1: 2, 12: 5, 17: 3, 19: 4 }, bar: 1 },
    });
    expect(encodeXgid({ board, onRoll: 'white' }, [4, 2])).toBe(
      'ab----D-C---eE---c-d----BA:0:0:1:42:0:0:0:0:10',
    );
  });
});

describe('decodeXgid', () => {
  it('decodes the starting position, 7-point match, player 1 to play 3-1', () => {
    // Worked example 1 of the format notes (verified against PositionFromXG).
    const decoded = decodeXgid(
      'XGID=-b----E-C---eE---c-e----B-:0:0:1:31:0:0:0:7:10',
    );
    expect(decoded.position.board).toEqual(initialBoard());
    expect(decoded.position.onRoll).toBe('white');
    expect(decoded.position.match).toEqual({
      matchLength: 7,
      score: { white: 0, black: 0 },
      crawford: false,
      cube: { value: 1, owner: 'center' },
    });
    expect(decoded.roll).toEqual([3, 1]);
    expect(decoded.pendingDouble).toBe(false);
  });

  it('accepts the string without the XGID= prefix', () => {
    const decoded = decodeXgid(
      '-b----E-C---eE---c-e----B-:0:0:1:00:0:0:0:0:10',
    );
    expect(decoded.position.board).toEqual(initialBoard());
    expect(decoded.roll).toBeNull();
  });

  it('decodes cube value from log2, owner and turn in player-1 terms', () => {
    // Player 2 (top / lowercase) on roll holding a 4-cube, Crawford off.
    const decoded = decodeXgid(
      '-b----E-C---eE---c-e----B-:2:-1:-1:52:3:4:0:7:10',
    );
    expect(decoded.position.onRoll).toBe('black');
    expect(decoded.position.match?.cube).toEqual({ value: 4, owner: 'black' });
    expect(decoded.position.match?.score).toEqual({ white: 3, black: 4 });
    expect(decoded.roll).toEqual([5, 2]);
  });

  it('decodes bars, borne-off checkers and the Crawford flag', () => {
    // White: 2 on their 24-point, 12 off, 1 on the bar; black mirrored
    // except 13 spread between two points and the bar.
    const decoded = decodeXgid(
      'ab----------------------BA:0:0:1:00:6:3:1:7:10',
    );
    const { board } = decoded.position;
    expect(board.points[24]).toBe(2);
    expect(board.points[1]).toBe(-2);
    expect(board.bar).toEqual({ white: 1, black: 1 });
    expect(board.off).toEqual({ white: 12, black: 12 });
    expect(decoded.position.match?.crawford).toBe(true);
  });

  it('decodes a pending double: the turn field names the doubler', () => {
    const decoded = decodeXgid(
      '-b----E-C---eE---c-e----B-:0:0:-1:D:2:5:0:7:10',
    );
    expect(decoded.pendingDouble).toBe(true);
    expect(decoded.roll).toBeNull();
    // Player 2 (black) doubled; player 1 must take or pass.
    expect(decoded.position.onRoll).toBe('black');
  });

  it('round-trips what encodeXgid produces', () => {
    const position = {
      board: boardAfterWhite31(),
      onRoll: 'white',
      match: {
        matchLength: 9,
        score: { white: 4, black: 2 },
        crawford: false,
        cube: { value: 2, owner: 'black' },
      },
    } as const;
    const text = encodeXgid(position, [6, 2]);
    const decoded = decodeXgid(text);
    expect(decoded.position).toEqual(position);
    expect(decoded.roll).toEqual([6, 2]);
    expect(encodeXgid(decoded.position, [6, 2])).toBe(text);
  });

  it.each([
    ['', 'empty'],
    ['XGID=-b----E-C---eE---c-e----B-:0:0:1:31:0:0:0:7', 'nine fields'],
    ['-b----E-C---eE---c-e----B!:0:0:1:31:0:0:0:7:10', 'bad board char'],
    ['-b----E-C---eE---c-e----B:0:0:1:31:0:0:0:7:10', '25-char board'],
    ['-p----E-C---eE---c-e----B-:0:0:1:31:0:0:0:7:10', 'over 15 checkers'],
    ['-b----E-C---eE---c-e----B-:0:0:2:31:0:0:0:7:10', 'bad turn'],
    ['-b----E-C---eE---c-e----B-:0:0:1:71:0:0:0:7:10', 'bad die'],
    ['-b----E-C---eE---c-e----B-:0:0:1:31:7:0:0:7:10', 'score at length'],
    ['-b----E-C---eE---c-e----B-:0:3:1:31:0:0:0:7:10', 'bad cube owner'],
    ['-b----E-C---eE---c-e----B-:0:0:1:00:0:0:0:99:10', 'match length over 25'],
  ])('rejects %s (%s) with a clear message', (text) => {
    expect(() => decodeXgid(text)).toThrowError(/not a valid XGID/i);
  });
});

/**
 * Arbitrary positions with full match context: each player's 15 checkers
 * over their points, bar and off (no shared points), a doubled cube with an
 * owner, a legal score, and optionally rolled dice.
 */
const arbitraryXgidPosition = fc
  .record({
    whiteSlots: fc.array(fc.integer({ min: 0, max: 25 }), {
      minLength: 15,
      maxLength: 15,
    }),
    blackDraws: fc.array(fc.nat({ max: 1000 }), {
      minLength: 15,
      maxLength: 15,
    }),
    cubeLog2: fc.integer({ min: 0, max: 4 }),
    cubeOwner: fc.constantFrom('center', 'white', 'black') as fc.Arbitrary<
      'center' | 'white' | 'black'
    >,
    matchLength: fc.integer({ min: 1, max: 25 }),
    scoreDraw: fc.tuple(fc.nat({ max: 24 }), fc.nat({ max: 24 })),
    crawford: fc.boolean(),
    dice: fc.option(
      fc.tuple(fc.integer({ min: 1, max: 6 }), fc.integer({ min: 1, max: 6 })),
      { nil: null },
    ),
  })
  .map((draw) => {
    const whitePoints: Record<number, number> = {};
    let whiteBar = 0;
    let whiteOff = 0;
    for (const slot of draw.whiteSlots) {
      if (slot === 0) {
        whiteOff++;
      } else if (slot === 25) {
        whiteBar++;
      } else {
        whitePoints[slot] = (whitePoints[slot] ?? 0) + 1;
      }
    }
    const free = Array.from({ length: 24 }, (_, i) => i + 1).filter(
      (p) => !whitePoints[p],
    );
    const blackPoints: Record<number, number> = {};
    let blackBar = 0;
    let blackOff = 0;
    for (const n of draw.blackDraws) {
      const slot = n % (free.length + 2);
      if (slot === free.length) {
        blackOff++;
      } else if (slot === free.length + 1) {
        blackBar++;
      } else {
        blackPoints[free[slot]] = (blackPoints[free[slot]] ?? 0) + 1;
      }
    }
    const board = createBoard({
      white: { points: whitePoints, bar: whiteBar, off: whiteOff },
      black: { points: blackPoints, bar: blackBar, off: blackOff },
    });
    const position: EnginePosition = {
      board,
      onRoll: 'white',
      match: {
        matchLength: draw.matchLength,
        score: {
          white: draw.scoreDraw[0] % draw.matchLength,
          black: draw.scoreDraw[1] % draw.matchLength,
        },
        crawford: draw.crawford,
        cube: { value: 2 ** draw.cubeLog2, owner: draw.cubeOwner },
      },
    };
    const roll = draw.dice
      ? ([draw.dice[0], draw.dice[1]] as [Die, Die])
      : null;
    return { position, roll };
  });

describe('XGID round-trip properties', () => {
  it('decode(encode(p)) is the identity on positions with white on roll', () => {
    fc.assert(
      fc.property(arbitraryXgidPosition, ({ position, roll }) => {
        const decoded = decodeXgid(encodeXgid(position, roll ?? undefined));
        expect(decoded.position).toEqual(position);
        expect(decoded.roll).toEqual(roll);
        expect(decoded.pendingDouble).toBe(false);
      }),
      { numRuns: 100 },
    );
  });

  it('encode(decode(s)) is the identity on encoded strings, either seat on roll', () => {
    fc.assert(
      fc.property(
        arbitraryXgidPosition,
        fc.boolean(),
        ({ position, roll }, blackOnRoll) => {
          const match = position.match as NonNullable<EnginePosition['match']>;
          const seated: EnginePosition = blackOnRoll
            ? { ...position, onRoll: 'black' }
            : position;
          const text = encodeXgid(seated, roll ?? undefined);
          const decoded = decodeXgid(text);
          expect(encodeXgid(decoded.position, decoded.roll ?? undefined)).toBe(
            text,
          );
          // The decoded position is the same position seen from the string
          // author's seat: same cube value, same pot, same pip totals.
          expect(decoded.position.match?.cube?.value).toBe(match.cube?.value);
          expect(decoded.position.match?.matchLength).toBe(match.matchLength);
        },
      ),
      { numRuns: 100 },
    );
  });
});
