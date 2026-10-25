# 39: Dark-mode board containment

**What to build:** In dark mode the board reads as a distinct object, not a shape dissolving into the page. The board frame, felt, and both bear-off trays are visually contained (a hairline outline or raised luminance) on all six Board styles, so edges and borne-off checkers are clearly visible.

**Blocked by:** None (can start immediately).

**Status:** ready-for-agent

- [x] In dark mode the board perimeter and off-trays are clearly distinguishable from the page background on every Board style
- [x] Borne-off checkers are visible in their trays
- [x] Light mode and training readability (highlights, point numbers, dice, cube) are unaffected
- [x] Audit captures refreshed; full gauntlet green

## Comments

Implemented on branch `ticket/39-dark-mode-board-containment` (2026-10-25).
CSS-only; `Board.tsx` untouched.

**The containment mechanism (two new tokens).** The root cause was that the
dark frame (~`#0e120f`) sat a hair *below* the page (`#15130f`), so the board
had no silhouette and the trays floated. Rather than relight every palette,
two tokens now carry the boundary, and both are `transparent` in light mode so
light is provably untouched:

- `--board-edge` strokes the full-bleed `.board-frame` rect (`stroke-width: 4`).
  The outermost `<svg>` clips the stroke's outer half to its viewport, so the
  inner half reads as a crisp ~1.4px hairline hugging the rounded perimeter —
  the whole board silhouette lifts off the page. No structural element needed.
- `--board-tray-edge` strokes each `.board-tray` well (`stroke-width: 2.5`) so
  empty trays read as containers and borne-off checkers sit in a visible well.

Light mode keeps both `transparent` in `:root` and in the light Classic block,
so the cream felt/trays stand off the paper page exactly as before.

**Per style (dark blocks).** Each dark palette sets a hairline tuned to its
mood and lifts the darkest tray fills a step for borne-off readability:

- **Classic** — warm off-white edge `rgba(240,236,226,.26)` / tray `.17`; tray
  `#272c26 → #2b302a`. (Base `:root[data-theme="dark"]` carries the same.)
- **Aegean** — cool blue-white edge `rgba(216,230,245,…)`; tray `#212c39 →
  #27323f`.
- **Bosphorus** — strongest edge (brass `rgba(232,200,142,.30)` / tray `.20`),
  since its dark felt was already flagged muddy (review #23); tray `#241810 →
  #33230f`.
- **Marrakech** — saffron edge `rgba(242,212,160,…)`; tray `#27190e → #35230f`.
- **Kyoto** — warm-neutral edge `rgba(236,226,214,…)` (its frame `#151112` had
  been ≈ page); tray `#2e2824 → #322b27`.
- **Reykjavík** — glacial edge `rgba(220,230,238,…)`; tray `#21282d → #273036`.

**Reviewed by eye (regenerated `e2e:audit` desktop-dark captures).**
`play-midgame-tutor` and all six `board-style-*` now read as contained objects
with defined tray wells on every style; `play-match-over` shows ~15 borne-off
black slabs stacked in a clearly-bounded top tray and white slabs below — both
visible. Spot-checked `play-midgame-tutor-desktop-light` and
`board-style-bosphorus-desktop-light`: unchanged, no hairline, trays as before.
Readability intact in both themes — gold selection ring, the dashed two-move
target (point 7), point numbers, dice, the `64` cube, and the eval bar all
render correctly.

**Verification.** New source-contract test `boardContainment.test.ts` (frame/
tray paint from the tokens; light stays transparent; every dark palette defines
a visible edge). Full gauntlet green: `npm test` (937), lint, build, `e2e`,
`e2e:audit`, `e2e:pwa`. Refreshed audit captures committed.
