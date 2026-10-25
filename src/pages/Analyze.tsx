/**
 * The Analyze area: the match history ledger (ticket 07) and the post-game
 * review (ticket 08). Opening a finished match shows every play and cube
 * decision scored and classified, browsable on the board with the engine's
 * alternatives; an unanalyzed match analyzes itself on open with visible
 * progress, and any single decision can be re-analyzed deeper on demand.
 *
 * This file orchestrates the ledger; the per-match view and its review, the
 * position viewer, the ledger controls, and the shared formatting live in
 * ./analyze/*.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  getMatchAnalyzer,
  type MatchAnalysis,
  type MatchAnalyzer,
} from '../analysis';
import { exportMat } from '../formats';
import {
  getMatchStorage,
  isStoredMatch,
  type MatchStorage,
  type StoredMatch,
} from '../storage';
import { BackupControls } from '../ui/BackupControls';
import {
  arrangeMatches,
  type LedgerSort,
  OverflowMenu,
  SORT_LABELS,
} from './analyze/ledger';
import { MatchView } from './analyze/MatchView';
import { PositionViewer } from './analyze/PositionViewer';
import {
  matchName,
  metaLine,
  resultLine,
  storedPlayers,
} from './analyze/reviewFormat';
import '../play/board.css';
import './analyze.css';

export interface AnalyzeProps {
  /** Injectable for tests; defaults to the shared IndexedDB storage. */
  storage?: MatchStorage;
  /** Injectable for tests; defaults to the shared analyzer. */
  analyzer?: MatchAnalyzer;
}

export function Analyze({
  storage: injectedStorage,
  analyzer: injectedAnalyzer,
}: AnalyzeProps = {}) {
  const [storage] = useState(() => injectedStorage ?? getMatchStorage());
  const [analyzer] = useState(() => injectedAnalyzer ?? getMatchAnalyzer());
  const [matches, setMatches] = useState<readonly StoredMatch[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<LedgerSort>('newest');
  const navigate = useNavigate();

  /** The ledger as shown: filtered by the search box, in the chosen order. */
  const shown = useMemo(
    () => (matches ? arrangeMatches(matches, query, sort) : matches),
    [matches, query, sort],
  );

  const reload = useCallback(() => {
    storage
      .list()
      .then((rows) => {
        setMatches(rows.filter((row) => isStoredMatch(row)));
        setFailed(false);
      })
      .catch(() => {
        setFailed(true);
      });
  }, [storage]);

  useEffect(() => {
    reload();
  }, [reload]);

  /** Keep the in-memory list in step with persisted analyses. */
  const onAnalyzed = useCallback((id: string, analysis: MatchAnalysis) => {
    setMatches(
      (rows) =>
        rows?.map((row) => (row.id === id ? { ...row, analysis } : row)) ??
        rows,
    );
  }, []);

  function remove(id: string): void {
    setConfirmId(null);
    if (openId === id) {
      setOpenId(null);
    }
    storage
      .delete(id)
      .then(reload)
      .catch(() => setNote('The match could not be deleted.'));
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

  function exportMatchMat(stored: StoredMatch): void {
    try {
      const text = exportMat(stored.record, storedPlayers(stored));
      const day = new Date().toISOString().slice(0, 10);
      download(
        `pg-backgammon-${day}-${stored.id.slice(0, 8)}.mat`,
        text,
        'text/plain',
      );
      setNote(null);
    } catch {
      setNote('The match could not be exported as .mat.');
    }
  }

  /** A fresh import changes the ledger: reload it and leave any open view. */
  function onImported(kind: 'backup' | 'mat'): void {
    if (kind === 'backup') {
      setOpenId(null);
      setConfirmId(null);
    }
    reload();
  }

  const open = openId
    ? (matches?.find((row) => row.id === openId) ?? null)
    : null;

  return (
    <section className="analyze-area">
      <h1>Analyze</h1>
      {note && (
        <p className="analyze-note" role="status">
          {note}
        </p>
      )}
      {open ? (
        <MatchView
          stored={open}
          storage={storage}
          analyzer={analyzer}
          onBack={() => setOpenId(null)}
          onAnalyzed={onAnalyzed}
        />
      ) : (
        <>
          {failed && (
            <p>
              Your match history could not be loaded. It may recover on reload;
              importing a backup also restores it.
            </p>
          )}
          {matches?.length === 0 && (
            <p>
              No matches yet — finish one in Play and its record will be waiting
              here.
            </p>
          )}
          {matches != null && matches.length > 0 && (
            <>
              <div className="ledger-toolbar">
                <input
                  type="search"
                  className="ledger-search"
                  aria-label="Filter matches"
                  placeholder="Filter by result, opponent or date"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                />
                <label className="ledger-sort">
                  <span className="ledger-sort-label">Sort</span>
                  <select
                    aria-label="Sort matches"
                    value={sort}
                    onChange={(event) =>
                      setSort(event.target.value as LedgerSort)
                    }
                  >
                    {SORT_LABELS.map((option) => (
                      <option key={option.id} value={option.id}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              {shown && shown.length === 0 ? (
                <p className="ledger-empty">
                  No matches match your filter. Clear it to see them all.
                </p>
              ) : (
                <ul className="match-history">
                  {shown?.map((stored) => (
                    <li key={stored.id} className="match-row">
                      <div className="match-summary">
                        <p className="match-result">
                          {resultLine(stored)}
                          {stored.status === 'in-progress' && (
                            <span className="live-badge">In progress</span>
                          )}
                        </p>
                        <p className="match-meta">{metaLine(stored)}</p>
                      </div>
                      <div className="match-actions">
                        {confirmId === stored.id ? (
                          <>
                            <button
                              type="button"
                              className="history-button history-button--danger"
                              onClick={() => remove(stored.id)}
                            >
                              Delete match
                            </button>
                            <button
                              type="button"
                              className="history-button"
                              onClick={() => setConfirmId(null)}
                            >
                              Keep
                            </button>
                          </>
                        ) : (
                          <>
                            {stored.status === 'finished' ? (
                              <button
                                type="button"
                                className="history-button history-button--primary"
                                onClick={() => setOpenId(stored.id)}
                              >
                                Open
                              </button>
                            ) : (
                              <button
                                type="button"
                                className="history-button history-button--primary"
                                onClick={() =>
                                  navigate('/', {
                                    state: { resumeMatchId: stored.id },
                                  })
                                }
                              >
                                Resume
                              </button>
                            )}
                            <OverflowMenu
                              label={`More actions for ${matchName(stored)}`}
                              actions={[
                                ...(stored.status === 'finished'
                                  ? [
                                      {
                                        label: 'Export .mat',
                                        onSelect: () => exportMatchMat(stored),
                                      },
                                    ]
                                  : []),
                                {
                                  label: 'Delete…',
                                  onSelect: () => setConfirmId(stored.id),
                                },
                              ]}
                            />
                          </>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </>
          )}
          <BackupControls storage={storage} onImported={onImported} />
          <PositionViewer analyzer={analyzer} />
        </>
      )}
    </section>
  );
}
