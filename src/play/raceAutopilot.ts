/**
 * The race autopilot controller (spec story 59): a user-pressed switch that
 * plays the user's side of a Race (GLOSSARY) to the end of the game. While
 * active it rolls at the user's pre-roll (the race auto-roll path: no
 * doubling stop) and plays the user's rolled turns with the engine's best
 * play at FULL strength — never a weakened Difficulty — paced one visible
 * movement at a time like the opponent's.
 *
 * It only ever acts on the user's own pre-roll and turn: an incoming double
 * keeps its dialog (autopilot stands armed and resumes after the response),
 * and the opponent's moments are untouched. It deactivates itself at game or
 * match end (never carrying into the next game), on a takeback (the user
 * wants the wheel back), and on an engine failure; `stop` aborts an in-flight
 * paced turn through the same liveness checks the opponent uses.
 */

import type { Engine } from '../engine/types';
import { isRace, type MatchState, type Player } from '../rules';
import { matchContext } from './opponent';
import { forcedPlay } from './selectors';
import type { PlayStore } from './store';

export interface RaceAutopilotOptions {
  readonly store: PlayStore;
  readonly engine: Engine;
  /** The user's side the autopilot plays for. */
  readonly player: Player;
  /** Pause between the autopilot's visible steps, in milliseconds. */
  readonly stepMs?: number;
  /** Awaitable pause; injectable for tests. Defaults to setTimeout. */
  readonly pace?: (ms: number) => Promise<void>;
}

export interface RaceAutopilotState {
  /** True while the autopilot is playing the user's turns. */
  readonly active: boolean;
}

export interface RaceAutopilot {
  getState(): RaceAutopilotState;
  subscribe(listener: () => void): () => void;
  /** Engage, if the game is live and the position is a Race. */
  start(): void;
  /** Disengage immediately, abandoning any in-flight paced turn. */
  stop(): void;
  /** Stop watching the store and discard any in-flight action. */
  dispose(): void;
}

/**
 * One decision moment, identified by object identity of the plays record (a
 * new array every commit, takeback and game) plus the phase and the count of
 * recorded decisions — the same notion the engine opponent uses, so the
 * controller acts at most once per moment.
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

function gameLive(match: MatchState): boolean {
  return match.phase !== 'game-over' && match.phase !== 'match-over';
}

const defaultPace = (ms: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, ms));

export function createRaceAutopilot(
  options: RaceAutopilotOptions,
): RaceAutopilot {
  const { store, engine, player } = options;
  const stepMs = options.stepMs ?? 450;
  const pace = options.pace ?? defaultPace;

  let active = false;
  let disposed = false;
  /** The decision moment being (or already) acted on. */
  let attempted: DecisionToken | null = null;
  /** The previous store state, for spotting takebacks. */
  let lastMatch: MatchState | null = store.getState().match;
  const listeners = new Set<() => void>();

  function setActive(next: boolean): void {
    if (disposed || active === next) {
      return;
    }
    active = next;
    for (const listener of listeners) {
      listener();
    }
  }

  /**
   * The current match if the captured decision moment is still live and the
   * autopilot is still engaged — a stop mid-pacing fails this check, so the
   * abandoned turn never advances another step.
   */
  function liveMatch(token: DecisionToken): MatchState | null {
    if (disposed || !active) {
      return null;
    }
    const match = store.getState().match;
    return match && sameToken(tokenFor(match), token) ? match : null;
  }

  /**
   * Play the user's rolled turn: the engine's best play at full strength
   * (rankPlays with no difficulty — GLOSSARY "Live analysis" parity), paced
   * one visible movement at a time, then committed. A Race always has a
   * legal play (no contact means nothing blocks), so there is no dance arm.
   */
  async function actTurn(token: DecisionToken, match: MatchState) {
    const turn = match.game.turn;
    if (!turn) {
      return;
    }
    // A beat before acting, so the roll is visible first.
    await pace(stepMs);
    if (!liveMatch(token)) {
      return;
    }

    // A forced play resolves from the rules alone, like the opponent's.
    let play = forcedPlay(match.game);
    if (!play) {
      let ranked: Awaited<ReturnType<Engine['rankPlays']>>;
      try {
        ranked = await engine.rankPlays(
          {
            board: turn.startBoard,
            onRoll: player,
            match: matchContext(match),
          },
          turn.roll,
        );
      } catch {
        // An engine failure hands the turn back to the user.
        setActive(false);
        return;
      }
      if (!liveMatch(token)) {
        return;
      }
      play = ranked[0]?.play ?? null;
      if (!play) {
        return;
      }
    }

    for (const [index, movement] of play.movements.entries()) {
      const current = liveMatch(token);
      // Bail the moment the position stops matching the script (the user
      // moved or undid during the pacing).
      if (!current || current.game.turn?.movements.length !== index) {
        return;
      }
      store.dispatch({
        type: 'movement',
        from: movement.from,
        die: movement.die,
      });
      await pace(stepMs);
    }
    const current = liveMatch(token);
    if (current && current.game.turn?.movements.length === play.movements.length) {
      store.dispatch({ type: 'commit' });
    }
  }

  function maybeAct(): void {
    if (disposed || !active) {
      return;
    }
    const match = store.getState().match;
    if (!match) {
      return;
    }
    if (!gameLive(match)) {
      // Game or match over: autopilot never carries into the next game.
      setActive(false);
      return;
    }
    const token = tokenFor(match);
    if (sameToken(attempted, token)) {
      return;
    }
    if (!isRace(match.game.board)) {
      return;
    }
    if (match.phase === 'pre-roll' && match.toRoll === player) {
      attempted = token;
      // Synchronous, like the race auto-roll: no doubling stop appears.
      store.dispatch({ type: 'roll' });
      return;
    }
    if (
      match.phase === 'turn' &&
      match.game.turn?.player === player &&
      match.game.turn.movements.length === 0
    ) {
      attempted = token;
      void actTurn(token, match);
    }
    // Everything else — the opponent's moments, an offered cube or
    // resignation — is left exactly as it is; autopilot stays armed.
  }

  function onChange(): void {
    if (disposed) {
      return;
    }
    const match = store.getState().match;
    const prev = lastMatch;
    lastMatch = match;
    if (!active) {
      return;
    }
    // A takeback shortened the same game's record: the user wants the wheel
    // back, so the restored turn is theirs.
    if (
      match &&
      prev &&
      match.game.record.initialBoard === prev.game.record.initialBoard &&
      match.game.record.plays.length < prev.game.record.plays.length
    ) {
      setActive(false);
      return;
    }
    maybeAct();
  }

  const unsubscribe = store.subscribe(onChange);

  return {
    getState: () => ({ active }),
    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    start() {
      if (disposed || active) {
        return;
      }
      const match = store.getState().match;
      if (!match || !gameLive(match) || !isRace(match.game.board)) {
        return;
      }
      // A fresh engagement may re-attempt the moment a stop abandoned.
      attempted = null;
      setActive(true);
      maybeAct();
    },
    stop() {
      setActive(false);
    },
    dispose() {
      disposed = true;
      unsubscribe();
      listeners.clear();
    },
  };
}
