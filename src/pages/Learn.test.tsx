import { render, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { hasPrimerBeenSeen, PRIMER_SEEN_KEY } from '../play/settings';
import { GLOSSARY } from '../ui/glossary';
import { Learn } from './Learn';

describe('Learn page', () => {
  beforeEach(() => {
    localStorage.removeItem(PRIMER_SEEN_KEY);
  });

  it('is titled Learn and introduces the glossary', () => {
    render(<Learn />);
    expect(
      screen.getByRole('heading', { level: 1, name: 'Learn' }),
    ).toBeInTheDocument();
  });

  it('carries the how-to-play primer beside the glossary', () => {
    render(<Learn />);
    expect(
      screen.getByRole('region', { name: /how to play/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('region', { name: /glossary/i }),
    ).toBeInTheDocument();
  });

  it('marks the primer seen once the Learn area is opened', () => {
    expect(hasPrimerBeenSeen()).toBe(false);
    render(<Learn />);
    expect(hasPrimerBeenSeen()).toBe(true);
  });

  it('groups the terms under the three glossary sections', () => {
    render(<Learn />);
    for (const label of ['Playing', 'Analysis & review', 'Puzzle themes']) {
      expect(
        screen.getByRole('heading', { level: 3, name: label }),
      ).toBeInTheDocument();
    }
  });

  it('lists every glossary term with its full definition', () => {
    render(<Learn />);
    const glossary = screen.getByRole('region', { name: /glossary/i });
    for (const entry of Object.values(GLOSSARY)) {
      expect(
        within(glossary).getByRole('heading', { name: entry.term }),
      ).toBeInTheDocument();
      expect(within(glossary).getByText(entry.long)).toBeInTheDocument();
    }
  });
});
