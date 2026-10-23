/**
 * The race autopilot button through the Play page (spec story 59): a
 * "Finish race" toggle in the turn controls, visible only while a
 * vs-computer Race (GLOSSARY) is live. Pressed, the user's turns play
 * themselves at full engine strength until the game ends; a second press
 * stops it immediately. Hot-seat matches never see it.
 */

import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { createFakeEngine } from '../engine/fake';
import { AUTO_FORCED_PLAYS_KEY, AUTO_ROLL_RACES_KEY } from '../play/settings';
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
  render(
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
  return store;
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

/** A 7-point match at white's rolled turn in a race. */
function whiteRaceTurnMatch(roll: DiceRoll = [2, 1]) {
  return createMatch({ length: 7, game: raceGame('white', roll) });
}

const finishRace = () => screen.queryByRole('button', { name: 'Finish race' });

describe('where the button appears', () => {
  it('is absent from a contact position', () => {
    renderPlay({ dice: scriptedDice(6, 3) });
    fireEvent.click(screen.getByRole('button', { name: 'Play as White' }));

    expect(finishRace()).not.toBeInTheDocument();
  });

  it('is absent from a hot-seat race', () => {
    renderPlay(
      { match: whiteRaceTurnMatch(), dice: scriptedDice() },
      { defaultSetup: { mode: 'hotseat', difficulty: 'casual', length: 7 } },
    );

    expect(finishRace()).not.toBeInTheDocument();
  });

  it('is present, unpressed, during a vs-computer race', () => {
    renderPlay({ match: whiteRaceTurnMatch(), dice: scriptedDice() });

    expect(finishRace()).toHaveAttribute('aria-pressed', 'false');
  });
});

describe('the autopilot lifecycle', () => {
  it("pressed at the user's turn, plays it at full strength", async () => {
    const store = renderPlay({
      match: whiteRaceTurnMatch(),
      dice: scriptedDice(6, 3),
    });

    const button = finishRace();
    expect(button).not.toBeNull();
    if (!button) {
      return;
    }
    fireEvent.click(button);
    expect(button).toHaveAttribute('aria-pressed', 'true');

    await waitFor(() => {
      expect(
        store.getState().match?.game.record.plays.length,
      ).toBeGreaterThanOrEqual(1);
    });
    expect(store.getState().match?.game.record.plays[0].player).toBe('white');
  });

  it('pressed at a stopped race pre-roll, rolls and plays', async () => {
    // Auto-roll off in Settings: the pre-roll stop is showing; the button
    // must take it from there (the race auto-roll path, press-powered).
    localStorage.setItem(AUTO_ROLL_RACES_KEY, 'off');
    const store = createPlayStore({
      match: createMatch({ length: 7, game: raceGame('black', [6, 3]) }),
      dice: scriptedDice(3, 1),
    });
    store.dispatch({ type: 'movement', from: 19, die: 6 });
    store.dispatch({ type: 'movement', from: 21, die: 3 });
    store.dispatch({ type: 'commit' });
    render(
      <MemoryRouter>
        <Play
          store={store}
          engine={createFakeEngine()}
          opponentStepMs={0}
          storage={createMemoryStorage()}
        />
      </MemoryRouter>,
    );
    expect(screen.getByRole('button', { name: 'Roll' })).toBeInTheDocument();

    const button = finishRace();
    expect(button).not.toBeNull();
    if (!button) {
      return;
    }
    fireEvent.click(button);

    await waitFor(() => {
      expect(store.getState().match?.game.record.plays).toHaveLength(2);
    });
    expect(store.getState().match?.game.record.plays[1].player).toBe('white');
  });

  it('a second press stops it before the paced turn lands', async () => {
    const store = renderPlay(
      { match: whiteRaceTurnMatch(), dice: scriptedDice() },
      // A long pace holds the turn in flight while the test presses twice.
      { opponentStepMs: 10_000 },
    );

    const button = finishRace();
    expect(button).not.toBeNull();
    if (!button) {
      return;
    }
    fireEvent.click(button);
    expect(button).toHaveAttribute('aria-pressed', 'true');
    fireEvent.click(button);
    expect(button).toHaveAttribute('aria-pressed', 'false');

    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(store.getState().match?.game.turn?.movements).toHaveLength(0);
    expect(store.getState().match?.game.record.plays).toHaveLength(0);
  });

  it('retires at game end: the game plays out and the button leaves', async () => {
    // The forced bear-off path is autopilot's too; keep the autoplay setting
    // out of it so the button is what finishes the game.
    localStorage.setItem(AUTO_FORCED_PLAYS_KEY, 'off');
    const store = renderPlay({
      match: createMatch({
        length: 7,
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

    const button = finishRace();
    expect(button).not.toBeNull();
    if (!button) {
      return;
    }
    fireEvent.click(button);

    await waitFor(() => {
      expect(store.getState().match?.phase).toBe('game-over');
    });
    expect(finishRace()).not.toBeInTheDocument();
  });
});
