/**
 * Tests for the Play page's pure helpers: which sides the local human
 * controls per play mode, and the setup rebuilt from a stored match config.
 */

import {
  commitMatchPlay,
  matchMovement,
  offerDouble,
  startMatch,
} from '../../rules';
import type { StoredMatch } from '../../storage';
import { scriptedDice } from '../../test/dice';
import {
  localSidesFor,
  setupFromConfig,
  statusText,
  storedMatchName,
} from './playFormat';

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

describe('storedMatchName', () => {
  it('names a remote match as played online', () => {
    const stored = { config: { mode: 'remote', length: 7 } } as StoredMatch;
    expect(storedMatchName(stored)).toBe('7-point match online');
  });
});

describe('statusText', () => {
  /** Black opens 3-1, then White doubles: Black is the one to respond. */
  function whiteDoubles() {
    let match = startMatch(7, scriptedDice(1, 3));
    match = matchMovement(match, 17, 3);
    match = matchMovement(match, 19, 1);
    return offerDouble(commitMatchPlay(match));
  }

  it('says Black is considering only against the computer', () => {
    const match = whiteDoubles();
    expect(statusText(match, false, 'computer')).toBe(
      'White doubles to 2. Black is considering…',
    );
    expect(statusText(match, false, 'hotseat')).toBe('White doubles to 2.');
    expect(statusText(match, false, 'remote')).toBe('White doubles to 2.');
  });
});
