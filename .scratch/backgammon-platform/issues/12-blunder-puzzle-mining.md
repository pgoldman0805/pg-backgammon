# 12: Blunder puzzle mining

**What to build:** Puzzles mined from the player's own games: after a game's analysis completes, every decision with equity loss ≥ 0.08 (blunder) becomes a blunder puzzle automatically — the position, the roll (or cube question), and the engine's graded answers — deduplicated against existing puzzles and appearing in the Puzzles area in their own "from your games" collection alongside curated sets.

**Blocked by:** 08 (post-game review), 11 (puzzle player and curated set).

**Status:** ready-for-human

- [x] Finishing and analyzing a game containing a blunder yields a playable blunder puzzle without user action
- [x] The same blunder analyzed twice (e.g. re-analysis) does not create duplicates
- [x] Blunder puzzles are visually distinguishable and filterable from curated ones
- [x] Both checker-play and cube blunders mine correctly

## Comments

Implemented on branch `ticket/12-blunder-puzzle-mining` (2026-10-22).
Shape of what landed, and what was verified how:

- **Mining core** (`src/puzzles/blunderMining.ts`, pure):
  `mineBlunderPuzzles(storedMatch, {existing, rankPlays})` walks the
  analysis rows beside the record. Selection: finished vs-computer matches
  only (the human is always White there — hot-seat has no single "player's
  blunder" to drill), tutor-assisted games excluded (live help; drilling
  those would double-dip), `decision.player === 'white'` and
  `equityLoss >= CLASSIFICATION_THRESHOLDS.blunder` (the shared constant
  from `src/engine/analysis.ts`, inclusive — no literal). Positions are
  rebuilt with ticket 08's exported `walkGame` (play moments, cube-action
  and cube-opportunity moments all carry the board and exact match
  context, so missed doubles and end-of-game passes mine too).
- **Answer data** matches the curated model exactly, so ticket 11's
  grading, equity-table reveal and retry queue work unchanged. Play
  blunders: when the stored `alternatives` cover `totalPlays` (≤ 5 distinct
  plays, or the played move was the appended last) the table is built
  offline from the analysis; otherwise ONE full-strength ranking completes
  it — `MatchAnalyzer.rankPlays(position, roll, 'background')`, a small
  additive method routing through the existing priority gate, so mining
  never delays user-facing analysis (an ordering test pins user > queued
  background). Cube blunders never need the engine: the three stored
  doubler-view equities price the choices via
  `cubeChoicesFromEquities` (extracted from ticket 11's
  `deriveCubeChoices`, both now share it); take/pass → a 'response'
  puzzle, double/no-double → an 'offer' puzzle. Themes: `classifyPlayTheme`
  heuristics; **documented fallback** for unnamed positions — 'bear-off'
  if the position is a race, else 'priming' (the most generic
  checker-play skill); cube blunders are always 'cube-handling'.
- **Dedupe**, both keys as specified: identity is the origin
  (`blunder:<matchId>:<game>:<decisionIndex>` — decision index into the
  game's analysis `decisions`, stable across re-analysis and deepening),
  plus a content key (`kind | boardKey | hero | cube value | roll or
  offer/response`) so a second game reaching the identical blunder
  position is skipped and the earliest puzzle wins. Match score is
  deliberately NOT in the content key (same position at two scores drills
  once — the ticket's reading); noted for human judgment below.
- **Persistence**: `src/storage/idb.ts` bumped DB_VERSION 2→3, adding a
  `blunder-puzzles` store (keyPath `id`), additive-only; a migration test
  recreates a v2 database with matches + progress and proves both survive
  (the existing v1 test now exercises v1→v3). New module
  `src/storage/blunderPuzzles.ts` follows the puzzleProgress pattern:
  `BlunderPuzzleStorage` (`list/putAll/loadMined/markMined/clear`),
  memory + IndexedDB implementations sharing a contract test,
  `isBlunderPuzzle` validation, `getBlunderPuzzleStorage()` shared
  instance. The store also holds one `mined-matches` bookkeeping row
  (matchId → `analyzedAt` stamp of the analysis last mined), filtered out
  of `list()` — catch-up skips covered matches and re-mines when
  deepening/re-analysis bumps the stamp.
- **Backup**: format 3, additive — optional `blunderPuzzles` array
  (omitted when none), `parseBackup` accepts 1/2/3, import replaces the
  mined set only when the field is present (corrupt rows skipped
  individually); a format-1/2 file leaves the current mined set alone,
  exactly ticket 11's precedent. `exportBackup`/`importBackup` grew an
  optional trailing `blunderStorage` param defaulting to the shared
  instance, so Analyze's backup UI carries blunder puzzles untouched.
- **Trigger** (`src/puzzles/blunderMiningService.ts` + observable
  storage): the shared MatchStorage instance is now wrapped by
  `createObservableMatchStorage` (`src/storage/observe.ts`) exposing
  `onMatchPut` — both Play's persister/auto-analysis and Analyze's
  on-open/deepening persists flow through it, so the miner reacts the
  moment an analysis-bearing finished row lands (autoAnalysis's
  observer style: one promise chain, failures swallowed, `settled()`
  for tests, `dispose()`). `catchUp()` sweeps all stored matches for
  analyzed-but-unmined ones, so pre-existing history gains puzzles.
  Wiring: `useBlunderMining()` in `src/App.tsx` (one hook call — the only
  App change) starts the shared service and catch-up on app mount;
  the Puzzles page also catch-ups on mount and refreshes its list after.
  A failed run (e.g. engine unavailable mid-completion) leaves the match
  unmarked and is retried on the next catch-up; `markMined` is written
  only after a fully successful run.
- **UI** (`src/pages/Puzzles.tsx` + css): the browse view gains a
  "From your games" row under the theme ledger (accent-ruled, "yours"
  chip, live count, explanatory blurb when empty, Drill disabled at 0).
  Drills were generalized from themes to collections — a blunder drill
  runs the whole mined set; curated theme drills see only the `puzzles`
  prop, so the two sets never mix (that's the filter). In the drill, a
  mined puzzle shows a "From your games" source badge next to the prompt;
  grading, the equity-table reveal, per-theme progress and the retry
  queue are entirely reused.

Automated vs needs-human-eyes:

- Mining core: automated (`src/puzzles/blunderMining.test.ts`, 13 tests)
  over the shared `cubeGameMatch` fixture with hand-built analysis rows —
  complete-table play puzzle built offline (board, context, cube state,
  finalKeys replayed), partial table completed by exactly one engine call
  with the right position/roll/context, wrong-take → response puzzle and
  missed redouble → offer puzzle (board, pre-double cube, negated/derived
  choices, verdict), threshold inclusive at exactly 0.08 via the shared
  constant, player/mode/tutor/status/corrupt-analysis filters, all three
  dedupe paths (origin incl. no-engine-touch on re-mine, cross-match
  content, within-run content).
- `cubeChoicesFromEquities`: automated equivalence with
  `deriveCubeChoices` plus a wrong-take ranking (`mining.test.ts`).
- Analyzer `rankPlays`: automated — full-strength result identity and the
  gate ordering (queued background mining runs after user work).
- Storage: automated contract over memory + fake-indexeddb, cross-
  instance persistence, shared-database coexistence, v2→v3 migration,
  `isBlunderPuzzle` accept/reject (`src/storage/blunderPuzzles.test.ts`).
- Backup: automated — format-3 export (field omitted when empty), import
  replace, format-2 tolerance, corrupt-row skipping, parse acceptance.
- Trigger: automated (`blunderMiningService.test.ts`) — catch-up mines
  never-mined matches and marks stamps, skip at same stamp (no second
  engine call), re-mine on bumped stamp without duplicates, swallowed
  failure then successful retry, event-driven mining on an
  analysis-bearing put (and not on the bare finished row), dispose.
  Observable storage: put notification, unsubscribe, listener-throw
  isolation (`observe.test.ts`).
- UI: automated (`Puzzles.test.tsx`, 4 new tests) — collection row with
  count, mined-priming puzzle kept out of the Priming theme drill,
  drill with source badge + grading + equity table, empty state, list
  refresh after the miner's catch-up.
- `npm test` (602), `npm run build`, `npm run lint` all pass.
- **Human eyes**: play a real match vs the computer, blunder on purpose,
  finish — then open Puzzles and confirm the puzzle appears without any
  other action (the full IndexedDB + real-engine + real-timing path; in
  jsdom it is covered piecewise). Also: the "From your games" row and the
  source badge in both themes at desktop/tablet widths; the 'priming'
  fallback tag on positions the heuristics can't name (judgment call —
  if it grates, a sixth 'general' theme is a model change for later);
  whether excluding the whole content-duplicate when scores differ feels
  right (the kept puzzle's answers are correct for ITS score only); and
  background engine completion latency when a long history catch-up hits
  many >5-candidate play blunders on first load.

Deviations / notes:

- Hot-seat and tutor-assisted games are EXCLUDED, as directed; documented
  in the mining module header. Imported matches (ticket 10) will mine iff
  their config says `mode: 'computer'` and analysis is present — White is
  assumed to be the human side there too.
- Deepening that drops a decision below 0.08 does not retract an
  already-mined puzzle (it was a blunder at 2-ply; puzzles are never
  auto-deleted). Deleting a match keeps its mined puzzles (grading is
  self-contained); its origin then simply points at history that is gone.
- Engine-completed tables are standard 2-ply even when the decision was
  deepened to 3-ply — each puzzle's table is internally consistent, which
  is all grading uses.
- `MatchAnalyzer` gained a `rankPlays` method (additive; the one test
  double building an analyzer by hand got the real method spread in).
  `getMatchStorage()` now returns the same instance wrapped observable;
  a new `getObservableMatchStorage()` exposes the events. Both changes
  are additive for tickets 10/13.
- Within a session, blunder-puzzle misses re-queue and progress counts
  under the puzzle's theme — mined and curated puzzles share the one
  progress document and retry queue by design (ticket 11's shapes carry
  them without change; drills filter by their own collection).
