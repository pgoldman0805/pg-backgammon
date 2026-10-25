/**
 * The one binary-setting switch (ticket 42). Before it there were two
 * idioms — a pill-with-dot on the Play area, an iOS-style track-and-thumb in
 * Settings — for the very same concept. This settles on the track-and-thumb:
 * the universally read "on/off" affordance, in the training green.
 *
 * It is a leaf control: layout (a hint below, a settings row beside) belongs
 * to the caller. Its name comes either from a visible `label` it renders, or
 * from an external element named by `labelledBy`; in the latter case it still
 * spells out On/Off for sighted users without doubling the accessible name.
 */

import './switch.css';

export interface SwitchProps {
  readonly on: boolean;
  readonly onChange: (on: boolean) => void;
  /** A visible label rendered inside the control; becomes its accessible name. */
  readonly label?: string;
  /** Id of an external element naming the control (when `label` is absent). */
  readonly labelledBy?: string;
  /** Id of an element describing the control (e.g. a one-line hint). */
  readonly describedBy?: string;
  /** Extra class for context-specific spacing. */
  readonly className?: string;
}

export function Switch({
  on,
  onChange,
  label,
  labelledBy,
  describedBy,
  className,
}: SwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-labelledby={label === undefined ? labelledBy : undefined}
      aria-describedby={describedBy}
      className={`app-switch${className ? ` ${className}` : ''}`}
      onClick={() => onChange(!on)}
    >
      <span className="app-switch-track" aria-hidden="true">
        <span className="app-switch-thumb" />
      </span>
      {label !== undefined ? (
        <span className="app-switch-label">{label}</span>
      ) : (
        <span className="app-switch-state" aria-hidden="true">
          {on ? 'On' : 'Off'}
        </span>
      )}
    </button>
  );
}
