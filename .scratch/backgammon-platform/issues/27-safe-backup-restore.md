# 27: Safe backup restore

**What to build:** Importing a backup can never silently destroy the player's existing history. Choosing a backup file shows a confirmation naming how many matches and puzzles it contains and what will happen (replace vs merge); the restore either fully succeeds or leaves the existing data untouched (no half-wiped state); and a merge option adds the file's data without discarding what's already there.

**Blocked by:** None (can start immediately).

**Status:** ready-for-agent

- [x] Import shows a confirmation with item counts before any change; cancelling changes nothing
- [x] A restore that fails or is interrupted midway leaves the prior history fully intact (all-or-nothing)
- [x] Merge import preserves existing matches/puzzles and adds only non-duplicates; replace is a distinct, explicit choice
- [x] Full gauntlet green

## Comments

**Real bug confirmed?** Yes. A failing test reproduced it before any fix: with
existing matches in the store, an `importBackup` whose second `put` rejected
(standing in for a `QuotaExceededError`) left the store holding only the first
imported row — the prior history was half-wiped. And `BackupControls` fired the
restore straight off the file pick, with no confirmation, so a wrong or stale
file silently replaced everything. Both are now fixed and covered by tests.

**Transaction approach chosen:** Snapshot-and-rollback (one of the three
approaches the ticket sanctioned). `importBackup` first validates and shapes the
whole file in memory (corrupt rows filtered out before anything is written),
snapshots every backed-up store (matches, puzzle progress, blunder puzzles +
mined-match stamps, generated puzzles), then applies. If any write throws, it
restores all stores from the snapshot and rethrows, so the stores end exactly
as they began — all-or-nothing across every store together, not just within
one. A true single IndexedDB transaction can't span the stores through the
existing `MatchStorage`/puzzle-store seams without reworking them (and would
collide with ticket 26's lane); snapshot-and-rollback covers the realistic
failure (a rejected put mid-restore) while keeping the seams and the export API
stable.

**Merge semantics:** Merge never clears. Matches, blunder puzzles and generated
puzzles are added by id — ids already present are skipped (a duplicate is a
no-op, existing rows are never overwritten), and because merge never calls
`clear()`, the blunder store's mined-match bookkeeping survives. Puzzle
progress, a single document, is combined: the union of `solvedIds` and
`retryQueue`, existing per-theme counters kept (a theme the player has worked
here wins over the file's), newer `updatedAt`. Replace stays the default and is
the only mode that discards — it's a distinct, explicit button.

**Confirmation UI:** Picking a backup now parses first and opens a modal
(`role="dialog"`, `aria-modal`, labelled + described, focus moved in, Escape to
cancel, a small focus trap) naming the file's contents — "This file holds N
matches and M puzzles, saved <date>" — with three explicit choices: Replace
history (rust, the app's cost colour), Merge into history, Cancel. Cancel
changes nothing. A non-backup file is rejected with its parse error and never
opens the dialog.

**Automated vs human-eyes:** Behaviour is fully automated — storage-seam tests
(atomic rollback across all stores, merge dedup, progress union, summary
counts) and component tests (file pick shows the confirmation and writes
nothing until confirmed; cancel is a no-op; replace vs merge; non-backup
rejection). The visual audit (`e2e:audit`) screenshots the Settings Data
section (default, dialog closed) and passed. The dialog's own appearance was
reviewed from the CSS/markup, not eyeballed in a browser; a human glance at the
open dialog in light and dark is the one thing left to confirm by eye.

**Note — shared test setup:** This environment runs Node 26, whose experimental
Web Storage global shadows jsdom's `localStorage` with an `undefined` getter, so
every test file importing `localStorage` at load time failed before this ticket
(verified on pristine `main`). Added a guarded in-memory `Storage` shim to
`src/test/setup.ts` that installs only when the ambient storage is unusable — a
no-op where jsdom's storage works. Without it `npm test` cannot run at all here.
