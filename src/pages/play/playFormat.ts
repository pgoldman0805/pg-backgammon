/**
 * The Play page's pure helpers: setup-state types and defaults, the status and
 * result phrasing, and the current-decision XGID. No JSX and no React — just
 * the formatting and setup logic the page and its sub-components share, kept
 * out of the page component so each reads on its own.
 */

import { DIFFICULTY_LABELS, type Difficulty } from '../../engine';
import { encodeXgid } from '../../formats';
import type { EngineOpponentState } from '../../play/opponent';
import { forcedPlay, isDance } from '../../play/selectors';
import {
  getStoredDifficulty,
  getStoredLength,
  hasPlayedBefore,
  NOVICE_SETUP,
  RETURNING_FALLBACK,
} from '../../play/settings';
import {
  type MatchGameResult,
  type MatchState,
  opponent,
  type Player,
} from '../../rules';
import type { MatchConfig, StoredMatch } from '../../storage';
import { playerName } from '../../ui/format';

export const KIND_TEXT = {
  single: 'single game',
  gammon: 'gammon',
  backgammon: 'backgammon',
} as const;

export const KIND_POINTS = { single: 1, gammon: 2, backgammon: 3 } as const;

export const RESIGN_LABEL = {
  single: 'Single',
  gammon: 'Gammon',
  backgammon: 'Backgammon',
} as const;

/** The five opponent strengths (GLOSSARY "Difficulty"), weakest first. */
export const DIFFICULTIES: ReadonlyArray<{ id: Difficulty; label: string }> = (
  Object.keys(DIFFICULTY_LABELS) as Difficulty[]
).map((id) => ({ id, label: DIFFICULTY_LABELS[id] }));

export function difficultyLabel(difficulty: Difficulty): string {
  return DIFFICULTY_LABELS[difficulty] ?? difficulty;
}

/**
 * The XGID of the current decision point (ticket 10): the pre-play position
 * with the dice during a turn, the pre-roll position otherwise, a pending
 * double while the cube is offered. Null once the game is settled.
 */
export function currentXgid(match: MatchState | null): string | null {
  if (!match) {
    return null;
  }
  const context = {
    matchLength: match.length,
    score: match.score,
    crawford: match.crawford,
    cube: match.cube,
  };
  if (match.phase === 'turn' && match.game.turn) {
    const turn = match.game.turn;
    return encodeXgid(
      { board: turn.startBoard, onRoll: turn.player, match: context },
      turn.roll,
    );
  }
  if (match.phase === 'pre-roll' && match.toRoll) {
    return encodeXgid({
      board: match.game.board,
      onRoll: match.toRoll,
      match: context,
    });
  }
  if (match.phase === 'cube-offered' && match.toRoll) {
    return encodeXgid(
      { board: match.game.board, onRoll: match.toRoll, match: context },
      undefined,
      { pendingDouble: true },
    );
  }
  return null;
}

export type PlayMode = 'computer' | 'hotseat' | 'remote';

/**
 * The sides the human at this screen controls: White against the computer,
 * both in hot-seat, and in a remote room only the seat they took (none until
 * the seat is known).
 */
export function localSidesFor(
  mode: PlayMode,
  localSide: Player | null,
): readonly Player[] {
  if (mode === 'hotseat') {
    return ['white', 'black'];
  }
  if (mode === 'remote') {
    return localSide ? [localSide] : [];
  }
  return ['white'];
}

/**
 * Match play to a point target, or a money session (GLOSSARY "Money play"):
 * unlimited single games, the cube live from the start, gammons scored under
 * the Jacoby rule.
 */
export type GameType = 'match' | 'money';

export interface PlaySetup {
  readonly mode: PlayMode;
  readonly difficulty: Difficulty;
  /** Match length in points, 1-25 (ignored for a money session). */
  readonly length: number;
  /** Match play or a money session; absent means match. */
  readonly gameType?: GameType;
}

/**
 * The setup card's opening state (ticket 33). A first-time user starts on the
 * novice defaults (Beginner, a quick 1-point game); once they have started a
 * match or changed a picker, their own remembered choice wins. Mode always
 * opens on vs-computer — the hot-seat button is one click away.
 */
export function initialSetup(): PlaySetup {
  if (!hasPlayedBefore()) {
    return { mode: 'computer', gameType: 'match', ...NOVICE_SETUP };
  }
  const storedId = getStoredDifficulty();
  const difficulty =
    DIFFICULTIES.find((d) => d.id === storedId)?.id ??
    RETURNING_FALLBACK.difficulty;
  const length = getStoredLength() ?? RETURNING_FALLBACK.length;
  return { mode: 'computer', difficulty, length, gameType: 'match' };
}

/** Rebuild the setup pickers' state from a stored match's config. */
export function setupFromConfig(config: MatchConfig): PlaySetup {
  const difficulty = DIFFICULTIES.find((d) => d.id === config.difficulty)?.id;
  return {
    mode:
      config.mode === 'hotseat' || config.mode === 'remote'
        ? config.mode
        : 'computer',
    difficulty: difficulty ?? 'casual',
    length:
      typeof config.length === 'number' && config.length > 0
        ? config.length
        : 7,
    gameType: config.gameType === 'money' ? 'money' : 'match',
  };
}

/** One line describing a stored match, e.g. "5-point match vs Casual". */
export function storedMatchName(stored: StoredMatch): string {
  const { config } = stored;
  if (config.mode === 'remote') {
    return `${config.length}-point match online`;
  }
  const opponentName =
    config.mode === 'hotseat'
      ? 'hot-seat'
      : `vs ${difficultyLabel(config.difficulty ?? 'casual')}`;
  if (config.gameType === 'money') {
    return config.mode === 'hotseat'
      ? 'Money session (hot-seat)'
      : `Money session vs ${difficultyLabel(config.difficulty ?? 'casual')}`;
  }
  return config.mode === 'hotseat'
    ? `${config.length}-point hot-seat match`
    : `${config.length}-point match ${opponentName}`;
}

export function points(n: number): string {
  return n === 1 ? '1 point' : `${n} points`;
}

/** How the finished game ended, e.g. "White wins a gammon — 2 points." */
export function gameEndText(result: MatchGameResult): string {
  switch (result.end) {
    case 'checkers':
      return `${playerName(result.winner)} wins a ${KIND_TEXT[result.kind]} — ${points(result.points)}.`;
    case 'pass':
      return `${playerName(opponent(result.winner))} passes the double — ${playerName(result.winner)} wins ${points(result.points)}.`;
    case 'resignation':
      return `${playerName(opponent(result.winner))} resigns a ${KIND_TEXT[result.kind]} — ${playerName(result.winner)} wins ${points(result.points)}.`;
  }
}

export function statusText(
  match: MatchState | null,
  thinking: boolean,
  mode: PlayMode,
): string {
  if (!match) {
    return '';
  }
  if (thinking) {
    return 'Black is thinking…';
  }
  const considering = (responder: Player) =>
    mode === 'computer' && responder === 'black'
      ? ' Black is considering…'
      : '';
  switch (match.phase) {
    case 'match-over': {
      const winner = match.winner ?? 'white';
      return `${playerName(winner)} wins the match ${match.score[winner]}–${match.score[opponent(winner)]}.`;
    }
    case 'game-over':
      return match.gameResult ? gameEndText(match.gameResult) : '';
    case 'cube-offered': {
      const doubler = match.toRoll ?? 'white';
      return `${playerName(doubler)} doubles to ${match.cube.value * 2}.${considering(opponent(doubler))}`;
    }
    case 'resign-offered': {
      const pending = match.pendingResignation;
      if (!pending) {
        return '';
      }
      return `${playerName(pending.by)} offers to resign a ${KIND_TEXT[pending.kind]}.${considering(opponent(pending.by))}`;
    }
    case 'pre-roll':
      return `${playerName(match.toRoll ?? 'white')} to roll.`;
    case 'turn': {
      const turn = match.game.turn;
      if (!turn) {
        return '';
      }
      const dice = `${turn.roll[0]} and ${turn.roll[1]}`;
      if (isDance(match.game)) {
        return `${playerName(turn.player)} rolled ${dice} — no legal plays.`;
      }
      if (forcedPlay(match.game)) {
        return `${playerName(turn.player)} to play ${dice} — only one legal play.`;
      }
      return `${playerName(turn.player)} to play ${dice}.`;
    }
  }
}

export const IDLE_OPPONENT: EngineOpponentState = {
  thinking: false,
  error: null,
};
