/**
 * userSide: which colour of a stored match belongs to the user.
 */

import { describe, expect, it } from 'vitest';
import type { MatchConfig } from './types';
import { userSide } from './userSide';

describe('userSide', () => {
  it.each<[string, MatchConfig, 'white' | 'black' | null]>([
    [
      'computer',
      { length: 5, mode: 'computer', difficulty: 'expert' },
      'white',
    ],
    [
      'remote white',
      { length: 5, mode: 'remote', localSide: 'white' },
      'white',
    ],
    [
      'remote black',
      { length: 5, mode: 'remote', localSide: 'black' },
      'black',
    ],
    ['remote without localSide', { length: 5, mode: 'remote' }, null],
    [
      'remote with a bogus localSide',
      { length: 5, mode: 'remote', localSide: 'green' as never },
      null,
    ],
    ['hotseat', { length: 5, mode: 'hotseat' }, null],
    ['imported', { length: 5, mode: 'imported' }, null],
    ['unknown mode', { length: 5, mode: 'bogus' as never }, null],
  ])('%s', (_name, config, expected) => {
    expect(userSide(config)).toBe(expected);
  });
});
