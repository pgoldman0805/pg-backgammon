/**
 * UI-independent game-flow store for the Play area.
 *
 * Wraps the pure rules engine (src/rules) behind a dispatch/subscribe
 * interface so the board UI — and, later, an engine opponent (ticket 05) —
 * drive the game through the same actions. All legality comes from the rules
 * engine; the store never re-derives it.
 */

import {
  applyTurnMovement,
  commitPlay,
  createSeededDice,
  type DiceSource,
  type Die,
  type GameState,
  type Point,
  startGame,
  undoTurnMovement,
} from '../rules';
import { forcedPlay } from './selectors';

export interface PlayState {
  /** The current game, or null before the first start. */
  readonly game: GameState | null;
}

export type PlayAction =
  /** Start a fresh game (also restarts after a game ends). */
  | { type: 'start' }
  /** Move one checker by one die within the current turn. */
  | { type: 'movement'; from: Point | 'bar'; die: Die }
  /** Undo the most recent movement of the current turn. */
  | { type: 'undo' }
  /** Commit the current turn's movements as the Play, ending the turn. */
  | { type: 'commit' }
  /** Apply and commit the single legal play of a forced turn. */
  | { type: 'forced' };

export interface PlayStore {
  getState(): PlayState;
  /** Applies the action if legal in the current state; ignores it otherwise. */
  dispatch(action: PlayAction): void;
  subscribe(listener: () => void): () => void;
}

export interface PlayStoreOptions {
  /** Dice source for all rolls. Defaults to a randomly seeded fair PRNG. */
  readonly dice?: DiceSource;
  /** Start from an existing game instead of empty (tests, resumption). */
  readonly game?: GameState;
}

export function createPlayStore(options: PlayStoreOptions = {}): PlayStore {
  const dice =
    options.dice ?? createSeededDice((Math.random() * 2 ** 32) >>> 0);
  let state: PlayState = { game: options.game ?? null };
  const listeners = new Set<() => void>();

  function setState(next: PlayState): void {
    state = next;
    for (const listener of listeners) {
      listener();
    }
  }

  /**
   * Compute the next state, or null when the action is illegal here. The
   * rules engine is the sole legality authority: engine functions throw on
   * illegal actions, and the store turns that into "ignored".
   */
  function reduce(action: PlayAction): PlayState | null {
    try {
      switch (action.type) {
        case 'start':
          return { game: startGame(dice) };
        case 'movement':
          return state.game
            ? { game: applyTurnMovement(state.game, action.from, action.die) }
            : null;
        case 'undo':
          return state.game ? { game: undoTurnMovement(state.game) } : null;
        case 'commit':
          return state.game ? { game: commitPlay(state.game, dice) } : null;
        case 'forced': {
          const play = forcedPlay(state.game);
          if (!state.game || !play || state.game.turn?.movements.length) {
            return null;
          }
          const moved = play.movements.reduce(
            (game, movement) =>
              applyTurnMovement(game, movement.from, movement.die),
            state.game,
          );
          return { game: commitPlay(moved, dice) };
        }
        default:
          return null;
      }
    } catch {
      return null;
    }
  }

  return {
    getState: () => state,
    dispatch(action) {
      const next = reduce(action);
      if (next) {
        setState(next);
      }
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  };
}
