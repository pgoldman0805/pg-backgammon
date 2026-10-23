/**
 * Seeded random finished matches for round-trip property tests: every play
 * picked from legalPlays, doubles/takes/passes through the match state
 * machine, and occasional accepted resignations (the only resignation kind
 * .mat can carry). Deterministic for a given seed.
 */

import {
  acceptResignation,
  canDouble,
  commitMatchPlay,
  type DiceSource,
  type Die,
  type GameEndKind,
  legalPlays,
  type MatchState,
  matchMovement,
  nextGame,
  offerDouble,
  offerResignation,
  passDouble,
  rollTurn,
  startMatch,
  takeDouble,
} from '../rules';

/** Small deterministic PRNG (mulberry32). */
function mulberry32(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const RESIGN_KINDS: readonly GameEndKind[] = ['single', 'gammon', 'backgammon'];

/** Play a whole seeded match to match-over through the rules engine. */
export function generateFinishedMatch(seed: number): MatchState {
  const rand = mulberry32(seed);
  const dice: DiceSource = {
    rollDie: () => (Math.floor(rand() * 6) + 1) as Die,
  };
  const length = 1 + Math.floor(rand() * 3);
  let match = startMatch(length, dice);
  let safety = 0;
  while (match.phase !== 'match-over') {
    if (++safety > 20000) {
      throw new Error(`match generator did not terminate (seed ${seed})`);
    }
    switch (match.phase) {
      case 'turn': {
        const turn = match.game.turn;
        if (!turn) {
          throw new Error('turn phase without a turn');
        }
        // Occasionally resign (accepted) once the game has some record.
        if (match.game.record.plays.length > 0 && rand() < 0.015) {
          match = acceptResignation(
            offerResignation(
              match,
              turn.player,
              RESIGN_KINDS[Math.floor(rand() * RESIGN_KINDS.length)],
            ),
          );
          break;
        }
        const plays = legalPlays(turn.startBoard, turn.player, turn.roll);
        if (plays.length > 0) {
          const choice = plays[Math.floor(rand() * plays.length)];
          for (const movement of choice.movements) {
            match = matchMovement(match, movement.from, movement.die);
          }
        }
        match = commitMatchPlay(match);
        break;
      }
      case 'pre-roll': {
        if (canDouble(match) && rand() < 0.08) {
          match = offerDouble(match);
        } else {
          match = rollTurn(match, dice);
        }
        break;
      }
      case 'cube-offered': {
        match = rand() < 0.6 ? takeDouble(match) : passDouble(match);
        break;
      }
      case 'game-over': {
        match = nextGame(match, dice);
        break;
      }
      default:
        throw new Error(`unexpected phase ${match.phase}`);
    }
  }
  return match;
}
