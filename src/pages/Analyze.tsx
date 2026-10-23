/**
 * The Analyze area, part one (ticket 07): the match history ledger. Lists
 * every stored match, opens finished ones read-only (the record replayed
 * through the rules engine — the full review UI is ticket 08), resumes
 * in-progress ones in Play, deletes with confirmation, and backs the whole
 * history up as a JSON file (import replaces).
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Board } from '../play/Board';
import {
  type GameEndKind,
  type MatchGameRecord,
  type Player,
  replayMatch,
  replayMatchGame,
} from '../rules';
import {
  exportBackup,
  getMatchStorage,
  importBackup,
  isStoredMatch,
  type MatchStorage,
  parseBackup,
  type StoredMatch,
  serializeBackup,
} from '../storage';
import '../play/board.css';
import './analyze.css';

const KIND_TEXT: Record<GameEndKind, string> = {
  single: 'single game',
  gammon: 'gammon',
  backgammon: 'backgammon',
};

const DIFFICULTY_LABEL: Record<string, string> = {
  beginner: 'Beginner',
  casual: 'Casual',
  intermediate: 'Intermediate',
  expert: 'Expert',
  'world-class': 'World-class',
};

function name(player: Player): string {
  return player === 'white' ? 'White' : 'Black';
}

function other(player: Player): Player {
  return player === 'white' ? 'black' : 'white';
}

/** "5-point match vs Casual" / "5-point hot-seat match". */
function matchName(stored: StoredMatch): string {
  const length = `${stored.config.length}-point`;
  if (stored.config.mode === 'hotseat') {
    return `${length} hot-seat match`;
  }
  const difficulty =
    DIFFICULTY_LABEL[String(stored.config.difficulty)] ?? 'the computer';
  return `${length} match vs ${difficulty}`;
}

/** "White wins 7–3" for finished matches, the standing otherwise. */
function resultLine(stored: StoredMatch): string {
  if (stored.status === 'finished' && stored.winner) {
    const winner = stored.winner;
    return `${name(winner)} wins ${stored.score[winner]}–${stored.score[other(winner)]}`;
  }
  return `White ${stored.score.white} · Black ${stored.score.black}`;
}

function formatDate(ms: number): string {
  return new Date(ms).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function metaLine(stored: StoredMatch): string {
  const when =
    stored.status === 'finished'
      ? `finished ${formatDate(stored.updatedAt)}`
      : `last played ${formatDate(stored.updatedAt)}`;
  return `${matchName(stored)}, ${when}`;
}

/** One game of the record, phrased as the Play area's match summary. */
function gameLine(completed: MatchGameRecord): string {
  const { result } = completed;
  const how =
    result.end === 'pass'
      ? 'double passed'
      : result.end === 'resignation'
        ? `resigned ${KIND_TEXT[result.kind]}`
        : KIND_TEXT[result.kind];
  const crawford = completed.crawford ? ' (Crawford)' : '';
  return `${name(result.winner)} +${result.points} — ${how}${crawford}`;
}

/** A finished match replayed from its record alone, read-only. */
function MatchView({
  stored,
  onBack,
}: {
  stored: StoredMatch;
  onBack: () => void;
}) {
  const replay = useMemo(() => {
    try {
      return replayMatch(stored.record);
    } catch {
      return null;
    }
  }, [stored]);
  const final = useMemo(() => {
    const games = stored.record.games;
    const last = games[games.length - 1];
    if (!last) {
      return null;
    }
    try {
      return { board: replayMatchGame(last).board, record: last.game };
    } catch {
      return null;
    }
  }, [stored]);

  return (
    <article className="match-view">
      <button type="button" className="history-button" onClick={onBack}>
        Back to history
      </button>
      <h2 className="match-view-title">
        {replay?.winner
          ? `${name(replay.winner)} wins the match ${replay.score[replay.winner]}–${replay.score[other(replay.winner)]}`
          : 'This match record could not be replayed.'}
      </h2>
      <p className="match-view-meta">{metaLine(stored)}</p>
      {final && (
        <figure className="final-position" aria-label="Final position">
          <Board
            game={{
              board: final.board,
              turn: null,
              record: final.record,
              result: null,
            }}
            selected={null}
            onSelect={() => {}}
            onMove={() => {}}
            interactive={false}
          />
          <figcaption>How the last game ended.</figcaption>
        </figure>
      )}
      <ol className="match-games">
        {stored.record.games.map((completed, index) => (
          <li
            // biome-ignore lint/suspicious/noArrayIndexKey: games are an append-only sequence
            key={index}
          >
            {gameLine(completed)}
          </li>
        ))}
      </ol>
    </article>
  );
}

export interface AnalyzeProps {
  /** Injectable for tests; defaults to the shared IndexedDB storage. */
  storage?: MatchStorage;
}

export function Analyze({ storage: injectedStorage }: AnalyzeProps = {}) {
  const [storage] = useState(() => injectedStorage ?? getMatchStorage());
  const [matches, setMatches] = useState<readonly StoredMatch[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const navigate = useNavigate();

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

  async function exportHistory(): Promise<void> {
    try {
      const json = serializeBackup(await exportBackup(storage));
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      const day = new Date().toISOString().slice(0, 10);
      anchor.download = `pg-backgammon-history-${day}.json`;
      anchor.click();
      URL.revokeObjectURL(url);
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
        setOpenId(null);
        setConfirmId(null);
        setNote('Backup imported — it replaced the previous history.');
        reload();
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
        <MatchView stored={open} onBack={() => setOpenId(null)} />
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
            <ul className="match-history">
              {matches.map((stored) => (
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
                            className="history-button"
                            onClick={() => setOpenId(stored.id)}
                          >
                            Open
                          </button>
                        ) : (
                          <button
                            type="button"
                            className="history-button"
                            onClick={() =>
                              navigate('/', {
                                state: { resumeMatchId: stored.id },
                              })
                            }
                          >
                            Resume
                          </button>
                        )}
                        <button
                          type="button"
                          className="history-button history-button--quiet"
                          onClick={() => setConfirmId(stored.id)}
                        >
                          Delete…
                        </button>
                      </>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
          <div className="backup-controls">
            <button
              type="button"
              className="history-button"
              onClick={() => void exportHistory()}
            >
              Export history
            </button>
            <label className="history-button import-label">
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
            <p className="backup-hint">
              Export downloads every match as one JSON file. Import replaces
              your current history with the file's.
            </p>
          </div>
        </>
      )}
    </section>
  );
}
