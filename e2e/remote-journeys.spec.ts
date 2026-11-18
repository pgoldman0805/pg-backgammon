/**
 * Remote play, two real browsers, edge by edge. Each journey opens two
 * isolated browser contexts (separate localStorage, so each holds its own
 * seat) against the real Worker and Durable Object, and walks the situations
 * a pair of players actually meets: creating and joining with names and a
 * move clock, whose turn it is, reloads, a full room, a cancelled invite or
 * game, a dropped opponent, a timeout forfeit, and a dead link.
 *
 * It also doubles as a UI review harness: every journey saves a screenshot
 * of each state under .scratch/remote-ui/<viewport>/ so layout, hierarchy and
 * phone reach can be judged by eye. Two viewports run: a desktop window and
 * a phone in portrait, where the move controls must stay on screen.
 *
 * Expected runtime: about 2 minutes (one journey waits out a 15 second move
 * clock).
 */

import { mkdirSync } from 'node:fs';
import { type Browser, expect, type Page, test } from '@playwright/test';

const SHOTS = '.scratch/remote-ui';

const VIEWPORTS = {
  desktop: { viewport: { width: 1280, height: 800 } },
  phone: {
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
  },
} as const;

type Kind = keyof typeof VIEWPORTS;

async function newPlayer(browser: Browser, kind: Kind): Promise<Page> {
  const ctx = await browser.newContext(VIEWPORTS[kind]);
  return ctx.newPage();
}

async function shot(page: Page, kind: Kind, name: string): Promise<void> {
  mkdirSync(`${SHOTS}/${kind}`, { recursive: true });
  await page.screenshot({
    path: `${SHOTS}/${kind}/${name}.png`,
    fullPage: true,
  });
}

/** Creator makes a room (name and clock chosen on the setup card). */
async function createRoom(
  page: Page,
  options: { name?: string; seconds?: string; length?: string } = {},
): Promise<string> {
  await page.goto('/');
  await page
    .getByLabel('Match length')
    .selectOption({ label: options.length ?? '1 point' });
  if (options.name) {
    await page.getByRole('textbox', { name: 'Your name' }).fill(options.name);
  }
  if (options.seconds !== undefined) {
    await page
      .getByRole('combobox', { name: 'Time per turn' })
      .selectOption(options.seconds);
  }
  await page.getByRole('button', { name: 'Play a friend online' }).click();
  await expect(page).toHaveURL(/\/play\/[a-z2-7]{20}$/);
  return page.getByRole('textbox', { name: 'Invite link' }).inputValue();
}

async function join(page: Page, link: string, name?: string): Promise<void> {
  await page.goto(link);
  if (name) {
    await page.getByRole('textbox', { name: 'Your name' }).fill(name);
  }
  await page.getByRole('button', { name: 'Join as Black' }).click();
}

const mine = (page: Page) => page.getByText('Your turn', { exact: true });

/** The page whose turn it is, once the game has started. */
async function mover(a: Page, b: Page): Promise<[Page, Page]> {
  await expect(async () => {
    expect((await mine(a).count()) + (await mine(b).count())).toBe(1);
  }).toPass({ timeout: 15_000 });
  return (await mine(a).count()) === 1 ? [a, b] : [b, a];
}

/** Play the mover's whole turn: roll if asked, move until commit, commit. */
async function playTurn(page: Page): Promise<void> {
  for (let i = 0; i < 40; i += 1) {
    if (!(await mine(page).count())) {
      return;
    }
    const commit = page.getByRole('button', { name: 'Commit play' });
    if (await commit.isEnabled().catch(() => false)) {
      await commit.click();
      return;
    }
    const roll = page.getByRole('button', { name: /^Roll/ });
    if (await roll.isVisible().catch(() => false)) {
      await roll.click();
      continue;
    }
    const dest = page
      .getByRole('button', { name: /^(Move to point|Bear off)/ })
      .first();
    if (await dest.isVisible().catch(() => false)) {
      await dest.press('Enter');
      continue;
    }
    const origin = page.getByRole('button', { name: /^Move from/ }).first();
    if (await origin.isVisible().catch(() => false)) {
      await origin.press('Enter');
      continue;
    }
    await page.waitForTimeout(100);
  }
}

async function inViewport(page: Page, name: string | RegExp): Promise<boolean> {
  const box = await page.getByRole('button', { name }).first().boundingBox();
  const size = page.viewportSize();
  return !!box && !!size && box.y >= 0 && box.y + box.height <= size.height;
}

for (const kind of Object.keys(VIEWPORTS) as Kind[]) {
  test.describe(`remote journeys (${kind})`, () => {
    test('create, invite, join with names, take turns', async ({ browser }) => {
      const white = await newPlayer(browser, kind);
      const black = await newPlayer(browser, kind);

      await white.goto('/');
      await shot(white, kind, '01-setup-card');
      const link = await createRoom(white, {
        name: 'Alice',
        seconds: '60',
      });
      await expect(white.getByText('Invite your opponent')).toBeVisible();
      await shot(white, kind, '02-invite-waiting');

      await black.goto(link);
      await expect(black.getByText('Alice invited you.')).toBeVisible();
      await expect(
        black.getByText('1-point match, 1 minute per turn'),
      ).toBeVisible();
      await shot(black, kind, '03-join-panel');
      await black.getByRole('textbox', { name: 'Your name' }).fill('Bob');
      await black.getByRole('button', { name: 'Join as Black' }).click();

      await expect(white.locator('.chip-name').nth(1)).toHaveText('Bob');
      await expect(black.locator('.chip-name').first()).toHaveText('Alice');

      const [first, second] = await mover(white, black);
      await expect(second.getByText(/^Waiting for (Alice|Bob)$/)).toBeVisible();
      // Only the player on the move sees a countdown.
      await expect(first.getByRole('timer')).toBeVisible();
      await expect(second.getByRole('timer')).toHaveCount(0);
      await shot(white, kind, '04-game-white');
      await shot(black, kind, '04-game-black');

      // Phones: the move controls are reachable without scrolling.
      if (kind === 'phone') {
        expect(await inViewport(first, 'Undo')).toBe(true);
        expect(await inViewport(first, 'Commit play')).toBe(true);
      }

      await playTurn(first);
      await expect(mine(second)).toBeVisible({ timeout: 15_000 });
      await shot(second, kind, '05-after-first-turn');
    });

    test('a reload keeps the seat and the position', async ({ browser }) => {
      const white = await newPlayer(browser, kind);
      const black = await newPlayer(browser, kind);
      const link = await createRoom(white, { name: 'Alice' });
      await join(black, link, 'Bob');
      const [first, second] = await mover(white, black);
      await first.reload();
      await expect(mine(first)).toBeVisible({ timeout: 15_000 });
      await second.reload();
      await expect(second.getByText(/^Waiting for/)).toBeVisible({
        timeout: 15_000,
      });
      await shot(first, kind, '06-after-reload');
    });

    test('a third visitor is turned away from a full room', async ({
      browser,
    }) => {
      const white = await newPlayer(browser, kind);
      const black = await newPlayer(browser, kind);
      const third = await newPlayer(browser, kind);
      const link = await createRoom(white);
      await join(black, link);
      await mover(white, black);
      await third.goto(link);
      await expect(
        third.getByText('This game already has two players.'),
      ).toBeVisible();
      await shot(third, kind, '07-full-room');
    });

    test('the host cancels an invite nobody has taken', async ({ browser }) => {
      const white = await newPlayer(browser, kind);
      const black = await newPlayer(browser, kind);
      const link = await createRoom(white);
      await white.goto('/');
      await expect(white.getByText('Your online games')).toBeVisible();
      await shot(white, kind, '08-games-list-waiting');
      await white.getByRole('button', { name: 'Cancel game' }).click();
      await shot(white, kind, '09-cancel-confirm');
      await white.getByRole('button', { name: 'Yes, cancel it' }).click();
      await expect(white.getByText('Your online games')).toHaveCount(0);
      await black.goto(link);
      await expect(black.getByText('This game has ended.')).toBeVisible();
      await shot(black, kind, '10-cancelled-invite');
    });

    test('cancelling mid-game tells the opponent and clears both lists', async ({
      browser,
    }) => {
      const white = await newPlayer(browser, kind);
      const black = await newPlayer(browser, kind);
      const link = await createRoom(white, { name: 'Alice' });
      await join(black, link, 'Bob');
      await mover(white, black);

      await white.goto('/');
      await expect(white.getByText('Your online games')).toBeVisible();
      await shot(white, kind, '11-games-list-playing');
      await white.getByRole('button', { name: 'Cancel game' }).click();
      await white.getByRole('button', { name: 'Yes, cancel it' }).click();
      await expect(white.getByText('Your online games')).toHaveCount(0);

      await expect(black.getByText('Alice cancelled the game.')).toBeVisible({
        timeout: 15_000,
      });
      await shot(black, kind, '12-opponent-cancelled');
      await black.getByRole('button', { name: 'Leave game' }).click();
      await expect(black).toHaveURL('/');
      // Leaving forgets the seat, so the finished game is not listed again.
      await expect(black.getByText('Your online games')).toHaveCount(0);
      await shot(black, kind, '13-after-leaving');
    });

    test('a dropped opponent can be abandoned', async ({ browser }) => {
      const white = await newPlayer(browser, kind);
      const black = await newPlayer(browser, kind);
      const link = await createRoom(white, { name: 'Alice', seconds: '0' });
      await join(black, link, 'Bob');
      await mover(white, black);
      // Closing the page drops its socket (an offline switch would not).
      await black.close();
      await expect(white.getByText('Opponent disconnected')).toBeVisible({
        timeout: 60_000,
      });
      await shot(white, kind, '14-opponent-disconnected');
      await white.getByRole('button', { name: 'Abandon game' }).click();
      await expect(white).toHaveURL('/');
    });

    test('a bad or dead link says so', async ({ browser }) => {
      const page = await newPlayer(browser, kind);
      await page.goto('/play/aaaaaaaaaaaaaaaaaaaa');
      await expect(page.getByText('This game has ended.')).toBeVisible();
      await shot(page, kind, '15-dead-link');
      await page.goto('/play/not-a-room');
      await shot(page, kind, '16-malformed-link');
    });
  });
}

test.describe('move clock (desktop)', () => {
  test('running out of time forfeits and tells both players', async ({
    browser,
  }) => {
    test.setTimeout(120_000);
    const white = await newPlayer(browser, 'desktop');
    const black = await newPlayer(browser, 'desktop');
    const link = await createRoom(white, { name: 'Alice', seconds: '15' });
    await join(black, link, 'Bob');
    const [first, second] = await mover(white, black);
    await expect(first.getByRole('timer')).toBeVisible();
    await shot(first, 'desktop', '17-clock-running');
    await expect(first.getByText('You ran out of time.')).toBeVisible({
      timeout: 40_000,
    });
    await expect(second.getByText(/ran out of time\. You win\./)).toBeVisible({
      timeout: 15_000,
    });
    await shot(first, 'desktop', '18-timeout-loser');
    await shot(second, 'desktop', '19-timeout-winner');
  });
});
