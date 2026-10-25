import { act, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from './App';
import { getSaveHealthMonitor } from './storage';

beforeEach(() => {
  window.history.replaceState(null, '', '/');
});

describe('navigation shell', () => {
  it('shows the five areas in the navigation and opens on Play', () => {
    render(<App />);

    const nav = screen.getByRole('navigation');
    for (const area of ['Play', 'Analyze', 'Puzzles', 'Progress', 'Settings']) {
      expect(within(nav).getByRole('link', { name: area })).toBeInTheDocument();
    }

    expect(
      screen.getByRole('heading', { level: 1, name: 'Play' }),
    ).toBeInTheDocument();
  });

  it.each(['Analyze', 'Puzzles', 'Progress', 'Settings', 'Play'])(
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

describe('Learn area (ticket 32)', () => {
  it('reaches the glossary from a single Learn nav entry', async () => {
    const user = userEvent.setup();
    render(<App />);

    const nav = screen.getByRole('navigation', { name: 'Areas' });
    await user.click(within(nav).getByRole('link', { name: 'Learn' }));

    expect(
      screen.getByRole('heading', { level: 1, name: 'Learn' }),
    ).toBeInTheDocument();
    const glossary = screen.getByRole('region', { name: /glossary/i });
    expect(
      within(glossary).getByRole('heading', { name: 'Crawford game' }),
    ).toBeInTheDocument();
  });
});

describe('phone menu', () => {
  it('opens from the Menu button: all five areas plus the theme toggle', async () => {
    const user = userEvent.setup();
    render(<App />);

    const button = screen.getByRole('button', { name: 'Menu' });
    expect(button).toHaveAttribute('aria-expanded', 'false');
    expect(
      screen.queryByRole('navigation', { name: 'Menu' }),
    ).not.toBeInTheDocument();

    await user.click(button);

    expect(button).toHaveAttribute('aria-expanded', 'true');
    const menu = screen.getByRole('navigation', { name: 'Menu' });
    expect(button).toHaveAttribute('aria-controls', menu.id);
    for (const area of ['Play', 'Analyze', 'Puzzles', 'Progress', 'Settings']) {
      expect(
        within(menu).getByRole('link', { name: area }),
      ).toBeInTheDocument();
    }
    expect(
      within(menu).getByRole('button', {
        name: /^Switch to (dark|light) theme$/,
      }),
    ).toBeInTheDocument();
  });

  it('navigates to the chosen area and closes', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole('button', { name: 'Menu' }));
    const menu = screen.getByRole('navigation', { name: 'Menu' });
    await user.click(within(menu).getByRole('link', { name: 'Puzzles' }));

    expect(
      screen.getByRole('heading', { level: 1, name: 'Puzzles' }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('navigation', { name: 'Menu' }),
    ).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Menu' })).toHaveAttribute(
      'aria-expanded',
      'false',
    );
  });

  it('closes on Escape and returns focus to the Menu button', async () => {
    const user = userEvent.setup();
    render(<App />);

    const button = screen.getByRole('button', { name: 'Menu' });
    await user.click(button);
    expect(
      screen.getByRole('navigation', { name: 'Menu' }),
    ).toBeInTheDocument();

    await user.keyboard('{Escape}');

    expect(
      screen.queryByRole('navigation', { name: 'Menu' }),
    ).not.toBeInTheDocument();
    expect(button).toHaveFocus();
  });

  it('switches the theme from inside the menu without closing it', async () => {
    localStorage.clear();
    document.documentElement.removeAttribute('data-theme');
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole('button', { name: 'Menu' }));
    const menu = screen.getByRole('navigation', { name: 'Menu' });
    await user.click(
      within(menu).getByRole('button', { name: 'Switch to dark theme' }),
    );

    expect(document.documentElement).toHaveAttribute('data-theme', 'dark');
    expect(
      screen.getByRole('navigation', { name: 'Menu' }),
    ).toBeInTheDocument();
    expect(
      within(screen.getByRole('navigation', { name: 'Menu' })).getByRole(
        'button',
        { name: 'Switch to light theme' },
      ),
    ).toBeInTheDocument();
  });

  it('closes when the page behind it is clicked', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole('button', { name: 'Menu' }));
    expect(
      screen.getByRole('navigation', { name: 'Menu' }),
    ).toBeInTheDocument();

    await user.click(screen.getByRole('heading', { level: 1, name: 'Play' }));

    expect(
      screen.queryByRole('navigation', { name: 'Menu' }),
    ).not.toBeInTheDocument();
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

  it('offers to resume the interrupted match and restores its standing', async () => {
    const user = userEvent.setup();
    const firstVisit = render(<App />);

    await user.click(screen.getByRole('button', { name: 'Hot-seat match' }));
    const pipsBefore = {
      white: screen.getByLabelText('White pip count').textContent,
      black: screen.getByLabelText('Black pip count').textContent,
    };

    // A reload: flush persistence (as leaving the page does), then reboot.
    window.dispatchEvent(new Event('pagehide'));
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
    firstVisit.unmount();
    render(<App />);

    await user.click(
      await screen.findByRole('button', { name: 'Resume match' }),
    );

    // Ticket 33: a first-time user's hot-seat match opens as a quick 1-point
    // game, and resume restores exactly that.
    expect(screen.getByText('1-point match')).toBeInTheDocument();
    expect(screen.getByLabelText('White pip count')).toHaveTextContent(
      pipsBefore.white ?? '',
    );
    expect(screen.getByLabelText('Black pip count')).toHaveTextContent(
      pipsBefore.black ?? '',
    );
    expect(screen.getByLabelText('White match score')).toHaveTextContent('0');
    expect(screen.getByLabelText('Black match score')).toHaveTextContent('0');
  });
});

describe('save-failure banner', () => {
  afterEach(() => {
    // Reset the app-wide monitor so the warning never leaks between tests.
    getSaveHealthMonitor().reportSuccess();
  });

  it('shows no banner while storage is healthy', () => {
    render(<App />);

    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('warns app-wide the moment saving fails', () => {
    render(<App />);

    act(() => {
      getSaveHealthMonitor().reportFailure();
    });

    expect(screen.getByRole('alert')).toHaveTextContent(/isn't being saved/i);
    expect(
      screen.getByRole('button', { name: /export backup/i }),
    ).toBeInTheDocument();
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
