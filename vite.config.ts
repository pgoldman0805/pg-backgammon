import { cloudflare } from '@cloudflare/vite-plugin';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import { defineConfig } from 'vitest/config';

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    // Ticket 23 (ADR-0003): the installable, offline-capable PWA. Build-only:
    // devOptions stays off, so `npm run dev` never registers a service worker
    // and the virtual register module is a no-op in dev.
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'pg-backgammon',
        short_name: 'Backgammon',
        description:
          'Backgammon training: play vs computer, analyze, drill puzzles.',
        display: 'standalone',
        start_url: '/',
        // The dark shell's background (src/index.css --bg dark): the status
        // bar and splash match the brand mark in both app themes.
        theme_color: '#15130f',
        background_color: '#15130f',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
          {
            src: 'icon-maskable-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      // The glob below already precaches every PNG; avoid duplicate entries.
      includeManifestIcons: false,
      workbox: {
        // Precache the whole app, engine payload included: gnubg.data and
        // gnubg.wasm live in public/engine and land in dist as .data/.wasm.
        globPatterns: ['**/*.{js,css,html,svg,png,wasm,data}'],
        // gnubg.data (~2 MB) brushes workbox's 2 MiB per-file default; give
        // the engine payload and the main bundle room to grow.
        maximumFileSizeToCacheInBytes: 4 * 1024 * 1024,
        // SPA routes (/analyze, /puzzles, ...) all resolve to the shell.
        navigateFallback: 'index.html',
      },
    }),
    cloudflare(),
  ],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    // Agent worktrees live under .claude/worktrees and must not be swept into this run
    include: ['src/**/*.test.{ts,tsx}'],
    // Ticket 43: route-split areas resolve a dynamic import on first navigation;
    // the on-demand chunk transform can be slow under parallel workers, so the
    // raised findBy timeout (src/test/setup.ts) needs matching head-room here.
    testTimeout: 30_000,
  },
});
