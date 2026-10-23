import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
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
  type GameState,
  initialBoard,
  type Player,
  type Point,
  pipCount,
} from '../rules';
import '../play/board.css';

const KIND_TEXT = {
  single: 'single game',
  gammon: 'gammon',
  backgammon: 'backgammon',
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
}

export interface PlayProps {
  /** Injectable for tests; defaults to a fresh store with fair dice. */
  store?: PlayStore;
  /** Injectable for tests; defaults to the shared lazily-loaded engine. */
  engine?: Engine;
  /** Initial mode and difficulty; mode governs injected in-progress games. */
  defaultSetup?: PlaySetup;
  /** Pause between the computer's visible steps, in milliseconds. */
  opponentStepMs?: number;
}

function name(player: Player): string {
  return player === 'white' ? 'White' : 'Black';
}

function statusText(game: GameState | null, thinking: boolean): string {
  if (!game) {
    return '';
  }
  if (game.result) {
    return `${name(game.result.winner)} wins a ${KIND_TEXT[game.result.kind]}.`;
  }
  if (!game.turn) {
    return '';
  }
  if (thinking) {
    return 'Black is thinking…';
  }
  const { player, roll } = game.turn;
  const dice = `${roll[0]} and ${roll[1]}`;
  if (isDance(game)) {
    return `${name(player)} rolled ${dice} — no legal plays.`;
  }
  if (forcedPlay(game)) {
    return `${name(player)} to play ${dice} — only one legal play.`;
  }
  return `${name(player)} to play ${dice}.`;
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
}: PlayProps = {}) {
  const [store] = useState(() => injectedStore ?? createPlayStore());
  const [engine] = useState(() => injectedEngine ?? getPlayEngine());
  const { game } = useSyncExternalStore(store.subscribe, store.getState);
  const engineStatus = useSyncExternalStore(
    engine.onStatusChange,
    () => engine.status,
  );
  const [setup, setSetup] = useState<PlaySetup>(
    defaultSetup ?? { mode: 'computer', difficulty: 'casual' },
  );
  const [selected, setSelected] = useState<Point | 'bar' | null>(null);
  const [opponentState, setOpponentState] =
    useState<EngineOpponentState>(IDLE_OPPONENT);
  const opponentRef = useRef<EngineOpponent | null>(null);

  // Start the lazy engine load on first visit; the shell stays usable and
  // failures surface through the observable status.
  useEffect(() => {
    engine.initialize().catch(() => {});
  }, [engine]);

  // The engine opponent lives alongside a vs-computer game, driving Black
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

  const turn = game?.turn ?? null;
  // biome-ignore lint/correctness/useExhaustiveDependencies: selection is per-position; any turn change (movement, undo, commit) invalidates it
  useEffect(() => {
    setSelected(null);
  }, [turn]);

  const board = game?.board ?? initialBoard();
  const dance = isDance(game ?? null);
  const forced =
    game && turn && turn.movements.length === 0 ? forcedPlay(game) : null;
  const vsComputer = setup.mode === 'computer';
  const humanTurn = turn !== null && (!vsComputer || turn.player === 'white');
  const thinking = vsComputer && opponentState.thinking;

  function start(mode: PlayMode): void {
    setSetup((current) => ({ ...current, mode }));
    store.dispatch({ type: 'start' });
  }

  function retryEngine(): void {
    engine.initialize().catch(() => {});
    opponentRef.current?.retry();
  }

  const setupCard = (
    title: string,
    primaryLabel: string,
    primaryMode: PlayMode,
  ) => {
    const otherMode: PlayMode =
      primaryMode === 'computer' ? 'hotseat' : 'computer';
    return (
      <div className="play-banner">
        <div className="setup-card">
          <p className="setup-title">{title}</p>
          <DifficultyPicker
            value={setup.difficulty}
            onChange={(difficulty) =>
              setSetup((current) => ({ ...current, difficulty }))
            }
          />
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
            {otherMode === 'computer' ? 'Play vs computer' : 'Hot-seat game'}
          </button>
          <EngineNote
            status={engineStatus}
            opponentError={opponentState.error}
            onRetry={retryEngine}
          />
        </div>
      </div>
    );
  };

  return (
    <section className="play-area">
      <h1>Play</h1>
      <div className="play-hud">
        <div
          className={`player-chip ${turn?.player === 'white' ? 'player-chip--active' : ''}`}
        >
          <span className="chip-swatch chip-swatch--white" aria-hidden="true" />
          <span className="chip-name">White</span>
          {/* biome-ignore lint/a11y/useSemanticElements: a labelled inline stat; fieldset/section would be wrong semantics */}
          <span className="chip-pips" role="group" aria-label="White pip count">
            {pipCount(board, 'white')}
          </span>
        </div>
        <p className="play-status" role="status">
          {statusText(game, thinking)}
        </p>
        <div
          className={`player-chip player-chip--mirror ${turn?.player === 'black' ? 'player-chip--active' : ''}`}
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
          interactive={humanTurn && !game?.result}
        />
        {game?.result &&
          setupCard(statusText(game, false), 'Play again', setup.mode)}
        {!game &&
          setupCard('Play against the computer', 'Play as White', 'computer')}
      </div>

      {game && !game.result && humanTurn && (
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
        </div>
      )}
      {game && !game.result && !humanTurn && (
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
