# 38: Score-dependent cube training

**What to build:** Players can drill cube decisions where the match score actually matters, and play money sessions. Cube puzzles are mined at representative match scores (e.g. 2-away/2-away, gammon-go, Crawford) so take points shift realistically, and a money-play mode (with Jacoby) is available for cube practice.

**Blocked by:** None (can start immediately).

**Status:** ready-for-agent

- [x] The cube puzzle set includes score-dependent positions, labelled with their score context
- [x] A money-play game mode is selectable, with Jacoby handled correctly
- [x] Grading and analysis of these cubes reflect the score (not money-only equities)
- [x] Full gauntlet green

## Comments

### Score-dependent cube puzzles

- **Miner** (`src/puzzles/scoreCubeMining.ts`, driver `scripts/mineScoreCubes.ts`, `npm run mine:score-cubes`): takes the app's own curated cube positions plus one guaranteed gammon-threat seed, and re-evaluates each with the real gnubg WASM at a set of representative match scores. A position is kept only when the top cube action **at the score** differs from the money answer (so the drill genuinely teaches that the take point moves) and the second choice loses 0.05–0.45 (a clear best, still-tempting alternative), with the verdict consistent. Deterministic.
- **Score contexts mined** (7-point match, hero = White, via `MatchContext`/XGID): 2-away/2-away `{5,5}`, 2-away/4-away (gammon-go) `{5,3}`, 4-away/2-away `{3,5}`, 3-away/1-away `{4,6}`, 1-away/3-away `{6,4}`. The engine selected **9 keepers** spanning 2a/2a, 2a/4a, 4a/2a and 3a/1a, mixing offer and response flavours (`src/puzzles/scoreCubeSet.ts`, ids `score-cube-00x`). They join the `cube-handling` theme (now 39) in `bundledSet.ts`; Basics and the existing curated/generated sets are untouched.
- **Answers reflect the score**: every stored choice is the engine's cubeful equity *at that score* (`session.cubeInfo` with the puzzle's `MatchContext` → XGID score/length → gnubg MET). `toEnginePosition` carries `puzzle.match` into both grading and `curatedValidation`, so grading/analysis are score-aware, not money-only. `puzzleContentKey` now includes the match score for match positions (money keys unchanged), so the same board at two scores is two distinct drills.
- **Labelled**: `scoreContextLabel(match)` (`src/puzzles/mining.ts`) renders "2-away/2-away", "double match point", "Crawford game", or "Money play" from the hero's away-counts; the Puzzles prompt shows it as a chip on any match-score cube puzzle.
- **Validation**: `npm run validate:puzzles` → 171 ok, 0 failed (132 play, 39 cube; basics 12, priming/blitzing/holding-game/bear-off 30, cube-handling 39). The in-suite `curatedPuzzles.validation.test.ts` re-checks a sample against a fresh WASM session every `npm test`.

### Money play with Jacoby

- **Rules** (`src/rules/match.ts`): `startMoneyGame` / `createMatch({ money: true })` make `MatchState.money` true with `length: 0` (the money sentinel). A money session has no target (a win is always `game-over`, never `match-over`, winner stays null), no Crawford, and a cube that is never dead (`canDouble` short-circuits the dead-cube score check). The **Jacoby rule** lives in `scoreGame(kind, cube, money)`: a gammon/backgammon scores as a single until the cube is turned (value past 1); applied on checker wins, resignations, and deterministic replay (`replayMatchGame` reads `MatchGameRecord.money`; `replayMatch` never crowns a winner at length 0).
- **Wiring**: the store (`{ type: 'start', money }` → `startMoneyGame`); the engine opponent (`matchContext` adds `jacoby: true` only for money, so match contexts are unchanged); the session (`cubeInfo` toggles gnubg `set jacoby on`/`off` around a money evaluation so the opponent's money cube is Jacoby-correct); and the Play setup card (a Match/Money "Game" picker that hides the length picker and shows a hint; the HUD caption reads "Money play · Jacoby", game-over shows a running total, persistence stores `gameType`). Score accumulates across games.
