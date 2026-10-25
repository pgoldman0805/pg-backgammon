import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { GLOSSARY } from '../ui/glossary';
import { Learn } from './Learn';

describe('Learn page', () => {
  it('is titled Learn and introduces the glossary', () => {
    render(<Learn />);
    expect(
      screen.getByRole('heading', { level: 1, name: 'Learn' }),
    ).toBeInTheDocument();
  });

  it('groups the terms under the three glossary sections', () => {
    render(<Learn />);
    for (const label of ['Playing', 'Analysis & review', 'Puzzle themes']) {
      expect(
        screen.getByRole('heading', { level: 2, name: label }),
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
