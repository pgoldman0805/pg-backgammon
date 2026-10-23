/**
 * The engine opponent: plays one side of a game through the same PlayStore
 * the human uses (the store ticket 03 designed for exactly this). It watches
 * the store, and on the engine's turn chooses a play via Engine.rankPlays at
 * its Difficulty, then dispatches the movements one by one — paced so the
 * human sees them happen — and commits.
 *
 * Dances and forced plays resolve from the rules engine alone (no engine
 * round-trip), so they keep working even while the engine payload loads.
 */

// Types come straight from the engine seam definition (not the module index)
// so this file stays free of browser-typed internals: it is compiled both in
// the app and in the node-typed test program (the real-WASM smoke test).
import type { Difficulty, Engine } from '../engine/types';
import type { Play, Player, TurnState } from '../rules';
import { forcedPlay, isDance } from './selectors';
import type { PlayStore } from './store';

export interface EngineOpponentState {
  /** True while a rankPlays call is in flight (the visible thinking state). */
  readonly thinking: boolean;
  /** Message of the last engine failure; null when healthy. */
  readonly error: string | null;
}

export interface EngineOpponentOptions {
  readonly store: PlayStore;
  readonly engine: Engine;
  /** The side the engine plays. */
  readonly player: Player;
  readonly difficulty: Difficulty;
  /** Pause between the opponent's visible steps, in milliseconds. */
  readonly stepMs?: number;
  /** Awaitable pause; injectable for tests. Defaults to setTimeout. */
  readonly pace?: (ms: number) => Promise<void>;
}

export interface EngineOpponent {
  getState(): EngineOpponentState;
  subscribe(listener: () => void): () => void;
  /** Re-attempt the current turn after an engine failure. */
  retry(): void;
  /** Stop watching the store and discard any in-flight action. */
  dispose(): void;
}

const defaultPace = (ms: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, ms));

export function createEngineOpponent(
  options: EngineOpponentOptions,
): EngineOpponent {
  const { store, engine, player, difficulty } = options;
  const stepMs = options.stepMs ?? 450;
  const pace = options.pace ?? defaultPace;

  let state: EngineOpponentState = { thinking: false, error: null };
  const listeners = new Set<() => void>();
  let disposed = false;
  /** Roll identity of the turn being (or already) acted on. */
  let attempted: TurnState['roll'] | null = null;

  function setState(next: EngineOpponentState): void {
    if (
      disposed ||
      (state.thinking === next.thinking && state.error === next.error)
    ) {
      return;
    }
    state = next;
    for (const listener of listeners) {
      listener();
    }
  }

  async function takeTurn(turn: TurnState): Promise<void> {
    const token = turn.roll;
    /** The turn is still ours to play (same roll, not disposed). */
    const live = () => !disposed && store.getState().game?.turn?.roll === token;
    try {
      const game = store.getState().game;

      // A beat before acting, so the engine's roll is visible first.
      await pace(stepMs);
      if (!live()) {
        return;
      }

      if (isDance(game)) {
        store.dispatch({ type: 'commit' });
        return;
      }

      let play: Play | null = forcedPlay(game);
      if (!play) {
        setState({ thinking: true, error: null });
        const ranked = await engine.rankPlays(
          { board: turn.startBoard, onRoll: player },
          turn.roll,
          { difficulty },
        );
        setState({ thinking: false, error: null });
        if (!live()) {
          return;
        }
        play = ranked[0]?.play ?? null;
        if (!play) {
          return;
        }
      }

      for (const movement of play.movements) {
        store.dispatch({
          type: 'movement',
          from: movement.from,
          die: movement.die,
        });
        await pace(stepMs);
        if (!live()) {
          return;
        }
      }
      store.dispatch({ type: 'commit' });
    } catch (error) {
      attempted = null;
      setState({
        thinking: false,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  function maybeAct(): void {
    if (disposed || state.error) {
      return;
    }
    const game = store.getState().game;
    const turn = game?.turn;
    if (!game || !turn || game.result) {
      return;
    }
    if (turn.player !== player || turn.movements.length > 0) {
      return;
    }
    if (attempted === turn.roll) {
      return;
    }
    attempted = turn.roll;
    void takeTurn(turn);
  }

  const unsubscribe = store.subscribe(maybeAct);
  maybeAct();

  return {
    getState: () => state,
    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    retry() {
      if (disposed) {
        return;
      }
      setState({ thinking: false, error: null });
      maybeAct();
    },
    dispose() {
      disposed = true;
      unsubscribe();
      listeners.clear();
    },
  };
}
