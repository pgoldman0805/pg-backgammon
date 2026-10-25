/**
 * The Settings area (ticket 20): every controllable preference in one room —
 * Appearance (theme, Board style), Play (autoplay, Tutor default, checker
 * animation) and Data (history backup). Every control writes the same store
 * its in-context twin reads, so the quick toggles on the Play setup card and
 * HUD stay in sync in both directions.
 */

import { useId, useState } from 'react';
import {
  ANIMATION_SPEEDS,
  type AnimationSpeed,
  useAnimationSpeed,
} from '../play/animation';
import { BoardStylePicker } from '../play/BoardStylePicker';
import {
  AUTO_FORCED_PLAYS_KEY,
  AUTO_ROLL_RACES_KEY,
  TUTOR_DEFAULT_KEY,
  useStoredSwitch,
} from '../play/settings';
import { getMatchStorage, type MatchStorage } from '../storage';
import { setTheme, type Theme, useTheme } from '../theme';
import { BackupControls } from '../ui/BackupControls';
import { StorageStatus } from '../ui/StorageStatus';
import { Switch } from '../ui/Switch';
import './settings.css';

const THEMES: ReadonlyArray<{ id: Theme; label: string }> = [
  { id: 'light', label: 'Light' },
  { id: 'dark', label: 'Dark' },
];

const SPEED_LABELS: Record<AnimationSpeed, string> = {
  off: 'Off',
  fast: 'Fast',
  normal: 'Normal',
  slow: 'Slow',
};

/** A titled settings group, marked with the shell's board-point triangle. */
function Section({
  title,
  blurb,
  children,
}: {
  title: string;
  blurb: string;
  children: React.ReactNode;
}) {
  return (
    <section className="settings-section">
      <header className="settings-section-header">
        <svg
          className="settings-point"
          width="12"
          height="14"
          viewBox="0 0 12 14"
          aria-hidden="true"
        >
          <path d="M0 14h12L6 0z" />
        </svg>
        <h2>{title}</h2>
        <p className="settings-blurb">{blurb}</p>
      </header>
      <div className="settings-rows">{children}</div>
    </section>
  );
}

/** One setting: name and hint on the left, its control on the right. */
function Row({
  name,
  hint,
  children,
  labelId,
}: {
  name: string;
  hint: string;
  children: React.ReactNode;
  labelId?: string;
}) {
  return (
    <div className="setting-row">
      <div className="setting-copy">
        <span className="setting-name" id={labelId}>
          {name}
        </span>
        <span className="setting-hint">{hint}</span>
      </div>
      <div className="setting-control">{children}</div>
    </div>
  );
}

/** An on/off setting using the shared switch (ticket 42), named by its row. */
function SwitchRow({
  name,
  hint,
  on,
  onChange,
}: {
  name: string;
  hint: string;
  on: boolean;
  onChange: (on: boolean) => void;
}) {
  const labelId = useId();
  return (
    <Row name={name} hint={hint} labelId={labelId}>
      <Switch labelledBy={labelId} on={on} onChange={onChange} />
    </Row>
  );
}

/** A small pill radio group, named by its row. */
function PillsRow<T extends string>({
  name,
  hint,
  options,
  value,
  onChange,
}: {
  name: string;
  hint: string;
  options: ReadonlyArray<{ id: T; label: string }>;
  value: T;
  onChange: (id: T) => void;
}) {
  const labelId = useId();
  const group = useId();
  return (
    <Row name={name} hint={hint} labelId={labelId}>
      {/* A plain group named by the row: a fieldset legend would double the
          row's visible name. */}
      <div
        className="setting-pills"
        role="radiogroup"
        aria-labelledby={labelId}
      >
        {options.map((option) => (
          <label key={option.id} className="setting-pill">
            <input
              type="radio"
              name={group}
              value={option.id}
              checked={value === option.id}
              onChange={() => onChange(option.id)}
            />
            {option.label}
          </label>
        ))}
      </div>
    </Row>
  );
}

export interface SettingsProps {
  /** Injectable for tests; defaults to the shared IndexedDB storage. */
  storage?: MatchStorage;
}

export function Settings({ storage: injectedStorage }: SettingsProps = {}) {
  const [storage] = useState(() => injectedStorage ?? getMatchStorage());
  const [theme] = useTheme();
  const [autoRollRaces, setAutoRollRaces] = useStoredSwitch(
    AUTO_ROLL_RACES_KEY,
    true,
  );
  const [autoForcedPlays, setAutoForcedPlays] = useStoredSwitch(
    AUTO_FORCED_PLAYS_KEY,
    true,
  );
  const [tutorDefault, setTutorDefault] = useStoredSwitch(
    TUTOR_DEFAULT_KEY,
    false,
  );
  const [animationSpeed, setAnimationSpeed] = useAnimationSpeed();

  return (
    <section className="settings-area">
      <h1>Settings</h1>
      <p className="settings-intro">
        Everything you can tune, in one place. Changes apply immediately and
        stay on this device.
      </p>

      <Section title="Appearance" blurb="The app and the board.">
        <PillsRow
          name="Theme"
          hint="Follows your system until you pick one."
          options={THEMES}
          value={theme}
          onChange={setTheme}
        />
        <div className="setting-row setting-row--block">
          <BoardStylePicker />
        </div>
      </Section>

      <Section title="Play" blurb="How a match moves along.">
        <SwitchRow
          name="Auto-roll in races"
          hint="Once no contact remains, your pre-roll rolls itself."
          on={autoRollRaces}
          onChange={setAutoRollRaces}
        />
        <SwitchRow
          name="Auto-play forced plays"
          hint="Your only legal play plays itself, one visible movement at a time."
          on={autoForcedPlays}
          onChange={setAutoForcedPlays}
        />
        <SwitchRow
          name="Tutor mode for new matches"
          hint="Coaching as you play — hints, post-play feedback, and the eval bar — on for each new match. The in-game toggle still rules the match at hand."
          on={tutorDefault}
          onChange={setTutorDefault}
        />
        <PillsRow
          name="Checker animation"
          hint="How checkers travel between points — the computer's pace follows."
          options={ANIMATION_SPEEDS.map((id) => ({
            id,
            label: SPEED_LABELS[id],
          }))}
          value={animationSpeed}
          onChange={setAnimationSpeed}
        />
      </Section>

      <Section title="Data" blurb="Your match history lives in this browser.">
        <StorageStatus />
        <BackupControls storage={storage} />
      </Section>
    </section>
  );
}
