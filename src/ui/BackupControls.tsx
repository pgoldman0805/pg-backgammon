/**
 * The history backup controls (ticket 20): export everything as one JSON
 * file, restore from such a file, or add a Jellyfish .mat match. One shared
 * component serves both homes — the Analyze ledger and the Settings Data
 * section — against whichever MatchStorage its host passes in.
 */

import { useState } from 'react';
import { importedStoredMatch, importMat } from '../formats';
import {
  exportBackup,
  importBackup,
  type MatchStorage,
  parseBackup,
  serializeBackup,
} from '../storage';
import './backup.css';

export type BackupImportKind = 'backup' | 'mat';

export interface BackupControlsProps {
  readonly storage: MatchStorage;
  /** Called after a successful import, so the host can reload what it shows. */
  readonly onImported?: (kind: BackupImportKind) => void;
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

export function BackupControls({ storage, onImported }: BackupControlsProps) {
  const [note, setNote] = useState<string | null>(null);

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
    reader.onload = async () => {
      try {
        const backup = parseBackup(String(reader.result));
        await importBackup(storage, backup);
        setNote('Backup imported — it replaced the previous history.');
        onImported?.('backup');
      } catch (error) {
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
        Export downloads every match as one JSON file. Import backup replaces
        your current history with the file's. Import match adds a Jellyfish .mat
        match to the history, where it analyzes like any other.
      </p>
    </div>
  );
}
