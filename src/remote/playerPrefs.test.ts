/** Tests for the remembered display name and move-clock choice. */

import {
  readMoveSeconds,
  readPlayerName,
  writeMoveSeconds,
  writePlayerName,
} from './playerPrefs';
import { DEFAULT_MOVE_SECONDS } from './protocol';

beforeEach(() => {
  localStorage.clear();
});

describe('player name', () => {
  it('is empty until set, then remembered cleaned', () => {
    expect(readPlayerName()).toBe('');
    writePlayerName('  Alice  ');
    expect(readPlayerName()).toBe('Alice');
  });

  it('clears when written blank', () => {
    writePlayerName('Alice');
    writePlayerName('   ');
    expect(readPlayerName()).toBe('');
  });

  it('degrades to empty when storage throws', () => {
    const spy = vi
      .spyOn(Storage.prototype, 'getItem')
      .mockImplementation(() => {
        throw new Error('blocked');
      });
    expect(readPlayerName()).toBe('');
    spy.mockRestore();
  });
});

describe('move clock choice', () => {
  it('defaults to 30 seconds', () => {
    expect(readMoveSeconds()).toBe(DEFAULT_MOVE_SECONDS);
    expect(DEFAULT_MOVE_SECONDS).toBe(30);
  });

  it('remembers a preset, including off', () => {
    writeMoveSeconds(0);
    expect(readMoveSeconds()).toBe(0);
    writeMoveSeconds(120);
    expect(readMoveSeconds()).toBe(120);
  });

  it('falls back to the default for a value that is not a preset', () => {
    localStorage.setItem('pg-backgammon.moveSeconds', '17');
    expect(readMoveSeconds()).toBe(30);
    localStorage.setItem('pg-backgammon.moveSeconds', 'abc');
    expect(readMoveSeconds()).toBe(30);
  });
});
