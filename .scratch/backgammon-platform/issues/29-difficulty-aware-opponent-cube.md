# 29: Difficulty-aware opponent cube

**What to build:** At lower difficulties the computer makes cube decisions the player can punish. Today every level doubles, takes, and passes at full engine strength regardless of difficulty; after this, Beginner/Casual/Intermediate make loose or missed doubles and wrong takes/passes at rates matching their checker-play weakness, while Expert and World-class keep correct cube play. Analysis and Tutor feedback stay full strength (ground truth is never weakened).

**Blocked by:** None (can start immediately).

**Status:** ready-for-agent

- [x] The opponent's cube decisions degrade with difficulty in a seeded, reproducible way (measurable over sampled positions), not just its checker plays
- [x] Expert and World-class cube decisions remain engine-correct
- [x] Analysis, post-game review, and Tutor feedback are unaffected (still full strength)
- [x] Full gauntlet green

## Comments

**Confirmed the gap?** Yes, reproduced with a failing test first. `opponent.ts`
called `engine.cubeInfo(position)` with no second argument in both `actPreRoll`
and `actCubeOffered`, so the opponent doubled/took/passed at full engine
strength at every level — only `rankPlays` (checker play) was noised. The red
test asserted the opponent passes its configured difficulty into `cubeInfo`
(`expected [ undefined ] to deeply equal [ 'casual' ]`).

**How cube weakening works.** New pure `applyCubeDifficulty(analysis, noise,
positionSeed)` in `src/engine/difficulty.ts` — the cube-play analog of the
existing `applyDifficultyNoise`. It adds independent, position-seeded Gaussian
noise (same per-level sigma as checker play) to each of the three cubeful
equities (no-double / double-take / double-pass), then recomputes the proper
action from the noisy equities via the shared `cubeProperAction` helper
(responder takes only when a take leaves the doubler worse off than a pass; the
double is correct when that value beats holding the cube). A close decision
flips often, a clear one almost never. Seed is the XGID in `session.ts` and the
board key in `fake.ts`, so games/tests are reproducible. The fake engine's cube
verdict now derives from `cubeProperAction` too, so a weakened level only ever
deviates through noise — never a hidden rule change at noise zero.

Threaded additively: added `difficulty?` to `CubeInfoOptions` (flows through the
existing `options` field of the worker protocol / client / worker unchanged);
`session.cubeInfo` and `fake.cubeInfo` apply the perturbation only when a
difficulty is present; `opponent.ts` passes `{ difficulty }` in both cube calls.

**How levels differ.** Noise sigma is `DIFFICULTY_SETTINGS[level].noise`:
Beginner 0.06, Casual 0.05, Intermediate 0.03 → measurable loose/missed doubles
and wrong takes/passes (heavier at Beginner than Intermediate). Expert 0 and
World-class 0 → `applyCubeDifficulty` is a no-op, so the engine's own proper
action is returned verbatim (engine-correct). Cube-eval ply is left at the
full-strength evaluation for every level; difficulty only adds noise, so Expert
cube play is identical to the analysis ground truth. Analysis / post-game review
(`analyze.ts`, `analyzer.ts`) and Tutor (`tutor.ts`, which has no cube call at
all) never pass a difficulty, so they stay full strength — guarded by a test.

**Automated vs human-eyes.** All automated. New tests: cube perturbation
(seeded determinism, Expert/World-class unchanged, borderline double/take flips
over sampled seeds, Beginner weaker than Intermediate, non-standard shapes left
untouched); `session.cubeInfo`/`fake.cubeInfo` difficulty determinism +
Expert/World-class unchanged + fake verdict self-consistency; an opponent-level
test that its double action varies by difficulty over 40 sampled positions
(Expert doubles every time, Beginner misses some); and an `analyzeGame`
assertion that no cube call carries a difficulty.
