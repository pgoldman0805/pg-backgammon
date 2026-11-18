/**
 * The first-run primer nudge (ticket 30): a brand-new user lands on Play with
 * no idea how to play. A dismissible, non-blocking note points them at the
 * how-to-play primer in the Learn area. It never blocks, and once the primer
 * has been seen — or the note dismissed — it does not return.
 */

import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it } from 'vitest';
import {
  hasPrimerBeenSeen,
  markPrimerSeen,
  PRIMER_SEEN_KEY,
} from '../play/settings';
import { FirstRunPrimerPrompt } from './FirstRunPrimerPrompt';

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <FirstRunPrimerPrompt />
    </MemoryRouter>,
  );
}

describe('the first-run primer nudge', () => {
  beforeEach(() => {
    localStorage.removeItem(PRIMER_SEEN_KEY);
  });

  it('greets a brand-new user with a link into the primer', () => {
    renderAt('/');
    const note = screen.getByRole('note', { name: /new to backgammon/i });
    const link = within(note).getByRole('link', { name: /how to play/i });
    expect(link).toHaveAttribute('href', '/learn');
  });

  it('stays out of the way for a returning user', () => {
    markPrimerSeen();
    renderAt('/');
    expect(screen.queryByRole('note')).not.toBeInTheDocument();
  });

  it('does not nag on the Learn area itself', () => {
    renderAt('/learn');
    expect(screen.queryByRole('note')).not.toBeInTheDocument();
  });

  it('does not push the board down in a shared game link', () => {
    renderAt('/play/abcdefghijklmnopqrst');
    expect(screen.queryByRole('note')).not.toBeInTheDocument();
  });

  it('retires for good once dismissed', async () => {
    const user = userEvent.setup();
    renderAt('/');
    await user.click(screen.getByRole('button', { name: /dismiss/i }));
    expect(screen.queryByRole('note')).not.toBeInTheDocument();
    expect(hasPrimerBeenSeen()).toBe(true);
  });

  it('counts following the link as having seen the primer', async () => {
    const user = userEvent.setup();
    renderAt('/');
    await user.click(screen.getByRole('link', { name: /how to play/i }));
    expect(hasPrimerBeenSeen()).toBe(true);
  });
});
