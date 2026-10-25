/**
 * A synchronous localStorage signal for the live match (ticket 47). Two
 * concerns, both storage-backed so they survive an unprompted reload:
 *
 *  - a *flag* ("a match is in progress right now") the PWA layer reads to
 *    decide whether a service-worker update may reload the page or must defer
 *    until the match is over; and
 *  - a *mirror* of the in-progress snapshot, written synchronously when the
 *    page is hidden. The IndexedDB save is debounced and async, so a reload
 *    inside the quiet period would otherwise clip the last move; the mirror is
 *    reconciled back into storage on the next load.
 *
 * Everything is best-effort: a blocked or absent localStorage degrades to "no
 * live match" and never throws into the app.
 */

import { isStoredMatch } from './snapshot';
import type { MatchStorage, StoredMatch } from './types';

const FLAG_KEY = 'pg-backgammon.live-match';
const MIRROR_KEY = 'pg-backgammon.live-match-mirror';

/** Same-tab subscribers (localStorage's own `storage` event is cross-tab only). */
const listeners = new Set<() => void>();

function safeGet(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function safeSet(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {
    // Ignore: a blocked/full localStorage must never break play.
  }
}

function safeRemove(key: string): void {
  try {
    localStorage.removeItem(key);
  } catch {
    // Ignore.
  }
}

function notify(): void {
  for (const listener of [...listeners]) {
    listener();
  }
}

/** Is a match currently in progress in this session? */
export function isLiveMatchInProgress(): boolean {
  return safeGet(FLAG_KEY) === '1';
}

/** Set or clear the in-progress flag, notifying same-tab subscribers on change. */
export function setLiveMatchActive(active: boolean): void {
  const changed = isLiveMatchInProgress() !== active;
  if (active) {
    safeSet(FLAG_KEY, '1');
  } else {
    safeRemove(FLAG_KEY);
  }
  if (changed) {
    notify();
  }
}

/** Mirror the current in-progress snapshot synchronously (called on hide). */
export function mirrorLiveMatch(row: StoredMatch): void {
  safeSet(MIRROR_KEY, JSON.stringify(row));
}

/** The mirrored snapshot, or null when absent or not a valid stored match. */
export function readLiveMatchMirror(): StoredMatch | null {
  const raw = safeGet(MIRROR_KEY);
  if (!raw) {
    return null;
  }
  try {
    const parsed = JSON.parse(raw);
    return isStoredMatch(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

/** Drop the mirror (match finished, or after it has been reconciled). */
export function clearLiveMatchMirror(): void {
  safeRemove(MIRROR_KEY);
}

/** Watch for flag changes within this tab; returns an unsubscribe. */
export function subscribeLiveMatch(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/**
 * Fold a hide-time mirror back into storage on load: if the mirror holds an
 * in-progress match newer than (or missing from) storage, persist it — this is
 * the move that an unload within the save debounce would otherwise have lost.
 * Always clears the mirror afterwards. Best-effort; never throws.
 */
export async function reconcileLiveMatchMirror(
  storage: MatchStorage,
): Promise<void> {
  const mirror = readLiveMatchMirror();
  if (!mirror) {
    return;
  }
  try {
    if (mirror.status === 'in-progress') {
      const existing = await storage.get(mirror.id);
      if (!existing || mirror.updatedAt > existing.updatedAt) {
        await storage.put(mirror);
      }
    }
  } catch {
    // Best-effort recovery; a storage failure here must not block load.
  } finally {
    clearLiveMatchMirror();
  }
}
