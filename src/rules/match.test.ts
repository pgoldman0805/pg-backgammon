import { describe, expect, test } from 'vitest';
import { createBoard } from './board';
import type { DiceSource } from './dice';
import { createSeededDice } from './dice';
import { createGame, startGame } from './game';
import {
  acceptResignation,
  canDouble,
  canTakeback,
  commitMatchPlay,
  createMatch,
  declineResignation,
  type MatchState,
  markTutorAssisted,
  matchMovement,
  nextGame,
  offerDouble,
  offerResignation,
  passDouble,
  replayMatch,
  replayMatchGame,
  rollTurn,
  startMatch,
  takebackPlay,
  takeDouble,
  undoMatchMovement,
} from './match';
import { legalPlays } from './plays';
import { replayGame } from './replay';
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

describe('startMatch', () => {
  test('starts at 0-0 with a centered 1-cube and the opening turn rolled', () => {
    const match = startMatch(7, diceFrom([6, 3]));

    expect(match.length).toBe(7);
    expect(match.score).toEqual({ white: 0, black: 0 });
    expect(match.cube).toEqual({ value: 1, owner: 'center' });
    expect(match.phase).toBe('turn');
    expect(match.game.turn?.player).toBe('white');
    expect(match.game.turn?.roll).toEqual([6, 3]);
    expect(match.crawford).toBe(false);
    expect(match.games).toEqual([]);
    expect(match.winner).toBeNull();
  });

  test.each([0, 26, 2.5, -1])('rejects a length of %s', (length) => {
    expect(() => startMatch(length, diceFrom([6, 3]))).toThrow();
  });

  test.each([1, 25])('accepts a length of %s', (length) => {
    expect(startMatch(length, diceFrom([6, 3])).length).toBe(length);
  });
});

describe('the turn cycle: commit ends in a pre-roll phase, rolling resumes', () => {
  test('committing a play leads to the opponent pre-roll, not a rolled turn', () => {
    let match = startMatch(7, diceFrom([6, 3]));
    match = matchMovement(match, 24, 6);
    match = matchMovement(match, 13, 3);
    match = commitMatchPlay(match);

    expect(match.phase).toBe('pre-roll');
    expect(match.toRoll).toBe('black');
    expect(match.game.turn).toBeNull();
    expect(match.game.record.plays).toHaveLength(1);
  });

  test('rolling from pre-roll starts the turn with the dice source roll', () => {
    let match = startMatch(7, diceFrom([6, 3, 5, 2]));
    match = matchMovement(match, 24, 6);
    match = matchMovement(match, 13, 3);
    match = commitMatchPlay(match);
    match = rollTurn(match, diceFrom([5, 2]));

    expect(match.phase).toBe('turn');
    expect(match.toRoll).toBeNull();
    expect(match.game.turn?.player).toBe('black');
    expect(match.game.turn?.roll).toEqual([5, 2]);
  });

  test('undo within the turn restores the previous position', () => {
    let match = startMatch(7, diceFrom([6, 3]));
    match = matchMovement(match, 24, 6);
    match = undoMatchMovement(match);

    expect(match.game.board.points[24]).toBe(2);
    expect(match.game.turn?.remainingDice).toEqual([6, 3]);
  });

  test('turn actions outside the turn phase throw', () => {
    let match = startMatch(7, diceFrom([6, 3]));
    expect(() => rollTurn(match, diceFrom([5, 2]))).toThrow();

    match = matchMovement(match, 24, 6);
    match = matchMovement(match, 13, 3);
    match = commitMatchPlay(match);
    expect(() => matchMovement(match, 13, 6)).toThrow();
    expect(() => commitMatchPlay(match)).toThrow();
  });
});

/** A match in black's pre-roll phase, after white's opening 6-3. */
function blackPreRoll(options?: {
  length?: number;
  score?: { white: number; black: number };
  cube?: { value: number; owner: 'white' | 'black' | 'center' };
  crawford?: boolean;
  crawfordPlayed?: boolean;
}): MatchState {
  let match = createMatch({
    length: options?.length ?? 7,
    game: startGame(diceFrom([6, 3])),
    score: options?.score,
    cube: options?.cube,
    crawford: options?.crawford,
    crawfordPlayed: options?.crawfordPlayed,
  });
  match = matchMovement(match, 24, 6);
  match = matchMovement(match, 13, 3);
  return commitMatchPlay(match);
}

describe('the doubling cube: offer, take, pass', () => {
  test('the player to roll may double a centered cube before rolling', () => {
    const match = blackPreRoll();
    expect(canDouble(match)).toBe(true);

    const offered = offerDouble(match);
    expect(offered.phase).toBe('cube-offered');
    expect(offered.toRoll).toBe('black');
    expect(offered.cube).toEqual({ value: 1, owner: 'center' });
    expect(offered.decisions).toEqual([
      { type: 'double', player: 'black', afterPlays: 1 },
    ]);
  });

  test('a take doubles the cube to the taker and play resumes at pre-roll', () => {
    const taken = takeDouble(offerDouble(blackPreRoll()));

    expect(taken.cube).toEqual({ value: 2, owner: 'white' });
    expect(taken.phase).toBe('pre-roll');
    expect(taken.toRoll).toBe('black');
    expect(taken.decisions).toEqual([
      { type: 'double', player: 'black', afterPlays: 1 },
      { type: 'take', player: 'white', afterPlays: 1 },
    ]);
  });

  test('a pass concedes the pre-double stake to the doubler', () => {
    const passed = passDouble(offerDouble(blackPreRoll()));

    expect(passed.phase).toBe('game-over');
    expect(passed.score).toEqual({ white: 0, black: 1 });
    expect(passed.gameResult).toEqual({
      winner: 'black',
      end: 'pass',
      kind: 'single',
      points: 1,
    });
    expect(passed.games).toHaveLength(1);
    expect(passed.games[0].decisions.at(-1)).toEqual({
      type: 'pass',
      player: 'white',
      afterPlays: 1,
    });
  });

  test('passing a redouble concedes the pre-double stake', () => {
    const match = blackPreRoll({ cube: { value: 2, owner: 'black' } });
    const passed = passDouble(offerDouble(match));

    expect(passed.gameResult?.points).toBe(2);
    expect(passed.score).toEqual({ white: 0, black: 2 });
  });

  test('doubling is impossible once the dice are rolled', () => {
    const match = rollTurn(blackPreRoll(), diceFrom([5, 2]));
    expect(canDouble(match)).toBe(false);
    expect(() => offerDouble(match)).toThrow();
  });

  test('only the cube owner may redouble', () => {
    // Black to roll, but white owns the cube: black cannot double.
    const match = blackPreRoll({ cube: { value: 2, owner: 'white' } });
    expect(canDouble(match)).toBe(false);
    expect(() => offerDouble(match)).toThrow();

    // Black owns it: black may redouble.
    const owned = blackPreRoll({ cube: { value: 2, owner: 'black' } });
    expect(canDouble(owned)).toBe(true);
    expect(takeDouble(offerDouble(owned)).cube).toEqual({
      value: 4,
      owner: 'white',
    });
  });

  test('take and pass are only answers to an offer', () => {
    const match = blackPreRoll();
    expect(() => takeDouble(match)).toThrow();
    expect(() => passDouble(match)).toThrow();
  });

  test('no doubling in the Crawford game', () => {
    const match = blackPreRoll({
      score: { white: 6, black: 2 },
      crawford: true,
    });
    expect(match.crawford).toBe(true);
    expect(canDouble(match)).toBe(false);
    expect(() => offerDouble(match)).toThrow();
  });

  test('dead cube: no double once the current stake already wins the match', () => {
    // Post-Crawford in a 7-point match: the trailer (black at 2) may double...
    const trailer = blackPreRoll({
      score: { white: 6, black: 2 },
      crawfordPlayed: true,
      crawford: false,
    });
    expect(canDouble(trailer)).toBe(true);

    // ...but the leader (black at 6) may not: a 1-stake win already reaches 7.
    const leader = blackPreRoll({
      score: { white: 2, black: 6 },
      crawfordPlayed: true,
      crawford: false,
    });
    expect(canDouble(leader)).toBe(false);
    expect(() => offerDouble(leader)).toThrow();
  });

  test('dead cube: the owner cannot redouble past the match target', () => {
    // Black owns a 2-cube at 5-away... black has 5 points of 7: 5+2 >= 7.
    const match = blackPreRoll({
      score: { white: 0, black: 5 },
      cube: { value: 2, owner: 'black' },
      crawfordPlayed: true,
      crawford: false,
    });
    expect(canDouble(match)).toBe(false);
  });

  test('the cube is dead for the whole of a 1-point match', () => {
    const match = blackPreRoll({ length: 7 });
    expect(
      canDouble({ ...match, length: 1, score: { white: 0, black: 0 } }),
    ).toBe(false);
  });
});

/**
 * A match where white bears off the last checker with the next commit.
 * Black's checkers define the result kind: borne off some = single, none =
 * gammon, none plus one in white's home = backgammon.
 */
function aboutToWin(options: {
  length: number;
  score?: { white: number; black: number };
  cube?: { value: number; owner: 'white' | 'black' | 'center' };
  crawfordPlayed?: boolean;
  black: Parameters<typeof createBoard>[0]['black'];
}): MatchState {
  return createMatch({
    length: options.length,
    score: options.score,
    cube: options.cube,
    crawfordPlayed: options.crawfordPlayed,
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
const backgammonLoser = { points: { 24: 14, 3: 1 } } as const;

function winNow(match: MatchState): MatchState {
  return commitMatchPlay(matchMovement(match, 1, 6));
}

describe('game end scores kind × cube into the match', () => {
  test('a single at cube 2 scores 2', () => {
    const match = winNow(
      aboutToWin({
        length: 7,
        cube: { value: 2, owner: 'white' },
        black: singleLoser,
      }),
    );
    expect(match.phase).toBe('game-over');
    expect(match.score).toEqual({ white: 2, black: 0 });
    expect(match.gameResult).toEqual({
      winner: 'white',
      end: 'checkers',
      kind: 'single',
      points: 2,
    });
  });

  test('a gammon at cube 2 scores 4', () => {
    const match = winNow(
      aboutToWin({
        length: 7,
        cube: { value: 2, owner: 'black' },
        black: gammonLoser,
      }),
    );
    expect(match.score).toEqual({ white: 4, black: 0 });
    expect(match.gameResult?.kind).toBe('gammon');
  });

  test('a backgammon at cube 1 scores 3', () => {
    const match = winNow(aboutToWin({ length: 7, black: backgammonLoser }));
    expect(match.score).toEqual({ white: 3, black: 0 });
    expect(match.gameResult?.kind).toBe('backgammon');
  });

  test('too good to double: an undoubled gammon still scores in full', () => {
    // White never doubled (cube centered); the gammon scores 2 × 1.
    const match = winNow(aboutToWin({ length: 7, black: gammonLoser }));
    expect(match.cube).toEqual({ value: 1, owner: 'center' });
    expect(match.score).toEqual({ white: 2, black: 0 });
  });

  test('reaching the target ends the match, even past the target', () => {
    const match = winNow(
      aboutToWin({
        length: 5,
        score: { white: 2, black: 0 },
        cube: { value: 2, owner: 'white' },
        black: gammonLoser,
      }),
    );
    expect(match.phase).toBe('match-over');
    expect(match.winner).toBe('white');
    expect(match.score).toEqual({ white: 6, black: 0 });
  });
});

describe('the sequence of games and the Crawford rule', () => {
  test('the next game starts fresh: new opening roll, centered cube', () => {
    const over = winNow(
      aboutToWin({
        length: 7,
        cube: { value: 2, owner: 'white' },
        black: singleLoser,
      }),
    );
    const next = nextGame(over, diceFrom([3, 5]));

    expect(next.phase).toBe('turn');
    expect(next.game.turn?.player).toBe('black');
    expect(next.game.record.plays).toHaveLength(0);
    expect(next.cube).toEqual({ value: 1, owner: 'center' });
    expect(next.score).toEqual({ white: 2, black: 0 });
    expect(next.games).toHaveLength(1);
    expect(next.gameResult).toBeNull();
    expect(next.crawford).toBe(false);
  });

  test('nextGame requires a finished (not match-finished) game', () => {
    const live = aboutToWin({ length: 7, black: singleLoser });
    expect(() => nextGame(live, diceFrom([3, 5]))).toThrow();

    const matchOver = winNow(aboutToWin({ length: 1, black: singleLoser }));
    expect(() => nextGame(matchOver, diceFrom([3, 5]))).toThrow();
  });

  test('reaching target−1 makes the next game the Crawford game, once', () => {
    // White jumps from 3 to 6 in a 7-point match: 6 = target − 1.
    const over = winNow(
      aboutToWin({
        length: 7,
        score: { white: 3, black: 2 },
        black: backgammonLoser,
      }),
    );
    const crawford = nextGame(over, diceFrom([3, 5]));
    expect(crawford.crawford).toBe(true);
    expect(crawford.crawfordPlayed).toBe(true);

    // Black wins the Crawford game; the following game is post-Crawford:
    // doubling resumes for the trailer even though white still sits at 6.
    let crawfordGame = createMatch({
      length: 7,
      score: { white: 6, black: 2 },
      crawford: true,
      crawfordPlayed: true,
      game: createGame({
        board: createBoard({
          white: { points: { 1: 2 }, off: 13 },
          black: { points: { 24: 1 }, off: 14 },
        }),
        player: 'black',
        roll: [6, 5],
      }),
    });
    crawfordGame = matchMovement(crawfordGame, 24, 6);
    const crawfordOver = commitMatchPlay(crawfordGame);
    expect(crawfordOver.phase).toBe('game-over');
    const postCrawford = nextGame(crawfordOver, diceFrom([3, 5]));
    expect(postCrawford.crawford).toBe(false);
    expect(postCrawford.crawfordPlayed).toBe(true);
  });

  test('a 1-point match begins as its own Crawford game', () => {
    const match = startMatch(1, diceFrom([6, 3]));
    expect(match.crawford).toBe(true);
  });
});

describe('resignation', () => {
  test('a player may resign during their own turn; accepting scores it', () => {
    let match = startMatch(7, diceFrom([6, 3]));
    match = offerResignation(match, 'white', 'single');
    expect(match.phase).toBe('resign-offered');
    expect(match.pendingResignation).toEqual({ by: 'white', kind: 'single' });

    const accepted = acceptResignation(match);
    expect(accepted.phase).toBe('game-over');
    expect(accepted.score).toEqual({ white: 0, black: 1 });
    expect(accepted.gameResult).toEqual({
      winner: 'black',
      end: 'resignation',
      kind: 'single',
      points: 1,
    });
    expect(accepted.games[0].decisions).toEqual([
      { type: 'resign', player: 'white', kind: 'single', afterPlays: 0 },
      {
        type: 'resign-response',
        player: 'black',
        accepted: true,
        afterPlays: 0,
      },
    ]);
  });

  test('a resigned gammon pays kind × cube', () => {
    let match = blackPreRoll({ cube: { value: 2, owner: 'black' } });
    match = offerResignation(match, 'black', 'gammon');
    const accepted = acceptResignation(match);
    expect(accepted.score).toEqual({ white: 4, black: 0 });
    expect(accepted.gameResult?.kind).toBe('gammon');
  });

  test('declining returns to the interrupted phase', () => {
    // During a turn...
    let turn = startMatch(7, diceFrom([6, 3]));
    turn = offerResignation(turn, 'white', 'single');
    const resumedTurn = declineResignation(turn);
    expect(resumedTurn.phase).toBe('turn');
    expect(resumedTurn.pendingResignation).toBeNull();
    expect(resumedTurn.decisions.at(-1)).toEqual({
      type: 'resign-response',
      player: 'black',
      accepted: false,
      afterPlays: 0,
    });

    // ...and during a pre-roll.
    let preRoll = blackPreRoll();
    preRoll = offerResignation(preRoll, 'black', 'backgammon');
    const resumedPreRoll = declineResignation(preRoll);
    expect(resumedPreRoll.phase).toBe('pre-roll');
    expect(resumedPreRoll.toRoll).toBe('black');
  });

  test('either player may resign, including off-turn', () => {
    const match = blackPreRoll();
    // White resigns while black is to roll.
    const offered = offerResignation(match, 'white', 'single');
    const accepted = acceptResignation(offered);
    expect(accepted.score).toEqual({ white: 0, black: 1 });
  });

  test('no resignation while a cube or resignation offer is pending', () => {
    const doubled = offerDouble(blackPreRoll());
    expect(() => offerResignation(doubled, 'white', 'single')).toThrow();

    const resigned = offerResignation(blackPreRoll(), 'white', 'single');
    expect(() => offerResignation(resigned, 'black', 'single')).toThrow();
  });
});

describe('deterministic replay of match records', () => {
  /** A scripted 5-point match: cube turns, a pass, resignations, a gammon. */
  function scriptedMatch(): MatchState {
    // Game 1: black doubles, white takes, black resigns a gammon: white +4.
    let m = startMatch(5, diceFrom([6, 3]));
    m = matchMovement(m, 24, 6);
    m = matchMovement(m, 13, 3);
    m = commitMatchPlay(m);
    m = takeDouble(offerDouble(m));
    m = acceptResignation(offerResignation(m, 'black', 'gammon'));
    expect(m.score).toEqual({ white: 4, black: 0 });

    // Game 2 is the Crawford game: white resigns a single: black +1.
    m = nextGame(m, diceFrom([3, 5]));
    expect(m.crawford).toBe(true);
    m = matchMovement(m, 12, 3);
    m = matchMovement(m, 12, 5);
    m = commitMatchPlay(m);
    m = acceptResignation(offerResignation(m, 'white', 'single'));
    expect(m.score).toEqual({ white: 4, black: 1 });

    // Game 3, post-Crawford: black doubles, white passes: black +1.
    m = nextGame(m, diceFrom([6, 1]));
    m = matchMovement(m, 13, 6);
    m = matchMovement(m, 24, 1);
    m = commitMatchPlay(m);
    m = passDouble(offerDouble(m));
    expect(m.score).toEqual({ white: 4, black: 2 });

    // Game 4: black resigns a single off-turn: white +1 wins the match 5-2.
    m = nextGame(m, diceFrom([2, 4]));
    m = matchMovement(m, 1, 2);
    m = matchMovement(m, 12, 4);
    m = commitMatchPlay(m);
    m = acceptResignation(offerResignation(m, 'black', 'single'));
    expect(m.phase).toBe('match-over');
    return m;
  }

  test('replayMatchGame reproduces every scripted game result', () => {
    const match = scriptedMatch();
    expect(match.games.map((g) => g.crawford)).toEqual([
      false,
      true,
      false,
      false,
    ]);
    for (const game of match.games) {
      expect(replayMatchGame(game).result).toEqual(game.result);
    }
  });

  test('replayMatch reproduces the scripted score and winner', () => {
    const match = scriptedMatch();
    const replayed = replayMatch({ length: match.length, games: match.games });
    expect(replayed.score).toEqual({ white: 5, black: 2 });
    expect(replayed.winner).toBe('white');
  });

  test('a seeded played-out match replays to the identical outcome', () => {
    const dice = createSeededDice(99);
    let m = startMatch(3, dice);
    for (let guard = 0; guard < 10_000 && m.phase !== 'match-over'; guard++) {
      if (m.phase === 'game-over') {
        m = nextGame(m, dice);
      } else if (m.phase === 'pre-roll') {
        m = rollTurn(m, dice);
      } else {
        const turn = m.game.turn;
        if (!turn) {
          throw new Error('expected a turn in progress');
        }
        const [play] = legalPlays(turn.startBoard, turn.player, turn.roll);
        for (const movement of play?.movements ?? []) {
          m = matchMovement(m, movement.from, movement.die);
        }
        m = commitMatchPlay(m);
      }
    }
    expect(m.phase).toBe('match-over');

    for (const game of m.games) {
      const replayed = replayMatchGame(game);
      expect(replayed.result).toEqual(game.result);
      expect(replayed.board).toEqual(replayGame(game.game).board);
    }
    const replayed = replayMatch({ length: m.length, games: m.games });
    expect(replayed.score).toEqual(m.score);
    expect(replayed.winner).toBe(m.winner);
  });

  test('replay rejects a record that never reaches an end', () => {
    const live = startMatch(7, diceFrom([6, 3]));
    expect(() =>
      replayMatchGame({
        game: live.game.record,
        decisions: [],
        crawford: false,
        money: false,
        tutorAssisted: false,
        result: {
          winner: 'white',
          end: 'checkers',
          kind: 'single',
          points: 1,
        },
      }),
    ).toThrow();
  });
});

describe('the tutor-assisted flag (GLOSSARY "Tutor mode" provenance)', () => {
  test('matches start unassisted and marking is idempotent', () => {
    const match = startMatch(7, diceFrom([6, 3]));
    expect(match.tutorAssisted).toBe(false);

    const marked = markTutorAssisted(match);
    expect(marked.tutorAssisted).toBe(true);
    expect(markTutorAssisted(marked)).toBe(marked);
  });

  test('a finished game records whether Tutor mode was ever on during it', () => {
    // White bears off their last checker with tutor marked mid-game.
    const board = createBoard({
      white: { points: { 1: 1 }, off: 14 },
      black: { points: { 24: 2 }, off: 13 },
    });
    let match = createMatch({
      length: 7,
      game: createGame({ board, player: 'white', roll: [6, 5] }),
    });
    match = markTutorAssisted(match);
    match = matchMovement(match, 1, 6);
    match = commitMatchPlay(match);

    expect(match.phase).toBe('game-over');
    expect(match.games[0].tutorAssisted).toBe(true);

    // The next game starts clean: the flag is per game.
    match = nextGame(match, diceFrom([6, 3]));
    expect(match.tutorAssisted).toBe(false);
  });

  test('an unassisted game records false even if an earlier game was assisted', () => {
    const board = createBoard({
      white: { points: { 1: 1 }, off: 14 },
      black: { points: { 24: 2 }, off: 13 },
    });
    let match = createMatch({
      length: 7,
      game: createGame({ board, player: 'white', roll: [6, 5] }),
    });
    match = markTutorAssisted(match);
    match = commitMatchPlay(matchMovement(match, 1, 6));
    match = nextGame(match, diceFrom([6, 3]));
    match = matchMovement(match, 24, 6);
    match = matchMovement(match, 13, 3);
    match = commitMatchPlay(match);
    // Black concedes the second game by passing white's double.
    match = rollTurn(match, diceFrom([5, 2]));
    match = matchMovement(match, 1, 2);
    match = matchMovement(match, 12, 5);
    match = commitMatchPlay(match);
    match = passDouble(offerDouble(match));

    expect(match.games.map((game) => game.tutorAssisted)).toEqual([
      true,
      false,
    ]);
  });

  test('marking outside a live game throws', () => {
    const over = passDouble(offerDouble(blackPreRoll()));
    expect(over.phase).toBe('game-over');
    expect(() => markTutorAssisted(over)).toThrow();
  });

  test('a takeback keeps the game marked', () => {
    let match = markTutorAssisted(startMatch(7, diceFrom([6, 3])));
    match = matchMovement(match, 24, 6);
    match = matchMovement(match, 13, 3);
    match = commitMatchPlay(match);

    expect(takebackPlay(match, 'white').tutorAssisted).toBe(true);
  });
});

describe('createMatch from an arbitrary position', () => {
  test('injects a mid-match game with score and cube', () => {
    const game = createGame({
      board: createBoard({
        white: { points: { 1: 1 }, off: 14 },
        black: { points: { 24: 2 }, off: 13 },
      }),
      player: 'white',
      roll: [6, 5],
    });
    const match = createMatch({
      length: 5,
      game,
      score: { white: 2, black: 3 },
      cube: { value: 2, owner: 'white' },
    });

    expect(match.phase).toBe('turn');
    expect(match.score).toEqual({ white: 2, black: 3 });
    expect(match.cube).toEqual({ value: 2, owner: 'white' });
  });

  test('rejects a score at or beyond the match length', () => {
    const game = createGame({
      board: createBoard({
        white: { points: { 1: 1 }, off: 14 },
        black: { points: { 24: 2 }, off: 13 },
      }),
      player: 'white',
      roll: [6, 5],
    });
    expect(() =>
      createMatch({ length: 5, game, score: { white: 5, black: 0 } }),
    ).toThrow();
  });
});

describe('takeback (GLOSSARY "Takeback"): rewinding a committed play', () => {
  test('taking back the just-committed play restores the exact prior turn, dice included', () => {
    const before = startMatch(7, diceFrom([6, 3]));
    let match = matchMovement(before, 24, 6);
    match = matchMovement(match, 13, 3);
    match = commitMatchPlay(match);
    expect(match.phase).toBe('pre-roll');

    expect(canTakeback(match, 'white')).toBe(true);
    expect(takebackPlay(match, 'white')).toEqual(before);
  });

  test("unwinds the opponent's committed response along with the play", () => {
    const before = startMatch(7, diceFrom([6, 3]));
    let match = matchMovement(before, 24, 6);
    match = matchMovement(match, 13, 3);
    match = commitMatchPlay(match);
    // Black responds with a committed 5-2 play; white is back at pre-roll.
    match = rollTurn(match, diceFrom([5, 2]));
    match = matchMovement(match, 1, 2);
    match = matchMovement(match, 12, 5);
    match = commitMatchPlay(match);
    expect(match.toRoll).toBe('white');
    expect(match.game.record.plays).toHaveLength(2);

    expect(takebackPlay(match, 'white')).toEqual(before);
  });

  test("discards the opponent's turn in progress", () => {
    const before = startMatch(7, diceFrom([6, 3]));
    let match = matchMovement(before, 24, 6);
    match = matchMovement(match, 13, 3);
    match = commitMatchPlay(match);
    // Black has rolled and moved one checker, but not committed.
    match = rollTurn(match, diceFrom([5, 2]));
    match = matchMovement(match, 1, 2);

    expect(takebackPlay(match, 'white')).toEqual(before);
  });

  test('unwinds a double offered in response to the play', () => {
    const before = startMatch(7, diceFrom([6, 3]));
    let match = matchMovement(before, 24, 6);
    match = matchMovement(match, 13, 3);
    match = commitMatchPlay(match);
    match = offerDouble(match);
    expect(match.phase).toBe('cube-offered');

    expect(takebackPlay(match, 'white')).toEqual(before);
  });

  test('unwinds a double-and-take sequence, restoring the centered cube', () => {
    const before = startMatch(7, diceFrom([6, 3]));
    let match = matchMovement(before, 24, 6);
    match = matchMovement(match, 13, 3);
    match = commitMatchPlay(match);
    // Black doubles, white takes, black plays on at 2; white takes back.
    match = takeDouble(offerDouble(match));
    expect(match.cube).toEqual({ value: 2, owner: 'white' });
    match = rollTurn(match, diceFrom([5, 2]));
    match = matchMovement(match, 1, 2);
    match = matchMovement(match, 12, 5);
    match = commitMatchPlay(match);

    expect(takebackPlay(match, 'white')).toEqual(before);
  });

  test('keeps cube decisions that preceded the play being taken back', () => {
    // White doubles before rolling; black takes; white plays and black
    // responds. Taking back white's play restores the doubled cube.
    let match = blackPreRoll();
    match = rollTurn(match, diceFrom([5, 2]));
    match = matchMovement(match, 1, 2);
    match = matchMovement(match, 12, 5);
    match = commitMatchPlay(match);
    // White doubles at their pre-roll; black takes; white rolls 4-1.
    match = takeDouble(offerDouble(match));
    expect(match.cube).toEqual({ value: 2, owner: 'black' });
    match = rollTurn(match, diceFrom([4, 1]));
    const beforePlay = match;
    match = matchMovement(match, 24, 1);
    match = matchMovement(match, 13, 4);
    match = commitMatchPlay(match);

    const rewound = takebackPlay(match, 'white');
    expect(rewound).toEqual(beforePlay);
    expect(rewound.cube).toEqual({ value: 2, owner: 'black' });
    expect(rewound.decisions).toEqual([
      { type: 'double', player: 'white', afterPlays: 2 },
      { type: 'take', player: 'black', afterPlays: 2 },
    ]);
  });

  test('is unavailable before the player has committed a play', () => {
    const match = startMatch(7, diceFrom([6, 3]));
    expect(canTakeback(match, 'white')).toBe(false);
    expect(canTakeback(match, 'black')).toBe(false);
    expect(() => takebackPlay(match, 'white')).toThrow();

    const committed = blackPreRoll();
    expect(canTakeback(committed, 'white')).toBe(true);
    expect(canTakeback(committed, 'black')).toBe(false);
    expect(() => takebackPlay(committed, 'black')).toThrow();
  });

  test('property: takeback(commit(s)) == s at every turn of a seeded match', () => {
    // Play out a whole seeded match; at every committed play that leaves the
    // game live, taking it back must restore the pre-play state exactly —
    // same dice, same record length, same cube, same decisions.
    const dice = createSeededDice(41);
    let m = startMatch(3, dice);
    let checked = 0;
    for (let guard = 0; guard < 10_000 && m.phase !== 'match-over'; guard++) {
      if (m.phase === 'game-over') {
        m = nextGame(m, dice);
      } else if (m.phase === 'pre-roll') {
        m = rollTurn(m, dice);
      } else {
        const turn = m.game.turn;
        if (!turn) {
          throw new Error('expected a turn in progress');
        }
        const beforePlay = m;
        const [play] = legalPlays(turn.startBoard, turn.player, turn.roll);
        for (const movement of play?.movements ?? []) {
          m = matchMovement(m, movement.from, movement.die);
        }
        m = commitMatchPlay(m);
        if (m.phase === 'pre-roll') {
          expect(takebackPlay(m, turn.player)).toEqual(beforePlay);
          checked++;
        }
      }
    }
    expect(m.phase).toBe('match-over');
    expect(checked).toBeGreaterThan(50);
  });

  test('is unavailable while a resignation pends and once the game is over', () => {
    const offered = offerResignation(blackPreRoll(), 'white', 'single');
    expect(canTakeback(offered, 'white')).toBe(false);
    expect(() => takebackPlay(offered, 'white')).toThrow();

    const over = passDouble(offerDouble(blackPreRoll()));
    expect(over.phase).toBe('game-over');
    expect(canTakeback(over, 'white')).toBe(false);
    expect(() => takebackPlay(over, 'white')).toThrow();
  });
});
