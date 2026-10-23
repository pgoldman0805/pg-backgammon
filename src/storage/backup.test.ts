import type { PuzzleProgressState } from '../puzzles/queue';
import {
  exportBackup,
  importBackup,
  parseBackup,
  serializeBackup,
} from './backup';
import { createMemoryStorage } from './memory';
import { createMemoryPuzzleProgressStorage } from './puzzleProgress';
import { storedMatchFixture } from './storageContract';

const progressFixture: PuzzleProgressState = {
  themes: { 'bear-off': { solved: 3, missed: 1, streak: 2 } },
  solvedIds: ['curated-001'],
  retryQueue: ['curated-002'],
  updatedAt: 4_000,
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
    expect(backup.format).toBe(2);
    expect(backup.exportedAt).toBe(5_000);
    expect(backup.matches.map((m) => m.id)).toEqual(['a', 'b']);
    expect(backup.puzzleProgress).toBeUndefined();
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
