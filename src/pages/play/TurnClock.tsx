/**
 * The countdown on the mover's own turn in a timed remote game. Shown only to
 * the player whose clock is running; the room, not this display, decides when
 * time is up. Reads the clock locally between room updates.
 */

import { useEffect, useState } from 'react';

/** Seconds at or under which the countdown turns urgent. */
const URGENT_SECONDS = 10;

function format(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  return `${minutes}:${String(seconds % 60).padStart(2, '0')}`;
}

export function TurnClock({ endsAt }: { endsAt: number }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(id);
  }, []);
  const seconds = Math.max(0, Math.ceil((endsAt - now) / 1000));
  return (
    <p
      className={`turn-clock${seconds <= URGENT_SECONDS ? ' turn-clock--urgent' : ''}`}
      role="timer"
      aria-label="Time left for your move"
      aria-live="off"
    >
      {format(seconds)}
    </p>
  );
}
