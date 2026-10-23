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
