# 42: UI component consistency

**What to build:** Binary settings use one switch component everywhere, and the match history stays manageable as it grows. The toggle idioms (Play vs Settings) are unified into a single component; the Analyze ledger leads with Open and tucks Export/Delete into an overflow menu, and gains sort/filter/search; and the analyzer's equity columns are labelled like the puzzle reveal's.

**Blocked by:** None (can start immediately).

**Status:** ready-for-agent

- [x] One switch component is used for all binary settings across Play and Settings
- [x] The Analyze ledger has a primary Open action plus an overflow menu, and can be sorted/filtered
- [x] The analyzer review's equity and loss columns are labelled
- [x] Full gauntlet green

## Comments

Implemented on branch `worktree-agent-a6f6a0114fcf5eeea` (2026-10-25). The three
consistency fixes:

- **One switch component** (`src/ui/Switch.tsx`, `src/ui/switch.css`): a single
  leaf `Switch` now backs every binary setting. The two prior idioms — the
  pill-with-dot on the Play area and the iOS track-and-thumb in Settings —
  settle on the track-and-thumb, the universally read on/off affordance, in the
  training green. Its name comes either from a visible `label` it renders (Play:
  the "Tutor mode" toggle on the setup card and in the HUD, with the one-line
  hint still tied via `aria-describedby`) or from an external element via
  `labelledBy` (Settings: named by its row, so the control shows only On/Off and
  never doubles the accessible name). `Play.tsx`'s `SettingSwitch` and
  `Settings.tsx`'s `SwitchRow` are now thin layout wrappers over it; the old
  `.setting-switch`/`.settings-switch` visual CSS is gone. Roles and accessible
  names are unchanged, so every existing `role="switch"` test/e2e selector
  ("Tutor mode", "Auto-roll in races", …) still resolves.
- **Analyze ledger overflow + sort/filter** (`src/pages/Analyze.tsx`,
  `analyze.css`): each row now leads with a filled-accent primary action —
  **Open** (finished) or **Resume** (in-progress) — and tucks the rest into a
  per-row **⋯ overflow menu** (`OverflowMenu`): Export .mat (finished only) and
  Delete…. The menu is keyboard-operable — opens on click or ↓, arrows move
  between items, Escape closes and restores focus to the trigger, a press
  outside dismisses it — with `aria-haspopup="menu"`, `role="menu"` and
  `role="menuitem"`. Above the ledger a toolbar adds a **search** filter (by
  result/opponent/date text) and a **sort** control (Newest first — the default
  — / Oldest first / Difficulty). Kept self-contained for ticket 46's later
  Analyze decompose. The Delete confirm stays inline (Delete match / Keep).
- **Review equity columns labelled** (`AlternativesPanel`, `CubePanel`): the
  two right-hand number columns now carry **Equity** and **Loss** headers
  (and a **Play**/**Action** label for the move column), aligned to the same
  grid as the rows, like the Puzzles reveal's table head.

Verification: `npm test` 1054 pass (incl. new `src/ui/Switch.test.tsx` and new
Analyze tests for the overflow menu, Escape-to-close, delete-through-menu,
search filter, sort, and the column labels — each written test-first and
watched fail). `npm run lint`, `npm run build` clean. e2e all green: `e2e`
(smoke, 2), `e2e:audit` (1 — regenerated PNGs discarded), `e2e:pwa` (2). Visually
spot-checked the unified switch (Settings + Play, light + dark), the ledger
toolbar + ⋯ menu, and the labelled review columns.
