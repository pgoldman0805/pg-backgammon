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

**Status:** ready-for-agent

- [ ] Six selectable Board styles (default + five geographic), each with distinct artwork, palette, and mood, in both light and dark app themes
- [ ] Readability bars hold in every style × theme combination (checker contrast, highlights, dice/cube/numbers) — verified by screenshots reviewed by the implementer and committed to the audit directory
- [ ] Picker with previews in the Play settings cluster; selection persists across reloads and applies instantly; Puzzles/Analyze boards follow it
- [ ] Default style unchanged (existing audit screenshots still pass); `npm test`, lint, build, `npm run e2e`, and `npm run e2e:audit` all pass
