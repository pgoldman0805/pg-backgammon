/**
 * The how-to-play primer (ticket 30, review finding #6): the on-ramp that
 * teaches a complete newcomer the game without leaving the app — the goal,
 * which way checkers travel, hitting and the bar, bearing off, and the cube.
 * It lives in the Learn area beside the glossary and links its jargon to the
 * same definitions the inline tooltips use.
 */

import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { GLOSSARY } from '../ui/glossary';
import { HowToPlay } from './HowToPlay';

describe('the how-to-play primer', () => {
  it('is a labelled region headed "How to play"', () => {
    render(<HowToPlay />);
    expect(
      screen.getByRole('region', { name: /how to play/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { level: 2, name: 'How to play' }),
    ).toBeInTheDocument();
  });

  it('covers the five fundamentals a first move needs', () => {
    render(<HowToPlay />);
    const primer = screen.getByRole('region', { name: /how to play/i });
    for (const topic of [
      'The goal',
      'Moving your checkers',
      'Hitting and the bar',
      'Bearing off',
      'The doubling cube',
    ]) {
      expect(
        within(primer).getByRole('heading', { level: 3, name: topic }),
      ).toBeInTheDocument();
    }
  });

  it('links the doubling cube to its glossary definition', () => {
    render(<HowToPlay />);
    const primer = screen.getByRole('region', { name: /how to play/i });
    const term = within(primer).getByRole('button', { name: /doubling cube/i });
    // Wired through GlossaryTerm: the trigger describes itself with the short
    // definition, so a screen reader hears the meaning on focus.
    expect(term).toHaveAttribute('aria-describedby');
    expect(
      within(primer).getByText(GLOSSARY['doubling-cube'].short),
    ).toBeInTheDocument();
  });
});
