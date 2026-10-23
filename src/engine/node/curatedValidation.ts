/**
 * Full-strength re-evaluation of a stored curated puzzle against the real
 * gnubg WASM engine, shared by the in-suite validation test (which checks a
 * deterministic sample on every `npm test`) and `npm run validate:puzzles`
 * (which sweeps the entire set). Returns human-readable discrepancies; an
 * empty list means the stored answer data still matches the engine.
 */

import { boardKey } from '../../puzzles/grade';
import { deriveCubeChoices, toEnginePosition } from '../../puzzles/mining';
import type { CubePuzzle, PlayPuzzle, Puzzle } from '../../puzzles/types';
import { applyMovement } from '../../rules';
import type { GnubgSession } from '../session';

/** The miner's floor for the second-best loss (a clear best exists). */
export const MARGIN_MIN = 0.05;
/**
 * gnubg's evaluation cache lets deep rows wobble by about a thousandth
 * between session histories; grading tolerance is 0.02, so validating to
 * half a hundredth still catches any answer that could mis-grade.
 */
export const EQUITY_TOLERANCE = 0.005;
export const MARGIN_WOBBLE = 0.01;

const offBy = (a: number, b: number): boolean =>
  Math.abs(a - b) >= EQUITY_TOLERANCE;

/** Re-rank a play puzzle's roll at full strength and diff the stored table. */
export function checkPlayPuzzle(
  session: GnubgSession,
  puzzle: PlayPuzzle,
): string[] {
  const problems: string[] = [];
  const fresh = session.rankPlays(toEnginePosition(puzzle), puzzle.roll);
  const keyOf = (movements: PlayPuzzle['answers'][number]['movements']) =>
    boardKey(
      movements.reduce((b, m) => applyMovement(b, 'white', m), puzzle.board),
    );

  const freshBestKey = keyOf(fresh[0].play.movements);
  if (freshBestKey !== puzzle.answers[0].finalKey) {
    problems.push(
      `best play changed: stored ${puzzle.answers[0].moveText}, ` +
        `fresh ${fresh[0].moveText}`,
    );
  }
  if (offBy(fresh[0].equity, puzzle.answers[0].equity)) {
    problems.push(
      `best equity drifted: stored ${puzzle.answers[0].equity}, ` +
        `fresh ${fresh[0].equity}`,
    );
  }
  if (fresh[1].equityLoss < MARGIN_MIN - MARGIN_WOBBLE) {
    problems.push(
      `margin collapsed: second-best now loses only ${fresh[1].equityLoss}`,
    );
  }

  // The whole stored table must be fresh, not just the top row.
  const freshByKey = new Map(
    fresh.map((entry) => [keyOf(entry.play.movements), entry]),
  );
  for (const answer of puzzle.answers) {
    const entry = freshByKey.get(answer.finalKey);
    if (!entry) {
      problems.push(`${answer.moveText}: no fresh ranking for stored play`);
    } else if (offBy(entry.equity, answer.equity)) {
      problems.push(
        `${answer.moveText}: equity drifted from ${answer.equity} ` +
          `to ${entry.equity}`,
      );
    }
  }
  return problems;
}

/** Re-analyze a cube puzzle at full strength and diff verdict and choices. */
export function checkCubePuzzle(
  session: GnubgSession,
  puzzle: CubePuzzle,
): string[] {
  const problems: string[] = [];
  const analysis = session.cubeInfo(toEnginePosition(puzzle));
  const derived = deriveCubeChoices(analysis, puzzle.decision);
  if (derived.verdict !== puzzle.verdict) {
    problems.push(
      `verdict changed: stored "${puzzle.verdict}", fresh "${derived.verdict}"`,
    );
  }
  for (const [index, choice] of derived.choices.entries()) {
    const stored = puzzle.choices[index];
    if (!stored || choice.action !== stored.action) {
      problems.push(
        `choice ${index} action changed: stored ${stored?.action}, ` +
          `fresh ${choice.action}`,
      );
    } else if (offBy(choice.equity, stored.equity)) {
      problems.push(
        `${choice.action}: equity drifted from ${stored.equity} ` +
          `to ${choice.equity}`,
      );
    }
  }
  if (derived.choices[1].equityLoss < MARGIN_MIN - MARGIN_WOBBLE) {
    problems.push(
      `margin collapsed: second choice now loses only ` +
        `${derived.choices[1].equityLoss}`,
    );
  }
  return problems;
}

/** Dispatch on puzzle kind. */
export function checkPuzzle(session: GnubgSession, puzzle: Puzzle): string[] {
  return puzzle.kind === 'play'
    ? checkPlayPuzzle(session, puzzle)
    : checkCubePuzzle(session, puzzle);
}
