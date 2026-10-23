# 16: Board interaction shortcuts and side controls

**What to build:** Three Play-board improvements (user request, spec stories 45–46 plus a layout change):

1. **Double-click moves a single-destination checker** (story 45): double-clicking a checker that has exactly one legal destination applies that movement immediately. With zero or multiple destinations, double-click does nothing beyond normal selection (no misfires, no weird selection state).
2. **Two-movement destinations** (story 46): selecting a checker highlights, besides the one-die destinations, the final point (or bear-off) reachable by applying two of the remaining dice from that origin — clickable to apply both movements in sequence. Offered only when the two-movement sequence is a legal prefix of a complete play (same anchoring as existing selectors) AND unambiguous: every die order reaching that final point from that origin yields the identical board (same hits). Ambiguous paths stay per-movement. If the final target collides with a one-die destination (e.g. bear-off reachable by one die or two), the one-die action wins and no two-movement variant is offered. Works with doubles (two of the remaining identical dice). Within-turn undo keeps its per-movement granularity (undoing a two-movement click takes two undos).
3. **Turn controls beside the board**: move the turn-control cluster (Undo / Commit play / Resign…, and the manual forced-play/dance buttons) from under the board to the right side of the board at desktop width; at tablet width (≤ the existing HUD-wrap breakpoint) they return below the board. The audit's zero-horizontal-overflow assertion at 820px must stay green; keyboard tab order stays sane (board origins → destinations → controls).

**Blocked by:** 14 (polish and responsive audit — this builds on the audited layout).

**Status:** ready-for-agent

- [ ] Double-click on a one-destination checker moves it; on a multi-destination or stuck checker it changes nothing; covered by drag/state and component tests
- [ ] Two-movement destinations highlight and apply both movements on click; ambiguity rule enforced by selector unit tests (same-point different-hits NOT offered; identical-outcome paths offered; doubles; bear-off; one-die collision precedence)
- [ ] Controls render beside the board at desktop width and below it at tablet width; `npm run e2e:audit` passes (no horizontal overflow anywhere)
- [ ] Puzzle board answering inherits the same interactions and stays green; `npm test`, lint, build, and `npm run e2e` all pass
