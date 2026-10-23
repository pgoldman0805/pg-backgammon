# 18: In-app puzzle generation

**What to build:** Unlimited puzzles, generated in the browser (spec story 48): a "Find new puzzles" action in the Puzzles area that runs engine self-play mining client-side — the same screening the offline miner does (self-play games, screen decision points, confirm candidates at full strength, theme-tag, clear-best margin windows) — through the existing engine worker at background priority (the analyzer's priority gate), so play, tutor, and analysis never stall.

- Generated puzzles persist in IndexedDB (new store or reuse/generalize the blunder-puzzle store pattern; additive schema bump with migration test, backup format extended tolerantly per precedent) with `source: 'generated'` (extend the Puzzle type additively).
- They slot into their theme's drill alongside curated puzzles (counts shown per theme), deduped against curated, blunder, and previously generated puzzles by the existing content key.
- UX: a generate action with visible progress ("playing game 3… 2 candidates found") and a sensible batch size (e.g. mine until +10 keepers or a game cap, whichever first); cancellable; works while you navigate away (background); clear note when the engine is still loading. Optional auto-top-up (generate when a theme runs low) only if cheap — otherwise record as a future note.
- Mining code must be shared, not duplicated: extract what `scripts/minePuzzles.ts` and the new in-app generator have in common into `src/puzzles` (the script should shrink to a thin node driver over the shared core).

**Blocked by:** None against current main (runs in parallel with ticket 17, which regenerates `src/puzzles/curatedSet.ts` data and the miner script's knobs — coordinate: you own the shared-core extraction and in-app surface; 17 only bumps target numbers and data. If the script moves under your refactor, keep its CLI entry (`npm run mine:puzzles`) working so 17's run is unaffected; merge carefully whichever lands second).

**Status:** done

- [x] "Find new puzzles" produces drillable, theme-tagged puzzles with full graded answer data, persisted across reloads, deduped against all existing sources
- [x] Generation runs at background priority: an opponent move or tutor query during generation is never visibly delayed (test via the gate's ordering, as ticket 12 did)
- [x] Progress and cancellation work; the action degrades gracefully while the engine loads
- [x] Schema migration test, backup round-trip with generated puzzles, and the full gauntlet (`npm test`, lint, build, `npm run e2e`) pass

## Comments

Implemented on branch `ticket/18-in-app-puzzle-generation` (2026-10-23).
Shape of what landed, and what was verified how:

- **Shared mining core** (`src/puzzles/selfPlayMining.ts`): the self-play +
  screen + confirm + theme-tag pipeline extracted from
  `scripts/minePuzzles.ts`, engine-interface-driven and async — no node APIs,
  no DOM. The seam is `SelfPlayMiningEngine` (`screenPlays` weakened,
  `rankPlays` full strength, `cubeInfo`); the node script adapts the
  synchronous gnubg session, the app adapts the shared analyzer. Config
  carries the quality windows (defaults `SELF_PLAY_QUALITY` — the exact
  curated-miner values), diversity caps (`SELF_PLAY_DIVERSITY`: one keeper
  per theme per game, two cube puzzles per verdict flavor), a stop target
  (`{perTheme}` for the curated set, `{keepers}` for in-app batches), a game
  budget, a dice `seed`, `existingContentKeys` dedupe, `onProgress`
  (games/keepers), `onPuzzle` (keepers as found, ids left `'pending'`) and
  `shouldStop` (cancellation, checked between engine calls). Content
  identity moved to `src/puzzles/contentKey.ts` (the exact ticket-12 key
  format; `blunderMining.ts` re-exports `puzzleContentKey` unchanged), with
  `playContentKey`/`cubeContentKey` probes so a known position is skipped
  BEFORE paying for the full-strength confirmation.
- **Script** (`scripts/minePuzzles.ts`): now a thin node driver — knob
  constants (same names), the session adapter, per-keeper/per-20-games
  logging, curated id assignment (by theme then discovery, unchanged), the
  `render()` output format, warnings. `npm run mine:puzzles` entry
  unchanged; the node path was proven by a scratch run of the shared core
  over the real WASM (2 keepers in 1 game, margins inside the windows —
  the file write path is the only part not re-run, to leave ticket 17's
  regenerated `curatedSet.ts` untouched).
- **Analyzer** (additive, ticket 12 style): `rankPlays` gained an optional
  `options?: RankPlaysOptions` (screening runs at difficulty 'expert' —
  clean 0-ply, same as the offline miner), and a new
  `cubeInfo(position, priority?)` routes cube questions through the same
  priority gate. Ordering pinned in `analyzer.test.ts`: queued background
  cube analysis runs after user-priority work.
- **Generator service** (`src/puzzles/generationService.ts` +
  `generationInstance.ts`): `createPuzzleGenerationService({engine, storage,
  curated, blunders, seed?, batch?})` → `{start, cancel, status, onChange,
  settled}`. One batch at a time (`start` during a run is a no-op), bounded
  by `BATCH_KEEPERS = 10` or `BATCH_GAME_CAP = 40` games, whichever first.
  Keepers persist the moment they land (id `generated-<seed>-<serial>`,
  seed defaults to `Date.now()` per batch), so cancel — and even a crash —
  keeps everything found. Dedupe set built at batch start from curated +
  blunder + generated content keys; the core also dedupes within the run.
  Outcome reasons: `target | games | cancelled | error`; the service never
  rejects. The shared instance drives `getMatchAnalyzer()` at background
  priority and is module-level, so a batch survives navigating away — the
  Puzzles page only subscribes/unsubscribes.
- **Persistence**: `src/storage/idb.ts` DB_VERSION 3→4, adding
  `generated-puzzles` (keyPath `id`), additive-only; the migration test
  recreates a v3 database with matches + progress + blunder puzzles and
  proves all three survive. `src/storage/generatedPuzzles.ts` follows the
  blunderPuzzles pattern: `list/putAll/clear`, memory + IndexedDB sharing a
  contract test, `isGeneratedPuzzle` validation,
  `getGeneratedPuzzleStorage()` shared instance. Structural puzzle shape
  checks extracted to `src/storage/puzzleShape.ts`, shared by
  `isBlunderPuzzle` (whose public behavior is unchanged).
- **Backup**: format 4, additive — optional `generatedPuzzles` array
  (omitted when none), `parseBackup` accepts 1/2/3/4, import replaces the
  generated set only when the field is present (corrupt rows skipped
  individually); format-1/2/3 files leave the current generated set alone —
  exactly the ticket 11/12 precedent. `exportBackup`/`importBackup` grew an
  optional trailing `generatedStorage` param defaulting to the shared
  instance, so Analyze's backup UI carries generated puzzles untouched.
- **Puzzle model**: `PuzzleSource` gained `'generated'` (additive).
  Generated puzzles are money-play positions mirrored to White, identical
  in shape to curated ones, so grading/equity reveal/retry queue/progress
  all work unchanged.
- **UI** (`src/pages/Puzzles.tsx` + css): a "Find new puzzles" generate
  strip sits under the theme ledger — action button, live status line
  (role=status): "Loading the engine…" while the payload loads, then
  "Playing game N… K found" (· stopping while cancelling), then a summary
  ("Found K new puzzles in G games." / "No new puzzles this run…" /
  "Stopped — kept K." / "Generation failed — try again."), and a Stop
  button during a run. Theme counts include generated puzzles; they drill
  inside their theme beside curated ones with a "Generated" source badge
  (same badge treatment as blunder puzzles). Theme counts refresh live as
  keepers land. Props `generatedStorage`/`generation`/`engine` are
  injectable for tests, defaulting to the shared instances.

Automated vs needs-human-eyes:

- Core: automated (`selfPlayMining.test.ts`, 6 tests) over a scripted
  deterministic engine — same seed + same engine = identical batch; margin
  windows hold on stored answers; content-key dedupe (nothing already
  stored comes back); cancellation keeps keepers found so far; monotonic
  progress; cube-flavor caps within a batch; per-theme curated mode without
  overshoot.
- Analyzer: automated — difficulty-option passthrough (with a vacuity
  guard), background `cubeInfo` identity, gate ordering user > queued
  background.
- Service: automated (`generationService.test.ts`, 7 tests) — batch
  lifecycle + unique ids, observer notifications, three-source dedupe,
  cancel, start-while-running no-op, second batch fresh ids/content,
  storage failure → `error` outcome without a throw.
- Storage: automated contract over memory + fake-indexeddb, cross-instance
  persistence, v3→v4 migration, `isGeneratedPuzzle` accept/reject.
- Backup: automated — format-4 export (field omitted when empty), import
  replace, format-3 tolerance, corrupt-row skipping, parse acceptance.
- UI: automated (`Puzzles.test.tsx`, 5 new tests) — generated puzzle
  counted + drilled in its theme with badge and grading, start + live
  progress + cancel, live count refresh mid-batch, finished-batch summary,
  engine-loading note.
- E2E: a second smoke in `golden-path.spec.ts` drives the REAL path —
  click the action, see the status line, see "Playing game N", Stop, see
  the stopped summary, action ready again (cancelled early on purpose to
  stay cheap). `npm test` (746), `npm run lint`, `npm run build`,
  `npm run e2e` (2 tests) all pass.
- **Human eyes**: run a full real batch (~40 self-play games through the
  worker — minutes of background engine time) and skim the keepers on the
  board for face validity, like ticket 11's set; watch responsiveness while
  playing a game DURING generation (the gate ordering is pinned by test,
  but feel is a judgment call); the generate strip at dark theme/tablet
  widths; whether "Generated" as the badge word reads right.

Deviations / notes:

- **Auto-top-up: recorded as future work, not built.** A batch is minutes
  of background engine time (self-play games plus full-strength confirms),
  which fails the ticket's "only if genuinely cheap" bar — and it would
  silently compete with analysis for the gate. A future version could
  auto-start a batch when a theme drops below a floor, behind a setting.
- Generated puzzles are money-play (the curated model), mined at the exact
  quality bars of the offline miner; the in-app batch target/game cap are
  the only knobs that differ by design.
- In-app batch diversity = the offline miner's per-game theme cap and
  per-flavor cube caps. A 10-keeper batch can therefore lean toward the
  themes self-play reaches most (bear-off especially); per-batch per-theme
  caps were left out deliberately to keep batches identical in spirit to
  the miner — revisit if real batches feel samey.
- `done()`/cancel are now also checked between turns inside a game (the
  script only checked between games); this only skips wasted work after
  the target is hit and cannot change which keepers a seed yields.
- Ticket 17 landed first; its merge kept the script's bumped knob values
  (`TARGET_PER_THEME` etc.) inside the new thin-driver structure.
