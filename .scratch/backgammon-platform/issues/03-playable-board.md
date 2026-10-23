# 03: Playable board UI

**What to build:** A full game of backgammon playable on screen (both sides human-controlled for now): 2D SVG board rendering positions from the rules engine, checker movement by drag-and-drop and by click-to-move with legal destinations highlighted, within-turn undo, explicit play commit, dice display, pip counts, turn indicator, and game-end announcement. Illegal plays are impossible to commit; forced plays and no-play rolls resolve with minimal friction.

**Blocked by:** 02 (rules engine core).

**Status:** done

- [x] A complete game can be played start to finish with mouse only, and separately with clicks only
- [x] Legal destinations highlight on pickup/selection; illegal drops snap back
- [x] Within-turn undo restores intermediate states correctly; commit ends the turn
- [x] Board is readable in both themes at desktop and tablet widths

## Comments

Verification notes (agent, ticket 03):

- Clicks-only full game: automated — a component test drives a seeded game from
  opening roll to the win announcement through the real UI (`src/pages/Play.test.tsx`).
- Mouse-only (drag): the click-vs-drag state machine and hit-testing are
  unit-tested (`src/play/drag.test.ts`, `src/play/geometry.test.ts`), and a
  real-browser drag (19/22 with a 3) was performed and observed working during
  review. Illegal drops dispatch nothing, so the checker re-renders at its
  origin (snap back); verified in code and tests, not by dragging every illegal
  target. **Human eyes**: play a few turns by drag only and judge the feel
  (ghost checker tracking, snap-back, drop-zone generosity).
- Undo/commit: store unit tests cover intermediate-state restoration and
  commit gating; also exercised live in the browser.
- Themes/widths: light and dark reviewed via screenshots at desktop width; the
  board is pure scaled SVG and stayed readable with the content column
  constrained to ~770 px. **Human eyes**: a true tablet-viewport pass (the HUD
  wraps below 860 px via a media query that wasn't visually exercised — window
  resize was blocked by the OS during review), plus general feel of checker
  sizes at the smallest width.
- Dead ends are unreachable by construction: only movements that can still
  extend to a complete legal play are offered (selector search anchored in the
  rules engine's `legalPlays`), so commit is enabled exactly when the engine
  would accept the play.
