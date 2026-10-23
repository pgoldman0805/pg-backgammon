/**
 * Record walking for the analyzer (GLOSSARY "Post-game review"): turn a
 * recorded game (src/rules/match.ts) back into the sequence of decision
 * moments it contains — every Play with the position it was faced from, every
 * cube action at its recorded spot, and every silent pre-roll where doubling
 * was available (the "missed double" candidates). Pure and deterministic:
 * the record alone fixes the output, exactly like replayMatchGame.
 */

import type { MatchContext } from '../engine/types';
import {
  applyMovement,
  type BoardState,
  type CheckerMovement,
  type CubeState,
  type DiceRoll,
  legalPlays,
  type MatchGameRecord,
  type MatchRecord,
  type MatchScore,
  opponent,
  type Player,
} from '../rules';

/** The match standing a game was played at (score before the game). */
export interface GameStanding {
  readonly length: number;
  readonly score: MatchScore;
}

/** A checker play, with the position and context it was decided from. */
export interface PlayMoment {
  readonly kind: 'play';
  readonly playIndex: number;
  readonly player: Player;
  readonly roll: DiceRoll;
  /** The board before the play. */
  readonly board: BoardState;
  readonly context: MatchContext;
  /** The movements that were actually committed. */
  readonly played: readonly CheckerMovement[];
  /** 0 = dance, 1 = forced; 2+ is an unforced decision. */
  readonly legalPlayCount: number;
}

/** A double that was actually offered, with its recorded answer. */
export interface CubeActionMoment {
  readonly kind: 'cube-action';
  /** The decision sits before the play at this index. */
  readonly playIndex: number;
  readonly doubler: Player;
  readonly responder: Player;
  readonly response: 'take' | 'pass';
  /** The board the double was offered from. */
  readonly board: BoardState;
  /** Pre-double context: the cube as it stood when the choice was made. */
  readonly context: MatchContext;
}

/** A silent pre-roll where the player had access to a live cube. */
export interface CubeOpportunityMoment {
  readonly kind: 'cube-opportunity';
  readonly playIndex: number;
  readonly player: Player;
  readonly board: BoardState;
  readonly context: MatchContext;
}

export type DecisionMoment =
  | PlayMoment
  | CubeActionMoment
  | CubeOpportunityMoment;

/**
 * The walked moment an analyzed decision refers to: the play moment of a
 * play decision, the cube moment (action or opportunity) of a cube one,
 * matched by its play index. Null when the record holds no such moment.
 */
export function momentForDecision(
  moments: readonly DecisionMoment[],
  decision: { readonly kind: 'play' | 'cube'; readonly playIndex: number },
): DecisionMoment | null {
  const wantsPlay = decision.kind === 'play';
  return (
    moments.find(
      (moment) =>
        (moment.kind === 'play') === wantsPlay &&
        moment.playIndex === decision.playIndex,
    ) ?? null
  );
}

/** Mirror of the match layer's canDouble, over replayed state. */
function mayDouble(
  player: Player,
  cube: CubeState,
  standing: GameStanding,
  crawford: boolean,
): boolean {
  if (crawford) {
    return false;
  }
  if (cube.owner !== 'center' && cube.owner !== player) {
    return false;
  }
  return standing.score[player] + cube.value < standing.length;
}

/**
 * Walk one recorded game into its decision moments, in game order. Resign
 * decisions pass through silently (the analyzer scores plays and cube
 * decisions only); takes and passes move the cube exactly as replay does.
 */
export function walkGame(
  record: MatchGameRecord,
  standing: GameStanding,
): readonly DecisionMoment[] {
  const moments: DecisionMoment[] = [];
  let board = record.game.initialBoard;
  let cube: CubeState = { value: 1, owner: 'center' };
  let doubler: Player | null = null;
  let next = 0;

  const context = (cubeState: CubeState): MatchContext => ({
    matchLength: standing.length,
    score: standing.score,
    crawford: record.crawford,
    cube: cubeState,
  });

  const applyDecisionsAt = (afterPlays: number): boolean => {
    let sawDouble = false;
    while (
      next < record.decisions.length &&
      record.decisions[next].afterPlays === afterPlays
    ) {
      const decision = record.decisions[next];
      next += 1;
      switch (decision.type) {
        case 'double':
          doubler = decision.player;
          sawDouble = true;
          break;
        case 'take':
        case 'pass': {
          if (!doubler) {
            throw new Error(
              `a ${decision.type} was recorded without a pending double`,
            );
          }
          moments.push({
            kind: 'cube-action',
            playIndex: afterPlays,
            doubler,
            responder: opponent(doubler),
            response: decision.type,
            board,
            context: context(cube),
          });
          if (decision.type === 'take') {
            cube = { value: cube.value * 2, owner: decision.player };
          }
          doubler = null;
          break;
        }
        default:
          // Resignations are not analyzed and do not move the cube.
          break;
      }
    }
    return sawDouble;
  };

  for (let i = 0; i < record.game.plays.length; i++) {
    const doubled = applyDecisionsAt(i);
    const play = record.game.plays[i];
    // The game's first play follows the opening roll: no pre-roll moment.
    if (
      !doubled &&
      i > 0 &&
      mayDouble(play.player, cube, standing, record.crawford)
    ) {
      moments.push({
        kind: 'cube-opportunity',
        playIndex: i,
        player: play.player,
        board,
        context: context(cube),
      });
    }
    moments.push({
      kind: 'play',
      playIndex: i,
      player: play.player,
      roll: play.roll,
      board,
      context: context(cube),
      played: play.movements,
      legalPlayCount: legalPlays(board, play.player, play.roll).length,
    });
    for (const movement of play.movements) {
      board = applyMovement(board, play.player, movement);
    }
  }
  applyDecisionsAt(record.game.plays.length);

  return moments;
}

/** The standing each game of the match was played at, in game order. */
export function matchStandings(record: MatchRecord): readonly GameStanding[] {
  const standings: GameStanding[] = [];
  let score: MatchScore = { white: 0, black: 0 };
  for (const game of record.games) {
    standings.push({ length: record.length, score });
    const { result } = game;
    score = {
      white: score.white + (result.winner === 'white' ? result.points : 0),
      black: score.black + (result.winner === 'black' ? result.points : 0),
    };
  }
  return standings;
}
