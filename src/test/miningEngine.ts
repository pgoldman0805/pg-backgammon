/**
 * A deterministic stand-in mining engine for self-play mining tests (ticket
 * 18): every distinct legal play is ranked by its final position key with
 * equities spaced 0.06 apart — so every decision point with enough candidates
 * sits inside the miner's margin windows and the same seeded self-play run
 * always unfolds identically. Cube questions always answer "Double, take"
 * with margins inside the cube windows.
 */

import type { CubeAnalysis, RankedPlay } from '../engine/types';
import { boardKey } from '../puzzles/grade';
import type { SelfPlayMiningEngine } from '../puzzles/selfPlayMining';
import type { BoardState, DiceRoll, Play, Player } from '../rules';
import { applyMovement, legalPlays } from '../rules';

function rank(board: BoardState, onRoll: Player, roll: DiceRoll): RankedPlay[] {
  const byFinal = new Map<string, Play>();
  for (const play of legalPlays(board, onRoll, roll)) {
    const final = play.movements.reduce(
      (b, m) => applyMovement(b, onRoll, m),
      board,
    );
    const key = boardKey(final);
    if (!byFinal.has(key)) {
      byFinal.set(key, play);
    }
  }
  const ordered = [...byFinal.entries()].sort(([a], [b]) => a.localeCompare(b));
  return ordered.map(([, play], index) => {
    const equity = 0.5 - 0.06 * index;
    return {
      rank: index + 1,
      play,
      moveText:
        play.movements.map((m) => `${m.from}/${m.to}`).join(' ') || '(no play)',
      equity,
      equityLoss: 0.06 * index,
      chances: {
        win: 0.5,
        winGammon: 0.1,
        winBackgammon: 0.01,
        lose: 0.5,
        loseGammon: 0.1,
        loseBackgammon: 0.01,
      },
    };
  });
}

const cube: CubeAnalysis = {
  cubelessEquity: 0.55,
  chances: {
    win: 0.7,
    winGammon: 0.2,
    winBackgammon: 0.01,
    lose: 0.3,
    loseGammon: 0.05,
    loseBackgammon: 0.01,
  },
  options: [
    { action: 'No double', equity: 0.5, equityDiff: 0 },
    { action: 'Double, take', equity: 0.62, equityDiff: 0.12 },
    { action: 'Double, pass', equity: 1, equityDiff: 0.5 },
  ],
  properAction: 'Double, take',
};

export function scriptedMiningEngine(): SelfPlayMiningEngine {
  return {
    screenPlays: async (position, roll) =>
      rank(position.board, position.onRoll, roll),
    rankPlays: async (position, roll) =>
      rank(position.board, position.onRoll, roll),
    // The deep check agrees with the 2-ply ranking by default (same order),
    // so the agreement gate keeps every otherwise-qualified play puzzle.
    deepRankPlays: async (position, roll) =>
      rank(position.board, position.onRoll, roll),
    cubeInfo: async () => cube,
  };
}
