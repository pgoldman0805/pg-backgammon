# 07: Persistence and match history

**What to build:** Nothing is lost: all matches (in-progress and finished, with their full game records) persist in IndexedDB; an in-progress match survives reload and resumes exactly where it was; the Analyze area lists match history (opponent difficulty, length, score, date) with the ability to open or delete a match; and a full-history JSON backup can be exported and re-imported to guard against browser storage eviction.

**Blocked by:** 06 (cube and match play).

**Status:** ready-for-human

- [x] Reload mid-match resumes the exact position, cube, score, and turn
- [x] Finished matches appear in the history list and reopen for viewing
- [x] Backup export then import into a cleared profile restores all matches and progress data
- [x] Storage layer is behind an interface so tests run against an in-memory fake

## Comments

Implemented on branch `ticket/07-persistence-and-history` (2026-10-22).
Shape of what landed, and what was verified how:

- **Storage layer** (`src/storage`, new): a small `MatchStorage` seam
  (`list/get/put/delete/clear`, newest-updated-first listing, structured-clone
  semantics) with two implementations sharing one contract test
  (`storageContract.ts`): `createMemoryStorage` (the tests' fake, seedable)
  and `createIndexedDbStorage` (one `pg-backgammon` database, one `matches`
  store keyed by id; the `IDBFactory` is injectable, tested against
  fake-indexeddb). A `StoredMatch` row holds: `config` (length, mode,
  difficulty — with an index signature so ticket 09's tutor flag and anything
  later ride along), `status` (in-progress/finished), `createdAt`/`updatedAt`
  (epoch ms), `record` (the deterministic `MatchRecord` from
  src/rules/match.ts — plain data, replayable), `score`, `winner`, `state`
  (the exact `MatchState` snapshot while in progress; null once finished) and
  an optional `analysis` field that ticket 08 will write and this layer only
  carries. `isStoredMatch` validates rows structurally; anything corrupt is
  treated as absent, never thrown.
- **Continuous persistence** (`src/storage/persist.ts` +
  `useMatchPersistence`): a pure observer over the Play store
  (subscribe/getState only — no new store actions, by the parallel-work
  contract with ticket 09). Saves are debounced (250ms quiet period), flushed
  on `pagehide`/`visibilitychange: hidden` and on unmount, and chained so
  writes land in order; storage failures are swallowed (play never breaks).
  Identity is explicit: the Play page calls `begin(config)` when a match
  starts and `adopt(stored)` on resume, so an abandoned match's row is never
  cross-written by its successor.
- **Resume** (`src/pages/Play.tsx`, minimal additive edits): the setup card
  offers the newest valid in-progress match ("A match is waiting… Resume
  match"); resuming adopts the stored identity, restores the setup
  (mode/difficulty/length) from the config, and swaps in a store created
  around the exact snapshot — position, cube, score and turn included.
  Arriving from Analyze with a `resumeMatchId` (route state, unwrapped by a
  4-line `PlayRoute` in App.tsx) auto-resumes that match once storage
  delivers it. Corrupt or missing rows mean a plain fresh setup.
- **History UI** (`src/pages/Analyze.tsx` + `analyze.css`): a ledger of
  matches — result ("White wins 7–3" or the live standing), length,
  difficulty/hot-seat, date, an accent-marked "In progress" badge — with
  Open (finished), Resume (in-progress, jumps to Play) and a two-step
  inline Delete ("Delete…" → "Delete match"/"Keep"). Open renders a
  read-only view proving the record round-trips: the result recomputed by
  `replayMatch`, the last game's final board from `replayMatchGame` on the
  app's Board, and the per-game list in the Play area's own phrasing. The
  review UI proper remains ticket 08.
- **Backup**: Export history downloads every row as one JSON file
  (`{ app: 'pg-backgammon', format: 1, exportedAt, matches }`); Import
  backup… replaces the current history (the UI says so), skipping corrupt
  rows inside a valid file and refusing non-backup files with a message.

Automated vs needs-human-eyes:

- Storage contract: automated — the same suite runs against the memory fake
  and the IndexedDB implementation over fake-indexeddb
  (`src/storage/memory.test.ts`, `idb.test.ts`), including cross-instance
  persistence and extra-field tolerance.
- Snapshot/validation: automated (`snapshot.test.ts`) — in-progress snapshots
  equal the live `MatchState`, finished rows drop the snapshot but their
  record alone reproduces score and winner via `replayMatch` (the round-trip
  guarantee), garbage rows rejected.
- Persister: automated (`persist.test.ts`) — debounce + flush, identity per
  match, adoption keeping id/createdAt/extra fields, recreation across a
  simulated reload, pagehide flush, dispose, storage-failure swallowing.
- Reload/resume: automated at two seams — Play UI (prompt, exact
  position/cube/score/turn restored, same-id continuation, corrupt-data and
  failing-storage fallbacks, auto-resume by id) and the full App (start a
  match, pagehide, unmount, fresh boot, resume restores pips and standing).
- History/backup UI: automated (`Analyze.test.tsx`, 12 tests) — list
  contents, corrupt-row skipping, load-failure message, open/replay/back,
  resume navigation carrying the match id, delete confirm/cancel, export
  blob round-trips through `parseBackup`, import replaces, junk refused.
- `npm test` (334), `npm run build`, `npm run lint` all pass.
- **Human eyes**: real-browser IndexedDB (tests use fake-indexeddb; worth one
  manual reload mid-match and a look at DevTools → IndexedDB), the download
  prompt UX for Export history, the history ledger and read-only match view
  at tablet width and in dark theme, and the resume note's weight on the
  setup card.

Deviations / notes for later tickets:

- "Progress data" in the backup checkbox: only matches exist yet, so the
  backup covers exactly that; the `format: 1` marker and tolerant row
  validation leave room for puzzle progress (ticket 10+) to join the file.
- Import is replace-only (stated in the UI), per the ticket's
  "merge-or-replace: replace is fine".
- The persister carries unknown top-level row fields through saves (adopt
  keeps them), so ticket 08 can write `analysis` onto a row without this
  layer losing it — but note a row is only rewritten while its match is
  live; finished rows are not touched again.
- jsdom has no IndexedDB, so pages rendered without injected storage fall
  back to a shared in-memory store (`getMatchStorage`); in the browser it is
  always IndexedDB.
- `src/rules` and `src/engine` production code untouched; store untouched
  (persistence observes it). Play page edits were kept to resume wiring:
  setup-card prompt, `begin` on start, replaceable store, `storage`/
  `resumeMatchId` props.
