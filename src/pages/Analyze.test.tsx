import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import {
  acceptResignation,
  createBoard,
  createGame,
  createMatch,
  offerResignation,
  startMatch,
} from '../rules';
import {
  createMemoryStorage,
  exportBackup,
  type MatchStorage,
  parseBackup,
  type StoredMatch,
  serializeBackup,
  snapshotMatch,
} from '../storage';
import { scriptedDice } from '../test/dice';
import { Analyze } from './Analyze';

/** A finished 1-point match vs Expert: black resigns, white wins 1-0. */
function finishedMatch(): StoredMatch {
  const match = acceptResignation(
    offerResignation(startMatch(1, scriptedDice(6, 3)), 'black', 'single'),
  );
  return snapshotMatch({
    id: 'stored-done',
    config: { length: 1, mode: 'computer', difficulty: 'expert' },
    match,
    createdAt: new Date(2026, 0, 10).getTime(),
    updatedAt: new Date(2026, 0, 15).getTime(),
  });
}

/** An in-progress 5-point hot-seat match at White 2 - Black 1. */
function liveMatch(): StoredMatch {
  const match = createMatch({
    length: 5,
    game: createGame({
      board: createBoard({
        white: { points: { 6: 5, 5: 5, 4: 3, 2: 2 } },
        black: { points: { 19: 5, 20: 5, 21: 5 } },
      }),
      player: 'white',
      roll: [6, 3],
    }),
    score: { white: 2, black: 1 },
    cube: { value: 2, owner: 'white' },
  });
  return snapshotMatch({
    id: 'stored-live',
    config: { length: 5, mode: 'hotseat', difficulty: 'casual' },
    match,
    createdAt: new Date(2026, 1, 1).getTime(),
    updatedAt: new Date(2026, 1, 2).getTime(),
  });
}

function PlayProbe() {
  const location = useLocation();
  return <p>Play probe: {JSON.stringify(location.state)}</p>;
}

function renderAnalyze(storage: MatchStorage) {
  render(
    <MemoryRouter initialEntries={['/analyze']}>
      <Routes>
        <Route path="/analyze" element={<Analyze storage={storage} />} />
        <Route path="/" element={<PlayProbe />} />
      </Routes>
    </MemoryRouter>,
  );
}

function readBlobText(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsText(blob);
  });
}

describe('match history list', () => {
  it('explains the empty state', async () => {
    renderAnalyze(createMemoryStorage());

    expect(await screen.findByText(/no matches yet/i)).toBeInTheDocument();
  });

  it('lists matches with result, length, difficulty, date and status', async () => {
    renderAnalyze(createMemoryStorage([finishedMatch(), liveMatch()]));

    expect(await screen.findByText('White wins 1–0')).toBeInTheDocument();
    expect(
      screen.getByText(/1-point match vs Expert, finished .*2026/),
    ).toBeInTheDocument();
    expect(screen.getByText('White 2 · Black 1')).toBeInTheDocument();
    expect(
      screen.getByText(/5-point hot-seat match, last played .*2026/),
    ).toBeInTheDocument();
    expect(screen.getByText('In progress')).toBeInTheDocument();
  });

  it('skips corrupt rows instead of crashing', async () => {
    const storage = createMemoryStorage([
      finishedMatch(),
      { id: 'broken' } as unknown as StoredMatch,
    ]);
    renderAnalyze(storage);

    expect(await screen.findByText('White wins 1–0')).toBeInTheDocument();
    expect(screen.getAllByRole('listitem')).toHaveLength(1);
  });

  it('still renders when storage fails to load', async () => {
    const storage = createMemoryStorage();
    storage.list = () => Promise.reject(new Error('gone'));
    renderAnalyze(storage);

    expect(
      await screen.findByText(/history could not be loaded/i),
    ).toBeInTheDocument();
  });
});

describe('opening a finished match', () => {
  it('replays the record into a read-only view', async () => {
    const user = userEvent.setup();
    renderAnalyze(createMemoryStorage([finishedMatch()]));

    await user.click(await screen.findByRole('button', { name: 'Open' }));

    expect(screen.getByText('White wins the match 1–0')).toBeInTheDocument();
    expect(screen.getByLabelText('Final position')).toBeInTheDocument();
    expect(
      screen.getByText(/White \+1 — resigned single game/),
    ).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Back to history' }));
    expect(screen.getByText('White wins 1–0')).toBeInTheDocument();
  });
});

describe('resuming from history', () => {
  it('jumps to Play carrying the match id', async () => {
    const user = userEvent.setup();
    renderAnalyze(createMemoryStorage([liveMatch()]));

    await user.click(await screen.findByRole('button', { name: 'Resume' }));

    expect(screen.getByText(/Play probe/)).toHaveTextContent('stored-live');
  });
});

describe('deleting a match', () => {
  it('asks before deleting, then removes the match', async () => {
    const user = userEvent.setup();
    const storage = createMemoryStorage([finishedMatch()]);
    renderAnalyze(storage);

    await user.click(await screen.findByRole('button', { name: 'Delete…' }));
    await user.click(screen.getByRole('button', { name: 'Delete match' }));

    expect(await screen.findByText(/no matches yet/i)).toBeInTheDocument();
    expect(await storage.list()).toEqual([]);
  });

  it('can change its mind', async () => {
    const user = userEvent.setup();
    const storage = createMemoryStorage([finishedMatch()]);
    renderAnalyze(storage);

    await user.click(await screen.findByRole('button', { name: 'Delete…' }));
    await user.click(screen.getByRole('button', { name: 'Keep' }));

    expect(screen.getByText('White wins 1–0')).toBeInTheDocument();
    expect(await storage.list()).toHaveLength(1);
  });
});

describe('backup', () => {
  it('exports the whole history as a JSON download', async () => {
    const user = userEvent.setup();
    const createObjectURL = vi.fn((_blob: Blob) => 'blob:history');
    const revokeObjectURL = vi.fn();
    Object.assign(URL, { createObjectURL, revokeObjectURL });
    const click = vi
      .spyOn(HTMLAnchorElement.prototype, 'click')
      .mockImplementation(() => {});
    renderAnalyze(createMemoryStorage([finishedMatch(), liveMatch()]));

    await user.click(
      await screen.findByRole('button', { name: 'Export history' }),
    );

    expect(click).toHaveBeenCalledTimes(1);
    click.mockRestore();
    expect(createObjectURL).toHaveBeenCalledTimes(1);
    const blob = createObjectURL.mock.calls[0][0];
    const backup = parseBackup(await readBlobText(blob));
    expect(backup.matches.map((m) => m.id).sort()).toEqual([
      'stored-done',
      'stored-live',
    ]);
  });

  it('imports a backup, replacing the current history', async () => {
    const user = userEvent.setup();
    const json = serializeBackup(
      await exportBackup(createMemoryStorage([finishedMatch()])),
    );
    const storage = createMemoryStorage([liveMatch()]);
    renderAnalyze(storage);
    await screen.findByText('White 2 · Black 1');

    const file = new File([json], 'backup.json', { type: 'application/json' });
    await user.upload(screen.getByLabelText(/import backup/i), file);

    expect(await screen.findByText('White wins 1–0')).toBeInTheDocument();
    expect(screen.queryByText('White 2 · Black 1')).not.toBeInTheDocument();
    expect((await storage.list()).map((m) => m.id)).toEqual(['stored-done']);
  });

  it('refuses a file that is not a backup, keeping the history', async () => {
    const user = userEvent.setup();
    const storage = createMemoryStorage([liveMatch()]);
    renderAnalyze(storage);
    await screen.findByText('White 2 · Black 1');

    const file = new File(['junk'], 'junk.json', { type: 'application/json' });
    await user.upload(screen.getByLabelText(/import backup/i), file);

    expect(
      await screen.findByText(/not a pg-backgammon backup/i),
    ).toBeInTheDocument();
    expect(screen.getByText('White 2 · Black 1')).toBeInTheDocument();
    expect(await storage.list()).toHaveLength(1);
  });
});
