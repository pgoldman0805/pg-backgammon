/**
 * Issue 19: the Board style picker in the Play area — on the setup card, and
 * behind a "Board style" disclosure in the HUD's settings cluster mid-match.
 */

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createFakeEngine } from '../engine/fake';
import { DEFAULT_BOARD_STYLE, setBoardStyle } from '../play/boardStyles';
import { createPlayStore, type PlayStoreOptions } from '../play/store';
import { scriptedDice } from '../test/dice';
import { Play } from './Play';

beforeEach(() => {
  localStorage.clear();
  setBoardStyle(DEFAULT_BOARD_STYLE);
});

function renderPlay(options: PlayStoreOptions) {
  const store = createPlayStore(options);
  render(<Play store={store} engine={createFakeEngine()} opponentStepMs={0} />);
  return store;
}

it('offers the Board style picker on the setup card', () => {
  renderPlay({ dice: scriptedDice() });

  expect(
    screen.getByRole('group', { name: 'Board style' }),
  ).toBeInTheDocument();
  expect(screen.getByRole('radio', { name: 'Classic' })).toBeChecked();
});

it('applies a setup-card pick instantly', async () => {
  const user = userEvent.setup();
  renderPlay({ dice: scriptedDice() });

  await user.click(screen.getByRole('radio', { name: 'Reykjavík' }));

  expect(document.documentElement.getAttribute('data-board-style')).toBe(
    'reykjavik',
  );
});

it('tucks the picker behind a Board style disclosure during a match', async () => {
  const user = userEvent.setup();
  renderPlay({ dice: scriptedDice(3, 1, 5, 2) });
  await user.click(screen.getByRole('button', { name: 'Play as White' }));

  expect(screen.queryByRole('radio', { name: 'Aegean' })).toBeNull();

  const disclosure = screen.getByRole('button', { name: 'Board style' });
  expect(disclosure).toHaveAttribute('aria-expanded', 'false');
  await user.click(disclosure);

  expect(disclosure).toHaveAttribute('aria-expanded', 'true');
  await user.click(screen.getByRole('radio', { name: 'Aegean' }));
  expect(document.documentElement.getAttribute('data-board-style')).toBe(
    'aegean',
  );
});
