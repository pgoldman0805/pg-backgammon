/**
 * Match play (GLOSSARY "Match"): a series of games to a fixed point target
 * with the doubling cube and the Crawford rule. Pure and synchronous like the
 * rest of the rules engine (ADR-0002): a state machine over immutable values,
 * with every cube decision and resignation recorded so a match replays
 * deterministically (the analyzer's input, ticket 08).
 *
 * The turn structure differs from a bare game: committing a play leads to the
 * opponent's *pre-roll* phase — the only moment doubling is possible — and an
 * explicit roll starts their turn. Within a turn, ticket 03's mechanics
 * (movement, undo, commit) apply unchanged.
 */

import { applyMovement } from './board';
import type { DiceSource } from './dice';
import {
  applyTurnMovement,
  commitPlayOnly,
  type GameState,
  gameResult,
  startGame,
  startNextTurn,
  undoTurnMovement,
} from './game';
import type {
  BoardState,
  DiceRoll,
  Die,
  GameEndKind,
  GameRecord,
  Player,
  Point,
} from './types';

/** The doubling cube: centered until first turned, then owned by the taker. */
export interface CubeState {
  /** 1, 2, 4, ... */
  readonly value: number;
  readonly owner: Player | 'center';
}

export interface MatchScore {
  readonly white: number;
  readonly black: number;
}

export type MatchPhase =
  /** A player is to roll — the only phase where doubling is possible. */
  | 'pre-roll'
  /** Dice rolled: checker play in progress (ticket 03 mechanics). */
  | 'turn'
  /** A double has been offered; the opponent must take or pass. */
  | 'cube-offered'
  /** A resignation has been offered; the opponent must accept or decline. */
  | 'resign-offered'
  /** The game ended but the match continues: awaiting the next game. */
  | 'game-over'
  /** A player reached the match target. */
  | 'match-over';

/**
 * A recorded cube decision or resignation (GLOSSARY "Cube decision").
 * `afterPlays` is the number of plays already committed in the game when the
 * decision was made, pinning its position in the sequence for deterministic
 * replay and for the analyzer.
 */
export type RecordedDecision =
  | {
      readonly type: 'double' | 'take' | 'pass';
      readonly player: Player;
      readonly afterPlays: number;
    }
  | {
      readonly type: 'resign';
      readonly player: Player;
      readonly kind: GameEndKind;
      readonly afterPlays: number;
    }
  | {
      readonly type: 'resign-response';
      readonly player: Player;
      readonly accepted: boolean;
      readonly afterPlays: number;
    };

/** How a game within a match ended. */
export type MatchGameEnd = 'checkers' | 'pass' | 'resignation';

export interface MatchGameResult {
  readonly winner: Player;
  readonly end: MatchGameEnd;
  /** The undoubled result kind; a passed double is always a single. */
  readonly kind: GameEndKind;
  /** Match points awarded: base points × the cube stake. */
  readonly points: number;
}

/**
 * The full record of one game within a match: the checker-play record plus
 * every cube decision and resignation, sufficient to replay deterministically.
 */
export interface MatchGameRecord {
  readonly game: GameRecord;
  readonly decisions: readonly RecordedDecision[];
  /** True when this game was the Crawford game (doubling disabled). */
  readonly crawford: boolean;
  readonly result: MatchGameResult;
}

/** The append-only record of a whole match (replayable, exportable). */
export interface MatchRecord {
  readonly length: number;
  readonly games: readonly MatchGameRecord[];
}

export interface MatchState {
  /** Match target in points, 1-25. */
  readonly length: number;
  readonly score: MatchScore;
  /** True while the game in progress is the Crawford game. */
  readonly crawford: boolean;
  /** True once a Crawford game has started (it never recurs). */
  readonly crawfordPlayed: boolean;
  readonly cube: CubeState;
  readonly game: GameState;
  readonly phase: MatchPhase;
  /** The player to roll, during 'pre-roll' and 'cube-offered'. */
  readonly toRoll: Player | null;
  readonly pendingResignation: {
    readonly by: Player;
    readonly kind: GameEndKind;
  } | null;
  /** The phase a declined resignation returns to. */
  readonly resumePhase: 'pre-roll' | 'turn' | null;
  /** Decisions recorded so far in the current game. */
  readonly decisions: readonly RecordedDecision[];
  /** Completed games, in order. */
  readonly games: readonly MatchGameRecord[];
  /** The just-finished game's result ('game-over' and 'match-over'). */
  readonly gameResult: MatchGameResult | null;
  /** The match winner, once decided. */
  readonly winner: Player | null;
}

const opponent = (player: Player): Player =>
  player === 'white' ? 'black' : 'white';

/**
 * Is the next game the Crawford game? Yes exactly when a player sits one
 * point from the target and no Crawford game has been played yet.
 */
function isCrawfordGame(
  score: MatchScore,
  length: number,
  crawfordPlayed: boolean,
): boolean {
  return (
    !crawfordPlayed &&
    (score.white === length - 1 || score.black === length - 1)
  );
}

export interface CreateMatchOptions {
  readonly length: number;
  /** The game in progress; must have an active turn. */
  readonly game: GameState;
  readonly score?: MatchScore;
  readonly cube?: CubeState;
  /** Defaults to the Crawford derivation from the score. */
  readonly crawford?: boolean;
  readonly crawfordPlayed?: boolean;
}

/**
 * Assemble a match around a game in progress (tests, puzzles, resumption).
 * `startMatch` is the standard entry point.
 */
export function createMatch(options: CreateMatchOptions): MatchState {
  const { length, game } = options;
  if (!Number.isInteger(length) || length < 1 || length > 25) {
    throw new Error(`match length must be an integer 1-25, got ${length}`);
  }
  const score = options.score ?? { white: 0, black: 0 };
  if (score.white >= length || score.black >= length) {
    throw new Error('scores must be below the match length');
  }
  if (!game.turn || game.result) {
    throw new Error('the game must have a turn in progress');
  }
  const cube = options.cube ?? { value: 1, owner: 'center' };
  const crawford =
    options.crawford ??
    isCrawfordGame(score, length, options.crawfordPlayed ?? false);
  return {
    length,
    score,
    crawford,
    crawfordPlayed: (options.crawfordPlayed ?? false) || crawford,
    cube,
    game,
    phase: 'turn',
    toRoll: null,
    pendingResignation: null,
    resumePhase: null,
    decisions: [],
    games: [],
    gameResult: null,
    winner: null,
  };
}

/** Start a match to `length` points: game 1 begins with the opening roll. */
export function startMatch(length: number, dice: DiceSource): MatchState {
  return createMatch({ length, game: startGame(dice) });
}

function requirePhase(state: MatchState, phase: MatchPhase): void {
  if (state.phase !== phase) {
    throw new Error(`expected phase ${phase}, but the match is ${state.phase}`);
  }
}

/** Move one checker by one die within the current turn. */
export function matchMovement(
  state: MatchState,
  from: Point | 'bar',
  die: Die,
): MatchState {
  requirePhase(state, 'turn');
  return { ...state, game: applyTurnMovement(state.game, from, die) };
}

/** Undo the most recent checker movement of the current turn. */
export function undoMatchMovement(state: MatchState): MatchState {
  requirePhase(state, 'turn');
  return { ...state, game: undoTurnMovement(state.game) };
}

/**
 * Commit the current turn's movements as the Play. A finished game is scored
 * (kind × cube); otherwise the opponent enters their pre-roll phase.
 */
export function commitMatchPlay(state: MatchState): MatchState {
  requirePhase(state, 'turn');
  const player = state.game.turn?.player as Player;
  const game = commitPlayOnly(state.game);
  if (game.result) {
    return settleGame(
      { ...state, game },
      {
        winner: game.result.winner,
        end: 'checkers',
        kind: game.result.kind,
        points: game.result.points * state.cube.value,
      },
    );
  }
  return {
    ...state,
    game,
    phase: 'pre-roll',
    toRoll: opponent(player),
  };
}

/** Roll the dice from the pre-roll phase, starting the turn. */
export function rollTurn(state: MatchState, dice: DiceSource): MatchState {
  requirePhase(state, 'pre-roll');
  const roll: DiceRoll = [dice.rollDie(), dice.rollDie()];
  return {
    ...state,
    game: startNextTurn(state.game, roll),
    phase: 'turn',
    toRoll: null,
  };
}

/** The number of plays committed so far in the current game. */
function playsSoFar(state: MatchState): number {
  return state.game.record.plays.length;
}

/**
 * May the player to roll double now? Requires the pre-roll moment, access to
 * the cube (centered or owned), no Crawford game, and a live cube: once the
 * current stake already wins the match for the roller, the cube is dead.
 */
export function canDouble(state: MatchState): boolean {
  if (state.phase !== 'pre-roll' || state.toRoll === null) {
    return false;
  }
  if (state.crawford) {
    return false;
  }
  if (state.cube.owner !== 'center' && state.cube.owner !== state.toRoll) {
    return false;
  }
  return state.score[state.toRoll] + state.cube.value < state.length;
}

/** Offer a double: the player to roll turns the cube instead of rolling. */
export function offerDouble(state: MatchState): MatchState {
  if (!canDouble(state)) {
    throw new Error('doubling is not possible now');
  }
  const player = state.toRoll as Player;
  return {
    ...state,
    phase: 'cube-offered',
    decisions: [
      ...state.decisions,
      { type: 'double', player, afterPlays: playsSoFar(state) },
    ],
  };
}

/** Take the offered double: the cube doubles into the taker's ownership. */
export function takeDouble(state: MatchState): MatchState {
  requirePhase(state, 'cube-offered');
  const taker = opponent(state.toRoll as Player);
  return {
    ...state,
    cube: { value: state.cube.value * 2, owner: taker },
    phase: 'pre-roll',
    decisions: [
      ...state.decisions,
      { type: 'take', player: taker, afterPlays: playsSoFar(state) },
    ],
  };
}

/** Pass the offered double: concede the game at the pre-double stake. */
export function passDouble(state: MatchState): MatchState {
  requirePhase(state, 'cube-offered');
  const doubler = state.toRoll as Player;
  const passer = opponent(doubler);
  return settleGame(
    {
      ...state,
      decisions: [
        ...state.decisions,
        { type: 'pass', player: passer, afterPlays: playsSoFar(state) },
      ],
    },
    {
      winner: doubler,
      end: 'pass',
      kind: 'single',
      points: state.cube.value,
    },
  );
}

const KIND_POINTS: Record<GameEndKind, 1 | 2 | 3> = {
  single: 1,
  gammon: 2,
  backgammon: 3,
};

/**
 * Offer to resign the game as a single, gammon or backgammon. Either player
 * may offer whenever the game is live and no other offer is pending; the
 * opponent accepts or declines.
 */
export function offerResignation(
  state: MatchState,
  player: Player,
  kind: GameEndKind,
): MatchState {
  if (state.phase !== 'pre-roll' && state.phase !== 'turn') {
    throw new Error(`cannot resign while the match is ${state.phase}`);
  }
  return {
    ...state,
    phase: 'resign-offered',
    resumePhase: state.phase,
    pendingResignation: { by: player, kind },
    decisions: [
      ...state.decisions,
      { type: 'resign', player, kind, afterPlays: playsSoFar(state) },
    ],
  };
}

/** Accept the offered resignation: the resigner loses kind × cube. */
export function acceptResignation(state: MatchState): MatchState {
  requirePhase(state, 'resign-offered');
  const pending = state.pendingResignation as NonNullable<
    MatchState['pendingResignation']
  >;
  const winner = opponent(pending.by);
  return settleGame(
    {
      ...state,
      decisions: [
        ...state.decisions,
        {
          type: 'resign-response',
          player: winner,
          accepted: true,
          afterPlays: playsSoFar(state),
        },
      ],
    },
    {
      winner,
      end: 'resignation',
      kind: pending.kind,
      points: KIND_POINTS[pending.kind] * state.cube.value,
    },
  );
}

/** Decline the offered resignation: play resumes where it was interrupted. */
export function declineResignation(state: MatchState): MatchState {
  requirePhase(state, 'resign-offered');
  const pending = state.pendingResignation as NonNullable<
    MatchState['pendingResignation']
  >;
  return {
    ...state,
    phase: state.resumePhase as 'pre-roll' | 'turn',
    resumePhase: null,
    pendingResignation: null,
    decisions: [
      ...state.decisions,
      {
        type: 'resign-response',
        player: opponent(pending.by),
        accepted: false,
        afterPlays: playsSoFar(state),
      },
    ],
  };
}

/**
 * Start the next game of the match: a fresh opening roll and a centered cube.
 * The game is the Crawford game exactly when a player has just reached one
 * point from the target (and it has not been played yet).
 */
export function nextGame(state: MatchState, dice: DiceSource): MatchState {
  requirePhase(state, 'game-over');
  const crawford = isCrawfordGame(
    state.score,
    state.length,
    state.crawfordPlayed,
  );
  return {
    ...state,
    crawford,
    crawfordPlayed: state.crawfordPlayed || crawford,
    cube: { value: 1, owner: 'center' },
    game: startGame(dice),
    phase: 'turn',
    toRoll: null,
    pendingResignation: null,
    resumePhase: null,
    decisions: [],
    gameResult: null,
  };
}

export interface MatchGameReplay {
  readonly board: BoardState;
  readonly result: MatchGameResult;
}

/**
 * Deterministically replay one recorded game of a match: apply every play
 * and decision in their recorded interleaving and recompute the outcome. No
 * dice or engine involved — the record alone determines the result.
 */
export function replayMatchGame(record: MatchGameRecord): MatchGameReplay {
  let board = record.game.initialBoard;
  let cube: CubeState = { value: 1, owner: 'center' };
  let doubler: Player | null = null;
  let resignation: { by: Player; kind: GameEndKind } | null = null;
  let decided: MatchGameResult | null = null;
  let next = 0;

  const applyDecision = (decision: RecordedDecision): void => {
    switch (decision.type) {
      case 'double':
        doubler = decision.player;
        break;
      case 'take':
        cube = { value: cube.value * 2, owner: decision.player };
        doubler = null;
        break;
      case 'pass':
        if (!doubler) {
          throw new Error('a pass was recorded without a pending double');
        }
        decided = {
          winner: doubler,
          end: 'pass',
          kind: 'single',
          points: cube.value,
        };
        break;
      case 'resign':
        resignation = { by: decision.player, kind: decision.kind };
        break;
      case 'resign-response': {
        if (!resignation) {
          throw new Error(
            'a resignation response was recorded without an offer',
          );
        }
        if (decision.accepted) {
          decided = {
            winner: opponent(resignation.by),
            end: 'resignation',
            kind: resignation.kind,
            points: KIND_POINTS[resignation.kind] * cube.value,
          };
        }
        resignation = null;
        break;
      }
    }
  };

  const applyDecisionsAt = (afterPlays: number): void => {
    while (
      next < record.decisions.length &&
      record.decisions[next].afterPlays === afterPlays
    ) {
      applyDecision(record.decisions[next]);
      next += 1;
    }
  };

  for (let i = 0; i < record.game.plays.length; i++) {
    applyDecisionsAt(i);
    if (decided) {
      throw new Error('plays were recorded after the game was decided');
    }
    const play = record.game.plays[i];
    for (const movement of play.movements) {
      board = applyMovement(board, play.player, movement);
    }
  }
  applyDecisionsAt(record.game.plays.length);
  if (next < record.decisions.length) {
    throw new Error('decisions were recorded out of sequence');
  }

  if (!decided) {
    const checkers = gameResult(board);
    if (!checkers) {
      throw new Error('the record ends before the game does');
    }
    decided = {
      winner: checkers.winner,
      end: 'checkers',
      kind: checkers.kind,
      points: checkers.points * cube.value,
    };
  }
  return { board, result: decided };
}

export interface MatchReplay {
  readonly score: MatchScore;
  readonly winner: Player | null;
}

/**
 * Deterministically replay a whole recorded match: every game replayed and
 * scored in sequence. Returns the recomputed final score and winner.
 */
export function replayMatch(record: MatchRecord): MatchReplay {
  let score: MatchScore = { white: 0, black: 0 };
  let winner: Player | null = null;
  for (const game of record.games) {
    if (winner) {
      throw new Error('games were recorded after the match was decided');
    }
    const { result } = replayMatchGame(game);
    score = {
      white: score.white + (result.winner === 'white' ? result.points : 0),
      black: score.black + (result.winner === 'black' ? result.points : 0),
    };
    if (score[result.winner] >= record.length) {
      winner = result.winner;
    }
  }
  return { score, winner };
}

/** Score a finished game into the match: game-over, or match-over at target. */
function settleGame(state: MatchState, result: MatchGameResult): MatchState {
  const score: MatchScore = {
    white: state.score.white + (result.winner === 'white' ? result.points : 0),
    black: state.score.black + (result.winner === 'black' ? result.points : 0),
  };
  const games: readonly MatchGameRecord[] = [
    ...state.games,
    {
      game: state.game.record,
      decisions: state.decisions,
      crawford: state.crawford,
      result,
    },
  ];
  const won = score[result.winner] >= state.length;
  return {
    ...state,
    score,
    games,
    gameResult: result,
    phase: won ? 'match-over' : 'game-over',
    toRoll: null,
    pendingResignation: null,
    resumePhase: null,
    winner: won ? result.winner : null,
  };
}
