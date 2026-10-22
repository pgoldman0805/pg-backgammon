# 12: Blunder puzzle mining

**What to build:** Puzzles mined from the player's own games: after a game's analysis completes, every decision with equity loss ≥ 0.08 (blunder) becomes a blunder puzzle automatically — the position, the roll (or cube question), and the engine's graded answers — deduplicated against existing puzzles and appearing in the Puzzles area in their own "from your games" collection alongside curated sets.

**Blocked by:** 08 (post-game review), 11 (puzzle player and curated set).

**Status:** ready-for-agent

- [ ] Finishing and analyzing a game containing a blunder yields a playable blunder puzzle without user action
- [ ] The same blunder analyzed twice (e.g. re-analysis) does not create duplicates
- [ ] Blunder puzzles are visually distinguishable and filterable from curated ones
- [ ] Both checker-play and cube blunders mine correctly
