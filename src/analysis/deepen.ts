/**
 * On-demand deepening (spec story 26): re-query a single analyzed decision at
 * higher effort (3-ply, bounded — no rollouts) and fold the refined numbers
 * back into the stored MatchAnalysis, summaries included. Both halves of a
 * doubled cube (the double and its answer) refresh together: they come from
 * one engine analysis.
 */

import type { Engine } from '../engine/types';
import type { MatchRecord } from '../rules';
import {
  analyzeCubeMoment,
  analyzePlayMoment,
  assembleGameAnalysis,
  assembleMatchAnalysis,
} from './analyze';
import type { AnalyzedDecision, MatchAnalysis } from './types';
import { matchStandings, walkGame } from './walk';

export interface DeepenOptions {
  readonly gameIndex: number;
  readonly decisionIndex: number;
  readonly engine: Engine;
  readonly now?: () => number;
}

/** Re-analyze one decision of a reviewed match at deep effort. */
export async function deepenDecision(
  record: MatchRecord,
  analysis: MatchAnalysis,
  options: DeepenOptions,
): Promise<MatchAnalysis> {
  const { gameIndex, decisionIndex, engine } = options;
  const game = analysis.games[gameIndex];
  const decision = game?.decisions[decisionIndex];
  const gameRecord = record.games[gameIndex];
  if (!decision || !gameRecord) {
    throw new Error(`no decision at game ${gameIndex}, index ${decisionIndex}`);
  }

  const standing = matchStandings(record)[gameIndex];
  const moments = walkGame(gameRecord, standing);

  let replacements: Map<number, AnalyzedDecision>;
  if (decision.kind === 'play') {
    const moment = moments.find(
      (m) => m.kind === 'play' && m.playIndex === decision.playIndex,
    );
    if (moment?.kind !== 'play') {
      throw new Error(`no play recorded at index ${decision.playIndex}`);
    }
    replacements = new Map([
      [decisionIndex, await analyzePlayMoment(moment, engine, 'deep')],
    ]);
  } else {
    const moment = moments.find(
      (m) => m.kind !== 'play' && m.playIndex === decision.playIndex,
    );
    if (!moment || moment.kind === 'play') {
      throw new Error(`no cube moment recorded at play ${decision.playIndex}`);
    }
    const deepened = await analyzeCubeMoment(moment, engine, 'deep');
    replacements = new Map();
    for (const refreshed of deepened) {
      const index = game.decisions.findIndex(
        (d) =>
          d.kind === 'cube' &&
          d.playIndex === refreshed.playIndex &&
          d.action === refreshed.action,
      );
      if (index !== -1) {
        replacements.set(index, refreshed);
      }
    }
  }

  const decisions = game.decisions.map(
    (existing, index) => replacements.get(index) ?? existing,
  );
  const games = analysis.games.map((existing, index) =>
    index === gameIndex ? assembleGameAnalysis(decisions) : existing,
  );
  return assembleMatchAnalysis(games, (options.now ?? Date.now)());
}
