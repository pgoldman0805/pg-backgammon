/**
 * PWA installability and offline capability (ticket 23). Runs against the
 * preview build like the other suites.
 *
 * The offline test runs its own vite preview server (port 4399) so it can
 * genuinely kill the network: once the server is closed, every request the
 * service worker does not answer from its precache fails with a connection
 * error — no reliance on CDP network emulation reaching service workers.
 */

import { expect, test } from '@playwright/test';
import { preview } from 'vite';
import { startComputerMatch } from './helpers';

const OFFLINE_PORT = 4399;

test('manifest is served, linked, and installable-complete', async ({
  page,
}) => {
  await page.goto('/');

  const link = page.locator('link[rel="manifest"]');
  await expect(link).toHaveAttribute('href', /.+/);
  const href = await link.getAttribute('href');

  const response = await page.request.get(href as string);
  expect(response.ok()).toBe(true);

  const manifest = (await response.json()) as {
    name: string;
    short_name: string;
    display: string;
    start_url: string;
    theme_color: string;
    background_color: string;
    icons: Array<{
      src: string;
      sizes: string;
      type: string;
      purpose?: string;
    }>;
  };
  expect(manifest.name).toBe('pg-backgammon');
  expect(manifest.short_name).toBe('Backgammon');
  expect(manifest.display).toBe('standalone');
  expect(manifest.start_url).toBe('/');
  expect(manifest.theme_color).toBe('#15130f');
  expect(manifest.background_color).toBe('#15130f');

  // Real PNG icons: 192, 512, and a maskable 512.
  const icon192 = manifest.icons.find((icon) => icon.sizes === '192x192');
  const icon512 = manifest.icons.find(
    (icon) => icon.sizes === '512x512' && icon.purpose !== 'maskable',
  );
  const maskable = manifest.icons.find(
    (icon) => icon.sizes === '512x512' && icon.purpose === 'maskable',
  );
  expect(icon192).toBeDefined();
  expect(icon512).toBeDefined();
  expect(maskable).toBeDefined();
  for (const icon of [icon192, icon512, maskable]) {
    expect(icon?.type).toBe('image/png');
    const iconResponse = await page.request.get(`/${icon?.src ?? ''}`);
    expect(iconResponse.ok()).toBe(true);
    expect(iconResponse.headers()['content-type']).toContain('image/png');
    // A PNG, not a renamed SVG: check the magic bytes.
    const body = await iconResponse.body();
    expect(body.subarray(1, 4).toString('ascii')).toBe('PNG');
  }
});

test('service worker activates; app shell and engine work fully offline', async ({
  page,
  context,
}) => {
  test.setTimeout(420_000);

  const server = await preview({
    preview: { port: OFFLINE_PORT, strictPort: true },
  });
  try {
    await page.goto(`http://localhost:${OFFLINE_PORT}/`);

    // The service worker registers, installs (precaching everything,
    // engine payload included), activates, and claims the page.
    await page.waitForFunction(
      () => navigator.serviceWorker.controller !== null,
      undefined,
      { timeout: 180_000 },
    );
    const swState = await page.evaluate(async () => {
      const registration = await navigator.serviceWorker.ready;
      return registration.active?.state;
    });
    expect(swState).toBe('activated');
  } finally {
    // Kill the network for real: nothing not in the SW cache can load now.
    if ('closeAllConnections' in server.httpServer) {
      server.httpServer.closeAllConnections();
    }
    await server.close();
  }
  await context.setOffline(true);

  // The app shell boots offline: reload lands on the Play setup card, and
  // the page is service-worker-controlled (nothing else could have served it).
  await page.reload();
  await expect(page.getByRole('button', { name: 'Play as White' })).toBeVisible(
    { timeout: 30_000 },
  );
  expect(
    await page.evaluate(() => navigator.serviceWorker.controller !== null),
  ).toBe(true);

  // The engine loads from the cache: start a match; the first actionable
  // board control only appears once the engine has answered the opening
  // roll, which needs gnubg.js + gnubg.wasm + gnubg.data (~3 MB) served
  // entirely by the service worker.
  await startComputerMatch(page, { difficulty: 'Beginner', length: '1 point' });
  const firstAction = page
    .getByRole('button', {
      name: /^(Move from|Roll$|Commit play|Play forced play|Continue$)/,
    })
    .first();
  await expect(firstAction).toBeVisible({ timeout: 180_000 });
  await expect(page.getByText('The engine failed to load.')).toHaveCount(0);
});
