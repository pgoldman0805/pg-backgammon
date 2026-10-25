/**
 * Main-thread engine client: implements the Engine interface over a Web
 * Worker (all gnubg work runs off the main thread) with lazy loading and an
 * observable loading status. The transport is injectable so tests can drive
 * the state machine without a real worker.
 */

import type { DiceRoll } from '../rules';
import type {
  CubeAnalysis,
  CubeInfoOptions,
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
  /**
   * Report a worker-level failure (an uncaught error or a failed
   * deserialization) that never arrives as a normal response. Optional so
   * lightweight transports need not implement it.
   */
  onError?(handler: (error: Error) => void): void;
  terminate(): void;
}

export interface CreateEngineOptions {
  /** Defaults to spawning the real gnubg worker. */
  readonly createTransport?: () => EngineTransport;
  /**
   * Bound (ms) on the boot handshake. A stalled WASM fetch that never
   * answers resolves to the `error` state after this, instead of hanging
   * on "Engine loading…" forever. `Infinity` disables the bound.
   * Defaults to {@link DEFAULT_BOOT_TIMEOUT_MS}.
   */
  readonly bootTimeoutMs?: number;
}

/**
 * 60s: a safety net for a genuinely stuck fetch, not a tight SLA. It is set
 * well above a legitimately slow cold WASM load (the manual loading-state
 * Retry is the fast escape); only a load that is truly wedged reaches it.
 */
export const DEFAULT_BOOT_TIMEOUT_MS = 60_000;

/**
 * Reject if `promise` does not settle within `ms`. The timeout error is
 * recoverable: the caller drops into the `error` state with Retry offered.
 */
function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  if (!Number.isFinite(ms)) {
    return promise;
  }
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`engine boot timed out after ${ms}ms`));
    }, ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error: unknown) => {
        clearTimeout(timer);
        reject(error);
      },
    );
  });
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
    onError: (handler) => {
      // A crashing worker fires `onerror`; a message that fails to
      // deserialize fires `onmessageerror`. Either leaves every pending
      // request unanswered, so surface it as a worker failure.
      worker.onerror = (event: ErrorEvent) => {
        event.preventDefault();
        handler(new Error(event.message || 'engine worker crashed'));
      };
      worker.onmessageerror = () => {
        handler(new Error('engine worker sent an unreadable message'));
      };
    },
    terminate: () => worker.terminate(),
  };
}

export function createGnubgEngine(options: CreateEngineOptions = {}): Engine {
  const createTransport = options.createTransport ?? createWorkerTransport;
  const bootTimeoutMs = options.bootTimeoutMs ?? DEFAULT_BOOT_TIMEOUT_MS;

  let status: EngineStatus = 'idle';
  const listeners = new Set<(status: EngineStatus) => void>();
  let transport: EngineTransport | undefined;
  let nextId = 1;
  const pending = new Map<
    number,
    { resolve: (result: unknown) => void; reject: (error: Error) => void }
  >();
  let initializing: Promise<void> | undefined;
  // Bumped whenever a boot starts or a worker is abandoned, so a stale
  // handshake that settles late (a retried-past stall, a disposed boot)
  // can recognize it is no longer the current attempt and keep its hands
  // off shared state.
  let generation = 0;

  function setStatus(next: EngineStatus): void {
    if (status === next) {
      return;
    }
    status = next;
    for (const listener of listeners) {
      listener(next);
    }
  }

  /** Settle every in-flight request with the same failure. */
  function failPending(error: Error): void {
    for (const entry of pending.values()) {
      entry.reject(error);
    }
    pending.clear();
  }

  /**
   * Abandon the current worker: reject outstanding work and drop the
   * transport so the next use boots a fresh one from a clean slate. The
   * old worker (if any) may have a cached, rejected boot promise, so a
   * genuine retry must replace it rather than re-ask it.
   */
  function teardownTransport(error: Error): void {
    generation++;
    failPending(error);
    transport?.terminate();
    transport = undefined;
  }

  function ensureTransport(): EngineTransport {
    if (!transport) {
      const created = createTransport();
      transport = created;
      created.onMessage((response) => {
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
      created.onError?.((error) => {
        // The worker crashed: no response will ever come for anything in
        // flight. Reject it all, abandon the dead worker, and drop into a
        // recoverable error so Retry can boot a fresh one.
        if (transport !== created) {
          return;
        }
        initializing = undefined;
        teardownTransport(error);
        setStatus('error');
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
      const attempt = ++generation;
      setStatus('loading');
      initializing = withTimeout(
        send<void>({ kind: 'initialize' }),
        bootTimeoutMs,
      ).then(
        () => {
          if (attempt === generation) {
            setStatus('ready');
          }
        },
        (error: unknown) => {
          const failure =
            error instanceof Error ? error : new Error(String(error));
          // A newer attempt (or a dispose) has superseded this boot; its
          // late failure is no longer anyone's concern.
          if (attempt === generation) {
            initializing = undefined;
            teardownTransport(failure);
            setStatus('error');
          }
          throw failure;
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

    async cubeInfo(
      position: EnginePosition,
      options?: CubeInfoOptions,
    ): Promise<CubeAnalysis> {
      await initialize();
      return send<CubeAnalysis>({ kind: 'cubeInfo', position, options });
    },

    dispose() {
      teardownTransport(new Error('engine disposed'));
      initializing = undefined;
      setStatus('idle');
    },
  };
}
