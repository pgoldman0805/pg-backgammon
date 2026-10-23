/**
 * Shared scripted-match fixtures for analyzer and review tests.
 */

import {
  acceptResignation,
  commitMatchPlay,
  type MatchRecord,
  type MatchState,
  matchMovement,
  offerDouble,
  offerResignation,
  rollTurn,
  startMatch,
  takeDouble,
} from '../rules';
import { scriptedDice } from './dice';

/**
 * A deterministic match game with one of everything the analyzer scores:
 * White opens 3-1 with 8/5 6/5, Black doubles (by the fake engine's pip
 * arithmetic a 0.08 wrong double — a blunder), White takes (correct), Black
 * plays 6-5 as 1/7 7/12, White silently holds the cube (if it is live) and
 * plays 6-2 as 24/18 13/11, then White resigns a single and Black accepts.
 * At the default length 7 the match continues; at length 2 the doubled
 * resignation ends it (a finished one-game match for review tests).
 */
export function cubeGameMatch(length = 7): MatchState {
  let match = startMatch(length, scriptedDice(3, 1));
  match = matchMovement(match, 8, 3);
  match = matchMovement(match, 6, 1);
  match = commitMatchPlay(match);
  match = takeDouble(offerDouble(match));
  match = rollTurn(match, scriptedDice(6, 5));
  match = matchMovement(match, 1, 6);
  match = matchMovement(match, 7, 5);
  match = commitMatchPlay(match);
  match = rollTurn(match, scriptedDice(6, 2));
  match = matchMovement(match, 24, 6);
  match = matchMovement(match, 13, 2);
  match = commitMatchPlay(match);
  return acceptResignation(offerResignation(match, 'white', 'single'));
}

/** The replayable record of a match state. */
export function recordOf(match: MatchState): MatchRecord {
  return { length: match.length, games: match.games };
}
