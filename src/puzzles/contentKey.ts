/**
 * Content identity for puzzles (ticket 12's dedupe key, shared since ticket
 * 18 with the self-play miner): the position + question a puzzle poses,
 * independent of where it came from. Two sources producing the same key are
 * the same drill, so one of them is skipped.
 *
 * The match score IS part of the key for a match position (ticket 38): the
 * take point shifts with the score, so the same board at 2-away/2-away and at
 * a gammon-go score are genuinely different drills and must both survive. A
 * money position (matchLength 0) carries no score discriminator, so money
 * drilling is unchanged and the self-play miner's money keys are untouched.
 */

import type { BoardState, DiceRoll, Player } from '../rules';
import { boardKey } from './grade';
import type { Puzzle, PuzzleMatchContext } from './types';

/**
 * The score suffix distinguishing a match position from the same board at
 * another score (empty for money, so money keys stay byte-for-byte as before).
 */
function matchKey(match: PuzzleMatchContext): string {
  if (match.matchLength <= 0) {
    return '';
  }
  return `@${match.matchLength}:${match.score.white}-${match.score.black}:${
    match.crawford ? 'c' : ''
  }`;
}

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
  const base =
    puzzle.kind === 'play'
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
  return `${base}${matchKey(puzzle.match)}`;
}
