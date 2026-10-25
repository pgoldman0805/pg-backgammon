/**
 * A finished match opened from the ledger: the header replayed from the
 * record, the self-starting analysis (with visible progress and a retry on
 * failure), and then the analyzed review — or, for a match with no unforced
 * decisions, the final position and the game list instead.
 */

import { useEffect, useMemo, useState } from 'react';
import {
  type AnalysisProgress,
  isMatchAnalysis,
  type MatchAnalysis,
  type MatchAnalyzer,
} from '../../analysis';
import { Board } from '../../play/Board';
import { opponent, replayMatch, replayMatchGame } from '../../rules';
import type { MatchStorage, StoredMatch } from '../../storage';
import { playerName } from '../../ui/format';
import { Review } from './Review';
import { gameLine, isVisible, metaLine, noop } from './reviewFormat';

/** A finished match: header from the record, then the analyzed review. */
export function MatchView({
  stored,
  storage,
  analyzer,
  onBack,
  onAnalyzed,
}: {
  stored: StoredMatch;
  storage: MatchStorage;
  analyzer: MatchAnalyzer;
  onBack: () => void;
  onAnalyzed: (id: string, analysis: MatchAnalysis) => void;
}) {
  const replay = useMemo(() => {
    try {
      return replayMatch(stored.record);
    } catch {
      return null;
    }
  }, [stored]);

  const [analysis, setAnalysis] = useState<MatchAnalysis | null>(() =>
    isMatchAnalysis(stored.analysis) ? stored.analysis : null,
  );
  const [progress, setProgress] = useState<AnalysisProgress | null>(null);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);

  // An unanalyzed match analyzes itself on open (user priority), persists
  // the result, and adopts any analysis another session persisted meanwhile.
  // biome-ignore lint/correctness/useExhaustiveDependencies: `attempt` is the deliberate retry trigger after a failure
  useEffect(() => {
    if (analysis || !replay) {
      return;
    }
    let cancelled = false;
    setFailed(false);
    setProgress(null);
    analyzer
      .analyzeMatch(stored.record, {
        priority: 'user',
        onProgress: (p) => {
          if (!cancelled) {
            setProgress(p);
          }
        },
      })
      .then(async (result) => {
        let final = result;
        try {
          const row = await storage.get(stored.id);
          if (row) {
            if (isMatchAnalysis(row.analysis)) {
              final = row.analysis;
            } else {
              await storage.put({ ...row, analysis: result });
            }
          }
        } catch {
          // Persistence is best effort; the review still renders.
        }
        if (!cancelled) {
          setAnalysis(final);
          onAnalyzed(stored.id, final);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setFailed(true);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [analysis, analyzer, stored, storage, replay, attempt, onAnalyzed]);

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

  const hasDecisions =
    analysis?.games.some((game) => game.decisions.some(isVisible)) ?? false;

  function deepenAnalysisState(id: string, refined: MatchAnalysis): void {
    setAnalysis(refined);
    onAnalyzed(id, refined);
  }

  return (
    <article className="match-view">
      <button type="button" className="history-button" onClick={onBack}>
        Back to history
      </button>
      <h2 className="match-view-title">
        {replay?.winner
          ? `${playerName(replay.winner)} wins the match ${replay.score[replay.winner]}–${replay.score[opponent(replay.winner)]}`
          : 'This match record could not be replayed.'}
      </h2>
      <p className="match-view-meta">{metaLine(stored)}</p>

      {replay && !analysis && !failed && (
        <div className="review-progress-block">
          <p role="status" className="review-progress">
            {progress
              ? `Analyzing game ${progress.game} of ${progress.games} — position ${progress.position} of ${progress.positions}…`
              : 'Analyzing the match…'}
          </p>
          <div className="review-progress-track" aria-hidden="true">
            <div
              className="review-progress-fill"
              style={{
                width: progress
                  ? `${Math.round((progress.position / Math.max(1, progress.positions)) * 100)}%`
                  : '4%',
              }}
            />
          </div>
        </div>
      )}

      {failed && (
        <div className="review-progress-block">
          <p>The analysis could not be completed.</p>
          <button
            type="button"
            className="history-button"
            onClick={() => setAttempt((n) => n + 1)}
          >
            Try again
          </button>
        </div>
      )}

      {analysis && hasDecisions && (
        <Review
          stored={stored}
          analysis={analysis}
          analyzer={analyzer}
          storage={storage}
          onAnalyzed={deepenAnalysisState}
        />
      )}

      {analysis && !hasDecisions && (
        <>
          <p className="detail-hint">
            Nothing to review — this match held no unforced decisions.
          </p>
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
                onSelect={noop}
                onMove={noop}
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
        </>
      )}
    </article>
  );
}
