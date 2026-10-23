import { applyMovement, initialBoard, undoMovement } from './board';
import type { DiceSource } from './dice';
import { computeMovement, legalPlays } from './plays';
import type {
  BoardState,
  CheckerMovement,
  DiceRoll,
  Die,
  GameRecord,
  GameResult,
  Player,
  Point,
} from './types';

export interface TurnState {
  readonly player: Player;
  readonly roll: DiceRoll;
  /** The board as it stood when the turn began (undo and commit baseline). */
  readonly startBoard: BoardState;
  /** Movements applied so far this turn, in order. */
  readonly movements: readonly CheckerMovement[];
  /** Dice not yet used this turn (doubles start with four). */
  readonly remainingDice: readonly Die[];
}

export interface GameState {
  readonly board: BoardState;
  /** The in-progress turn, or null once the game has ended. */
  readonly turn: TurnState | null;
  readonly record: GameRecord;
  readonly result: GameResult | null;
}

const opponent = (player: Player): Player =>
  player === 'white' ? 'black' : 'white';

function diceForRoll(roll: DiceRoll): Die[] {
  const [a, b] = roll;
  return a === b ? [a, a, a, a] : [a, b];
}

function remainingAfter(
  roll: DiceRoll,
  movements: readonly CheckerMovement[],
): Die[] {
  const remaining = diceForRoll(roll);
  for (const movement of movements) {
    const index = remaining.indexOf(movement.die);
    if (index === -1) {
      throw new Error(
        `movement uses die ${movement.die} not available in the roll`,
      );
    }
    remaining.splice(index, 1);
  }
  return remaining;
}

function newTurn(player: Player, roll: DiceRoll, board: BoardState): TurnState {
  return {
    player,
    roll,
    startBoard: board,
    movements: [],
    remainingDice: diceForRoll(roll),
  };
}

/**
 * Start a standard game: each player rolls one die for the opening roll,
 * doubles reroll, and the higher roller plays both dice as the first turn.
 * Every attempt is recorded for a fully deterministic record.
 */
export function startGame(dice: DiceSource): GameState {
  const openingRolls: Array<{ white: Die; black: Die }> = [];
  let white: Die;
  let black: Die;
  do {
    white = dice.rollDie();
    black = dice.rollDie();
    openingRolls.push({ white, black });
  } while (white === black);

  const firstPlayer: Player = white > black ? 'white' : 'black';
  const board = initialBoard();
  const roll: DiceRoll = [white, black];
  return {
    board,
    turn: newTurn(firstPlayer, roll, board),
    record: { initialBoard: board, openingRolls, firstPlayer, plays: [] },
    result: null,
  };
}

export interface CreateGameOptions {
  readonly board: BoardState;
  readonly player: Player;
  readonly roll: DiceRoll;
}

/**
 * Start a game from an arbitrary position with a known roll (puzzles, tests).
 */
export function createGame(options: CreateGameOptions): GameState {
  const { board, player, roll } = options;
  return {
    board,
    turn: newTurn(player, roll, board),
    record: {
      initialBoard: board,
      openingRolls: [],
      firstPlayer: player,
      plays: [],
    },
    result: null,
  };
}

function requireTurn(state: GameState): TurnState {
  if (!state.turn) {
    throw new Error('the game has ended');
  }
  return state.turn;
}

/**
 * Move one checker by one die within the current turn. Throws when the die
 * is not available or the movement is illegal in the current position.
 */
export function applyTurnMovement(
  state: GameState,
  from: Point | 'bar',
  die: Die,
): GameState {
  const turn = requireTurn(state);
  if (!turn.remainingDice.includes(die)) {
    throw new Error(`die ${die} is not available this turn`);
  }
  const movement = computeMovement(state.board, turn.player, from, die);
  if (!movement) {
    throw new Error(`illegal movement: ${from} with die ${die}`);
  }
  const movements = [...turn.movements, movement];
  return {
    ...state,
    board: applyMovement(state.board, turn.player, movement),
    turn: {
      ...turn,
      movements,
      remainingDice: remainingAfter(turn.roll, movements),
    },
  };
}

/** Undo the most recent checker movement of the current turn. */
export function undoTurnMovement(state: GameState): GameState {
  const turn = requireTurn(state);
  if (turn.movements.length === 0) {
    throw new Error('no movement to undo');
  }
  const movements = turn.movements.slice(0, -1);
  const last = turn.movements[turn.movements.length - 1];
  return {
    ...state,
    board: undoMovement(state.board, turn.player, last),
    turn: {
      ...turn,
      movements,
      remainingDice: remainingAfter(turn.roll, movements),
    },
  };
}

function boardKey(board: BoardState): string {
  return `${board.points.join(',')}|${board.bar.white},${board.bar.black}|${board.off.white},${board.off.black}`;
}

/**
 * Commit the current turn's movements as a Play, without rolling the next
 * turn. The movements must form a complete legal play (maximum dice used;
 * higher die when only one plays) — a dance commits with zero movements.
 * Appends to the game record and detects game end; the returned state has no
 * turn in progress (the match layer's pre-roll phase, see src/rules/match.ts).
 */
export function commitPlayOnly(state: GameState): GameState {
  const turn = requireTurn(state);
  const plays = legalPlays(turn.startBoard, turn.player, turn.roll);

  if (plays.length === 0) {
    if (turn.movements.length > 0) {
      throw new Error('no legal plays exist, yet movements were applied');
    }
  } else {
    const maximalLength = plays[0].movements.length;
    const key = boardKey(state.board);
    const matches =
      turn.movements.length === maximalLength &&
      plays.some((play) => {
        const final = play.movements.reduce(
          (b, m) => applyMovement(b, turn.player, m),
          turn.startBoard,
        );
        return boardKey(final) === key;
      });
    if (!matches) {
      throw new Error(
        'the applied movements do not form a complete legal play',
      );
    }
  }

  const record: GameRecord = {
    ...state.record,
    plays: [
      ...state.record.plays,
      { player: turn.player, roll: turn.roll, movements: turn.movements },
    ],
  };

  return {
    board: state.board,
    turn: null,
    record,
    result: gameResult(state.board),
  };
}

/**
 * Rewind the game to the start of the turn that produced the play at `index`:
 * the board is rebuilt from the record, the same roll is restored with no
 * movements made, and that play (with everything after it) leaves the record.
 * The pure capability behind Tutor-mode takebacks (GLOSSARY "Takeback").
 */
export function rewindToTurn(state: GameState, index: number): GameState {
  const plays = state.record.plays;
  if (!Number.isInteger(index) || index < 0 || index >= plays.length) {
    throw new Error(`no committed play at index ${index} to rewind to`);
  }
  let board = state.record.initialBoard;
  for (let i = 0; i < index; i++) {
    for (const movement of plays[i].movements) {
      board = applyMovement(board, plays[i].player, movement);
    }
  }
  const target = plays[index];
  return {
    board,
    turn: newTurn(target.player, target.roll, board),
    record: { ...state.record, plays: plays.slice(0, index) },
    result: null,
  };
}

/**
 * Begin the next player's turn with a known roll, on a game whose previous
 * play was committed without rolling (see {@link commitPlayOnly}).
 */
export function startNextTurn(state: GameState, roll: DiceRoll): GameState {
  if (state.turn) {
    throw new Error('a turn is already in progress');
  }
  if (state.result) {
    throw new Error('the game has ended');
  }
  const last = state.record.plays[state.record.plays.length - 1];
  if (!last) {
    throw new Error('no play has been committed yet');
  }
  return {
    ...state,
    turn: newTurn(opponent(last.player), roll, state.board),
  };
}

/**
 * Commit the current turn's movements as a Play (see {@link commitPlayOnly})
 * and, unless the game ended, roll the next player's turn from `dice`.
 */
export function commitPlay(state: GameState, dice: DiceSource): GameState {
  const committed = commitPlayOnly(state);
  if (committed.result) {
    return committed;
  }
  return startNextTurn(committed, [dice.rollDie(), dice.rollDie()]);
}

/**
 * Detect a finished game: a player with all 15 checkers borne off wins a
 * single (loser has borne off), a gammon (loser has not), or a backgammon
 * (loser additionally has a checker on the bar or in the winner's home board).
 */
export function gameResult(board: BoardState): GameResult | null {
  for (const winner of ['white', 'black'] as const) {
    if (board.off[winner] !== 15) {
      continue;
    }
    const loser = opponent(winner);
    if (board.off[loser] > 0) {
      return { winner, kind: 'single', points: 1 };
    }
    const loserSign = loser === 'white' ? 1 : -1;
    const [homeStart, homeEnd] = winner === 'white' ? [1, 6] : [19, 24];
    let inWinnerHome = false;
    for (let p = homeStart; p <= homeEnd; p++) {
      if (board.points[p] * loserSign > 0) {
        inWinnerHome = true;
        break;
      }
    }
    if (board.bar[loser] > 0 || inWinnerHome) {
      return { winner, kind: 'backgammon', points: 3 };
    }
    return { winner, kind: 'gammon', points: 2 };
  }
  return null;
}
