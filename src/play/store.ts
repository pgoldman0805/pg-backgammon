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

import {
  acceptResignation,
  commitMatchPlay,
  createSeededDice,
  type DiceSource,
  type Die,
  declineResignation,
  type GameEndKind,
  markTutorAssisted,
  type MatchState,
  matchMovement,
  nextGame,
  offerDouble,
  offerResignation,
  type Player,
  type Point,
  passDouble,
  rollTurn,
  startMatch,
  takeDouble,
  takebackPlay,
  undoMatchMovement,
} from '../rules';
import { forcedPlay } from './selectors';

export interface PlayState {
  /** The current match, or null before the first start. */
  readonly match: MatchState | null;
}

export type PlayAction =
  /** Start a fresh match (also abandons any match in progress). */
  | { type: 'start'; length?: number }
  /** Move one checker by one die within the current turn. */
  | { type: 'movement'; from: Point | 'bar'; die: Die }
  /** Undo the most recent movement of the current turn. */
  | { type: 'undo' }
  /** Commit the current turn's movements as the Play, ending the turn. */
  | { type: 'commit' }
  /** Apply and commit the single legal play of a forced turn. */
  | { type: 'forced' }
  /** Roll the dice from the pre-roll phase, starting the turn. */
  | { type: 'roll' }
  /** Offer a double (the player to roll, before rolling). */
  | { type: 'double' }
  /** Take the offered double. */
  | { type: 'take' }
  /** Pass the offered double, conceding the game. */
  | { type: 'pass' }
  /** The current actor offers to resign the game at this kind. */
  | { type: 'resign'; kind: GameEndKind }
  /** Accept the pending resignation. */
  | { type: 'accept-resign' }
  /** Decline the pending resignation; play resumes. */
  | { type: 'decline-resign' }
  /** Continue the match with its next game. */
  | { type: 'next-game' }
  /** Take back the player's last committed play (Tutor mode only, UI-gated). */
  | { type: 'takeback'; player: Player }
  /** Record that Tutor mode is enabled during the game in progress. */
  | { type: 'tutor-assisted' };

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

/** Whose decision the current phase is (turn or pre-roll), if anyone's. */
function currentActor(match: MatchState): Player | null {
  if (match.phase === 'turn') {
    return match.game.turn?.player ?? null;
  }
  if (match.phase === 'pre-roll') {
    return match.toRoll;
  }
  return null;
}

export function createPlayStore(options: PlayStoreOptions = {}): PlayStore {
  const dice =
    options.dice ?? createSeededDice((Math.random() * 2 ** 32) >>> 0);
  let state: PlayState = { match: options.match ?? null };
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
      if (action.type === 'start') {
        return { match: startMatch(action.length ?? 7, dice) };
      }
      const match = state.match;
      if (!match) {
        return null;
      }
      switch (action.type) {
        case 'movement':
          return { match: matchMovement(match, action.from, action.die) };
        case 'undo':
          return { match: undoMatchMovement(match) };
        case 'commit':
          return { match: commitMatchPlay(match) };
        case 'forced': {
          const play = forcedPlay(match.phase === 'turn' ? match.game : null);
          if (!play || match.game.turn?.movements.length) {
            return null;
          }
          const moved = play.movements.reduce(
            (m, movement) => matchMovement(m, movement.from, movement.die),
            match,
          );
          return { match: commitMatchPlay(moved) };
        }
        case 'roll':
          return { match: rollTurn(match, dice) };
        case 'double':
          return { match: offerDouble(match) };
        case 'take':
          return { match: takeDouble(match) };
        case 'pass':
          return { match: passDouble(match) };
        case 'resign': {
          const actor = currentActor(match);
          return actor
            ? { match: offerResignation(match, actor, action.kind) }
            : null;
        }
        case 'accept-resign':
          return { match: acceptResignation(match) };
        case 'decline-resign':
          return { match: declineResignation(match) };
        case 'next-game':
          return { match: nextGame(match, dice) };
        case 'takeback':
          return { match: takebackPlay(match, action.player) };
        case 'tutor-assisted':
          return { match: markTutorAssisted(match) };
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
