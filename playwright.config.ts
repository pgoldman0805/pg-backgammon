/**
 * Playwright drives the real built app (vite preview) with the real WASM
 * engine — no fakes anywhere. Two projects:
 *
 * - `smoke` (npm run e2e): the golden-path test. Expect roughly 2-4 minutes:
 *   the engine payload loads (~5 MB), a full 1-point match is played, and the
 *   whole match is analyzed at 2-ply before the review renders.
 * - `audit` (npm run e2e:audit): the visual-audit screenshot harness for
 *   ticket 14; writes PNGs under .scratch/backgammon-platform/audit/.
 *
 * The webServer builds first, so `npm run e2e` is self-contained: it serves
 * dist with `vite preview` (ticket 23 pointed `npm run preview` at wrangler
 * dev, which rejects --strictPort). It does NOT reuse an existing server on
 * :4173 — with multiple worktrees sharing the port that would serve a stale
 * build and give false-green results — so free the port before running.
 */

import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: 'e2e',
  // Generous: WASM load plus a full match of 2-ply analysis on slow machines.
  timeout: 600_000,
  expect: { timeout: 15_000 },
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [['list']],
  use: {
    baseURL: 'http://localhost:4173',
    trace: 'retain-on-failure',
  },
  projects: [
    { name: 'smoke', testMatch: /golden-path\.spec\.ts/ },
    { name: 'audit', testMatch: /audit\.spec\.ts/ },
    // Ticket 23: installability + offline capability against the preview build.
    { name: 'pwa', testMatch: /pwa\.spec\.ts/ },
    // Remote play: two browser contexts over a room link; vite preview runs
    // the Worker and Durable Object through the Cloudflare plugin.
    { name: 'remote', testMatch: /remote\.spec\.ts/ },
    // Two-browser edge-case journeys at desktop and phone width; also writes
    // review screenshots under .scratch/remote-ui/.
    { name: 'journeys', testMatch: /remote-journeys\.spec\.ts/ },
  ],
  webServer: {
    command: 'npm run build && npx vite preview --port 4173 --strictPort',
    url: 'http://localhost:4173',
    // Never reuse a server already on :4173. With multiple git worktrees sharing
    // this fixed port, `true` would silently serve a *stale* build from another
    // worktree and produce false-green e2e results. `false` forces each run to
    // serve its own build (and fail loudly on a port clash, which is correct).
    reuseExistingServer: false,
    timeout: 240_000,
  },
});
