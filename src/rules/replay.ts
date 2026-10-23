import { applyMovement } from './board';
import { gameResult } from './game';
import type { BoardState, GameRecord, GameResult } from './types';

export interface ReplayOutcome {
  readonly board: BoardState;
  readonly result: GameResult | null;
}

/**
 * Deterministically replay a recorded game: apply every recorded Play, in
 * order, to the recorded initial position. No dice source is involved — the
 * record alone fully determines the final position and result.
 */
export function replayGame(record: GameRecord): ReplayOutcome {
  let board = record.initialBoard;
  for (const play of record.plays) {
    for (const movement of play.movements) {
      board = applyMovement(board, play.player, movement);
    }
  }
  return { board, result: gameResult(board) };
}
