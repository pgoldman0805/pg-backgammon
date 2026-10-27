/**
 * The two autoplay behaviors through the Play page (spec stories 43-44):
 * auto-roll at the user's race pre-rolls and auto-play of forced turns, with
 * contact positions, dances and the opponent's flow untouched. Since ticket
 * 25 their switches live in Settings alone; the Play page reads the stored
 * values at each decision moment, so this file drives them through
 * localStorage exactly as Settings writes them.
 */

import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { createFakeEngine } from '../engine/fake';
import {
  AUTO_FORCED_PLAYS_KEY,
  AUTO_ROLL_RACES_KEY,
  AUTO_SKIP_DANCES_KEY,
} from '../play/settings';
import { createPlayStore, type PlayStoreOptions } from '../play/store';
import {
  createBoard,
  createGame,
  createMatch,
  type DiceRoll,
  type GameState,
  type Player,
} from '../rules';
import { createMemoryStorage } from '../storage';
import { scriptedDice } from '../test/dice';
import { Play, type PlayProps } from './Play';

beforeEach(() => {
  localStorage.clear();
});

function renderPlay(options: PlayStoreOptions, props?: Partial<PlayProps>) {
  const store = createPlayStore(options);
  const view = render(
    <MemoryRouter>
      <Play
        store={store}
        engine={createFakeEngine()}
        opponentStepMs={0}
        storage={createMemoryStorage()}
        {...props}
      />
    </MemoryRouter>,
  );
  return { store, view };
}

const hotseat = {
  defaultSetup: { mode: 'hotseat', difficulty: 'casual', length: 7 },
} as const;

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

/** A match paused at white's pre-roll in a race (black commits first). */
function whitePreRollRaceMatch() {
  const store = createPlayStore({
    match: createMatch({ length: 7, game: raceGame('black', [6, 3]) }),
    dice: scriptedDice(),
  });
  store.dispatch({ type: 'movement', from: 19, die: 6 });
  store.dispatch({ type: 'movement', from: 21, die: 3 });
  store.dispatch({ type: 'commit' });
  const match = store.getState().match;
  expect(match?.phase).toBe('pre-roll');
  return match ?? undefined;
}

describe('auto-roll in races', () => {
  it("rolls the user's race pre-roll without showing the Double/Roll stop", () => {
    renderPlay(
      { match: whitePreRollRaceMatch(), dice: scriptedDice(3, 1) },
      hotseat,
    );

    expect(screen.getByRole('status')).toHaveTextContent(
      'White to play 3 and 1.',
    );
    expect(
      screen.queryByRole('button', { name: 'Roll' }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Double to 2' }),
    ).not.toBeInTheDocument();
  });

  it('keeps the Double/Roll stop in contact positions', () => {
    // The standard opening reply: black commits 3-1, white is to roll.
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
    render(
      <MemoryRouter>
        <Play
          store={store}
          engine={createFakeEngine()}
          opponentStepMs={0}
          storage={createMemoryStorage()}
          {...hotseat}
        />
      </MemoryRouter>,
    );

    expect(screen.getByRole('button', { name: 'Roll' })).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Double to 2' }),
    ).toBeInTheDocument();
  });

  it('stored off in Settings, stops at the race pre-roll', async () => {
    localStorage.setItem(AUTO_ROLL_RACES_KEY, 'off');
    renderPlay(
      { match: whitePreRollRaceMatch(), dice: scriptedDice(3, 1) },
      hotseat,
    );

    expect(screen.getByRole('button', { name: 'Roll' })).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('White to roll.');
  });

  it('a Settings flip mid-match applies from the next decision moment', () => {
    localStorage.setItem(AUTO_ROLL_RACES_KEY, 'off');
    const { store } = renderPlay(
      { match: whitePreRollRaceMatch(), dice: scriptedDice(3, 1, 6, 3) },
      hotseat,
    );
    expect(screen.getByRole('status')).toHaveTextContent('White to roll.');

    // Flipped on in Settings (same localStorage the switch writes): the stop
    // at hand stays — the user already has it — but once white's turn is
    // played out, black's race pre-roll rolls itself.
    localStorage.setItem(AUTO_ROLL_RACES_KEY, 'on');
    fireEvent.click(screen.getByRole('button', { name: 'Roll' }));
    act(() => {
      store.dispatch({ type: 'movement', from: 6, die: 3 });
      store.dispatch({ type: 'movement', from: 5, die: 1 });
      store.dispatch({ type: 'commit' });
    });

    expect(screen.getByRole('status')).toHaveTextContent('Black to play');
  });

  it('offers an in-HUD auto-roll toggle vs the computer that applies at once', () => {
    localStorage.setItem(AUTO_ROLL_RACES_KEY, 'off');
    // Default setup (no hotseat) is vs the computer, where the HUD carries the
    // toggle. White sits at a race pre-roll with auto-roll off: the stop shows.
    renderPlay({ match: whitePreRollRaceMatch(), dice: scriptedDice(3, 1) });

    expect(screen.getByRole('button', { name: 'Roll' })).toBeInTheDocument();
    const toggle = screen.getByRole('switch', { name: 'Auto-roll in races' });
    expect(toggle).toHaveAttribute('aria-checked', 'false');

    // Flip it on from the HUD: the pre-roll at hand rolls itself right away
    // (recheck), and the choice persists under the key Settings shares.
    fireEvent.click(toggle);
    expect(localStorage.getItem(AUTO_ROLL_RACES_KEY)).toBe('on');
    expect(
      screen.queryByRole('button', { name: 'Roll' }),
    ).not.toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent(
      'White to play 3 and 1.',
    );
  });

  it('flipped off mid-match, the next race pre-roll stops again', () => {
    const { store } = renderPlay(
      { match: whitePreRollRaceMatch(), dice: scriptedDice(3, 1) },
      hotseat,
    );
    // The race pre-roll auto-rolled on arrival (the stored default is on).
    expect(screen.getByRole('status')).toHaveTextContent(
      'White to play 3 and 1.',
    );

    localStorage.setItem(AUTO_ROLL_RACES_KEY, 'off');
    // White plays the turn out; black's pre-roll now stops as usual.
    act(() => {
      store.dispatch({ type: 'movement', from: 6, die: 3 });
      store.dispatch({ type: 'movement', from: 5, die: 1 });
      store.dispatch({ type: 'commit' });
    });

    expect(screen.getByRole('status')).toHaveTextContent('Black to roll.');
    expect(screen.getByRole('button', { name: 'Roll' })).toBeInTheDocument();
  });
});

describe('auto-play of forced plays', () => {
  /** White on 24 with 14 off, black holding 15: 6-3 forces 24/18 alone. */
  function whiteForcedMatch() {
    return createMatch({
      length: 7,
      game: createGame({
        board: createBoard({
          white: { points: { 24: 1 }, off: 14 },
          black: { points: { 15: 2, 1: 13 } },
        }),
        player: 'white',
        roll: [6, 3],
      }),
    });
  }

  it('plays and commits the forced turn with no clicks', async () => {
    const { store } = renderPlay(
      { match: whiteForcedMatch(), dice: scriptedDice(5, 2) },
      hotseat,
    );

    await waitFor(() => {
      expect(screen.getByRole('status')).toHaveTextContent('Black to roll.');
    });
    expect(store.getState().match?.game.record.plays).toHaveLength(1);
  });

  it('stored off in Settings, the forced turn waits for the manual button', async () => {
    localStorage.setItem(AUTO_FORCED_PLAYS_KEY, 'off');
    renderPlay(
      { match: whiteForcedMatch(), dice: scriptedDice(5, 2) },
      hotseat,
    );

    expect(screen.getByRole('status')).toHaveTextContent('only one legal play');
    // Nothing happens on its own; the manual control is still there.
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 20));
    });
    expect(screen.getByRole('status')).toHaveTextContent('only one legal play');
    fireEvent.click(screen.getByRole('button', { name: 'Play forced play' }));
    expect(screen.getByRole('status')).toHaveTextContent('Black to roll.');
  });

  /** White stuck on the bar against a full home board: 6-3 cannot enter. */
  function danceMatch() {
    return createMatch({
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
    });
  }

  it('leaves the dance to the manual Continue while auto-skip is off', async () => {
    localStorage.setItem(AUTO_SKIP_DANCES_KEY, 'off');
    renderPlay({ match: danceMatch(), dice: scriptedDice(5, 2) }, hotseat);

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 20));
    });
    expect(screen.getByRole('status')).toHaveTextContent('no legal plays');

    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
    expect(screen.getByRole('status')).toHaveTextContent('Black to roll.');
  });

  it('auto-skips the dance when the setting is on (the default)', async () => {
    renderPlay({ match: danceMatch(), dice: scriptedDice(5, 2) }, hotseat);

    // No click: the dance passes itself after its beat.
    await waitFor(() => {
      expect(screen.getByRole('status')).toHaveTextContent('Black to roll.');
    });
    expect(
      screen.queryByRole('button', { name: 'Continue' }),
    ).not.toBeInTheDocument();
  });
});
