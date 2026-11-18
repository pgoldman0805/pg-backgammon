/**
 * The two fields for an online game: the player's display name and, when
 * creating one, the time allowed per turn. Controlled and presentational;
 * the page decides what to remember.
 */

import { useId, useState } from 'react';
import { MAX_NAME_LENGTH, MOVE_SECONDS_PRESETS } from '../../remote/protocol';

export const MOVE_SECONDS_LABEL: Record<number, string> = {
  0: 'No timer',
  15: '15 seconds',
  30: '30 seconds',
  60: '1 minute',
  120: '2 minutes',
};

/** "30 seconds per turn" / "no timer", for describing a room's clock. */
export function clockPhrase(moveSeconds: number | undefined): string {
  return moveSeconds
    ? `${MOVE_SECONDS_LABEL[moveSeconds] ?? `${moveSeconds} seconds`} per turn`
    : 'no timer';
}

export function NameField({
  initial,
  onChange,
}: {
  initial: string;
  onChange: (name: string) => void;
}) {
  const [value, setValue] = useState(initial);
  return (
    <input
      className="online-field"
      type="text"
      aria-label="Your name"
      placeholder="Your name (optional)"
      maxLength={MAX_NAME_LENGTH}
      autoComplete="nickname"
      value={value}
      onChange={(event) => {
        setValue(event.target.value);
        onChange(event.target.value);
      }}
    />
  );
}

export function MoveTimerField({
  value,
  onChange,
}: {
  value: number;
  onChange: (seconds: number) => void;
}) {
  const id = useId();
  return (
    <div className="online-field-row">
      <label htmlFor={id}>Time per turn</label>
      <select
        id={id}
        className="online-field"
        value={String(value)}
        onChange={(event) => onChange(Number(event.target.value))}
      >
        {MOVE_SECONDS_PRESETS.map((seconds) => (
          <option key={seconds} value={String(seconds)}>
            {MOVE_SECONDS_LABEL[seconds]}
          </option>
        ))}
      </select>
    </div>
  );
}
