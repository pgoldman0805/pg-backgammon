/**
 * Persisted Play-area settings: small on/off switches stored in localStorage
 * (like the theme), read once per mount and written on every change.
 */

import { useState } from 'react';
import type { Difficulty } from '../engine';

export const AUTO_ROLL_RACES_KEY = 'pg-backgammon.auto-roll-races';
export const AUTO_FORCED_PLAYS_KEY = 'pg-backgammon.auto-forced-plays';
/**
 * Tutor mode's default for new matches (ticket 20): Play's setup card
 * initializes its toggle from this; the in-game toggle still rules the live
 * match and never writes back.
 */
export const TUTOR_DEFAULT_KEY = 'pg-backgammon.tutor-default';
/**
 * Whether the newcomer has seen the how-to-play primer (ticket 30). Its own
 * flag, deliberately independent of any first-run-defaults flag, so the
 * primer nudge can be surfaced and dismissed without touching other first-run
 * behaviour. Set the moment the Learn area is opened or the nudge dismissed.
 */
export const PRIMER_SEEN_KEY = 'pg-backgammon.primer-seen';

/**
 * First-run defaults (ticket 33): a brand-new user is started gently — the
 * Beginner opponent and a quick single game (a 1-point match) — instead of
 * the all-purpose Casual + 7-point. The flag below records that the user has
 * started a match or touched the pickers; from then on their own remembered
 * choice wins, so returning users are never nudged back to the novice setup.
 */
export const HAS_PLAYED_KEY = 'pg-backgammon.has-played-before';
export const DIFFICULTY_KEY = 'pg-backgammon.difficulty';
export const MATCH_LENGTH_KEY = 'pg-backgammon.match-length';

/** The gentle opening a first-time user sees before they choose otherwise. */
export const NOVICE_SETUP: { difficulty: Difficulty; length: number } = {
  difficulty: 'beginner',
  length: 1,
};

/** The fallback for a returning user with no (or stale) stored choice. */
export const RETURNING_FALLBACK: { difficulty: Difficulty; length: number } = {
  difficulty: 'casual',
  length: 7,
};

/** Whether the user has started a match or changed a Play setting before. */
export function hasPlayedBefore(): boolean {
  return getStoredSwitch(HAS_PLAYED_KEY, false);
}

/** The last opponent difficulty the user chose, or null if never chosen. */
export function getStoredDifficulty(): string | null {
  return localStorage.getItem(DIFFICULTY_KEY);
}

/** The last match length the user chose (1-25), or null if unset/invalid. */
export function getStoredLength(): number | null {
  const raw = localStorage.getItem(MATCH_LENGTH_KEY);
  const length = raw === null ? Number.NaN : Number(raw);
  return Number.isInteger(length) && length >= 1 && length <= 25
    ? length
    : null;
}

/**
 * Persist the user's explicit Play-setup choice and mark them as a returning
 * player. Called when a match is started or a picker is changed, so the next
 * visit opens on their own last choice rather than the novice defaults. The
 * three keys are written together so the flag and the values never diverge.
 */
export function rememberSetupChoice(difficulty: string, length: number): void {
  localStorage.setItem(DIFFICULTY_KEY, difficulty);
  localStorage.setItem(MATCH_LENGTH_KEY, String(length));
  localStorage.setItem(HAS_PLAYED_KEY, 'on');
}

/** The stored value of an on/off setting, or its default when unset. */
export function getStoredSwitch(key: string, defaultOn: boolean): boolean {
  const stored = localStorage.getItem(key);
  if (stored === 'on' || stored === 'off') {
    return stored === 'on';
  }
  return defaultOn;
}

/** A boolean setting persisted under `key`; `defaultOn` applies when unset. */
export function useStoredSwitch(
  key: string,
  defaultOn: boolean,
): [boolean, (on: boolean) => void] {
  const [on, setOn] = useState(() => getStoredSwitch(key, defaultOn));
  const update = (next: boolean) => {
    localStorage.setItem(key, next ? 'on' : 'off');
    setOn(next);
  };
  return [on, update];
}

/** Whether the how-to-play primer has been seen (ticket 30). */
export function hasPrimerBeenSeen(): boolean {
  return getStoredSwitch(PRIMER_SEEN_KEY, false);
}

/** Record that the primer has been seen, so the first-run nudge retires. */
export function markPrimerSeen(): void {
  localStorage.setItem(PRIMER_SEEN_KEY, 'on');
}
