/**
 * The Play HUD: the two player chips (swatch, pip count and match score) framing
 * a center column that carries the status line, the match caption (length or
 * money, Crawford, the copy-XGID button) and — against the computer — the
 * Tutor-mode and auto-roll switches. Purely presentational: it renders the
 * match state the page hands it and raises the two toggles back up.
 */

import type { Difficulty } from '../../engine';
import { CopyXgidButton } from '../../formats';
import type { AutoRollMode } from '../../play/settings';
import {
  type BoardState,
  type MatchState,
  type Player,
  pipCount,
} from '../../rules';
import { GlossaryTerm } from '../../ui/GlossaryTerm';
import { AutoRollField, SettingSwitch, TUTOR_HINT } from './PlaySetup';
import { difficultyLabel } from './playFormat';

export function PlayHud({
  actor,
  board,
  match,
  status,
  declineNote,
  xgid,
  vsComputer,
  difficulty,
  thinking,
  tutorOn,
  onTutorChange,
  autoRollMode,
  onAutoRollChange,
}: {
  /** Whose decision the moment is, for the active-chip highlight. */
  actor: Player | null;
  board: BoardState;
  match: MatchState | null;
  status: string;
  declineNote: string | null;
  xgid: string | null;
  vsComputer: boolean;
  difficulty: Difficulty;
  thinking: boolean;
  tutorOn: boolean;
  onTutorChange: (on: boolean) => void;
  autoRollMode: AutoRollMode;
  onAutoRollChange: (mode: AutoRollMode) => void;
}) {
  return (
    <div className="play-hud">
      <div
        className={`player-chip ${actor === 'white' ? 'player-chip--active' : ''}`}
      >
        <span className="chip-swatch chip-swatch--white" aria-hidden="true" />
        <span className="chip-name">White</span>
        {/* biome-ignore lint/a11y/useSemanticElements: a labelled inline stat; fieldset/section would be wrong semantics */}
        <span className="chip-pips" role="group" aria-label="White pip count">
          <GlossaryTerm id="pips">{pipCount(board, 'white')}</GlossaryTerm>
        </span>
        {match && (
          // biome-ignore lint/a11y/useSemanticElements: a labelled inline stat; fieldset/section would be wrong semantics
          <span
            className="chip-score"
            role="group"
            aria-label="White match score"
          >
            {match.score.white}
          </span>
        )}
      </div>
      <div className="play-center">
        <p className="play-status" role="status">
          {declineNote ? `${status} ${declineNote}` : status}
        </p>
        {match && (
          <p className="match-caption">
            {match.money ? (
              <>
                Money play
                <span className="crawford-badge">
                  <GlossaryTerm id="jacoby">Jacoby</GlossaryTerm>
                </span>
              </>
            ) : match.length === 1 ? (
              '1-point match'
            ) : (
              `${match.length}-point match`
            )}
            {match.crawford && (
              <span className="crawford-badge">
                <GlossaryTerm id="crawford">Crawford</GlossaryTerm> — no
                doubling
              </span>
            )}
            {xgid && (
              <CopyXgidButton
                xgid={xgid}
                className="play-button play-button--quiet copy-xgid"
              />
            )}
          </p>
        )}
        {match && vsComputer && (
          <div className="setting-switches">
            <SettingSwitch
              label="Tutor mode"
              hint={TUTOR_HINT}
              on={tutorOn}
              onChange={onTutorChange}
            />
            <AutoRollField mode={autoRollMode} onChange={onAutoRollChange} />
          </div>
        )}
      </div>
      <div
        className={`player-chip player-chip--mirror ${actor === 'black' ? 'player-chip--active' : ''}`}
      >
        <span className="chip-swatch chip-swatch--black" aria-hidden="true" />
        <span className="chip-name">Black</span>
        {vsComputer && (
          <span className="chip-tag">
            {difficultyLabel(difficulty)}
            {thinking && <span className="chip-thinking" aria-hidden="true" />}
          </span>
        )}
        {/* biome-ignore lint/a11y/useSemanticElements: a labelled inline stat; fieldset/section would be wrong semantics */}
        <span className="chip-pips" role="group" aria-label="Black pip count">
          <GlossaryTerm id="pips">{pipCount(board, 'black')}</GlossaryTerm>
        </span>
        {match && (
          // biome-ignore lint/a11y/useSemanticElements: a labelled inline stat; fieldset/section would be wrong semantics
          <span
            className="chip-score"
            role="group"
            aria-label="Black match score"
          >
            {match.score.black}
          </span>
        )}
      </div>
    </div>
  );
}
