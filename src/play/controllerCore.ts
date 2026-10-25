/**
 * The shared core the play-flow controllers (engine opponent, autoplay, race
 * autopilot) are built from. Before this module each controller carried its
 * own verbatim copy of the decision-token notion, the "is this moment still
 * live?" lookup, the takeback detector, and the pacing defaults; they now all
 * import these primitives so there is one definition — and one place to reason
 * about — the machinery that keeps a paced, store-watching controller acting
 * at most once per decision and never landing a stale answer.
 *
 * Everything here is pure (or a thin store read): the controllers compose it
 * with their own disposed/active guards and their own acting logic, so their
 * observable behavior is exactly what it was.
 */

import type { MatchState } from '../rules';
import type { PlayStore } from './store';

/**
 * One decision moment, identified by object identity of the plays record (a
 * new array every commit, takeback and game) plus the phase and the count of
 * recorded decisions. A controller captures a token when it starts acting and
 * re-checks it before each visible step, so a result for a moment that has
 * since moved on (a restart, a takeback, the user playing instead) is dropped
 * rather than applied.
 */
export interface DecisionToken {
  readonly phase: MatchState['phase'];
  readonly plays: MatchState['game']['record']['plays'];
  readonly decisions: number;
}

/** The token for the match's current decision moment. */
export function tokenFor(match: MatchState): DecisionToken {
  return {
    phase: match.phase,
    plays: match.game.record.plays,
    decisions: match.decisions.length,
  };
}

/** Whether two tokens name the same decision moment (neither being null). */
export function sameToken(
  a: DecisionToken | null,
  b: DecisionToken | null,
): boolean {
  return (
    a !== null &&
    b !== null &&
    a.phase === b.phase &&
    a.plays === b.plays &&
    a.decisions === b.decisions
  );
}

/**
 * The store's current match iff it is still the moment the token captured —
 * the shared liveness check. Callers layer their own guards (disposed, or the
 * autopilot's active flag) on top; this only answers "has the position moved
 * on since the token was taken?".
 */
export function matchForToken(
  store: PlayStore,
  token: DecisionToken,
): MatchState | null {
  const match = store.getState().match;
  return match && sameToken(tokenFor(match), token) ? match : null;
}

/**
 * Whether the change from `prev` to `next` is a takeback: the same game (same
 * immutable initial board) with a play removed from its record. A controller
 * that was driving the user's side hands the wheel back when it sees one.
 */
export function isTakeback(
  prev: MatchState | null,
  next: MatchState | null,
): boolean {
  return (
    prev !== null &&
    next !== null &&
    next.game.record.initialBoard === prev.game.record.initialBoard &&
    next.game.record.plays.length < prev.game.record.plays.length
  );
}

/** Whether the match is still being played (neither game nor match is over). */
export function gameLive(match: MatchState): boolean {
  return match.phase !== 'game-over' && match.phase !== 'match-over';
}

/** The default pause between a controller's visible steps, in milliseconds. */
export const DEFAULT_STEP_MS = 450;

/** Awaitable pause backed by setTimeout; the controllers' default pacing. */
export const defaultPace = (ms: number): Promise<void> =>
  new Promise<void>((resolve) => setTimeout(resolve, ms));

/** Pacing a controller accepts: the step pause and an injectable pause fn. */
export interface PacingOptions {
  /** Pause between the controller's visible steps, in milliseconds. */
  readonly stepMs?: number;
  /** Awaitable pause; injectable for tests. Defaults to setTimeout. */
  readonly pace?: (ms: number) => Promise<void>;
}

/**
 * Resolve the pacing options to their defaults. A `stepMs` of 0 is honored
 * (tests run with no pause), so the default applies only when it is absent.
 */
export function resolvePacing(options: PacingOptions): {
  stepMs: number;
  pace: (ms: number) => Promise<void>;
} {
  return {
    stepMs: options.stepMs ?? DEFAULT_STEP_MS,
    pace: options.pace ?? defaultPace,
  };
}
