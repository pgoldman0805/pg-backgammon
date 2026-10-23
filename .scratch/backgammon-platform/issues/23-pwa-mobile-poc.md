# 23: PWA — the mobile app

**What to build:** The app as an installable, offline-capable PWA (spec story 56, ADR-0003): the phone's delivery path and the mobile-POC dev loop.

- Web app manifest: name "pg-backgammon", short_name, standalone display, theme/background colors matching both app themes sensibly, and real PNG icons (192, 512, plus a maskable variant) generated from the app's mark — commit the generation script, not just the artifacts.
- Service worker via `vite-plugin-pwa` (or equivalent): precache the full app INCLUDING the engine payload (`public/engine/*` — note gnubg.data is ~2MB, above workbox's default 2MB per-file cap; raise it), auto-update registration (new deploy → phone picks it up on next launch without user action), and a sane offline fallback. The app must fully work offline after first load: play, analyze, puzzles.
- Dev ergonomics: the service worker must not poison local development (`npm run dev` unaffected; preview/e2e still work — the existing Playwright suites must stay green; if the SW interferes with audit determinism, scope it out of the test environment deliberately and document).
- Installability verified: Lighthouse-style checks or Playwright assertions that the manifest and SW register on the preview build.
- Do NOT deploy — the coordinator handles Cloudflare deployment and device install after merge.

**Blocked by:** None (ticket 22 is worked inline in the main session on non-overlapping surfaces: `android/`, machine toolchain).

**Status:** ready-for-agent

- [ ] App installable from a served build (manifest + icons + SW registered); auto-update on new deploy
- [ ] Fully offline after first load, engine included (verify by intercepting/blocking network in a Playwright check against preview)
- [ ] `npm run dev`, `npm test`, lint, build, `npm run e2e`, `npm run e2e:audit` all pass
- [ ] Icon generation scripted and committed
