/**
 * The backup controls (ticket 27): picking a backup never silently rewrites
 * the history. Choosing a file opens a confirmation that names what the file
 * holds and what each choice does; cancelling changes nothing; replace and
 * merge are distinct, explicit choices.
 */

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  createMemoryStorage,
  exportBackup,
  type MatchStorage,
  serializeBackup,
} from '../storage';
import { storedMatchFixture } from '../storage/storageContract';
import { BackupControls } from './BackupControls';

async function backupFile(
  matches: Parameters<typeof createMemoryStorage>[0],
): Promise<File> {
  const json = serializeBackup(
    await exportBackup(createMemoryStorage(matches)),
  );
  return new File([json], 'backup.json', { type: 'application/json' });
}

async function pickBackup(
  user: ReturnType<typeof userEvent.setup>,
  file: File,
) {
  await user.upload(screen.getByLabelText(/import backup/i), file);
}

function renderControls(storage: MatchStorage) {
  render(<BackupControls storage={storage} />);
  return storage;
}

describe('the backup restore confirmation', () => {
  it('names the file contents and changes nothing until confirmed', async () => {
    const user = userEvent.setup();
    const storage = renderControls(
      createMemoryStorage([storedMatchFixture({ id: 'existing' })]),
    );

    await pickBackup(
      user,
      await backupFile([
        storedMatchFixture({ id: 'a' }),
        storedMatchFixture({ id: 'b' }),
      ]),
    );

    expect(await screen.findByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText(/2 matches/i)).toBeInTheDocument();
    // Nothing has been written yet.
    expect((await storage.list()).map((m) => m.id)).toEqual(['existing']);
    expect(screen.queryByText(/imported/i)).not.toBeInTheDocument();
  });

  it('leaves the history untouched when the confirmation is cancelled', async () => {
    const user = userEvent.setup();
    const storage = renderControls(
      createMemoryStorage([storedMatchFixture({ id: 'existing' })]),
    );

    await pickBackup(user, await backupFile([storedMatchFixture({ id: 'a' })]));
    await user.click(await screen.findByRole('button', { name: /cancel/i }));

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect((await storage.list()).map((m) => m.id)).toEqual(['existing']);
  });

  it('replaces the history for the file when replace is chosen', async () => {
    const user = userEvent.setup();
    const storage = renderControls(
      createMemoryStorage([storedMatchFixture({ id: 'existing' })]),
    );

    await pickBackup(
      user,
      await backupFile([
        storedMatchFixture({ id: 'a' }),
        storedMatchFixture({ id: 'b' }),
      ]),
    );
    await user.click(
      await screen.findByRole('button', { name: /replace history/i }),
    );

    expect(
      await screen.findByText(/replaced the previous history/i),
    ).toBeInTheDocument();
    expect((await storage.list()).map((m) => m.id).sort()).toEqual(['a', 'b']);
  });

  it('keeps the history and adds the file when merge is chosen', async () => {
    const user = userEvent.setup();
    const storage = renderControls(
      createMemoryStorage([storedMatchFixture({ id: 'existing' })]),
    );

    await pickBackup(
      user,
      await backupFile([
        storedMatchFixture({ id: 'a' }),
        storedMatchFixture({ id: 'b' }),
      ]),
    );
    await user.click(await screen.findByRole('button', { name: /merge/i }));

    expect(await screen.findByText(/merged/i)).toBeInTheDocument();
    expect((await storage.list()).map((m) => m.id).sort()).toEqual([
      'a',
      'b',
      'existing',
    ]);
  });

  it('rejects a non-backup file without opening the confirmation', async () => {
    const user = userEvent.setup();
    const storage = renderControls(
      createMemoryStorage([storedMatchFixture({ id: 'existing' })]),
    );

    const junk = new File(['not json'], 'junk.json', {
      type: 'application/json',
    });
    await pickBackup(user, junk);

    expect(
      await screen.findByText(/not a pg-backgammon backup/i),
    ).toBeInTheDocument();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect((await storage.list()).map((m) => m.id)).toEqual(['existing']);
  });
});
