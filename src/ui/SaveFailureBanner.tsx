/**
 * The save-failure banner (ticket 26, review finding #3). The persister writes
 * the live match to IndexedDB continuously; when a write fails — a full disk, a
 * QuotaExceededError, storage revoked — play carries on in memory and the next
 * reload silently drops everything. This banner watches the shared save-health
 * monitor and, the moment saving stops working, tells the player in plain terms
 * and offers an immediate backup export (the same export the Settings Data
 * section uses). It is non-blocking: a banner under the header, not a modal, so
 * the player can keep going. It clears itself once a write lands again.
 */

import { useEffect, useState, useSyncExternalStore } from 'react';
import {
  exportBackup,
  getMatchStorage,
  getSaveHealthMonitor,
  type MatchStorage,
  type SaveHealthMonitor,
  serializeBackup,
} from '../storage';
import './saveFailureBanner.css';

export interface SaveFailureBannerProps {
  /** Injectable for tests; defaults to the app-wide save-health monitor. */
  readonly monitor?: SaveHealthMonitor;
  /** Injectable for tests; defaults to the shared match storage. */
  readonly storage?: MatchStorage;
}

/** Download text as a file: the UI glue, distinct from the backup itself. */
function download(name: string, text: string, type: string): void {
  const blob = new Blob([text], { type });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = name;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function SaveFailureBanner({
  monitor = getSaveHealthMonitor(),
  storage = getMatchStorage(),
}: SaveFailureBannerProps = {}) {
  const status = useSyncExternalStore(monitor.subscribe, monitor.get);
  const [note, setNote] = useState<string | null>(null);

  // A fresh warning shouldn't carry the last recovery's note.
  useEffect(() => {
    if (status === 'healthy') {
      setNote(null);
    }
  }, [status]);

  if (status !== 'failing') {
    return null;
  }

  async function exportNow(): Promise<void> {
    try {
      const json = serializeBackup(await exportBackup(storage));
      const day = new Date().toISOString().slice(0, 10);
      download(`pg-backgammon-history-${day}.json`, json, 'application/json');
      setNote('Backup downloaded — your history is safe on this device.');
    } catch {
      setNote("The backup couldn't be exported. Try again.");
    }
  }

  return (
    <div className="save-failure-banner" role="alert">
      <div className="save-failure-copy">
        <span className="save-failure-lead">
          Your progress isn't being saved.
        </span>{' '}
        <span className="save-failure-detail">
          Export a backup now to keep your matches and puzzle progress.
        </span>
        {note && (
          <span className="save-failure-note" role="status">
            {note}
          </span>
        )}
      </div>
      <button
        type="button"
        className="save-failure-export"
        onClick={() => void exportNow()}
      >
        Export backup
      </button>
    </div>
  );
}
