# 43: Code-splitting

**What to build:** Visitors download only what the screen they open needs. Routes load lazily and the large curated puzzle set is fetched only when Puzzles is opened, so a player who only wants to Play doesn't download the whole puzzle library up front. Offline still works (the service worker precache covers the split chunks).

**Blocked by:** None (can start immediately).

**Status:** ready-for-agent

- [x] The initial Play load no longer includes the curated puzzle data or non-Play page code
- [x] Each area loads on navigation without a jarring delay; the app still works fully offline after first load
- [x] Total transfer for a Play-only session is measurably smaller than today (record before/after)
- [x] Full gauntlet green, including e2e:pwa

## Comments

**What was split.** The routed areas now sit behind one `<Suspense>` boundary
in `src/App.tsx`. Play is the landing route (`/`) and stays in the entry
chunk so the first screen paints with no second round-trip; the other five
areas — Analyze, Puzzles, Progress, Settings, Learn — are each loaded with
`React.lazy(() => import('./pages/X'))`, so an area's code is fetched only the
first time its route is opened. The ~1.3 MB curated puzzle set
(`src/puzzles/curatedSet.ts`, pulled in via `bundledSet.ts`) is statically
imported only by the Puzzles page, so route-splitting Puzzles moves that data
out of the initial load and into the on-demand `Puzzles` chunk. `App.tsx` now
imports `useBlunderMining` from its leaf module (`./puzzles/useBlunderMining`)
rather than the `./puzzles` barrel, so the barrel's re-export of the curated
set and the generator can't drag that data back into the entry chunk. A small
`RouteFallback` ("Loading…", `role="status"`) renders in the app shell while a
chunk is in flight.

**Before / after (production build, `npm run build`).**

| | Before (one bundle) | After (Play path) |
|---|---|---|
| Initial JS (entry + modulepreloads) | 1,044.75 kB raw / 204.27 kB gzip | 383.39 kB raw / 124.08 kB gzip |
| Initial CSS | 55.40 kB raw / 10.75 kB gzip | 30.38 kB raw / 7.17 kB gzip |
| **Initial transfer (JS+CSS)** | **1,100.15 kB / 215.02 kB gzip** | **413.77 kB / 131.25 kB gzip** |

Play-path JS drops **-63 % raw / -39 % gzip**; total initial transfer drops
**-62 % raw / -39 % gzip**. The curated data now rides only in the lazy
`Puzzles-*.js` chunk (613.18 kB / 68.93 kB gzip), fetched on navigation to
`/puzzles`. Confirmed the entry chunk carries none of the puzzle *data*
(curated `moveText` data rows: entry chunk 7 code references vs Puzzles chunk
2,451). Analyze (20 kB), Progress (11 kB), Learn (10 kB), Settings (7 kB) are
likewise out of the initial load. (The ~2 MB engine WASM/data was already
code-split and loads only when a match starts — unchanged.)

**How offline stays intact.** `vite-plugin-pwa`'s Workbox precache globs every
emitted asset (`**/*.{js,css,html,svg,png,wasm,data}`), so it automatically
picks up all the new lazy chunks — precache grew from 13 to 29 entries. The
offline test log shows the service worker precaching `Puzzles-*.js`,
`Analyze-*.js`, `Progress-*.js`, `Learn-*.js`, `Settings-*.js` and their CSS,
so every area is available offline after first load. No `vite.config.ts` PWA
changes were needed beyond a raised Vitest `testTimeout` (unit tests only).

**Verification (all foreground).** `npm test` 927 passed; `npm run lint`
clean; `npm run build` green; `npm run e2e` 2 passed; `npm run e2e:audit` 1
passed (every area, both themes, desktop→phone); `npm run e2e:pwa` 2 passed
(app shell + engine fully offline after first load).

**Test notes.** Lazy routes render asynchronously, so `App.test.tsx` /
`Settings.test.tsx` navigation assertions now `await` their headings
(`findBy`), and `src/test/setup.ts` raises testing-library's `asyncUtilTimeout`
(with matching `testTimeout` in `vite.config.ts`) to give the on-demand chunk
transform head-room under Vitest's parallel workers. A focused
`src/App.codeSplitting.test.tsx` asserts the Puzzles area renders behind the
Suspense fallback. The storage polyfill in `src/test/setup.ts` was kept.
