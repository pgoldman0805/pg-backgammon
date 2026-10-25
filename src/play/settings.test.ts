import { beforeEach, describe, expect, it } from 'vitest';
import {
  DIFFICULTY_KEY,
  getStoredDifficulty,
  getStoredLength,
  HAS_PLAYED_KEY,
  hasPlayedBefore,
  MATCH_LENGTH_KEY,
  rememberSetupChoice,
} from './settings';

beforeEach(() => {
  localStorage.clear();
});

describe('the first-run flag (ticket 33)', () => {
  it('reports a brand-new user as not having played before', () => {
    expect(hasPlayedBefore()).toBe(false);
  });

  it('reports a returning user once a choice has been remembered', () => {
    rememberSetupChoice('expert', 5);
    expect(hasPlayedBefore()).toBe(true);
  });
});

describe('the remembered Play setup choice (ticket 33)', () => {
  it('has no stored difficulty or length for a brand-new user', () => {
    expect(getStoredDifficulty()).toBeNull();
    expect(getStoredLength()).toBeNull();
  });

  it('round-trips the difficulty and length a returning user chose', () => {
    rememberSetupChoice('intermediate', 11);
    expect(getStoredDifficulty()).toBe('intermediate');
    expect(getStoredLength()).toBe(11);
  });

  it('writes all three keys together so the flag and the values never diverge', () => {
    rememberSetupChoice('beginner', 3);
    expect(localStorage.getItem(HAS_PLAYED_KEY)).toBe('on');
    expect(localStorage.getItem(DIFFICULTY_KEY)).toBe('beginner');
    expect(localStorage.getItem(MATCH_LENGTH_KEY)).toBe('3');
  });

  it('ignores a stored length outside the 1-25 range', () => {
    localStorage.setItem(MATCH_LENGTH_KEY, '40');
    expect(getStoredLength()).toBeNull();
    localStorage.setItem(MATCH_LENGTH_KEY, '0');
    expect(getStoredLength()).toBeNull();
    localStorage.setItem(MATCH_LENGTH_KEY, 'nonsense');
    expect(getStoredLength()).toBeNull();
  });
});
