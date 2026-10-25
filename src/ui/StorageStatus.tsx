/**
 * The storage status row in Settings (ticket 26, review finding #1). Shows
 * whether the browser is keeping the app's data durable — so a week away
 * doesn't silently evict every match — and how much space the history is
 * using. Reads the StorageManager API through injectable readers (defaulting
 * to the real ones) and degrades quietly to "Unavailable" with no figure
 * where the API can't tell us, so it stays honest rather than reassuring.
 */

import { useEffect, useState } from 'react';
import {
  estimateStorage,
  type PersistenceState,
  persistedState,
  type StorageUsage,
} from '../storage';
import { formatBytes } from './format';
import './storageStatus.css';

export interface StorageStatusProps {
  /** Injectable for tests; defaults to the live StorageManager reader. */
  readonly readPersistence?: () => Promise<PersistenceState>;
  /** Injectable for tests; defaults to the live StorageManager reader. */
  readonly readUsage?: () => Promise<StorageUsage | null>;
}

const STATE_LABEL: Record<PersistenceState, string> = {
  persisted: 'On',
  'not-persisted': 'Off',
  unsupported: 'Unavailable',
};

const STATE_HINT: Record<PersistenceState, string> = {
  persisted:
    'This browser keeps your matches and progress even when space runs low.',
  'not-persisted':
    'This browser may clear your matches and progress to reclaim space. Export a backup to keep a copy.',
  unsupported:
    "This browser can't tell whether your data is protected from being cleared.",
};

export function StorageStatus({
  readPersistence = () => persistedState(),
  readUsage = () => estimateStorage(),
}: StorageStatusProps = {}) {
  const [state, setState] = useState<PersistenceState | null>(null);
  const [usage, setUsage] = useState<StorageUsage | null>(null);

  // Read once on mount: the readers are inline closures, re-reading on their
  // identity change is neither wanted nor meaningful.
  // biome-ignore lint/correctness/useExhaustiveDependencies: read once at mount
  useEffect(() => {
    let live = true;
    void readPersistence().then((value) => {
      if (live) {
        setState(value);
      }
    });
    void readUsage().then((value) => {
      if (live) {
        setUsage(value);
      }
    });
    return () => {
      live = false;
    };
  }, []);

  if (state === null) {
    return null;
  }

  const fraction =
    usage && usage.quota > 0 ? Math.min(usage.usage / usage.quota, 1) : 0;

  return (
    <div className="storage-status">
      <div className="storage-status-head">
        <span className="storage-status-name">Durable storage</span>
        <span className={`storage-badge storage-badge--${state}`}>
          {STATE_LABEL[state]}
        </span>
      </div>
      <p className="storage-status-hint">{STATE_HINT[state]}</p>

      {usage && (
        <div className="storage-usage">
          <div className="storage-usage-line">
            <span className="storage-usage-label">Space used</span>
            <span className="storage-usage-figure">
              {formatBytes(usage.usage)} of {formatBytes(usage.quota)}
            </span>
          </div>
          {/* biome-ignore lint/a11y/useSemanticElements: a native <meter> can't carry the styled fill element and renders inconsistently across browsers */}
          <div
            className="storage-meter"
            role="meter"
            aria-label="Space used"
            aria-valuemin={0}
            aria-valuemax={usage.quota}
            aria-valuenow={usage.usage}
          >
            <span
              className="storage-meter-fill"
              style={{ width: `${(fraction * 100).toFixed(1)}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
