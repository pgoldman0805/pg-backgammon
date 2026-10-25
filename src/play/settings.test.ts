import { beforeEach, describe, expect, it } from 'vitest';
import {
  DIFFICULTY_KEY,
  FIRST_RUN_TUTOR_MATCHES,
  getMatchesStarted,
  getStoredDifficulty,
  getStoredLength,
  HAS_PLAYED_KEY,
  hasPlayedBefore,
  initFirstRunTutorWindow,
  MATCH_LENGTH_KEY,
  MATCHES_STARTED_KEY,
  rememberMatchStarted,
  rememberSetupChoice,
  TUTOR_DEFAULT_KEY,
  tutorModeDefault,
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

describe('the first-run match counter (ticket 31)', () => {
  it('reports zero matches started for a brand-new user', () => {
    expect(getMatchesStarted()).toBe(0);
  });

  it('counts each started match', () => {
    rememberMatchStarted();
    expect(getMatchesStarted()).toBe(1);
    rememberMatchStarted();
    expect(getMatchesStarted()).toBe(2);
  });

  it('treats a corrupt counter as zero', () => {
    localStorage.setItem(MATCHES_STARTED_KEY, 'nonsense');
    expect(getMatchesStarted()).toBe(0);
    localStorage.setItem(MATCHES_STARTED_KEY, '-4');
    expect(getMatchesStarted()).toBe(0);
  });
});

describe("Tutor mode's first-matches default (ticket 31)", () => {
  it('opens on for a brand-new user with no saved preference', () => {
    expect(tutorModeDefault()).toBe(true);
  });

  it('stays on through the first few matches, then reverts to off', () => {
    for (let started = 0; started < FIRST_RUN_TUTOR_MATCHES; started += 1) {
      expect(tutorModeDefault()).toBe(true);
      rememberMatchStarted();
    }
    // Past the window, with still no saved preference, it falls back to off.
    expect(getMatchesStarted()).toBe(FIRST_RUN_TUTOR_MATCHES);
    expect(tutorModeDefault()).toBe(false);
  });

  it('honors an explicit on preference, even past the window', () => {
    localStorage.setItem(TUTOR_DEFAULT_KEY, 'on');
    for (let started = 0; started < FIRST_RUN_TUTOR_MATCHES + 2; started += 1) {
      rememberMatchStarted();
    }
    expect(tutorModeDefault()).toBe(true);
  });

  it('honors an explicit off preference inside the window', () => {
    // A user who deliberately turned the default off is never re-enabled.
    localStorage.setItem(TUTOR_DEFAULT_KEY, 'off');
    expect(getMatchesStarted()).toBe(0);
    expect(tutorModeDefault()).toBe(false);
  });
});

describe('the first-run bootstrap (ticket 31)', () => {
  it('seeds a brand-new user at zero, so their first matches open with Tutor on', () => {
    initFirstRunTutorWindow();
    expect(getMatchesStarted()).toBe(0);
    expect(tutorModeDefault()).toBe(true);
  });

  it('seeds a pre-existing player past the window, never force-enabling Tutor', () => {
    // A user who played before this feature shipped has the has-played flag
    // but no match counter yet.
    rememberSetupChoice('expert', 5);
    localStorage.removeItem(MATCHES_STARTED_KEY);
    expect(hasPlayedBefore()).toBe(true);

    initFirstRunTutorWindow();

    expect(getMatchesStarted()).toBe(FIRST_RUN_TUTOR_MATCHES);
    expect(tutorModeDefault()).toBe(false);
  });

  it('is idempotent: a second run leaves an existing counter untouched', () => {
    rememberMatchStarted();
    rememberMatchStarted();
    initFirstRunTutorWindow();
    expect(getMatchesStarted()).toBe(2);
  });

  it('respects a saved preference regardless of the seeded counter', () => {
    localStorage.setItem(TUTOR_DEFAULT_KEY, 'on');
    rememberSetupChoice('casual', 7);
    localStorage.removeItem(MATCHES_STARTED_KEY);

    initFirstRunTutorWindow();

    // The counter is seeded past the window, but the saved preference wins.
    expect(getMatchesStarted()).toBe(FIRST_RUN_TUTOR_MATCHES);
    expect(tutorModeDefault()).toBe(true);
  });
});
