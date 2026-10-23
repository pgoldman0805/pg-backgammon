import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from './App';

beforeEach(() => {
  window.history.replaceState(null, '', '/');
});

describe('navigation shell', () => {
  it('shows the four training areas in the navigation and opens on Play', () => {
    render(<App />);

    const nav = screen.getByRole('navigation');
    for (const area of ['Play', 'Analyze', 'Puzzles', 'Progress']) {
      expect(within(nav).getByRole('link', { name: area })).toBeInTheDocument();
    }

    expect(
      screen.getByRole('heading', { level: 1, name: 'Play' }),
    ).toBeInTheDocument();
  });

  it.each(['Analyze', 'Puzzles', 'Progress', 'Play'])(
    'opens the %s area when its link is clicked',
    async (area) => {
      const user = userEvent.setup();
      render(<App />);

      await user.click(screen.getByRole('link', { name: area }));

      expect(
        screen.getByRole('heading', { level: 1, name: area }),
      ).toBeInTheDocument();
    },
  );

  it('is keyboard-accessible: tab reaches the links, Enter opens an area', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.tab();
    expect(screen.getByRole('link', { name: 'Skip to content' })).toHaveFocus();

    await user.tab();
    expect(screen.getByRole('link', { name: 'Play' })).toHaveFocus();

    await user.tab();
    await user.tab();
    expect(screen.getByRole('link', { name: 'Puzzles' })).toHaveFocus();

    await user.keyboard('{Enter}');
    expect(
      screen.getByRole('heading', { level: 1, name: 'Puzzles' }),
    ).toBeInTheDocument();
  });
});

describe('reload during a game', () => {
  it('boots cleanly back to the Play setup after a mid-game reload', async () => {
    const user = userEvent.setup();
    const firstVisit = render(<App />);

    await user.click(screen.getByRole('button', { name: 'Play as White' }));
    // A game is now in progress: the setup card is gone.
    expect(
      screen.queryByRole('button', { name: 'Play as White' }),
    ).not.toBeInTheDocument();

    // Simulate a refresh: tear the tree down and boot a fresh one.
    // (Resume itself lands in ticket 07; this guards boot sanity.)
    firstVisit.unmount();
    render(<App />);

    expect(
      screen.getByRole('heading', { level: 1, name: 'Play' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Play as White' }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText('White pip count')).toHaveTextContent('167');
  });
});

describe('theme', () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.removeAttribute('data-theme');
  });

  it('starts light and switches to dark when toggled', async () => {
    const user = userEvent.setup();
    render(<App />);

    expect(document.documentElement).toHaveAttribute('data-theme', 'light');

    await user.click(
      screen.getByRole('button', { name: 'Switch to dark theme' }),
    );

    expect(document.documentElement).toHaveAttribute('data-theme', 'dark');
    expect(
      screen.getByRole('button', { name: 'Switch to light theme' }),
    ).toBeInTheDocument();
  });

  it('keeps the chosen theme across a reload', async () => {
    const user = userEvent.setup();
    const firstVisit = render(<App />);

    await user.click(
      screen.getByRole('button', { name: 'Switch to dark theme' }),
    );
    firstVisit.unmount();
    // Simulate a fresh page load: nothing applied yet, only storage remains.
    document.documentElement.removeAttribute('data-theme');

    render(<App />);

    expect(document.documentElement).toHaveAttribute('data-theme', 'dark');
    expect(
      screen.getByRole('button', { name: 'Switch to light theme' }),
    ).toBeInTheDocument();
  });
});
