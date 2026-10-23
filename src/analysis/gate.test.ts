import { describe, expect, it } from 'vitest';
import { createPriorityGate } from './gate';

function deferred<T>(): { promise: Promise<T>; resolve: (value: T) => void } {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((r) => {
    resolve = r;
  });
  return { promise, resolve };
}

describe('createPriorityGate', () => {
  it('runs work sequentially, never overlapping', async () => {
    const gate = createPriorityGate();
    const first = deferred<void>();
    const log: string[] = [];

    const a = gate.run('background', async () => {
      log.push('a-start');
      await first.promise;
      log.push('a-end');
    });
    const b = gate.run('background', async () => {
      log.push('b');
    });
    await Promise.resolve();
    expect(log).toEqual(['a-start']);
    first.resolve();
    await Promise.all([a, b]);
    expect(log).toEqual(['a-start', 'a-end', 'b']);
  });

  it('lets user work jump the background queue', async () => {
    const gate = createPriorityGate();
    const first = deferred<void>();
    const log: string[] = [];

    const running = gate.run('background', async () => {
      await first.promise;
      log.push('b1');
    });
    const queued = gate.run('background', async () => {
      log.push('b2');
    });
    const urgent = gate.run('user', async () => {
      log.push('u1');
    });
    first.resolve();
    await Promise.all([running, queued, urgent]);
    expect(log).toEqual(['b1', 'u1', 'b2']);
  });

  it('returns results and propagates failures without stalling the queue', async () => {
    const gate = createPriorityGate();
    const failing = gate.run('background', async () => {
      throw new Error('boom');
    });
    const after = gate.run('background', async () => 42);
    await expect(failing).rejects.toThrow('boom');
    await expect(after).resolves.toBe(42);
  });
});
