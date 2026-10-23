/**
 * The engine opponent: plays one side of a match through the same PlayStore
 * the human uses. It watches the store and acts whenever a decision is the
 * engine's: checker plays via Engine.rankPlays at its Difficulty, cube
 * decisions via Engine.cubeInfo with full match context, resignation
 * responses via Engine.evaluate — each paced so the human sees them happen.
 *
 * Dances and forced plays resolve from the rules engine alone (no engine
 * round-trip), so they keep working even while the engine payload loads.
 */

// Types come straight from the engine seam definition (not the module index)
// so this file stays free of browser-typed internals: it is compiled both in
// the app and in the node-typed test program (the real-WASM smoke test).
import type { Difficulty, Engine, MatchContext } from '../engine/types';
import {
  canDouble,
  type GameEndKind,
  type MatchState,
  type Play,
  type Player,
} from '../rules';
import { forcedPlay, isDance } from './selectors';
import type { PlayStore } from './store';

export interface EngineOpponentState {
  /** True while an engine call is in flight (the visible thinking state). */
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
  /** Re-attempt the current decision after an engine failure. */
  retry(): void;
  /** Stop watching the store and discard any in-flight action. */
  dispose(): void;
}

const defaultPace = (ms: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, ms));

const opposing = (player: Player): Player =>
  player === 'white' ? 'black' : 'white';

/** The match context the engine needs for match-aware evaluation. */
export function matchContext(match: MatchState): MatchContext {
  return {
    matchLength: match.length,
    score: match.score,
    crawford: match.crawford,
    cube: match.cube,
  };
}

/** gnubg's proper cube action recommends turning the cube now. */
export function recommendsDouble(properAction: string): boolean {
  return /^(re)?double/i.test(properAction.trim());
}

/** gnubg's proper cube action recommends the doubled player pass. */
export function recommendsPass(properAction: string): boolean {
  return /pass$/i.test(properAction.trim());
}

const KIND_POINTS: Record<GameEndKind, number> = {
  single: 1,
  gammon: 2,
  backgammon: 3,
};

/**
 * One decision moment, identified by object identity of the plays record (a
 * new array every commit, a new game every match/game start) plus the phase
 * and the count of recorded decisions. Stale engine answers never land.
 */
interface DecisionToken {
  readonly phase: MatchState['phase'];
  readonly plays: MatchState['game']['record']['plays'];
  readonly decisions: number;
}

function tokenFor(match: MatchState): DecisionToken {
  return {
    phase: match.phase,
    plays: match.game.record.plays,
    decisions: match.decisions.length,
  };
}

function sameToken(a: DecisionToken | null, b: DecisionToken | null): boolean {
  return (
    a !== null &&
    b !== null &&
    a.phase === b.phase &&
    a.plays === b.plays &&
    a.decisions === b.decisions
  );
}

export function createEngineOpponent(
  options: EngineOpponentOptions,
): EngineOpponent {
  const { store, engine, player, difficulty } = options;
  const stepMs = options.stepMs ?? 450;
  const pace = options.pace ?? defaultPace;

  let state: EngineOpponentState = { thinking: false, error: null };
  const listeners = new Set<() => void>();
  let disposed = false;
  /** The decision moment being (or already) acted on. */
  let attempted: DecisionToken | null = null;

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

  /** The current match if the captured decision moment is still live. */
  function liveMatch(token: DecisionToken): MatchState | null {
    if (disposed) {
      return null;
    }
    const match = store.getState().match;
    return match && sameToken(tokenFor(match), token) ? match : null;
  }

  async function think<T>(work: Promise<T>): Promise<T> {
    setState({ thinking: true, error: null });
    try {
      return await work;
    } finally {
      setState({ thinking: false, error: state.error });
    }
  }

  /** Pre-roll: consider doubling (cube info with match context), then roll. */
  async function actPreRoll(token: DecisionToken, match: MatchState) {
    await pace(stepMs);
    if (!liveMatch(token)) {
      return;
    }
    if (canDouble(match)) {
      const analysis = await think(
        engine.cubeInfo({
          board: match.game.board,
          onRoll: player,
          match: matchContext(match),
        }),
      );
      if (!liveMatch(token)) {
        return;
      }
      if (recommendsDouble(analysis.properAction)) {
        store.dispatch({ type: 'double' });
        return;
      }
    }
    store.dispatch({ type: 'roll' });
  }

  /** The human doubled: answer from the doubler's cube analysis. */
  async function actCubeOffered(token: DecisionToken, match: MatchState) {
    await pace(stepMs);
    if (!liveMatch(token)) {
      return;
    }
    const doubler = match.toRoll as Player;
    const analysis = await think(
      engine.cubeInfo({
        board: match.game.board,
        onRoll: doubler,
        match: matchContext(match),
      }),
    );
    if (!liveMatch(token)) {
      return;
    }
    store.dispatch({
      type: recommendsPass(analysis.properAction) ? 'pass' : 'take',
    });
  }

  /**
   * The human offered to resign: accept when the offered points cover the
   * engine's expected equity from playing on, decline otherwise.
   */
  async function actResignation(token: DecisionToken, match: MatchState) {
    const pending = match.pendingResignation;
    if (!pending) {
      return;
    }
    await pace(stepMs);
    if (!liveMatch(token)) {
      return;
    }
    const onRoll =
      match.resumePhase === 'turn' && match.game.turn
        ? match.game.turn.player
        : (match.toRoll ?? player);
    const evaluation = await think(
      engine.evaluate({
        board: match.game.board,
        onRoll,
        match: matchContext(match),
      }),
    );
    if (!liveMatch(token)) {
      return;
    }
    const ourEquity =
      onRoll === player ? evaluation.equity : -evaluation.equity;
    const offered = KIND_POINTS[pending.kind];
    store.dispatch({
      type: offered + 1e-9 >= ourEquity ? 'accept-resign' : 'decline-resign',
    });
  }

  /** The engine's rolled turn: dance, forced play, or ranked checker play. */
  async function actTurn(token: DecisionToken, match: MatchState) {
    const turn = match.game.turn;
    if (!turn) {
      return;
    }
    // A beat before acting, so the engine's roll is visible first.
    await pace(stepMs);
    if (!liveMatch(token)) {
      return;
    }

    if (isDance(match.game)) {
      store.dispatch({ type: 'commit' });
      return;
    }

    let play: Play | null = forcedPlay(match.game);
    if (!play) {
      const ranked = await think(
        engine.rankPlays(
          {
            board: turn.startBoard,
            onRoll: player,
            match: matchContext(match),
          },
          turn.roll,
          { difficulty },
        ),
      );
      if (!liveMatch(token)) {
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
      if (!liveMatch(token)) {
        return;
      }
    }
    store.dispatch({ type: 'commit' });
  }

  async function act(token: DecisionToken, match: MatchState): Promise<void> {
    try {
      switch (match.phase) {
        case 'pre-roll':
          return await actPreRoll(token, match);
        case 'cube-offered':
          return await actCubeOffered(token, match);
        case 'resign-offered':
          return await actResignation(token, match);
        case 'turn':
          return await actTurn(token, match);
        default:
          return;
      }
    } catch (error) {
      attempted = null;
      setState({
        thinking: false,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /** Is the current decision the engine's to make? */
  function isOurs(match: MatchState): boolean {
    switch (match.phase) {
      case 'turn':
        return (
          match.game.turn?.player === player &&
          match.game.turn.movements.length === 0
        );
      case 'pre-roll':
        return match.toRoll === player;
      case 'cube-offered':
        // Respond only to the opponent's double, never our own.
        return match.toRoll === opposing(player);
      case 'resign-offered':
        return match.pendingResignation?.by === opposing(player);
      default:
        return false;
    }
  }

  function maybeAct(): void {
    if (disposed || state.error) {
      return;
    }
    const match = store.getState().match;
    if (!match || !isOurs(match)) {
      return;
    }
    const token = tokenFor(match);
    if (sameToken(attempted, token)) {
      return;
    }
    attempted = token;
    void act(token, match);
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
