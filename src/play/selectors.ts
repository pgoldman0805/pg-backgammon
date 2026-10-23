/**
 * Pure read-model selectors over the game state for the Play UI.
 *
 * All legality flows from the rules engine: `legalPlays` fixes the set of
 * complete plays for the turn (max-dice and higher-die rules included), and
 * `legalMovements`/`applyMovement` validate every candidate hop. These
 * selectors only *search over* engine-validated movements, accepting exactly
 * the sequences that end on an engine-enumerated final position — so a
 * highlighted movement can always be extended into a committable play.
 */

import {
  applyMovement,
  type BoardState,
  type CheckerMovement,
  type Die,
  type GameState,
  legalMovements,
  legalPlays,
  type Play,
  type Point,
  type TurnState,
} from '../rules';

/** Identity key for a position; serialization only, no rules knowledge. */
function boardKey(board: BoardState): string {
  return `${board.points.join(',')}|${board.bar.white},${board.bar.black}|${board.off.white},${board.off.black}`;
}

interface TurnPlan {
  /** Every complete legal play for this turn, from the rules engine. */
  readonly plays: readonly Play[];
  /** Movements per complete play; 0 means a dance. */
  readonly maximalLength: number;
  /** Keys of the board positions a complete play ends on. */
  readonly finalKeys: ReadonlySet<string>;
}

const planCache = new WeakMap<TurnState, TurnPlan>();

function turnPlan(turn: TurnState): TurnPlan {
  let plan = planCache.get(turn);
  if (!plan) {
    const plays = legalPlays(turn.startBoard, turn.player, turn.roll);
    const finalKeys = new Set<string>();
    for (const play of plays) {
      const finalBoard = play.movements.reduce(
        (board, movement) => applyMovement(board, turn.player, movement),
        turn.startBoard,
      );
      finalKeys.add(boardKey(finalBoard));
    }
    plan = {
      plays,
      maximalLength: plays[0]?.movements.length ?? 0,
      finalKeys,
    };
    planCache.set(turn, plan);
  }
  return plan;
}

function removeDie(dice: readonly Die[], die: Die): Die[] {
  const index = dice.indexOf(die);
  return [...dice.slice(0, index), ...dice.slice(index + 1)];
}

/**
 * Can a complete legal play still be reached from this mid-turn position?
 * Walks engine-validated movements only; accepts exactly the positions the
 * engine enumerated as complete plays.
 */
function reachesCompletePlay(
  plan: TurnPlan,
  turn: TurnState,
  board: BoardState,
  dice: readonly Die[],
  used: number,
  memo: Map<string, boolean>,
): boolean {
  if (used === plan.maximalLength) {
    return plan.finalKeys.has(boardKey(board));
  }
  const key = `${boardKey(board)}#${[...dice].sort().join(',')}`;
  const cached = memo.get(key);
  if (cached !== undefined) {
    return cached;
  }
  let reachable = false;
  for (const movement of legalMovements(board, turn.player, dice)) {
    if (
      reachesCompletePlay(
        plan,
        turn,
        applyMovement(board, turn.player, movement),
        removeDie(dice, movement.die),
        used + 1,
        memo,
      )
    ) {
      reachable = true;
      break;
    }
  }
  memo.set(key, reachable);
  return reachable;
}

const viableCache = new WeakMap<GameState, readonly CheckerMovement[]>();

/**
 * The single-checker movements available right now that can still be
 * extended into a complete legal play. The UI offers exactly these, so a
 * player can never move into a dead end.
 */
export function viableMovements(
  game: GameState | null,
): readonly CheckerMovement[] {
  if (!game?.turn) {
    return [];
  }
  let viable = viableCache.get(game);
  if (!viable) {
    const turn = game.turn;
    const plan = turnPlan(turn);
    const memo = new Map<string, boolean>();
    viable = legalMovements(game.board, turn.player, turn.remainingDice).filter(
      (movement) =>
        reachesCompletePlay(
          plan,
          turn,
          applyMovement(game.board, turn.player, movement),
          removeDie(turn.remainingDice, movement.die),
          turn.movements.length + 1,
          memo,
        ),
    );
    viableCache.set(game, viable);
  }
  return viable;
}

/** Origins the current player may pick up from, bar first then low to high. */
export function movableOrigins(game: GameState | null): (Point | 'bar')[] {
  const origins = new Set(viableMovements(game).map((m) => m.from));
  const points = [...origins].filter((o): o is Point => o !== 'bar');
  points.sort((a, b) => a - b);
  return origins.has('bar') ? ['bar', ...points] : points;
}

/**
 * The viable movements from one origin, one per destination. When both dice
 * reach the same destination (bear-off only), the higher die is used.
 */
export function destinationsFrom(
  game: GameState | null,
  from: Point | 'bar',
): CheckerMovement[] {
  const byDestination = new Map<Point | 'off', CheckerMovement>();
  for (const movement of viableMovements(game)) {
    if (movement.from !== from) {
      continue;
    }
    const existing = byDestination.get(movement.to);
    if (!existing || movement.die > existing.die) {
      byDestination.set(movement.to, movement);
    }
  }
  return [...byDestination.values()];
}

/** True when the roll has no legal play: the turn commits with no movements. */
export function isDance(game: GameState | null): boolean {
  return game?.turn != null && turnPlan(game.turn).maximalLength === 0;
}

/** The turn's only legal play, or null when the player has a choice. */
export function forcedPlay(game: GameState | null): Play | null {
  if (!game?.turn) {
    return null;
  }
  const plan = turnPlan(game.turn);
  return plan.plays.length === 1 ? plan.plays[0] : null;
}

/**
 * True when the movements made so far form a complete legal play — the same
 * test `commitPlay` enforces, so commit never throws when this allows it.
 */
export function canCommit(game: GameState | null): boolean {
  if (!game?.turn) {
    return false;
  }
  const turn = game.turn;
  const plan = turnPlan(turn);
  if (plan.maximalLength === 0) {
    return turn.movements.length === 0;
  }
  return (
    turn.movements.length === plan.maximalLength &&
    plan.finalKeys.has(boardKey(game.board))
  );
}

/** True when at least one movement of the current turn can be undone. */
export function canUndo(game: GameState | null): boolean {
  return (game?.turn?.movements.length ?? 0) > 0;
}
