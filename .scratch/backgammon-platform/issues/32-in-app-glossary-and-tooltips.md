# 32: In-app glossary and tooltips

**What to build:** Any term the UI uses can be understood inside the app. Jargon the interface shows (pips, equity, EMG/PR, Crawford, blunder, 2-ply, and the puzzle themes) is explained via hover/tap tooltips and a browsable glossary page, so a player never has to leave to look up a word.

**Blocked by:** None (can start immediately).

**Status:** ready-for-agent

- [x] Key terms shown in the HUD, analyzer, and puzzles carry an accessible inline explanation (hover plus keyboard/touch reachable)
- [x] A glossary page lists the project's terms with their definitions
- [x] Explanations match the canonical domain vocabulary (GLOSSARY.md)
- [x] Full gauntlet green

## Comments

Built one inline affordance — `GlossaryTerm` (`src/ui/GlossaryTerm.tsx`) — reused
everywhere jargon shows. A term reads as felt-green dotted-underlined text; the
definition appears on hover, on keyboard focus, and on tap (pinned, so touch has
no hover to rely on), and Escape dismisses it. The definition is wired with
`aria-describedby` to a `role="tooltip"` element so a screen reader always hears
it on focus whether or not the popover is visible, and the trigger reports
`aria-expanded`. One source of copy drives both the tooltips and the page:
`src/ui/glossary.ts`, player-facing definitions derived from GLOSSARY.md.

Terms wired inline:
- Play HUD: pip count ("167 pips"), the Crawford badge, the eval-bar equity
  (Tutor), and the post-play feedback classification (Dubious / Error / Blunder).
- Analyze: the "Error rate" and "equity" terms in the summary hint, the per-player
  blunder / error / dubious tally, and the "{n}-ply" analysis-depth chip.
- Puzzles: the theme name in the drill caption (priming / blitzing / holding game /
  bear-off / cube handling), guarded by `hasGlossaryEntry` so a theme ticket 33
  might add renders plainly instead of breaking.

Glossary page: a new "Learn" nav entry → `/learn` (`src/pages/Learn.tsx`). Ticket
30 folds how-to-play into this same area on merge. The page groups every
player-facing term under Playing / Analysis & review / Puzzle themes, each term a
navigable heading with its full definition, in the shell's paper/ink/felt-green
language with the board-point triangle section markers.

Lane ownership respected: no Play setup-card restructuring (HUD tooltips only), the
puzzle theme set untouched (tooltip added only in the drill caption, not the
ticket-33-owned ledger), and the App.tsx edit is the single Learn nav entry + route.

Deviations:
- EMG and PR never render as literal UI labels (only in code/types), so they get no
  inline tooltip; both are defined on the glossary page, and the shown relatives
  (equity, error rate) carry inline tooltips.
- The classification word inside each Analyze decision row is not itself a tooltip,
  because the row is a `<button>` and a button cannot nest a button; the same terms
  are explained in the summary tally and the glossary instead.

Verification: `npm test` (887 pass), `npm run lint`, `npm run build`, `npm run e2e`,
`npm run e2e:audit`, `npm run e2e:pwa` all green. Audit gained a `learn-glossary`
screen and a `term-tooltip-desktop-light` capture of the open affordance.
