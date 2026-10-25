/**
 * The analyzed review of a finished match: the per-player error-rate summary,
 * the per-game tabs, the scannable decision list, and the board with the
 * engine's alternatives for the selected decision — any one of which can be
 * re-analyzed deeper on demand.
 */

import { useEffect, useMemo, useState } from 'react';
import {
  type AnalyzedDecision,
  type MatchAnalysis,
  type MatchAnalyzer,
  matchStandings,
  momentForDecision,
  type PlayAlternative,
  walkGame,
} from '../../analysis';
import { CopyXgidButton, encodeXgid } from '../../formats';
import { Board } from '../../play/Board';
import { applyMovement, type GameState } from '../../rules';
import type { MatchStorage, StoredMatch } from '../../storage';
import { luckText, playerName, prText, skillBand } from '../../ui/format';
import { GlossaryTerm } from '../../ui/GlossaryTerm';
import {
  type DecisionRef,
  decisionHeadline,
  diceOf,
  gameLine,
  isVisible,
  noop,
  sameRef,
  verdictText,
} from './reviewFormat';
import {
  AlternativesPanel,
  Counts,
  CubePanel,
  DecisionRow,
} from './reviewPanels';

/** The analyzed review of a finished match. */
export function Review({
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
  const moment = useMemo(
    () => (decision ? momentForDecision(moments, decision) : null),
    [decision, moments],
  );

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
        ? `${playerName(moment.player)} to play ${moment.roll[0]}-${moment.roll[1]}.`
        : `${playerName(moment.kind === 'cube-action' ? moment.doubler : moment.player)} on roll — cube decision.`;

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
            <span className="summary-name">{playerName(player)}</span>
            {/* biome-ignore lint/a11y/useSemanticElements: a labelled inline stat; fieldset/section would be wrong semantics */}
            <span
              className="summary-rate"
              role="group"
              aria-label={`${playerName(player)} error rate`}
            >
              {prText(analysis[player].errorRate)}
            </span>
            <span className="summary-unit" aria-hidden="true">
              PR
            </span>
            <span className="summary-band">
              {skillBand(analysis[player].errorRate)}
            </span>
            {analysis.luck && (
              // Net luck sits apart from the PR number: the dice, not the
              // decisions. Positive is lucky (GLOSSARY "Luck").
              // biome-ignore lint/a11y/useSemanticElements: a labelled inline stat, like the error rate beside it
              <span
                className="summary-luck"
                role="group"
                aria-label={`${playerName(player)} net luck`}
              >
                <span className="summary-luck-value">
                  {luckText(analysis.luck[player])}
                </span>
                <span className="summary-luck-unit" aria-hidden="true">
                  luck
                </span>
              </span>
            )}
            <span className="summary-counts">
              <Counts summary={analysis[player]} />
            </span>
          </div>
        ))}
        <p className="summary-hint">
          <GlossaryTerm id="pr">PR</GlossaryTerm>:{' '}
          <GlossaryTerm id="equity">equity</GlossaryTerm> lost per unforced
          decision, on the scale serious players use — lower is better.
        </p>
        {analysis.luck && (
          <p className="summary-hint">
            <GlossaryTerm id="luck">Luck</GlossaryTerm>: the equity the dice
            handed each side versus an average roll — positive is lucky. Kept
            separate from PR, which grades only your decisions.
          </p>
        )}
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
                  {prText(game.white.errorRate)} ·{' '}
                  {prText(game.black.errorRate)} PR
                </span>
                {game.luck && (
                  <span className="game-tab-luck">
                    {luckText(game.luck.white)} · {luckText(game.luck.black)}{' '}
                    luck
                  </span>
                )}
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
                  <GlossaryTerm id="two-ply">{decision.plies}-ply</GlossaryTerm>
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
