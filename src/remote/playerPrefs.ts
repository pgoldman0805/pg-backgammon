/**
 * The two remote-play choices a device remembers: the display name and the
 * move clock offered when creating a game. Best-effort like `seats.ts`:
 * blocked storage degrades to the defaults and never throws.
 */

import { sanitizeName } from './names';
import { DEFAULT_MOVE_SECONDS, MOVE_SECONDS_PRESETS } from './protocol';

const NAME_KEY = 'pg-backgammon.playerName';
const MOVE_SECONDS_KEY = 'pg-backgammon.moveSeconds';

export function readPlayerName(): string {
  try {
    return sanitizeName(localStorage.getItem(NAME_KEY)) ?? '';
  } catch {
    return '';
  }
}

/** Remember the cleaned name; a blank one forgets it. */
export function writePlayerName(name: string): void {
  const cleaned = sanitizeName(name);
  try {
    if (cleaned) {
      localStorage.setItem(NAME_KEY, cleaned);
    } else {
      localStorage.removeItem(NAME_KEY);
    }
  } catch {
    // Ignore: a blocked/full localStorage must never break the page.
  }
}

export function readMoveSeconds(): number {
  try {
    const value = Number(localStorage.getItem(MOVE_SECONDS_KEY));
    const stored = localStorage.getItem(MOVE_SECONDS_KEY);
    return stored !== null &&
      (MOVE_SECONDS_PRESETS as readonly number[]).includes(value)
      ? value
      : DEFAULT_MOVE_SECONDS;
  } catch {
    return DEFAULT_MOVE_SECONDS;
  }
}

export function writeMoveSeconds(seconds: number): void {
  try {
    localStorage.setItem(MOVE_SECONDS_KEY, String(seconds));
  } catch {
    // Ignore.
  }
}
