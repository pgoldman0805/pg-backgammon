/**
 * Paste an XGID, see the position on the board (cube, score and dice
 * included), and analyze that single position on demand at user priority.
 */

import { useState } from 'react';
import type { MatchAnalyzer, PositionAnalysis } from '../../analysis';
import { type DecodedXgid, decodeXgid } from '../../formats';
import { Board } from '../../play/Board';
import { type DiceRoll, type GameState, opponent } from '../../rules';
import { lossText, playerName, signedEquityText } from '../../ui/format';
import { diceOf, noop } from './reviewFormat';

/** A loaded XGID as a read-only GameState for the app's Board. */
function viewerGame(loaded: DecodedXgid): GameState {
  const { board, onRoll } = loaded.position;
  const roll: DiceRoll | null = loaded.roll;
  return {
    board,
    turn: roll
      ? {
          player: onRoll,
          roll,
          startBoard: board,
          movements: [],
          remainingDice: diceOf(roll),
        }
      : null,
    record: {
      initialBoard: board,
      openingRolls: [],
      firstPlayer: onRoll,
      plays: [],
    },
    result: null,
  };
}

/** "White to play 3-1 · 7-point match · White 0 – Black 0". */
function viewerCaption(loaded: DecodedXgid): string {
  const { onRoll, match } = loaded.position;
  const action = loaded.pendingDouble
    ? `${playerName(onRoll)} doubles to ${(match?.cube?.value ?? 1) * 2} — ${playerName(opponent(onRoll))} to take or pass`
    : loaded.roll
      ? `${playerName(onRoll)} to play ${loaded.roll[0]}-${loaded.roll[1]}`
      : `${playerName(onRoll)} on roll`;
  const standing =
    match && match.matchLength > 0
      ? `${match.matchLength}-point match · White ${match.score.white} – Black ${match.score.black}${
          match.crawford ? ' · Crawford' : ''
        }`
      : 'Money game';
  return `${action} · ${standing}`;
}

/**
 * Paste an XGID, see the position on the board (cube, score and dice
 * included), and analyze that single position on demand at user priority.
 */
export function PositionViewer({ analyzer }: { analyzer: MatchAnalyzer }) {
  const [input, setInput] = useState('');
  const [loaded, setLoaded] = useState<DecodedXgid | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<PositionAnalysis | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [failed, setFailed] = useState(false);

  function load(): void {
    setAnalysis(null);
    setFailed(false);
    try {
      setLoaded(decodeXgid(input));
      setError(null);
    } catch (cause) {
      setLoaded(null);
      setError(
        cause instanceof Error ? cause.message : 'not a valid XGID string',
      );
    }
  }

  async function analyze(): Promise<void> {
    if (!loaded || analyzing) {
      return;
    }
    setAnalyzing(true);
    setFailed(false);
    try {
      setAnalysis(await analyzer.analyzePosition(loaded.position, loaded.roll));
    } catch {
      setFailed(true);
    } finally {
      setAnalyzing(false);
    }
  }

  return (
    <section className="position-viewer" aria-label="Position viewer">
      <h2 className="viewer-title">Position viewer</h2>
      <div className="viewer-form">
        <label className="viewer-label">
          Paste an XGID
          <input
            type="text"
            className="viewer-input"
            placeholder="XGID=-b----E-C---eE---c-e----B-:0:0:1:31:0:0:0:7:10"
            value={input}
            onChange={(event) => setInput(event.target.value)}
          />
        </label>
        <button type="button" className="history-button" onClick={load}>
          Load position
        </button>
      </div>
      {error && (
        <p className="analyze-note" role="status">
          {error}
        </p>
      )}
      {loaded && (
        <>
          <figure className="review-position" aria-label="Pasted position">
            <Board
              game={viewerGame(loaded)}
              selected={null}
              onSelect={noop}
              onMove={noop}
              cube={
                loaded.position.match?.cube
                  ? {
                      ...loaded.position.match.cube,
                      outOfPlay: loaded.position.match.crawford,
                    }
                  : null
              }
              interactive={false}
            />
            <figcaption>{viewerCaption(loaded)}</figcaption>
          </figure>
          <div className="detail-actions">
            <button
              type="button"
              className="history-button"
              disabled={analyzing}
              onClick={() => void analyze()}
            >
              {analyzing ? 'Analyzing…' : 'Analyze position'}
            </button>
            {failed && (
              <span className="detail-note">
                The position could not be analyzed — try again.
              </span>
            )}
          </div>
          {analysis?.kind === 'plays' &&
            (analysis.plays.length === 0 ? (
              <p className="detail-hint">No legal plays — a dance.</p>
            ) : (
              <ol className="alternatives" aria-label="Engine plays">
                {analysis.plays.slice(0, 5).map((ranked, index) => (
                  <li
                    key={ranked.moveText}
                    className="alternative-row alternative-row--static"
                  >
                    <span className="alternative-rank">{ranked.rank}</span>
                    <span className="alternative-text">{ranked.moveText}</span>
                    <span className="alternative-equity">
                      {signedEquityText(ranked.equity)}
                    </span>
                    <span className="alternative-loss">
                      {index === 0 ? '' : lossText(ranked.equityLoss)}
                    </span>
                    {index === 0 && <span className="review-chip">best</span>}
                  </li>
                ))}
              </ol>
            ))}
          {analysis?.kind === 'cube' && (
            <div className="cube-panel">
              <ol className="alternatives" aria-label="Cube equities">
                {analysis.cube.options.map((option) => (
                  <li
                    key={option.action}
                    className="alternative-row alternative-row--static"
                  >
                    <span className="alternative-text">{option.action}</span>
                    <span className="alternative-equity">
                      {signedEquityText(option.equity)}
                    </span>
                  </li>
                ))}
              </ol>
              <p className="cube-proper">
                Engine: {analysis.cube.properAction}
              </p>
            </div>
          )}
        </>
      )}
    </section>
  );
}
