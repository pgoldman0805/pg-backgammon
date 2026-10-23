/**
 * Controllable Engine test doubles, built over the fake engine so answers
 * stay realistic while the test decides the timing.
 */

import {
  type CubeAnalysis,
  createFakeEngine,
  type Engine,
  type EngineStatus,
  type PositionEvaluation,
  type RankedPlay,
} from '../engine';
import { applyMovement, type CheckerMovement } from '../rules';

/**
 * A fake engine with a scripted cube verdict (gnubg proper-action text) and
 * optional evaluation overrides; checker play stays the fake's. Counts its
 * cubeInfo calls so tests can pin when the cube was (not) consulted.
 */
export function scriptedCubeEngine(
  properAction: string,
  evaluation?: Partial<PositionEvaluation>,
): Engine & { cubeAsked: number } {
  const fake = createFakeEngine();
  const engine = {
    ...fake,
    cubeAsked: 0,
    async cubeInfo(): Promise<CubeAnalysis> {
      engine.cubeAsked += 1;
      return {
        cubelessEquity: 0,
        chances: {
          win: 0.5,
          winGammon: 0.1,
          winBackgammon: 0.01,
          lose: 0.5,
          loseGammon: 0.1,
          loseBackgammon: 0.01,
        },
        options: [],
        properAction,
      };
    },
    async evaluate(position: Parameters<Engine['evaluate']>[0]) {
      const base = await fake.evaluate(position);
      return { ...base, ...evaluation };
    },
  };
  return engine;
}

/**
 * An engine whose rankings give white's opening 24/18 13/10 a fixed equity
 * and every other play another, so tests control the exact loss Tutor-mode
 * feedback sees. Records its calls and the last ranking it returned.
 */
export function openingFeedbackEngine(
  chosenEquity: number,
  bestEquity: number,
): Engine & {
  lastRanked: readonly RankedPlay[] | null;
  calls: Array<{ board: unknown; difficulty: unknown }>;
} {
  const fake = createFakeEngine();
  const openingMovements: CheckerMovement[] = [
    { from: 24, to: 18, die: 6, hit: false },
    { from: 13, to: 10, die: 3, hit: false },
  ];
  const engine = {
    ...fake,
    lastRanked: null as readonly RankedPlay[] | null,
    calls: [] as Array<{ board: unknown; difficulty: unknown }>,
    async rankPlays(
      position: Parameters<Engine['rankPlays']>[0],
      roll: Parameters<Engine['rankPlays']>[1],
      options?: Parameters<Engine['rankPlays']>[2],
    ) {
      engine.calls.push({
        board: position.board,
        difficulty: options?.difficulty,
      });
      const ranked = await fake.rankPlays(position, roll, options);
      const chosenFinal = JSON.stringify(
        openingMovements.reduce(
          (board, movement) => applyMovement(board, 'white', movement),
          position.board,
        ),
      );
      const rescored = ranked
        .map((entry) => {
          const final = JSON.stringify(
            entry.play.movements.reduce(
              (board, movement) =>
                applyMovement(board, entry.play.player, movement),
              position.board,
            ),
          );
          return {
            ...entry,
            equity: final === chosenFinal ? chosenEquity : bestEquity,
          };
        })
        .sort((a, b) => b.equity - a.equity)
        .map((entry, index) => ({ ...entry, rank: index + 1, equityLoss: 0 }));
      engine.lastRanked = rescored;
      return rescored;
    },
  };
  return engine;
}

/** A fake engine whose rankPlays waits until the test releases it. */
export function gatedEngine(): Engine & { release: () => void } {
  const fake = createFakeEngine();
  let open: () => void = () => {};
  const gate = new Promise<void>((resolve) => {
    open = resolve;
  });
  return {
    ...fake,
    async rankPlays(position, roll, options) {
      await gate;
      return fake.rankPlays(position, roll, options);
    },
    release: () => open(),
  };
}

/**
 * A fake engine whose lazy load the test finishes by hand, for exercising
 * the observable loading/error status.
 */
export function manualLoadEngine(): Engine & {
  finishLoading: (outcome?: 'ready' | 'error') => void;
} {
  const fake = createFakeEngine();
  let status: EngineStatus = 'idle';
  const listeners = new Set<(status: EngineStatus) => void>();
  let settle: { resolve: () => void; reject: (error: Error) => void } | null =
    null;

  function setStatus(next: EngineStatus): void {
    status = next;
    for (const listener of listeners) {
      listener(next);
    }
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
      if (status === 'ready') {
        return Promise.resolve();
      }
      setStatus('loading');
      return new Promise<void>((resolve, reject) => {
        settle = { resolve, reject };
      });
    },
    rankPlays: (position, roll, options) =>
      fake.rankPlays(position, roll, options),
    evaluate: (position) => fake.evaluate(position),
    cubeInfo: (position) => fake.cubeInfo(position),
    dispose: () => {},
    finishLoading(outcome = 'ready') {
      if (!settle) {
        return;
      }
      const { resolve, reject } = settle;
      settle = null;
      if (outcome === 'ready') {
        setStatus('ready');
        resolve();
      } else {
        setStatus('error');
        reject(new Error('engine failed to load'));
      }
    },
  };
}
