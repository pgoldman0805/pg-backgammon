# 21: Puzzle retry, board prominence, side-by-side reveal

**What to build:** Three UI refinements (user request, spec stories 52–54):

1. **Try again on every puzzle** (story 52): after answering (reveal shown), a "Try again" button resets the position (and dice/cube question) for another attempt on the same puzzle. Only the FIRST attempt of a drill visit counts toward progress, streaks, and the retry queue — retries are free practice (state this in the UI subtly if cheap, e.g. the button label or a hint). Works for play and cube puzzles. A pre-submit "Reset" for checker movements already exists; keep it.
2. **Board prominence** (story 53): render the board larger on screen across the app within viewport limits, and make the point numbers (1–24 around the board) meaningfully bigger/legible. This is a deliberate size pass: grow the board's share of the layout (Play already caps at 1120px total — revisit the cap and the board/side-column split; Puzzles and Analyze boards too), keep the viewport-height-aware sizing so the board plus controls still fit without vertical scroll at common desktop sizes, and keep tablet widths overflow-free (`npm run e2e:audit` bars). Point-number typography: larger font in SVG units, still unobtrusive (muted color unchanged). Check pip counts/HUD still balance visually. Board styles (all six) must stay correct — numbers/motifs scale with the SVG, but eyeball at least two non-default styles.
3. **Reveal beside the board** (story 54): in the puzzle drill, the post-answer reveal (verdict line + full equity table with Best/You/missed rows + cube verdict) moves to the RIGHT of the board at desktop width (a scrollable panel — the 100+-row tables scroll within it), returning below the board at the narrow breakpoint. The prompt/attempt controls layout stays coherent before answering. No horizontal overflow at 820px.

**Blocked by:** 20 (Settings tab and checker animation — owns Board.tsx/board.css right now; serialize to avoid conflicts).

**Status:** ready-for-agent

- [x] Every puzzle offers Try again after the reveal; retries reset position/question and never alter progress, streaks, or the retry queue (unit + component tests)
- [x] Board is visibly larger at desktop widths across Play, Puzzles, and Analyze, with clearly bigger point numbers; no vertical-fit regressions (board + controls still fit a 1080p viewport) and no horizontal overflow at 820px
- [x] Puzzle reveal renders beside the board at desktop width and below at tablet; long equity tables scroll within the panel
- [x] Full gauntlet passes: `npm test`, lint, build, `npm run e2e`, `npm run e2e:audit` (refreshed captures committed; at least two non-default Board styles eyeballed at the new size)

## Comments

**Ticket 21 implementation (2026-10-23, agent):**

1. **Try again** — the drill's run state moved out of `Puzzles.tsx` into pure
   reducers in `src/puzzles/queue.ts` (`DrillRun`, `startRun`, `answerRun`,
   `advanceRun`). A "visit" is one stop at a queue index; `answerRun` ignores
   any attempt after the visit's first, and `Puzzles.tsx` only calls
   `recordAnswer`/`storage.save` on that first attempt — so retries can never
   touch persisted progress, streaks, or the retry queue by construction.
   The reveal gains a "Try again" button (resets position, movements, and the
   cube question via the existing `freshAttempt`) plus a muted
   "Retries don't count toward progress." note; the pre-submit Reset stays.
   Pinned by 5 new unit tests (queue.test.ts) and 3 component tests
   (Puzzles.test.tsx), including: miss → try again → solve leaves the
   retry-queue entry and solved counts untouched, the reveal re-appears after
   a retry submit, and the cube-puzzle variant. The audit walk also exercises
   the flow end-to-end.

2. **Board prominence** — sizes before → after (visible board, letterbox
   accounted for; measured in-browser, not estimated):
   - Shell cap for board pages (Play, Analyze review, Puzzles drill):
     1120px → **1380px**, with vertical shell padding trimmed 3rem/3rem →
     1.25rem/1.5rem on those pages to fund board height.
   - `.board` viewport reserve: `max(420px, 100vh − 270px)` →
     `max(460px, 100vh − 240px)`; the Puzzles drill keeps a 270px reserve
     (its controls sit below the board).
   - Play mid-game @1920×937 (1080p window): 870×614 → **987×697** (+13%
     linear), no vertical scroll; @1280×800: 751×530 → **793×560**, and the
     pre-existing 13px vertical scroll at that size is gone (the old reserve
     under-counted the mid-game HUD).
   - Puzzles drill @1280×800: 503×355 → **751×530** (+49% linear); @1080p
     945×667 (+88%) — the drill previously sat in the 68ch reading shell.
   - Analyze: review board cap 640px → **840px**, XGID viewer 560px → 840px
     (the viewer still sits in the reading-measure history page, so its
     practical gain is small; the review pane is the real beneficiary).
   - Point numbers: 13px → **19px** SVG units (renders ~10px → ~16–21px at
     desktop sizes), baselines rebalanced in Board.tsx (frame−5 / +19);
     muted `--point-number` colors unchanged across all six styles.
   - Geometry untouched, so travelers/hit-testing are unaffected; verified a
     click-to-move traveler mid-flight on the resized board by screenshot.
   - Human-eyes pass: Play mid-game and drill reveal in both themes at
     1280/1920/820, plus Marrakech (light+dark) and Reykjavík (light+dark)
     at the new size — motifs, frame numbers, dice, cube, pip chips all
     read correctly.

3. **Reveal beside the board** — the drill is restructured into
   `.puzzle-layout` (flex): `.puzzle-main` (board + attempt controls,
   controls now centered under the letterboxed board) and the post-answer
   `.puzzle-reveal` aside — a hairline-ruled panel (26rem) with verdict,
   cube verdict, and drill controls in reach, and the equity table scrolling
   internally (`.equity-scroll`, sticky header) for 100+-row tables. At the
   Play layout's 860px breakpoint it returns below the board full-width with
   a top rule. Measured: the visible board is identical before/after the
   reveal at 1280×800 (751×530 both — the panel fits inside the letterbox),
   so answering causes no board jump; no horizontal overflow at 820px.

4. **Verification** — `npm test` (783, was 775), `npm run lint`,
   `npm run build`, `npm run e2e` (2 smoke), `npm run e2e:audit` all pass;
   the audit refreshed all captures at the new sizes and ADDED
   `puzzles-drill-retry-*` (the side reveal after a Try again attempt).
   Automated: overflow assertions, retry persistence tests. Human eyes:
   the screenshot review described above.
