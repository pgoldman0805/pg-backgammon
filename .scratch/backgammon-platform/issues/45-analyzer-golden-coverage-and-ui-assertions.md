# 45: Analyzer golden coverage and UI assertions

**What to build:** The analyzer's correctness is pinned beyond the opening, and the end-to-end audit asserts real content. Hand-verified golden positions cover bear-off, backgame, and score-dependent cube decisions against the real engine, and the e2e checks assert key on-screen values and elements (board, review), not only the absence of horizontal overflow.

**Blocked by:** None (can start immediately).

**Status:** ready-for-agent

- [x] Golden tests cover bear-off, backgame, and match-score cube positions with hand-verified numbers against the real WASM
- [x] The e2e/audit suite adds targeted assertions on rendered content, beyond overflow
- [x] The suite stays green and reasonably fast

## Comments

**Approach.** Test-only, as scoped — no analyzer/rules/UI production code
touched. Added `src/engine/node/positions.golden.test.ts` (a sibling to the
opening golden `analysis.golden.test.ts`) that drives the real vendored gnubg
WASM through the production analyzer (`analyzePlayMoment`, `analyzeCubeMoment`,
`assembleGameAnalysis`) over hand-built positions, and extended the e2e visual
audit with targeted rendered-content assertions. Every number was read from
the real engine and cross-checked against backgammon theory; the engine is
deterministic at full strength, so they pin to three decimals.

**Golden position 1 — pure bear-off race.** Equal pips (51 each), White on
roll, every checker home. Verified: `isRace` true, win 0.655, cubeless equity
0.309, no gammon (winGammon/loseGammon 0). With 4-2, bearing two men off
(`4/off 2/off`, +0.311) is best; bearing a single checker off the 6-point
(`6/off`) is rank 2 of 14 and loses 0.154 → blunder. Textbook: in a pure race
you take the maximum number of men off. Error rate over the two White plays =
0.154 / 2 = 0.077, one blunder.

**Golden position 2 — 1-3 backgame.** Black holds the 1- and 3-point anchors
with midpoint timing; White well ahead with a prime, on roll. Verified:
`isRace` false (contact), White win 0.652 with 0.250 gammon and only 0.026
loseGammon, equity 0.545. Cube = "Double, take" (noDouble 0.820, doubleTake
0.853, doublePass 1): a correct double the backgame can still take on its
return shots / gammon upside; passing instead is a 0.147 wrong-pass. With 5-2,
safe consolidation `9/2` (+0.848) is best, and crashing the board with
`7/2 4/2` is the worst of 9 plays — a 1.248 blunder (played equity −0.400).

**Golden position 3 — score-dependent cube (shifting take point).** A
gammonish position (White ~0.80 wins, ~0.137 gammons). At **money** the proper
action is "Double, pass" (noDouble 0.903, doubleTake 1.287, doublePass 1) — a
money take is a 0.287 wrong-take blunder. At **2-away/4-away** (7-pt match,
White 5 / Black 3) the identical position becomes "No double, take"
(doubleTake 0.873, doublePass 1) — the take is now correct (loss 0). The take
point drops because, for the 4-away trailer against a 2-away leader, a gammon
loss costs nothing beyond the single that already loses the match, so gammon
risk is "free." This exercises the match-score path through the XGID encoder
and MET-aware cube equities.

**No analyzer discrepancies found.** Every engine verdict matched established
theory; nothing in the analyzer/rules misbehaved, so there was nothing to
report upstream.

**Audit DOM/content assertions (e2e/audit.spec.ts).** Beyond the existing
soft horizontal-overflow check, the `analyze-review` state now asserts: the
review board renders an actual SVG (role img "Backgammon board") inside the
"Review position" figure; the White error-rate group shows a numeric PR
(`/^\d+\.\d$/`); the decision list has rows; the engine-alternatives list
carries a signed equity number (`/[+−]\d+\.\d{3}/`); and a classification badge
(Blunder/Error/Dubious) appears. The `analyze-viewer` state asserts the pasted
position renders a board and, after clicking "Analyze position", the engine
ranks its plays with signed equities (the placeholder XGID is the opening with
a 3-1 roll, so it has legal plays rather than a dance — no flake).

**Runtime impact.** The new golden file boots the WASM once (~2-5 s) and runs
in ~0.2 s of queries; the full unit suite stays ~55 s (957 tests, all green).
The audit added one real single-position engine analysis (the viewer
"Analyze position" click) plus cheap locator assertions; the audit run was
~2.9 min (was ~2.5 min). Smoke (2 passed) and PWA (2 passed) unchanged.
