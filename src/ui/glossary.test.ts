import { describe, expect, it } from 'vitest';
import {
  GLOSSARY,
  GLOSSARY_CATEGORIES,
  type GlossaryTermId,
  glossaryEntry,
  hasGlossaryEntry,
} from './glossary';

/**
 * The jargon the UI puts on screen (ticket 32): every one of these must have a
 * player-facing definition, so a tooltip or the glossary page can explain it.
 * Sourced from GLOSSARY.md but written for players.
 */
const REQUIRED_TOOLTIP_TERMS: GlossaryTermId[] = [
  'pips',
  'equity',
  'emg',
  'pr',
  'error-rate',
  'luck',
  'crawford',
  'blunder',
  'error',
  'dubious',
  'two-ply',
  'priming',
  'blitzing',
  'holding-game',
  'bear-off',
  'cube-handling',
];

describe('glossary data', () => {
  it('defines every term the UI shows as jargon', () => {
    for (const id of REQUIRED_TOOLTIP_TERMS) {
      expect(GLOSSARY[id], `missing glossary entry: ${id}`).toBeDefined();
    }
  });

  it('gives every entry a term, a one-line tooltip, a fuller definition and a category', () => {
    for (const entry of Object.values(GLOSSARY)) {
      expect(entry.term.length).toBeGreaterThan(0);
      expect(entry.short.length).toBeGreaterThan(0);
      expect(entry.long.length).toBeGreaterThan(0);
      expect(GLOSSARY_CATEGORIES.map((c) => c.id)).toContain(entry.category);
    }
  });

  it('looks an entry up by id, with the id carried onto the entry', () => {
    const entry = glossaryEntry('crawford');
    expect(entry.id).toBe('crawford');
    expect(entry.term).toBe('Crawford game');
  });

  it('guards arbitrary strings so callers can wrap only known terms', () => {
    expect(hasGlossaryEntry('priming')).toBe(true);
    // A theme another ticket might add is not (yet) a glossary term.
    expect(hasGlossaryEntry('basics')).toBe(false);
  });
});
