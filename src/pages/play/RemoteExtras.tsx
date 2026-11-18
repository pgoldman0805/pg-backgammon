/**
 * The quiet controls of a remote game that are not part of any one turn: the
 * auto-roll choice and this device's private link. They sit with the turn
 * controls rather than in the HUD, so the line above the board stays about
 * the game (whose move, how long) and the board stays near the top.
 */

import type { AutoRollMode } from '../../play/settings';
import { AutoRollField } from './PlaySetup';

export function RemoteExtras({
  autoRollMode,
  onAutoRollChange,
  privateLink,
}: {
  autoRollMode: AutoRollMode;
  onAutoRollChange: (mode: AutoRollMode) => void;
  privateLink: string | null;
}) {
  return (
    <div className="remote-extras">
      <div className="setting-switches">
        <AutoRollField mode={autoRollMode} onChange={onAutoRollChange} />
      </div>
      {privateLink && (
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
  );
}
