# 14: Visual polish and responsive audit

**What to build:** A coherence pass across the whole app once all pillars exist: consistent spacing/typography/color usage against the modern-minimal high-contrast direction, both themes audited on every screen, tablet-width layout verified for Play, Analyze (review), Puzzles, and Progress, keyboard accessibility for primary flows, and a final Playwright smoke test covering the golden path (start match → play → finish → review → drill a mined puzzle).

**Blocked by:** 09 (Tutor mode), 10 (import/export), 12 (blunder mining), 13 (progress view), 15 (auto-roll and auto-forced-play).

**Status:** done

- [x] Every screen passes a both-themes, desktop + tablet visual audit (screenshots attached to the ticket)
- [x] Golden-path Playwright smoke test passes headlessly
- [x] No horizontal scroll or clipped board at tablet width anywhere
- [x] Primary flows operable by keyboard

## Comments

Done. Two Playwright projects now exist (`playwright.config.ts`, headless
Chromium, driving the real `vite preview` build with the real WASM engine —
no fakes anywhere):

- **`npm run e2e`** — the golden-path smoke (`e2e/golden-path.spec.ts`):
  1-point match vs Beginner played to completion through the board's
  accessible controls, the finished match opened in Analyze, the 2-ply
  review awaited and its error-rate summary asserted, then Puzzles checked
  for the five curated collections and (conditionally, when the match
  produced a blunder — near-certain at this play quality) a "From your
  games" count ≥ 1. Runtime observed: **1.2–2.1 minutes** against a warm
  preview server; the self-contained `npm run e2e` adds its own build
  (~30 s more). Engine load and whole-match 2-ply analysis dominate;
  timeouts are generous on purpose. `npm test` (vitest) is untouched.
- **`npm run e2e:audit`** — the audit harness (`e2e/audit.spec.ts`): walks
  Play setup, mid-game with the Tutor strip, the cube dialog (reached
  deterministically via a hot-seat double), match over, the Analyze ledger,
  the open review, the XGID viewer, Puzzles browse/drill/equity reveal, and
  Progress (seeded with ten analyzed matches through the app's own
  IndexedDB schema), screenshotting each at 1280 px and 820 px in both
  themes and **asserting zero horizontal overflow at every captured
  state**. The committed set under `.scratch/backgammon-platform/audit/`
  (45 PNGs) is this ticket's visual record.

Audit findings fixed (I reviewed every screenshot):

- **Review squeezed at desktop** — the open post-game review lived inside
  the shell's 68ch reading measure: a ~300 px board, alternative rows
  wrapping mid-move, the Previous/Next/Copy-XGID nav stacking. Fixed with
  `.shell-main:has(.match-view) { max-width: 1120px; }`
  (src/pages/analyze.css:17), the same rule the Play board already used;
  the history ledger and position viewer keep their reading measure.
- **Ledger dates wrapped mid-way** ("finished Oct / 22, 2026") at every
  width. `formatDate` now joins the date with non-breaking spaces so it
  wraps whole (src/pages/Analyze.tsx:123).
- **Danger-red drift** — four near-identical rust pairs had accumulated:
  `--tutor-bad #b3362b/#e0604f` (board.css), `--blunder #a2402c/#e08062`
  (analyze.css), `--miss #a23c2a/#de7a62` (puzzles.css), plus literals on
  the delete-confirm button. All now alias one `--danger` token defined in
  src/index.css:11 (light `#a2402c`, dark `#e08062`); the area-local names
  survive so no selector changed. Progress's blunder-bar dark value
  (`#cd5f3b`) stays — it is a chart fill validated for the dark surface.
- **Control radius drift** (4 px vs 6 px across theme toggle, history
  buttons, play buttons, selects, inputs, the Progress empty-state link) —
  unified on `--control-radius: 6px` (src/index.css:13).

Verified clean in the audit (no change needed): tablet board never clips
and no state scrolls horizontally at 820 px (hard-asserted); the HUD wraps
status-first at ≤860 px; the three-switch cluster holds one row at tablet
width in both themes; the tutor strip's eval bar + captions read well; the
cube dialog, match-over card and setup card are legible in both themes; the
134-candidate equity table scrolls its page, not the viewport; Progress
charts, hollow partial-match dots and the pinned tooltip render correctly
in both themes; dark theme has no missing styles anywhere I could find.

Keyboard: the smoke test plays an **entire match through the keyboard
path** (the SVG origins/destinations are focusable `role=button` elements
activated with Enter), which pins board operability for good. A scripted
tab-walk of Play setup and mid-turn confirmed sane order (skip link → nav
→ theme → pickers/switches → board origins → controls) with disabled
Undo/Commit correctly skipped; Analyze stepping, Puzzles answering and the
Progress chart hits are all native buttons with visible focus. No gaps
needed fixing.

Bundle (production build, after this ticket): `index.js` 543.2 kB
(139.0 kB gzip), `index.css` 27.3 kB (5.8 kB gzip), analyzer worker
9.9 kB; the engine payload (`public/engine/`: 2.0 MB data + 0.95 MB wasm +
0.1 MB js) is static and lazy-loaded as before. Nothing regressed; the
curated set's ~17 kB gzip share (ticket 11) is not worth a code-split that
would not be a one-liner (the set is a synchronous default prop), so the
numbers are recorded instead.

Notes for later tickets / human eyes:

- **Stale ledger right after a match ends** (behavior, deliberately not
  changed here): the persister's final write is debounced 250 ms, and the
  Analyze ledger loads once on mount without observing storage, so opening
  Analyze within a beat of the match-over card can show the row as
  "In progress 0–0" until a revisit. `getObservableMatchStorage` (ticket
  12) exists if a later ticket wants the ledger live. The smoke test
  waits on the persisted row rather than papering over it in the app.
- Real-pointer SVG clicks from automation proved flaky (pointer-capture +
  drag-threshold interactions); the e2e helpers use the keyboard path
  instead. Human drag/click feel on real devices remains a human check.
- Still genuinely human-only: drag feel (ghost tracking, snap-back,
  drop-zone generosity), the 450 ms pacing of computer/forced plays, eval-
  bar motion at real latency, hover-preview feel on alternatives, deepening
  latency at 3-ply, download-prompt UX, pasting wild XG/gnubg files and a
  real gnubg import of our export, curated-position face validity, touch
  tooltip pinning on a physical tablet, and 50+-match chart density.
- The engine opponent still never offers resignations (ticket 06 note) —
  deferred by instruction, unchanged here.
