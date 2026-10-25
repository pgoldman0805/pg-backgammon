/**
 * Score-dependent cube mining (ticket 38): take cube positions that already
 * pose an interesting money decision and re-evaluate them at representative
 * match scores (2-away/2-away, a gammon-go score, double match point, …). A
 * position becomes a score-dependent puzzle only when the score genuinely
 * shifts the right answer — the top cube action at the score differs from the
 * money answer — so every kept puzzle actually teaches that the take point
 * moves with the score. The stored answers are the engine's cubeful equities
 * AT THAT SCORE, so grading and the reveal reflect the score, not money.
 *
 * Pure and engine-interface-driven (no node or DOM): the offline driver
 * (scripts/mineScoreCubes.ts) adapts the gnubg WASM session, and unit tests
 * drive a scripted fake. Positions are the app's own curated cube positions —
 * nothing is copied from books or other published sources.
 */

import type { CubeAnalysis, EnginePosition } from '../engine/types';
import type { BoardState, Player } from '../rules';
import { deriveCubeChoices } from './mining';
import type { CubePuzzle, PuzzleMatchContext, PuzzleSource } from './types';

/** The cube-analysis seam the score miner drives (full strength). */
export interface ScoreCubeEngine {
  cubeInfo(position: EnginePosition): Promise<CubeAnalysis>;
}

/** A representative match score to mine every candidate at. */
export interface ScoreContext {
  readonly matchLength: number;
  readonly score: { readonly white: number; readonly black: number };
  readonly crawford?: boolean;
}

/**
 * A cube position to probe, posed for White (the hero): an 'offer' asks
 * double-or-roll (White on roll), a 'response' asks take-or-pass (White has
 * been doubled, so the doubler — Black — is on roll).
 */
export interface ScoreCubeCandidate {
  readonly board: BoardState;
  readonly decision: 'offer' | 'response';
}

export interface ScoreCubeQuality {
  /** Second-best cube choice must lose at least this (a clear best exists). */
  readonly marginMin: number;
  /** …but no more than this (the wrong choice is still tempting). */
  readonly marginMax: number;
  /** At most this many kept puzzles per score context (diversity). */
  readonly perContextCap: number;
}

export const SCORE_CUBE_QUALITY: ScoreCubeQuality = {
  marginMin: 0.05,
  marginMax: 0.45,
  perContextCap: 4,
};

/** Money baseline the score answer is compared against to prove a shift. */
const MONEY: PuzzleMatchContext = {
  matchLength: 0,
  score: { white: 0, black: 0 },
  cube: { value: 1, owner: 'center' },
};

export interface MineScoreCubeOptions {
  readonly engine: ScoreCubeEngine;
  readonly candidates: readonly ScoreCubeCandidate[];
  readonly contexts: readonly ScoreContext[];
  /** Stamped on every keeper ('curated' offline). */
  readonly source: PuzzleSource;
  readonly quality?: Partial<ScoreCubeQuality>;
}

/** The on-roll player for an engine query of a hero-White cube candidate. */
function onRollFor(decision: 'offer' | 'response'): Player {
  // A response is analyzed from the doubler's (the opponent's) side.
  return decision === 'response' ? 'black' : 'white';
}

function positionAt(
  candidate: ScoreCubeCandidate,
  match: PuzzleMatchContext,
): EnginePosition {
  return {
    board: candidate.board,
    onRoll: onRollFor(candidate.decision),
    match: {
      matchLength: match.matchLength,
      score: match.score,
      crawford: match.crawford,
      cube: match.cube,
    },
  };
}

/** Does the engine verdict agree with the derived top choice? */
function consistent(
  decision: 'offer' | 'response',
  topAction: string,
  verdict: string,
): boolean {
  const saysDouble = /^(re)?double/i.test(verdict);
  const saysNoDouble = /^(no (re)?double|too good)/i.test(verdict);
  if (decision === 'offer') {
    return (
      (topAction === 'double' && saysDouble) ||
      (topAction === 'no-double' && saysNoDouble)
    );
  }
  return (
    (topAction === 'take' && /take/i.test(verdict)) ||
    (topAction === 'pass' && /pass/i.test(verdict))
  );
}

/**
 * Mine the candidates at the contexts, keeping only positions whose top cube
 * action at the score differs from the money answer and clears the margin
 * bars. Deterministic: candidates in order, contexts in order. Ids are left
 * 'pending' — the caller names them.
 */
export async function mineScoreCubePuzzles(
  options: MineScoreCubeOptions,
): Promise<CubePuzzle[]> {
  const quality = { ...SCORE_CUBE_QUALITY, ...options.quality };
  const kept: CubePuzzle[] = [];
  const perContext = new Map<string, number>();

  for (const candidate of options.candidates) {
    // The money baseline: what the position's cube decision is with no score.
    let moneyTop: string;
    try {
      const moneyAnalysis = await options.engine.cubeInfo(
        positionAt(candidate, MONEY),
      );
      moneyTop = deriveCubeChoices(moneyAnalysis, candidate.decision).choices[0]
        .action;
    } catch {
      continue;
    }

    for (const context of options.contexts) {
      const contextKey = `${context.matchLength}:${context.score.white}-${context.score.black}:${context.crawford ? 'c' : ''}`;
      if ((perContext.get(contextKey) ?? 0) >= quality.perContextCap) {
        continue;
      }
      const match: PuzzleMatchContext = {
        matchLength: context.matchLength,
        score: context.score,
        cube: { value: 1, owner: 'center' },
        crawford: context.crawford,
      };
      let analysis: CubeAnalysis;
      try {
        analysis = await options.engine.cubeInfo(positionAt(candidate, match));
      } catch {
        continue;
      }
      const { choices, verdict } = deriveCubeChoices(
        analysis,
        candidate.decision,
      );
      const margin = choices[1]?.equityLoss ?? 0;
      const topAction = choices[0].action;
      // The take point must genuinely shift: a score whose answer matches
      // money teaches nothing about the score.
      if (topAction === moneyTop) {
        continue;
      }
      if (margin < quality.marginMin || margin > quality.marginMax) {
        continue;
      }
      if (!consistent(candidate.decision, topAction, verdict)) {
        continue;
      }
      perContext.set(contextKey, (perContext.get(contextKey) ?? 0) + 1);
      kept.push({
        id: 'pending',
        kind: 'cube',
        theme: 'cube-handling',
        source: options.source,
        board: candidate.board,
        hero: 'white',
        match,
        decision: candidate.decision,
        choices,
        verdict,
      });
    }
  }

  return kept;
}
