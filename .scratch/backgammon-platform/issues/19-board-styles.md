# 19: Geographic Board styles

**What to build:** Selectable Board styles (spec story 49, GLOSSARY "Board style"): the current look remains the default, plus five geographically-inspired styles, each with unique artwork, palette, and mood, drawing on backgammon's real traditions:

1. **Aegean** — Greek tavli: whitewash and cobalt, sea light, airy. Mood: bright coastal afternoon.
2. **Bosphorus** — Turkish tavla: walnut wood, mother-of-pearl-inlay motifs, deep teal and brass. Mood: Istanbul coffeehouse.
3. **Marrakech** — zellige-inspired: terracotta, Majorelle blue, saffron. Mood: warm bazaar.
4. **Kyoto** — charcoal lacquer, vermilion, restrained gold, subtle asanoha-style patterning. Mood: quiet precision.
5. **Reykjavík** — glacial minimalism: cool blues, bone, basalt. Mood: stillness.

Mechanics:

- A Board style restyles the board and checkers ONLY (SVG board frame, points, bar, trays, dice, cube face styling, checker faces); the app shell keeps its own light/dark theme. Every style ships light and dark variants that harmonize with the shell.
- Artwork is self-contained SVG (defs/patterns/motifs per style — point fills, frame ornament, checker face designs such as inlay rings or motifs). No external assets, no rasters; keep render performance sane (shared defs, no per-checker filters that jank drags).
- Non-negotiable readability bars in every style × theme: checker colors unambiguous at a glance, selection/legal-destination highlights (solid and dashed two-movement) clearly visible, dice pips and cube face readable, pip-count/point numbers legible, eval bar unaffected. The gold action language may be re-tinted per style but must stay obviously "actionable".
- Picker: a Board style selector with small visual previews (swatch or mini-board), available from the Play area's settings cluster (and the setup card), persisted like the theme toggle, applying instantly mid-game. The Puzzles and Analyze boards follow the selected style (one Board, one style source).
- Default style unchanged pixel-for-pixel so the committed audit screenshots stay valid; the e2e audit runs on the default. Add one audit capture of the picker plus at least one non-default style at both widths/themes.

**Blocked by:** None against current main (tickets 17/18 run in parallel in the Puzzles/mining lanes — stay out of src/puzzles, scripts/, src/storage schema, src/pages/Puzzles.tsx logic; your surface is src/play/Board.tsx, board.css/style modules, the settings cluster in src/pages/Play.tsx, and a new board-style module).

**Status:** ready-for-human

- [x] Six selectable Board styles (default + five geographic), each with distinct artwork, palette, and mood, in both light and dark app themes
- [x] Readability bars hold in every style × theme combination (checker contrast, highlights, dice/cube/numbers) — verified by screenshots reviewed by the implementer and committed to the audit directory
- [x] Picker with previews in the Play settings cluster; selection persists across reloads and applies instantly; Puzzles/Analyze boards follow it
- [x] Default style unchanged (existing audit screenshots still pass); `npm test`, lint, build, `npm run e2e`, and `npm run e2e:audit` all pass

## Comments

**Implemented (agent, 2026-10-23), branch `ticket/19-board-styles`.**

Registry shape: `src/play/boardStyles.ts` exports `BOARD_STYLES` (six `{ id, name, mood }` entries, default `classic` first) plus a shared subscribable store (`getBoardStyle` / `setBoardStyle` / `subscribeBoardStyle` / `useBoardStyle`), persisted under `pg-backgammon.board-style`. Selection stamps `data-board-style` on `<html>` beside the theme's `data-theme`; the default removes the attribute entirely. Palettes are CSS token blocks in `src/play/boardStyles.css` scoped to that attribute (light at `(0,2,0)`, dark at `(0,3,0)` specificity, so they beat board.css's defaults regardless of bundle order); every block redefines the complete 12-token board set for both themes. Motif artwork is per-style SVG defs (`src/play/BoardStyleDefs.tsx`) rendered inside the Board's SVG only while that style is active — shared patterns/gradients, no filters, all colors CSS-var-driven so light/dark flows through. Because the style source is the root attribute and the shared Board component, the Puzzles and Analyze boards follow automatically (zero changes to those pages). Picker (`src/play/BoardStylePicker.tsx`): native radio tiles whose mini-board previews are painted from each style's own tokens (each tile carries its style's `data-board-style`), so previews can never drift from the real palettes; it sits on the setup card and behind an `aria-expanded` "Board style" chip in the HUD settings cluster.

Default-unchanged proof: the default sets no attribute, renders no defs, and no new CSS rule matches it (`board.css`/`index.css` untouched; every new selector is attribute- or new-class-scoped). A unit test pins the default Board to rendering no `<defs>`. Empirically, the pre-merge audit run reproduced analyze-ledger, analyze-viewer, and all four puzzles capture families **byte-identical** to the committed baseline; post-merge (ticket 17's bigger curated set) the analyze captures remain byte-identical and the puzzles ones differ only by ticket 17's own content.

Per-style palette notes (light / dark): **Aegean** whitewash `#f7f9f7`/`#1b242e` felt, cobalt frame `#1f5494`/`#0d1a2b`, cobalt vs bleached-sand points, sea-navy checkers, wave-line felt motif and whitewash point keylines. **Bosphorus** walnut field `#9a7342`/`#3f2e1b` with drawn wood-grain frame/trays, deep-teal vs mother-of-pearl points (radial pearl gradient, also on white checker/dice/cube faces), brass inlay inner rings, brass gold `#f2b63e`/`#f4bd4e`. **Marrakech** terracotta frame `#a34a20`/`#4f2310` with eight-point zellige star tiling, plaster felt, Majorelle `#4f46c8`/`#6a61e0` vs white-glaze points with terracotta grout keylines, indigo-aubergine checkers with saffron rims, saffron gold. **Kyoto** charcoal-lacquer frame, washi felt, vermilion `#b23a24`/`#cd4b2e` vs stone points carrying an asanoha-style lattice, lacquer-sheen black checkers with a quiet maki-e gold inner ring, restrained gold. **Reykjavík** basalt frame with hairline column striations, ice felt under a cold-to-bone gradient, glacial-blue vs bone points, and the default warm gold kept deliberately as the single warm accent.

Verification: 706 unit tests (16 new across `boardStyles.test.tsx` and `Play.boardstyle.test.tsx`), lint, build, `npm run e2e`, `npm run e2e:audit` all pass on the branch with current main (ticket 17) merged. Readability bars were reviewed by me on screenshots of every style × theme at a mid-game state with a selected origin showing solid and dashed (two-movement) destinations, dice, cube, pip counts and point numbers; committed as `board-style-picker-*` and `board-style-<id>-*` at both widths and themes in the audit directory.

Integration notes for neighbours: (1) `seedHistory` in `e2e/audit.spec.ts` now opens IndexedDB without a pinned version — ticket 18's schema bump to v4 would have broken the committed harness (it had v3 hardcoded), and the versionless open adopts whatever schema the app created. (2) While lanes run e2e concurrently, Playwright's `reuseExistingServer: true` on the shared port 4173 can silently make one lane's audit test another lane's build (observed live against a v4-schema build); if parallel e2e lanes continue, consider per-lane ports or `reuseExistingServer: false`.

Needs human eyes (taste, not correctness): the Kyoto asanoha lattice and Marrakech zellige stars are the two boldest artwork moves; the Bosphorus brass-on-walnut action gold is the lowest-margin highlight pairing (judged clearly readable since the wash plus 3.5px stroke sit against both point fill and felt).
