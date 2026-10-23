import { describe, expect, it } from 'vitest';
import {
  acceptResignation,
  commitMatchPlay,
  createBoard,
  createGame,
  createMatch,
  matchMovement,
  offerDouble,
  offerResignation,
  passDouble,
  rollTurn,
  startMatch,
} from '../rules';
import { scriptedDice } from '../test/dice';
import { cubeGameMatch as cubeGame } from '../test/match';
import { walkGame } from './walk';

const STANDING = { length: 7, score: { white: 0, black: 0 } } as const;

describe('walkGame', () => {
  it('yields every play with its position, roll and match context', () => {
    const match = cubeGame();
    const moments = walkGame(match.games[0], STANDING);
    const plays = moments.filter((m) => m.kind === 'play');

    expect(plays).toHaveLength(3);
    expect(plays[0]).toMatchObject({
      playIndex: 0,
      player: 'white',
      roll: [3, 1],
      legalPlayCount: expect.any(Number),
    });
    expect(plays[0].board).toEqual(match.games[0].game.initialBoard);
    expect(plays[0].context.cube).toEqual({ value: 1, owner: 'center' });
    // Black's play comes after the taken double: the cube sits at 2 with White.
    expect(plays[1].player).toBe('black');
    expect(plays[1].context.cube).toEqual({ value: 2, owner: 'white' });
    expect(plays[1].context.matchLength).toBe(7);
    // The board before Black's play reflects White's 8/5 6/5.
    expect(plays[1].board.points[5]).toBe(2);
    expect(plays[1].board.points[8]).toBe(2);
  });

  it('yields the double as a cube action at its recorded moment', () => {
    const match = cubeGame();
    const moments = walkGame(match.games[0], STANDING);
    const actions = moments.filter((m) => m.kind === 'cube-action');

    expect(actions).toHaveLength(1);
    expect(actions[0]).toMatchObject({
      playIndex: 1,
      doubler: 'black',
      responder: 'white',
      response: 'take',
    });
    // The decision is analyzed from the pre-double position and cube.
    expect(actions[0].context.cube).toEqual({ value: 1, owner: 'center' });
    expect(actions[0].board.points[5]).toBe(2);
  });

  it('yields a silent pre-roll with cube access as an opportunity', () => {
    const match = cubeGame();
    const moments = walkGame(match.games[0], STANDING);
    const opportunities = moments.filter((m) => m.kind === 'cube-opportunity');

    // White holds the 2-cube before play 2; Black's pre-roll before play 1
    // was spent doubling, and play 0 opens the game with no pre-roll at all.
    expect(opportunities).toHaveLength(1);
    expect(opportunities[0]).toMatchObject({ playIndex: 2, player: 'white' });
    expect(opportunities[0].context.cube).toEqual({ value: 2, owner: 'white' });
  });

  it('keeps the moments in game order', () => {
    const match = cubeGame();
    const kinds = walkGame(match.games[0], STANDING).map(
      (m) => `${m.kind}@${m.playIndex}`,
    );
    expect(kinds).toEqual([
      'play@0',
      'cube-action@1',
      'play@1',
      'cube-opportunity@2',
      'play@2',
    ]);
  });

  it('yields a passed double and no play after it', () => {
    let match = startMatch(7, scriptedDice(3, 1));
    match = matchMovement(match, 8, 3);
    match = matchMovement(match, 6, 1);
    match = commitMatchPlay(match);
    match = passDouble(offerDouble(match));

    const moments = walkGame(match.games[0], STANDING);
    expect(moments.map((m) => `${m.kind}@${m.playIndex}`)).toEqual([
      'play@0',
      'cube-action@1',
    ]);
    const action = moments[1];
    expect(action.kind === 'cube-action' && action.response).toBe('pass');
  });

  it('offers no cube moments in a Crawford game', () => {
    let match = createMatch({
      length: 3,
      game: createGame({
        board: createBoard({
          white: { points: { 6: 5, 8: 3, 13: 5, 24: 2 } },
          black: { points: { 1: 2, 12: 5, 17: 3, 19: 5 } },
        }),
        player: 'white',
        roll: [3, 1],
      }),
      score: { white: 2, black: 0 },
    });
    expect(match.crawford).toBe(true);
    match = matchMovement(match, 8, 3);
    match = matchMovement(match, 6, 1);
    match = commitMatchPlay(match);
    match = rollTurn(match, scriptedDice(6, 5));
    match = matchMovement(match, 1, 6);
    match = matchMovement(match, 7, 5);
    match = commitMatchPlay(match);
    const settled = acceptResignation(
      offerResignation(match, 'black', 'single'),
    );

    const moments = walkGame(settled.games[0], {
      length: 3,
      score: { white: 2, black: 0 },
    });
    expect(moments.every((m) => m.kind === 'play')).toBe(true);
    expect(moments[0].context.crawford).toBe(true);
  });

  it('marks forced plays and dances by their legal-play count', () => {
    // White must enter from the bar; only the 24-point is open (die 1), and
    // the second die cannot be used with a checker still on the bar.
    const board = createBoard({
      white: { points: { 6: 5, 8: 4, 13: 4 }, bar: 2 },
      black: {
        points: { 19: 2, 20: 2, 21: 2, 22: 2, 23: 2, 12: 5 },
      },
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

    const moments = walkGame(settled.games[0], STANDING);
    expect(moments).toHaveLength(1);
    expect(moments[0]).toMatchObject({ kind: 'play', legalPlayCount: 1 });
  });
});
