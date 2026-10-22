# 09: Tutor mode

**What to build:** Live analysis as one toggle (off by default, switchable mid-game): a hint button revealing the engine's best play for the current roll, post-play feedback (equity loss + classification immediately after committing a play, using the shared analysis primitives), an eval bar tracking the position through the game, and takebacks (reverting a committed play after seeing consequences — Tutor mode only, so non-tutor games stay clean for stats). All live analysis runs at full engine strength regardless of opponent difficulty. Whether a game was played with Tutor mode on is recorded with the game.

**Blocked by:** 05 (play vs computer).

**Status:** ready-for-agent

- [ ] With Tutor mode off, no hint/feedback/eval bar/takeback affordances exist
- [ ] Post-play feedback matches what the post-game analyzer would say for the same play (shared code path)
- [ ] Takeback restores the exact prior state including dice, and is unavailable outside Tutor mode
- [ ] Games flagged tutor-assisted are excluded from progress stats (flag stored now; consumed by ticket 13)
