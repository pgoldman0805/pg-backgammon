import {
  exportBackup,
  importBackup,
  parseBackup,
  serializeBackup,
} from './backup';
import { createMemoryStorage } from './memory';
import { storedMatchFixture } from './storageContract';

describe('history backup', () => {
  it('exports every stored match with a format marker', async () => {
    const storage = createMemoryStorage([
      storedMatchFixture({ id: 'a', updatedAt: 2_000 }),
      storedMatchFixture({ id: 'b', updatedAt: 1_000 }),
    ]);

    const backup = await exportBackup(storage, () => 5_000);

    expect(backup.app).toBe('pg-backgammon');
    expect(backup.format).toBe(1);
    expect(backup.exportedAt).toBe(5_000);
    expect(backup.matches.map((m) => m.id)).toEqual(['a', 'b']);
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
