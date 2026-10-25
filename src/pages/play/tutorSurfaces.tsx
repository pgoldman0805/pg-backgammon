/**
 * The Tutor live-analysis surfaces that ride above the board while Tutor mode
 * is on (GLOSSARY "Tutor mode"): the eval bar and the post-play feedback note.
 * Both are read-only views of the Tutor controller's state.
 */

import type { TutorFeedback, TutorState } from '../../play/tutor';
import { signedEquityText } from '../../ui/format';
import { GlossaryTerm } from '../../ui/GlossaryTerm';

/**
 * The eval bar (GLOSSARY "Eval bar"): White's share of the game, in the two
 * checker colors, with the win chance and equity spelled out beside it.
 */
export function EvalBar({ state }: { state: TutorState | null }) {
  const evaluation = state?.evaluation ?? null;
  const percent = evaluation ? Math.round(evaluation.winProbability * 100) : 50;
  const equityText = evaluation ? signedEquityText(evaluation.equity, 2) : '…';
  return (
    <div className="eval-bar">
      {/* biome-ignore lint/a11y/useSemanticElements: a meter element would add native-widget styling the board design replaces */}
      <div
        role="meter"
        aria-label="Evaluation"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={percent}
        aria-valuetext={`White wins ${percent}% of the time`}
        className="eval-track"
      >
        <span className="eval-fill" style={{ width: `${percent}%` }} />
        <span className="eval-tick" aria-hidden="true" />
      </div>
      <span className="eval-caption">
        {percent}% · <GlossaryTerm id="equity">{equityText}</GlossaryTerm>
      </span>
    </div>
  );
}

const FEEDBACK_LABEL = {
  ok: 'Good',
  dubious: 'Dubious',
  error: 'Error',
  blunder: 'Blunder',
} as const;

/** Post-play feedback (GLOSSARY): classification, cost, and the better play. */
export function FeedbackNote({ feedback }: { feedback: TutorFeedback }) {
  const label =
    feedback.equityLoss === 0
      ? 'Best play'
      : FEEDBACK_LABEL[feedback.classification];
  return (
    <p className="tutor-note" role="note" aria-label="Play feedback">
      <span
        className={`feedback-chip feedback-chip--${feedback.classification}`}
      >
        {feedback.classification === 'ok' ? (
          label
        ) : (
          <GlossaryTerm id={feedback.classification}>{label}</GlossaryTerm>
        )}
      </span>
      {feedback.equityLoss > 0 && (
        <span className="tutor-note-loss">
          {' '}
          −{feedback.equityLoss.toFixed(2)}
        </span>
      )}
      {feedback.classification !== 'ok' && (
        <span> · Best: {feedback.bestMoveText}</span>
      )}
      {/* The live eval is a 2-ply engine read, not a rollout — so a close call
          can differ from the rollout answer. */}
      <span className="tutor-note-depth">
        {' · '}
        <GlossaryTerm id="two-ply">2-ply</GlossaryTerm>
      </span>
    </p>
  );
}
