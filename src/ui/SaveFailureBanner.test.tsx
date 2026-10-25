/**
 * The save-failure banner (ticket 26, review finding #3): a non-blocking
 * warning that appears the moment the app can't save the player's progress,
 * offering an immediate backup export, and clearing once saving recovers.
 */

import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { acceptResignation, offerResignation, startMatch } from '../rules';
import {
  createMemoryStorage,
  createSaveHealthMonitor,
  snapshotMatch,
} from '../storage';
import { scriptedDice } from '../test/dice';
import { SaveFailureBanner } from './SaveFailureBanner';

/** A small finished match so the export has something to write. */
function storedMatch() {
  const match = acceptResignation(
    offerResignation(startMatch(1, scriptedDice(6, 3)), 'black', 'single'),
  );
  return snapshotMatch({
    id: 'banner-test-match',
    config: { length: 1, mode: 'computer', difficulty: 'casual' },
    match,
    createdAt: 1,
    updatedAt: 2,
  });
}

describe('the save-failure banner', () => {
  it('stays hidden while storage is healthy', () => {
    const monitor = createSaveHealthMonitor();
    render(
      <SaveFailureBanner monitor={monitor} storage={createMemoryStorage()} />,
    );

    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('warns when saving fails and clears when it recovers', () => {
    const monitor = createSaveHealthMonitor();
    render(
      <SaveFailureBanner monitor={monitor} storage={createMemoryStorage()} />,
    );

    act(() => {
      monitor.reportFailure();
    });
    expect(screen.getByRole('alert')).toHaveTextContent(/isn't being saved/i);

    act(() => {
      monitor.reportSuccess();
    });
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('exports a backup through the shared export when asked', async () => {
    const user = userEvent.setup();
    const monitor = createSaveHealthMonitor();
    monitor.reportFailure();
    const createObjectURL = vi.fn((_blob: Blob) => 'blob:banner');
    const revokeObjectURL = vi.fn();
    Object.assign(URL, { createObjectURL, revokeObjectURL });
    const click = vi
      .spyOn(HTMLAnchorElement.prototype, 'click')
      .mockImplementation(() => {});
    render(
      <SaveFailureBanner
        monitor={monitor}
        storage={createMemoryStorage([storedMatch()])}
      />,
    );

    await user.click(screen.getByRole('button', { name: /export/i }));

    expect(click).toHaveBeenCalledTimes(1);
    expect(createObjectURL).toHaveBeenCalledTimes(1);
    expect(await screen.findByText(/backup downloaded/i)).toBeInTheDocument();
    click.mockRestore();
  });
});
