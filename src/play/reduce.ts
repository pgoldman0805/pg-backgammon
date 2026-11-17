/**
 * The pure match reducer for the Play area.
 *
 * Maps (match, action, dice) to the next match, or null when the action is
 * illegal. Shared by the local play store and the remote-play room so both run
 * identical rules. All legality comes from the rules engine (src/rules), which
 * throws on illegal actions; the reducer turns that into null. Also names who
 * owns the decision in each match phase.
 */

import {
  acceptResignation,
  commitMatchPlay,
  type DiceSource,
  type Die,
  declineResignation,
  type GameEndKind,
  type MatchState,
  markTutorAssisted,
  matchMovement,
  nextGame,
  offerDouble,
  offerResignation,
  opponent,
  type Player,
  type Point,
  passDouble,
  rollTurn,
  startMatch,
  startMoneyGame,
  takebackPlay,
  takeDouble,
  undoMatchMovement,
} from '../rules';
import { forcedPlay } from './selectors';

export type PlayAction =
  /**
   * Start a fresh match or money session (also abandons any in progress).
   * `money` starts an unlimited money session (GLOSSARY "Money play"); `length`
   * is ignored then.
   */
  | { type: 'start'; length?: number; money?: boolean }
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

const BARE_ACTIONS: ReadonlySet<string> = new Set([
  'undo',
  'commit',
  'forced',
  'roll',
  'double',
  'take',
  'pass',
  'accept-resign',
  'decline-resign',
  'next-game',
  'tutor-assisted',
]);

function isIntegerIn(value: unknown, min: number, max: number): boolean {
  return (
    typeof value === 'number' &&
    Number.isInteger(value) &&
    value >= min &&
    value <= max
  );
}

function isDie(value: unknown): boolean {
  return isIntegerIn(value, 1, 6);
}

function isOrigin(value: unknown): boolean {
  return value === 'bar' || isIntegerIn(value, 1, 24);
}

/**
 * Whether untrusted input (a remote client's frame) has the shape of some
 * PlayAction. Shape only: legality is still the reducer's call. Extra
 * properties are ignored.
 */
export function isPlayAction(value: unknown): value is PlayAction {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  const action = value as Record<string, unknown>;
  const { type } = action;
  if (typeof type !== 'string') {
    return false;
  }
  if (BARE_ACTIONS.has(type)) {
    return true;
  }
  switch (type) {
    case 'movement':
      return isOrigin(action.from) && isDie(action.die);
    case 'resign':
      return (
        action.kind === 'single' ||
        action.kind === 'gammon' ||
        action.kind === 'backgammon'
      );
    case 'start':
      return (
        (action.length === undefined || typeof action.length === 'number') &&
        (action.money === undefined || typeof action.money === 'boolean')
      );
    case 'takeback':
      return action.player === 'white' || action.player === 'black';
    default:
      return false;
  }
}

/** Whose decision the current phase is (turn or pre-roll), if anyone's. */
export function currentActor(match: MatchState): Player | null {
  if (match.phase === 'turn') {
    return match.game.turn?.player ?? null;
  }
  if (match.phase === 'pre-roll') {
    return match.toRoll;
  }
  return null;
}

/**
 * Who owns the decision in the current phase: a player, 'either' once a game
 * is over (either may continue), or null when the match is over.
 */
export function decisionOwner(match: MatchState): Player | 'either' | null {
  switch (match.phase) {
    case 'turn':
      return match.game.turn?.player ?? null;
    case 'pre-roll':
      return match.toRoll;
    case 'cube-offered':
      return match.toRoll ? opponent(match.toRoll) : null;
    case 'resign-offered':
      return match.pendingResignation
        ? opponent(match.pendingResignation.by)
        : null;
    case 'game-over':
      return 'either';
    default:
      return null;
  }
}

/**
 * Compute the next match, or null when the action is illegal here. The rules
 * engine is the sole legality authority: engine functions throw on illegal
 * actions, and this turns that into null.
 */
export function reduceMatch(
  match: MatchState | null,
  action: PlayAction,
  dice: DiceSource,
): MatchState | null {
  try {
    if (action.type === 'start') {
      return action.money
        ? startMoneyGame(dice)
        : startMatch(action.length ?? 7, dice);
    }
    if (!match) {
      return null;
    }
    switch (action.type) {
      case 'movement':
        return matchMovement(match, action.from, action.die);
      case 'undo':
        return undoMatchMovement(match);
      case 'commit':
        return commitMatchPlay(match);
      case 'forced': {
        const play = forcedPlay(match.phase === 'turn' ? match.game : null);
        if (!play || match.game.turn?.movements.length) {
          return null;
        }
        const moved = play.movements.reduce(
          (m, movement) => matchMovement(m, movement.from, movement.die),
          match,
        );
        return commitMatchPlay(moved);
      }
      case 'roll':
        return rollTurn(match, dice);
      case 'double':
        return offerDouble(match);
      case 'take':
        return takeDouble(match);
      case 'pass':
        return passDouble(match);
      case 'resign': {
        const actor = currentActor(match);
        return actor ? offerResignation(match, actor, action.kind) : null;
      }
      case 'accept-resign':
        return acceptResignation(match);
      case 'decline-resign':
        return declineResignation(match);
      case 'next-game':
        return nextGame(match, dice);
      case 'takeback':
        return takebackPlay(match, action.player);
      case 'tutor-assisted':
        return markTutorAssisted(match);
      default:
        return null;
    }
  } catch {
    return null;
  }
}
