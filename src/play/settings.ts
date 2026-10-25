/**
 * Persisted Play-area settings: small on/off switches stored in localStorage
 * (like the theme), read once per mount and written on every change.
 */

import { useState } from 'react';

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
