import { render, screen } from '@testing-library/react';
import App from './App';

// Ticket 43: the non-landing areas are route-split with React.lazy, so a
// page's code (and any large data it pulls in — the ~1.3 MB curated puzzle
// set lives behind the Puzzles route) is fetched only when that route opens.
// Vitest isolates each test file in its own module registry, so App's lazy
// wrappers are freshly uninitialised here — rendering straight at /puzzles
// genuinely suspends, which is what lets this assertion observe the fallback.
it('route-splits the Puzzles area behind a Suspense loading fallback', async () => {
  window.history.replaceState(null, '', '/puzzles');
  render(<App />);

  // Puzzles lives in its own chunk: its content is absent on the first
  // synchronous paint while the chunk loads, and the fallback stands in.
  expect(
    screen.queryByRole('heading', { level: 1, name: 'Puzzles' }),
  ).toBeNull();
  expect(screen.getByText('Loading…')).toBeInTheDocument();

  // Once the chunk resolves, the page replaces the fallback.
  expect(
    await screen.findByRole('heading', { level: 1, name: 'Puzzles' }),
  ).toBeInTheDocument();
  expect(screen.queryByText('Loading…')).toBeNull();
});
