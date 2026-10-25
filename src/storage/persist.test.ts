import { createPlayStore, type PlayStore } from '../play/store';
import { replayMatch } from '../rules';
import { scriptedDice } from '../test/dice';
import { isLiveMatchInProgress, readLiveMatchMirror } from './liveMatch';
import { createMemoryStorage } from './memory';
import { createMatchPersister } from './persist';
import type { MatchConfig, MatchStorage, StoredMatch } from './types';

const config: MatchConfig = {
  length: 3,
  mode: 'computer',
  difficulty: 'casual',
};

/** A persister wired to a fresh store and memory storage, with fixed ids/time. */
function harness(
  options: { debounceMs?: number; storage?: MatchStorage } = {},
) {
  const storage = options.storage ?? createMemoryStorage();
  const store = createPlayStore({ dice: scriptedDice(6, 3, 5, 2, 4, 1) });
  let time = 1_000;
  let ids = 0;
  const persister = createMatchPersister({
    store,
    storage,
    debounceMs: options.debounceMs ?? 10_000,
    now: () => time,
    newId: () => `id-${++ids}`,
  });
  return {
    storage,
    store,
    persister,
    tick: (ms: number) => {
      time += ms;
    },
  };
}

/** White's opening 6-3 from the start position, committed. */
function playOpening(store: PlayStore): void {
  store.dispatch({ type: 'movement', from: 24, die: 6 });
  store.dispatch({ type: 'movement', from: 13, die: 3 });
  store.dispatch({ type: 'commit' });
}

/** Resign the current game as the current actor's opponent accepts. */
function resignCurrentGame(store: PlayStore): void {
  store.dispatch({ type: 'resign', kind: 'single' });
  store.dispatch({ type: 'accept-resign' });
}

describe('match persistence', () => {
  it('saves nothing until a match identity begins', async () => {
    const { storage, store, persister } = harness();

    store.dispatch({ type: 'start', length: 3 });
    playOpening(store);
    await persister.flush();

    expect(await storage.list()).toEqual([]);
  });

  it('persists the exact in-progress state under the begun identity', async () => {
    const { storage, store, persister, tick } = harness();

    persister.begin(config);
    store.dispatch({ type: 'start', length: 3 });
    tick(500);
    playOpening(store);
    await persister.flush();

    const stored = await storage.get('id-1');
    expect(stored).not.toBeNull();
    expect(stored).toMatchObject({
      id: 'id-1',
      config,
      status: 'in-progress',
      createdAt: 1_000,
      updatedAt: 1_500,
      score: { white: 0, black: 0 },
      winner: null,
    });
    expect(stored?.state).toEqual(store.getState().match);
    expect(stored?.state?.phase).toBe('pre-roll');
  });

  it('debounces: no write before the quiet period, flush forces one', async () => {
    const { storage, store, persister } = harness({ debounceMs: 10_000 });

    persister.begin(config);
    store.dispatch({ type: 'start', length: 3 });

    expect(await storage.list()).toEqual([]);
    await persister.flush();
    expect(await storage.list()).toHaveLength(1);
  });

  it('writes on its own after the quiet period', async () => {
    const { storage, store, persister } = harness({ debounceMs: 0 });

    persister.begin(config);
    store.dispatch({ type: 'start', length: 3 });

    await vi.waitFor(async () => {
      expect(await storage.list()).toHaveLength(1);
    });
  });

  it('marks a finished match and drops the snapshot, keeping the record', async () => {
    const { storage, store, persister } = harness();

    persister.begin({ ...config, length: 1 });
    store.dispatch({ type: 'start', length: 1 });
    resignCurrentGame(store);
    await persister.flush();

    const stored = await storage.get('id-1');
    expect(stored?.status).toBe('finished');
    expect(stored?.state).toBeNull();
    expect(stored?.winner).toBe('black');
    expect(replayMatch(stored?.record as StoredMatch['record'])).toEqual({
      score: { white: 0, black: 1 },
      winner: 'black',
    });
  });

  it('starts a new identity per begun match, never cross-saving', async () => {
    const { storage, store, persister } = harness();

    persister.begin({ ...config, length: 1 });
    store.dispatch({ type: 'start', length: 1 });
    resignCurrentGame(store);
    await persister.flush();

    // A new match begins: the finished row must stay finished.
    persister.begin(config);
    store.dispatch({ type: 'start', length: 3 });
    await persister.flush();

    const first = await storage.get('id-1');
    const second = await storage.get('id-2');
    expect(first?.status).toBe('finished');
    expect(second?.status).toBe('in-progress');
    expect(second?.createdAt).toBe(1_000);
  });

  it('adopting a stored match keeps its id, createdAt and extra fields', async () => {
    const { storage, store, persister, tick } = harness();

    persister.begin(config);
    store.dispatch({ type: 'start', length: 3 });
    await persister.flush();
    const stored = (await storage.get('id-1')) as StoredMatch;
    const adopted = { ...stored, createdAt: 42, analysis: { errorRate: 0.05 } };

    persister.adopt(adopted);
    tick(500);
    playOpening(store);
    await persister.flush();

    const after = await storage.get('id-1');
    expect(after?.createdAt).toBe(42);
    expect(after?.updatedAt).toBe(1_500);
    expect(after?.analysis).toEqual({ errorRate: 0.05 });
    expect(after?.state).toEqual(store.getState().match);
  });

  it('resumes persisting when recreated with an existing identity', async () => {
    const { storage, store, persister } = harness();
    persister.begin(config);
    store.dispatch({ type: 'start', length: 3 });
    await persister.flush();
    const identity = persister.identity;
    persister.dispose();

    // A new store (reload) around the stored snapshot, same identity.
    const stored = (await storage.get('id-1')) as StoredMatch;
    const resumedStore = createPlayStore({
      match: stored.state ?? undefined,
      dice: scriptedDice(5, 2),
    });
    const resumed = createMatchPersister({
      store: resumedStore,
      storage,
      identity,
      debounceMs: 10_000,
      now: () => 9_000,
    });
    playOpening(resumedStore);
    await resumed.flush();

    const after = await storage.get('id-1');
    expect(after?.updatedAt).toBe(9_000);
    expect(after?.state?.game.record.plays).toHaveLength(1);
  });

  it('stops saving after dispose', async () => {
    const { storage, store, persister } = harness();
    persister.begin(config);
    persister.dispose();

    store.dispatch({ type: 'start', length: 3 });
    await persister.flush();

    expect(await storage.list()).toEqual([]);
  });

  it('flushes when the page is being hidden', async () => {
    const { storage, store, persister } = harness();
    persister.begin(config);
    store.dispatch({ type: 'start', length: 3 });

    window.dispatchEvent(new Event('pagehide'));

    await vi.waitFor(async () => {
      expect(await storage.list()).toHaveLength(1);
    });
    persister.dispose();
  });

  it('swallows storage failures instead of crashing play', async () => {
    const failing: MatchStorage = {
      ...createMemoryStorage(),
      put: () => Promise.reject(new Error('quota exceeded')),
    };
    const { store, persister } = harness({ storage: failing });

    persister.begin(config);
    store.dispatch({ type: 'start', length: 3 });

    await expect(persister.flush()).resolves.toBeUndefined();
  });

  describe('live-match signal and synchronous hide mirror', () => {
    beforeEach(() => {
      localStorage.clear();
    });

    it('flags a match as in progress while it persists one', () => {
      const { store, persister } = harness();
      expect(isLiveMatchInProgress()).toBe(false);

      persister.begin(config);
      store.dispatch({ type: 'start', length: 3 });

      expect(isLiveMatchInProgress()).toBe(true);
      persister.dispose();
    });

    it('clears the in-progress flag on dispose', () => {
      const { store, persister } = harness();
      persister.begin(config);
      store.dispatch({ type: 'start', length: 3 });

      persister.dispose();

      expect(isLiveMatchInProgress()).toBe(false);
    });

    it('mirrors the latest move synchronously on hide, before the debounced save lands', async () => {
      const { storage, store, persister } = harness({ debounceMs: 10_000 });
      persister.begin(config);
      store.dispatch({ type: 'start', length: 3 });
      playOpening(store);

      // The debounced IndexedDB write has not run yet.
      expect(await storage.list()).toEqual([]);

      // Hiding the page captures the move synchronously, so a reload inside
      // the quiet period cannot clip it.
      window.dispatchEvent(new Event('pagehide'));

      const mirror = readLiveMatchMirror();
      expect(mirror?.id).toBe('id-1');
      expect(mirror?.status).toBe('in-progress');
      expect(mirror?.state?.game.record.plays).toHaveLength(1);
      persister.dispose();
    });

    it('clears flag and mirror once the match finishes', async () => {
      const { store, persister } = harness();
      persister.begin({ ...config, length: 1 });
      store.dispatch({ type: 'start', length: 1 });
      window.dispatchEvent(new Event('pagehide'));
      resignCurrentGame(store);
      await persister.flush();

      expect(isLiveMatchInProgress()).toBe(false);
      expect(readLiveMatchMirror()).toBeNull();
      persister.dispose();
    });
  });

  it('reports a save failure, then recovery, through save health', async () => {
    let failNext = true;
    const inner = createMemoryStorage();
    const storage: MatchStorage = {
      ...inner,
      put: (match) =>
        failNext
          ? Promise.reject(new Error('quota exceeded'))
          : inner.put(match),
    };
    const reportFailure = vi.fn();
    const reportSuccess = vi.fn();
    const store = createPlayStore({ dice: scriptedDice(6, 3, 5, 2, 4, 1) });
    const persister = createMatchPersister({
      store,
      storage,
      debounceMs: 10_000,
      saveHealth: { reportFailure, reportSuccess },
    });

    persister.begin(config);
    store.dispatch({ type: 'start', length: 3 });
    await persister.flush();

    // The quota error is surfaced, not swallowed in silence.
    expect(reportFailure).toHaveBeenCalled();
    expect(reportSuccess).not.toHaveBeenCalled();

    // A later change writes successfully: health recovers.
    failNext = false;
    playOpening(store);
    await persister.flush();

    expect(reportSuccess).toHaveBeenCalled();
  });
});
