/**
 * Blunder puzzle mining (spec story 35, GLOSSARY "Blunder puzzle"): turn an
 * analyzed match's human blunders (equity loss at or above the shared blunder
 * threshold) into puzzles carrying the same stored answer data curated
 * puzzles ship with, so the existing player grades them offline.
 *
 * Scope rules, documented here once:
 * - Only vs-computer matches are mined (the human always plays White there;
 *   hot-seat games have no single "the player's blunder" to drill).
 * - Tutor-assisted games are excluded: the player had live engine help, so
 *   drilling those positions would double-dip.
 * - Positions are rebuilt via the analyzer's walkGame — analysis rows store
 *   no boards. Play answer tables come straight from the stored alternatives
 *   when they cover every ranked play; otherwise one background-priority
 *   engine ranking completes the table.
 * - Theme tags reuse src/puzzles/mining.ts heuristics. Positions the
 *   heuristics cannot name fall back to 'bear-off' for pure races and
 *   'priming' otherwise (point structure being the most generic checker-play
 *   skill) — a documented approximation, not a claim.
 *
 * Dedupe: a puzzle's identity is its origin (matchId + game + decision
 * index), so re-mining after re-analysis or deepening never duplicates; a
 * second origin reaching the identical position + question (board, hero,
 * roll or cube question, cube value) is also skipped — the earliest mined
 * puzzle wins. Match score is deliberately not part of the content key: the
 * same blunder reached at two scores still drills once.
 */

import type { AnalyzedCube, AnalyzedPlay, DecisionMoment } from '../analysis';
import {
  isMatchAnalysis,
  matchStandings,
  momentForDecision,
  walkGame,
} from '../analysis';
import { CLASSIFICATION_THRESHOLDS } from '../engine/analysis';
// Deep type-only imports keep this module free of the DOM-typed engine barrel.
import type { EnginePosition, MatchContext, RankedPlay } from '../engine/types';
import {
  applyMovement,
  type BoardState,
  type CheckerMovement,
  type DiceRoll,
  isRace,
  type Player,
} from '../rules';
import type { StoredMatch } from '../storage/types';
import { boardKey } from './grade';
import { classifyPlayTheme, cubeChoicesFromEquities } from './mining';
import type {
  PlayAnswer,
  PlayPuzzle,
  Puzzle,
  PuzzleMatchContext,
  PuzzleOrigin,
  PuzzleTheme,
} from './types';

/** The human always plays White in a vs-computer match (src/pages/Play.tsx). */
const HUMAN: Player = 'white';

/** Deterministic id, so re-mining the same blunder upserts, never duplicates. */
export function blunderPuzzleId(origin: PuzzleOrigin): string {
  return `blunder:${origin.matchId}:${origin.game}:${origin.decision}`;
}

/**
 * The position + question a puzzle poses, independent of where it came from:
 * two origins producing the same key are the same drill.
 */
export function puzzleContentKey(puzzle: Puzzle): string {
  const base = `${boardKey(puzzle.board)}|${puzzle.hero}|${puzzle.match.cube.value}`;
  if (puzzle.kind === 'play') {
    const roll = [...puzzle.roll].sort((a, b) => b - a).join('-');
    return `play|${base}|${roll}`;
  }
  return `cube|${puzzle.decision}|${base}`;
}

export interface BlunderMiningDeps {
  /** Already-stored puzzles, deduped against by origin id and content. */
  readonly existing: readonly Puzzle[];
  /**
   * Full-strength ranking used to complete a play answer table the stored
   * analysis only partially covers (it keeps top-5 alternatives). Expected to
   * run at background priority through the shared analyzer gate.
   */
  readonly rankPlays: (
    position: EnginePosition,
    roll: DiceRoll,
  ) => Promise<readonly RankedPlay[]>;
}

/**
 * Mine every new blunder puzzle out of one analyzed, finished vs-computer
 * match. Pure given its inputs; returns only puzzles not already covered by
 * `existing` (by origin or by content).
 */
export async function mineBlunderPuzzles(
  match: StoredMatch,
  deps: BlunderMiningDeps,
): Promise<readonly Puzzle[]> {
  if (match.status !== 'finished' || match.config.mode !== 'computer') {
    return [];
  }
  const analysis = match.analysis;
  if (!isMatchAnalysis(analysis)) {
    return [];
  }
  const standings = matchStandings(match.record);
  const seenIds = new Set(deps.existing.map((puzzle) => puzzle.id));
  const seenContent = new Set(deps.existing.map(puzzleContentKey));
  const mined: Puzzle[] = [];

  const games = Math.min(analysis.games.length, match.record.games.length);
  for (let gameIndex = 0; gameIndex < games; gameIndex++) {
    const gameRecord = match.record.games[gameIndex];
    if (gameRecord.tutorAssisted) {
      continue;
    }
    /** Walked lazily: games without a human blunder cost nothing. */
    let moments: readonly DecisionMoment[] | null = null;
    const decisions = analysis.games[gameIndex].decisions;
    for (
      let decisionIndex = 0;
      decisionIndex < decisions.length;
      decisionIndex++
    ) {
      const decision = decisions[decisionIndex];
      if (
        decision.player !== HUMAN ||
        decision.equityLoss < CLASSIFICATION_THRESHOLDS.blunder
      ) {
        continue;
      }
      const origin: PuzzleOrigin = {
        matchId: match.id,
        game: gameIndex,
        decision: decisionIndex,
      };
      if (seenIds.has(blunderPuzzleId(origin))) {
        continue;
      }
      moments ??= walkGame(gameRecord, standings[gameIndex]);
      const puzzle =
        decision.kind === 'play'
          ? await buildPlayPuzzle(decision, origin, moments, deps)
          : buildCubePuzzle(decision, origin, moments);
      const content = puzzleContentKey(puzzle);
      if (seenContent.has(content)) {
        continue;
      }
      seenIds.add(puzzle.id);
      seenContent.add(content);
      mined.push(puzzle);
    }
  }
  return mined;
}

/** Theme for a checker-play position; see the module header for the fallback. */
function playTheme(board: BoardState): PuzzleTheme {
  return classifyPlayTheme(board) ?? (isRace(board) ? 'bear-off' : 'priming');
}

function toPuzzleContext(context: MatchContext): PuzzleMatchContext {
  const cube = context.cube ?? { value: 1, owner: 'center' as const };
  return {
    matchLength: context.matchLength,
    score: { white: context.score.white, black: context.score.black },
    cube: { value: cube.value, owner: cube.owner },
    crawford: context.crawford ?? false,
  };
}

function toAnswer(
  board: BoardState,
  rank: number,
  moveText: string,
  movements: readonly CheckerMovement[],
  equity: number,
  equityLoss: number,
): PlayAnswer {
  const final = movements.reduce(
    (b, movement) => applyMovement(b, HUMAN, movement),
    board,
  );
  return {
    rank,
    moveText,
    movements,
    finalKey: boardKey(final),
    equity,
    equityLoss,
  };
}

async function buildPlayPuzzle(
  decision: AnalyzedPlay,
  origin: PuzzleOrigin,
  moments: readonly DecisionMoment[],
  deps: BlunderMiningDeps,
): Promise<PlayPuzzle> {
  const moment = momentForDecision(moments, decision);
  if (moment?.kind !== 'play') {
    throw new Error(
      `analysis decision at play ${decision.playIndex} matches no walked play`,
    );
  }
  // The analysis keeps top-5 alternatives plus the played play: when that
  // already covers every ranked play, the table is complete as stored.
  const answers =
    decision.alternatives.length === decision.totalPlays
      ? decision.alternatives.map((alt, index) =>
          toAnswer(
            moment.board,
            index + 1,
            alt.moveText,
            alt.movements,
            alt.equity,
            alt.equityLoss,
          ),
        )
      : await completedAnswers(moment.board, moment.context, decision, deps);
  return {
    id: blunderPuzzleId(origin),
    kind: 'play',
    theme: playTheme(moment.board),
    source: 'blunder',
    origin,
    board: moment.board,
    hero: HUMAN,
    match: toPuzzleContext(moment.context),
    roll: decision.roll,
    answers,
  };
}

/** One full-strength ranking fills in the rows the analysis did not keep. */
async function completedAnswers(
  board: BoardState,
  context: MatchContext,
  decision: AnalyzedPlay,
  deps: BlunderMiningDeps,
): Promise<readonly PlayAnswer[]> {
  const ranked = await deps.rankPlays(
    { board, onRoll: HUMAN, match: context },
    decision.roll,
  );
  return ranked.map((entry, index) =>
    toAnswer(
      board,
      index + 1,
      entry.moveText,
      entry.play.movements,
      entry.equity,
      entry.equityLoss,
    ),
  );
}

/**
 * Cube blunders never need the engine: the analysis row already carries the
 * three doubler-view cubeful equities and the verdict. A take/pass blunder
 * becomes a 'response' puzzle, a double/no-double one an 'offer' puzzle, both
 * posed from the board the cube question arose on.
 */
function buildCubePuzzle(
  decision: AnalyzedCube,
  origin: PuzzleOrigin,
  moments: readonly DecisionMoment[],
): Puzzle {
  const moment = momentForDecision(moments, decision);
  if (!moment || moment.kind === 'play') {
    throw new Error(
      `analysis cube decision at play ${decision.playIndex} matches no walked cube moment`,
    );
  }
  const kind =
    decision.action === 'take' || decision.action === 'pass'
      ? 'response'
      : 'offer';
  return {
    id: blunderPuzzleId(origin),
    kind: 'cube',
    theme: 'cube-handling',
    source: 'blunder',
    origin,
    board: moment.board,
    hero: HUMAN,
    match: toPuzzleContext(moment.context),
    decision: kind,
    choices: cubeChoicesFromEquities(
      {
        noDouble: decision.noDoubleEquity,
        doubleTake: decision.doubleTakeEquity,
        doublePass: decision.doublePassEquity,
      },
      kind,
    ),
    verdict: decision.properAction,
  };
}
