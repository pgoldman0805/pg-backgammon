/**
 * Accessible modal dialogs through the Play page (ticket 44): the cube
 * take/pass, resign accept/decline, game-over and match-over banners are
 * proper modals. Each exposes a dialog role with an accessible name, moves
 * focus in and traps it while open, restores focus on close, and — where a
 * non-destructive dismiss exists — closes on Escape. The required cube
 * decision has no Escape; declining a resignation (play on) is the resign
 * dialog's Escape path.
 */

import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import type { Engine } from '../engine';
import { createFakeEngine } from '../engine/fake';
import { createPlayStore, type PlayStoreOptions } from '../play/store';
import {
  type CreateMatchOptions,
  createBoard,
  createGame,
  createMatch,
  type GameState,
} from '../rules';
import { createMemoryStorage } from '../storage';
import { scriptedDice } from '../test/dice';
import { scriptedCubeEngine } from '../test/engine';
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

function renderHotSeat(options: PlayStoreOptions) {
  return renderPlay(options, {
    defaultSetup: { mode: 'hotseat', difficulty: 'casual', length: 7 },
  });
}

function matchWith(game: GameState, options?: Partial<CreateMatchOptions>) {
  return createMatch({ length: 7, game, ...options });
}

/** White commits the opening; the computer faces its pre-roll cube decision. */
function reachEnginePreRoll(
  engine: Engine,
  ...laterRolls: Parameters<typeof scriptedDice>
) {
  const store = renderPlay(
    { dice: scriptedDice(6, 3, ...laterRolls) },
    {
      engine,
      defaultSetup: { mode: 'computer', difficulty: 'casual', length: 7 },
    },
  );
  fireEvent.click(screen.getByRole('button', { name: 'Play as White' }));
  fireEvent.click(screen.getByRole('button', { name: 'Move from point 24' }));
  fireEvent.click(screen.getByRole('button', { name: 'Move to point 18' }));
  fireEvent.click(screen.getByRole('button', { name: 'Move from point 13' }));
  fireEvent.click(screen.getByRole('button', { name: 'Move to point 10' }));
  fireEvent.click(screen.getByRole('button', { name: 'Commit play' }));
  return store;
}

/** White plays the opening 6-3; black reaches the pre-roll decision (hot-seat). */
function reachBlackPreRoll(...laterRolls: Parameters<typeof scriptedDice>) {
  const store = renderHotSeat({ dice: scriptedDice(6, 3, ...laterRolls) });
  fireEvent.click(screen.getByRole('button', { name: 'Hot-seat match' }));
  fireEvent.click(screen.getByRole('button', { name: 'Move from point 24' }));
  fireEvent.click(screen.getByRole('button', { name: 'Move to point 18' }));
  fireEvent.click(screen.getByRole('button', { name: 'Move from point 13' }));
  fireEvent.click(screen.getByRole('button', { name: 'Move to point 10' }));
  fireEvent.click(screen.getByRole('button', { name: 'Commit play' }));
  return store;
}

/** A 7-point hot-seat match where White bears off the last checker to win. */
function winWhiteGame(options?: Partial<CreateMatchOptions>) {
  const board = createBoard({
    white: { points: { 1: 1 }, off: 14 },
    black: { points: { 24: 1 }, off: 14 },
  });
  const store = renderHotSeat({
    match: matchWith(
      createGame({ board, player: 'white', roll: [6, 5] }),
      options,
    ),
    dice: scriptedDice(4, 2, 3, 1),
  });
  fireEvent.click(screen.getByRole('button', { name: 'Move from point 1' }));
  fireEvent.click(screen.getByRole('button', { name: 'Bear off' }));
  fireEvent.click(screen.getByRole('button', { name: 'Commit play' }));
  return store;
}

describe('the cube take/pass dialog', () => {
  it('is a modal dialog named for the double, with focus moved in', async () => {
    reachEnginePreRoll(scriptedCubeEngine('Double, take'), 5, 2);

    const dialog = await screen.findByRole('dialog');
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(dialog).toHaveAccessibleName('Black doubles to 2');
    // The decision is announced through the dialog's description.
    expect(dialog).toHaveAccessibleDescription(
      /Take to play on for 2 points, or pass to concede 1 point\./,
    );
    expect(dialog).toHaveFocus();
  });

  it('refuses Escape — a required decision has no non-destructive dismiss', async () => {
    reachEnginePreRoll(scriptedCubeEngine('Double, take'), 5, 2);

    const dialog = await screen.findByRole('dialog');
    fireEvent.keyDown(dialog, { key: 'Escape' });

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Take' })).toBeInTheDocument();
  });

  it('traps Tab inside the dialog, wrapping at both ends', async () => {
    reachEnginePreRoll(scriptedCubeEngine('Double, take'), 5, 2);

    const dialog = await screen.findByRole('dialog');
    const take = screen.getByRole('button', { name: 'Take' });
    const pass = screen.getByRole('button', { name: 'Pass' });

    // From the end control, Tab wraps back to the first.
    pass.focus();
    fireEvent.keyDown(dialog, { key: 'Tab' });
    expect(take).toHaveFocus();

    // From the first control, Shift+Tab wraps to the end.
    take.focus();
    fireEvent.keyDown(dialog, { key: 'Tab', shiftKey: true });
    expect(pass).toHaveFocus();
  });

  it('a keyboard-only user can take the double from the dialog', async () => {
    const store = reachEnginePreRoll(scriptedCubeEngine('Double, take'), 5, 2);

    const dialog = await screen.findByRole('dialog');
    // Tab from the container reaches the first control; Enter resolves it.
    fireEvent.keyDown(dialog, { key: 'Tab' });
    const take = screen.getByRole('button', { name: 'Take' });
    expect(take).toHaveFocus();
    fireEvent.click(take);

    expect(store.getState().match?.cube).toEqual({ value: 2, owner: 'white' });
  });

  it('restores focus to the element that opened it when it closes', async () => {
    reachBlackPreRoll(5, 2);

    // Focus a control that outlives the dialog (the HUD Copy XGID chip), then
    // fire the double without moving focus, so the opener is a live element.
    const copy = screen.getByRole('button', { name: 'Copy XGID' });
    copy.focus();
    fireEvent.click(screen.getByRole('button', { name: 'Double to 2' }));

    const dialog = await screen.findByRole('dialog');
    expect(dialog).toHaveFocus();

    fireEvent.click(screen.getByRole('button', { name: 'Take' }));

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(copy).toHaveFocus();
  });
});

describe('the resign accept/decline dialog', () => {
  it('is a modal dialog named for the offer, with focus moved in', () => {
    renderHotSeat({ dice: scriptedDice(6, 3) });
    fireEvent.click(screen.getByRole('button', { name: 'Hot-seat match' }));
    fireEvent.click(screen.getByRole('button', { name: 'Resign…' }));
    fireEvent.click(screen.getByRole('button', { name: 'Gammon — 2 points' }));

    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(dialog).toHaveAccessibleName('White offers to resign a gammon');
    expect(dialog).toHaveFocus();
  });

  it('Escape declines the offer (play on) — a non-destructive dismiss', () => {
    const store = renderHotSeat({ dice: scriptedDice(6, 3) });
    fireEvent.click(screen.getByRole('button', { name: 'Hot-seat match' }));
    fireEvent.click(screen.getByRole('button', { name: 'Resign…' }));
    fireEvent.click(screen.getByRole('button', { name: 'Gammon — 2 points' }));

    const dialog = screen.getByRole('dialog');
    fireEvent.keyDown(dialog, { key: 'Escape' });

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(store.getState().match?.phase).toBe('turn');
    expect(screen.getByRole('status')).toHaveTextContent(
      'White to play 6 and 3.',
    );
  });
});

describe('the game-over and match-over dialogs', () => {
  it('shows the game result as a modal dialog with focus moved in', () => {
    winWhiteGame();

    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(dialog).toHaveAccessibleName('White wins a single game — 1 point.');
    expect(dialog).toHaveFocus();
  });

  it('leaves the game-over dialog open on Escape (advancing is deliberate)', () => {
    winWhiteGame();

    const dialog = screen.getByRole('dialog');
    fireEvent.keyDown(dialog, { key: 'Escape' });

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Next game' }),
    ).toBeInTheDocument();
  });

  it('shows the match result as a modal dialog with focus moved in', () => {
    winWhiteGame({ score: { white: 6, black: 3 }, crawford: true });

    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(dialog).toHaveAccessibleName('White wins the match 7–3');
    expect(dialog).toHaveFocus();
  });
});
