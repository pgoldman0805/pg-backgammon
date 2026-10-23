/**
 * A fake Engine for downstream tests (spec testing decision: everything
 * above the engine seam tests against a fake honoring the same interface).
 *
 * Deterministic and dependency-free: plays are the real legalPlays ranked by
 * a pip-count heuristic with seeded tie-breaking, evaluations derive from
 * the pip difference, and the difficulty layer reuses the production noise
 * module — so difficulty-sensitive UI behaves identically against the fake.
 */

import type { DiceRoll, Play } from '../rules';
import { applyMovement, legalPlays, pipCount } from '../rules';
import {
  applyDifficultyNoise,
  DIFFICULTY_SETTINGS,
  seededGaussian,
} from './difficulty';
import { boardKey } from './moveText';
import type {
  CubeAnalysis,
  Engine,
  EnginePosition,
  EngineStatus,
  PositionEvaluation,
  WinChances,
} from './types';

function movementText(play: Play): string {
  if (play.movements.length === 0) {
    return '(no play)';
  }
  return play.movements
    .map((m) => `${m.from === 'bar' ? 'bar' : m.from}/${m.to}`)
    .join(' ');
}

function chancesFromEquity(equity: number): WinChances {
  const win = Math.min(0.95, Math.max(0.05, 0.5 + equity / 2));
  return {
    win,
    winGammon: win / 4,
    winBackgammon: win / 50,
    lose: 1 - win,
    loseGammon: (1 - win) / 4,
    loseBackgammon: (1 - win) / 50,
  };
}

export function createFakeEngine(): Engine {
  let status: EngineStatus = 'idle';
  const listeners = new Set<(status: EngineStatus) => void>();

  function setStatus(next: EngineStatus): void {
    if (status === next) {
      return;
    }
    status = next;
    for (const listener of listeners) {
      listener(next);
    }
  }

  function heuristicEquity(position: EnginePosition): number {
    const opponent = position.onRoll === 'white' ? 'black' : 'white';
    const lead =
      pipCount(position.board, opponent) -
      pipCount(position.board, position.onRoll);
    return lead / 50;
  }

  return {
    get status() {
      return status;
    },

    onStatusChange(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },

    initialize() {
      if (status !== 'ready') {
        setStatus('loading');
        setStatus('ready');
      }
      return Promise.resolve();
    },

    async rankPlays(position, roll: DiceRoll, options) {
      await this.initialize();
      const plays = legalPlays(position.board, position.onRoll, roll);
      if (plays.length === 0) {
        return [];
      }

      // Deep effort refines deterministically: the same ground truth plus a
      // small position-seeded adjustment, so downstream code can observe
      // "the numbers moved a little" exactly as with the real 3-ply engine.
      const deep = options?.effort === 'deep' && !options?.difficulty;
      const scored = plays.map((play) => {
        let board = position.board;
        for (const movement of play.movements) {
          board = applyMovement(board, position.onRoll, movement);
        }
        const key = boardKey(board);
        const equity =
          heuristicEquity({ ...position, board }) +
          0.001 * seededGaussian(key) +
          (deep ? 0.004 * seededGaussian(`${key}|deep`) : 0);
        return {
          play,
          moveText: movementText(play),
          equity: Number(equity.toFixed(6)),
        };
      });
      scored.sort((a, b) => b.equity - a.equity);

      const settings = options?.difficulty
        ? DIFFICULTY_SETTINGS[options.difficulty]
        : { noise: 0 };
      const seed = `${boardKey(position.board)}|${roll[0]}${roll[1]}`;
      const ordered =
        settings.noise > 0
          ? applyDifficultyNoise(scored, settings.noise, seed)
          : scored;

      const best = ordered[0].equity;
      return ordered.map((entry, index) => ({
        rank: index + 1,
        play: entry.play,
        moveText: entry.moveText,
        equity: entry.equity,
        equityLoss: Math.max(0, best - entry.equity),
        chances: chancesFromEquity(entry.equity),
      }));
    },

    async evaluate(position): Promise<PositionEvaluation> {
      await this.initialize();
      const equity = Number(heuristicEquity(position).toFixed(6));
      return {
        plies: 2,
        equity,
        cubefulEquity: equity,
        chances: chancesFromEquity(equity),
      };
    },

    async cubeInfo(position, options): Promise<CubeAnalysis> {
      await this.initialize();
      const refined =
        options?.effort === 'deep'
          ? 0.004 * seededGaussian(`${boardKey(position.board)}|deep-cube`)
          : 0;
      const equity = Number((heuristicEquity(position) + refined).toFixed(6));
      const double = Math.min(1, 2 * equity);
      const shouldDouble = equity > 0.35 && double < 1;
      return {
        cubelessEquity: equity,
        chances: chancesFromEquity(equity),
        options: [
          { action: 'No double', equity, equityDiff: 0 },
          {
            action: 'Double, take',
            equity: double,
            equityDiff: Number((double - equity).toFixed(6)),
          },
          {
            action: 'Double, pass',
            equity: 1,
            equityDiff: Number((1 - equity).toFixed(6)),
          },
        ],
        properAction: shouldDouble ? 'Double, take' : 'No double, take',
      };
    },

    dispose() {
      setStatus('idle');
    },
  };
}
