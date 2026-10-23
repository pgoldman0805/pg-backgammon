/**
 * The shared match analyzer: one service, bound to one engine, through which
 * all analysis work flows. It serializes engine use behind a priority gate
 * (user-initiated work — opening a review, deepening — jumps ahead of
 * background auto-analysis), dedupes and caches per-game results so a game
 * analyzed in the background while the match was still being played costs
 * nothing again at match end, and restarts cleanly after failures.
 */

import type { CubeInfoOptions, Engine, RankPlaysOptions } from '../engine';
import type { DiceRoll, MatchGameRecord, MatchRecord } from '../rules';
import { analyzeGame, assembleMatchAnalysis } from './analyze';
import { deepenDecision } from './deepen';
import { type AnalysisPriority, createPriorityGate } from './gate';
import type { GameAnalysis, MatchAnalysis } from './types';
import { type GameStanding, matchStandings } from './walk';

export interface AnalysisProgress {
  /** 1-based game being analyzed, out of `games`. */
  readonly game: number;
  readonly games: number;
  /** 1-based analyzed position within the current game, out of `positions`. */
  readonly position: number;
  readonly positions: number;
}

export interface AnalyzeMatchOptions {
  readonly priority?: AnalysisPriority;
  readonly onProgress?: (progress: AnalysisProgress) => void;
}

export interface DeepenTarget {
  readonly gameIndex: number;
  readonly decisionIndex: number;
}

export interface MatchAnalyzer {
  /** Analyze one finished game at its standing (cached by content). */
  analyzeGame(
    record: MatchGameRecord,
    standing: GameStanding,
    priority?: AnalysisPriority,
  ): Promise<GameAnalysis>;
  /** Analyze a whole match record, reusing any cached games. */
  analyzeMatch(
    record: MatchRecord,
    options?: AnalyzeMatchOptions,
  ): Promise<MatchAnalysis>;
  /** Re-analyze one decision at deep effort (always user priority). */
  deepen(
    record: MatchRecord,
    analysis: MatchAnalysis,
    target: DeepenTarget,
  ): Promise<MatchAnalysis>;
}

export interface MatchAnalyzerOptions {
  readonly engine: Engine;
  readonly now?: () => number;
}

/** Cached games beyond this are evicted oldest-first. */
const MAX_CACHED_GAMES = 64;

export function createMatchAnalyzer(
  options: MatchAnalyzerOptions,
): MatchAnalyzer {
  const { engine } = options;
  const now = options.now ?? Date.now;
  const gate = createPriorityGate();
  const cache = new Map<string, Promise<GameAnalysis>>();

  /** Every engine call of one analysis task passes the gate individually,
   * so user work (and the opponent, at the worker's own queue) never waits
   * for more than a single call. */
  function gatedEngine(priority: AnalysisPriority): Engine {
    return {
      ...engine,
      rankPlays: (
        position: Parameters<Engine['rankPlays']>[0],
        roll: DiceRoll,
        rankOptions?: RankPlaysOptions,
      ) =>
        gate.run(priority, () => engine.rankPlays(position, roll, rankOptions)),
      cubeInfo: (
        position: Parameters<Engine['cubeInfo']>[0],
        cubeOptions?: CubeInfoOptions,
      ) => gate.run(priority, () => engine.cubeInfo(position, cubeOptions)),
      evaluate: (position: Parameters<Engine['evaluate']>[0]) =>
        gate.run(priority, () => engine.evaluate(position)),
    };
  }

  function gameKey(record: MatchGameRecord, standing: GameStanding): string {
    return `${standing.length}|${standing.score.white}-${standing.score.black}|${JSON.stringify(record)}`;
  }

  function cachedAnalyzeGame(
    record: MatchGameRecord,
    standing: GameStanding,
    priority: AnalysisPriority,
    onProgress?: (done: number, total: number) => void,
  ): Promise<GameAnalysis> {
    const key = gameKey(record, standing);
    const cached = cache.get(key);
    if (cached) {
      return cached;
    }
    const pending = analyzeGame(record, standing, {
      engine: gatedEngine(priority),
      onProgress,
    });
    cache.set(key, pending);
    pending.catch(() => cache.delete(key));
    if (cache.size > MAX_CACHED_GAMES) {
      const oldest = cache.keys().next().value;
      if (oldest !== undefined) {
        cache.delete(oldest);
      }
    }
    return pending;
  }

  return {
    analyzeGame(record, standing, priority = 'background') {
      return cachedAnalyzeGame(record, standing, priority);
    },

    async analyzeMatch(record, matchOptions = {}) {
      const priority = matchOptions.priority ?? 'background';
      const standings = matchStandings(record);
      const games: GameAnalysis[] = [];
      for (let i = 0; i < record.games.length; i++) {
        games.push(
          await cachedAnalyzeGame(
            record.games[i],
            standings[i],
            priority,
            (done, total) =>
              matchOptions.onProgress?.({
                game: i + 1,
                games: record.games.length,
                position: done,
                positions: total,
              }),
          ),
        );
      }
      return assembleMatchAnalysis(games, now());
    },

    deepen(record, analysis, target) {
      return deepenDecision(record, analysis, {
        ...target,
        engine: gatedEngine('user'),
        now,
      });
    },
  };
}
