/**
 * The Settings area (ticket 20): every controllable preference in one place,
 * persisted through the same stores the in-context controls use, so the two
 * stay in sync in both directions.
 */

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from '../App';
import {
  ANIMATION_SPEED_KEY,
  readStoredAnimationSpeed,
  setAnimationSpeed,
} from '../play/animation';
import { setBoardStyle } from '../play/boardStyles';
import {
  AUTO_FORCED_PLAYS_KEY,
  AUTO_ROLL_KEY,
  AUTO_ROLL_RACES_KEY,
  AUTO_SKIP_DANCES_KEY,
  TUTOR_DEFAULT_KEY,
} from '../play/settings';
import { acceptResignation, offerResignation, startMatch } from '../rules';
import {
  createMemoryStorage,
  exportBackup,
  serializeBackup,
  snapshotMatch,
} from '../storage';
import { scriptedDice } from '../test/dice';
import { Settings } from './Settings';

function renderSettings(storage = createMemoryStorage()) {
  render(<Settings storage={storage} />);
  return storage;
}

afterEach(() => {
  localStorage.clear();
  setAnimationSpeed(readStoredAnimationSpeed());
  setBoardStyle('classic');
  document.documentElement.removeAttribute('data-theme');
  document.documentElement.removeAttribute('data-board-style');
});

describe('the Settings room', () => {
  it('shows the three sections with every listed setting', () => {
    renderSettings();

    for (const name of ['Appearance', 'Play', 'Data']) {
      expect(
        screen.getByRole('heading', { level: 2, name }),
      ).toBeInTheDocument();
    }
    expect(screen.getByRole('radio', { name: 'Light' })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: 'Classic' })).toBeInTheDocument();
    expect(
      screen.getByRole('radiogroup', { name: 'Auto-roll' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: 'Always' })).toBeInTheDocument();
    expect(
      screen.getByRole('switch', { name: 'Auto-play forced plays' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('switch', { name: 'Auto-skip blocked turns' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('switch', { name: 'Tutor mode for new matches' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: 'Normal' })).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Export history' }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText(/import backup/i)).toBeInTheDocument();
  });

  it('shows the durable-storage row in the Data section', async () => {
    renderSettings();

    // jsdom has no StorageManager, so the row degrades to "Unavailable" —
    // it still appears, rather than silently reassuring the player.
    expect(await screen.findByText('Durable storage')).toBeInTheDocument();
    expect(screen.getByText('Unavailable')).toBeInTheDocument();
  });

  it('persists the Play switches under the keys Play reads', async () => {
    const user = userEvent.setup();
    renderSettings();

    await user.click(screen.getByRole('radio', { name: 'Always' }));
    await user.click(
      screen.getByRole('switch', { name: 'Auto-skip blocked turns' }),
    );
    await user.click(
      screen.getByRole('switch', { name: 'Tutor mode for new matches' }),
    );

    expect(localStorage.getItem(AUTO_ROLL_KEY)).toBe('always');
    expect(localStorage.getItem(AUTO_SKIP_DANCES_KEY)).toBe('off');
    expect(localStorage.getItem(TUTOR_DEFAULT_KEY)).toBe('on');
    expect(localStorage.getItem(AUTO_FORCED_PLAYS_KEY)).toBeNull();
  });

  it('starts the auto-roll control at the mode Play reads', () => {
    localStorage.setItem(AUTO_ROLL_KEY, 'always');
    renderSettings();

    expect(screen.getByRole('radio', { name: 'Always' })).toBeChecked();
    expect(screen.getByRole('radio', { name: 'In races' })).not.toBeChecked();
  });

  it('migrates the legacy auto-roll-in-races preference (on → in races)', () => {
    localStorage.setItem(AUTO_ROLL_RACES_KEY, 'on');
    renderSettings();

    expect(screen.getByRole('radio', { name: 'In races' })).toBeChecked();
  });

  it('reads the stored switch state back on arrival', () => {
    localStorage.setItem(AUTO_FORCED_PLAYS_KEY, 'off');
    renderSettings();

    expect(
      screen.getByRole('switch', { name: 'Auto-play forced plays' }),
    ).toHaveAttribute('aria-checked', 'false');
    // Auto-roll, unset, defaults to "in races".
    expect(screen.getByRole('radio', { name: 'In races' })).toBeChecked();
  });

  it('selects and persists the checker animation speed', async () => {
    const user = userEvent.setup();
    renderSettings();

    // The jsdom environment prefers reduced motion, so Off starts selected.
    expect(screen.getByRole('radio', { name: 'Off' })).toBeChecked();

    await user.click(screen.getByRole('radio', { name: 'Fast' }));

    expect(screen.getByRole('radio', { name: 'Fast' })).toBeChecked();
    expect(localStorage.getItem(ANIMATION_SPEED_KEY)).toBe('fast');
  });

  it('changes the Board style through the reused picker', async () => {
    const user = userEvent.setup();
    renderSettings();

    await user.click(screen.getByRole('radio', { name: 'Kyoto' }));

    expect(document.documentElement).toHaveAttribute(
      'data-board-style',
      'kyoto',
    );
  });

  it('exports the history through the shared backup controls', async () => {
    const user = userEvent.setup();
    const createObjectURL = vi.fn((_blob: Blob) => 'blob:history');
    const revokeObjectURL = vi.fn();
    Object.assign(URL, { createObjectURL, revokeObjectURL });
    const click = vi
      .spyOn(HTMLAnchorElement.prototype, 'click')
      .mockImplementation(() => {});
    renderSettings(createMemoryStorage([storedMatch()]));

    await user.click(screen.getByRole('button', { name: 'Export history' }));

    expect(click).toHaveBeenCalledTimes(1);
    expect(createObjectURL).toHaveBeenCalledTimes(1);
    click.mockRestore();
  });

  it('imports a backup through the shared controls', async () => {
    const user = userEvent.setup();
    const json = serializeBackup(
      await exportBackup(createMemoryStorage([storedMatch()])),
    );
    const storage = renderSettings();

    const file = new File([json], 'backup.json', { type: 'application/json' });
    await user.upload(screen.getByLabelText(/import backup/i), file);

    // Ticket 27: picking a file confirms before replacing anything.
    await user.click(
      await screen.findByRole('button', { name: /replace history/i }),
    );

    expect(await screen.findByText(/backup imported/i)).toBeInTheDocument();
    expect((await storage.list()).map((row) => row.id)).toEqual([
      'settings-test-match',
    ]);
  });
});

describe('theme, shared with the header toggle', () => {
  beforeEach(() => {
    window.history.replaceState(null, '', '/');
  });

  it('changing it in Settings relabels the header toggle too', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole('link', { name: 'Settings' }));
    expect(
      screen.getByRole('button', { name: 'Switch to dark theme' }),
    ).toBeInTheDocument();

    // Settings is a lazily-loaded chunk (ticket 43): await its content.
    await user.click(await screen.findByRole('radio', { name: 'Dark' }));

    expect(document.documentElement).toHaveAttribute('data-theme', 'dark');
    expect(
      screen.getByRole('button', { name: 'Switch to light theme' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: 'Dark' })).toBeChecked();
  });

  it('follows the header toggle while Settings is open', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole('link', { name: 'Settings' }));

    await user.click(
      screen.getByRole('button', { name: 'Switch to dark theme' }),
    );

    // Settings is a lazily-loaded chunk (ticket 43): await its content.
    expect(await screen.findByRole('radio', { name: 'Dark' })).toBeChecked();
  });
});

/** A small finished match for the backup round-trips. */
function storedMatch() {
  const match = acceptResignation(
    offerResignation(startMatch(1, scriptedDice(6, 3)), 'black', 'single'),
  );
  return snapshotMatch({
    id: 'settings-test-match',
    config: { length: 1, mode: 'computer', difficulty: 'casual' },
    match,
    createdAt: 1,
    updatedAt: 2,
  });
}
