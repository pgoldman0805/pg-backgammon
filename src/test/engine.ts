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
} from '../engine';

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
