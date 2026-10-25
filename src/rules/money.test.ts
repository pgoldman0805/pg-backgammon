import { describe, expect, test } from 'vitest';
import { createBoard } from './board';
import type { DiceSource } from './dice';
import { createGame } from './game';
import {
  acceptResignation,
  canDouble,
  commitMatchPlay,
  createMatch,
  type MatchState,
  matchMovement,
  nextGame,
  offerResignation,
  replayMatch,
  replayMatchGame,
  startMoneyGame,
} from './match';
import type { Die } from './types';

/** A scripted dice source: returns the given dies in order. */
function diceFrom(rolls: readonly Die[]): DiceSource {
  let i = 0;
  return {
    rollDie: () => {
      const die = rolls[i];
      if (die === undefined) {
        throw new Error('scripted dice exhausted');
      }
      i += 1;
      return die;
    },
  };
}

/**
 * A money game where white bears off the last checker with the next commit.
 * Black's checkers define the result kind: borne off some = single, none =
 * gammon. The cube is centered unless turned by the caller.
 */
function aboutToWinMoney(options: {
  cube?: { value: number; owner: 'white' | 'black' | 'center' };
  black: Parameters<typeof createBoard>[0]['black'];
}): MatchState {
  return createMatch({
    length: 0,
    money: true,
    cube: options.cube,
    game: createGame({
      board: createBoard({
        white: { points: { 1: 1 }, off: 14 },
        black: options.black,
      }),
      player: 'white',
      roll: [6, 5],
    }),
  });
}

const singleLoser = { points: { 24: 2 }, off: 13 } as const;
const gammonLoser = { points: { 24: 15 } } as const;

function winNow(match: MatchState): MatchState {
  return commitMatchPlay(matchMovement(match, 1, 6));
}

describe('startMoneyGame', () => {
  test('starts a money session: no target, centered cube, opening turn', () => {
    const match = startMoneyGame(diceFrom([6, 3]));

    expect(match.money).toBe(true);
    expect(match.length).toBe(0);
    expect(match.score).toEqual({ white: 0, black: 0 });
    expect(match.cube).toEqual({ value: 1, owner: 'center' });
    expect(match.crawford).toBe(false);
    expect(match.phase).toBe('turn');
    expect(match.game.turn?.roll).toEqual([6, 3]);
    expect(match.winner).toBeNull();
  });
});

describe('the money cube is live from the start and never dead', () => {
  test('the player to roll may double at the first pre-roll', () => {
    let match = startMoneyGame(diceFrom([6, 3, 5, 2]));
    match = matchMovement(match, 24, 6);
    match = matchMovement(match, 13, 3);
    match = commitMatchPlay(match);

    expect(match.phase).toBe('pre-roll');
    expect(canDouble(match)).toBe(true);
  });

  test('a high running score never makes the cube dead (no match target)', () => {
    // A large standing that in a 7-point match would be dead-cube; money has
    // no target, so doubling stays available.
    const match = createMatch({
      length: 0,
      money: true,
      score: { white: 99, black: 99 },
      game: createGame({
        board: createBoard({
          white: { points: { 1: 1 }, off: 14 },
          black: singleLoser,
        }),
        player: 'white',
        roll: [6, 5],
      }),
    });
    const preRoll = commitMatchPlay(matchMovement(match, 1, 6));
    // The game ends on that commit (white bears off), so re-open on a fresh
    // game to reach a pre-roll and assert the cube stays live.
    const next = nextGame(preRoll, diceFrom([6, 3, 5, 2]));
    const afterPlay = commitMatchPlay(
      matchMovement(matchMovement(next, 24, 6), 13, 3),
    );
    expect(afterPlay.phase).toBe('pre-roll');
    expect(canDouble(afterPlay)).toBe(true);
  });
});

describe('Jacoby rule: gammons count only once the cube has been turned', () => {
  test('a gammon at a centered 1-cube scores a single', () => {
    const match = winNow(aboutToWinMoney({ black: gammonLoser }));

    expect(match.phase).toBe('game-over');
    expect(match.score).toEqual({ white: 1, black: 0 });
    expect(match.gameResult?.kind).toBe('single');
    expect(match.gameResult?.points).toBe(1);
  });

  test('a gammon after the cube has been turned scores in full', () => {
    const match = winNow(
      aboutToWinMoney({
        cube: { value: 2, owner: 'white' },
        black: gammonLoser,
      }),
    );

    expect(match.score).toEqual({ white: 4, black: 0 });
    expect(match.gameResult?.kind).toBe('gammon');
    expect(match.gameResult?.points).toBe(4);
  });

  test('a single at a centered cube is unaffected by Jacoby', () => {
    const match = winNow(aboutToWinMoney({ black: singleLoser }));

    expect(match.score).toEqual({ white: 1, black: 0 });
    expect(match.gameResult?.kind).toBe('single');
  });

  test('a resigned gammon at a centered cube scores a single under Jacoby', () => {
    let match = aboutToWinMoney({ black: gammonLoser });
    match = offerResignation(match, 'black', 'gammon');
    match = acceptResignation(match);

    expect(match.gameResult?.points).toBe(1);
    expect(match.score).toEqual({ white: 1, black: 0 });
  });
});

describe('a money session never ends and accumulates across games', () => {
  test('a win is game-over, never match-over, and keeps the match alive', () => {
    const match = winNow(aboutToWinMoney({ black: gammonLoser }));

    expect(match.phase).toBe('game-over');
    expect(match.winner).toBeNull();
  });

  test('nextGame starts fresh with a centered cube and no Crawford', () => {
    const over = winNow(
      aboutToWinMoney({
        cube: { value: 2, owner: 'white' },
        black: singleLoser,
      }),
    );
    const next = nextGame(over, diceFrom([3, 5]));

    expect(next.phase).toBe('turn');
    expect(next.money).toBe(true);
    expect(next.cube).toEqual({ value: 1, owner: 'center' });
    expect(next.crawford).toBe(false);
    expect(next.score).toEqual({ white: 2, black: 0 });
  });
});

describe('deterministic replay of a money game applies Jacoby', () => {
  test('a recorded centered-cube gammon replays to a single', () => {
    const over = winNow(aboutToWinMoney({ black: gammonLoser }));
    const record = over.games[0];

    expect(record.money).toBe(true);
    expect(replayMatchGame(record).result.points).toBe(1);
  });

  test('replayMatch over a money record never declares a winner', () => {
    const over = winNow(aboutToWinMoney({ black: gammonLoser }));
    const record = { length: over.length, games: over.games };

    const replay = replayMatch(record);
    expect(replay.winner).toBeNull();
    expect(replay.score).toEqual({ white: 1, black: 0 });
  });
});
