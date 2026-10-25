import { describe, expect, it } from 'vitest';
import { initialBoard } from '../rules';
import type { EngineTransport } from './client';
import { createGnubgEngine } from './client';
import type { EngineStatus, PositionEvaluation } from './types';
import type { EngineRequest, EngineResponse } from './workerProtocol';

const EVALUATION: PositionEvaluation = {
  plies: 2,
  equity: 0.077,
  cubefulEquity: 0.106,
  chances: {
    win: 0.525,
    winGammon: 0.149,
    winBackgammon: 0.007,
    lose: 0.475,
    loseGammon: 0.125,
    loseBackgammon: 0.005,
  },
};

interface FakeWorker {
  transport: EngineTransport;
  requests: EngineRequest[];
  respond: (response: EngineResponse) => void;
  /** Simulate a worker-level crash (uncaught error / onerror). */
  crash: (error: Error) => void;
  terminated: boolean;
  autoRespond?: (request: EngineRequest) => EngineResponse | undefined;
}

function fakeWorker(
  autoRespond?: (request: EngineRequest) => EngineResponse | undefined,
): FakeWorker {
  let handler: ((response: EngineResponse) => void) | undefined;
  let errorHandler: ((error: Error) => void) | undefined;
  const worker: FakeWorker = {
    requests: [],
    terminated: false,
    autoRespond,
    respond: (response) => {
      handler?.(response);
    },
    crash: (error) => {
      errorHandler?.(error);
    },
    transport: {
      postMessage(request) {
        worker.requests.push(request);
        const response = worker.autoRespond?.(request);
        if (response) {
          queueMicrotask(() => handler?.(response));
        }
      },
      onMessage(h) {
        handler = h;
      },
      onError(h) {
        errorHandler = h;
      },
      terminate() {
        worker.terminated = true;
      },
    },
  };
  return worker;
}

const initOk = (request: EngineRequest): EngineResponse | undefined =>
  request.kind === 'initialize'
    ? { id: request.id, ok: true, result: undefined }
    : undefined;

/** Flush the task queue so lazily-posted requests reach the transport. */
const flush = (): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, 0));

describe('createGnubgEngine', () => {
  it('starts idle and does not create the worker until first use', () => {
    let created = 0;
    const engine = createGnubgEngine({
      createTransport: () => {
        created++;
        return fakeWorker().transport;
      },
    });
    expect(engine.status).toBe('idle');
    expect(created).toBe(0);
  });

  it('moves through loading to ready and notifies subscribers', async () => {
    const worker = fakeWorker(initOk);
    const engine = createGnubgEngine({
      createTransport: () => worker.transport,
    });
    const seen: EngineStatus[] = [];
    engine.onStatusChange((status) => seen.push(status));
    const initialized = engine.initialize();
    expect(engine.status).toBe('loading');
    await initialized;
    expect(engine.status).toBe('ready');
    expect(seen).toEqual(['loading', 'ready']);
  });

  it('initializes once no matter how many calls race', async () => {
    const worker = fakeWorker(initOk);
    const engine = createGnubgEngine({
      createTransport: () => worker.transport,
    });
    await Promise.all([engine.initialize(), engine.initialize()]);
    expect(worker.requests.filter((r) => r.kind === 'initialize')).toHaveLength(
      1,
    );
  });

  it('resolves requests by id, independent of response order', async () => {
    const worker = fakeWorker(initOk);
    const engine = createGnubgEngine({
      createTransport: () => worker.transport,
    });
    await engine.initialize();

    const position = { board: initialBoard(), onRoll: 'white' } as const;
    const first = engine.evaluate(position);
    const second = engine.evaluate(position);
    await flush();
    const [a, b] = worker.requests.filter((r) => r.kind === 'evaluate');
    worker.respond({
      id: b.id,
      ok: true,
      result: { ...EVALUATION, equity: 0.2 },
    });
    worker.respond({ id: a.id, ok: true, result: EVALUATION });
    await expect(first).resolves.toEqual(EVALUATION);
    await expect(second).resolves.toMatchObject({ equity: 0.2 });
  });

  it('rejects only the failing request', async () => {
    const worker = fakeWorker(initOk);
    const engine = createGnubgEngine({
      createTransport: () => worker.transport,
    });
    await engine.initialize();
    const position = { board: initialBoard(), onRoll: 'white' } as const;
    const failing = engine.evaluate(position);
    const fine = engine.evaluate(position);
    await flush();
    const [a, b] = worker.requests.filter((r) => r.kind === 'evaluate');
    worker.respond({ id: a.id, ok: false, error: 'engine exploded' });
    worker.respond({ id: b.id, ok: true, result: EVALUATION });
    await expect(failing).rejects.toThrow('engine exploded');
    await expect(fine).resolves.toEqual(EVALUATION);
    expect(engine.status).toBe('ready');
  });

  it('reports error status when initialization fails', async () => {
    const worker = fakeWorker((request) =>
      request.kind === 'initialize'
        ? { id: request.id, ok: false, error: 'no wasm for you' }
        : undefined,
    );
    const engine = createGnubgEngine({
      createTransport: () => worker.transport,
    });
    await expect(engine.initialize()).rejects.toThrow('no wasm for you');
    expect(engine.status).toBe('error');
  });

  it('lazy-initializes on the first evaluation call', async () => {
    const worker = fakeWorker((request) => {
      if (request.kind === 'initialize') {
        return { id: request.id, ok: true, result: undefined };
      }
      if (request.kind === 'evaluate') {
        return { id: request.id, ok: true, result: EVALUATION };
      }
      return undefined;
    });
    const engine = createGnubgEngine({
      createTransport: () => worker.transport,
    });
    const evaluation = await engine.evaluate({
      board: initialBoard(),
      onRoll: 'white',
    });
    expect(evaluation).toEqual(EVALUATION);
    expect(worker.requests[0].kind).toBe('initialize');
    expect(engine.status).toBe('ready');
  });

  it('times out a stalled boot into a recoverable error within the bound', async () => {
    // A worker that accepts the initialize request but never answers it.
    const worker = fakeWorker();
    const engine = createGnubgEngine({
      createTransport: () => worker.transport,
      bootTimeoutMs: 20,
    });

    const init = engine.initialize();
    expect(engine.status).toBe('loading');
    await expect(init).rejects.toThrow(/timed out/i);
    expect(engine.status).toBe('error');
    // The stalled worker is abandoned so a retry starts clean.
    expect(worker.terminated).toBe(true);
  });

  it('a timed-out boot still recovers on retry', async () => {
    let attempt = 0;
    const engine = createGnubgEngine({
      bootTimeoutMs: 20,
      createTransport: () => {
        attempt++;
        // First worker stalls; the second answers.
        return attempt === 1
          ? fakeWorker().transport
          : fakeWorker(initOk).transport;
      },
    });

    await expect(engine.initialize()).rejects.toThrow(/timed out/i);
    expect(engine.status).toBe('error');

    await engine.initialize();
    expect(engine.status).toBe('ready');
    expect(attempt).toBe(2);
  });

  it('recreates the worker on retry after a failed load and reaches ready', async () => {
    const workers: FakeWorker[] = [];
    let attempt = 0;
    const engine = createGnubgEngine({
      createTransport: () => {
        attempt++;
        const worker =
          attempt === 1
            ? fakeWorker((request) =>
                request.kind === 'initialize'
                  ? { id: request.id, ok: false, error: 'network down' }
                  : undefined,
              )
            : fakeWorker(initOk);
        workers.push(worker);
        return worker.transport;
      },
    });

    await expect(engine.initialize()).rejects.toThrow('network down');
    expect(engine.status).toBe('error');

    // Retry genuinely re-attempts against a fresh worker, not the poisoned one.
    await engine.initialize();
    expect(engine.status).toBe('ready');
    expect(attempt).toBe(2);
    expect(workers[0].terminated).toBe(true);
  });

  it('abandons a stalled boot when disposed and boots fresh on the next initialize', async () => {
    let attempt = 0;
    const workers: FakeWorker[] = [];
    const engine = createGnubgEngine({
      // Isolate the dispose/retry path from the timeout.
      bootTimeoutMs: Number.POSITIVE_INFINITY,
      createTransport: () => {
        attempt++;
        const worker = attempt === 1 ? fakeWorker() : fakeWorker(initOk);
        workers.push(worker);
        return worker.transport;
      },
    });

    const stalled = engine.initialize();
    stalled.catch(() => {});
    expect(engine.status).toBe('loading');

    // Retry while still loading: drop the stalled worker, then re-attempt.
    engine.dispose();
    await engine.initialize();

    expect(engine.status).toBe('ready');
    expect(attempt).toBe(2);
    expect(workers[0].terminated).toBe(true);

    // The abandoned boot's late rejection must not corrupt the ready state.
    await flush();
    expect(engine.status).toBe('ready');
  });

  it('a worker crash settles pending requests into a recoverable error', async () => {
    const worker = fakeWorker(initOk);
    const engine = createGnubgEngine({
      createTransport: () => worker.transport,
    });
    await engine.initialize();

    const position = { board: initialBoard(), onRoll: 'white' } as const;
    const inflight = engine.evaluate(position);
    await flush();

    // The worker dies with the request still outstanding.
    worker.crash(new Error('worker crashed'));

    await expect(inflight).rejects.toThrow(/worker crashed/i);
    expect(engine.status).toBe('error');
  });

  it('recovers on retry after a worker crash', async () => {
    let attempt = 0;
    const workers: FakeWorker[] = [];
    const engine = createGnubgEngine({
      createTransport: () => {
        attempt++;
        const worker = fakeWorker(initOk);
        workers.push(worker);
        return worker.transport;
      },
    });
    await engine.initialize();
    workers[0].crash(new Error('worker crashed'));
    expect(engine.status).toBe('error');

    await engine.initialize();
    expect(engine.status).toBe('ready');
    expect(attempt).toBe(2);
    expect(workers[0].terminated).toBe(true);
  });

  it('dispose terminates the worker and rejects pending requests', async () => {
    const worker = fakeWorker(initOk);
    const engine = createGnubgEngine({
      createTransport: () => worker.transport,
    });
    await engine.initialize();
    const pending = engine.evaluate({
      board: initialBoard(),
      onRoll: 'white',
    });
    await flush();
    engine.dispose();
    await expect(pending).rejects.toThrow(/disposed/i);
    expect(worker.terminated).toBe(true);
    expect(engine.status).toBe('idle');
  });
});
