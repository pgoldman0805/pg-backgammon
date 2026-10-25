# 44: Accessible modal dialogs

**What to build:** The cube, resign, game-over, and match-over dialogs are usable by keyboard and screen-reader users. Each is a proper modal: focus moves in and is trapped while open, Escape dismisses where non-destructive, focus restores on close, and assistive tech announces that a decision is required.

**Blocked by:** None (can start immediately).

**Status:** ready-for-agent

- [ ] These dialogs expose a dialog role and move, trap, and restore focus correctly
- [ ] A keyboard-only user can resolve a cube or resign decision without the board stealing focus
- [ ] Screen readers announce the dialog; the existing mouse/touch flow is unchanged
- [ ] Full gauntlet green
