import { describe, expect, it } from 'vitest';
import { createBoard, initialBoard } from '../rules';
import { encodeXgid } from './xgid';

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
