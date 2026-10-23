/**
 * Continuous persistence of the live match: observes a Play store
 * (subscribe/getState — never dispatching into it) and writes a debounced
 * snapshot to MatchStorage on every change, so a reload never loses more
 * than the quiet period. Pure observer by design: ticket 09 owns the store's
 * action set and this module must not care.
 */

import type { MatchState } from '../rules';
import { snapshotMatch } from './snapshot';
import type { MatchConfig, MatchStorage, StoredMatch } from './types';

/** The slice of the Play store the persister needs (structural, no import). */
export interface MatchStoreLike {
  getState(): { readonly match: MatchState | null };
  subscribe(listener: () => void): () => void;
}

/** Which stored row the live match belongs to. */
export interface PersistedIdentity {
  readonly id: string;
  readonly config: MatchConfig;
  readonly createdAt: number;
}

export interface MatchPersisterOptions {
  readonly store: MatchStoreLike;
  readonly storage: MatchStorage;
  /** Continue an identity across persister re-creation (reload, new store). */
  readonly identity?: PersistedIdentity | null;
  /** Quiet period before a change is written. Defaults to 250ms. */
  readonly debounceMs?: number;
  readonly now?: () => number;
  readonly newId?: () => string;
}

export interface MatchPersister {
  /** The identity saves currently go to, if any. */
  readonly identity: PersistedIdentity | null;
  /** Persist subsequent store states under a fresh match id. */
  begin(config: MatchConfig): PersistedIdentity;
  /** Continue persisting an existing stored match (resume), keeping its
   * createdAt and any fields this ticket does not know about. */
  adopt(stored: StoredMatch): void;
  /** Write any pending change now. Never rejects. */
  flush(): Promise<void>;
  dispose(): void;
}

function defaultId(): string {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `match-${Date.now()}-${Math.floor(Math.random() * 1e9)}`;
}

export function createMatchPersister(
  options: MatchPersisterOptions,
): MatchPersister {
  const { store, storage } = options;
  const debounceMs = options.debounceMs ?? 250;
  const now = options.now ?? Date.now;
  const newId = options.newId ?? defaultId;

  let identity: PersistedIdentity | null = options.identity ?? null;
  /** Fields adopted from an existing row, carried through saves untouched. */
  let carried: StoredMatch | null = null;
  /** The match present when begin() was called — a previous match, never
   * saved under the new identity. */
  let baseline: MatchState | null = null;
  let dirty = false;
  let disposed = false;
  let timer: ReturnType<typeof setTimeout> | null = null;
  /** Saves are chained so writes land in order. */
  let queue: Promise<void> = Promise.resolve();

  function save(): Promise<void> {
    queue = queue.then(async () => {
      const current = identity;
      const match = store.getState().match;
      if (!current || !match || match === baseline) {
        return;
      }
      dirty = false;
      const snapshot = snapshotMatch({
        id: current.id,
        config: current.config,
        match,
        createdAt: current.createdAt,
        updatedAt: now(),
      });
      const row: StoredMatch = carried ? { ...carried, ...snapshot } : snapshot;
      try {
        await storage.put(row);
      } catch {
        // Persistence must never break play; the next change retries.
        dirty = true;
      }
    });
    return queue;
  }

  function schedule(): void {
    if (disposed || !identity) {
      return;
    }
    const match = store.getState().match;
    if (!match || match === baseline) {
      return;
    }
    dirty = true;
    if (timer !== null) {
      clearTimeout(timer);
    }
    timer = setTimeout(() => {
      timer = null;
      void save();
    }, debounceMs);
  }

  async function flush(): Promise<void> {
    if (timer !== null) {
      clearTimeout(timer);
      timer = null;
    }
    if (dirty) {
      await save();
    } else {
      await queue;
    }
  }

  function onHide(): void {
    void flush();
  }

  function onVisibility(): void {
    if (document.visibilityState === 'hidden') {
      void flush();
    }
  }

  const unsubscribe = store.subscribe(schedule);
  if (typeof window !== 'undefined') {
    window.addEventListener('pagehide', onHide);
  }
  if (typeof document !== 'undefined') {
    document.addEventListener('visibilitychange', onVisibility);
  }

  // Recreated around a live store (resume): capture the current state too.
  if (identity) {
    schedule();
  }

  return {
    get identity() {
      return identity;
    },
    begin(config) {
      identity = { id: newId(), config, createdAt: now() };
      carried = null;
      baseline = store.getState().match;
      return identity;
    },
    adopt(stored) {
      identity = {
        id: stored.id,
        config: stored.config,
        createdAt: stored.createdAt,
      };
      carried = stored;
      baseline = null;
      schedule();
    },
    flush,
    dispose() {
      if (disposed) {
        return;
      }
      disposed = true;
      unsubscribe();
      if (typeof window !== 'undefined') {
        window.removeEventListener('pagehide', onHide);
      }
      if (typeof document !== 'undefined') {
        document.removeEventListener('visibilitychange', onVisibility);
      }
      if (timer !== null) {
        clearTimeout(timer);
        timer = null;
      }
      // One final write of anything pending; nothing new can arrive after.
      if (dirty) {
        void save();
      }
    },
  };
}
