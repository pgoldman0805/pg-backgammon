/**
 * The Play HUD: the two player chips (swatch, pip count and match score) framing
 * a center column that carries the status line, the match caption (length or
 * money, Crawford, the copy-XGID button) and — against the computer — the
 * Tutor-mode and auto-roll switches; in a remote room, this device's private
 * link under a disclosure. Purely presentational: it renders the
 * match state the page hands it and raises the two toggles back up.
 */

import type { Difficulty } from '../../engine';
import { CopyXgidButton } from '../../formats';
import type { AutoRollMode } from '../../play/settings';
import type { Side } from '../../remote/protocol';
import type { ConnectionState } from '../../remote/session';
import {
  type BoardState,
  type MatchState,
  type Player,
  pipCount,
} from '../../rules';
import { GlossaryTerm } from '../../ui/GlossaryTerm';
import { AutoRollField, SettingSwitch, TUTOR_HINT } from './PlaySetup';
import { difficultyLabel } from './playFormat';
import { TurnClock } from './TurnClock';

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
  connection,
  privateLink = null,
  onAbandon = null,
  localSide = null,
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
  /** A remote room's connection, for the presence line; absent otherwise. */
  connection?: ConnectionState | null;
  /** A remote seat's private link, offered during play; absent otherwise. */
  privateLink?: string | null;
  /** Leave a remote game whose opponent has dropped; absent otherwise. */
  onAbandon?: (() => void) | null;
  /** Which side this device plays in a remote room; absent otherwise. */
  localSide?: Side | null;
}) {
  const remoteLine = connection ? connectionText(connection, localSide) : null;
  const nameOf = (side: Side) =>
    connection?.names[side] ?? (side === 'white' ? 'White' : 'Black');
  // The countdown is the mover's alone: you see yours, never the opponent's.
  const clockEndsAt =
    connection &&
    connection.roomStatus === 'playing' &&
    localSide !== null &&
    actor === localSide
      ? connection.turnEndsAt
      : null;
  const turnLine =
    connection &&
    connection.roomStatus === 'playing' &&
    localSide !== null &&
    (actor === 'white' || actor === 'black')
      ? actor === localSide
        ? 'Your turn'
        : `Waiting for ${nameOf(actor)}`
      : null;
  return (
    <div className={`play-hud${connection ? ' play-hud--remote' : ''}`}>
      <div
        className={`player-chip ${actor === 'white' ? 'player-chip--active' : ''}`}
      >
        <span className="chip-swatch chip-swatch--white" aria-hidden="true" />
        <span className="chip-name">{nameOf('white')}</span>
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
        {remoteLine && (
          <p className="remote-line" role="status">
            {remoteLine}
          </p>
        )}
        {(turnLine || clockEndsAt !== null) && (
          <div className="turn-row">
            {turnLine && (
              <p
                className={`turn-indicator${actor === localSide ? ' turn-indicator--yours' : ''}`}
              >
                {turnLine}
              </p>
            )}
            {clockEndsAt !== null && <TurnClock endsAt={clockEndsAt} />}
          </div>
        )}
        {onAbandon && (
          <button
            type="button"
            className="play-button play-button--quiet"
            onClick={onAbandon}
          >
            {connection?.forfeitBy || connection?.cancelledBy
              ? 'Leave game'
              : 'Abandon game'}
          </button>
        )}
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
        {match && (vsComputer || connection) && (
          <div className="setting-switches">
            {vsComputer && (
              <SettingSwitch
                label="Tutor mode"
                hint={TUTOR_HINT}
                on={tutorOn}
                onChange={onTutorChange}
              />
            )}
            <AutoRollField mode={autoRollMode} onChange={onAutoRollChange} />
          </div>
        )}
        {match && privateLink && (
          <details className="remote-private-link">
            <summary>Your private link</summary>
            <p className="remote-note">
              Opens this game as you on another device. Do not share it.
            </p>
            <input
              className="invite-link"
              readOnly
              aria-label="Private link"
              value={privateLink}
              onFocus={(event) => event.currentTarget.select()}
            />
          </details>
        )}
      </div>
      <div
        className={`player-chip player-chip--mirror ${actor === 'black' ? 'player-chip--active' : ''}`}
      >
        <span className="chip-swatch chip-swatch--black" aria-hidden="true" />
        <span className="chip-name">{nameOf('black')}</span>
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

const ERROR_TEXT: Record<NonNullable<ConnectionState['error']>, string> = {
  busy: 'The game service is busy, try again shortly',
  expired: 'This game has ended',
  'bad-token': 'This device no longer holds a seat in this game',
  version: 'Please reload to get the latest version',
  full: 'This game already has two players',
};

/** The presence line for a remote room, or null when all is well. */
function connectionText(
  connection: ConnectionState,
  localSide: Side | null,
): string | null {
  if (connection.cancelledBy) {
    if (connection.cancelledBy === localSide) {
      return 'You cancelled the game.';
    }
    const who = connection.names[connection.cancelledBy] ?? 'Your opponent';
    return `${who} cancelled the game.`;
  }
  if (connection.forfeitBy) {
    if (connection.forfeitBy === localSide) {
      return 'You ran out of time.';
    }
    const loser = connection.names[connection.forfeitBy] ?? 'Your opponent';
    return `${loser} ran out of time. You win.`;
  }
  if (connection.error) {
    return ERROR_TEXT[connection.error];
  }
  if (connection.roomStatus === null) {
    return null;
  }
  if (connection.status !== 'open') {
    return 'Reconnecting…';
  }
  if (connection.roomStatus === 'waiting') {
    return 'Waiting for your opponent to join';
  }
  if (connection.roomStatus === 'playing' && !connection.opponentPresent) {
    return 'Opponent disconnected';
  }
  return null;
}
