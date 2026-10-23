/**
 * Parsers for gnubg's printed command output (its only response channel).
 * Line formats verified against the vendored gnubg 1.05.000 WASM build;
 * regexes follow gnubg's FormatMoveHint / OutputCubeAnalysis emitters.
 */

import type { CubeAnalysis, CubeDecisionOption, WinChances } from './types';

/** A hint move line before joining with the rules engine. */
export interface ParsedHintMove {
  readonly rank: number;
  readonly moveText: string;
  readonly equity: number;
  readonly chances: WinChances;
}

/** One row of `eval` output. */
export interface ParsedEvalRow {
  readonly plies: number;
  readonly equity: number;
  readonly cubefulEquity: number;
  readonly chances: WinChances;
}

const HINT_MOVE_RE =
  /^\s*(\d+)\.\s+(?:Cubeful|Cubeless)\s+\S+\s+(.+?)\s+(?:Eq\.|MWC):\s*([-+]?\d*\.?\d+)%?(?:\s*\(\s*[-+]?\d*\.?\d+%?\s*\))?\s*$/;

const PROBS_RE =
  /^\s*(\d\.\d+)\s+(\d\.\d+)\s+(\d\.\d+)\s+-\s+(\d\.\d+)\s+(\d\.\d+)\s+(\d\.\d+)\s*$/;

function chancesFromMatch(m: RegExpMatchArray): WinChances {
  return {
    win: Number(m[1]),
    winGammon: Number(m[2]),
    winBackgammon: Number(m[3]),
    lose: Number(m[4]),
    loseGammon: Number(m[5]),
    loseBackgammon: Number(m[6]),
  };
}

const EMPTY_CHANCES: WinChances = {
  win: 0,
  winGammon: 0,
  winBackgammon: 0,
  lose: 0,
  loseGammon: 0,
  loseBackgammon: 0,
};

/** Parse the ranked move list printed by `hint N` with dice rolled. */
export function parseHintMoves(lines: readonly string[]): ParsedHintMove[] {
  const moves: ParsedHintMove[] = [];
  for (let i = 0; i < lines.length; i++) {
    const move = lines[i].match(HINT_MOVE_RE);
    if (!move) {
      continue;
    }
    const probs = i + 1 < lines.length ? lines[i + 1].match(PROBS_RE) : null;
    moves.push({
      rank: Number(move[1]),
      moveText: move[2],
      equity: Number(move[3]),
      chances: probs ? chancesFromMatch(probs) : EMPTY_CHANCES,
    });
  }
  return moves;
}

const EVAL_ROW_RE =
  /^\s*(static|\d+\s*ply):\s*(\d\.\d+)\s+(\d\.\d+)\s+(\d\.\d+)\s+(\d\.\d+)\s+(\d\.\d+)\s+([-+]?\d*\.?\d+)\s+([-+]?\d*\.?\d+)\s*$/;

/** Parse the static/1-ply/2-ply rows printed by `eval`. */
export function parseEvalOutput(lines: readonly string[]): ParsedEvalRow[] {
  const rows: ParsedEvalRow[] = [];
  for (const line of lines) {
    const m = line.match(EVAL_ROW_RE);
    if (!m) {
      continue;
    }
    const win = Number(m[2]);
    rows.push({
      plies: m[1] === 'static' ? 0 : Number.parseInt(m[1], 10),
      equity: Number(m[7]),
      cubefulEquity: Number(m[8]),
      chances: {
        win,
        winGammon: Number(m[3]),
        winBackgammon: Number(m[4]),
        lose: Number((1 - win).toFixed(3)),
        loseGammon: Number(m[5]),
        loseBackgammon: Number(m[6]),
      },
    });
  }
  return rows;
}

const CUBELESS_RE = /cubeless equity\s+([-+]?\d*\.?\d+)/;
const CUBE_OPTION_RE =
  /^\s*\d+\.\s+(No (?:re)?double|(?:Re)?[Dd]ouble, (?:pass|take)|Take|Pass|Accept|Reject)\s+([-+]?\d*\.?\d+)(?:\s*\(\s*([-+]?\d*\.?\d+)\s*\))?\s*$/;
const PROPER_ACTION_RE = /Proper cube action:\s*(.+?)\s*(?:\(.*)?$/;

/** Parse the `Cube analysis` block printed by `hint` (no dice) or `eval`. */
export function parseCubeAnalysis(lines: readonly string[]): CubeAnalysis {
  let cubelessEquity: number | undefined;
  let chances: WinChances = EMPTY_CHANCES;
  const options: CubeDecisionOption[] = [];
  let properAction = '';

  for (const line of lines) {
    const cubeless = line.match(CUBELESS_RE);
    if (cubeless && cubelessEquity === undefined) {
      cubelessEquity = Number(cubeless[1]);
      continue;
    }
    const probs = line.match(PROBS_RE);
    if (probs && chances === EMPTY_CHANCES) {
      chances = chancesFromMatch(probs);
      continue;
    }
    const option = line.match(CUBE_OPTION_RE);
    if (option) {
      const equity = Number(option[2]);
      options.push({
        action: option[1],
        equity,
        equityDiff: option[3] ? Number(option[3]) : 0,
      });
      continue;
    }
    const proper = line.match(PROPER_ACTION_RE);
    if (proper) {
      properAction = proper[1];
    }
  }

  if (cubelessEquity === undefined || options.length === 0) {
    throw new Error(
      `unparseable cube analysis:\n${lines.join('\n')}`,
    );
  }
  return { cubelessEquity, chances, options, properAction };
}
