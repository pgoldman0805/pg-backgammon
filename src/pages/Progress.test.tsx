import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { createMemoryStorage, type MatchStorage } from '../storage';
import {
  gameAnalysis,
  gameRecord,
  matchAnalysis,
  progressRow,
  summary,
} from '../test/progressRows';
import { Progress } from './Progress';

function renderProgress(storage: MatchStorage) {
  return render(
    <MemoryRouter initialEntries={['/progress']}>
      <Progress storage={storage} />
    </MemoryRouter>,
  );
}

/** One clean match and one partially tutor-assisted match, plus noise rows
 * that must not contribute. Hand-computed expectations (PR = EMG × 500):
 * - clean:   20 decisions, 0.200 lost, 2 blunders → PR 5.0 (Jan 2026)
 * - partial: 25 counted decisions (the tutor game's 10 skipped), 0.300
 *            lost, 2 blunders, 2 of 3 games counted → PR 6.0 (Feb 2026)
 * - totals:  2 matches, 4 blunders, recent average (5.0 + 6.0) / 2 = 5.5
 */
function seededStorage(): MatchStorage {
  return createMemoryStorage([
    progressRow({
      id: 'clean',
      games: [gameRecord(false)],
      analysis: matchAnalysis([gameAnalysis(summary(20, 0.2, 2))]),
      updatedAt: new Date(2026, 0, 5).getTime(),
    }),
    progressRow({
      id: 'partial',
      games: [gameRecord(false), gameRecord(true), gameRecord(false)],
      analysis: matchAnalysis([
        gameAnalysis(summary(20, 0.2, 1)),
        gameAnalysis(summary(10, 0.9, 5)),
        gameAnalysis(summary(5, 0.1, 1)),
      ]),
      updatedAt: new Date(2026, 1, 10).getTime(),
    }),
    progressRow({
      id: 'all-tutor',
      games: [gameRecord(true)],
      analysis: matchAnalysis([gameAnalysis(summary(30, 0.9, 9))]),
      updatedAt: new Date(2026, 2, 1).getTime(),
    }),
    progressRow({
      id: 'hotseat',
      games: [gameRecord(false)],
      analysis: matchAnalysis([gameAnalysis(summary(30, 0.9, 9))]),
      mode: 'hotseat',
      updatedAt: new Date(2026, 2, 2).getTime(),
    }),
  ]);
}

describe('the progress view', () => {
  it('shows the aggregates over contributing matches only', async () => {
    renderProgress(seededStorage());

    const stats = await screen.findByRole('region', {
      name: 'Progress summary',
    });
    expect(stats).toHaveTextContent('Matches analyzed2');
    expect(stats).toHaveTextContent('PR, last 2 matches5.5');
    expect(stats).toHaveTextContent('Blunders in all4');
  });

  it('plots each match as an accessible point with its golden values', async () => {
    renderProgress(seededStorage());

    expect(
      await screen.findByRole('button', {
        name: /match 1 of 2.*PR 5\.0 over 20 decisions, 2 blunders/i,
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', {
        name: /match 2 of 2.*PR 6\.0 over 25 decisions, 2 blunders. 1 of 3 games was tutor-assisted and excluded/i,
      }),
    ).toBeInTheDocument();
    // The blunder chart carries its own pair of points.
    expect(
      screen.getByRole('button', { name: /match 1 of 2.*: 2 blunders\.$/i }),
    ).toBeInTheDocument();
    // Two charts × two contributing matches — the excluded rows plot nothing.
    expect(
      screen.getAllByRole('button', { name: /match \d of 2/i }),
    ).toHaveLength(4);
  });

  it('marks the partially excluded match with a hollow point', async () => {
    const { container } = renderProgress(seededStorage());

    await screen.findByRole('region', { name: 'Progress summary' });
    expect(container.querySelectorAll('.rate-dot')).toHaveLength(2);
    expect(container.querySelectorAll('.rate-dot--partial')).toHaveLength(1);
  });

  it('states the tutor exclusion rule and explains the hollow mark', async () => {
    renderProgress(seededStorage());

    expect(
      await screen.findByText(
        /tutor-assisted games are excluded from everything on this page — a hollow point marks a match where only some games counted/i,
      ),
    ).toBeInTheDocument();
  });

  it('shows the full readout as a tooltip on keyboard focus', async () => {
    renderProgress(seededStorage());

    const point = await screen.findByRole('button', {
      name: /match 2 of 2.*PR 6\.0/i,
    });
    fireEvent.focus(point);

    expect(screen.getByText('6.0', { selector: 'strong' })).toBeVisible();
    expect(
      screen.getByText(/1 of 3 games was tutor-assisted and excluded/i),
    ).toBeInTheDocument();

    fireEvent.blur(point);
    expect(screen.queryByText('6.0', { selector: 'strong' })).toBeNull();
  });

  it('pins the readout on click and unpins on a second click', async () => {
    renderProgress(seededStorage());

    const point = await screen.findByRole('button', {
      name: /match 2 of 2.*PR 6\.0/i,
    });
    fireEvent.click(point);
    expect(screen.getByText('6.0', { selector: 'strong' })).toBeVisible();

    fireEvent.click(point);
    expect(screen.queryByText('6.0', { selector: 'strong' })).toBeNull();
  });

  it('offers every plotted number in a table view', async () => {
    renderProgress(seededStorage());

    const table = await screen.findByRole('table');
    const partialRow = screen
      .getAllByRole('row')
      .find((row) => row.textContent?.includes('2 of 3'));
    expect(table).toBeInTheDocument();
    expect(partialRow).toBeDefined();
    expect(partialRow).toHaveTextContent('7-point vs Expert');
    expect(partialRow).toHaveTextContent('6.0');
    expect(partialRow).toHaveTextContent('25');
  });
});

describe('empty states', () => {
  it('guides a new user toward playing an analyzed match', async () => {
    renderProgress(createMemoryStorage());

    expect(
      await screen.findByText(/no analyzed matches yet/i),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: /start a match/i }),
    ).toHaveAttribute('href', '/');
    // The exclusion rule is part of the guidance from the start.
    expect(screen.getByText(/tutor-assisted games/i)).toBeInTheDocument();
  });

  it('explains when matches exist but none can be scored', async () => {
    const storage = createMemoryStorage([
      progressRow({
        id: 'all-tutor',
        games: [gameRecord(true)],
        analysis: matchAnalysis([gameAnalysis(summary(10, 0.1, 1))]),
      }),
    ]);
    renderProgress(storage);

    expect(
      await screen.findByText(/none of your matches can be scored yet/i),
    ).toBeInTheDocument();
  });

  it('still renders when storage fails to load', async () => {
    const storage = createMemoryStorage();
    storage.list = () => Promise.reject(new Error('gone'));
    renderProgress(storage);

    expect(
      await screen.findByText(/history could not be loaded/i),
    ).toBeInTheDocument();
  });
});
