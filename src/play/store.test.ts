import {
  createBoard,
  createGame,
  createMatch,
  createSeededDice,
  type Die,
  type GameState,
} from '../rules';
import { scriptedDice } from '../test/dice';
import { canCommit, viableMovements } from './selectors';
import { createPlayStore, type PlayStore } from './store';

/** A store whose match opens with white to play 6-3 from the start position. */
function startedStore(...laterRolls: Die[]): PlayStore {
  const store = createPlayStore({ dice: scriptedDice(6, 3, ...laterRolls) });
  store.dispatch({ type: 'start', length: 7 });
  return store;
}

/** Wrap a game in a 7-point match store (mid-position tests). */
function storeWith(game: GameState, ...rolls: Die[]): PlayStore {
  return createPlayStore({
    match: createMatch({ length: 7, game }),
    dice: scriptedDice(...rolls),
  });
}

describe('starting a match', () => {
  it('holds no match until start is dispatched', () => {
    const store = createPlayStore({ dice: scriptedDice() });
    expect(store.getState().match).toBeNull();
  });

  it('begins with the opening roll decided by the dice source', () => {
    const store = createPlayStore({ dice: scriptedDice(6, 3) });
    store.dispatch({ type: 'start', length: 7 });

    const match = store.getState().match;
    expect(match?.game.turn?.player).toBe('white');
    expect(match?.game.turn?.roll).toEqual([6, 3]);
    expect(match?.length).toBe(7);
    expect(match?.score).toEqual({ white: 0, black: 0 });
    expect(match?.cube).toEqual({ value: 1, owner: 'center' });
  });

  it('defaults to a 7-point match', () => {
    const store = createPlayStore({ dice: scriptedDice(6, 3) });
    store.dispatch({ type: 'start' });
    expect(store.getState().match?.length).toBe(7);
  });

  it('starts matches of other lengths', () => {
    const store = createPlayStore({ dice: scriptedDice(6, 3) });
    store.dispatch({ type: 'start', length: 5 });
    expect(store.getState().match?.length).toBe(5);
  });

  it('notifies subscribers when the state changes', () => {
    const store = createPlayStore({ dice: scriptedDice(2, 5) });
    let notified = 0;
    store.subscribe(() => {
      notified += 1;
    });

    store.dispatch({ type: 'start' });

    expect(notified).toBe(1);
  });
});

describe('playing a turn', () => {
  it('applies a legal movement and consumes the die', () => {
    const store = startedStore();

    store.dispatch({ type: 'movement', from: 24, die: 6 });

    const game = store.getState().match?.game;
    expect(game?.board.points[24]).toBe(1);
    expect(game?.board.points[18]).toBe(1);
    expect(game?.turn?.remainingDice).toEqual([3]);
  });

  it('ignores an illegal movement, leaving the state untouched', () => {
    const store = startedStore();
    const before = store.getState();

    // Point 1 belongs to black; white cannot move from it.
    store.dispatch({ type: 'movement', from: 1, die: 6 });

    expect(store.getState()).toBe(before);
  });

  it('undo restores the intermediate state, then the turn start', () => {
    const store = startedStore();
    store.dispatch({ type: 'movement', from: 24, die: 6 });
    const afterFirst = store.getState().match?.game;
    store.dispatch({ type: 'movement', from: 18, die: 3 });

    store.dispatch({ type: 'undo' });
    expect(store.getState().match?.game.board).toEqual(afterFirst?.board);
    expect(store.getState().match?.game.turn?.remainingDice).toEqual([3]);

    store.dispatch({ type: 'undo' });
    expect(store.getState().match?.game.board.points[24]).toBe(2);
    expect(store.getState().match?.game.turn?.remainingDice).toEqual([6, 3]);
  });

  it('ignores undo when nothing has been moved this turn', () => {
    const store = startedStore();
    const before = store.getState();

    store.dispatch({ type: 'undo' });

    expect(store.getState()).toBe(before);
  });

  it('refuses to commit an incomplete play', () => {
    const store = startedStore();
    store.dispatch({ type: 'movement', from: 24, die: 6 });
    const before = store.getState();

    store.dispatch({ type: 'commit' });

    expect(store.getState()).toBe(before);
  });

  it('commit leads to the opponent pre-roll; roll starts their turn', () => {
    const store = startedStore(5, 2);
    store.dispatch({ type: 'movement', from: 24, die: 6 });
    store.dispatch({ type: 'movement', from: 13, die: 3 });

    store.dispatch({ type: 'commit' });

    expect(store.getState().match?.phase).toBe('pre-roll');
    expect(store.getState().match?.toRoll).toBe('black');
    expect(store.getState().match?.game.record.plays).toHaveLength(1);

    store.dispatch({ type: 'roll' });

    const game = store.getState().match?.game;
    expect(game?.turn?.player).toBe('black');
    expect(game?.turn?.roll).toEqual([5, 2]);
  });

  it('ignores a roll while the turn is in progress', () => {
    const store = startedStore();
    const before = store.getState();

    store.dispatch({ type: 'roll' });

    expect(store.getState()).toBe(before);
  });
});

describe('forced plays', () => {
  it('plays and commits the single legal play in one action', () => {
    const board = createBoard({
      white: { points: { 24: 1 }, off: 14 },
      black: { points: { 15: 2, 1: 13 } },
    });
    const store = storeWith(
      createGame({ board, player: 'white', roll: [6, 3] }),
      4,
      2,
    );

    store.dispatch({ type: 'forced' });

    const match = store.getState().match;
    expect(match?.game.board.points[18]).toBe(1);
    expect(match?.phase).toBe('pre-roll');
    expect(match?.toRoll).toBe('black');
  });

  it('is ignored when the player has a choice of plays', () => {
    const store = startedStore();
    const before = store.getState();

    store.dispatch({ type: 'forced' });

    expect(store.getState()).toBe(before);
  });
});

describe('the doubling cube through the store', () => {
  /** White committed the opening; black is at the pre-roll decision. */
  function blackPreRoll(...rolls: Die[]): PlayStore {
    const store = startedStore(...rolls);
    store.dispatch({ type: 'movement', from: 24, die: 6 });
    store.dispatch({ type: 'movement', from: 13, die: 3 });
    store.dispatch({ type: 'commit' });
    return store;
  }

  it('double, then take: the cube moves doubled to the taker', () => {
    const store = blackPreRoll(5, 2);

    store.dispatch({ type: 'double' });
    expect(store.getState().match?.phase).toBe('cube-offered');

    store.dispatch({ type: 'take' });
    expect(store.getState().match?.cube).toEqual({ value: 2, owner: 'white' });
    expect(store.getState().match?.phase).toBe('pre-roll');

    store.dispatch({ type: 'roll' });
    expect(store.getState().match?.game.turn?.player).toBe('black');
  });

  it('double, then pass: the doubler scores the pre-double stake', () => {
    const store = blackPreRoll();

    store.dispatch({ type: 'double' });
    store.dispatch({ type: 'pass' });

    expect(store.getState().match?.phase).toBe('game-over');
    expect(store.getState().match?.score).toEqual({ white: 0, black: 1 });
  });

  it('ignores a double outside the pre-roll moment', () => {
    const store = startedStore();
    const before = store.getState();

    store.dispatch({ type: 'double' });

    expect(store.getState()).toBe(before);
  });

  it('ignores take and pass without an offer', () => {
    const store = blackPreRoll();
    const before = store.getState();

    store.dispatch({ type: 'take' });
    store.dispatch({ type: 'pass' });

    expect(store.getState()).toBe(before);
  });
});

describe('resignation through the store', () => {
  it('the current actor resigns; the opponent accepts', () => {
    const store = startedStore();

    store.dispatch({ type: 'resign', kind: 'single' });
    expect(store.getState().match?.phase).toBe('resign-offered');
    expect(store.getState().match?.pendingResignation).toEqual({
      by: 'white',
      kind: 'single',
    });

    store.dispatch({ type: 'accept-resign' });
    expect(store.getState().match?.phase).toBe('game-over');
    expect(store.getState().match?.score).toEqual({ white: 0, black: 1 });
  });

  it('a declined resignation resumes the turn', () => {
    const store = startedStore();

    store.dispatch({ type: 'resign', kind: 'gammon' });
    store.dispatch({ type: 'decline-resign' });

    expect(store.getState().match?.phase).toBe('turn');
    expect(store.getState().match?.pendingResignation).toBeNull();
  });
});

describe('game end and the games that follow', () => {
  function endedStore(...rolls: Die[]): PlayStore {
    const board = createBoard({
      white: { points: { 1: 1 }, off: 14 },
      black: { points: { 24: 1 }, off: 14 },
    });
    const store = storeWith(
      createGame({ board, player: 'white', roll: [6, 5] }),
      ...rolls,
    );
    store.dispatch({ type: 'movement', from: 1, die: 6 });
    store.dispatch({ type: 'commit' });
    return store;
  }

  it('scores the finished game and awaits the next one', () => {
    const match = endedStore().getState().match;
    expect(match?.phase).toBe('game-over');
    expect(match?.gameResult).toEqual({
      winner: 'white',
      end: 'checkers',
      kind: 'single',
      points: 1,
    });
    expect(match?.score).toEqual({ white: 1, black: 0 });
  });

  it('ignores further movements and commits after the game ends', () => {
    const store = endedStore();
    const before = store.getState();

    store.dispatch({ type: 'movement', from: 24, die: 3 });
    store.dispatch({ type: 'commit' });
    store.dispatch({ type: 'undo' });

    expect(store.getState()).toBe(before);
  });

  it('next-game starts the following game of the same match', () => {
    const store = endedStore(3, 1);

    store.dispatch({ type: 'next-game' });

    const match = store.getState().match;
    expect(match?.phase).toBe('turn');
    expect(match?.score).toEqual({ white: 1, black: 0 });
    expect(match?.games).toHaveLength(1);
    expect(match?.game.turn?.roll).toEqual([3, 1]);
  });

  it('start begins a brand-new match at any time', () => {
    const store = endedStore(3, 1);

    store.dispatch({ type: 'start', length: 3 });

    const match = store.getState().match;
    expect(match?.length).toBe(3);
    expect(match?.score).toEqual({ white: 0, black: 0 });
    expect(match?.games).toEqual([]);
  });
});

describe('a complete match through the store', () => {
  it('reaches a match winner using only store actions', () => {
    const store = createPlayStore({ dice: createSeededDice(2024) });
    store.dispatch({ type: 'start', length: 3 });

    for (let step = 0; step < 20_000; step++) {
      const match = store.getState().match;
      if (!match) {
        throw new Error('match vanished');
      }
      if (match.phase === 'match-over') {
        break;
      }
      if (match.phase === 'game-over') {
        store.dispatch({ type: 'next-game' });
        continue;
      }
      if (match.phase === 'pre-roll') {
        store.dispatch({ type: 'roll' });
        continue;
      }
      if (canCommit(match.game)) {
        store.dispatch({ type: 'commit' });
        continue;
      }
      // The viability filter guarantees a movement exists whenever the
      // play is incomplete — a player can never be stranded.
      const [movement] = viableMovements(match.game);
      expect(movement).toBeDefined();
      store.dispatch({
        type: 'movement',
        from: movement.from,
        die: movement.die,
      });
    }

    const finished = store.getState().match;
    expect(finished?.phase).toBe('match-over');
    expect(finished?.winner).not.toBeNull();
    expect(
      finished?.score[finished.winner as 'white' | 'black'],
    ).toBeGreaterThanOrEqual(3);
  });
});
