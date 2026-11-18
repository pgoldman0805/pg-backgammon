/**
 * What the Play page shows for a remote room before the board takes over:
 * finding the room, the offer to join as Black, a full or ended room, an
 * unreachable game service with a way to try again, and —
 * seated with no match yet — the invite link to send the opponent plus this
 * device's private link. Presentational: the room lifecycle lives in
 * useRemoteRoom.
 */

import { Link } from 'react-router-dom';
import { readPlayerName, writePlayerName } from '../../remote/playerPrefs';
import type { StoredMatch } from '../../storage';
import { clockPhrase, NameField } from './OnlineFields';
import type { RemoteRoomView } from './useRemoteRoom';

export function RemotePanel({
  view,
  matchStarted,
  localRow = null,
  onDiscard,
}: {
  view: RemoteRoomView;
  matchStarted: boolean;
  /** This room's in-progress stored row, kept reviewable once the room ends. */
  localRow?: StoredMatch | null;
  onDiscard?: () => void;
}) {
  if (matchStarted) {
    return null;
  }
  return (
    <div className="play-banner">
      <div className="setup-card remote-panel">
        {panelBody(view, localRow, onDiscard)}
      </div>
    </div>
  );
}

function panelBody(
  view: RemoteRoomView,
  localRow: StoredMatch | null,
  onDiscard?: () => void,
) {
  switch (view.kind) {
    case 'loading':
      return <p className="setup-title">Finding your game…</p>;
    case 'join':
      return (
        <>
          <p className="setup-title">Join a remote game</p>
          {view.summary.names?.white && (
            <p className="remote-note">
              {view.summary.names.white} invited you.
            </p>
          )}
          <p className="remote-note">
            {view.summary.config.length}-point match,{' '}
            {clockPhrase(view.summary.config.moveSeconds)}
          </p>
          <NameField initial={readPlayerName()} onChange={writePlayerName} />
          <button
            type="button"
            className="play-button play-button--primary"
            disabled={view.joining}
            onClick={() => {
              void view.join();
            }}
          >
            Join as Black
          </button>
        </>
      );
    case 'full':
      return <p className="setup-title">This game already has two players.</p>;
    case 'error':
      return (
        <>
          <p className="setup-title">Couldn't reach the game service.</p>
          <button
            type="button"
            className="play-button play-button--primary"
            onClick={view.retry}
          >
            Try again
          </button>
        </>
      );
    case 'ended':
      return (
        <>
          <p className="setup-title">This game has ended.</p>
          {localRow && (
            <div className="dialog-actions">
              <Link className="play-button play-button--primary" to="/analyze">
                Review in Analyze
              </Link>
              <button
                type="button"
                className="play-button play-button--quiet"
                onClick={onDiscard}
              >
                Discard
              </button>
            </div>
          )}
        </>
      );
    case 'seated':
      return (
        <>
          <p className="setup-title">Invite your opponent</p>
          <p className="remote-note">
            Send this link to the person you want to play.
          </p>
          <div className="invite-row">
            <input
              className="invite-link"
              readOnly
              aria-label="Invite link"
              value={view.inviteLink}
              onFocus={(event) => event.currentTarget.select()}
            />
            <button
              type="button"
              className="play-button"
              onClick={() => {
                void navigator.clipboard
                  ?.writeText(view.inviteLink)
                  .catch(() => {});
              }}
            >
              Copy link
            </button>
            {typeof navigator.share === 'function' && (
              <button
                type="button"
                className="play-button"
                onClick={() => {
                  void navigator
                    .share({ title: 'Backgammon', url: view.inviteLink })
                    .catch(() => {});
                }}
              >
                Share
              </button>
            )}
          </div>
          <details className="private-link">
            <summary>Your private link</summary>
            <p className="remote-note">
              Opens this game as you on another device. Do not share it.
            </p>
            <code className="private-link-url">{view.privateLink}</code>
          </details>
        </>
      );
  }
}
