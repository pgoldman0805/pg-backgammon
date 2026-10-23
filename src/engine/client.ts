/**
 * Main-thread engine client: implements the Engine interface over a Web
 * Worker (all gnubg work runs off the main thread) with lazy loading and an
 * observable loading status. The transport is injectable so tests can drive
 * the state machine without a real worker.
 */

import type { DiceRoll } from '../rules';
import type {
  CubeAnalysis,
  Engine,
  EnginePosition,
  EngineStatus,
  PositionEvaluation,
  RankedPlay,
  RankPlaysOptions,
} from './types';
import type { EngineRequest, EngineResponse } from './workerProtocol';

/** Message channel to the engine worker (or a test double). */
export interface EngineTransport {
  postMessage(request: EngineRequest): void;
  onMessage(handler: (response: EngineResponse) => void): void;
  terminate(): void;
}

export interface CreateEngineOptions {
  /** Defaults to spawning the real gnubg worker. */
  readonly createTransport?: () => EngineTransport;
}

/** Omit distributed over the request union (plain Omit collapses it). */
type DistributiveOmit<T, K extends PropertyKey> = T extends unknown
  ? Omit<T, K>
  : never;
type EngineRequestBody = DistributiveOmit<EngineRequest, 'id'>;

function createWorkerTransport(): EngineTransport {
  const worker = new Worker(new URL('./worker.ts', import.meta.url), {
    type: 'module',
  });
  return {
    postMessage: (request) => worker.postMessage(request),
    onMessage: (handler) => {
      worker.onmessage = (event: MessageEvent<EngineResponse>) =>
        handler(event.data);
    },
    terminate: () => worker.terminate(),
  };
}

export function createGnubgEngine(options: CreateEngineOptions = {}): Engine {
  const createTransport = options.createTransport ?? createWorkerTransport;

  let status: EngineStatus = 'idle';
  const listeners = new Set<(status: EngineStatus) => void>();
  let transport: EngineTransport | undefined;
  let nextId = 1;
  const pending = new Map<
    number,
    { resolve: (result: unknown) => void; reject: (error: Error) => void }
  >();
  let initializing: Promise<void> | undefined;

  function setStatus(next: EngineStatus): void {
    if (status === next) {
      return;
    }
    status = next;
    for (const listener of listeners) {
      listener(next);
    }
  }

  function ensureTransport(): EngineTransport {
    if (!transport) {
      transport = createTransport();
      transport.onMessage((response) => {
        const entry = pending.get(response.id);
        if (!entry) {
          return;
        }
        pending.delete(response.id);
        if (response.ok) {
          entry.resolve(response.result);
        } else {
          entry.reject(new Error(response.error));
        }
      });
    }
    return transport;
  }

  function send<T>(request: EngineRequestBody): Promise<T> {
    const id = nextId++;
    const channel = ensureTransport();
    return new Promise<T>((resolve, reject) => {
      pending.set(id, {
        resolve: (result) => resolve(result as T),
        reject,
      });
      channel.postMessage({ ...request, id } as EngineRequest);
    });
  }

  function initialize(): Promise<void> {
    if (!initializing) {
      setStatus('loading');
      initializing = send<void>({ kind: 'initialize' }).then(
        () => setStatus('ready'),
        (error) => {
          initializing = undefined;
          setStatus('error');
          throw error;
        },
      );
    }
    return initializing;
  }

  return {
    get status() {
      return status;
    },

    onStatusChange(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },

    initialize,

    async evaluate(position: EnginePosition): Promise<PositionEvaluation> {
      await initialize();
      return send<PositionEvaluation>({ kind: 'evaluate', position });
    },

    async rankPlays(
      position: EnginePosition,
      roll: DiceRoll,
      options?: RankPlaysOptions,
    ): Promise<readonly RankedPlay[]> {
      await initialize();
      return send<readonly RankedPlay[]>({
        kind: 'rankPlays',
        position,
        roll,
        options,
      });
    },

    async cubeInfo(position: EnginePosition): Promise<CubeAnalysis> {
      await initialize();
      return send<CubeAnalysis>({ kind: 'cubeInfo', position });
    },

    dispose() {
      const error = new Error('engine disposed');
      for (const entry of pending.values()) {
        entry.reject(error);
      }
      pending.clear();
      transport?.terminate();
      transport = undefined;
      initializing = undefined;
      setStatus('idle');
    },
  };
}
