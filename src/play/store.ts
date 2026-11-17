/**
 * UI-independent match-flow store for the Play area.
 *
 * Wraps the pure rules engine (src/rules) behind a dispatch/subscribe
 * interface so the board UI and the engine opponent drive the match through
 * the same actions. All legality comes from the rules engine; the store never
 * re-derives it. Turns have an explicit pre-roll phase (the cube moment):
 * committing a play leads to the opponent's pre-roll, and a 'roll' action
 * starts their turn.
 */

import { createSeededDice, type DiceSource, type MatchState } from '../rules';
import { type PlayAction, reduceMatch } from './reduce';

export type { PlayAction };

export interface PlayState {
  /** The current match, or null before the first start. */
  readonly match: MatchState | null;
}

export interface PlayStore {
  getState(): PlayState;
  /** Applies the action if legal in the current state; ignores it otherwise. */
  dispatch(action: PlayAction): void;
  subscribe(listener: () => void): () => void;
}

export interface PlayStoreOptions {
  /** Dice source for all rolls. Defaults to a randomly seeded fair PRNG. */
  readonly dice?: DiceSource;
  /** Start from an existing match instead of empty (tests, resumption). */
  readonly match?: MatchState;
}

/**
 * A 32-bit dice-PRNG seed from the platform's CSPRNG, falling back to
 * Math.random only where crypto is unavailable.
 */
function randomDiceSeed(): number {
  if (typeof crypto !== 'undefined' && 'getRandomValues' in crypto) {
    return crypto.getRandomValues(new Uint32Array(1))[0];
  }
  return (Math.random() * 2 ** 32) >>> 0;
}

/** A play store whose match can be swapped wholesale (remote-play sync). */
export function createReplaceablePlayStore(
  options: PlayStoreOptions = {},
): PlayStore & { replace(match: MatchState | null): void } {
  const dice = options.dice ?? createSeededDice(randomDiceSeed());
  let state: PlayState = { match: options.match ?? null };
  const listeners = new Set<() => void>();

  function setState(next: PlayState): void {
    state = next;
    for (const listener of listeners) {
      listener();
    }
  }

  return {
    getState: () => state,
    dispatch(action) {
      const match = reduceMatch(state.match, action, dice);
      if (match) {
        setState({ match });
      }
    },
    replace(match) {
      setState({ match });
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  };
}

export function createPlayStore(options: PlayStoreOptions = {}): PlayStore {
  const { replace: _replace, ...store } = createReplaceablePlayStore(options);
  return store;
}
