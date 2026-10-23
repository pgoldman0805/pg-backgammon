/**
 * The race autopilot controller (spec story 59): once the user switches it on
 * during a Race (GLOSSARY), it plays the user's remaining turns — roll at the
 * pre-roll, then the engine's best play at FULL strength (never a weakened
 * Difficulty), paced like the opponent's movements — until the game ends. It
 * never answers cube decisions aimed at the user, never acts for the
 * opponent, stops on a second press or a takeback, and never carries into the
 * next game.
 */

import { describe, expect, it, vi } from 'vitest';
import type { Engine, RankPlaysOptions } from '../engine';
import { createFakeEngine } from '../engine/fake';
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
import { createRaceAutopilot, type RaceAutopilot } from './raceAutopilot';
import { createPlayStore, type PlayStore } from './store';

/** Pacing that yields the event loop but never waits. */
const instant = () => new Promise<void>((resolve) => setTimeout(resolve, 0));

/** Flush any pending autopilot pacing without asserting progress. */
const settle = async () => {
  for (let i = 0; i < 10; i++) {
    await instant();
  }
};

/**
 * A fake engine that records every rankPlays options argument, so tests can
 * pin that the autopilot never passes a Difficulty (full strength only).
 */
function spyEngine(): Engine & {
  rankCalls: Array<RankPlaysOptions | undefined>;
} {
  const fake = createFakeEngine();
  const engine = {
    ...fake,
    rankCalls: [] as Array<RankPlaysOptions | undefined>,
    rankPlays(
      position: Parameters<Engine['rankPlays']>[0],
      roll: Parameters<Engine['rankPlays']>[1],
      options?: Parameters<Engine['rankPlays']>[2],
    ) {
      engine.rankCalls.push(options);
      return fake.rankPlays(position, roll, options);
    },
  };
  return engine;
}

function autopilotWith(
  store: PlayStore,
  engine: Engine = spyEngine(),
  pace: (ms: number) => Promise<void> = instant,
): RaceAutopilot {
  return createRaceAutopilot({
    store,
    engine,
    player: 'white',
    stepMs: 0,
    pace,
  });
}

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

/** A store at white's pre-roll in a race (black just played out 6-3). */
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

/** A store at white's rolled turn in a race (dice already on the board). */
function whiteRaceTurn(roll: DiceRoll = [2, 1], dice: Die[] = []): PlayStore {
  return createPlayStore({
    match: createMatch({ length: 7, game: raceGame('white', roll) }),
    dice: scriptedDice(...dice),
  });
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
  return store;
}

/**
 * White's last checker on the 4 point, 14 off: any play of 5-2 bears it off
 * and ends the game. In a length-7 match the game ends (game-over); in a
 * length-1 match the same play decides the match (match-over).
 */
function whiteFinalBearOff(length: number): PlayStore {
  return createPlayStore({
    match: createMatch({
      length,
      game: createGame({
        board: createBoard({
          white: { points: { 4: 1 }, off: 14 },
          black: { points: { 19: 5, 20: 5, 21: 5 } },
        }),
        player: 'white',
        roll: [5, 2],
      }),
    }),
    dice: scriptedDice(),
  });
}

describe('activation', () => {
  it('does nothing until started', async () => {
    const store = whitePreRollRace();
    const autopilot = autopilotWith(store);

    await settle();
    expect(autopilot.getState().active).toBe(false);
    expect(store.getState().match?.phase).toBe('pre-roll');
    autopilot.dispose();
  });

  it("started at the user's race pre-roll, rolls and plays the turn at full strength", async () => {
    const store = whitePreRollRace([3, 1]);
    const engine = spyEngine();
    // Record every state the store passes through: movements must land as
    // visible steps before the commit, like the opponent's.
    const steps: Array<{ phase: string | undefined; movements: number }> = [];
    store.subscribe(() => {
      const match = store.getState().match;
      steps.push({
        phase: match?.phase,
        movements: match?.game.turn?.movements.length ?? 0,
      });
    });
    const autopilot = autopilotWith(store, engine);

    autopilot.start();
    expect(autopilot.getState().active).toBe(true);

    await vi.waitFor(() => {
      expect(store.getState().match?.game.record.plays).toHaveLength(2);
    });
    // The play is white's, and it went through a visible paced movement.
    expect(store.getState().match?.game.record.plays[1].player).toBe('white');
    expect(steps).toContainEqual({ phase: 'turn', movements: 1 });
    // Full strength: the engine was consulted and never given a difficulty.
    expect(engine.rankCalls.length).toBeGreaterThan(0);
    for (const options of engine.rankCalls) {
      expect(options?.difficulty).toBeUndefined();
    }
    autopilot.dispose();
  });

  it('refuses to start in a contact position', async () => {
    const store = whitePreRollContact();
    const autopilot = autopilotWith(store);

    autopilot.start();
    await settle();
    expect(autopilot.getState().active).toBe(false);
    expect(store.getState().match?.phase).toBe('pre-roll');
    autopilot.dispose();
  });

  it('refuses to start once the game is over', async () => {
    const store = whiteFinalBearOff(7);
    store.dispatch({ type: 'movement', from: 4, die: 2 });
    store.dispatch({ type: 'movement', from: 2, die: 5 });
    store.dispatch({ type: 'commit' });
    expect(store.getState().match?.phase).toBe('game-over');
    const autopilot = autopilotWith(store);

    autopilot.start();
    expect(autopilot.getState().active).toBe(false);
    autopilot.dispose();
  });
});

describe("the user's moments only", () => {
  it("never rolls or plays at the opponent's pre-roll", async () => {
    // Black's pre-roll in a race: white commits first.
    const store = whiteRaceTurn([2, 1], [6, 6]);
    store.dispatch({ type: 'movement', from: 6, die: 2 });
    store.dispatch({ type: 'movement', from: 6, die: 1 });
    store.dispatch({ type: 'commit' });
    expect(store.getState().match?.toRoll).toBe('black');
    const autopilot = autopilotWith(store);

    autopilot.start();
    expect(autopilot.getState().active).toBe(true);
    await settle();
    expect(store.getState().match?.phase).toBe('pre-roll');
    expect(store.getState().match?.toRoll).toBe('black');
    autopilot.dispose();
  });
});

describe('incoming cube decisions', () => {
  it('stands down while a double is offered and resumes after the take', async () => {
    // Autopilot plays white's rolled turn; black then doubles.
    const store = whiteRaceTurn([2, 1], [6, 3, 3, 1]);
    const engine = spyEngine();
    const autopilot = autopilotWith(store, engine);
    autopilot.start();
    await vi.waitFor(() => {
      expect(store.getState().match?.phase).toBe('pre-roll');
      expect(store.getState().match?.toRoll).toBe('black');
    });

    store.dispatch({ type: 'double' });
    expect(store.getState().match?.phase).toBe('cube-offered');

    // The dialog moment holds: autopilot answers nothing, but stays armed.
    await settle();
    expect(store.getState().match?.phase).toBe('cube-offered');
    expect(autopilot.getState().active).toBe(true);

    // The user takes; black plays its turn out; white's next pre-roll and
    // turn are autopilot's again.
    store.dispatch({ type: 'take' });
    store.dispatch({ type: 'roll' });
    store.dispatch({ type: 'movement', from: 19, die: 6 });
    store.dispatch({ type: 'movement', from: 21, die: 3 });
    store.dispatch({ type: 'commit' });
    await vi.waitFor(() => {
      expect(store.getState().match?.game.record.plays).toHaveLength(3);
    });
    expect(store.getState().match?.game.record.plays[2].player).toBe('white');
    autopilot.dispose();
  });
});

describe('the second press', () => {
  it('stops immediately, abandoning an in-flight paced turn', async () => {
    // Hold autopilot's pace open, press stop, then release: the stale play
    // must never land.
    let release: () => void = () => {};
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    const store = whiteRaceTurn([2, 1]);
    const autopilot = autopilotWith(store, spyEngine(), () => gate);

    autopilot.start();
    expect(autopilot.getState().active).toBe(true);
    autopilot.stop();
    expect(autopilot.getState().active).toBe(false);

    release();
    await settle();
    expect(store.getState().match?.game.turn?.movements).toHaveLength(0);
    expect(store.getState().match?.game.record.plays).toHaveLength(0);
    autopilot.dispose();
  });

  it('a restart picks the same turn back up', async () => {
    let released = false;
    let release: () => void = () => {};
    const gate = new Promise<void>((resolve) => {
      release = () => {
        released = true;
        resolve();
      };
    });
    const store = whiteRaceTurn([2, 1]);
    const autopilot = autopilotWith(store, spyEngine(), () =>
      released ? instant() : gate,
    );

    autopilot.start();
    autopilot.stop();
    release();
    await settle();
    expect(store.getState().match?.game.record.plays).toHaveLength(0);

    autopilot.start();
    await vi.waitFor(() => {
      expect(store.getState().match?.game.record.plays).toHaveLength(1);
    });
    autopilot.dispose();
  });
});

describe('deactivation', () => {
  it('switches off at game end and leaves the next game alone', async () => {
    const store = whiteFinalBearOff(7);
    const autopilot = autopilotWith(store);

    autopilot.start();
    await vi.waitFor(() => {
      expect(store.getState().match?.phase).toBe('game-over');
    });
    expect(autopilot.getState().active).toBe(false);

    store.dispatch({ type: 'next-game' });
    await settle();
    expect(autopilot.getState().active).toBe(false);
    autopilot.dispose();
  });

  it('switches off at match end', async () => {
    const store = whiteFinalBearOff(1);
    const autopilot = autopilotWith(store);

    autopilot.start();
    await vi.waitFor(() => {
      expect(store.getState().match?.phase).toBe('match-over');
    });
    expect(autopilot.getState().active).toBe(false);
    autopilot.dispose();
  });

  it('switches off on a takeback, leaving the restored turn unplayed', async () => {
    const store = whiteRaceTurn([2, 1]);
    const autopilot = autopilotWith(store);

    autopilot.start();
    await vi.waitFor(() => {
      expect(store.getState().match?.game.record.plays).toHaveLength(1);
    });

    store.dispatch({ type: 'takeback', player: 'white' });
    expect(store.getState().match?.phase).toBe('turn');
    await settle();
    expect(autopilot.getState().active).toBe(false);
    expect(store.getState().match?.game.turn?.movements).toHaveLength(0);
    expect(store.getState().match?.game.record.plays).toHaveLength(0);
    autopilot.dispose();
  });

  it('notifies subscribers when it deactivates itself', async () => {
    const store = whiteFinalBearOff(7);
    const autopilot = autopilotWith(store);
    const seen: boolean[] = [];
    autopilot.subscribe(() => {
      seen.push(autopilot.getState().active);
    });

    autopilot.start();
    await vi.waitFor(() => {
      expect(store.getState().match?.phase).toBe('game-over');
    });
    expect(seen[0]).toBe(true);
    expect(seen[seen.length - 1]).toBe(false);
    autopilot.dispose();
  });
});
