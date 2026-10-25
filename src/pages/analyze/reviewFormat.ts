/**
 * The Analyze page's pure helpers: the ledger-row phrasing (match name, result
 * line, dates), the decision phrasing shared by the review list, headers and
 * verdicts, and the small predicates and shapes the review and ledger build
 * on. No JSX — just the formatting the page and its sub-components share.
 */

import type { AnalyzedDecision, AnalyzedPlay } from '../../analysis';
import { DIFFICULTY_LABELS } from '../../engine';
import type { MatPlayers } from '../../formats';
import {
  type Die,
  type GameEndKind,
  type MatchGameRecord,
  opponent,
} from '../../rules';
import type { StoredMatch } from '../../storage';
import { playerName } from '../../ui/format';

export const KIND_TEXT: Record<GameEndKind, string> = {
  single: 'single game',
  gammon: 'gammon',
  backgammon: 'backgammon',
};

export const DIFFICULTY_LABEL: Record<string, string> = DIFFICULTY_LABELS;

/** The player names an imported match carries in its config, if any. */
export function storedPlayers(stored: StoredMatch): MatPlayers | undefined {
  const players = stored.config.players;
  if (
    typeof players === 'object' &&
    players !== null &&
    typeof (players as MatPlayers).white === 'string' &&
    typeof (players as MatPlayers).black === 'string'
  ) {
    return players as MatPlayers;
  }
  return undefined;
}

/** "5-point match vs Casual" / "5-point hot-seat match". */
export function matchName(stored: StoredMatch): string {
  const length = `${stored.config.length}-point`;
  if (stored.config.mode === 'imported') {
    const players = storedPlayers(stored);
    return `${length} imported match${
      players ? ` (${players.white} vs ${players.black})` : ''
    }`;
  }
  if (stored.config.mode === 'hotseat') {
    return `${length} hot-seat match`;
  }
  const difficulty =
    DIFFICULTY_LABEL[String(stored.config.difficulty)] ?? 'the computer';
  return `${length} match vs ${difficulty}`;
}

/** "White wins 7–3" for finished matches, the standing otherwise. */
export function resultLine(stored: StoredMatch): string {
  if (stored.status === 'finished' && stored.winner) {
    const winner = stored.winner;
    return `${playerName(winner)} wins ${stored.score[winner]}–${stored.score[opponent(winner)]}`;
  }
  return `White ${stored.score.white} · Black ${stored.score.black}`;
}

function formatDate(ms: number): string {
  // Non-breaking spaces keep the date whole when a ledger meta line wraps.
  return new Date(ms)
    .toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
    .replace(/ /g, ' ');
}

export function metaLine(stored: StoredMatch): string {
  const when =
    stored.status === 'finished'
      ? `finished ${formatDate(stored.updatedAt)}`
      : `last played ${formatDate(stored.updatedAt)}`;
  return `${matchName(stored)}, ${when}`;
}

/** One game of the record, phrased as the Play area's match summary. */
export function gameLine(completed: MatchGameRecord): string {
  const { result } = completed;
  const how =
    result.end === 'pass'
      ? 'double passed'
      : result.end === 'resignation'
        ? `resigned ${KIND_TEXT[result.kind]}`
        : KIND_TEXT[result.kind];
  const crawford = completed.crawford ? ' (Crawford)' : '';
  return `${playerName(result.winner)} +${result.points} — ${how}${crawford}`;
}

export const CLASSIFICATION_TEXT = {
  blunder: 'Blunder',
  error: 'Error',
  dubious: 'Dubious',
  ok: '',
} as const;

export const CUBE_ERROR_TEXT = {
  'missed-double': 'Missed double',
  'wrong-double': 'Wrong double',
  'wrong-take': 'Wrong take',
  'wrong-pass': 'Wrong pass',
} as const;

export function rollText(roll: AnalyzedPlay['roll']): string {
  return `${roll[0]}-${roll[1]}`;
}

/** The short action text of a decision, for list rows and headers. */
export function decisionText(decision: AnalyzedDecision): string {
  if (decision.kind === 'play') {
    return decision.moveText;
  }
  switch (decision.action) {
    case 'double':
      return `Doubles to ${decision.cubeValue * 2}`;
    case 'take':
      return 'Takes';
    case 'pass':
      return 'Passes';
    case 'no-double':
      return 'No double';
  }
}

/** The accessible name of a decision row. */
export function decisionLabel(decision: AnalyzedDecision): string {
  const player = playerName(decision.player);
  if (decision.kind === 'play') {
    return `${player} plays ${rollText(decision.roll)}: ${decision.moveText}`;
  }
  switch (decision.action) {
    case 'double':
      return `${player} doubles to ${decision.cubeValue * 2}`;
    case 'take':
      return `${player} takes the double`;
    case 'pass':
      return `${player} passes the double`;
    case 'no-double':
      return `${player} holds the cube`;
  }
}

/** The detail panel's headline for a decision. */
export function decisionHeadline(decision: AnalyzedDecision): string {
  const player = playerName(decision.player);
  if (decision.kind === 'play') {
    return `${player} played ${decision.moveText}`;
  }
  switch (decision.action) {
    case 'double':
      return `${player} doubles to ${decision.cubeValue * 2}`;
    case 'take':
      return `${player} takes the double`;
    case 'pass':
      return `${player} passes the double`;
    case 'no-double':
      return `${player} holds the cube`;
  }
}

/** The verdict line under the headline. */
export function verdictText(decision: AnalyzedDecision): string {
  if (decision.kind === 'play') {
    if (decision.rank === 1) {
      return 'The engine’s best play.';
    }
    if (decision.equityLoss < 0.0005) {
      return 'As good as the best — no equity lost.';
    }
    return `Lost ${decision.equityLoss.toFixed(3)} — ${CLASSIFICATION_TEXT[decision.classification] || 'small'}.`;
  }
  if (decision.error) {
    return `${CUBE_ERROR_TEXT[decision.error]} — lost ${decision.equityLoss.toFixed(3)}${
      decision.classification === 'ok'
        ? ''
        : ` (${CLASSIFICATION_TEXT[decision.classification].toLowerCase()})`
    }.`;
  }
  return 'Correct.';
}

/** Hide quiet, correct cube holds from the list (they still count). */
export function isVisible(decision: AnalyzedDecision): boolean {
  return !(
    decision.kind === 'cube' &&
    decision.action === 'no-double' &&
    decision.classification === 'ok'
  );
}

export interface DecisionRef {
  readonly game: number;
  readonly index: number;
}

export function sameRef(a: DecisionRef | null, b: DecisionRef): boolean {
  return a !== null && a.game === b.game && a.index === b.index;
}

export function diceOf(roll: AnalyzedPlay['roll']): Die[] {
  return roll[0] === roll[1]
    ? [roll[0], roll[0], roll[0], roll[0]]
    : [roll[0], roll[1]];
}

export const noop = () => {};
