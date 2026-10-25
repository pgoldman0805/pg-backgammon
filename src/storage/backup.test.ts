import type { PuzzleProgressState } from '../puzzles/queue';
import type { CubePuzzle } from '../puzzles/types';
import {
  exportBackup,
  importBackup,
  parseBackup,
  serializeBackup,
  summarizeBackup,
} from './backup';
import { createMemoryBlunderPuzzleStorage } from './blunderPuzzles';
import { createMemoryGeneratedPuzzleStorage } from './generatedPuzzles';
import { createMemoryStorage } from './memory';
import { createMemoryPuzzleProgressStorage } from './puzzleProgress';
import { storedMatchFixture } from './storageContract';
import type { MatchStorage } from './types';

const progressFixture: PuzzleProgressState = {
  themes: { 'bear-off': { solved: 3, missed: 1, streak: 2 } },
  solvedIds: ['curated-001'],
  retryQueue: ['curated-002'],
  updatedAt: 4_000,
};

const blunderFixture: CubePuzzle = {
  id: 'blunder:m1:0:1',
  kind: 'cube',
  theme: 'cube-handling',
  source: 'blunder',
  origin: { matchId: 'm1', game: 0, decision: 1 },
  board: {
    points: [
      0, 2, 0, 0, 0, 0, 4, 0, 0, 0, 0, 0, -5, 5, 0, 0, 0, -3, 0, -5, 0, 0, 0, 0,
      -2,
    ],
    bar: { white: 0, black: 0 },
    off: { white: 4, black: 0 },
  },
  hero: 'white',
  match: {
    matchLength: 7,
    score: { white: 0, black: 0 },
    cube: { value: 1, owner: 'center' },
    crawford: false,
  },
  decision: 'response',
  choices: [
    { action: 'pass', equity: -1, equityLoss: 0 },
    { action: 'take', equity: -1.3, equityLoss: 0.3 },
  ],
  verdict: 'Double, pass',
};

describe('history backup', () => {
  it('exports every stored match with a format marker', async () => {
    const storage = createMemoryStorage([
      storedMatchFixture({ id: 'a', updatedAt: 2_000 }),
      storedMatchFixture({ id: 'b', updatedAt: 1_000 }),
    ]);

    const backup = await exportBackup(
      storage,
      () => 5_000,
      createMemoryPuzzleProgressStorage(),
    );

    expect(backup.app).toBe('pg-backgammon');
    expect(backup.format).toBe(4);
    expect(backup.exportedAt).toBe(5_000);
    expect(backup.matches.map((m) => m.id)).toEqual(['a', 'b']);
    expect(backup.puzzleProgress).toBeUndefined();
    expect(backup.blunderPuzzles).toBeUndefined();
    expect(backup.generatedPuzzles).toBeUndefined();
  });

  it('exports generated puzzles beside the matches once some exist', async () => {
    const generated = createMemoryGeneratedPuzzleStorage();
    const generatedFixture = {
      ...blunderFixture,
      id: 'generated-7-1',
      source: 'generated',
      origin: undefined,
    } as CubePuzzle;
    await generated.putAll([generatedFixture]);

    const backup = await exportBackup(
      createMemoryStorage(),
      () => 5_000,
      createMemoryPuzzleProgressStorage(),
      createMemoryBlunderPuzzleStorage(),
      generated,
    );

    expect(backup.generatedPuzzles).toEqual([generatedFixture]);
  });

  it('restores generated puzzles on import, replacing the current set', async () => {
    const generatedFixture = {
      ...blunderFixture,
      id: 'generated-7-1',
      source: 'generated',
      origin: undefined,
    } as CubePuzzle;
    const source = createMemoryGeneratedPuzzleStorage();
    await source.putAll([generatedFixture]);
    const json = serializeBackup(
      await exportBackup(
        createMemoryStorage(),
        Date.now,
        createMemoryPuzzleProgressStorage(),
        createMemoryBlunderPuzzleStorage(),
        source,
      ),
    );

    const target = createMemoryGeneratedPuzzleStorage();
    await target.putAll([{ ...generatedFixture, id: 'generated-old-1' }]);
    await importBackup(
      createMemoryStorage(),
      parseBackup(json),
      createMemoryPuzzleProgressStorage(),
      createMemoryBlunderPuzzleStorage(),
      target,
    );

    expect(await target.list()).toEqual([generatedFixture]);
  });

  it('imports a format-3 backup, leaving current generated puzzles alone', async () => {
    const json = JSON.stringify({
      app: 'pg-backgammon',
      format: 3,
      exportedAt: 0,
      matches: [storedMatchFixture({ id: 'good', status: 'finished' })],
      blunderPuzzles: [blunderFixture],
    });

    const generatedFixture = {
      ...blunderFixture,
      id: 'generated-7-1',
      source: 'generated',
      origin: undefined,
    } as CubePuzzle;
    const generated = createMemoryGeneratedPuzzleStorage();
    await generated.putAll([generatedFixture]);
    const blunders = createMemoryBlunderPuzzleStorage();
    await importBackup(
      createMemoryStorage(),
      parseBackup(json),
      createMemoryPuzzleProgressStorage(),
      blunders,
      generated,
    );

    expect(await generated.list()).toEqual([generatedFixture]);
    expect(await blunders.list()).toEqual([blunderFixture]);
  });

  it('skips corrupt generated puzzles inside an otherwise valid file', async () => {
    const generatedFixture = {
      ...blunderFixture,
      id: 'generated-7-1',
      source: 'generated',
      origin: undefined,
    } as CubePuzzle;
    const json = JSON.stringify({
      app: 'pg-backgammon',
      format: 4,
      exportedAt: 0,
      matches: [],
      generatedPuzzles: [generatedFixture, { id: 'broken' }],
    });

    const generated = createMemoryGeneratedPuzzleStorage();
    await importBackup(
      createMemoryStorage(),
      parseBackup(json),
      createMemoryPuzzleProgressStorage(),
      createMemoryBlunderPuzzleStorage(),
      generated,
    );

    expect(await generated.list()).toEqual([generatedFixture]);
  });

  it('exports mined blunder puzzles beside the matches once some exist', async () => {
    const blunders = createMemoryBlunderPuzzleStorage();
    await blunders.putAll([blunderFixture]);

    const backup = await exportBackup(
      createMemoryStorage(),
      () => 5_000,
      createMemoryPuzzleProgressStorage(),
      blunders,
    );

    expect(backup.blunderPuzzles).toEqual([blunderFixture]);
  });

  it('restores blunder puzzles on import, replacing the current set', async () => {
    const source = createMemoryBlunderPuzzleStorage();
    await source.putAll([blunderFixture]);
    const json = serializeBackup(
      await exportBackup(
        createMemoryStorage(),
        Date.now,
        createMemoryPuzzleProgressStorage(),
        source,
      ),
    );

    const target = createMemoryBlunderPuzzleStorage();
    await target.putAll([{ ...blunderFixture, id: 'blunder:old:0:0' }]);
    await importBackup(
      createMemoryStorage(),
      parseBackup(json),
      createMemoryPuzzleProgressStorage(),
      target,
    );

    expect(await target.list()).toEqual([blunderFixture]);
  });

  it('imports a format-2 backup, leaving current blunder puzzles alone', async () => {
    const json = JSON.stringify({
      app: 'pg-backgammon',
      format: 2,
      exportedAt: 0,
      matches: [storedMatchFixture({ id: 'good', status: 'finished' })],
    });

    const blunders = createMemoryBlunderPuzzleStorage();
    await blunders.putAll([blunderFixture]);
    await importBackup(
      createMemoryStorage(),
      parseBackup(json),
      createMemoryPuzzleProgressStorage(),
      blunders,
    );

    expect(await blunders.list()).toEqual([blunderFixture]);
  });

  it('skips corrupt blunder puzzles inside an otherwise valid file', async () => {
    const json = JSON.stringify({
      app: 'pg-backgammon',
      format: 3,
      exportedAt: 0,
      matches: [],
      blunderPuzzles: [blunderFixture, { id: 'broken' }],
    });

    const blunders = createMemoryBlunderPuzzleStorage();
    await importBackup(
      createMemoryStorage(),
      parseBackup(json),
      createMemoryPuzzleProgressStorage(),
      blunders,
    );

    expect(await blunders.list()).toEqual([blunderFixture]);
  });

  it('exports puzzle progress beside the matches once some exists', async () => {
    const puzzles = createMemoryPuzzleProgressStorage();
    await puzzles.save(progressFixture);

    const backup = await exportBackup(
      createMemoryStorage(),
      () => 5_000,
      puzzles,
    );

    expect(backup.puzzleProgress).toEqual(progressFixture);
  });

  it('restores puzzle progress on import', async () => {
    const source = createMemoryPuzzleProgressStorage();
    await source.save(progressFixture);
    const json = serializeBackup(
      await exportBackup(createMemoryStorage(), Date.now, source),
    );

    const target = createMemoryPuzzleProgressStorage();
    await target.save({ ...progressFixture, solvedIds: [], updatedAt: 1 });
    await importBackup(createMemoryStorage(), parseBackup(json), target);

    expect(await target.load()).toEqual(progressFixture);
  });

  it('imports a format-1 backup, leaving current puzzle progress alone', async () => {
    const good = storedMatchFixture({ id: 'good', status: 'finished' });
    const json = JSON.stringify({
      app: 'pg-backgammon',
      format: 1,
      exportedAt: 0,
      matches: [good],
    });

    const matches = createMemoryStorage();
    const puzzles = createMemoryPuzzleProgressStorage();
    await puzzles.save(progressFixture);
    await importBackup(matches, parseBackup(json), puzzles);

    expect((await matches.list()).map((m) => m.id)).toEqual(['good']);
    expect(await puzzles.load()).toEqual(progressFixture);
  });

  it('ignores corrupt puzzle progress inside an otherwise valid file', async () => {
    const json = JSON.stringify({
      app: 'pg-backgammon',
      format: 2,
      exportedAt: 0,
      matches: [storedMatchFixture({ id: 'good', status: 'finished' })],
      puzzleProgress: { themes: 'nope' },
    });

    const matches = createMemoryStorage();
    const puzzles = createMemoryPuzzleProgressStorage();
    await puzzles.save(progressFixture);
    await importBackup(matches, parseBackup(json), puzzles);

    expect((await matches.list()).map((m) => m.id)).toEqual(['good']);
    expect(await puzzles.load()).toEqual(progressFixture);
  });

  it('round-trips through JSON into a cleared profile', async () => {
    const source = createMemoryStorage([
      storedMatchFixture({ id: 'a', updatedAt: 2_000 }),
      storedMatchFixture({
        id: 'b',
        updatedAt: 1_000,
        status: 'finished',
        winner: 'white',
        score: { white: 3, black: 1 },
      }),
    ]);
    const json = serializeBackup(await exportBackup(source));

    const target = createMemoryStorage([storedMatchFixture({ id: 'old' })]);
    await importBackup(target, parseBackup(json));

    expect(await target.list()).toEqual(await source.list());
    expect(await target.get('old')).toBeNull();
  });

  it('rejects files that are not a pg-backgammon backup', () => {
    expect(() => parseBackup('not json')).toThrow();
    expect(() => parseBackup('{"app":"other","format":1}')).toThrow(
      /not a pg-backgammon backup/i,
    );
    expect(() =>
      parseBackup('{"app":"pg-backgammon","format":99,"matches":[]}'),
    ).toThrow(/format/i);
    expect(() =>
      parseBackup('{"app":"pg-backgammon","format":2,"matches":[]}'),
    ).not.toThrow();
    expect(() =>
      parseBackup('{"app":"pg-backgammon","format":3,"matches":[]}'),
    ).not.toThrow();
    expect(() =>
      parseBackup('{"app":"pg-backgammon","format":4,"matches":[]}'),
    ).not.toThrow();
    expect(() =>
      parseBackup('{"app":"pg-backgammon","format":1,"matches":"nope"}'),
    ).toThrow(/not a pg-backgammon backup/i);
  });

  it('skips corrupt rows on import instead of failing', async () => {
    const good = storedMatchFixture({ id: 'good', status: 'finished' });
    const json = JSON.stringify({
      app: 'pg-backgammon',
      format: 1,
      exportedAt: 0,
      matches: [good, { id: 'broken' }],
    });

    const target = createMemoryStorage();
    await importBackup(target, parseBackup(json));

    expect((await target.list()).map((m) => m.id)).toEqual(['good']);
  });
});

describe('atomic restore', () => {
  /** Wraps a storage so a put of a chosen id rejects, as a quota error would. */
  function failingPutStorage(base: MatchStorage, failId: string): MatchStorage {
    return {
      ...base,
      async put(match) {
        if (match.id === failId) {
          throw new Error('QuotaExceededError');
        }
        return base.put(match);
      },
    };
  }

  it('leaves the prior history fully intact when a restore fails midway', async () => {
    const base = createMemoryStorage([
      storedMatchFixture({ id: 'kept-1', updatedAt: 1_000 }),
      storedMatchFixture({ id: 'kept-2', updatedAt: 2_000 }),
    ]);
    const storage = failingPutStorage(base, 'incoming-2');
    const json = JSON.stringify({
      app: 'pg-backgammon',
      format: 1,
      exportedAt: 0,
      matches: [
        storedMatchFixture({ id: 'incoming-1' }),
        storedMatchFixture({ id: 'incoming-2' }),
        storedMatchFixture({ id: 'incoming-3' }),
      ],
    });

    await expect(importBackup(storage, parseBackup(json))).rejects.toThrow();

    expect((await storage.list()).map((m) => m.id).sort()).toEqual([
      'kept-1',
      'kept-2',
    ]);
  });

  it('rolls puzzle, blunder and generated stores back together on failure', async () => {
    const base = createMemoryStorage([
      storedMatchFixture({ id: 'kept', updatedAt: 1_000 }),
    ]);
    const storage = failingPutStorage(base, 'incoming');

    const progress = createMemoryPuzzleProgressStorage();
    await progress.save(progressFixture);
    const blunders = createMemoryBlunderPuzzleStorage();
    await blunders.putAll([blunderFixture]);
    const generatedFixture = {
      ...blunderFixture,
      id: 'generated-7-1',
      source: 'generated',
      origin: undefined,
    } as CubePuzzle;
    const generated = createMemoryGeneratedPuzzleStorage();
    await generated.putAll([generatedFixture]);

    const json = JSON.stringify({
      app: 'pg-backgammon',
      format: 4,
      exportedAt: 0,
      matches: [storedMatchFixture({ id: 'incoming' })],
      puzzleProgress: { ...progressFixture, solvedIds: ['other'] },
      blunderPuzzles: [{ ...blunderFixture, id: 'blunder:x:0:0' }],
      generatedPuzzles: [{ ...generatedFixture, id: 'generated-9-9' }],
    });

    await expect(
      importBackup(storage, parseBackup(json), progress, blunders, generated),
    ).rejects.toThrow();

    expect((await storage.list()).map((m) => m.id)).toEqual(['kept']);
    expect(await progress.load()).toEqual(progressFixture);
    expect(await blunders.list()).toEqual([blunderFixture]);
    expect(await generated.list()).toEqual([generatedFixture]);
  });
});

describe('merge import', () => {
  it("keeps existing matches and adds only the file's non-duplicates", async () => {
    const target = createMemoryStorage([
      storedMatchFixture({ id: 'existing', updatedAt: 1_000 }),
      storedMatchFixture({ id: 'shared', updatedAt: 1_000, winner: 'white' }),
    ]);
    const json = JSON.stringify({
      app: 'pg-backgammon',
      format: 1,
      exportedAt: 0,
      matches: [
        storedMatchFixture({ id: 'shared', updatedAt: 9_999, winner: 'black' }),
        storedMatchFixture({ id: 'incoming' }),
      ],
    });

    await importBackup(
      target,
      parseBackup(json),
      undefined,
      undefined,
      undefined,
      {
        mode: 'merge',
      },
    );

    expect((await target.list()).map((m) => m.id).sort()).toEqual([
      'existing',
      'incoming',
      'shared',
    ]);
    // A duplicate id is a non-import: the existing match is left untouched.
    expect((await target.get('shared'))?.winner).toBe('white');
  });

  it('merges blunder and generated puzzles by id, preserving existing', async () => {
    const generatedFixture = {
      ...blunderFixture,
      id: 'generated-7-1',
      source: 'generated',
      origin: undefined,
    } as CubePuzzle;
    const blunders = createMemoryBlunderPuzzleStorage();
    await blunders.putAll([blunderFixture]);
    await blunders.markMined('m1', 123);
    const generated = createMemoryGeneratedPuzzleStorage();
    await generated.putAll([generatedFixture]);

    const json = JSON.stringify({
      app: 'pg-backgammon',
      format: 4,
      exportedAt: 0,
      matches: [],
      blunderPuzzles: [
        blunderFixture,
        { ...blunderFixture, id: 'blunder:m2:0:0' },
      ],
      generatedPuzzles: [
        generatedFixture,
        { ...generatedFixture, id: 'generated-9-9' },
      ],
    });

    await importBackup(
      createMemoryStorage(),
      parseBackup(json),
      createMemoryPuzzleProgressStorage(),
      blunders,
      generated,
      { mode: 'merge' },
    );

    expect((await blunders.list()).map((p) => p.id)).toEqual([
      'blunder:m1:0:1',
      'blunder:m2:0:0',
    ]);
    // Merge never clears, so the mined-match bookkeeping survives.
    expect(await blunders.loadMined()).toEqual({ m1: 123 });
    expect((await generated.list()).map((p) => p.id)).toEqual([
      'generated-7-1',
      'generated-9-9',
    ]);
  });

  it('unions solved puzzle ids on merge without discarding existing progress', async () => {
    const existing = createMemoryPuzzleProgressStorage();
    await existing.save(progressFixture); // solvedIds: ['curated-001']
    const json = JSON.stringify({
      app: 'pg-backgammon',
      format: 2,
      exportedAt: 0,
      matches: [],
      puzzleProgress: {
        ...progressFixture,
        solvedIds: ['curated-001', 'curated-050'],
        updatedAt: 9_999,
      },
    });

    await importBackup(
      createMemoryStorage(),
      parseBackup(json),
      existing,
      undefined,
      undefined,
      {
        mode: 'merge',
      },
    );

    const merged = await existing.load();
    expect([...(merged?.solvedIds ?? [])].sort()).toEqual([
      'curated-001',
      'curated-050',
    ]);
  });

  it('still defaults to replace, wiping matches the file omits', async () => {
    const target = createMemoryStorage([storedMatchFixture({ id: 'old' })]);
    const json = JSON.stringify({
      app: 'pg-backgammon',
      format: 1,
      exportedAt: 0,
      matches: [storedMatchFixture({ id: 'new' })],
    });

    await importBackup(target, parseBackup(json));

    expect((await target.list()).map((m) => m.id)).toEqual(['new']);
  });
});

describe('backup summary', () => {
  it('counts matches, puzzles and whether progress rides along', async () => {
    const generatedFixture = {
      ...blunderFixture,
      id: 'generated-7-1',
      source: 'generated',
      origin: undefined,
    } as CubePuzzle;
    const source = createMemoryStorage([
      storedMatchFixture({ id: 'a' }),
      storedMatchFixture({ id: 'b' }),
    ]);
    const progress = createMemoryPuzzleProgressStorage();
    await progress.save(progressFixture);
    const blunders = createMemoryBlunderPuzzleStorage();
    await blunders.putAll([blunderFixture]);
    const generated = createMemoryGeneratedPuzzleStorage();
    await generated.putAll([generatedFixture]);

    const backup = await exportBackup(
      source,
      () => 7_000,
      progress,
      blunders,
      generated,
    );

    expect(summarizeBackup(backup)).toEqual({
      format: 4,
      exportedAt: 7_000,
      matches: 2,
      blunderPuzzles: 1,
      generatedPuzzles: 1,
      puzzles: 2,
      hasPuzzleProgress: true,
    });
  });

  it('reports zero puzzles and no progress for a format-1 file', () => {
    const summary = summarizeBackup(
      parseBackup(
        '{"app":"pg-backgammon","format":1,"exportedAt":3,"matches":[]}',
      ),
    );
    expect(summary).toEqual({
      format: 1,
      exportedAt: 3,
      matches: 0,
      blunderPuzzles: 0,
      generatedPuzzles: 0,
      puzzles: 0,
      hasPuzzleProgress: false,
    });
  });
});
