/**
 * reviewFormat: the Analyze ledger's match naming.
 */

import { describe, expect, it } from 'vitest';
import { storedMatchFixture } from '../../storage/storageContract';
import { matchName } from './reviewFormat';

describe('matchName', () => {
  it('names a remote match "7-point match online"', () => {
    const stored = storedMatchFixture({
      config: { length: 7, mode: 'remote', localSide: 'black' },
    });
    expect(matchName(stored)).toBe('7-point match online');
  });

  it('keeps the vs-computer phrasing', () => {
    const stored = storedMatchFixture({
      config: { length: 5, mode: 'computer', difficulty: 'expert' },
    });
    expect(matchName(stored)).toMatch(/^5-point match vs /);
  });
});
