# 03: Playable board UI

**What to build:** A full game of backgammon playable on screen (both sides human-controlled for now): 2D SVG board rendering positions from the rules engine, checker movement by drag-and-drop and by click-to-move with legal destinations highlighted, within-turn undo, explicit play commit, dice display, pip counts, turn indicator, and game-end announcement. Illegal plays are impossible to commit; forced plays and no-play rolls resolve with minimal friction.

**Blocked by:** 02 (rules engine core).

**Status:** ready-for-agent

- [ ] A complete game can be played start to finish with mouse only, and separately with clicks only
- [ ] Legal destinations highlight on pickup/selection; illegal drops snap back
- [ ] Within-turn undo restores intermediate states correctly; commit ends the turn
- [ ] Board is readable in both themes at desktop and tablet widths
