/**
 * The autoplay controller removes decision-free friction from the human's
 * turns (spec stories 43-44): auto-roll on the user's pre-roll in a Race, and
 * auto-play of Forced plays (GLOSSARY), both behind persisted settings read
 * live so toggles apply immediately. Dances stay manual, and a turn restored
 * by takeback is never instantly re-played.
 */

import { describe, expect, it, vi } from 'vitest';
import {
  createBoard,
  createGame,
  createMatch,
  type DiceRoll,
  type Die,
  type GameState,
  type Player,
} from '../rules';
import { scriptedDice } from '../test/dice';
import { type AutoplaySettings, createAutoplay } from './autoplay';
import { createPlayStore, type PlayStore } from './store';

/** Pacing that yields the event loop but never waits. */
const instant = () => new Promise<void>((resolve) => setTimeout(resolve, 0));

/** Flush any pending autoplay pacing without asserting progress. */
const settle = async () => {
  for (let i = 0; i < 10; i++) {
    await instant();
  }
};

function autoplayWith(
  store: PlayStore,
  settings: AutoplaySettings,
  players: readonly Player[] = ['white'],
) {
  return createAutoplay({
    store,
    players,
    settings: () => settings,
    stepMs: 0,
    pace: instant,
  });
}

const allOn: AutoplaySettings = { autoRollRaces: true, autoForcedPlays: true };

/** A pure no-contact race: both armies fully home. */
function raceGame(player: Player, roll: DiceRoll): GameState {
  return createGame({
    board: createBoard({
      white: { points: { 6: 5, 5: 5, 4: 5 } },
      black: { points: { 19: 5, 20: 5, 21: 5 } },
    }),
    player,
    roll,
  });
}

/** A store at white's pre-roll in a race (black just borne one off). */
function whitePreRollRace(dice: Die[] = [3, 1]): PlayStore {
  const store = createPlayStore({
    match: createMatch({ length: 7, game: raceGame('black', [6, 3]) }),
    dice: scriptedDice(...dice),
  });
  store.dispatch({ type: 'movement', from: 19, die: 6 });
  store.dispatch({ type: 'movement', from: 21, die: 3 });
  store.dispatch({ type: 'commit' });
  expect(store.getState().match?.phase).toBe('pre-roll');
  expect(store.getState().match?.toRoll).toBe('white');
  return store;
}

/** A store at white's pre-roll with contact (the standard opening reply). */
function whitePreRollContact(): PlayStore {
  const store = createPlayStore({
    match: createMatch({
      length: 7,
      game: createGame({
        board: createBoard({
          white: { points: { 24: 2, 13: 5, 8: 3, 6: 5 } },
          black: { points: { 1: 2, 12: 5, 17: 3, 19: 5 } },
        }),
        player: 'black',
        roll: [3, 1],
      }),
    }),
    dice: scriptedDice(6, 3),
  });
  store.dispatch({ type: 'movement', from: 17, die: 3 });
  store.dispatch({ type: 'movement', from: 19, die: 1 });
  store.dispatch({ type: 'commit' });
  expect(store.getState().match?.phase).toBe('pre-roll');
  expect(store.getState().match?.toRoll).toBe('white');
  return store;
}

describe('auto-roll in races', () => {
  it("rolls the user's dice at a race pre-roll instead of stopping", () => {
    const store = whitePreRollRace([3, 1]);
    const autoplay = autoplayWith(store, {
      autoRollRaces: true,
      autoForcedPlays: false,
    });

    const match = store.getState().match;
    expect(match?.phase).toBe('turn');
    expect(match?.game.turn?.player).toBe('white');
    expect(match?.game.turn?.roll).toEqual([3, 1]);
    autoplay.dispose();
  });

  it('keeps the Double/Roll stop in contact positions', async () => {
    const store = whitePreRollContact();
    const autoplay = autoplayWith(store, allOn);

    await settle();
    expect(store.getState().match?.phase).toBe('pre-roll');
    autoplay.dispose();
  });

  it('keeps the stop while the setting is off, and rolls on recheck once on', async () => {
    const store = whitePreRollRace();
    const settings = { autoRollRaces: false, autoForcedPlays: false };
    const autoplay = autoplayWith(store, settings);

    await settle();
    expect(store.getState().match?.phase).toBe('pre-roll');

    settings.autoRollRaces = true;
    autoplay.recheck();
    expect(store.getState().match?.phase).toBe('turn');
    autoplay.dispose();
  });

  it("never rolls for a side it does not act for (the opponent's pre-roll)", async () => {
    // Black's pre-roll in a race: white commits first.
    const store = createPlayStore({
      match: createMatch({ length: 7, game: raceGame('white', [2, 1]) }),
      dice: scriptedDice(6, 6),
    });
    store.dispatch({ type: 'movement', from: 6, die: 2 });
    store.dispatch({ type: 'movement', from: 6, die: 1 });
    store.dispatch({ type: 'commit' });
    expect(store.getState().match?.toRoll).toBe('black');

    const autoplay = autoplayWith(store, allOn, ['white']);
    await settle();
    expect(store.getState().match?.phase).toBe('pre-roll');
    autoplay.dispose();
  });

  it('acts for whichever human is on roll in a hot-seat match', () => {
    const store = createPlayStore({
      match: createMatch({ length: 7, game: raceGame('white', [2, 1]) }),
      dice: scriptedDice(6, 6),
    });
    store.dispatch({ type: 'movement', from: 6, die: 2 });
    store.dispatch({ type: 'movement', from: 6, die: 1 });
    store.dispatch({ type: 'commit' });

    const autoplay = autoplayWith(store, allOn, ['white', 'black']);
    expect(store.getState().match?.phase).toBe('turn');
    expect(store.getState().match?.game.turn?.player).toBe('black');
    autoplay.dispose();
  });
});

/**
 * White on 24 with 14 off, black holding the 15 point: 6-3 has exactly one
 * legal play, 24/18 (the 3 is unplayable everywhere, and the higher die must
 * be played when only one die can be).
 */
function whiteForcedTurn(dice: Die[] = [5, 2]): PlayStore {
  return createPlayStore({
    match: createMatch({
      length: 7,
      game: createGame({
        board: createBoard({
          white: { points: { 24: 1 }, off: 14 },
          black: { points: { 15: 2, 1: 13 } },
        }),
        player: 'white',
        roll: [6, 3],
      }),
    }),
    dice: scriptedDice(...dice),
  });
}

describe('auto-play of forced plays', () => {
  it('applies the single legal play visibly and commits it', async () => {
    const store = whiteForcedTurn();
    // Record every state the store passes through: the movement must land
    // as its own visible step before the commit.
    const steps: Array<{ phase: string | undefined; movements: number }> = [];
    store.subscribe(() => {
      const match = store.getState().match;
      steps.push({
        phase: match?.phase,
        movements: match?.game.turn?.movements.length ?? 0,
      });
    });
    const autoplay = autoplayWith(store, allOn);

    await vi.waitFor(() => {
      expect(store.getState().match?.phase).toBe('pre-roll');
    });
    const match = store.getState().match;
    expect(match?.toRoll).toBe('black');
    expect(match?.game.record.plays).toHaveLength(1);
    expect(match?.game.record.plays[0].movements).toEqual([
      { from: 24, to: 18, die: 6, hit: false },
    ]);
    // The movement was a distinct observable step before the commit.
    expect(steps).toContainEqual({ phase: 'turn', movements: 1 });
    autoplay.dispose();
  });

  it('leaves turns with a choice of plays untouched', async () => {
    // The standard opening 3-1 for black has many legal plays.
    const store = createPlayStore({
      match: createMatch({
        length: 7,
        game: createGame({
          board: createBoard({
            white: { points: { 24: 2, 13: 5, 8: 3, 6: 5 } },
            black: { points: { 1: 2, 12: 5, 17: 3, 19: 5 } },
          }),
          player: 'black',
          roll: [3, 1],
        }),
      }),
      dice: scriptedDice(),
    });
    const autoplay = autoplayWith(store, allOn, ['white', 'black']);

    await settle();
    expect(store.getState().match?.game.turn?.movements).toHaveLength(0);
    expect(store.getState().match?.phase).toBe('turn');
    autoplay.dispose();
  });

  it('leaves a dance for the manual Continue', async () => {
    const store = createPlayStore({
      match: createMatch({
        length: 7,
        game: createGame({
          board: createBoard({
            white: { points: { 13: 14 }, bar: 1 },
            black: {
              points: { 19: 2, 20: 2, 21: 2, 22: 2, 23: 2, 24: 2, 17: 3 },
            },
          }),
          player: 'white',
          roll: [6, 3],
        }),
      }),
      dice: scriptedDice(),
    });
    const autoplay = autoplayWith(store, allOn);

    await settle();
    expect(store.getState().match?.phase).toBe('turn');
    expect(store.getState().match?.game.record.plays).toHaveLength(0);
    autoplay.dispose();
  });

  it('does nothing while the setting is off, and plays on recheck once on', async () => {
    const store = whiteForcedTurn();
    const settings = { autoRollRaces: false, autoForcedPlays: false };
    const autoplay = autoplayWith(store, settings);

    await settle();
    expect(store.getState().match?.phase).toBe('turn');
    expect(store.getState().match?.game.turn?.movements).toHaveLength(0);

    settings.autoForcedPlays = true;
    autoplay.recheck();
    await vi.waitFor(() => {
      expect(store.getState().match?.phase).toBe('pre-roll');
    });
    autoplay.dispose();
  });

  it("never plays the opponent's forced turn", async () => {
    // The same forced position with colors swapped: black on 1, 6-3.
    const store = createPlayStore({
      match: createMatch({
        length: 7,
        game: createGame({
          board: createBoard({
            white: { points: { 10: 2, 24: 13 } },
            black: { points: { 1: 1 }, off: 14 },
          }),
          player: 'black',
          roll: [6, 3],
        }),
      }),
      dice: scriptedDice(),
    });
    const autoplay = autoplayWith(store, allOn, ['white']);

    await settle();
    expect(store.getState().match?.game.turn?.movements).toHaveLength(0);
    autoplay.dispose();
  });

  it('aborts, leaving the user in control, when they move during the pacing', async () => {
    // Hold autoplay's pace open, play the turn by hand, then release it: the
    // stale auto-play must never land on top of the user's commit.
    let release: () => void = () => {};
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    const store = whiteForcedTurn();
    const autoplay = createAutoplay({
      store,
      players: ['white'],
      settings: () => allOn,
      stepMs: 0,
      pace: () => gate,
    });

    // While autoplay waits out its first beat, the user plays the turn.
    store.dispatch({ type: 'movement', from: 24, die: 6 });
    store.dispatch({ type: 'commit' });
    expect(store.getState().match?.phase).toBe('pre-roll');

    release();
    await settle();
    // The committed play stands alone; autoplay never double-acted.
    expect(store.getState().match?.game.record.plays).toHaveLength(1);
    expect(store.getState().match?.phase).toBe('pre-roll');
    autoplay.dispose();
  });
});

describe('takeback-restored turns', () => {
  it('pauses on a takeback-restored forced turn so the user can look at it', async () => {
    const store = whiteForcedTurn();
    const autoplay = autoplayWith(store, allOn);

    // Autoplay plays and commits the forced 24/18.
    await vi.waitFor(() => {
      expect(store.getState().match?.phase).toBe('pre-roll');
    });

    // A takeback restores the forced turn: autoplay must NOT re-play it.
    store.dispatch({ type: 'takeback', player: 'white' });
    expect(store.getState().match?.phase).toBe('turn');
    await settle();
    expect(store.getState().match?.phase).toBe('turn');
    expect(store.getState().match?.game.turn?.movements).toHaveLength(0);
    expect(store.getState().match?.game.record.plays).toHaveLength(0);

    // The pause is one turn deep: the user replays it by hand and the next
    // forced turn (a fresh moment) auto-plays again.
    store.dispatch({ type: 'movement', from: 24, die: 6 });
    store.dispatch({ type: 'commit' });
    expect(store.getState().match?.game.record.plays).toHaveLength(1);
    autoplay.dispose();
  });
});
