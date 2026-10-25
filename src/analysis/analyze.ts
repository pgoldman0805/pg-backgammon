/**
 * The analysis pipeline (spec "Analyzer", GLOSSARY "Post-game review"): walk
 * a finished game or match record, reconstruct every position, and ask the
 * engine — at full strength — what each unforced decision cost. Checker plays
 * go through rankPlays, cube decisions through cubeInfo with full match
 * context; forced plays and dances are skipped entirely. Classification and
 * equity-loss arithmetic come from src/engine/analysis.ts — the same code
 * path Tutor-mode feedback uses.
 */

// Engine types come from the seam definition and the shared analysis
// primitives from their own module (not the engine index), so this pipeline
// compiles in the node-typed test program too (the real-WASM golden test).
import { classifyEquityLoss, equityLoss } from '../engine/analysis';
import type { AnalysisEffort, Engine, RankedPlay } from '../engine/types';
import {
  applyMovement,
  type BoardState,
  type CheckerMovement,
  type MatchGameRecord,
  type MatchRecord,
  type Player,
} from '../rules';
import { costCubeResponse, costDoubleDecision, cubeEquities } from './cube';
import { ALL_ROLLS, OPENING_ROLLS, rollLuck } from './luck';
import {
  ANALYSIS_FORMAT,
  type AnalyzedCube,
  type AnalyzedDecision,
  type AnalyzedPlay,
  type AnalyzedPlies,
  type GameAnalysis,
  type MatchAnalysis,
  type PlayAlternative,
  type PlayerLuck,
  type PlayerSummary,
} from './types';
import {
  type CubeActionMoment,
  type CubeOpportunityMoment,
  type DecisionMoment,
  type GameStanding,
  matchStandings,
  type PlayMoment,
  walkGame,
} from './walk';

export interface AnalyzeOptions {
  readonly engine: Engine;
  /** Called after each analyzed position (plays and cube moments). */
  readonly onProgress?: (done: number, total: number) => void;
  /** Injectable clock for the analyzedAt stamp. */
  readonly now?: () => number;
}

/** How many ranked candidates the review keeps per play. */
const MAX_ALTERNATIVES = 5;

const effortPlies: Record<AnalysisEffort, AnalyzedPlies> = {
  standard: 2,
  deep: 3,
};

function boardKey(board: BoardState): string {
  return `${board.points.join(',')}|${board.bar.white},${board.bar.black}|${board.off.white},${board.off.black}`;
}

function finalKey(
  board: BoardState,
  player: Player,
  movements: readonly CheckerMovement[],
): string {
  let final = board;
  for (const movement of movements) {
    final = applyMovement(final, player, movement);
  }
  return boardKey(final);
}

function toAlternative(
  ranked: RankedPlay,
  playedIndex: number,
  index: number,
): PlayAlternative {
  return {
    moveText: ranked.moveText,
    equity: ranked.equity,
    equityLoss: ranked.equityLoss,
    played: index === playedIndex,
    movements: ranked.play.movements,
  };
}

/** Analyze one unforced checker play at the given effort. */
export async function analyzePlayMoment(
  moment: PlayMoment,
  engine: Engine,
  effort: AnalysisEffort = 'standard',
): Promise<AnalyzedPlay> {
  const ranked = await engine.rankPlays(
    { board: moment.board, onRoll: moment.player, match: moment.context },
    moment.roll,
    effort === 'deep' ? { effort } : undefined,
  );
  const playedKey = finalKey(moment.board, moment.player, moment.played);
  const playedIndex = ranked.findIndex(
    (candidate) =>
      finalKey(moment.board, moment.player, candidate.play.movements) ===
      playedKey,
  );
  if (playedIndex === -1) {
    throw new Error(
      `the played ${moment.roll[0]}-${moment.roll[1]} at play ` +
        `${moment.playIndex} matches no engine-ranked play`,
    );
  }
  const played = ranked[playedIndex];
  const loss = equityLoss(ranked[0].equity, played.equity);
  const alternatives = ranked
    .slice(0, MAX_ALTERNATIVES)
    .map((candidate, index) => toAlternative(candidate, playedIndex, index));
  if (playedIndex >= MAX_ALTERNATIVES) {
    alternatives.push(toAlternative(played, playedIndex, playedIndex));
  }
  return {
    kind: 'play',
    player: moment.player,
    playIndex: moment.playIndex,
    roll: moment.roll,
    moveText: played.moveText,
    rank: playedIndex + 1,
    totalPlays: ranked.length,
    alternatives,
    equityLoss: loss,
    classification: classifyEquityLoss(loss),
    plies: effortPlies[effort],
  };
}

/**
 * Analyze one cube moment at the given effort. A silent pre-roll yields the
 * no-double verdict; an offered double yields two decisions — the double and
 * its answer — costed from the same engine call (both sides of one analysis).
 */
export async function analyzeCubeMoment(
  moment: CubeActionMoment | CubeOpportunityMoment,
  engine: Engine,
  effort: AnalysisEffort = 'standard',
): Promise<AnalyzedCube[]> {
  const doubler =
    moment.kind === 'cube-action' ? moment.doubler : moment.player;
  const analysis = await engine.cubeInfo(
    { board: moment.board, onRoll: doubler, match: moment.context },
    effort === 'deep' ? { effort } : undefined,
  );
  const equities = cubeEquities(analysis);
  const plies = effortPlies[effort];
  const shared = {
    kind: 'cube' as const,
    playIndex: moment.playIndex,
    cubeValue: moment.context.cube?.value ?? 1,
    properAction: analysis.properAction,
    noDoubleEquity: equities.noDouble,
    doubleTakeEquity: equities.doubleTake,
    doublePassEquity: equities.doublePass,
    plies,
  };

  if (moment.kind === 'cube-opportunity') {
    const cost = costDoubleDecision(equities, false);
    return [
      {
        ...shared,
        player: moment.player,
        action: 'no-double',
        error: cost.error,
        equityLoss: cost.equityLoss,
        classification: classifyEquityLoss(cost.equityLoss),
      },
    ];
  }

  const doubleCost = costDoubleDecision(equities, true);
  const responseCost = costCubeResponse(equities, moment.response);
  return [
    {
      ...shared,
      player: moment.doubler,
      action: 'double',
      error: doubleCost.error,
      equityLoss: doubleCost.equityLoss,
      classification: classifyEquityLoss(doubleCost.equityLoss),
    },
    {
      ...shared,
      player: moment.responder,
      action: moment.response,
      error: responseCost.error,
      equityLoss: responseCost.equityLoss,
      classification: classifyEquityLoss(responseCost.equityLoss),
    },
  ];
}

/** Does this moment cost an engine round-trip? */
function needsEngine(moment: DecisionMoment): boolean {
  return moment.kind !== 'play' || moment.legalPlayCount >= 2;
}

/** An analyzed game's decisions plus the net luck tallied over its rolls. */
interface MomentAnalysis {
  readonly decisions: AnalyzedDecision[];
  readonly luck: { white: number; black: number };
}

async function analyzeMoments(
  moments: readonly DecisionMoment[],
  engine: Engine,
  tick: () => void,
): Promise<MomentAnalysis> {
  const decisions: AnalyzedDecision[] = [];
  const luck = { white: 0, black: 0 };
  for (const moment of moments) {
    if (!needsEngine(moment)) {
      continue;
    }
    if (moment.kind === 'play') {
      const play = await analyzePlayMoment(moment, engine);
      decisions.push(play);
      // The realized term is the best-play equity the review already found
      // (alternatives[0] is the top-ranked play); the baseline costs the
      // remaining rolls. The opening roll is drawn from non-doubles only.
      luck[moment.player] += await rollLuck(
        engine,
        { board: moment.board, onRoll: moment.player, match: moment.context },
        moment.roll,
        play.alternatives[0].equity,
        moment.playIndex === 0 ? OPENING_ROLLS : ALL_ROLLS,
      );
    } else {
      decisions.push(...(await analyzeCubeMoment(moment, engine)));
    }
    tick();
  }
  return { decisions, luck };
}

const EMPTY_SUMMARY: PlayerSummary = {
  decisions: 0,
  equityLost: 0,
  errorRate: 0,
  blunders: 0,
  errors: 0,
  dubious: 0,
};

function summarize(
  decisions: readonly AnalyzedDecision[],
  player: Player,
): PlayerSummary {
  let count = 0;
  let lost = 0;
  const kinds = { blunder: 0, error: 0, dubious: 0, ok: 0 };
  for (const decision of decisions) {
    if (decision.player !== player) {
      continue;
    }
    count += 1;
    lost += decision.equityLoss;
    kinds[decision.classification] += 1;
  }
  return {
    decisions: count,
    equityLost: lost,
    errorRate: count === 0 ? 0 : lost / count,
    blunders: kinds.blunder,
    errors: kinds.error,
    dubious: kinds.dubious,
  };
}

/** Combine per-game summaries into match totals. */
function total(summaries: readonly PlayerSummary[]): PlayerSummary {
  const sum = summaries.reduce(
    (acc, s) => ({
      decisions: acc.decisions + s.decisions,
      equityLost: acc.equityLost + s.equityLost,
      errorRate: 0,
      blunders: acc.blunders + s.blunders,
      errors: acc.errors + s.errors,
      dubious: acc.dubious + s.dubious,
    }),
    EMPTY_SUMMARY,
  );
  return {
    ...sum,
    errorRate: sum.decisions === 0 ? 0 : sum.equityLost / sum.decisions,
  };
}

/** Rebuild a game analysis around an updated decision list (deepening). */
export function assembleGameAnalysis(
  decisions: readonly AnalyzedDecision[],
  luck?: PlayerLuck,
): GameAnalysis {
  return {
    decisions,
    white: summarize(decisions, 'white'),
    black: summarize(decisions, 'black'),
    ...(luck ? { luck } : {}),
  };
}

/** Sum the per-game luck into match luck; absent when no game carries it. */
function totalLuck(games: readonly GameAnalysis[]): PlayerLuck | undefined {
  if (!games.some((game) => game.luck)) {
    return undefined;
  }
  return games.reduce<PlayerLuck>(
    (acc, game) => ({
      white: acc.white + (game.luck?.white ?? 0),
      black: acc.black + (game.luck?.black ?? 0),
    }),
    { white: 0, black: 0 },
  );
}

/** Rebuild match totals around updated game analyses (deepening). */
export function assembleMatchAnalysis(
  games: readonly GameAnalysis[],
  analyzedAt: number,
): MatchAnalysis {
  const luck = totalLuck(games);
  return {
    format: ANALYSIS_FORMAT,
    analyzedAt,
    games,
    white: total(games.map((g) => g.white)),
    black: total(games.map((g) => g.black)),
    ...(luck ? { luck } : {}),
  };
}

/** Analyze one recorded game played at the given match standing. */
export async function analyzeGame(
  record: MatchGameRecord,
  standing: GameStanding,
  options: AnalyzeOptions,
): Promise<GameAnalysis> {
  const moments = walkGame(record, standing);
  const queries = moments.filter(needsEngine).length;
  let done = 0;
  const { decisions, luck } = await analyzeMoments(
    moments,
    options.engine,
    () => {
      done += 1;
      options.onProgress?.(done, queries);
    },
  );
  return assembleGameAnalysis(decisions, luck);
}

/** Analyze a whole recorded match, every game at its true standing. */
export async function analyzeMatch(
  record: MatchRecord,
  options: AnalyzeOptions,
): Promise<MatchAnalysis> {
  const standings = matchStandings(record);
  const walks = record.games.map((game, index) =>
    walkGame(game, standings[index]),
  );
  const totalQueries = walks.reduce(
    (sum, moments) => sum + moments.filter(needsEngine).length,
    0,
  );
  let done = 0;
  const games: GameAnalysis[] = [];
  for (const moments of walks) {
    const { decisions, luck } = await analyzeMoments(
      moments,
      options.engine,
      () => {
        done += 1;
        options.onProgress?.(done, totalQueries);
      },
    );
    games.push(assembleGameAnalysis(decisions, luck));
  }
  return assembleMatchAnalysis(games, (options.now ?? Date.now)());
}
