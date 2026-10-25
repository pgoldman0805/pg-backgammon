/**
 * The history backup controls (ticket 20, made safe in ticket 27): export
 * everything as one JSON file, restore from such a file, or add a Jellyfish
 * .mat match. One shared component serves both homes — the Analyze ledger and
 * the Settings Data section — against whichever MatchStorage its host passes
 * in.
 *
 * A restore never fires on the file pick alone. Choosing a backup opens a
 * confirmation that names what the file holds and offers two explicit choices:
 * replace the current history with the file's, or merge the file in beside it.
 * Cancelling changes nothing, and the import itself is all-or-nothing, so a
 * wrong file can never half-wipe the history.
 */

import { useEffect, useId, useRef, useState } from 'react';
import { importedStoredMatch, importMat } from '../formats';
import {
  type BackupSummary,
  exportBackup,
  type HistoryBackup,
  type ImportMode,
  importBackup,
  type MatchStorage,
  parseBackup,
  serializeBackup,
  summarizeBackup,
} from '../storage';
import './backup.css';

export type BackupImportKind = 'backup' | 'mat';

export interface BackupControlsProps {
  readonly storage: MatchStorage;
  /** Called after a successful import, so the host can reload what it shows. */
  readonly onImported?: (kind: BackupImportKind) => void;
}

/** A parsed backup held back for the player to confirm before it is applied. */
interface PendingRestore {
  readonly backup: HistoryBackup;
  readonly summary: BackupSummary;
}

function download(name: string, text: string, type: string): void {
  const blob = new Blob([text], { type });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = name;
  anchor.click();
  URL.revokeObjectURL(url);
}

function newMatchId(): string {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `imported-${Date.now()}-${Math.floor(Math.random() * 1e9)}`;
}

/** "1 match" / "2 matches": a count with its noun pluralised. */
function count(n: number, singular: string, plural: string): string {
  return `${n} ${n === 1 ? singular : plural}`;
}

/** A plain sentence naming everything the chosen file carries. */
function contentsSentence(summary: BackupSummary): string {
  const matches = count(summary.matches, 'match', 'matches');
  const puzzles = count(summary.puzzles, 'puzzle', 'puzzles');
  const date = new Date(summary.exportedAt).toLocaleDateString();
  const progress = summary.hasPuzzleProgress
    ? ', plus your puzzle progress'
    : '';
  return `This file holds ${matches} and ${puzzles}${progress}, saved ${date}.`;
}

export function BackupControls({ storage, onImported }: BackupControlsProps) {
  const [note, setNote] = useState<string | null>(null);
  const [pending, setPending] = useState<PendingRestore | null>(null);
  const [busy, setBusy] = useState(false);
  const titleId = useId();
  const descId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);
  const restoreFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (pending) {
      restoreFocusRef.current = document.activeElement as HTMLElement | null;
      dialogRef.current?.focus();
    }
  }, [pending]);

  function cancelRestore(): void {
    setPending(null);
    const previous = restoreFocusRef.current;
    if (previous?.isConnected) {
      previous.focus();
    }
  }

  async function runRestore(mode: ImportMode): Promise<void> {
    if (!pending) {
      return;
    }
    setBusy(true);
    try {
      await importBackup(
        storage,
        pending.backup,
        undefined,
        undefined,
        undefined,
        {
          mode,
        },
      );
      setNote(
        mode === 'replace'
          ? 'Backup imported — it replaced the previous history.'
          : 'Backup merged — new matches and puzzles were added.',
      );
      setPending(null);
      onImported?.('backup');
    } catch {
      setNote('The backup could not be restored. Your history is unchanged.');
      setPending(null);
    } finally {
      setBusy(false);
    }
  }

  function trapTab(event: React.KeyboardEvent): void {
    const focusable =
      dialogRef.current?.querySelectorAll<HTMLElement>('button');
    if (!focusable || focusable.length === 0) {
      return;
    }
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    const active = document.activeElement;
    if (event.shiftKey && active === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && active === last) {
      event.preventDefault();
      first.focus();
    }
  }

  function onDialogKeyDown(event: React.KeyboardEvent): void {
    if (event.key === 'Escape') {
      event.stopPropagation();
      cancelRestore();
    } else if (event.key === 'Tab') {
      trapTab(event);
    }
  }

  async function exportHistory(): Promise<void> {
    try {
      const json = serializeBackup(await exportBackup(storage));
      const day = new Date().toISOString().slice(0, 10);
      download(`pg-backgammon-history-${day}.json`, json, 'application/json');
      setNote(null);
    } catch {
      setNote('The history could not be exported.');
    }
  }

  function importFile(file: File): void {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const backup = parseBackup(String(reader.result));
        setNote(null);
        setPending({ backup, summary: summarizeBackup(backup) });
      } catch (error) {
        setPending(null);
        setNote(
          error instanceof Error
            ? error.message
            : 'The backup could not be imported.',
        );
      }
    };
    reader.onerror = () => setNote('The file could not be read.');
    reader.readAsText(file);
  }

  function importMatFile(file: File): void {
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const imported = importMat(String(reader.result));
        const row = importedStoredMatch(imported, newMatchId(), Date.now());
        await storage.put(row);
        setNote('Match imported — open it to see the analysis.');
        onImported?.('mat');
      } catch (error) {
        setNote(
          `The .mat file could not be imported: ${
            error instanceof Error ? error.message : 'unreadable file'
          }`,
        );
      }
    };
    reader.onerror = () => setNote('The file could not be read.');
    reader.readAsText(file);
  }

  return (
    <div className="backup-controls">
      {note && (
        <p className="backup-note" role="status">
          {note}
        </p>
      )}
      <button
        type="button"
        className="backup-button"
        onClick={() => void exportHistory()}
      >
        Export history
      </button>
      <label className="backup-button import-label">
        Import backup…
        <input
          type="file"
          accept="application/json,.json"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) {
              importFile(file);
            }
            event.target.value = '';
          }}
        />
      </label>
      <label className="backup-button import-label">
        Import match (.mat)…
        <input
          type="file"
          accept=".mat,text/plain"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) {
              importMatFile(file);
            }
            event.target.value = '';
          }}
        />
      </label>
      <p className="backup-hint">
        Export downloads every match as one JSON file. Import backup restores
        from such a file — replacing or merging, your choice. Import match adds
        a Jellyfish .mat match to the history, where it analyzes like any other.
      </p>

      {pending && (
        // The backdrop is a visual scrim only; the choice is made with the
        // dialog's buttons or Escape, never by a stray click outside it.
        <div className="backup-confirm-backdrop">
          <div
            className="backup-confirm"
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            aria-describedby={descId}
            tabIndex={-1}
            ref={dialogRef}
            onKeyDown={onDialogKeyDown}
          >
            <h2 id={titleId} className="backup-confirm-title">
              Restore from this backup?
            </h2>
            <p id={descId} className="backup-confirm-counts">
              {contentsSentence(pending.summary)}
            </p>
            <p className="backup-confirm-choices">
              Replace swaps your current history for the file's. Merge keeps
              your history and adds only what the file has that you don't.
            </p>
            <div className="backup-confirm-actions">
              <button
                type="button"
                className="backup-button backup-button--danger"
                onClick={() => void runRestore('replace')}
                disabled={busy}
              >
                Replace history
              </button>
              <button
                type="button"
                className="backup-button"
                onClick={() => void runRestore('merge')}
                disabled={busy}
              >
                Merge into history
              </button>
              <button
                type="button"
                className="backup-button backup-button--quiet"
                onClick={cancelRestore}
                disabled={busy}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
