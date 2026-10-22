# 08: Post-game review (the analyzer)

**What to build:** The analyzer pillar: every finished game auto-analyzes in the background at 2-ply (using the analysis primitives from ticket 04); opening a match in Analyze shows the review — a decision list (plays and cube decisions) with equity loss and classification markers, stepping through positions on the board, the engine's top alternatives with equities per position, per-game and per-match error rate, and cube errors called out (missed double / wrong double / wrong take / wrong pass). Any single position can be re-analyzed deeper on demand. Analysis results persist with the match.

**Blocked by:** 07 (persistence and history).

**Status:** ready-for-agent

- [ ] Finishing a game triggers background analysis; the review is ready without user action and survives reload
- [ ] Golden test: a small recorded game produces hand-verified equity losses, classifications, and error rate
- [ ] Review UI steps through every decision on the board with alternatives viewable
- [ ] Deeper on-demand re-analysis visibly refines a position's numbers without blocking the UI
