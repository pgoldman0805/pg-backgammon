/**
 * Jellyfish .mat match export and import (ticket 10): the text format the
 * wider backgammon world exchanges, mapped onto the deterministic MatchRecord
 * (src/rules/match.ts). The format is not formally defined, so the writer
 * follows gnubg 1.05's own conventions byte-for-byte where they are known
 * (see the format exploration notes) and the reader parses liberally:
 * " N point match" header, per-game " name : score" line with the left column
 * padded to 31 characters, move pairs numbered down the left player's column
 * (left entry padded to 27), cube actions as " Doubles => N" / " Takes" /
 * " Drops", and a "Wins N point(s)" line in the winner's column. White is
 * player 0 (the left column), black player 1.
 *
 * Resignations are not representable in .mat: an accepted resignation game
 * simply ends with the winner's "Wins" line (gnubg does the same), and a
 * declined resignation leaves no trace. The importer reconstructs an accepted
 * resignation whenever a game's "Wins" arrives with the board unfinished and
 * no double dropped.
 *
 * Crawford is inferred, not stored (gnubg's reader does the same): a game is
 * the Crawford game exactly when, at its start, a player first stands one
 * point from the match target — the same rule src/rules/match.ts applies to
 * native matches, so inferred flags agree with what a native record holds.
 *
 * Every imported play is validated through src/rules legality
 * (matchPlayByMoveText joins the notation against legalPlays): a move that is
 * illegal under our rules is a hard parse error naming the line.
 */

import { matchPlayByMoveText } from '../engine/moveText';
import {
  applyMovement,
  type CheckerMovement,
  type Die,
  gameResult,
  initialBoard,
  legalPlays,
  type MatchGameRecord,
  type MatchRecord,
  type Play,
  type Player,
  replayMatch,
  replayMatchGame,
} from '../rules';
import { matchStandings } from '../analysis';

/** The two players' display names, white first (the left .mat column). */
export interface MatPlayers {
  readonly white: string;
  readonly black: string;
}

const DEFAULT_PLAYERS: MatPlayers = { white: 'White', black: 'Black' };

/** A point in the acting player's own numbering (24 down to 1 toward off). */
function relative(
  location: CheckerMovement['from'] | CheckerMovement['to'],
  player: Player,
): string {
  if (location === 'bar' || location === 'off') {
    return location;
  }
  return String(player === 'white' ? location : 25 - location);
}

/** "8/5 6/5", "bar/22 24/18*", "13/8(2)" — one token per grouped hop. Only
 * consecutive identical hops merge, so the notation replays the movements in
 * their recorded order (reordering could change which blots are hit). */
function playText(play: Play): string {
  const groups: Array<{ base: string; hit: boolean; count: number }> = [];
  for (const movement of play.movements) {
    const base = `${relative(movement.from, play.player)}/${relative(movement.to, play.player)}`;
    const group = groups[groups.length - 1];
    if (group && group.base === base) {
      group.count += 1;
      group.hit = group.hit || movement.hit;
    } else {
      groups.push({ base, hit: movement.hit, count: 1 });
    }
  }
  return groups
    .map(
      (g) => `${g.base}${g.hit ? '*' : ''}${g.count > 1 ? `(${g.count})` : ''}`,
    )
    .join(' ');
}

/** One half-move column entry: who acts, and the text in their column. */
interface Entry {
  readonly player: Player;
  readonly text: string;
}

/** The game's half-move entries in order: plays and cube actions interleaved
 * at their recorded afterPlays spots; resignations leave no entry. */
function gameEntries(record: MatchGameRecord): Entry[] {
  const entries: Entry[] = [];
  let cube = 1;
  let next = 0;

  const decisionsAt = (afterPlays: number): void => {
    while (
      next < record.decisions.length &&
      record.decisions[next].afterPlays === afterPlays
    ) {
      const decision = record.decisions[next];
      next += 1;
      switch (decision.type) {
        case 'double':
          cube *= 2;
          entries.push({ player: decision.player, text: ` Doubles => ${cube}` });
          break;
        case 'take':
          entries.push({ player: decision.player, text: ' Takes' });
          break;
        case 'pass':
          entries.push({ player: decision.player, text: ' Drops' });
          break;
        default:
          // Resignations are not .mat-representable; the Wins line carries
          // the outcome.
          break;
      }
    }
  };

  for (let i = 0; i < record.game.plays.length; i++) {
    decisionsAt(i);
    const play = record.game.plays[i];
    entries.push({
      player: play.player,
      text: `${play.roll[0]}${play.roll[1]}: ${playText(play)}`.trimEnd(),
    });
  }
  decisionsAt(record.game.plays.length);
  return entries;
}

/** gnubg's game layout: "%3d) %-27s %s" pairs, left column = white. */
function renderGame(
  record: MatchGameRecord,
  score: { white: number; black: number },
  players: MatPlayers,
  index: number,
): string {
  const lines: string[] = [];
  lines.push(` Game ${index + 1}`);
  lines.push(
    ` ${`${players.white} : ${score.white}`.padEnd(31)}${players.black} : ${score.black}`,
  );

  const entries = gameEntries(record);
  const { result } = replayMatchGame(record);
  const winsText = `Wins ${result.points} point${result.points === 1 ? '' : 's'}`;

  let pair = 0;
  let open: string | null = null;
  const flush = (right: string): void => {
    pair += 1;
    lines.push(
      `${String(pair).padStart(3)}) ${(open ?? '').padEnd(27)} ${right}`.trimEnd(),
    );
    open = null;
  };

  for (const entry of entries) {
    if (entry.player === 'white') {
      if (open !== null) {
        // Defensive: records alternate actors, but never drop an entry.
        flush('');
      }
      open = entry.text;
    } else {
      // An empty left column happens only when black opens the game.
      flush(entry.text);
    }
  }

  if (open !== null) {
    // The line is open after white's entry.
    if (result.winner === 'black') {
      flush(winsText);
    } else {
      flush('');
      lines.push(`      ${winsText}`);
    }
  } else if (result.winner === 'white') {
    lines.push(`      ${winsText}`);
  } else {
    lines.push(`${' '.repeat(34)}${winsText}`);
  }

  lines.push('');
  return lines.join('\n');
}

/**
 * Render a finished (or partially played) match record as Jellyfish .mat
 * text. Scores at each game's start come from replaying the record.
 */
export function exportMat(
  record: MatchRecord,
  players: MatPlayers = DEFAULT_PLAYERS,
): string {
  const standard = JSON.stringify(initialBoard());
  for (const game of record.games) {
    if (JSON.stringify(game.game.initialBoard) !== standard) {
      throw new Error(
        '.mat can only carry games played from the standard starting position',
      );
    }
  }
  const standings = matchStandings(record);
  const games = record.games.map((game, index) =>
    renderGame(game, standings[index].score, players, index),
  );
  return [` ${record.length} point match`, '', ...games, ''].join('\n');
}

/* ------------------------------------------------------------------ */
/* Import                                                               */
/* ------------------------------------------------------------------ */

/** A .mat parse failure, naming the 1-based line where possible. */
export class MatParseError extends Error {
  readonly line: number | null;

  constructor(message: string, line: number | null = null) {
    super(line === null ? message : `line ${line}: ${message}`);
    this.name = 'MatParseError';
    this.line = line;
  }
}

/** A successfully imported match. */
export interface MatImport {
  readonly record: MatchRecord;
  readonly players: MatPlayers;
}

const other = (player: Player): Player =>
  player === 'white' ? 'black' : 'white';

/** One parsed half-move column entry, with its source position. */
type RawEntry = { readonly line: number; readonly column: number } & (
  | { readonly kind: 'play'; readonly dice: [Die, Die]; readonly moves: string }
  | { readonly kind: 'double'; readonly value: number | null }
  | { readonly kind: 'take' }
  | { readonly kind: 'drop' }
  | { readonly kind: 'wins'; readonly points: number }
);

/** Entry starters, matched anywhere in a move line (column split is by
 * content, not position — writers' padding varies). */
const ENTRY_START =
  /([1-6])\s?([1-6])\s*:|\bDoubles\b(?:\s*=>?\s*(\d+))?|\bTakes?\b|\bDrops?\b|\bWins\b\s*:?\s*(\d+)\s*point/gi;

/** Parse one game line (already stripped of its move number) into entries. */
function lineEntries(text: string, line: number, offset: number): RawEntry[] {
  const entries: RawEntry[] = [];
  const starts: Array<{ match: RegExpExecArray; end: number }> = [];
  ENTRY_START.lastIndex = 0;
  for (
    let match = ENTRY_START.exec(text);
    match !== null;
    match = ENTRY_START.exec(text)
  ) {
    starts.push({ match, end: ENTRY_START.lastIndex });
  }
  starts.forEach(({ match, end }, index) => {
    const column = offset + match.index;
    const keyword = match[0].toLowerCase();
    if (match[1] && match[2]) {
      const until = starts[index + 1]?.match.index ?? text.length;
      entries.push({
        kind: 'play',
        line,
        column,
        dice: [Number(match[1]) as Die, Number(match[2]) as Die],
        moves: text.slice(end, until).trim(),
      });
    } else if (keyword.startsWith('doubles')) {
      entries.push({
        kind: 'double',
        line,
        column,
        value: match[3] ? Number(match[3]) : null,
      });
    } else if (keyword.startsWith('take')) {
      entries.push({ kind: 'take', line, column });
    } else if (keyword.startsWith('drop')) {
      entries.push({ kind: 'drop', line, column });
    } else {
      entries.push({ kind: 'wins', line, column, points: Number(match[4]) });
    }
  });
  return entries;
}

/** "name : score" pairs of a game's score line, or null if it is not one. */
function parseScoreLine(
  text: string,
): Array<{ name: string; score: number }> | null {
  const pairs: Array<{ name: string; score: number }> = [];
  const pattern = /([^\s:][^:]*?)\s*:\s*(\d+)/g;
  for (
    let match = pattern.exec(text);
    match !== null;
    match = pattern.exec(text)
  ) {
    pairs.push({ name: match[1], score: Number(match[2]) });
  }
  return pairs.length === 2 ? pairs : null;
}

/** The opening roll the first play implies: the opener rolled the higher die
 * (doubles cannot open a standard game, so they synthesize nothing). */
function synthesizeOpeningRolls(
  firstPlayer: Player,
  roll: readonly [Die, Die],
): Array<{ white: Die; black: Die }> {
  const [a, b] = roll;
  if (a === b) {
    return [];
  }
  const consistent = firstPlayer === 'white' ? a > b : b > a;
  if (consistent) {
    return [{ white: a, black: b }];
  }
  const high = Math.max(a, b) as Die;
  const low = Math.min(a, b) as Die;
  return firstPlayer === 'white'
    ? [{ white: high, black: low }]
    : [{ white: low, black: high }];
}

/** Columns at or beyond this hold the right (black) column's entry. */
const RIGHT_COLUMN_THRESHOLD = 25;

/**
 * Which column (= player) a "Wins" entry sits in. Writers' padding varies,
 * so classify against the columns this game's known white/black entries
 * actually used, falling back to a fixed threshold for empty games.
 */
function winsColumnPlayer(
  column: number,
  whiteColumns: readonly number[],
  blackColumns: readonly number[],
): Player {
  const mean = (xs: readonly number[]): number =>
    xs.reduce((a, b) => a + b, 0) / xs.length;
  if (whiteColumns.length > 0 && blackColumns.length > 0) {
    return Math.abs(column - mean(whiteColumns)) <=
      Math.abs(column - mean(blackColumns))
      ? 'white'
      : 'black';
  }
  if (whiteColumns.length > 0) {
    return column > mean(whiteColumns) + 8 ? 'black' : 'white';
  }
  if (blackColumns.length > 0) {
    return column < mean(blackColumns) - 8 ? 'white' : 'black';
  }
  return column >= RIGHT_COLUMN_THRESHOLD ? 'black' : 'white';
}

interface GameLines {
  readonly headerLine: number;
  readonly lines: Array<{ readonly text: string; readonly line: number }>;
}

/** One game block parsed into a replayable MatchGameRecord. */
function parseGame(
  block: GameLines,
  gameNumber: number,
  expectedScore: { white: number; black: number },
  crawford: boolean,
  players: MatPlayers | null,
): { record: MatchGameRecord; players: MatPlayers } {
  // The score line: the first non-blank line of the block.
  const scoreIndex = block.lines.findIndex(({ text }) => text.trim() !== '');
  const scoreLine = scoreIndex === -1 ? null : block.lines[scoreIndex];
  const pairs = scoreLine ? parseScoreLine(scoreLine.text) : null;
  if (!scoreLine || !pairs) {
    throw new MatParseError(
      `game ${gameNumber} has no "name : score" line`,
      scoreLine?.line ?? block.headerLine,
    );
  }
  if (pairs[0].score !== expectedScore.white || pairs[1].score !== expectedScore.black) {
    throw new MatParseError(
      `game ${gameNumber} starts at ${pairs[0].score}-${pairs[1].score}, ` +
        `but the games so far put the score at ` +
        `${expectedScore.white}-${expectedScore.black}`,
      scoreLine.line,
    );
  }
  const names: MatPlayers = players ?? {
    white: pairs[0].name,
    black: pairs[1].name,
  };

  // Every entry of the block, in reading order.
  const entries: RawEntry[] = [];
  for (const { text, line } of block.lines.slice(scoreIndex + 1)) {
    if (text.trim() === '' || /^\s*;/.test(text)) {
      continue;
    }
    const numbered = text.match(/^\s*\d+\)\s?/);
    const offset = numbered ? numbered[0].length : 0;
    entries.push(...lineEntries(text.slice(offset), line, offset));
  }
  if (entries.length === 0) {
    throw new MatParseError(
      `game ${gameNumber} records no moves`,
      block.headerLine,
    );
  }

  // The first entry's column fixes who opened; strict alternation (the .mat
  // line structure: left column white, right column black) does the rest.
  let actor: Player =
    entries[0].column >= RIGHT_COLUMN_THRESHOLD ? 'black' : 'white';

  let board = initialBoard();
  let cube = 1;
  let doubler: Player | null = null;
  const plays: Play[] = [];
  const decisions: MatchGameRecord['decisions'][number][] = [];
  let droppedBy: Player | null = null;
  let wins: { points: number; column: number; line: number } | null = null;
  const columns: Record<Player, number[]> = { white: [], black: [] };

  for (const entry of entries) {
    if (wins) {
      throw new MatParseError(
        `game ${gameNumber} continues after its "Wins" line`,
        entry.line,
      );
    }
    if (entry.kind !== 'wins') {
      columns[actor].push(entry.column);
    }
    switch (entry.kind) {
      case 'play': {
        if (doubler) {
          throw new MatParseError(
            `a double by ${names[doubler]} was never taken or dropped`,
            entry.line,
          );
        }
        if (droppedBy) {
          throw new MatParseError(
            `game ${gameNumber} continues after a dropped double`,
            entry.line,
          );
        }
        const roll: [Die, Die] = entry.dice;
        const movesText = entry.moves.replace(/cannot\s+move\.?/i, '').trim();
        if (movesText === '') {
          if (legalPlays(board, actor, roll).length > 0) {
            throw new MatParseError(
              `${names[actor]} rolled ${roll[0]}-${roll[1]} and moved ` +
                `nothing, but legal plays exist`,
              entry.line,
            );
          }
          plays.push({ player: actor, roll, movements: [] });
        } else {
          let play: Play;
          try {
            play = matchPlayByMoveText(board, actor, roll, movesText);
          } catch (error) {
            throw new MatParseError(
              `"${movesText}" is not a legal ${roll[0]}-${roll[1]} play ` +
                `for ${names[actor]}${
                  error instanceof Error && /unparseable/.test(error.message)
                    ? ` (${error.message})`
                    : ''
                }`,
              entry.line,
            );
          }
          plays.push(play);
          board = play.movements.reduce(
            (next, movement) => applyMovement(next, play.player, movement),
            board,
          );
        }
        actor = other(actor);
        break;
      }
      case 'double': {
        if (doubler) {
          throw new MatParseError(
            `two doubles in a row in game ${gameNumber}`,
            entry.line,
          );
        }
        if (entry.value !== null && entry.value !== cube * 2) {
          throw new MatParseError(
            `"Doubles => ${entry.value}" does not follow from the ` +
              `${cube}-cube`,
            entry.line,
          );
        }
        doubler = actor;
        decisions.push({
          type: 'double',
          player: actor,
          afterPlays: plays.length,
        });
        actor = other(actor);
        break;
      }
      case 'take': {
        if (!doubler) {
          throw new MatParseError(
            'a take with no double pending',
            entry.line,
          );
        }
        cube *= 2;
        decisions.push({
          type: 'take',
          player: actor,
          afterPlays: plays.length,
        });
        doubler = null;
        actor = other(actor);
        break;
      }
      case 'drop': {
        if (!doubler) {
          throw new MatParseError(
            'a drop with no double pending',
            entry.line,
          );
        }
        decisions.push({
          type: 'pass',
          player: actor,
          afterPlays: plays.length,
        });
        droppedBy = actor;
        doubler = null;
        actor = other(actor);
        break;
      }
      case 'wins':
        wins = { points: entry.points, column: entry.column, line: entry.line };
        break;
    }
  }

  if (doubler) {
    throw new MatParseError(
      `game ${gameNumber} ends with an unanswered double`,
      block.headerLine,
    );
  }

  const checkersResult = gameResult(board);
  const lastLine = block.lines[block.lines.length - 1]?.line ?? block.headerLine;
  if (!wins && !checkersResult && !droppedBy) {
    throw new MatParseError(
      `game ${gameNumber} ends without a result`,
      lastLine,
    );
  }

  // A "Wins" with the board unfinished and no drop is an accepted
  // resignation: reconstruct it so the record replays deterministically.
  if (wins && !checkersResult && !droppedBy) {
    const winner: Player = winsColumnPlayer(
      wins.column,
      columns.white,
      columns.black,
    );
    const kindPoints = wins.points / cube;
    const kinds = { 1: 'single', 2: 'gammon', 3: 'backgammon' } as const;
    const kind = kinds[kindPoints as 1 | 2 | 3];
    if (!kind) {
      throw new MatParseError(
        `"Wins ${wins.points}" is not a multiple of the ${cube}-cube ` +
          `a resignation could produce`,
        wins.line,
      );
    }
    decisions.push({
      type: 'resign',
      player: other(winner),
      kind,
      afterPlays: plays.length,
    });
    decisions.push({
      type: 'resign-response',
      player: winner,
      accepted: true,
      afterPlays: plays.length,
    });
  }

  const firstPlayer = plays[0]?.player ?? 'white';
  const candidate: MatchGameRecord = {
    game: {
      initialBoard: initialBoard(),
      openingRolls: plays[0]
        ? synthesizeOpeningRolls(firstPlayer, plays[0].roll)
        : [],
      firstPlayer,
      plays,
    },
    decisions,
    crawford,
    tutorAssisted: false,
    result: { winner: 'white', end: 'checkers', kind: 'single', points: 0 },
  };
  let result: MatchGameRecord['result'];
  try {
    result = replayMatchGame(candidate).result;
  } catch (error) {
    throw new MatParseError(
      `game ${gameNumber} does not replay: ${
        error instanceof Error ? error.message : String(error)
      }`,
      block.headerLine,
    );
  }
  if (wins && wins.points !== result.points) {
    throw new MatParseError(
      `game ${gameNumber} says "Wins ${wins.points}", but the recorded ` +
        `moves give the winner ${result.points}`,
      wins.line,
    );
  }
  return { record: { ...candidate, result }, players: names };
}

/**
 * Parse Jellyfish .mat text into a replayable MatchRecord. Liberal about
 * whitespace, "; [Tag ...]" headers and column drift; strict about legality —
 * any recorded play illegal under src/rules is a MatParseError naming the
 * line. Only complete matches import: the games must decide a winner.
 */
export function importMat(text: string): MatImport {
  const lines = text.split(/\r\n|\r|\n/);

  let length: number | null = null;
  let headerIndex = -1;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (/^\s*;/.test(line)) {
      const variation = line.match(/\[Variation\s+"([^"]*)"\]/i);
      if (variation && !/^\s*backgammon\s*$/i.test(variation[1])) {
        throw new MatParseError(
          `only standard backgammon imports; this match is "${variation[1]}"`,
          i + 1,
        );
      }
      continue;
    }
    const header = line.match(/^\s*(\d+)\s+point\s+match/i);
    if (header) {
      length = Number(header[1]);
      headerIndex = i;
      break;
    }
    if (line.trim() !== '') {
      throw new MatParseError(
        'not a .mat file: expected a "N point match" header',
        i + 1,
      );
    }
  }
  if (length === null) {
    throw new MatParseError(
      'not a .mat file: no "N point match" header found',
    );
  }
  if (length === 0) {
    throw new MatParseError(
      'money sessions (0 point match) are not supported',
      headerIndex + 1,
    );
  }
  if (length > 25) {
    throw new MatParseError(
      `matches play to at most 25 points, got ${length}`,
      headerIndex + 1,
    );
  }

  // Split the rest into Game blocks (gnubg locates games by substring too).
  const blocks: GameLines[] = [];
  for (let i = headerIndex + 1; i < lines.length; i++) {
    const line = lines[i];
    if (/^\s*;/.test(line)) {
      continue;
    }
    if (/\bGame\s+\d+/i.test(line)) {
      blocks.push({ headerLine: i + 1, lines: [] });
    } else if (blocks.length > 0) {
      blocks[blocks.length - 1].lines.push({ text: line, line: i + 1 });
    } else if (line.trim() !== '') {
      throw new MatParseError('expected a "Game 1" line', i + 1);
    }
  }
  if (blocks.length === 0) {
    throw new MatParseError('the file holds no games');
  }

  const games: MatchGameRecord[] = [];
  let players: MatPlayers | null = null;
  let score = { white: 0, black: 0 };
  let crawfordPlayed = false;
  for (let i = 0; i < blocks.length; i++) {
    const crawford =
      !crawfordPlayed &&
      (score.white === length - 1 || score.black === length - 1);
    crawfordPlayed = crawfordPlayed || crawford;
    const parsed = parseGame(blocks[i], i + 1, score, crawford, players);
    players = parsed.players;
    games.push(parsed.record);
    const { result } = parsed.record;
    score = {
      white: score.white + (result.winner === 'white' ? result.points : 0),
      black: score.black + (result.winner === 'black' ? result.points : 0),
    };
  }

  const record: MatchRecord = { length, games };
  let winner: Player | null;
  try {
    winner = replayMatch(record).winner;
  } catch (error) {
    throw new MatParseError(
      `the match does not replay: ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
  }
  if (!winner) {
    throw new MatParseError(
      `the match ends at ${score.white}-${score.black} before either ` +
        `player reaches ${length}`,
    );
  }
  return {
    record,
    players: players ?? DEFAULT_PLAYERS,
  };
}
