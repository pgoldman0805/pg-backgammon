# 16: Board interaction shortcuts and side controls

**What to build:** Three Play-board improvements (user request, spec stories 45–46 plus a layout change):

1. **Double-click moves a single-destination checker** (story 45): double-clicking a checker that has exactly one legal destination applies that movement immediately. With zero or multiple destinations, double-click does nothing beyond normal selection (no misfires, no weird selection state).
2. **Two-movement destinations** (story 46): selecting a checker highlights, besides the one-die destinations, the final point (or bear-off) reachable by applying two of the remaining dice from that origin — clickable to apply both movements in sequence. Offered only when the two-movement sequence is a legal prefix of a complete play (same anchoring as existing selectors) AND unambiguous: every die order reaching that final point from that origin yields the identical board (same hits). Ambiguous paths stay per-movement. If the final target collides with a one-die destination (e.g. bear-off reachable by one die or two), the one-die action wins and no two-movement variant is offered. Works with doubles (two of the remaining identical dice). Within-turn undo keeps its per-movement granularity (undoing a two-movement click takes two undos).
3. **Turn controls beside the board**: move the turn-control cluster (Undo / Commit play / Resign…, and the manual forced-play/dance buttons) from under the board to the right side of the board at desktop width; at tablet width (≤ the existing HUD-wrap breakpoint) they return below the board. The audit's zero-horizontal-overflow assertion at 820px must stay green; keyboard tab order stays sane (board origins → destinations → controls).

**Blocked by:** 14 (polish and responsive audit — this builds on the audited layout).

**Status:** done

- [x] Double-click on a one-destination checker moves it; on a multi-destination or stuck checker it changes nothing; covered by drag/state and component tests
- [x] Two-movement destinations highlight and apply both movements on click; ambiguity rule enforced by selector unit tests (same-point different-hits NOT offered; identical-outcome paths offered; doubles; bear-off; one-die collision precedence)
- [x] Controls render beside the board at desktop width and below it at tablet width; `npm run e2e:audit` passes (no horizontal overflow anywhere)
- [x] Puzzle board answering inherits the same interactions and stays green; `npm test`, lint, build, and `npm run e2e` all pass

## Comments

Implemented on branch `ticket/16-board-interaction-shortcuts` (2026-10-23).
Shape of what landed, and what was verified how:

- **Double-click** (`src/play/drag.ts`, `src/play/Board.tsx`): the pure drag
  state machine now carries an event timestamp on `down`; a plain click
  leaves a `lastClick` stamp on the idle state, and a second press on the
  same origin within `DOUBLE_CLICK_MS` (400 ms, press-to-press) makes the
  release a `dblclick` command instead of a `click`. The Board acts on it
  only when `destinationsFrom` offers exactly one movement: it swallows the
  native click and dispatches that movement. With zero or several
  destinations the command is ignored and the native click runs, so a fast
  double-click behaves exactly like two ordinary clicks (select, deselect)
  — no misfires, no special selection state. Drags, drops, and cancel all
  clear the stamp, so a drop never chains into a dblclick and a triple
  click starts over.
- **Two-movement destinations** (`src/play/selectors.ts`
  `twoMovementDestinationsFrom`, `src/play/Board.tsx`,
  `src/play/board.css`): for the selected origin, every viable first
  movement is continued by the same checker with a second remaining die
  (engine `legalMovements` on the intermediate board), kept only when the
  resulting position still reaches an engine-enumerated complete play (the
  same `legalPlays`/`reachesCompletePlay` anchoring as `viableMovements`).
  Paths are grouped by final target; a target is offered only when every
  path's final board serializes identically (`boardKey` covers points, bar
  and off, so hits are included), and never when `destinationsFrom` already
  reaches it with one die (one-die collision: the one-die action wins,
  which keeps single-die bear-off intact). Dispatch order is deterministic:
  larger first die when both orders are equivalent. Doubles use two of the
  remaining identical dice. The Board renders these after the one-die
  destinations as focusable `role=button` groups labelled "Move to point N
  in two movements" / "Bear off in two movements", styled with the same
  gold action language but a dashed outline and quieter wash
  (`.dest-point--two`, `.dest-tray--two`). Clicking (or Enter/Space)
  dispatches the two `movement` actions in order through the existing
  `onMove`, so within-turn undo keeps its per-movement granularity.
- **Side controls** (`src/pages/Play.tsx`, `src/play/board.css`): the board
  and every turn-control cluster (Undo / Commit play / Hint / Resign…, the
  forced-play and dance Continue buttons, the pre-roll Double/Roll pair,
  the resign picker, and the engine-note strip) now live in a
  `.play-layout` flex row: `.play-board` flexes, `.play-side` is a fixed
  184px column (stable while clusters come and go), vertically centered
  beside the board. At the existing ≤860px HUD-wrap breakpoint the layout
  stacks and the clusters return to the centered row below the board. The
  side column renders only while a match exists, so the setup card keeps
  the full-width board. DOM (and tab) order stays board origins →
  destinations → controls. Total width still caps at the Play max-width
  (1120px); the column takes its slice from the board.

Automated vs needs-human-eyes:

- Selector: `src/play/selectors.test.ts` (10 new tests) — identical-outcome
  both-orders offered larger-die-first; same-point different-hits rejected;
  only-one-order-legal offered (both the 6-first and the 3-first routings);
  doubles from the start position; bear-off as the final target; one-die
  bear-off collision precedence; one-die-left and higher-die-rule guards;
  the stranding board offers nothing (dead-end anchoring). Note: a
  brute-force search (60k random doubles positions, bar entries included)
  found no position where a *legal* same-checker pair fails the anchoring
  check — for non-doubles a legal pair always is a complete play — so the
  `reachesCompletePlay` guard in the selector is defensive; the dead-end
  test pins the observable blocked-continuation case.
- State machine: `src/play/drag.test.ts` (6 new tests) — dblclick within
  the window; slow clicks stay clicks; different origins stay clicks; the
  third click starts over; a second press can still become a drag; a drop
  never chains a dblclick.
- Component: `src/pages/Play.test.tsx` "board interaction shortcuts" —
  double-click on the one-destination origin applies the movement;
  double-click on a two-destination origin moves nothing and ends
  deselected (normal selection); clicking the two-movement destination
  applies both movements and one Undo reverts only the second; keyboard
  Enter on the two-movement destination works. All pre-existing Play,
  Puzzles, autoplay and tutor tests pass unchanged (the Puzzles board
  inherits both interactions through Board).
- `npm test` (685), `npm run lint`, `npm run build`, `npm run e2e` (smoke),
  `npm run e2e:audit` (zero horizontal overflow at 820px) all pass; the
  audit PNGs under `.scratch/backgammon-platform/audit/` are refreshed in
  this branch.
- **Human eyes**: the desktop side-column proportions (184px column vs
  board) and the dashed two-movement highlight were checked on screenshots
  (`play-midgame-tutor-*.png`, plus a live hot-seat selection showing solid
  one-die and dashed two-movement targets together), but the feel of the
  400 ms double-click window, the dashed-outline legibility on a real
  screen, and drag interplay on touch devices deserve a human pass. Note
  the dashed highlight draws over checkers already stacked on the target
  point, same as the existing solid highlight does.
