# 26: Durable storage and save-failure visibility

**What to build:** The player's matches and puzzle progress survive weeks of not opening the app, and the player is warned the moment their data stops being saved. On startup the app asks the browser to persist its storage; Settings shows how much space the app is using and whether storage is persisted; if a save fails (e.g. storage full), a non-blocking banner tells the player their progress isn't being saved and offers an immediate backup export.

**Blocked by:** None (can start immediately).

**Status:** ready-for-agent

- [x] Persistent storage is requested at startup; its granted/denied state and a storage-usage figure are visible in Settings
- [x] A simulated write failure surfaces a non-blocking "progress isn't being saved — export now" banner with a working export action
- [x] Normal play is unaffected when storage is healthy: no banner, no extra prompts
- [x] Full gauntlet green (`npm test`, lint, build, e2e, e2e:audit, e2e:pwa)

## Comments

**Real bug vs not.** All three claims were real and reproduced with a failing test first:

- Finding #3 (swallowed write failures) was a genuine bug. `persist.ts`'s `save()` caught every `put` rejection and only re-flagged `dirty` — no signal escaped, so a `QuotaExceededError` left play going in memory while nothing persisted and nothing warned. A red test (`persist.test.ts` > "reports a save failure, then recovery, through save health") proved the silence; fixed by reporting each write outcome to a save-health monitor.
- Finding #1 (no `navigator.storage.persist()`, no `estimate()` in Settings) was real — neither call existed anywhere. Added both.

**What changed (all 100% client-side; no backend):**

- `src/storage/persistentStorage.ts` (new): `requestPersistentStorage()`, `persistedState()`, `estimateStorage()` — thin StorageManager wrappers that degrade to `'unsupported'`/`null` where the API is absent and never throw.
- `src/main.tsx`: calls `requestPersistentStorage()` once on app init (fire-and-forget, after `registerPwa()`).
- `src/storage/saveHealth.ts` (new): a tiny observable `SaveHealthMonitor` (module singleton) the persister reports write outcomes to and the banner subscribes to. A singleton because the persister is torn down when Play unmounts, but the warning must outlive navigation.
- `src/storage/persist.ts`: `MatchPersisterOptions.saveHealth?` added; `save()` now calls `reportSuccess()`/`reportFailure()`. Pure-observer contract preserved; still never breaks play.
- `src/storage/useMatchPersistence.ts`: wires the persister to the app-wide monitor.
- `src/ui/StorageStatus.tsx` + `storageStatus.css` (new): the Settings "Durable storage" row — On/Off/Unavailable badge (green/rust/muted, matching the app's gold-good/rust-cost semantics) plus a "Space used" figure and slim meter. Rendered in Settings' Data section.
- `src/ui/SaveFailureBanner.tsx` + `saveFailureBanner.css` (new): a non-blocking, rust-toned `role="alert"` strip under the header, app-wide. Its "Export backup" action reuses the existing `exportBackup`/`serializeBackup` (ticket 27 owns backup.ts/BackupControls.tsx restore flow — not touched; only a local blob-download glue here). Clears itself once a write lands.
- `src/ui/format.ts`: added `formatBytes`.
- `src/storage/index.ts`: additive exports only.

**Automated verification.** New/changed tests: `persistentStorage.test.ts` (9), `saveHealth.test.ts` (4), `persist.test.ts` (+1 failure/recovery), `ui/format.test.ts` (2), `ui/StorageStatus.test.tsx` (3), `ui/SaveFailureBanner.test.tsx` (3), `App.test.tsx` (+2 app-wide banner, incl. "no banner while healthy"), `Settings.test.tsx` (+1 storage row). Gauntlet: lint ✓, build ✓, e2e smoke ✓, e2e:audit ✓, e2e:pwa ✓. `npm test`: all 832 tests pass when run serialized (`vitest --no-file-parallelism`).

**Human-eyes.** Confirmed the Settings "Durable storage" row in both themes via the audit screenshots — the real Chromium preview returned `persisted()=false` and a genuine estimate ("4.1 MB of 10.0 GB"), so the row correctly showed "Off" + the usage meter, proving the live StorageManager path end-to-end. The banner was verified via unit tests (it uses the same CSS-variable patterns as the confirmed Settings row); a live browser screenshot was skipped because claude-in-chrome requires a user-gated browser-selection prompt unavailable to an autonomous run.

**Environment caveat (not a code defect).** This worktree runs Node v26, whose stable global `localStorage` throws without `--localstorage-file` and shadows jsdom's in some parallel vitest workers, so plain `npm test` reports ~12 test *files* failing at import (in modules like `animation.ts` that read `localStorage` at load). This is pre-existing and identical on untouched `main` (verified by stashing). Every test that runs passes, and the full suite is green when serialized. On a Node 20/22 CI the parallel race does not occur.
