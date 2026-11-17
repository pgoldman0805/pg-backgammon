import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import {
  createMatchAnalyzer,
  isMatchAnalysis,
  type MatchAnalyzer,
} from '../analysis';
import type { Engine } from '../engine';
import { createFakeEngine } from '../engine/fake';
import { exportMat, importMat } from '../formats';
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
import { cubeGameMatch, recordOf } from '../test/match';
import { luckText, skillBand } from '../ui/format';
import { GLOSSARY } from '../ui/glossary';
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

function RoomProbe() {
  const location = useLocation();
  return <p>Room probe: {location.pathname}</p>;
}

function renderAnalyze(storage: MatchStorage, analyzer?: MatchAnalyzer) {
  render(
    <MemoryRouter initialEntries={['/analyze']}>
      <Routes>
        <Route
          path="/analyze"
          element={<Analyze storage={storage} analyzer={analyzer} />}
        />
        <Route path="/" element={<PlayProbe />} />
        <Route path="/play/:roomId" element={<RoomProbe />} />
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
    // This record holds no decisions: the review degrades to the final
    // position and the game list.
    expect(await screen.findByLabelText('Final position')).toBeInTheDocument();
    expect(
      await screen.findByText(/White \+1 — resigned single game/),
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

  it('returns a remote match to its room instead of a local board', async () => {
    const user = userEvent.setup();
    const live = liveMatch();
    const remote: StoredMatch = {
      ...live,
      id: 'stored-remote',
      config: {
        length: 5,
        mode: 'remote',
        roomId: 'room42',
        localSide: 'black',
      },
    };
    renderAnalyze(createMemoryStorage([remote]));

    await user.click(await screen.findByRole('button', { name: 'Resume' }));

    expect(screen.getByText(/Room probe/)).toHaveTextContent('/play/room42');
  });
});

describe('deleting a match', () => {
  it('asks before deleting, then removes the match', async () => {
    const user = userEvent.setup();
    const storage = createMemoryStorage([finishedMatch()]);
    renderAnalyze(storage);

    await user.click(
      await screen.findByRole('button', { name: /more actions/i }),
    );
    await user.click(screen.getByRole('menuitem', { name: 'Delete…' }));
    await user.click(screen.getByRole('button', { name: 'Delete match' }));

    expect(await screen.findByText(/no matches yet/i)).toBeInTheDocument();
    expect(await storage.list()).toEqual([]);
  });

  it('can change its mind', async () => {
    const user = userEvent.setup();
    const storage = createMemoryStorage([finishedMatch()]);
    renderAnalyze(storage);

    await user.click(
      await screen.findByRole('button', { name: /more actions/i }),
    );
    await user.click(screen.getByRole('menuitem', { name: 'Delete…' }));
    await user.click(screen.getByRole('button', { name: 'Keep' }));

    expect(screen.getByText('White wins 1–0')).toBeInTheDocument();
    expect(await storage.list()).toHaveLength(1);
  });
});

describe('ledger overflow menu and sort/filter', () => {
  it('leads each row with Open and tucks Export and Delete into a menu', async () => {
    const user = userEvent.setup();
    renderAnalyze(createMemoryStorage([finishedMatch()]));

    // Open stands on its own as the primary action.
    expect(await screen.findByRole('button', { name: 'Open' })).toBeVisible();
    // Export and Delete are out of sight until the overflow menu opens.
    expect(
      screen.queryByRole('menuitem', { name: 'Export .mat' }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('menuitem', { name: 'Delete…' }),
    ).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /more actions/i }));

    const menu = screen.getByRole('menu');
    expect(
      within(menu).getByRole('menuitem', { name: 'Export .mat' }),
    ).toBeVisible();
    expect(
      within(menu).getByRole('menuitem', { name: 'Delete…' }),
    ).toBeVisible();
  });

  it('closes the overflow menu on Escape', async () => {
    const user = userEvent.setup();
    renderAnalyze(createMemoryStorage([finishedMatch()]));

    await user.click(
      await screen.findByRole('button', { name: /more actions/i }),
    );
    expect(screen.getByRole('menu')).toBeInTheDocument();

    await user.keyboard('{Escape}');

    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  });

  it('deletes through the menu, after confirming', async () => {
    const user = userEvent.setup();
    const storage = createMemoryStorage([finishedMatch()]);
    renderAnalyze(storage);

    await user.click(
      await screen.findByRole('button', { name: /more actions/i }),
    );
    await user.click(screen.getByRole('menuitem', { name: 'Delete…' }));
    await user.click(screen.getByRole('button', { name: 'Delete match' }));

    expect(await screen.findByText(/no matches yet/i)).toBeInTheDocument();
    expect(await storage.list()).toEqual([]);
  });

  it('filters the ledger by a search query', async () => {
    const user = userEvent.setup();
    renderAnalyze(createMemoryStorage([finishedMatch(), liveMatch()]));
    await screen.findByText('White wins 1–0');

    await user.type(
      screen.getByRole('searchbox', { name: /filter matches/i }),
      'hot-seat',
    );

    expect(screen.queryByText('White wins 1–0')).not.toBeInTheDocument();
    expect(screen.getByText('White 2 · Black 1')).toBeInTheDocument();
  });

  it('sorts oldest first on demand, newest first by default', async () => {
    const user = userEvent.setup();
    renderAnalyze(createMemoryStorage([finishedMatch(), liveMatch()]));
    await screen.findByText('White wins 1–0');

    // Default is newest first: the live match (Feb) leads the finished (Jan).
    const before = screen.getAllByRole('listitem');
    expect(
      within(before[0]).queryByText('White 2 · Black 1'),
    ).toBeInTheDocument();

    await user.selectOptions(
      screen.getByRole('combobox', { name: /sort matches/i }),
      'oldest',
    );

    const after = screen.getAllByRole('listitem');
    expect(within(after[0]).queryByText('White wins 1–0')).toBeInTheDocument();
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

    // Ticket 27: a restore is confirmed before it touches the history.
    await user.click(
      await screen.findByRole('button', { name: /replace history/i }),
    );

    expect(await screen.findByText('White wins 1–0')).toBeInTheDocument();
    expect(screen.queryByText('White 2 · Black 1')).not.toBeInTheDocument();
    expect((await storage.list()).map((m) => m.id)).toEqual(['stored-done']);
  });

  it('leaves the history untouched when a restore is cancelled', async () => {
    const user = userEvent.setup();
    const json = serializeBackup(
      await exportBackup(createMemoryStorage([finishedMatch()])),
    );
    const storage = createMemoryStorage([liveMatch()]);
    renderAnalyze(storage);
    await screen.findByText('White 2 · Black 1');

    const file = new File([json], 'backup.json', { type: 'application/json' });
    await user.upload(screen.getByLabelText(/import backup/i), file);
    await user.click(await screen.findByRole('button', { name: /cancel/i }));

    expect(screen.getByText('White 2 · Black 1')).toBeInTheDocument();
    expect((await storage.list()).map((m) => m.id)).toEqual(['stored-live']);
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

/** The scripted cube game as a finished 2-point match (Black wins 2–0). */
function reviewMatch(): StoredMatch {
  return snapshotMatch({
    id: 'stored-review',
    config: { length: 2, mode: 'computer', difficulty: 'world-class' },
    match: cubeGameMatch(2),
    createdAt: new Date(2026, 2, 1).getTime(),
    updatedAt: new Date(2026, 2, 2).getTime(),
  });
}

function fakeAnalyzer(): MatchAnalyzer {
  return createMatchAnalyzer({ engine: createFakeEngine(), now: () => 42 });
}

/** An analyzer whose engine waits until the test releases it. */
function heldAnalyzer(): { analyzer: MatchAnalyzer; release: () => void } {
  const fake = createFakeEngine();
  let release!: () => void;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  const engine: Engine = {
    ...fake,
    rankPlays: async (...args) => {
      await gate;
      return fake.rankPlays(...args);
    },
    cubeInfo: async (...args) => {
      await gate;
      return fake.cubeInfo(...args);
    },
  };
  return {
    analyzer: createMatchAnalyzer({ engine, now: () => 42 }),
    release,
  };
}

/** The review fixture with its analysis already persisted. */
async function analyzedReviewMatch(): Promise<StoredMatch> {
  const stored = reviewMatch();
  const analysis = await fakeAnalyzer().analyzeMatch(stored.record);
  return { ...stored, analysis };
}

describe('post-game review', () => {
  it('analyzes an unanalyzed match on open, with progress, and persists', async () => {
    const user = userEvent.setup();
    const storage = createMemoryStorage([reviewMatch()]);
    const { analyzer, release } = heldAnalyzer();
    renderAnalyze(storage, analyzer);

    await user.click(await screen.findByRole('button', { name: 'Open' }));
    expect(await screen.findByRole('status')).toHaveTextContent(/analyzing/i);

    release();
    expect(await screen.findByLabelText('White error rate')).toBeVisible();

    const row = await storage.get('stored-review');
    expect(isMatchAnalysis(row?.analysis)).toBe(true);
  });

  it('shows the decision list with losses, markers and the summary', async () => {
    const user = userEvent.setup();
    const stored = await analyzedReviewMatch();
    renderAnalyze(createMemoryStorage([stored]));

    await user.click(await screen.findByRole('button', { name: 'Open' }));

    // The played plays appear in engine notation; the double carries its
    // blunder marker (the fake engine prices it at exactly 0.080).
    const list = await screen.findByLabelText('Decisions');
    expect(within(list).getByText('8/5 6/5')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /doubles to 2/i }),
    ).toHaveTextContent(/blunder/i);

    // Per-player quality as XG-style PR (×500), straight from the analysis,
    // with its skill band alongside and the unit labelled PR.
    const analysis = stored.analysis;
    if (!isMatchAnalysis(analysis)) {
      throw new Error('fixture must carry an analysis');
    }
    expect(screen.getByLabelText('White error rate')).toHaveTextContent(
      (analysis.white.errorRate * 500).toFixed(1),
    );
    expect(screen.getByLabelText('Black error rate')).toHaveTextContent(
      (analysis.black.errorRate * 500).toFixed(1),
    );
    const matchSummary = screen.getByLabelText('Match error rates');
    expect(within(matchSummary).getAllByText('PR').length).toBeGreaterThan(0);
    expect(
      within(matchSummary).getAllByText(skillBand(analysis.white.errorRate))
        .length,
    ).toBeGreaterThan(0);
  });

  it('shows a per-side luck figure, labelled and kept apart from PR', async () => {
    const user = userEvent.setup();
    const stored = await analyzedReviewMatch();
    renderAnalyze(createMemoryStorage([stored]));
    await user.click(await screen.findByRole('button', { name: 'Open' }));

    const analysis = stored.analysis;
    if (!isMatchAnalysis(analysis) || !analysis.luck) {
      throw new Error('fixture must carry luck');
    }
    const summary = await screen.findByLabelText('Match error rates');

    const whiteLuck = within(summary).getByLabelText('White net luck');
    expect(whiteLuck).toHaveTextContent(luckText(analysis.luck.white));
    expect(within(summary).getByLabelText('Black net luck')).toHaveTextContent(
      luckText(analysis.luck.black),
    );
    // The dice figure is defined with a tooltip and never conflated with PR.
    expect(
      within(summary).getByRole('button', { name: 'Luck' }),
    ).toHaveAccessibleDescription(GLOSSARY.luck.short);
    expect(whiteLuck).not.toHaveTextContent('PR');
  });

  it('opens a decision on the board with the engine alternatives', async () => {
    const user = userEvent.setup();
    renderAnalyze(createMemoryStorage([await analyzedReviewMatch()]));
    await user.click(await screen.findByRole('button', { name: 'Open' }));

    // The cube blunder, called out with its cost.
    await user.click(
      await screen.findByRole('button', { name: /doubles to 2/i }),
    );
    const detail = screen.getByLabelText('Decision detail');
    expect(detail).toHaveTextContent(/wrong double/i);
    expect(detail).toHaveTextContent(/0\.080/);
    expect(screen.getByLabelText('Review position')).toBeInTheDocument();

    // A checker play shows the ranked alternatives with best and played marked.
    await user.click(screen.getByRole('button', { name: /white plays 3-1/i }));
    const alternatives = screen.getByLabelText('Engine alternatives');
    expect(within(alternatives).getAllByRole('button').length).toBeGreaterThan(
      1,
    );
    expect(within(alternatives).getByText(/played/i)).toBeInTheDocument();
    expect(within(alternatives).getByText(/best/i)).toBeInTheDocument();
  });

  it('labels the equity and loss columns of the review (ticket 42)', async () => {
    const user = userEvent.setup();
    renderAnalyze(createMemoryStorage([await analyzedReviewMatch()]));
    await user.click(await screen.findByRole('button', { name: 'Open' }));

    // The played checker play's alternatives carry headers over the two
    // right-hand number columns, like the Puzzles reveal does.
    await user.click(screen.getByRole('button', { name: /white plays 3-1/i }));
    const alternatives = screen.getByLabelText('Engine alternatives');
    expect(within(alternatives).getByText('Equity')).toBeInTheDocument();
    expect(within(alternatives).getByText('Loss')).toBeInTheDocument();
  });

  it('steps through the decisions with next and previous', async () => {
    const user = userEvent.setup();
    renderAnalyze(createMemoryStorage([await analyzedReviewMatch()]));
    await user.click(await screen.findByRole('button', { name: 'Open' }));

    const detail = await screen.findByLabelText('Decision detail');
    expect(detail).toHaveTextContent(/white played 8\/5 6\/5/i);

    await user.click(screen.getByRole('button', { name: 'Next decision' }));
    expect(detail).toHaveTextContent(/black doubles to 2/i);

    await user.click(screen.getByRole('button', { name: 'Previous decision' }));
    expect(detail).toHaveTextContent(/white played 8\/5 6\/5/i);
  });

  it('explains the review jargon with inline glossary tooltips (ticket 32)', async () => {
    const user = userEvent.setup();
    const stored = await analyzedReviewMatch();
    renderAnalyze(createMemoryStorage([stored]), fakeAnalyzer());
    await user.click(await screen.findByRole('button', { name: 'Open' }));

    const summary = await screen.findByLabelText('Match error rates');
    expect(
      within(summary).getByRole('button', { name: 'PR' }),
    ).toHaveAccessibleDescription(GLOSSARY.pr.short);
    expect(
      within(summary).getByRole('button', { name: 'equity' }),
    ).toHaveAccessibleDescription(GLOSSARY.equity.short);

    const detail = await screen.findByLabelText('Decision detail');
    expect(
      within(detail).getByRole('button', { name: '2-ply' }),
    ).toHaveAccessibleDescription(GLOSSARY['two-ply'].short);
  });

  it('analyzes a single decision deeper and persists the refinement', async () => {
    const user = userEvent.setup();
    const stored = await analyzedReviewMatch();
    const storage = createMemoryStorage([stored]);
    renderAnalyze(storage, fakeAnalyzer());
    await user.click(await screen.findByRole('button', { name: 'Open' }));

    const detail = await screen.findByLabelText('Decision detail');
    expect(detail).toHaveTextContent('2-ply');
    await user.click(screen.getByRole('button', { name: /analyze deeper/i }));

    expect(await within(detail).findByText('3-ply')).toBeInTheDocument();
    const row = await storage.get('stored-review');
    if (!isMatchAnalysis(row?.analysis)) {
      throw new Error('the deepened analysis must persist');
    }
    expect(row.analysis.games[0].decisions[0].plies).toBe(3);
  });

  it('offers a retry when the analysis fails', async () => {
    const user = userEvent.setup();
    const fake = createFakeEngine();
    let failures = 1;
    const flaky: Engine = {
      ...fake,
      rankPlays: (...args) => {
        if (failures > 0) {
          failures -= 1;
          return Promise.reject(new Error('engine busy'));
        }
        return fake.rankPlays(...args);
      },
    };
    const storage = createMemoryStorage([reviewMatch()]);
    renderAnalyze(
      storage,
      createMatchAnalyzer({ engine: flaky, now: () => 42 }),
    );

    await user.click(await screen.findByRole('button', { name: 'Open' }));
    expect(
      await screen.findByText(/analysis could not be completed/i),
    ).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Try again' }));
    expect(await screen.findByLabelText('White error rate')).toBeVisible();
  });
});

describe('.mat import and export', () => {
  it('imports a .mat file and the open flow analyzes it like a native match', async () => {
    const user = userEvent.setup();
    const storage = createMemoryStorage();
    renderAnalyze(storage, fakeAnalyzer());
    await screen.findByText(/no matches yet/i);

    const text = exportMat(recordOf(cubeGameMatch(2)));
    const file = new File([text], 'match.mat', { type: 'text/plain' });
    await user.upload(screen.getByLabelText(/import match/i), file);

    expect(await screen.findByText('Black wins 2–0')).toBeInTheDocument();
    expect(screen.getByText(/2-point imported match/)).toBeInTheDocument();

    // Ticket 08's open-triggers-analysis fires for the imported row too.
    await user.click(screen.getByRole('button', { name: 'Open' }));
    expect(await screen.findByLabelText('White error rate')).toBeVisible();
    const rows = await storage.list();
    expect(rows).toHaveLength(1);
    expect(isMatchAnalysis(rows[0].analysis)).toBe(true);
  });

  it('rejects a malformed .mat file with a message, never a crash', async () => {
    const user = userEvent.setup();
    const storage = createMemoryStorage([finishedMatch()]);
    renderAnalyze(storage);
    await screen.findByText('White wins 1–0');

    const file = new File(['not a match'], 'junk.mat', { type: 'text/plain' });
    await user.upload(screen.getByLabelText(/import match/i), file);

    expect(
      await screen.findByText(/could not be imported.*point match/i),
    ).toBeInTheDocument();
    expect(screen.getByText('White wins 1–0')).toBeInTheDocument();
    expect(await storage.list()).toHaveLength(1);
  });

  it('downloads a finished match as .mat text that re-imports identically', async () => {
    const user = userEvent.setup();
    const createObjectURL = vi.fn((_blob: Blob) => 'blob:mat');
    const revokeObjectURL = vi.fn();
    Object.assign(URL, { createObjectURL, revokeObjectURL });
    const click = vi
      .spyOn(HTMLAnchorElement.prototype, 'click')
      .mockImplementation(() => {});
    renderAnalyze(createMemoryStorage([reviewMatch()]));

    await user.click(
      await screen.findByRole('button', { name: /more actions/i }),
    );
    await user.click(screen.getByRole('menuitem', { name: 'Export .mat' }));
    click.mockRestore();

    const blob = createObjectURL.mock.calls[0][0];
    const text = await readBlobText(blob);
    expect(text).toMatch(/^ 2 point match/);
    expect(importMat(text).record).toEqual(reviewMatch().record);
  });
});

describe('XGID position viewer', () => {
  const START_31 = 'XGID=-b----E-C---eE---c-e----B-:0:0:1:31:0:0:0:7:10';

  async function loadXgid(
    user: ReturnType<typeof userEvent.setup>,
    xgid: string,
  ) {
    await user.type(await screen.findByLabelText(/paste an xgid/i), xgid);
    await user.click(screen.getByRole('button', { name: 'Load position' }));
  }

  it('loads a pasted XGID into a read-only position with its context', async () => {
    const user = userEvent.setup();
    renderAnalyze(createMemoryStorage(), fakeAnalyzer());

    await loadXgid(user, START_31);

    const figure = await screen.findByLabelText('Pasted position');
    expect(figure).toHaveTextContent(/white to play 3-1/i);
    expect(figure).toHaveTextContent(/7-point match/i);
  });

  it('analyzes the loaded position on demand: plays when dice are present', async () => {
    const user = userEvent.setup();
    renderAnalyze(createMemoryStorage(), fakeAnalyzer());
    await loadXgid(user, START_31);

    await user.click(
      await screen.findByRole('button', { name: 'Analyze position' }),
    );

    const plays = await screen.findByLabelText('Engine plays');
    expect(within(plays).getAllByRole('listitem').length).toBeGreaterThan(1);
    expect(within(plays).getByText('best')).toBeInTheDocument();
  });

  it('analyzes the cube decision when the XGID has no dice', async () => {
    const user = userEvent.setup();
    renderAnalyze(createMemoryStorage(), fakeAnalyzer());
    await loadXgid(user, START_31.replace(':31:', ':00:'));

    await user.click(
      await screen.findByRole('button', { name: 'Analyze position' }),
    );

    const cube = await screen.findByLabelText('Cube equities');
    expect(within(cube).getByText('No double')).toBeInTheDocument();
    expect(screen.getByText(/engine:/i)).toBeInTheDocument();
  });

  it('rejects an invalid XGID with a clear message', async () => {
    const user = userEvent.setup();
    renderAnalyze(createMemoryStorage(), fakeAnalyzer());

    await loadXgid(user, 'XGID=garbage');

    expect(await screen.findByText(/not a valid XGID/i)).toBeInTheDocument();
    expect(screen.queryByLabelText('Pasted position')).not.toBeInTheDocument();
  });
});

describe('copy XGID from the review board', () => {
  it('copies the position before the selected decision', async () => {
    const user = userEvent.setup();
    renderAnalyze(createMemoryStorage([await analyzedReviewMatch()]));
    await user.click(await screen.findByRole('button', { name: 'Open' }));
    await screen.findByLabelText('Decision detail');

    await user.click(screen.getByRole('button', { name: 'Copy XGID' }));

    // The first decision: White to play 3-1 from the start, 2-point match.
    expect(await window.navigator.clipboard.readText()).toBe(
      'XGID=-b----E-C---eE---c-e----B-:0:0:1:31:0:0:0:2:10',
    );
    expect(await screen.findByText('Copied')).toBeInTheDocument();
  });
});
