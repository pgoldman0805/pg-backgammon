import { useEffect, useState, useSyncExternalStore } from 'react';
import { Board } from '../play/Board';
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

function name(player: Player): string {
  return player === 'white' ? 'White' : 'Black';
}

function statusText(game: GameState | null): string {
  if (!game) {
    return 'Hot-seat backgammon: the opening roll decides who moves first.';
  }
  if (game.result) {
    return `${name(game.result.winner)} wins a ${KIND_TEXT[game.result.kind]}.`;
  }
  if (!game.turn) {
    return '';
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

export function Play({ store: injectedStore }: { store?: PlayStore } = {}) {
  const [store] = useState(() => injectedStore ?? createPlayStore());
  const { game } = useSyncExternalStore(store.subscribe, store.getState);
  const [selected, setSelected] = useState<Point | 'bar' | null>(null);

  const turn = game?.turn ?? null;
  // biome-ignore lint/correctness/useExhaustiveDependencies: selection is per-position; any turn change (movement, undo, commit) invalidates it
  useEffect(() => {
    setSelected(null);
  }, [turn]);

  const board = game?.board ?? initialBoard();
  const dance = isDance(game ?? null);
  const forced =
    game && turn && turn.movements.length === 0 ? forcedPlay(game) : null;

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
          {statusText(game)}
        </p>
        <div
          className={`player-chip player-chip--mirror ${turn?.player === 'black' ? 'player-chip--active' : ''}`}
        >
          <span className="chip-swatch chip-swatch--black" aria-hidden="true" />
          <span className="chip-name">Black</span>
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
        />
        {game?.result && (
          <div className="play-banner">
            <p className="play-banner-text">{statusText(game)}</p>
            <button
              type="button"
              className="play-button play-button--primary"
              onClick={() => store.dispatch({ type: 'start' })}
            >
              Play again
            </button>
          </div>
        )}
        {!game && (
          <div className="play-banner">
            <p className="play-banner-text">Two players, one board.</p>
            <button
              type="button"
              className="play-button play-button--primary"
              onClick={() => store.dispatch({ type: 'start' })}
            >
              Start game
            </button>
          </div>
        )}
      </div>

      {game && !game.result && (
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
    </section>
  );
}
