/**
 * The ticket-14 visual-audit harness (npm run e2e:audit): walks every area of
 * the real built app into its interesting states and screenshots each one at
 * desktop (1280px) and tablet (820px) width in both themes, writing the set
 * to .scratch/backgammon-platform/audit/. At every captured state it also
 * asserts there is no horizontal scroll, so the audit doubles as the
 * no-horizontal-scroll-at-tablet-width check.
 *
 * Progress needs history to plot, so a dozen finished, analyzed matches are
 * seeded through the app's own IndexedDB schema before anything is played.
 * The review, mined-puzzle and mid-game states come from really playing the
 * engine, exactly like the golden-path smoke.
 */

import { mkdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { expect, type Page, test } from '@playwright/test';
import { moveOnce, playUntilMatchOver, startComputerMatch } from './helpers';

const AUDIT_DIR = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../.scratch/backgammon-platform/audit',
);

const SIZES = [
  { tag: 'desktop', width: 1280, height: 800 },
  { tag: 'tablet', width: 820, height: 1180 },
] as const;

const THEMES = ['light', 'dark'] as const;

async function ensureTheme(
  page: Page,
  theme: (typeof THEMES)[number],
): Promise<void> {
  const current = await page.evaluate(() =>
    document.documentElement.getAttribute('data-theme'),
  );
  if (current !== theme) {
    await page.locator('.theme-toggle').click();
  }
}

/**
 * Screenshot the current state in all four width x theme combinations and
 * assert the page never scrolls horizontally. Restores 1280px light.
 */
async function shoot(page: Page, name: string): Promise<void> {
  for (const size of SIZES) {
    await page.setViewportSize({ width: size.width, height: size.height });
    for (const theme of THEMES) {
      await ensureTheme(page, theme);
      await page.waitForTimeout(150);
      const overflow = await page.evaluate(() => {
        const root = document.documentElement;
        return root.scrollWidth - root.clientWidth;
      });
      expect
        .soft(overflow, `${name} at ${size.tag} ${theme}: horizontal overflow`)
        .toBeLessThanOrEqual(0);
      await page.screenshot({
        path: path.join(AUDIT_DIR, `${name}-${size.tag}-${theme}.png`),
        fullPage: true,
      });
    }
  }
  await ensureTheme(page, 'light');
  await page.setViewportSize({ width: 1280, height: 800 });
}

/* ------------------------------------------------------------------ */
/* Seeded history: finished analyzed matches so Progress has a story    */
/* ------------------------------------------------------------------ */

function summaryOf(decisions: number, equityLost: number, blunders: number) {
  return {
    decisions,
    equityLost,
    errorRate: decisions === 0 ? 0 : equityLost / decisions,
    blunders,
    errors: Math.max(0, blunders - 1),
    dubious: 2,
  };
}

function seededRow(
  index: number,
  args: {
    daysAgo: number;
    decisions: number;
    equityLost: number;
    blunders: number;
    difficulty: string;
    tutorGame?: boolean;
  },
) {
  const emptyBoard = {
    points: Array.from({ length: 25 }, () => 0),
    bar: { white: 0, black: 0 },
    off: { white: 0, black: 0 },
  };
  const game = (tutorAssisted: boolean) => ({
    game: {
      initialBoard: emptyBoard,
      openingRolls: [],
      firstPlayer: 'white',
      plays: [],
    },
    decisions: [],
    crawford: false,
    tutorAssisted,
    result: { winner: 'white', end: 'checkers', kind: 'single', points: 1 },
  });
  const games = args.tutorGame
    ? [game(false), game(true), game(false)]
    : [game(false), game(false)];
  const counted = games.filter((g) => !g.tutorAssisted).length;
  const perGame = {
    decisions: Math.round(args.decisions / counted),
    equityLost: args.equityLost / counted,
    blunders: 0,
  };
  const quiet = summaryOf(0, 0, 0);
  const when = Date.now() - args.daysAgo * 86_400_000;
  return {
    id: `audit-seed-${index}`,
    config: { length: 7, mode: 'computer', difficulty: args.difficulty },
    status: 'finished',
    createdAt: when - 3_600_000,
    updatedAt: when,
    record: { length: 7, games },
    score: { white: 7, black: 3 },
    winner: 'white',
    state: null,
    analysis: {
      format: 1,
      analyzedAt: when,
      games: games.map((g, i) => ({
        decisions: [],
        white: g.tutorAssisted
          ? quiet
          : summaryOf(
              perGame.decisions,
              perGame.equityLost,
              i === 0 ? args.blunders : 0,
            ),
        black: quiet,
      })),
      white: summaryOf(args.decisions, args.equityLost, args.blunders),
      black: quiet,
    },
  };
}

const SEEDED_HISTORY = [
  seededRow(1, {
    daysAgo: 88,
    decisions: 52,
    equityLost: 1.14,
    blunders: 5,
    difficulty: 'beginner',
  }),
  seededRow(2, {
    daysAgo: 74,
    decisions: 48,
    equityLost: 0.86,
    blunders: 4,
    difficulty: 'beginner',
  }),
  seededRow(3, {
    daysAgo: 61,
    decisions: 55,
    equityLost: 0.94,
    blunders: 3,
    difficulty: 'casual',
  }),
  seededRow(4, {
    daysAgo: 49,
    decisions: 44,
    equityLost: 0.62,
    blunders: 2,
    difficulty: 'casual',
  }),
  seededRow(5, {
    daysAgo: 38,
    decisions: 60,
    equityLost: 0.78,
    blunders: 3,
    difficulty: 'casual',
    tutorGame: true,
  }),
  seededRow(6, {
    daysAgo: 30,
    decisions: 47,
    equityLost: 0.47,
    blunders: 1,
    difficulty: 'intermediate',
  }),
  seededRow(7, {
    daysAgo: 22,
    decisions: 51,
    equityLost: 0.56,
    blunders: 2,
    difficulty: 'intermediate',
  }),
  seededRow(8, {
    daysAgo: 15,
    decisions: 58,
    equityLost: 0.41,
    blunders: 1,
    difficulty: 'intermediate',
    tutorGame: true,
  }),
  seededRow(9, {
    daysAgo: 8,
    decisions: 46,
    equityLost: 0.32,
    blunders: 0,
    difficulty: 'expert',
  }),
  seededRow(10, {
    daysAgo: 3,
    decisions: 49,
    equityLost: 0.37,
    blunders: 1,
    difficulty: 'expert',
  }),
];

async function seedHistory(page: Page): Promise<void> {
  await page.evaluate(async (rows) => {
    await new Promise<void>((resolve, reject) => {
      // No explicit version: adopt whatever schema the app created (the app
      // has already opened the database by the time seeding runs), so the
      // harness survives app-side schema bumps.
      const open = indexedDB.open('pg-backgammon');
      open.onupgradeneeded = () => {
        for (const store of ['matches', 'puzzle-progress', 'blunder-puzzles']) {
          if (!open.result.objectStoreNames.contains(store)) {
            open.result.createObjectStore(store, { keyPath: 'id' });
          }
        }
      };
      open.onsuccess = () => {
        const db = open.result;
        const tx = db.transaction('matches', 'readwrite');
        for (const row of rows) {
          tx.objectStore('matches').put(row);
        }
        tx.oncomplete = () => {
          db.close();
          resolve();
        };
        tx.onerror = () => {
          db.close();
          reject(tx.error);
        };
      };
      open.onerror = () => reject(open.error);
    });
  }, SEEDED_HISTORY);
}

/* ------------------------------------------------------------------ */
/* The walk                                                             */
/* ------------------------------------------------------------------ */

test('visual audit: every area, both themes, desktop and tablet', async ({
  page,
}) => {
  test.setTimeout(900_000);
  mkdirSync(AUDIT_DIR, { recursive: true });

  // --- Play setup card (fresh app) ---------------------------------------
  await page.goto('/');
  await expect(
    page.getByRole('button', { name: 'Play as White' }),
  ).toBeVisible();
  await shoot(page, 'play-setup');

  await seedHistory(page);

  // --- A real 1-point match, played to the end (feeds Analyze/Puzzles) ---
  await startComputerMatch(page, { difficulty: 'Beginner', length: '1 point' });
  await playUntilMatchOver(page);
  await shoot(page, 'play-match-over');

  // Wait for the finished row to land before leaving the page.
  await expect
    .poll(
      () =>
        page.evaluate(
          () =>
            new Promise<number>((resolve) => {
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
                    (
                      all.result as Array<{ status: string; id: string }>
                    ).filter(
                      (row) =>
                        row.status === 'finished' &&
                        !row.id.startsWith('audit-seed-'),
                    ).length,
                  );
                };
                all.onerror = () => {
                  db.close();
                  resolve(0);
                };
              };
              open.onerror = () => resolve(0);
            }),
        ),
      { timeout: 30_000 },
    )
    .toBeGreaterThan(0);

  // --- Mid-game with the Tutor strip --------------------------------------
  await page.getByRole('button', { name: 'New match' }).click();
  await page.getByRole('switch', { name: 'Tutor mode' }).click();
  await expect(page.locator('.eval-bar')).toBeVisible({ timeout: 60_000 });
  const midGameDeadline = Date.now() + 60_000;
  while (Date.now() < midGameDeadline) {
    if (await moveOnce(page)) {
      break;
    }
    await page.waitForTimeout(250);
  }
  await expect(page.locator('.eval-caption')).not.toHaveText(/…/, {
    timeout: 60_000,
  });
  await shoot(page, 'play-midgame-tutor');

  // --- Board styles (ticket 19): the picker, then every style mid-game ----
  // Reach a fresh White turn (both dice unused) so a selected origin can show
  // the solid and the dashed two-movement destination highlights at once.
  const freshTurnDeadline = Date.now() + 120_000;
  while (Date.now() < freshTurnDeadline) {
    const dice = await page.locator('.die').count();
    const used = await page.locator('.die--used').count();
    const origin = page.getByRole('button', { name: /^Move from/ }).first();
    if (
      dice >= 2 &&
      used === 0 &&
      (await origin.isVisible().catch(() => false))
    ) {
      break;
    }
    let clicked = false;
    for (const name of [
      'Take',
      'Accept',
      'Next game',
      'New match',
      'Continue',
      'Roll',
    ] as const) {
      const button = page.getByRole('button', { name, exact: true });
      if (await button.isVisible().catch(() => false)) {
        await button.click({ timeout: 2_000 }).catch(() => {});
        clicked = true;
        break;
      }
    }
    if (clicked) {
      continue;
    }
    const commit = page.getByRole('button', { name: 'Commit play' });
    if (await commit.isEnabled({ timeout: 250 }).catch(() => false)) {
      await commit.click({ timeout: 2_000 }).catch(() => {});
      continue;
    }
    if (!(await moveOnce(page))) {
      await page.waitForTimeout(250);
    }
  }

  // Select the origin showing the most destinations (prefer one with a
  // dashed two-movement target) — the readability bar every style must hold.
  const styleOrigins = page.getByRole('button', { name: /^Move from/ });
  const originCount = await styleOrigins.count();
  let bestOrigin = 0;
  let bestScore = -1;
  for (let i = 0; i < originCount; i++) {
    await styleOrigins.nth(i).press('Enter');
    await page.waitForTimeout(100);
    const score =
      (await page.locator('.dest--two').count()) * 10 +
      (await page.locator('.dest').count());
    if (score > bestScore) {
      bestScore = score;
      bestOrigin = i;
    }
    await styleOrigins.nth(i).press('Enter');
    await page.waitForTimeout(50);
  }
  await styleOrigins.nth(bestOrigin).press('Enter');
  await expect(page.locator('.dest').first()).toBeVisible();

  // The picker, open in the HUD's settings cluster.
  await page.getByRole('button', { name: 'Board style' }).click();
  await expect(page.getByRole('radio', { name: 'Classic' })).toBeVisible();
  await shoot(page, 'board-style-picker');

  // Every non-default style at both widths and themes; selection applies
  // instantly through the real picker.
  const GEOGRAPHIC_STYLES = [
    { id: 'aegean', name: 'Aegean' },
    { id: 'bosphorus', name: 'Bosphorus' },
    { id: 'marrakech', name: 'Marrakech' },
    { id: 'kyoto', name: 'Kyoto' },
    { id: 'reykjavik', name: 'Reykjavík' },
  ] as const;
  for (const style of GEOGRAPHIC_STYLES) {
    await page.getByRole('radio', { name: style.name }).click();
    await expect(page.locator('html')).toHaveAttribute(
      'data-board-style',
      style.id,
    );
    await shoot(page, `board-style-${style.id}`);
  }

  // Back to the default for the rest of the audit.
  await page.getByRole('radio', { name: 'Classic' }).click();
  await expect(page.locator('html')).not.toHaveAttribute('data-board-style');
  await page.getByRole('button', { name: 'Board style' }).click();

  // --- The cube dialog (hot-seat: both sides are ours to drive) ----------
  await page.reload();
  await page.getByLabel('Match length').selectOption({ label: '3 points' });
  await page.getByRole('button', { name: 'Hot-seat match' }).click();
  const doubleDeadline = Date.now() + 90_000;
  while (Date.now() < doubleDeadline) {
    const dbl = page.getByRole('button', { name: /^Double to/ });
    if (await dbl.isVisible().catch(() => false)) {
      await dbl.click();
      break;
    }
    const commit = page.getByRole('button', { name: 'Commit play' });
    if (await commit.isEnabled({ timeout: 250 }).catch(() => false)) {
      await commit.click({ timeout: 2_000 }).catch(() => {});
      continue;
    }
    const dance = page.getByRole('button', { name: 'Continue', exact: true });
    if (await dance.isVisible().catch(() => false)) {
      await dance.click({ timeout: 2_000 }).catch(() => {});
      continue;
    }
    if (!(await moveOnce(page))) {
      await page.waitForTimeout(250);
    }
  }
  await expect(page.getByText(/doubles to 2/).first()).toBeVisible();
  await expect(page.getByRole('button', { name: 'Take' })).toBeVisible();
  await shoot(page, 'play-cube-dialog');

  // --- Analyze: ledger, review, position viewer ---------------------------
  await page.getByRole('link', { name: 'Analyze' }).click();
  await expect(page.locator('.match-row').first()).toBeVisible();
  await shoot(page, 'analyze-ledger');

  await page
    .locator('.match-row', { hasText: /wins \d+–\d+/ })
    .first()
    .getByRole('button', { name: 'Open', exact: true })
    .click();
  await expect(
    page.getByRole('group', { name: 'White error rate' }),
  ).toBeVisible({ timeout: 480_000 });
  await expect(
    page.getByRole('figure', { name: 'Review position' }),
  ).toBeVisible();
  await shoot(page, 'analyze-review');

  await page.getByRole('button', { name: 'Back to history' }).click();
  await page
    .getByLabel('Paste an XGID')
    .fill('XGID=-b----E-C---eE---c-e----B-:0:0:1:31:0:0:0:7:10');
  await page.getByRole('button', { name: 'Load position' }).click();
  await expect(
    page.getByRole('figure', { name: 'Pasted position' }),
  ).toBeVisible();
  await shoot(page, 'analyze-viewer');

  // --- Puzzles: browse, drill, the equity-table reveal --------------------
  await page.getByRole('link', { name: 'Puzzles' }).click();
  await expect(
    page.getByRole('button', { name: 'Drill Priming' }),
  ).toBeVisible();
  await shoot(page, 'puzzles-browse');

  await page.getByRole('button', { name: 'Drill Priming' }).click();
  await expect(page.locator('.puzzle-prompt')).toBeVisible();
  await shoot(page, 'puzzles-drill');

  const submit = page.getByRole('button', { name: 'Submit play' });
  if (await submit.isVisible().catch(() => false)) {
    const answerDeadline = Date.now() + 30_000;
    while (
      Date.now() < answerDeadline &&
      !(await submit.isEnabled().catch(() => false))
    ) {
      if (!(await moveOnce(page))) {
        await page.waitForTimeout(100);
      }
    }
    await submit.click();
  } else {
    await page
      .getByRole('button', { name: /^(Double|No double — roll|Take|Pass)$/ })
      .first()
      .click();
  }
  await expect(page.getByRole('table', { name: 'Equity table' })).toBeVisible();
  await shoot(page, 'puzzles-equity-table');

  // --- Progress: charts over the seeded history ---------------------------
  await page.getByRole('link', { name: 'Progress' }).click();
  await expect(page.getByText('Error rate per match')).toBeVisible();
  await shoot(page, 'progress');

  // One extra: a pinned tooltip, desktop light only.
  await page
    .locator('.chart-plot')
    .first()
    .locator('.chart-hit')
    .nth(5)
    .click();
  await expect(page.locator('.chart-tooltip')).toBeVisible();
  await page.screenshot({
    path: path.join(AUDIT_DIR, 'progress-tooltip-desktop-light.png'),
    fullPage: true,
  });
});
