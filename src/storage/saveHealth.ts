/**
 * Save health (ticket 26, review finding #3). The persister continuously
 * writes the live match to storage; when a write fails (a full disk, a
 * QuotaExceededError, a revoked IndexedDB) play continues in memory and the
 * next reload silently drops progress. This monitor is the seam between the
 * write path and the UI: the persister reports each outcome, the app
 * subscribes, and a non-blocking banner can tell the player their progress
 * isn't being saved until a write lands again. A module singleton carries the
 * state across page navigation, since the persister is torn down when the Play
 * page unmounts but the warning must outlive it.
 */

export type SaveHealth = 'healthy' | 'failing';

/** Reports write outcomes; the slice the persister depends on. */
export interface SaveHealthReporter {
  /** A save succeeded: storage is healthy again. */
  reportSuccess(): void;
  /** A save failed: storage is not keeping the player's progress. */
  reportFailure(): void;
}

export interface SaveHealthMonitor extends SaveHealthReporter {
  /** The current health. */
  get(): SaveHealth;
  /** Subscribe to status changes; returns an unsubscribe function. */
  subscribe(listener: (status: SaveHealth) => void): () => void;
}

export function createSaveHealthMonitor(): SaveHealthMonitor {
  let status: SaveHealth = 'healthy';
  const listeners = new Set<(status: SaveHealth) => void>();

  function set(next: SaveHealth): void {
    if (next === status) {
      return;
    }
    status = next;
    for (const listener of listeners) {
      try {
        listener(status);
      } catch {
        // A listener must never break the write path that reports here.
      }
    }
  }

  return {
    get: () => status,
    reportSuccess: () => set('healthy'),
    reportFailure: () => set('failing'),
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}

let shared: SaveHealthMonitor | null = null;

/** The app-wide save-health monitor the persister and the banner share. */
export function getSaveHealthMonitor(): SaveHealthMonitor {
  if (!shared) {
    shared = createSaveHealthMonitor();
  }
  return shared;
}
