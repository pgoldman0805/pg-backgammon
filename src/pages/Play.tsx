import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { useAutoAnalysis } from '../analysis';
import type { Difficulty, Engine, EngineStatus } from '../engine';
import { Board } from '../play/Board';
import { getPlayEngine } from '../play/engineInstance';
import {
  createEngineOpponent,
  type EngineOpponent,
  type EngineOpponentState,
} from '../play/opponent';
import { canCommit, canUndo, forcedPlay, isDance } from '../play/selectors';
import { createPlayStore, type PlayStore } from '../play/store';
import {
  canDouble,
  type GameEndKind,
  initialBoard,
  type MatchGameResult,
  type MatchState,
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
const DIFFICULTIES: ReadonlyArray<{ id: Difficulty; label: string }> = [
  { id: 'beginner', label: 'Beginner' },
  { id: 'casual', label: 'Casual' },
  { id: 'intermediate', label: 'Intermediate' },
  { id: 'expert', label: 'Expert' },
  { id: 'world-class', label: 'World-class' },
];

function difficultyLabel(difficulty: Difficulty): string {
  return DIFFICULTIES.find((d) => d.id === difficulty)?.label ?? difficulty;
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

function name(player: Player): string {
  return player === 'white' ? 'White' : 'Black';
}

function other(player: Player): Player {
  return player === 'white' ? 'black' : 'white';
}

function points(n: number): string {
  return n === 1 ? '1 point' : `${n} points`;
}

/** How the finished game ended, e.g. "White wins a gammon — 2 points." */
function gameEndText(result: MatchGameResult): string {
  switch (result.end) {
    case 'checkers':
      return `${name(result.winner)} wins a ${KIND_TEXT[result.kind]} — ${points(result.points)}.`;
    case 'pass':
      return `${name(other(result.winner))} passes the double — ${name(result.winner)} wins ${points(result.points)}.`;
    case 'resignation':
      return `${name(other(result.winner))} resigns a ${KIND_TEXT[result.kind]} — ${name(result.winner)} wins ${points(result.points)}.`;
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
      return `${name(winner)} wins the match ${match.score[winner]}–${match.score[other(winner)]}.`;
    }
    case 'game-over':
      return match.gameResult ? gameEndText(match.gameResult) : '';
    case 'cube-offered': {
      const doubler = match.toRoll ?? 'white';
      return `${name(doubler)} doubles to ${match.cube.value * 2}.${considering(other(doubler))}`;
    }
    case 'resign-offered': {
      const pending = match.pendingResignation;
      if (!pending) {
        return '';
      }
      return `${name(pending.by)} offers to resign a ${KIND_TEXT[pending.kind]}.${considering(other(pending.by))}`;
    }
    case 'pre-roll':
      return `${name(match.toRoll ?? 'white')} to roll.`;
    case 'turn': {
      const turn = match.game.turn;
      if (!turn) {
        return '';
      }
      const dice = `${turn.roll[0]} and ${turn.roll[1]}`;
      if (isDance(match.game)) {
        return `${name(turn.player)} rolled ${dice} — no legal plays.`;
      }
      if (forcedPlay(match.game)) {
        return `${name(turn.player)} to play ${dice} — only one legal play.`;
      }
      return `${name(turn.player)} to play ${dice}.`;
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
    return <p className="engine-note">Engine loading…</p>;
  }
  return null;
}

const IDLE_OPPONENT: EngineOpponentState = { thinking: false, error: null };

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
    const opponent = createEngineOpponent({
      store,
      engine,
      player: 'black',
      difficulty: setup.difficulty,
      stepMs: opponentStepMs,
    });
    opponentRef.current = opponent;
    setOpponentState(opponent.getState());
    const unsubscribe = opponent.subscribe(() =>
      setOpponentState(opponent.getState()),
    );
    return () => {
      unsubscribe();
      opponent.dispose();
      opponentRef.current = null;
    };
  }, [store, engine, setup, opponentStepMs]);

  const game = match?.game ?? null;
  const phase = match?.phase ?? null;
  const turn = game?.turn ?? null;
  const vsComputer = setup.mode === 'computer';

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
      setDeclineNote(`${name(last.player)} declined — play on.`);
    } else if (
      match.phase !== previous.phase ||
      match.game.record.plays !== previous.game.record.plays
    ) {
      setDeclineNote(null);
    }
  }, [match]);

  const board = game?.board ?? initialBoard();
  const dance = isDance(game);
  const forced =
    game && turn && turn.movements.length === 0 ? forcedPlay(game) : null;
  const humanSide = (player: Player | null | undefined) =>
    player != null && (!vsComputer || player === 'white');
  const humanTurn = phase === 'turn' && humanSide(turn?.player);
  const humanPreRoll = phase === 'pre-roll' && humanSide(match?.toRoll);
  const thinking = vsComputer && opponentState.thinking;
  /** Whose decision the moment is, for the active-chip highlight. */
  const actor: Player | null =
    phase === 'turn'
      ? (turn?.player ?? null)
      : phase === 'pre-roll'
        ? (match?.toRoll ?? null)
        : phase === 'cube-offered' && match?.toRoll
          ? other(match.toRoll)
          : phase === 'resign-offered' && match?.pendingResignation
            ? other(match.pendingResignation.by)
            : null;

  function start(mode: PlayMode): void {
    setSetup((current) => ({ ...current, mode }));
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
        {startButtons(primaryLabel, primaryMode)}
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
            {name(winner)} wins the match {current.score[winner]}–
            {current.score[other(winner)]}
          </p>
          <ol className="match-games">
            {current.games.map((completed, index) => (
              <li
                // biome-ignore lint/suspicious/noArrayIndexKey: games are an append-only sequence
                key={index}
              >
                {name(completed.result.winner)} +{completed.result.points}
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
            {name(doubler)} doubles to {stake * 2}
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
          {name(pending.by)} offers to resign a {KIND_TEXT[pending.kind]}
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

  return (
    <section className="play-area">
      <h1>Play</h1>
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
            </p>
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
          humanSide(other(match.toRoll)) &&
          cubeDialog(match)}
        {match &&
          phase === 'resign-offered' &&
          match.pendingResignation &&
          humanSide(other(match.pendingResignation.by)) &&
          resignDialog(match, match.pendingResignation)}
      </div>

      {match && humanTurn && resignOpen && resignPicker}
      {match && humanTurn && !resignOpen && (
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
                  Play forced move
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
            </>
          )}
          {resignButton}
        </div>
      )}
      {match && humanPreRoll && resignOpen && resignPicker}
      {match && humanPreRoll && !resignOpen && canDouble(match) && (
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
      {match &&
        !humanTurn &&
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
    </section>
  );
}
