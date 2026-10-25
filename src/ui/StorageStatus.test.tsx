/**
 * The Settings storage row (ticket 26): whether the browser is keeping the
 * app's data durable and how much space it is using, degrading quietly where
 * the StorageManager API can't tell us.
 */

import { render, screen } from '@testing-library/react';
import { StorageStatus } from './StorageStatus';

describe('the storage status row', () => {
  it('reports durable storage on and the space in use', async () => {
    render(
      <StorageStatus
        readPersistence={() => Promise.resolve('persisted')}
        readUsage={() =>
          Promise.resolve({ usage: 1_572_864, quota: 536_870_912 })
        }
      />,
    );

    expect(await screen.findByText('On')).toBeInTheDocument();
    expect(screen.getByText(/1\.5 MB of 512\.0 MB/)).toBeInTheDocument();
    expect(screen.getByRole('meter')).toHaveAttribute('aria-valuenow');
  });

  it('warns and points to a backup when storage is not durable', async () => {
    render(
      <StorageStatus
        readPersistence={() => Promise.resolve('not-persisted')}
        readUsage={() => Promise.resolve(null)}
      />,
    );

    expect(await screen.findByText('Off')).toBeInTheDocument();
    expect(screen.getByText(/export a backup/i)).toBeInTheDocument();
  });

  it('degrades to unavailable with no space figure where the API is absent', async () => {
    render(
      <StorageStatus
        readPersistence={() => Promise.resolve('unsupported')}
        readUsage={() => Promise.resolve(null)}
      />,
    );

    expect(await screen.findByText('Unavailable')).toBeInTheDocument();
    expect(screen.queryByText(/Space used/i)).not.toBeInTheDocument();
    expect(screen.queryByRole('meter')).not.toBeInTheDocument();
  });
});
