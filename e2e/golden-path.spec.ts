/**
 * The golden-path smoke (ticket 14): the real built app, the real WASM
 * engine, no fakes. One 1-point match at Beginner is played to completion by
 * clicking the accessible board controls, the finished match is opened in
 * Analyze and analyzes itself at 2-ply, the error-rate summary renders, and
 * Puzzles shows the curated collections (plus the mined blunder collection
 * when the match produced a blunder — playing "first legal option" at
 * Beginner all but guarantees one).
 *
 * Expected runtime: about 1-4 minutes on a developer machine. The slow parts
 * are the engine payload load (~5 MB) and the full-match 2-ply analysis; the
 * timeouts are generous on purpose.
 */

import { expect, test } from '@playwright/test';
import { playUntilMatchOver, startComputerMatch } from './helpers';

test('golden path: play a match, review it, see puzzles', async ({ page }) => {
  test.setTimeout(600_000);

  // --- Play: a 1-point match vs Beginner, Tutor off (the default). --------
  await page.goto('/');
  await expect(
    page.getByRole('button', { name: 'Play as White' }),
  ).toBeVisible();
  await startComputerMatch(page, { difficulty: 'Beginner', length: '1 point' });

  // The engine loads lazily; the first roll appears once it is ready.
  await playUntilMatchOver(page);
  await expect(page.getByText(/wins the match/).first()).toBeVisible();

  // The persister's final write is debounced (250 ms); wait for the finished
  // row to land in IndexedDB before opening the ledger — a human spends this
  // moment reading the match-over card.
  await expect
    .poll(
      () =>
        page.evaluate(
          () =>
            new Promise<string[]>((resolve) => {
              const open = indexedDB.open('pg-backgammon');
              open.onsuccess = () => {
                const db = open.result;
                const all = db
                  .transaction('matches', 'readonly')
                  .objectStore('matches')
                  .getAll();
                all.onsuccess = () => {
                  db.close();
                  resolve(
                    (all.result as Array<{ status: string }>).map(
                      (row) => row.status,
                    ),
                  );
                };
                all.onerror = () => {
                  db.close();
                  resolve([]);
                };
              };
              open.onerror = () => resolve([]);
            }),
        ),
      { timeout: 30_000 },
    )
    .toContain('finished');

  // --- Analyze: the finished match analyzes itself into a review. ---------
  await page.getByRole('link', { name: 'Analyze' }).click();
  const row = page.locator('.match-row').first();
  await expect(row.getByText(/wins \d+–\d+/)).toBeVisible();
  await row.getByRole('button', { name: 'Open', exact: true }).click();

  // The review appears when the 2-ply analysis finishes (or was already
  // done in the background during play). Generous: a whole match of plays.
  const whiteRate = page.getByRole('group', { name: 'White error rate' });
  await expect(whiteRate).toBeVisible({ timeout: 480_000 });
  await expect(whiteRate).toHaveText(/^\d+(\.\d+)?$/);
  await expect(
    page.getByRole('group', { name: 'Black error rate' }),
  ).toHaveText(/^\d+(\.\d+)?$/);

  // The decision list and board render alongside the summary.
  await expect(page.getByRole('list', { name: 'Decisions' })).toBeVisible();
  await expect(
    page.getByRole('figure', { name: 'Review position' }),
  ).toBeVisible();

  // How many blunders did White commit? (Conditional puzzle-mining check.)
  const summary = await page
    .locator('.summary-player', { hasText: 'White' })
    .locator('.summary-counts')
    .textContent();
  const blunders = Number(/(\d+) blunder/.exec(summary ?? '')?.[1] ?? '0');

  // --- Puzzles: the curated set is there; blunders mined themselves. ------
  await page.getByRole('link', { name: 'Puzzles' }).click();
  for (const theme of [
    'Priming',
    'Blitzing',
    'Holding game',
    'Bear-off',
    'Cube handling',
  ]) {
    const themeRow = page.locator('.theme-row', { hasText: theme }).first();
    await expect(themeRow).toBeVisible();
    await expect(themeRow.getByText(/\d+ puzzles?/)).toBeVisible();
    await expect(
      themeRow.getByRole('button', { name: `Drill ${theme}` }),
    ).toBeEnabled();
  }

  const mined = page.locator('.theme-row--blunder');
  await expect(mined.getByText('From your games')).toBeVisible();
  if (blunders > 0) {
    // Mining runs in the background off the stored analysis; give it time.
    await expect(mined.getByText(/^[1-9]\d* puzzles?$/)).toBeVisible({
      timeout: 120_000,
    });
    await expect(
      mined.getByRole('button', { name: 'Drill From your games' }),
    ).toBeEnabled();
  }
});
