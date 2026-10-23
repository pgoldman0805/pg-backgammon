import { describe, expect, test } from 'vitest';
import { createSeededDice } from './dice';
import {
  applyTurnMovement,
  commitPlay,
  type GameState,
  startGame,
} from './game';
import { legalPlays } from './plays';
import { replayGame } from './replay';

/** A tiny PRNG independent of the engine's, for picking random plays. */
function lcg(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state;
  };
}

/** Play a complete game choosing uniformly random legal plays. */
function playRandomGame(seed: number): GameState {
  const dice = createSeededDice(seed);
  const pick = lcg(seed ^ 0x9e3779b9);
  let state = startGame(dice);
  let turns = 0;
  while (state.turn) {
    if (turns++ > 5000) {
      throw new Error('random game did not terminate');
    }
    const turn = state.turn;
    const plays = legalPlays(state.board, turn.player, turn.roll);
    if (plays.length > 0) {
      const play = plays[pick() % plays.length];
      for (const movement of play.movements) {
        state = applyTurnMovement(state, movement.from, movement.die);
      }
    }
    state = commitPlay(state, dice);
  }
  return state;
}

describe('replayGame', () => {
  test('replaying a finished game reproduces the identical final position and result', () => {
    const live = playRandomGame(1);
    expect(live.result).not.toBeNull();

    const replayed = replayGame(live.record);
    expect(replayed.board).toEqual(live.board);
    expect(replayed.result).toEqual(live.result);
  });

  test('replay is deterministic across many different games', () => {
    for (let seed = 2; seed <= 21; seed++) {
      const live = playRandomGame(seed);
      const replayed = replayGame(live.record);
      expect(replayed.board).toEqual(live.board);
      expect(replayed.result).toEqual(live.result);
    }
  });

  test('replaying twice from the same record gives identical results', () => {
    const live = playRandomGame(22);
    const first = replayGame(live.record);
    const second = replayGame(live.record);
    expect(first).toEqual(second);
  });
});
