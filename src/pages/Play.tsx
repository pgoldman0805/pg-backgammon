import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { Link } from 'react-router-dom';
import { useAutoAnalysis } from '../analysis';
import {
  DIFFICULTY_LABELS,
  type Difficulty,
  type Engine,
  type EngineStatus,
} from '../engine';
import { CopyXgidButton, encodeXgid } from '../formats';
import { stepMsFor, useAnimationSpeed } from '../play/animation';
import { createAutoplay } from '../play/autoplay';
import { Board } from '../play/Board';
import { getPlayEngine } from '../play/engineInstance';
import {
  createEngineOpponent,
  type EngineOpponent,
  type EngineOpponentState,
} from '../play/opponent';
import { createRaceAutopilot, type RaceAutopilot } from '../play/raceAutopilot';
import { canCommit, canUndo, forcedPlay, isDance } from '../play/selectors';
import {
  AUTO_FORCED_PLAYS_KEY,
  AUTO_ROLL_RACES_KEY,
  getStoredSwitch,
  TUTOR_DEFAULT_KEY,
} from '../play/settings';
import { createPlayStore, type PlayStore } from '../play/store';
import {
  createTutor,
  type Tutor,
  type TutorFeedback,
  type TutorState,
} from '../play/tutor';
import {
  canDouble,
  canTakeback,
  type GameEndKind,
  initialBoard,
  isRace,
  type MatchGameResult,
  type MatchState,
  opponent,
  type Player,
  type Point,
  pipCount,
} from '../rules';
import {
  getMatchStorage,
  type MatchConfig,
  type MatchStorage,
  type StoredMatch,
  useMatchPersistence,
} from '../storage';
import { playerName, signedEquityText } from '../ui/format';
import '../play/board.css';

const KIND_TEXT = {
  single: 'single game',
  gammon: 'gammon',
  backgammon: 'backgammon',
} as const;

const KIND_POINTS = { single: 1, gammon: 2, backgammon: 3 } as const;

const RESIGN_LABEL = {
  single: 'Single',
  gammon: 'Gammon',
  backgammon: 'Backgammon',
} as const;

/** The five opponent strengths (GLOSSARY "Difficulty"), weakest first. */
const DIFFICULTIES: ReadonlyArray<{ id: Difficulty; label: string }> = (
  Object.keys(DIFFICULTY_LABELS) as Difficulty[]
).map((id) => ({ id, label: DIFFICULTY_LABELS[id] }));

function difficultyLabel(difficulty: Difficulty): string {
  return DIFFICULTY_LABELS[difficulty] ?? difficulty;
}

/**
 * The XGID of the current decision point (ticket 10): the pre-play position
 * with the dice during a turn, the pre-roll position otherwise, a pending
 * double while the cube is offered. Null once the game is settled.
 */
function currentXgid(match: MatchState | null): string | null {
  if (!match) {
    return null;
  }
  const context = {
    matchLength: match.length,
    score: match.score,
    crawford: match.crawford,
    cube: match.cube,
  };
  if (match.phase === 'turn' && match.game.turn) {
    const turn = match.game.turn;
    return encodeXgid(
      { board: turn.startBoard, onRoll: turn.player, match: context },
      turn.roll,
    );
  }
  if (match.phase === 'pre-roll' && match.toRoll) {
    return encodeXgid({
      board: match.game.board,
      onRoll: match.toRoll,
      match: context,
    });
  }
  if (match.phase === 'cube-offered' && match.toRoll) {
    return encodeXgid(
      { board: match.game.board, onRoll: match.toRoll, match: context },
      undefined,
      { pendingDouble: true },
    );
  }
  return null;
}

export type PlayMode = 'computer' | 'hotseat';

export interface PlaySetup {
  readonly mode: PlayMode;
  readonly difficulty: Difficulty;
  /** Match length in points, 1-25. */
  readonly length: number;
}

export interface PlayProps {
  /** Injectable for tests; defaults to a fresh store with fair dice. */
  store?: PlayStore;
  /** Injectable for tests; defaults to the shared lazily-loaded engine. */
  engine?: Engine;
  /** Initial mode, difficulty and length; mode governs injected matches. */
  defaultSetup?: PlaySetup;
  /** Pause between the computer's visible steps, in milliseconds. */
  opponentStepMs?: number;
  /** Injectable for tests; defaults to the shared IndexedDB storage. */
  storage?: MatchStorage;
  /** Resume this stored match on arrival (Analyze's "Resume" route state). */
  resumeMatchId?: string;
}

/** Rebuild the setup pickers' state from a stored match's config. */
function setupFromConfig(config: MatchConfig): PlaySetup {
  const difficulty = DIFFICULTIES.find((d) => d.id === config.difficulty)?.id;
  return {
    mode: config.mode === 'hotseat' ? 'hotseat' : 'computer',
    difficulty: difficulty ?? 'casual',
    length: typeof config.length === 'number' ? config.length : 7,
  };
}

/** One line describing a stored match, e.g. "5-point match vs Casual". */
function storedMatchName(stored: StoredMatch): string {
  return stored.config.mode === 'hotseat'
    ? `${stored.config.length}-point hot-seat match`
    : `${stored.config.length}-point match vs ${difficultyLabel(
        stored.config.difficulty ?? 'casual',
      )}`;
}

function points(n: number): string {
  return n === 1 ? '1 point' : `${n} points`;
}

/** How the finished game ended, e.g. "White wins a gammon — 2 points." */
function gameEndText(result: MatchGameResult): string {
  switch (result.end) {
    case 'checkers':
      return `${playerName(result.winner)} wins a ${KIND_TEXT[result.kind]} — ${points(result.points)}.`;
    case 'pass':
      return `${playerName(opponent(result.winner))} passes the double — ${playerName(result.winner)} wins ${points(result.points)}.`;
    case 'resignation':
      return `${playerName(opponent(result.winner))} resigns a ${KIND_TEXT[result.kind]} — ${playerName(result.winner)} wins ${points(result.points)}.`;
  }
}

function statusText(
  match: MatchState | null,
  thinking: boolean,
  vsComputer: boolean,
): string {
  if (!match) {
    return '';
  }
  if (thinking) {
    return 'Black is thinking…';
  }
  const considering = (responder: Player) =>
    vsComputer && responder === 'black' ? ' Black is considering…' : '';
  switch (match.phase) {
    case 'match-over': {
      const winner = match.winner ?? 'white';
      return `${playerName(winner)} wins the match ${match.score[winner]}–${match.score[opponent(winner)]}.`;
    }
    case 'game-over':
      return match.gameResult ? gameEndText(match.gameResult) : '';
    case 'cube-offered': {
      const doubler = match.toRoll ?? 'white';
      return `${playerName(doubler)} doubles to ${match.cube.value * 2}.${considering(opponent(doubler))}`;
    }
    case 'resign-offered': {
      const pending = match.pendingResignation;
      if (!pending) {
        return '';
      }
      return `${playerName(pending.by)} offers to resign a ${KIND_TEXT[pending.kind]}.${considering(opponent(pending.by))}`;
    }
    case 'pre-roll':
      return `${playerName(match.toRoll ?? 'white')} to roll.`;
    case 'turn': {
      const turn = match.game.turn;
      if (!turn) {
        return '';
      }
      const dice = `${turn.roll[0]} and ${turn.roll[1]}`;
      if (isDance(match.game)) {
        return `${playerName(turn.player)} rolled ${dice} — no legal plays.`;
      }
      if (forcedPlay(match.game)) {
        return `${playerName(turn.player)} to play ${dice} — only one legal play.`;
      }
      return `${playerName(turn.player)} to play ${dice}.`;
    }
  }
}

function DifficultyPicker({
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

function LengthPicker({
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

function EngineNote({
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

const IDLE_OPPONENT: EngineOpponentState = { thinking: false, error: null };

/**
 * One labeled on/off switch in the Play area's visual language: the Tutor
 * mode toggle, on the setup card and in the HUD during a match. (The
 * preference switches moved to Settings — ticket 25.)
 */
function SettingSwitch({
  label,
  on,
  onChange,
}: {
  label: string;
  on: boolean;
  onChange: (on: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      className="setting-switch"
      onClick={() => onChange(!on)}
    >
      <span className="setting-switch-dot" aria-hidden="true" />
      {label}
    </button>
  );
}

/**
 * The eval bar (GLOSSARY "Eval bar"): White's share of the game, in the two
 * checker colors, with the win chance and equity spelled out beside it.
 */
function EvalBar({ state }: { state: TutorState | null }) {
  const evaluation = state?.evaluation ?? null;
  const percent = evaluation ? Math.round(evaluation.winProbability * 100) : 50;
  const equityText = evaluation ? signedEquityText(evaluation.equity, 2) : '…';
  return (
    <div className="eval-bar">
      {/* biome-ignore lint/a11y/useSemanticElements: a meter element would add native-widget styling the board design replaces */}
      <div
        role="meter"
        aria-label="Evaluation"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={percent}
        aria-valuetext={`White wins ${percent}% of the time`}
        className="eval-track"
      >
        <span className="eval-fill" style={{ width: `${percent}%` }} />
        <span className="eval-tick" aria-hidden="true" />
      </div>
      <span className="eval-caption">
        {percent}% · {equityText}
      </span>
    </div>
  );
}

const FEEDBACK_LABEL = {
  ok: 'Good',
  dubious: 'Dubious',
  error: 'Error',
  blunder: 'Blunder',
} as const;

/** Post-play feedback (GLOSSARY): classification, cost, and the better play. */
function FeedbackNote({ feedback }: { feedback: TutorFeedback }) {
  const label =
    feedback.equityLoss === 0
      ? 'Best play'
      : FEEDBACK_LABEL[feedback.classification];
  return (
    <p className="tutor-note" role="note" aria-label="Play feedback">
      <span
        className={`feedback-chip feedback-chip--${feedback.classification}`}
      >
        {label}
      </span>
      {feedback.equityLoss > 0 && (
        <span className="tutor-note-loss">
          {' '}
          −{feedback.equityLoss.toFixed(2)}
        </span>
      )}
      {feedback.classification !== 'ok' && (
        <span> · Best: {feedback.bestMoveText}</span>
      )}
    </p>
  );
}

export function Play({
  store: injectedStore,
  engine: injectedEngine,
  defaultSetup,
  opponentStepMs,
  storage: injectedStorage,
  resumeMatchId,
}: PlayProps = {}) {
  const [store, setStore] = useState(() => injectedStore ?? createPlayStore());
  const [engine] = useState(() => injectedEngine ?? getPlayEngine());
  const [storage] = useState(() => injectedStorage ?? getMatchStorage());
  const { match } = useSyncExternalStore(store.subscribe, store.getState);
  const engineStatus = useSyncExternalStore(
    engine.onStatusChange,
    () => engine.status,
  );
  const [setup, setSetup] = useState<PlaySetup>(
    defaultSetup ?? { mode: 'computer', difficulty: 'casual', length: 7 },
  );
  const [selected, setSelected] = useState<Point | 'bar' | null>(null);
  const [resignOpen, setResignOpen] = useState(false);
  const [declineNote, setDeclineNote] = useState<string | null>(null);
  const [opponentState, setOpponentState] =
    useState<EngineOpponentState>(IDLE_OPPONENT);
  const opponentRef = useRef<EngineOpponent | null>(null);
  const previousMatch = useRef<MatchState | null>(null);
  // Tutor mode starts from its stored default (ticket 20); the toggle then
  // rules the live match alone and never writes the default back.
  const [tutorOn, setTutorOn] = useState(() =>
    getStoredSwitch(TUTOR_DEFAULT_KEY, false),
  );
  const [tutorState, setTutorState] = useState<TutorState | null>(null);
  const tutorRef = useRef<Tutor | null>(null);
  const autopilotRef = useRef<RaceAutopilot | null>(null);
  const [autopilotOn, setAutopilotOn] = useState(false);
  // The checker-animation speed paces the opponent's and autoplay's visible
  // steps too (ticket 20), so "fast" feels fast end to end. An injected
  // opponentStepMs (tests) always wins.
  const [animationSpeed] = useAnimationSpeed();
  const stepMs = opponentStepMs ?? stepMsFor(animationSpeed);
  const persistence = useMatchPersistence(store, storage);
  // Ticket 08: finished games analyze themselves in the background.
  useAutoAnalysis(store, storage);
  const autoResumed = useRef(false);

  // Start the lazy engine load on first visit; the shell stays usable and
  // failures surface through the observable status.
  useEffect(() => {
    engine.initialize().catch(() => {});
  }, [engine]);

  // The engine opponent lives alongside a vs-computer match, driving Black
  // through the same store the human plays White through.
  useEffect(() => {
    if (setup.mode !== 'computer') {
      setOpponentState(IDLE_OPPONENT);
      return;
    }
    const engineOpponent = createEngineOpponent({
      store,
      engine,
      player: 'black',
      difficulty: setup.difficulty,
      stepMs,
    });
    opponentRef.current = engineOpponent;
    setOpponentState(engineOpponent.getState());
    const unsubscribe = engineOpponent.subscribe(() =>
      setOpponentState(engineOpponent.getState()),
    );
    return () => {
      unsubscribe();
      engineOpponent.dispose();
      opponentRef.current = null;
    };
  }, [store, engine, setup, stepMs]);

  // Tutor mode (GLOSSARY): one toggle enabling all live analysis. The
  // controller lives exactly as long as the toggle is on in a vs-computer
  // setting; everything it offers runs at full engine strength.
  useEffect(() => {
    if (!tutorOn || setup.mode !== 'computer') {
      setTutorState(null);
      return;
    }
    const tutor = createTutor({ store, engine, player: 'white' });
    tutorRef.current = tutor;
    setTutorState(tutor.getState());
    const unsubscribe = tutor.subscribe(() => setTutorState(tutor.getState()));
    return () => {
      unsubscribe();
      tutor.dispose();
      tutorRef.current = null;
    };
  }, [store, engine, tutorOn, setup.mode]);

  const game = match?.game ?? null;
  const phase = match?.phase ?? null;
  const turn = game?.turn ?? null;
  const vsComputer = setup.mode === 'computer';

  // The autoplay controller (spec stories 43-44) acts for every human side —
  // just White vs the computer, both in hot-seat. Its two settings live in
  // Settings alone (ticket 25); reading localStorage at decision time keeps
  // a flip made there honored from the next decision moment on.
  useEffect(() => {
    const autoplay = createAutoplay({
      store,
      players: vsComputer ? ['white'] : ['white', 'black'],
      settings: () => ({
        autoRollRaces: getStoredSwitch(AUTO_ROLL_RACES_KEY, true),
        autoForcedPlays: getStoredSwitch(AUTO_FORCED_PLAYS_KEY, true),
      }),
      stepMs,
    });
    return () => {
      autoplay.dispose();
    };
  }, [store, vsComputer, stepMs]);

  // The race autopilot (spec story 59) lives alongside a vs-computer match
  // only — in hot-seat its button never appears and no controller runs.
  useEffect(() => {
    if (!vsComputer) {
      setAutopilotOn(false);
      return;
    }
    const autopilot = createRaceAutopilot({
      store,
      engine,
      player: 'white',
      stepMs,
    });
    autopilotRef.current = autopilot;
    setAutopilotOn(autopilot.getState().active);
    const unsubscribe = autopilot.subscribe(() =>
      setAutopilotOn(autopilot.getState().active),
    );
    return () => {
      unsubscribe();
      autopilot.dispose();
      autopilotRef.current = null;
      setAutopilotOn(false);
    };
  }, [store, engine, vsComputer, stepMs]);

  // biome-ignore lint/correctness/useExhaustiveDependencies: selection is per-position; any turn change (movement, undo, commit) invalidates it
  useEffect(() => {
    setSelected(null);
  }, [turn]);

  // biome-ignore lint/correctness/useExhaustiveDependencies: the picker belongs to one decision moment; any phase change closes it
  useEffect(() => {
    setResignOpen(false);
  }, [phase]);

  // When doubling is impossible the pre-roll moment carries no decision, so
  // the human's dice roll themselves (minimal friction, as before).
  useEffect(() => {
    if (match?.phase !== 'pre-roll') {
      return;
    }
    if (vsComputer && match.toRoll !== 'white') {
      return;
    }
    if (!canDouble(match)) {
      store.dispatch({ type: 'roll' });
    }
  }, [match, vsComputer, store]);

  // A declined resignation leaves a short note on the status line, cleared by
  // the next visible progress.
  useEffect(() => {
    const previous = previousMatch.current;
    previousMatch.current = match;
    if (!match || !previous || match === previous) {
      return;
    }
    const last = match.decisions[match.decisions.length - 1];
    if (
      previous.phase === 'resign-offered' &&
      match.phase !== 'resign-offered' &&
      last?.type === 'resign-response' &&
      !last.accepted
    ) {
      setDeclineNote(`${playerName(last.player)} declined — play on.`);
    } else if (
      match.phase !== previous.phase ||
      match.game.record.plays !== previous.game.record.plays
    ) {
      setDeclineNote(null);
    }
  }, [match]);

  const board = game?.board ?? initialBoard();
  // The race autopilot's moment (spec story 59): a vs-computer Race with the
  // game still live. Everywhere else — contact, hot-seat, a settled game —
  // the button stays out of the controls.
  const autopilotAvailable =
    vsComputer &&
    match != null &&
    phase !== 'game-over' &&
    phase !== 'match-over' &&
    isRace(board);
  const dance = isDance(game);
  const forced =
    game && turn && turn.movements.length === 0 ? forcedPlay(game) : null;
  const humanSide = (player: Player | null | undefined) =>
    player != null && (!vsComputer || player === 'white');
  const humanTurn = phase === 'turn' && humanSide(turn?.player);
  const humanPreRoll = phase === 'pre-roll' && humanSide(match?.toRoll);
  // A takeback can land while the engine thinks: the moment the decision is
  // the human's again, the stale in-flight think is no longer worth showing.
  const thinking =
    vsComputer && opponentState.thinking && !humanTurn && !humanPreRoll;
  /** Whose decision the moment is, for the active-chip highlight. */
  const actor: Player | null =
    phase === 'turn'
      ? (turn?.player ?? null)
      : phase === 'pre-roll'
        ? (match?.toRoll ?? null)
        : phase === 'cube-offered' && match?.toRoll
          ? opponent(match.toRoll)
          : phase === 'resign-offered' && match?.pendingResignation
            ? opponent(match.pendingResignation.by)
            : null;

  function start(mode: PlayMode): void {
    setSetup((current) => ({ ...current, mode }));
    if (mode !== 'computer') {
      // Tutor mode is live analysis of the player's own game against the
      // engine; a hot-seat match switches it off before the match starts so
      // the fresh game is never marked tutor-assisted.
      setTutorOn(false);
      tutorRef.current?.dispose();
      tutorRef.current = null;
    }
    persistence.begin({
      mode,
      difficulty: setup.difficulty,
      length: setup.length,
    });
    store.dispatch({ type: 'start', length: setup.length });
  }

  /** Pick a stored in-progress match back up exactly where it stood. */
  function resume(stored: StoredMatch): void {
    if (!stored.state) {
      return;
    }
    persistence.adopt(stored);
    setSetup(setupFromConfig(stored.config));
    setStore(createPlayStore({ match: stored.state }));
  }

  // Arriving from Analyze's "Resume": pick the named match up as soon as
  // storage has delivered it, once, and only before anything else starts.
  // biome-ignore lint/correctness/useExhaustiveDependencies: resume is recreated per render; the ref guards re-runs
  useEffect(() => {
    if (!resumeMatchId || autoResumed.current || match) {
      return;
    }
    const stored = persistence.resumable.find(
      (row) => row.id === resumeMatchId,
    );
    if (stored) {
      autoResumed.current = true;
      resume(stored);
    }
  }, [resumeMatchId, persistence.resumable, match]);

  function retryEngine(): void {
    // A stuck load or a failed boot needs a clean slate: drop the worker
    // (its boot promise may be cached-rejected) so initialize builds a fresh
    // one. A ready engine with only a transient opponent error keeps its
    // worker and just re-asks the opponent.
    if (engineStatus === 'loading' || engineStatus === 'error') {
      engine.dispose();
    }
    engine.initialize().catch(() => {});
    opponentRef.current?.retry();
  }

  const setupPickers = (
    <>
      <DifficultyPicker
        value={setup.difficulty}
        onChange={(difficulty) =>
          setSetup((current) => ({ ...current, difficulty }))
        }
      />
      <LengthPicker
        value={setup.length}
        onChange={(length) => setSetup((current) => ({ ...current, length }))}
      />
    </>
  );

  const startButtons = (primaryLabel: string, primaryMode: PlayMode) => {
    const otherMode: PlayMode =
      primaryMode === 'computer' ? 'hotseat' : 'computer';
    return (
      <>
        <button
          type="button"
          className="play-button play-button--primary"
          onClick={() => start(primaryMode)}
        >
          {primaryLabel}
        </button>
        <button
          type="button"
          className="play-button play-button--quiet"
          onClick={() => start(otherMode)}
        >
          {otherMode === 'computer' ? 'Play vs computer' : 'Hot-seat match'}
        </button>
      </>
    );
  };

  /** The newest in-progress match on offer to pick back up (reload safety). */
  const resumeCandidate = persistence.resumable[0] ?? null;

  const resumePrompt = resumeCandidate && (
    <div className="resume-note">
      <p className="resume-text">
        A match is waiting: {storedMatchName(resumeCandidate)}, White{' '}
        {resumeCandidate.score.white} · Black {resumeCandidate.score.black}.
      </p>
      <button
        type="button"
        className="play-button play-button--primary"
        onClick={() => resume(resumeCandidate)}
      >
        Resume match
      </button>
    </div>
  );

  const setupCard = (
    title: string,
    primaryLabel: string,
    primaryMode: PlayMode,
  ) => (
    <div className="play-banner">
      <div className="setup-card">
        <p className="setup-title">{title}</p>
        {resumePrompt}
        {setupPickers}
        <div className="setting-switches">
          <SettingSwitch
            label="Tutor mode"
            on={tutorOn}
            onChange={setTutorOn}
          />
        </div>
        {startButtons(primaryLabel, primaryMode)}
        {/* The preference controls live in Settings (ticket 25); one quiet
            pointer keeps them discoverable from here. */}
        <Link className="setup-settings-link" to="/settings">
          Board style, auto-play and more in Settings
        </Link>
        <EngineNote
          status={engineStatus}
          opponentError={opponentState.error}
          onRetry={retryEngine}
        />
      </div>
    </div>
  );

  /** Between games: the result, the standing, and the way onward. */
  const gameOverCard = (current: MatchState) => {
    const nextIsCrawford =
      !current.crawfordPlayed &&
      (current.score.white === current.length - 1 ||
        current.score.black === current.length - 1);
    return (
      <div className="play-banner">
        <div className="setup-card">
          <p className="setup-title">
            {current.gameResult ? gameEndText(current.gameResult) : ''}
          </p>
          <p className="score-line">
            White {current.score.white} · Black {current.score.black} — first to{' '}
            {current.length}
          </p>
          {nextIsCrawford && (
            <p className="dialog-note">
              Next is the Crawford game — no doubling.
            </p>
          )}
          <button
            type="button"
            className="play-button play-button--primary"
            onClick={() => store.dispatch({ type: 'next-game' })}
          >
            Next game
          </button>
        </div>
      </div>
    );
  };

  /** The match is decided: the summary, every game, and a fresh start. */
  const matchOverCard = (current: MatchState) => {
    const winner = current.winner ?? 'white';
    return (
      <div className="play-banner">
        <div className="setup-card">
          <p className="setup-title">
            {playerName(winner)} wins the match {current.score[winner]}–
            {current.score[opponent(winner)]}
          </p>
          <ol className="match-games">
            {current.games.map((completed, index) => (
              <li
                // biome-ignore lint/suspicious/noArrayIndexKey: games are an append-only sequence
                key={index}
              >
                {playerName(completed.result.winner)} +{completed.result.points}
                {' — '}
                {completed.result.end === 'pass'
                  ? 'double passed'
                  : completed.result.end === 'resignation'
                    ? `resigned ${KIND_TEXT[completed.result.kind]}`
                    : KIND_TEXT[completed.result.kind]}
                {completed.crawford ? ' (Crawford)' : ''}
              </li>
            ))}
          </ol>
          {setupPickers}
          {startButtons('New match', setup.mode)}
          <EngineNote
            status={engineStatus}
            opponentError={opponentState.error}
            onRetry={retryEngine}
          />
        </div>
      </div>
    );
  };

  /** The opponent doubled: the user's take-or-pass decision. */
  const cubeDialog = (current: MatchState) => {
    const doubler = current.toRoll ?? 'white';
    const stake = current.cube.value;
    return (
      <div className="play-banner">
        <div className="setup-card">
          <p className="setup-title">
            {playerName(doubler)} doubles to {stake * 2}
          </p>
          <p className="dialog-note">
            Take to play on for {points(stake * 2)}, or pass to concede{' '}
            {points(stake)}.
          </p>
          <div className="dialog-actions">
            <button
              type="button"
              className="play-button play-button--primary"
              onClick={() => store.dispatch({ type: 'take' })}
            >
              Take
            </button>
            <button
              type="button"
              className="play-button"
              onClick={() => store.dispatch({ type: 'pass' })}
            >
              Pass
            </button>
          </div>
        </div>
      </div>
    );
  };

  /** The opponent offered to resign: the user accepts or declines. */
  const resignDialog = (
    current: MatchState,
    pending: { by: Player; kind: GameEndKind },
  ) => (
    <div className="play-banner">
      <div className="setup-card">
        <p className="setup-title">
          {playerName(pending.by)} offers to resign a {KIND_TEXT[pending.kind]}
        </p>
        <p className="dialog-note">
          Accept to win {points(KIND_POINTS[pending.kind] * current.cube.value)}
          , or decline to play on.
        </p>
        <div className="dialog-actions">
          <button
            type="button"
            className="play-button play-button--primary"
            onClick={() => store.dispatch({ type: 'accept-resign' })}
          >
            Accept
          </button>
          <button
            type="button"
            className="play-button"
            onClick={() => store.dispatch({ type: 'decline-resign' })}
          >
            Decline
          </button>
        </div>
      </div>
    </div>
  );

  const resignButton = match && (
    <button
      type="button"
      className="play-button play-button--quiet"
      onClick={() => setResignOpen(true)}
    >
      Resign…
    </button>
  );

  const resignPicker = match && (
    <div className="play-controls">
      <span className="resign-label">Resign:</span>
      {(['single', 'gammon', 'backgammon'] as const).map((kind) => (
        <button
          key={kind}
          type="button"
          className="play-button"
          onClick={() => store.dispatch({ type: 'resign', kind })}
        >
          {RESIGN_LABEL[kind]}
          {` — ${points(KIND_POINTS[kind] * match.cube.value)}`}
        </button>
      ))}
      <button
        type="button"
        className="play-button play-button--quiet"
        onClick={() => setResignOpen(false)}
      >
        Cancel
      </button>
    </div>
  );

  const status = statusText(match ?? null, thinking, vsComputer);
  const xgid = currentXgid(match ?? null);

  return (
    <section className="play-area">
      <h1>Play</h1>
      {/* Ticket 24: portrait phones see a one-line nudge toward the play
          orientation; CSS keeps it off every other viewport. */}
      <p className="rotate-hint">
        Turn your phone sideways for a bigger board.
      </p>
      <div className="play-hud">
        <div
          className={`player-chip ${actor === 'white' ? 'player-chip--active' : ''}`}
        >
          <span className="chip-swatch chip-swatch--white" aria-hidden="true" />
          <span className="chip-name">White</span>
          {/* biome-ignore lint/a11y/useSemanticElements: a labelled inline stat; fieldset/section would be wrong semantics */}
          <span className="chip-pips" role="group" aria-label="White pip count">
            {pipCount(board, 'white')}
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
              {match.length === 1
                ? '1-point match'
                : `${match.length}-point match`}
              {match.crawford && (
                <span className="crawford-badge">Crawford — no doubling</span>
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
                on={tutorOn}
                onChange={setTutorOn}
              />
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
              {difficultyLabel(setup.difficulty)}
              {thinking && (
                <span className="chip-thinking" aria-hidden="true" />
              )}
            </span>
          )}
          {/* biome-ignore lint/a11y/useSemanticElements: a labelled inline stat; fieldset/section would be wrong semantics */}
          <span className="chip-pips" role="group" aria-label="Black pip count">
            {pipCount(board, 'black')}
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

      {match && vsComputer && tutorOn && (
        <div className="tutor-strip">
          <EvalBar state={tutorState} />
          {tutorState?.hint && (
            <p className="tutor-note" role="note" aria-label="Hint">
              Best: {tutorState.hint.moveText}
            </p>
          )}
          {tutorState?.feedback && (
            <FeedbackNote feedback={tutorState.feedback} />
          )}
          {canTakeback(match, 'white') && (
            <button
              type="button"
              className="play-button play-button--quiet"
              onClick={() =>
                store.dispatch({ type: 'takeback', player: 'white' })
              }
            >
              Take back
            </button>
          )}
        </div>
      )}

      {/* Board first, turn controls after: the DOM (and tab) order runs
          board origins → destinations → controls. During a match the
          controls sit beside the board at desktop width and wrap below it
          at the HUD-wrap breakpoint (board.css). */}
      <div className="play-layout">
        <div className="play-board">
          <Board
            game={game}
            selected={selected}
            onSelect={setSelected}
            onMove={(from, die) =>
              store.dispatch({ type: 'movement', from, die })
            }
            cube={match ? { ...match.cube, outOfPlay: match.crawford } : null}
            interactive={humanTurn}
          />
          {!match &&
            setupCard('Play against the computer', 'Play as White', 'computer')}
          {match && phase === 'game-over' && gameOverCard(match)}
          {match && phase === 'match-over' && matchOverCard(match)}
          {match &&
            phase === 'cube-offered' &&
            match.toRoll &&
            humanSide(opponent(match.toRoll)) &&
            cubeDialog(match)}
          {match &&
            phase === 'resign-offered' &&
            match.pendingResignation &&
            humanSide(opponent(match.pendingResignation.by)) &&
            resignDialog(match, match.pendingResignation)}
        </div>

        {match && (
          <div className="play-side">
            {humanTurn && resignOpen && resignPicker}
            {humanTurn && !resignOpen && (
              <div className="play-controls">
                <button
                  type="button"
                  className="play-button"
                  disabled={!canUndo(game)}
                  onClick={() => store.dispatch({ type: 'undo' })}
                >
                  Undo
                </button>
                {dance ? (
                  <button
                    type="button"
                    className="play-button play-button--primary"
                    onClick={() => store.dispatch({ type: 'commit' })}
                  >
                    Continue
                  </button>
                ) : (
                  <>
                    {forced && (
                      <button
                        type="button"
                        className="play-button play-button--primary"
                        onClick={() => store.dispatch({ type: 'forced' })}
                      >
                        Play forced play
                      </button>
                    )}
                    <button
                      type="button"
                      className={`play-button ${forced ? '' : 'play-button--primary'}`}
                      disabled={!canCommit(game)}
                      onClick={() => store.dispatch({ type: 'commit' })}
                    >
                      Commit play
                    </button>
                    {vsComputer && tutorOn && (
                      <button
                        type="button"
                        className="play-button"
                        disabled={
                          (tutorState?.hintPending ?? false) ||
                          tutorState?.hint != null
                        }
                        onClick={() => tutorRef.current?.requestHint()}
                      >
                        Hint
                      </button>
                    )}
                  </>
                )}
                {resignButton}
              </div>
            )}
            {humanPreRoll && resignOpen && resignPicker}
            {humanPreRoll && !resignOpen && canDouble(match) && (
              <div className="play-controls">
                <button
                  type="button"
                  className="play-button"
                  onClick={() => store.dispatch({ type: 'double' })}
                >
                  Double to {match.cube.value * 2}
                </button>
                <button
                  type="button"
                  className="play-button play-button--primary"
                  onClick={() => store.dispatch({ type: 'roll' })}
                >
                  Roll
                </button>
                {resignButton}
              </div>
            )}
            {!humanTurn &&
              !humanPreRoll &&
              phase !== 'game-over' &&
              phase !== 'match-over' && (
                <div className="play-controls play-controls--note">
                  <EngineNote
                    status={engineStatus}
                    opponentError={opponentState.error}
                    onRetry={retryEngine}
                  />
                </div>
              )}
            {autopilotAvailable && (
              <div className="play-controls play-controls--autopilot">
                <button
                  type="button"
                  className="play-button autopilot-button"
                  aria-pressed={autopilotOn}
                  onClick={() => {
                    const autopilot = autopilotRef.current;
                    if (!autopilot) {
                      return;
                    }
                    if (autopilotOn) {
                      autopilot.stop();
                    } else {
                      autopilot.start();
                    }
                  }}
                >
                  {autopilotOn && (
                    <span className="autopilot-dot" aria-hidden="true" />
                  )}
                  Finish race
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
