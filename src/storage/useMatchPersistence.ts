/**
 * React wiring for match persistence on the Play page: keeps a persister
 * alive around the current store (surviving store replacement on resume,
 * since the identity lives in a ref) and surfaces the resumable matches
 * found in storage. Storage failures and corrupt rows degrade to a fresh
 * setup — never a crash.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  createMatchPersister,
  type MatchPersister,
  type MatchStoreLike,
  type PersistedIdentity,
} from './persist';
import { getSaveHealthMonitor } from './saveHealth';
import { isStoredMatch } from './snapshot';
import type { MatchConfig, MatchStorage, StoredMatch } from './types';

export interface MatchPersistence {
  /** Valid in-progress matches found in storage, newest first. */
  readonly resumable: readonly StoredMatch[];
  /** Persist the match about to start under a fresh id. */
  begin(config: MatchConfig): void;
  /** Continue persisting a stored match (resume) under its own id. */
  adopt(stored: StoredMatch): void;
}

export function useMatchPersistence(
  store: MatchStoreLike,
  storage: MatchStorage,
): MatchPersistence {
  const [resumable, setResumable] = useState<readonly StoredMatch[]>([]);
  const identityRef = useRef<PersistedIdentity | null>(null);
  const persisterRef = useRef<MatchPersister | null>(null);

  useEffect(() => {
    const persister = createMatchPersister({
      store,
      storage,
      identity: identityRef.current,
      // Surface write failures app-wide so the save-failure banner can warn
      // the player the moment their progress stops being saved (ticket 26).
      saveHealth: getSaveHealthMonitor(),
    });
    persisterRef.current = persister;
    return () => {
      persister.dispose();
      if (persisterRef.current === persister) {
        persisterRef.current = null;
      }
    };
  }, [store, storage]);

  useEffect(() => {
    let cancelled = false;
    storage
      .list()
      .then((rows) => {
        if (!cancelled) {
          setResumable(
            rows.filter(
              (row) => isStoredMatch(row) && row.status === 'in-progress',
            ),
          );
        }
      })
      .catch(() => {
        // Missing or broken storage means no resume offer, nothing more.
      });
    return () => {
      cancelled = true;
    };
  }, [storage]);

  const begin = useCallback((config: MatchConfig) => {
    identityRef.current = persisterRef.current?.begin(config) ?? null;
  }, []);

  const adopt = useCallback((stored: StoredMatch) => {
    identityRef.current = {
      id: stored.id,
      config: stored.config,
      createdAt: stored.createdAt,
    };
    persisterRef.current?.adopt(stored);
  }, []);

  return { resumable, begin, adopt };
}
