/**
 * Content identity for puzzles (ticket 12's dedupe key, shared since ticket
 * 18 with the self-play miner): the position + question a puzzle poses,
 * independent of where it came from. Two sources producing the same key are
 * the same drill, so one of them is skipped. Match score is deliberately not
 * part of the key — the same position at two scores drills once.
 */

import type { BoardState, DiceRoll, Player } from '../rules';
import { boardKey } from './grade';
import type { Puzzle } from './types';

const base = (board: BoardState, hero: Player, cubeValue: number): string =>
  `${boardKey(board)}|${hero}|${cubeValue}`;

/** The content key a play puzzle over this position and roll would have. */
export function playContentKey(
  board: BoardState,
  hero: Player,
  cubeValue: number,
  roll: DiceRoll,
): string {
  const sorted = [...roll].sort((a, b) => b - a).join('-');
  return `play|${base(board, hero, cubeValue)}|${sorted}`;
}

/** The content key a cube puzzle over this position and flavor would have. */
export function cubeContentKey(
  decision: 'offer' | 'response',
  board: BoardState,
  hero: Player,
  cubeValue: number,
): string {
  return `cube|${decision}|${base(board, hero, cubeValue)}`;
}

/**
 * The position + question a puzzle poses, independent of where it came from:
 * two origins producing the same key are the same drill.
 */
export function puzzleContentKey(puzzle: Puzzle): string {
  return puzzle.kind === 'play'
    ? playContentKey(
        puzzle.board,
        puzzle.hero,
        puzzle.match.cube.value,
        puzzle.roll,
      )
    : cubeContentKey(
        puzzle.decision,
        puzzle.board,
        puzzle.hero,
        puzzle.match.cube.value,
      );
}
