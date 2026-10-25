/**
 * The autoplay controller (spec stories 43-44): watches the same PlayStore
 * the human plays through and removes decision-free friction on the human's
 * side. At the user's pre-roll in a Race (GLOSSARY) it rolls instead of
 * stopping at Double/Roll, and a Forced play (GLOSSARY) is applied visibly —
 * paced movements, like the engine opponent's — and committed. Nothing else
 * is ever skipped: contact positions keep the stop, dances keep their manual
 * Continue, and incoming cube or resignation dialogs are untouched because
 * the controller only ever acts on the human's own pre-roll and turn.
 *
 * Settings are read through a getter at decision time, so toggling a setting
 * mid-game applies immediately (callers signal the flip with `recheck`).
 */

import { isRace, type MatchState, type Play, type Player } from '../rules';
import {
  type DecisionToken,
  isTakeback,
  matchForToken,
  resolvePacing,
  sameToken,
  tokenFor,
} from './controllerCore';
import { forcedPlay } from './selectors';
import type { PlayStore } from './store';

export interface AutoplaySettings {
  /** Auto-roll the user's pre-roll in races (GLOSSARY "Race"). */
  readonly autoRollRaces: boolean;
  /** Auto-play turns with exactly one legal play (GLOSSARY "Forced play"). */
  readonly autoForcedPlays: boolean;
}

export interface AutoplayOptions {
  readonly store: PlayStore;
  /** The human sides the controller acts for (both in a hot-seat match). */
  readonly players: readonly Player[];
  /** Read at decision time, so mid-game toggles apply immediately. */
  readonly settings: () => AutoplaySettings;
  /** Pause between visible auto-played movements, in milliseconds. */
  readonly stepMs?: number;
  /** Awaitable pause; injectable for tests. Defaults to setTimeout. */
  readonly pace?: (ms: number) => Promise<void>;
}

export interface Autoplay {
  /** Re-examine the current position (call after a settings toggle). */
  recheck(): void;
  /** Stop watching the store and discard any in-flight action. */
  dispose(): void;
}

export function createAutoplay(options: AutoplayOptions): Autoplay {
  const { store, players, settings } = options;
  const { stepMs, pace } = resolvePacing(options);

  let disposed = false;
  /** The decision moment already acted on (never act twice on one). */
  let attempted: DecisionToken | null = null;
  /**
   * The turn a takeback just restored, paused so the user can look at it
   * instead of having it instantly re-played (the whole point of the
   * takeback). Cleared by the next commit, which changes the token.
   */
  let pausedToken: DecisionToken | null = null;
  /** The previous store state, for spotting takebacks. */
  let lastMatch: MatchState | null = store.getState().match;

  /** The current match if the captured decision moment is still live. */
  function liveMatch(token: DecisionToken): MatchState | null {
    return disposed ? null : matchForToken(store, token);
  }

  /**
   * Apply the turn's only legal play one visible movement at a time, then
   * commit — the opponent's paced presentation, on the human's side. Bails
   * the moment the position stops matching the script (the user moved, took
   * back, or the setting was switched off mid-play).
   */
  async function actForced(token: DecisionToken, play: Play): Promise<void> {
    // A beat before acting, so the roll is visible first.
    await pace(stepMs);
    for (const [index, movement] of play.movements.entries()) {
      const match = liveMatch(token);
      if (
        !match ||
        !settings().autoForcedPlays ||
        match.game.turn?.movements.length !== index
      ) {
        return;
      }
      store.dispatch({
        type: 'movement',
        from: movement.from,
        die: movement.die,
      });
      await pace(stepMs);
    }
    const match = liveMatch(token);
    if (
      match &&
      settings().autoForcedPlays &&
      match.game.turn?.movements.length === play.movements.length
    ) {
      store.dispatch({ type: 'commit' });
    }
  }

  function maybeAct(): void {
    if (disposed) {
      return;
    }
    const match = store.getState().match;
    if (!match) {
      return;
    }
    const token = tokenFor(match);
    if (sameToken(attempted, token) || sameToken(pausedToken, token)) {
      return;
    }
    const current = settings();
    if (
      match.phase === 'pre-roll' &&
      current.autoRollRaces &&
      match.toRoll !== null &&
      players.includes(match.toRoll) &&
      isRace(match.game.board)
    ) {
      attempted = token;
      // Synchronous, so the skipped Double/Roll stop never appears at all.
      store.dispatch({ type: 'roll' });
      return;
    }
    if (
      match.phase === 'turn' &&
      current.autoForcedPlays &&
      match.game.turn &&
      players.includes(match.game.turn.player) &&
      match.game.turn.movements.length === 0
    ) {
      // forcedPlay is null for a dance, so Continue always stays manual.
      const play = forcedPlay(match.game);
      if (play) {
        attempted = token;
        void actForced(token, play);
      }
    }
  }

  function onChange(): void {
    if (disposed) {
      return;
    }
    const match = store.getState().match;
    const prev = lastMatch;
    lastMatch = match;
    // A takeback shortened the same game's record: pause on the restored turn.
    if (match && isTakeback(prev, match)) {
      pausedToken = tokenFor(match);
    }
    maybeAct();
  }

  const unsubscribe = store.subscribe(onChange);
  maybeAct();

  return {
    recheck() {
      maybeAct();
    },
    dispose() {
      disposed = true;
      unsubscribe();
    },
  };
}
