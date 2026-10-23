/**
 * Ticket 25 (spec story 58): the Play view keeps only gameplay affordances.
 * The Board style picker and the two autoplay switches live in Settings
 * alone — gone from both the setup card and the in-game HUD — while the
 * Tutor mode toggle stays (a gameplay mode, switchable mid-match). The setup
 * card points at Settings with one quiet link.
 */

import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { createFakeEngine } from '../engine/fake';
import { createPlayStore, type PlayStoreOptions } from '../play/store';
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

describe('the setup card', () => {
  it('offers no preference controls, only the Tutor toggle', () => {
    renderPlay({ dice: scriptedDice() });

    expect(
      screen.getByRole('switch', { name: 'Tutor mode' }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('switch', { name: 'Auto-roll in races' }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('switch', { name: 'Auto-play forced plays' }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('group', { name: 'Board style' }),
    ).not.toBeInTheDocument();
  });

  it('points at Settings with one quiet link', () => {
    renderPlay({ dice: scriptedDice() });

    const link = screen.getByRole('link', { name: /Settings/ });
    expect(link).toHaveAttribute('href', '/settings');
  });
});

describe('the in-game HUD', () => {
  it('keeps the Tutor toggle and nothing else vs the computer', () => {
    renderPlay({ dice: scriptedDice(6, 3) });
    fireEvent.click(screen.getByRole('button', { name: 'Play as White' }));

    expect(
      screen.getByRole('switch', { name: 'Tutor mode' }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('switch', { name: 'Auto-roll in races' }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('switch', { name: 'Auto-play forced plays' }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Board style' }),
    ).not.toBeInTheDocument();
  });

  it('shows no settings cluster at all in a hot-seat match', () => {
    renderPlay(
      { dice: scriptedDice(6, 3) },
      { defaultSetup: { mode: 'hotseat', difficulty: 'casual', length: 7 } },
    );
    fireEvent.click(screen.getByRole('button', { name: 'Hot-seat match' }));

    expect(
      screen.queryByRole('switch', { name: 'Tutor mode' }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('switch', { name: 'Auto-roll in races' }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Board style' }),
    ).not.toBeInTheDocument();
  });
});
