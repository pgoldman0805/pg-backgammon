/**
 * Tests for the Play page's pure helpers: which sides the local human
 * controls per play mode, and the setup rebuilt from a stored match config.
 */

import { localSidesFor, setupFromConfig } from './playFormat';

describe('localSidesFor', () => {
  it.each([
    ['computer', null, ['white']],
    ['computer', 'black', ['white']],
    ['hotseat', null, ['white', 'black']],
    ['remote', 'white', ['white']],
    ['remote', 'black', ['black']],
    ['remote', null, []],
  ] as const)('%s with local side %s controls %j', (mode, side, expected) => {
    expect(localSidesFor(mode, side)).toEqual(expected);
  });
});

describe('setupFromConfig', () => {
  it('maps a remote config to remote mode', () => {
    expect(setupFromConfig({ mode: 'remote', length: 7 }).mode).toBe('remote');
  });

  it('collapses an imported match to computer', () => {
    expect(setupFromConfig({ mode: 'imported', length: 7 }).mode).toBe(
      'computer',
    );
  });
});
