# 40: Reclaim desktop width on data screens

**What to build:** The Analyze, Progress, and Puzzles-browse screens use the available width instead of a narrow reading column. The history ledger, review, charts, and theme list get room to breathe on desktop, with the Progress charts in particular no longer cramped.

**Blocked by:** None (can start immediately).

**Status:** ready-for-human

- [x] Analyze, Progress, and Puzzles-browse use a wider (or multi-column) layout on desktop, with no horizontal overflow
- [x] Progress charts are materially larger and clearer on desktop than the old narrow column
- [x] Tablet and phone layouts and the audit's no-overflow bars still hold
- [x] Audit captures refreshed; full gauntlet green (audit run green; PNGs intentionally not committed — coordinator regenerates the baseline at wave end)

## Comments

**2026-10-25 — implementer (Claude Fable 5), branch `ticket/40-reclaim-desktop-width-data-screens`, commit 4fa83b3**

CSS-only. The three data screens were pinned to the shell's 68ch reading
measure (~500px) on every viewport, which not only wasted desktop width but
actively clipped components that already declared wider intents — the Progress
charts are responsive `width:100%` SVGs, the Analyze position-viewer board
asks for 840px, and the Puzzles theme/blunder ledgers for 54rem. The shell was
starving them.

Approach — widen `.shell-main` per data screen on the desktop tier only,
following the existing `:has()` width-override pattern used by the board pages
(`:has(.play-area)` → 1380px):

- `progress.css`: `.shell-main:has(.progress-area)` → `max-width: 64rem`. The
  stacked PR / blunders charts fill it; measured ~940px wide on the 1280px
  audit viewport, up from ~404px — roughly 2.3× taller and clearly legible.
  Charts stay stacked (shared time axis), not side-by-side.
- `analyze.css`: `.shell-main:has(.analyze-area):not(:has(.match-view))` →
  `max-width: 58rem` for the ledger view. The `:not()` excludes the open
  review, which keeps its existing 1380px board-width cap.
- `puzzles.css`: `.shell-main:has(.puzzles-area):not(:has(.puzzle-drill))` →
  `max-width: 58rem` for browse. The `:not()` excludes the drill, which keeps
  its 1380px cap. The 54rem theme/blurb/generate measures were already correct
  and now finally reach their intended width.

Each rule carries a `@media (max-width: 860px)` reset back to `68ch`, so the
tablet (820/844px) and phone (390px) tiers are byte-for-byte unchanged —
verified against the tablet audit capture. No inner component caps needed
touching; widening the shell simply activated the measures already declared.

Settings and Learn keep the 68ch reading measure (base `.shell-main` in
index.css is unchanged).

Verification (all foreground, all green): `npm test` 950/950 · `npm run lint`
clean · `npm run build` ok · `npm run e2e` (smoke) 2/2 · `npm run e2e:audit`
1/1 — no horizontal overflow at desktop/tablet/phone/phone-landscape in both
themes · `npm run e2e:pwa` 2/2. Regenerated audit PNGs discarded (working tree
clean).
