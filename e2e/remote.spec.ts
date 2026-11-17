/**
 * Remote play end to end: two browser contexts (separate localStorage, so
 * each holds its own seat) play a 1-point match over a room link, through
 * the real Worker and Durable Object that the Cloudflare Vite plugin runs
 * under `vite preview`. White creates the room from the setup card, Black
 * opens the invite link and joins, both play the board controls until the
 * match-over card shows on each side, and both Analyze ledgers then list the
 * finished online match. A third visitor to a two-player room is turned away.
 *
 * Expected runtime: about 1-2 minutes for the match (each side clicks the
 * first legal option through the relay), seconds for the full-room check.
 * No engine is needed to play; it still loads lazily for post-game analysis.
 */

import { type Browser, expect, type Page, test } from '@playwright/test';
import { playRemoteUntilMatchOver } from './helpers';

const WAITING = 'Waiting for your opponent to join';

/** White makes a 1-point online room; returns both pages and the invite link. */
async function openRoom(
  browser: Browser,
): Promise<{ white: Page; black: Page; link: string }> {
  const whiteCtx = await browser.newContext();
  const blackCtx = await browser.newContext();
  const white = await whiteCtx.newPage();
  const black = await blackCtx.newPage();

  await white.goto('/');
  await white.getByLabel('Match length').selectOption({ label: '1 point' });
  await white.getByRole('button', { name: 'Play a friend online' }).click();
  await expect(white).toHaveURL(/\/play\/[a-z2-7]{20}$/);
  const link = await white
    .getByRole('textbox', { name: 'Invite link' })
    .inputValue();
  return { white, black, link };
}

/** Black opens the invite link and takes the second seat. */
async function joinAsBlack(black: Page, link: string): Promise<void> {
  await black.goto(link);
  await black.getByRole('button', { name: 'Join as Black' }).click();
}

/**
 * How many finished remote matches this page's IndexedDB holds. The
 * persister's final write is debounced, so the ledger is opened only after
 * the row has landed.
 */
function finishedRemoteRows(page: Page): Promise<number> {
  return page.evaluate(
    () =>
      new Promise<number>((resolve) => {
        const open = indexedDB.open('pg-backgammon');
        open.onsuccess = () => {
          const db = open.result;
          // Any throw (a missing store, an unexpected row shape) resolves 0
          // so the poll fails fast instead of hanging on a promise that
          // never settles.
          try {
            const all = db
              .transaction('matches', 'readonly')
              .objectStore('matches')
              .getAll();
            all.onsuccess = () => {
              db.close();
              try {
                const rows = all.result as Array<{
                  status?: string;
                  config?: { mode?: string };
                }>;
                resolve(
                  rows.filter(
                    (row) =>
                      row.status === 'finished' &&
                      row.config?.mode === 'remote',
                  ).length,
                );
              } catch {
                resolve(0);
              }
            };
            all.onerror = () => {
              db.close();
              resolve(0);
            };
          } catch {
            db.close();
            resolve(0);
          }
        };
        open.onerror = () => resolve(0);
      }),
  );
}

test('two browsers play a 1-point match over a room link', async ({
  browser,
}) => {
  test.setTimeout(600_000);

  const { white, black, link } = await openRoom(browser);
  await expect(white.getByText(WAITING)).toBeVisible();
  await joinAsBlack(black, link);
  // The opening position is on both boards once White stops waiting.
  await expect(white.getByText(WAITING)).toBeHidden();

  await playRemoteUntilMatchOver(white, black);
  // Both boards agree on the result: the match-over title (winner and final
  // score) reads identically on each seat, and a 1-point match ends 1-0 or
  // better for the winner.
  const overTitle = (page: Page) =>
    page.locator('.setup-title', { hasText: /wins the match/ });
  await expect(overTitle(white)).toBeVisible();
  await expect(overTitle(black)).toBeVisible();
  const whiteResult = ((await overTitle(white).textContent()) ?? '').trim();
  const blackResult = ((await overTitle(black).textContent()) ?? '').trim();
  expect(whiteResult).toMatch(/^(White|Black) wins the match [1-9]\d*–0$/);
  expect(blackResult).toBe(whiteResult);

  // Both Analyze ledgers list the finished online match.
  for (const page of [white, black]) {
    await expect
      .poll(() => finishedRemoteRows(page), { timeout: 30_000 })
      .toBeGreaterThan(0);
    await page.goto('/analyze');
    await expect(
      page.locator('.match-row', { hasText: /1-point match online/ }).first(),
    ).toBeVisible();
  }
});

test('a third visitor sees the room is full', async ({ browser }) => {
  const { white, black, link } = await openRoom(browser);
  await joinAsBlack(black, link);
  await expect(white.getByText(WAITING)).toBeHidden();

  const third = await (await browser.newContext()).newPage();
  await third.goto(link);
  await expect(
    third.getByText('This game already has two players.'),
  ).toBeVisible();
});
