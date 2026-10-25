import { describe, expect, it, vi } from 'vitest';
import { createUpdateGate } from './pwaUpdate';

/** A controllable in-progress signal mimicking the live-match storage flag. */
function fakeSignal(initial: boolean) {
  let inProgress = initial;
  const listeners = new Set<() => void>();
  return {
    isMatchInProgress: () => inProgress,
    subscribe: (listener: () => void) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    set(next: boolean) {
      inProgress = next;
      for (const listener of [...listeners]) {
        listener();
      }
    },
  };
}

describe('createUpdateGate', () => {
  it('applies a ready update immediately when no match is in progress', () => {
    const apply = vi.fn();
    const signal = fakeSignal(false);
    const gate = createUpdateGate(signal);

    gate.onUpdateReady(apply);

    expect(apply).toHaveBeenCalledTimes(1);
  });

  it('defers a ready update during a live match, then applies once it ends', () => {
    const apply = vi.fn();
    const signal = fakeSignal(true);
    const gate = createUpdateGate(signal);

    gate.onUpdateReady(apply);
    expect(apply).not.toHaveBeenCalled();

    // A store change that leaves the match still in progress does not reload.
    signal.set(true);
    expect(apply).not.toHaveBeenCalled();

    // The match ends: the deferred reload now applies, exactly once.
    signal.set(false);
    expect(apply).toHaveBeenCalledTimes(1);

    signal.set(false);
    expect(apply).toHaveBeenCalledTimes(1);
  });
});
