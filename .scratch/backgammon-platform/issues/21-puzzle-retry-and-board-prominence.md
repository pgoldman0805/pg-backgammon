# 21: Puzzle retry, board prominence, side-by-side reveal

**What to build:** Three UI refinements (user request, spec stories 52–54):

1. **Try again on every puzzle** (story 52): after answering (reveal shown), a "Try again" button resets the position (and dice/cube question) for another attempt on the same puzzle. Only the FIRST attempt of a drill visit counts toward progress, streaks, and the retry queue — retries are free practice (state this in the UI subtly if cheap, e.g. the button label or a hint). Works for play and cube puzzles. A pre-submit "Reset" for checker movements already exists; keep it.
2. **Board prominence** (story 53): render the board larger on screen across the app within viewport limits, and make the point numbers (1–24 around the board) meaningfully bigger/legible. This is a deliberate size pass: grow the board's share of the layout (Play already caps at 1120px total — revisit the cap and the board/side-column split; Puzzles and Analyze boards too), keep the viewport-height-aware sizing so the board plus controls still fit without vertical scroll at common desktop sizes, and keep tablet widths overflow-free (`npm run e2e:audit` bars). Point-number typography: larger font in SVG units, still unobtrusive (muted color unchanged). Check pip counts/HUD still balance visually. Board styles (all six) must stay correct — numbers/motifs scale with the SVG, but eyeball at least two non-default styles.
3. **Reveal beside the board** (story 54): in the puzzle drill, the post-answer reveal (verdict line + full equity table with Best/You/missed rows + cube verdict) moves to the RIGHT of the board at desktop width (a scrollable panel — the 100+-row tables scroll within it), returning below the board at the narrow breakpoint. The prompt/attempt controls layout stays coherent before answering. No horizontal overflow at 820px.

**Blocked by:** 20 (Settings tab and checker animation — owns Board.tsx/board.css right now; serialize to avoid conflicts).

**Status:** ready-for-agent

- [ ] Every puzzle offers Try again after the reveal; retries reset position/question and never alter progress, streaks, or the retry queue (unit + component tests)
- [ ] Board is visibly larger at desktop widths across Play, Puzzles, and Analyze, with clearly bigger point numbers; no vertical-fit regressions (board + controls still fit a 1080p viewport) and no horizontal overflow at 820px
- [ ] Puzzle reveal renders beside the board at desktop width and below at tablet; long equity tables scroll within the panel
- [ ] Full gauntlet passes: `npm test`, lint, build, `npm run e2e`, `npm run e2e:audit` (refreshed captures committed; at least two non-default Board styles eyeballed at the new size)
