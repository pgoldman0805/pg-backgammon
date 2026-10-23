/**
 * The Analyze area: the match history ledger (ticket 07) and the post-game
 * review (ticket 08). Opening a finished match shows every play and cube
 * decision scored and classified, browsable on the board with the engine's
 * alternatives; an unanalyzed match analyzes itself on open with visible
 * progress, and any single decision can be re-analyzed deeper on demand.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  type AnalysisProgress,
  type AnalyzedCube,
  type AnalyzedDecision,
  type AnalyzedPlay,
  getMatchAnalyzer,
  isMatchAnalysis,
  type MatchAnalysis,
  type MatchAnalyzer,
  matchStandings,
  type PlayAlternative,
  type PlayerSummary,
  type PositionAnalysis,
  walkGame,
} from '../analysis';
import {
  CopyXgidButton,
  type DecodedXgid,
  decodeXgid,
  encodeXgid,
  exportMat,
  importedStoredMatch,
  importMat,
  type MatPlayers,
} from '../formats';
import { Board } from '../play/Board';
import {
  applyMovement,
  type DiceRoll,
  type Die,
  type GameEndKind,
  type GameState,
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

/** The player names an imported match carries in its config, if any. */
function storedPlayers(stored: StoredMatch): MatPlayers | undefined {
  const players = stored.config.players;
  if (
    typeof players === 'object' &&
    players !== null &&
    typeof (players as MatPlayers).white === 'string' &&
    typeof (players as MatPlayers).black === 'string'
  ) {
    return players as MatPlayers;
  }
  return undefined;
}

/** "5-point match vs Casual" / "5-point hot-seat match". */
function matchName(stored: StoredMatch): string {
  const length = `${stored.config.length}-point`;
  if (stored.config.mode === 'imported') {
    const players = storedPlayers(stored);
    return `${length} imported match${
      players ? ` (${players.white} vs ${players.black})` : ''
    }`;
  }
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

/* ------------------------------------------------------------------ */
/* Review formatting                                                    */
/* ------------------------------------------------------------------ */

/** Error rate for display: thousandths of a point per decision. */
function rateText(summary: PlayerSummary): string {
  return (summary.errorRate * 1000).toFixed(1);
}

function countsText(summary: PlayerSummary): string {
  const part = (count: number, word: string) =>
    `${count} ${word}${count === 1 ? '' : 's'}`;
  return `${part(summary.blunders, 'blunder')} · ${part(summary.errors, 'error')} · ${summary.dubious} dubious`;
}

/** A signed EMG equity, minus sign included. */
function equityText(value: number): string {
  return `${value < 0 ? '−' : '+'}${Math.abs(value).toFixed(3)}`;
}

/** An equity loss for the lists: a dash when nothing was lost. */
function lossText(loss: number): string {
  return loss >= 0.0005 ? `−${loss.toFixed(3)}` : '–';
}

const CLASSIFICATION_TEXT = {
  blunder: 'Blunder',
  error: 'Error',
  dubious: 'Dubious',
  ok: '',
} as const;

const CUBE_ERROR_TEXT = {
  'missed-double': 'Missed double',
  'wrong-double': 'Wrong double',
  'wrong-take': 'Wrong take',
  'wrong-pass': 'Wrong pass',
} as const;

function rollText(roll: AnalyzedPlay['roll']): string {
  return `${roll[0]}-${roll[1]}`;
}

/** The short action text of a decision, for list rows and headers. */
function decisionText(decision: AnalyzedDecision): string {
  if (decision.kind === 'play') {
    return decision.moveText;
  }
  switch (decision.action) {
    case 'double':
      return `Doubles to ${decision.cubeValue * 2}`;
    case 'take':
      return 'Takes';
    case 'pass':
      return 'Passes';
    case 'no-double':
      return 'No double';
  }
}

/** The accessible name of a decision row. */
function decisionLabel(decision: AnalyzedDecision): string {
  const player = name(decision.player);
  if (decision.kind === 'play') {
    return `${player} plays ${rollText(decision.roll)}: ${decision.moveText}`;
  }
  switch (decision.action) {
    case 'double':
      return `${player} doubles to ${decision.cubeValue * 2}`;
    case 'take':
      return `${player} takes the double`;
    case 'pass':
      return `${player} passes the double`;
    case 'no-double':
      return `${player} holds the cube`;
  }
}

/** The detail panel's headline for a decision. */
function decisionHeadline(decision: AnalyzedDecision): string {
  const player = name(decision.player);
  if (decision.kind === 'play') {
    return `${player} played ${decision.moveText}`;
  }
  switch (decision.action) {
    case 'double':
      return `${player} doubles to ${decision.cubeValue * 2}`;
    case 'take':
      return `${player} takes the double`;
    case 'pass':
      return `${player} passes the double`;
    case 'no-double':
      return `${player} holds the cube`;
  }
}

/** The verdict line under the headline. */
function verdictText(decision: AnalyzedDecision): string {
  if (decision.kind === 'play') {
    if (decision.rank === 1) {
      return 'The engine’s best play.';
    }
    if (decision.equityLoss < 0.0005) {
      return 'As good as the best — no equity lost.';
    }
    return `Lost ${decision.equityLoss.toFixed(3)} — ${CLASSIFICATION_TEXT[decision.classification] || 'small'}.`;
  }
  if (decision.error) {
    return `${CUBE_ERROR_TEXT[decision.error]} — lost ${decision.equityLoss.toFixed(3)}${
      decision.classification === 'ok'
        ? ''
        : ` (${CLASSIFICATION_TEXT[decision.classification].toLowerCase()})`
    }.`;
  }
  return 'Correct.';
}

/** Hide quiet, correct cube holds from the list (they still count). */
function isVisible(decision: AnalyzedDecision): boolean {
  return !(
    decision.kind === 'cube' &&
    decision.action === 'no-double' &&
    decision.classification === 'ok'
  );
}

interface DecisionRef {
  readonly game: number;
  readonly index: number;
}

function sameRef(a: DecisionRef | null, b: DecisionRef): boolean {
  return a !== null && a.game === b.game && a.index === b.index;
}

function diceOf(roll: AnalyzedPlay['roll']): Die[] {
  return roll[0] === roll[1]
    ? [roll[0], roll[0], roll[0], roll[0]]
    : [roll[0], roll[1]];
}

const noop = () => {};

/* ------------------------------------------------------------------ */
/* Review components                                                    */
/* ------------------------------------------------------------------ */

function ClassificationBadge({ decision }: { decision: AnalyzedDecision }) {
  if (decision.classification === 'ok') {
    return null;
  }
  return (
    <span className={`review-badge review-badge--${decision.classification}`}>
      {CLASSIFICATION_TEXT[decision.classification]}
    </span>
  );
}

function DecisionRow({
  decision,
  selected,
  onSelect,
}: {
  decision: AnalyzedDecision;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <li>
      <button
        type="button"
        className="decision-row"
        aria-label={decisionLabel(decision)}
        aria-current={selected || undefined}
        onClick={onSelect}
      >
        <span
          className={`chip-swatch chip-swatch--${decision.player}`}
          aria-hidden="true"
        />
        <span className="decision-tag">
          {decision.kind === 'play' ? rollText(decision.roll) : 'cube'}
        </span>
        <span className="decision-text">{decisionText(decision)}</span>
        <span
          className={`decision-loss decision-loss--${decision.classification}`}
        >
          {lossText(decision.equityLoss)}
        </span>
        <ClassificationBadge decision={decision} />
      </button>
    </li>
  );
}

function AlternativesPanel({
  play,
  shown,
  pinned,
  onHover,
  onPin,
}: {
  play: AnalyzedPlay;
  /** The alternative currently on the board (hovered or pinned). */
  shown: PlayAlternative | null;
  pinned: PlayAlternative | null;
  onHover: (alternative: PlayAlternative | null) => void;
  onPin: (alternative: PlayAlternative | null) => void;
}) {
  return (
    <ol className="alternatives" aria-label="Engine alternatives">
      {play.alternatives.map((alternative, index) => {
        const isBest = index === 0;
        // The played play keeps its true rank even when it sits appended
        // beyond the engine's top candidates.
        const rank = alternative.played ? play.rank : index + 1;
        const active = shown?.moveText === alternative.moveText;
        return (
          <li key={alternative.moveText}>
            <button
              type="button"
              className={`alternative-row ${active ? 'alternative-row--shown' : ''}`}
              onClick={() =>
                onPin(
                  pinned?.moveText === alternative.moveText
                    ? null
                    : alternative,
                )
              }
              onMouseEnter={() => onHover(alternative)}
              onMouseLeave={() => onHover(null)}
              onFocus={() => onHover(alternative)}
              onBlur={() => onHover(null)}
            >
              <span className="alternative-rank">{rank}</span>
              <span className="alternative-text">{alternative.moveText}</span>
              <span className="alternative-equity">
                {equityText(alternative.equity)}
              </span>
              <span className="alternative-loss">
                {isBest ? '' : lossText(alternative.equityLoss)}
              </span>
              {isBest && <span className="review-chip">best</span>}
              {alternative.played && (
                <span className="review-chip review-chip--played">played</span>
              )}
            </button>
          </li>
        );
      })}
    </ol>
  );
}

function CubePanel({ decision }: { decision: AnalyzedCube }) {
  const rows = [
    { action: 'No double', equity: decision.noDoubleEquity },
    { action: 'Double, take', equity: decision.doubleTakeEquity },
    { action: 'Double, pass', equity: decision.doublePassEquity },
  ];
  return (
    <div className="cube-panel">
      <ol className="alternatives" aria-label="Cube equities">
        {rows.map((row) => (
          <li
            key={row.action}
            className="alternative-row alternative-row--static"
          >
            <span className="alternative-text">{row.action}</span>
            <span className="alternative-equity">{equityText(row.equity)}</span>
          </li>
        ))}
      </ol>
      <p className="cube-proper">Engine: {decision.properAction}</p>
    </div>
  );
}

/** The analyzed review of a finished match. */
function Review({
  stored,
  analysis,
  analyzer,
  storage,
  onAnalyzed,
}: {
  stored: StoredMatch;
  analysis: MatchAnalysis;
  analyzer: MatchAnalyzer;
  storage: MatchStorage;
  onAnalyzed: (id: string, analysis: MatchAnalysis) => void;
}) {
  const record = stored.record;
  const [selected, setSelected] = useState<DecisionRef | null>(null);
  const [pinned, setPinned] = useState<PlayAlternative | null>(null);
  const [hovered, setHovered] = useState<PlayAlternative | null>(null);
  const [deepening, setDeepening] = useState(false);
  const [deepenNote, setDeepenNote] = useState<string | null>(null);
  const preview = hovered ?? pinned;

  /** Visible decisions per game, each with its original index. */
  const visible = useMemo(
    () =>
      analysis.games.map((game) =>
        game.decisions
          .map((decision, index) => ({ decision, index }))
          .filter(({ decision }) => isVisible(decision)),
      ),
    [analysis],
  );

  /** All visible decisions flattened, for stepping. */
  const sequence = useMemo(
    () =>
      visible.flatMap((rows, game) =>
        rows.map(({ index }) => ({ game, index })),
      ),
    [visible],
  );

  // The first decision is open by default; selection survives re-analysis.
  useEffect(() => {
    if (!selected && sequence.length > 0) {
      setSelected(sequence[0]);
    }
  }, [selected, sequence]);

  const gameIndex = selected?.game ?? 0;
  const decision: AnalyzedDecision | null = selected
    ? (analysis.games[selected.game]?.decisions[selected.index] ?? null)
    : null;

  const standings = useMemo(() => matchStandings(record), [record]);
  const moments = useMemo(
    () =>
      record.games[gameIndex] && standings[gameIndex]
        ? walkGame(record.games[gameIndex], standings[gameIndex])
        : [],
    [record, standings, gameIndex],
  );
  const moment = useMemo(() => {
    if (!decision) {
      return null;
    }
    return (
      moments.find((m) =>
        decision.kind === 'play'
          ? m.kind === 'play' && m.playIndex === decision.playIndex
          : m.kind !== 'play' && m.playIndex === decision.playIndex,
      ) ?? null
    );
  }, [decision, moments]);

  /** The XGID of the position before the selected decision (ticket 10). */
  const xgid = useMemo(() => {
    if (!moment || !decision) {
      return null;
    }
    if (moment.kind === 'play') {
      return encodeXgid(
        { board: moment.board, onRoll: moment.player, match: moment.context },
        moment.roll,
      );
    }
    const onRoll =
      moment.kind === 'cube-action' ? moment.doubler : moment.player;
    const pendingDouble =
      decision.kind === 'cube' &&
      (decision.action === 'take' || decision.action === 'pass');
    return encodeXgid(
      { board: moment.board, onRoll, match: moment.context },
      undefined,
      { pendingDouble },
    );
  }, [moment, decision]);

  /** The board shown: the position before the decision, or a preview after. */
  const boardGame: GameState | null = useMemo(() => {
    if (!moment) {
      return null;
    }
    const record_: GameState['record'] = {
      initialBoard: moment.board,
      openingRolls: [],
      firstPlayer: moment.kind === 'play' ? moment.player : 'white',
      plays: [],
    };
    if (moment.kind === 'play') {
      const movements = preview ? preview.movements : [];
      const board = movements.reduce(
        (b, movement) => applyMovement(b, moment.player, movement),
        moment.board,
      );
      return {
        board,
        turn: {
          player: moment.player,
          roll: moment.roll,
          startBoard: moment.board,
          movements,
          remainingDice: preview ? [] : diceOf(moment.roll),
        },
        record: record_,
        result: null,
      };
    }
    return { board: moment.board, turn: null, record: record_, result: null };
  }, [moment, preview]);

  const caption = !moment
    ? ''
    : preview
      ? `After ${preview.moveText}.`
      : moment.kind === 'play'
        ? `${name(moment.player)} to play ${moment.roll[0]}-${moment.roll[1]}.`
        : `${name(moment.kind === 'cube-action' ? moment.doubler : moment.player)} on roll — cube decision.`;

  const position = selected
    ? sequence.findIndex((ref) => sameRef(selected, ref))
    : -1;

  function step(delta: number): void {
    const next = sequence[position + delta];
    if (next) {
      select(next);
    }
  }

  function select(ref: DecisionRef): void {
    setSelected(ref);
    setPinned(null);
    setHovered(null);
    setDeepenNote(null);
  }

  async function deepen(): Promise<void> {
    if (!selected || deepening) {
      return;
    }
    setDeepening(true);
    setDeepenNote(null);
    try {
      const refined = await analyzer.deepen(record, analysis, {
        gameIndex: selected.game,
        decisionIndex: selected.index,
      });
      onAnalyzed(stored.id, refined);
      try {
        const row = await storage.get(stored.id);
        if (row) {
          await storage.put({ ...row, analysis: refined });
        }
      } catch {
        // Persistence is best effort; the refined numbers are on screen.
      }
    } catch {
      setDeepenNote('Deeper analysis failed — try again.');
    } finally {
      setDeepening(false);
    }
  }

  return (
    <div className="review">
      <section className="review-summary" aria-label="Match error rates">
        {(['white', 'black'] as const).map((player) => (
          <div key={player} className="summary-player">
            <span
              className={`chip-swatch chip-swatch--${player}`}
              aria-hidden="true"
            />
            <span className="summary-name">{name(player)}</span>
            {/* biome-ignore lint/a11y/useSemanticElements: a labelled inline stat; fieldset/section would be wrong semantics */}
            <span
              className="summary-rate"
              role="group"
              aria-label={`${name(player)} error rate`}
            >
              {rateText(analysis[player])}
            </span>
            <span className="summary-counts">
              {countsText(analysis[player])}
            </span>
          </div>
        ))}
        <p className="summary-hint">
          Error rate: equity lost per unforced decision, in thousandths — lower
          is better.
        </p>
      </section>

      {analysis.games.length > 1 && (
        <div className="game-tabs">
          {analysis.games.map((game, index) => {
            const first = visible[index][0];
            return (
              <button
                // biome-ignore lint/suspicious/noArrayIndexKey: games are an append-only sequence
                key={index}
                type="button"
                className="game-tab"
                aria-pressed={gameIndex === index}
                title={
                  record.games[index]
                    ? gameLine(record.games[index])
                    : undefined
                }
                onClick={() =>
                  first && select({ game: index, index: first.index })
                }
              >
                Game {index + 1}
                <span className="game-tab-rate">
                  {rateText(game.white)} · {rateText(game.black)}
                </span>
              </button>
            );
          })}
        </div>
      )}

      <div className="review-layout">
        <ol className="decision-list" aria-label="Decisions">
          {visible[gameIndex]?.map(({ decision: row, index }) => (
            <DecisionRow
              key={`${row.kind}-${row.playIndex}-${row.kind === 'cube' ? row.action : 'play'}`}
              decision={row}
              selected={sameRef(selected, { game: gameIndex, index })}
              onSelect={() => select({ game: gameIndex, index })}
            />
          ))}
        </ol>

        <div className="review-board">
          <div className="review-nav">
            <button
              type="button"
              className="history-button"
              aria-label="Previous decision"
              disabled={position <= 0}
              onClick={() => step(-1)}
            >
              ‹ Previous
            </button>
            <span className="review-count">
              {position + 1} of {sequence.length}
            </span>
            <button
              type="button"
              className="history-button"
              aria-label="Next decision"
              disabled={position < 0 || position >= sequence.length - 1}
              onClick={() => step(1)}
            >
              Next ›
            </button>
            {xgid && (
              <CopyXgidButton
                xgid={xgid}
                className="history-button history-button--quiet"
              />
            )}
          </div>

          {boardGame && moment && (
            <figure className="review-position" aria-label="Review position">
              <Board
                game={boardGame}
                selected={null}
                onSelect={noop}
                onMove={noop}
                cube={
                  moment.context.cube
                    ? {
                        ...moment.context.cube,
                        outOfPlay: moment.context.crawford,
                      }
                    : null
                }
                interactive={false}
              />
              <figcaption>{caption}</figcaption>
            </figure>
          )}

          {decision && (
            <section className="decision-detail" aria-label="Decision detail">
              <header className="detail-header">
                <h3 className="detail-headline">
                  {decisionHeadline(decision)}
                </h3>
                <span className="review-chip review-chip--plies">
                  {decision.plies}-ply
                </span>
              </header>
              <p
                className={`detail-verdict detail-verdict--${decision.classification}`}
              >
                {verdictText(decision)}
                {decision.kind === 'play' && decision.rank > 1 && (
                  <span className="detail-rank">
                    {' '}
                    Ranked #{decision.rank} of {decision.totalPlays}.
                  </span>
                )}
              </p>
              {decision.kind === 'play' ? (
                <>
                  <AlternativesPanel
                    play={decision}
                    shown={preview}
                    pinned={pinned}
                    onHover={setHovered}
                    onPin={setPinned}
                  />
                  <p className="detail-hint">
                    Point at a play to see it on the board; click to keep it
                    there.
                  </p>
                </>
              ) : (
                <CubePanel decision={decision} />
              )}
              <div className="detail-actions">
                <button
                  type="button"
                  className="history-button"
                  disabled={deepening || decision.plies >= 3}
                  onClick={() => void deepen()}
                >
                  {deepening
                    ? 'Deepening…'
                    : decision.plies >= 3
                      ? 'Analyzed at 3-ply'
                      : 'Analyze deeper'}
                </button>
                {deepenNote && (
                  <span className="detail-note">{deepenNote}</span>
                )}
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}

/** A finished match: header from the record, then the analyzed review. */
function MatchView({
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
          ? `${name(replay.winner)} wins the match ${replay.score[replay.winner]}–${replay.score[other(replay.winner)]}`
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

/* ------------------------------------------------------------------ */
/* XGID position viewer                                                 */
/* ------------------------------------------------------------------ */

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
    ? `${name(onRoll)} doubles to ${(match?.cube?.value ?? 1) * 2} — ${name(other(onRoll))} to take or pass`
    : loaded.roll
      ? `${name(onRoll)} to play ${loaded.roll[0]}-${loaded.roll[1]}`
      : `${name(onRoll)} on roll`;
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
function PositionViewer({ analyzer }: { analyzer: MatchAnalyzer }) {
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
                      {equityText(ranked.equity)}
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
                      {equityText(option.equity)}
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

  function newMatchId(): string {
    return typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : `imported-${Date.now()}-${Math.floor(Math.random() * 1e9)}`;
  }

  function importMatFile(file: File): void {
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const imported = importMat(String(reader.result));
        const row = importedStoredMatch(imported, newMatchId(), Date.now());
        await storage.put(row);
        setNote('Match imported — open it to see the analysis.');
        reload();
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
                          <>
                            <button
                              type="button"
                              className="history-button"
                              onClick={() => setOpenId(stored.id)}
                            >
                              Open
                            </button>
                            <button
                              type="button"
                              className="history-button history-button--quiet"
                              onClick={() => exportMatchMat(stored)}
                            >
                              Export .mat
                            </button>
                          </>
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
            <label className="history-button import-label">
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
              Export downloads every match as one JSON file. Import backup
              replaces your current history with the file's. Import match adds a
              Jellyfish .mat match to the history, where it analyzes like any
              other.
            </p>
          </div>
          <PositionViewer analyzer={analyzer} />
        </>
      )}
    </section>
  );
}
