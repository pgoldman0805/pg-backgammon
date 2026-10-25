/**
 * The first-run primer nudge (ticket 30, review finding #6). A brand-new user
 * lands on Play with no on-ramp; this non-blocking note under the header points
 * them at the how-to-play primer in the Learn area. It is never a hard block —
 * a strip the player can ignore or dismiss — and it retires permanently once
 * the primer has been seen (opening the Learn area) or the note dismissed,
 * tracked by its own persisted flag so returning users never see it.
 *
 * It deliberately lives at the app shell, not on the Play setup card, so it
 * stays independent of the Tutor control there.
 */

import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { hasPrimerBeenSeen, markPrimerSeen } from '../play/settings';
import './firstRunPrimerPrompt.css';

export function FirstRunPrimerPrompt() {
  const location = useLocation();
  const [seen, setSeen] = useState(() => hasPrimerBeenSeen());

  // Re-check after navigation: opening the Learn area marks the primer seen,
  // so the nudge must not reappear when the user moves back to another area.
  // biome-ignore lint/correctness/useExhaustiveDependencies: pathname is the trigger, not a value we read
  useEffect(() => {
    setSeen(hasPrimerBeenSeen());
  }, [location.pathname]);

  // No point nudging toward the primer while standing on it.
  if (seen || location.pathname === '/learn') {
    return null;
  }

  const retire = () => {
    markPrimerSeen();
    setSeen(true);
  };

  return (
    <aside className="primer-nudge" role="note" aria-label="New to backgammon?">
      <p className="primer-nudge-copy">
        New to backgammon? A short primer covers the goal, moving, hitting,
        bearing off, and the cube — enough for your first move.
      </p>
      <span className="primer-nudge-actions">
        <Link className="primer-nudge-link" to="/learn" onClick={retire}>
          How to play
        </Link>
        <button
          type="button"
          className="primer-nudge-dismiss"
          onClick={retire}
          aria-label="Dismiss"
        >
          Dismiss
        </button>
      </span>
    </aside>
  );
}
