/**
 * The review's presentational panels: the per-player tally, the classification
 * badge, a decision row in the list, the ranked play alternatives, and the
 * cube-equity table. Each takes its data as props; the Review component wires
 * them to the selected decision and the board preview.
 */

import type {
  AnalyzedCube,
  AnalyzedDecision,
  AnalyzedPlay,
  PlayAlternative,
  PlayerSummary,
} from '../../analysis';
import { lossText, signedEquityText } from '../../ui/format';
import { GlossaryTerm } from '../../ui/GlossaryTerm';
import {
  CLASSIFICATION_TEXT,
  decisionLabel,
  decisionText,
  rollText,
} from './reviewFormat';

/** The per-player tally, each classification word a defined term (ticket 32). */
export function Counts({ summary }: { summary: PlayerSummary }) {
  const plural = (count: number, word: string) =>
    `${word}${count === 1 ? '' : 's'}`;
  return (
    <>
      {summary.blunders}{' '}
      <GlossaryTerm id="blunder">
        {plural(summary.blunders, 'blunder')}
      </GlossaryTerm>{' '}
      · {summary.errors}{' '}
      <GlossaryTerm id="error">{plural(summary.errors, 'error')}</GlossaryTerm>{' '}
      · {summary.dubious} <GlossaryTerm id="dubious">dubious</GlossaryTerm>
    </>
  );
}

export function ClassificationBadge({
  decision,
}: {
  decision: AnalyzedDecision;
}) {
  if (decision.classification === 'ok') {
    return null;
  }
  return (
    <span className={`review-badge review-badge--${decision.classification}`}>
      {CLASSIFICATION_TEXT[decision.classification]}
    </span>
  );
}

export function DecisionRow({
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

export function AlternativesPanel({
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
      {/* Column headers (ticket 42): the two right-hand number columns read as
          absolute equity and loss-vs-best, labelled like the Puzzles reveal. */}
      <li className="alternative-head">
        <span className="alternative-head-rank" aria-hidden="true" />
        <span className="alternative-head-move">Play</span>
        <span className="alternative-head-equity">Equity</span>
        <span className="alternative-head-loss">Loss</span>
      </li>
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
                {signedEquityText(alternative.equity)}
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

export function CubePanel({ decision }: { decision: AnalyzedCube }) {
  const rows = [
    { action: 'No double', equity: decision.noDoubleEquity },
    { action: 'Double, take', equity: decision.doubleTakeEquity },
    { action: 'Double, pass', equity: decision.doublePassEquity },
  ];
  return (
    <div className="cube-panel">
      <ol className="alternatives" aria-label="Cube equities">
        <li className="alternative-head alternative-head--static">
          <span className="alternative-head-move">Action</span>
          <span className="alternative-head-equity">Equity</span>
        </li>
        {rows.map((row) => (
          <li
            key={row.action}
            className="alternative-row alternative-row--static"
          >
            <span className="alternative-text">{row.action}</span>
            <span className="alternative-equity">
              {signedEquityText(row.equity)}
            </span>
          </li>
        ))}
      </ol>
      <p className="cube-proper">Engine: {decision.properAction}</p>
    </div>
  );
}
