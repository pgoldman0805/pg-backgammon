# 45: Analyzer golden coverage and UI assertions

**What to build:** The analyzer's correctness is pinned beyond the opening, and the end-to-end audit asserts real content. Hand-verified golden positions cover bear-off, backgame, and score-dependent cube decisions against the real engine, and the e2e checks assert key on-screen values and elements (board, review), not only the absence of horizontal overflow.

**Blocked by:** None (can start immediately).

**Status:** ready-for-agent

- [ ] Golden tests cover bear-off, backgame, and match-score cube positions with hand-verified numbers against the real WASM
- [ ] The e2e/audit suite adds targeted assertions on rendered content, beyond overflow
- [ ] The suite stays green and reasonably fast
