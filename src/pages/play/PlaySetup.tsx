/**
 * The setup-card controls: the difficulty, game-type and length pickers, the
 * labelled Tutor-mode switch, and the engine-status note. Each is a small,
 * self-contained presentational component the Play page composes into its
 * setup card, match-over card and side panel.
 */

import { useId } from 'react';
import type { Difficulty, EngineStatus } from '../../engine';
import type { AutoRollMode } from '../../play/settings';
import { Switch } from '../../ui/Switch';
import { DIFFICULTIES, type GameType, points } from './playFormat';

export function DifficultyPicker({
  value,
  onChange,
}: {
  value: Difficulty;
  onChange: (difficulty: Difficulty) => void;
}) {
  return (
    <fieldset className="difficulty-picker">
      <legend className="difficulty-legend">Difficulty</legend>
      <div className="difficulty-options">
        {DIFFICULTIES.map((difficulty) => (
          <label key={difficulty.id} className="difficulty-pill">
            <input
              type="radio"
              name="difficulty"
              value={difficulty.id}
              checked={value === difficulty.id}
              onChange={() => onChange(difficulty.id)}
            />
            {difficulty.label}
          </label>
        ))}
      </div>
    </fieldset>
  );
}

export function LengthPicker({
  value,
  onChange,
}: {
  value: number;
  onChange: (length: number) => void;
}) {
  return (
    <label className="length-picker">
      Match length
      <select
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
      >
        {Array.from({ length: 25 }, (_, i) => i + 1).map((n) => (
          <option key={n} value={n}>
            {points(n)}
          </option>
        ))}
      </select>
    </label>
  );
}

const GAME_TYPES: ReadonlyArray<{ id: GameType; label: string }> = [
  { id: 'match', label: 'Match' },
  { id: 'money', label: 'Money play' },
];

/**
 * Choose match play (to a point target) or a money session (GLOSSARY "Money
 * play"). Mirrors the difficulty pills so the two game types read as one
 * family; the money hint names what changes rather than leaving the choice
 * unexplained.
 */
export function GameTypePicker({
  value,
  onChange,
}: {
  value: GameType;
  onChange: (gameType: GameType) => void;
}) {
  return (
    <fieldset className="difficulty-picker">
      <legend className="difficulty-legend">Game</legend>
      <div className="difficulty-options">
        {GAME_TYPES.map((type) => (
          <label key={type.id} className="difficulty-pill">
            <input
              type="radio"
              name="game-type"
              value={type.id}
              checked={value === type.id}
              onChange={() => onChange(type.id)}
            />
            {type.label}
          </label>
        ))}
      </div>
    </fieldset>
  );
}

/** What a money session changes, spelled out beside the picker. */
export const MONEY_HINT =
  'Unlimited games, cube live from the start, gammons under the Jacoby rule.';

/**
 * What Tutor mode turns on, spelled out beside the toggle (ticket 31): live
 * coaching — the hint, feedback on every play, and the eval bar.
 */
export const TUTOR_HINT =
  'Coaching as you play: hints, feedback, and the eval bar.';

/** The three auto-roll modes, labelled for the pickers. */
export const AUTO_ROLL_OPTIONS: ReadonlyArray<{
  id: AutoRollMode;
  label: string;
}> = [
  { id: 'off', label: 'Never' },
  { id: 'races', label: 'In races' },
  { id: 'always', label: 'Always' },
];

/** What the auto-roll control does, spelled out beside it. */
export const AUTO_ROLL_HINT =
  'Roll your dice for you at the pre-roll: in races only, or always (even when you could double).';

/**
 * The in-HUD auto-roll control: a compact three-way segmented radiogroup
 * (Off / In races / Always) beside the Tutor toggle, so the mode can be
 * changed mid-match. Named by its visible "Auto-roll" label.
 */
export function AutoRollField({
  mode,
  onChange,
}: {
  mode: AutoRollMode;
  onChange: (mode: AutoRollMode) => void;
}) {
  const group = useId();
  const labelId = useId();
  return (
    <span className="setting-switch-field">
      <span className="autoroll-label" id={labelId}>
        Auto-roll
      </span>
      <span
        className="autoroll-seg"
        role="radiogroup"
        aria-labelledby={labelId}
      >
        {AUTO_ROLL_OPTIONS.map((option) => (
          <label key={option.id} className="autoroll-seg-option">
            <input
              type="radio"
              name={group}
              value={option.id}
              checked={mode === option.id}
              onChange={() => onChange(option.id)}
            />
            {option.label}
          </label>
        ))}
      </span>
    </span>
  );
}

/**
 * One labeled on/off switch in the Play area: the Tutor mode toggle, on the
 * setup card and in the HUD during a match. (The preference switches moved to
 * Settings — ticket 25.) It wraps the shared Switch (ticket 42) with a
 * one-line hint naming what the toggle turns on, so its purpose is plain
 * rather than a bare label (ticket 31); the hint is tied to the switch for
 * assistive tech.
 */
export function SettingSwitch({
  label,
  hint,
  on,
  onChange,
}: {
  label: string;
  hint?: string;
  on: boolean;
  onChange: (on: boolean) => void;
}) {
  const hintId = useId();
  return (
    <span className="setting-switch-field">
      <Switch
        label={label}
        on={on}
        onChange={onChange}
        describedBy={hint ? hintId : undefined}
      />
      {hint && (
        <span className="setting-switch-hint" id={hintId}>
          {hint}
        </span>
      )}
    </span>
  );
}

export function EngineNote({
  status,
  opponentError,
  onRetry,
}: {
  status: EngineStatus;
  opponentError: string | null;
  onRetry: () => void;
}) {
  if (status === 'error' || opponentError) {
    return (
      <p className="engine-note engine-note--error">
        {status === 'error'
          ? 'The engine failed to load.'
          : 'The computer could not move.'}
        <button type="button" className="play-button" onClick={onRetry}>
          Retry
        </button>
      </p>
    );
  }
  if (status === 'loading') {
    return (
      <p className="engine-note">
        Engine loading…
        <button type="button" className="play-button" onClick={onRetry}>
          Retry
        </button>
      </p>
    );
  }
  return null;
}
