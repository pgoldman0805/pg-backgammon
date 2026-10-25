# 33: Novice defaults and a Basics puzzle theme

**What to build:** A first-timer is started gently and can drill fundamentals before advanced tactics. New users default to the Beginner opponent and a short single game (not a long match) until they choose otherwise, and a "Basics" puzzle theme (legal moves, hitting, bearing off) precedes the advanced themes.

**Blocked by:** None (can start immediately).

**Status:** ready-for-agent

- [x] A first-time user's Play setup defaults to Beginner and a quick single game; returning users keep their own last choices
- [x] A Basics theme exists and is ordered before Priming/Blitzing/etc.
- [x] The Basics puzzles are solvable without prior tactical knowledge
- [x] Full gauntlet green

## Comments

**First-run detection (novice defaults).** A persisted flag
`pg-backgammon.has-played-before` (localStorage, same stored-switch pattern as
the Tutor/auto-play keys) distinguishes a newcomer from a returning user, in
`src/play/settings.ts`. When the flag is unset, `Play.tsx`'s `initialSetup()`
opens the setup card on the novice defaults — the **Beginner** opponent and a
quick **1-point** match (`NOVICE_SETUP`). Starting a match (`start()`) or
changing either picker (`chooseDifficulty`/`chooseLength`) calls
`rememberSetupChoice(difficulty, length)`, which writes the chosen difficulty
and length and sets the flag together, so from the next visit the user's own
last choice wins (`RETURNING_FALLBACK` = Casual/7 guards a missing value).
Returning users are never nudged back to the novice setup. Persistence happens
only on explicit user action (start or picker change), never on mount, so
first load never silently flips the flag. Component tests in `Play.test.tsx`
and unit tests in `settings.test.ts` were updated deliberately (Beginner/1-point
preselected; returning-player remount; cube/XGID/resignation tests that need a
live cube were pinned to an explicit 7-point setup, since the cube is dead in a
1-point match and White's pre-roll auto-rolls).

**Basics theme — sourcing and validation.** `basics` is the first entry in
`PUZZLE_THEMES` (so it is typed, grouped, progress-tracked and drilled before
the advanced themes automatically); `MINEABLE_THEMES` excludes it so the
self-play miner's per-theme targets ignore the hand-authored theme. The 12
Basics puzzles are **hand-authored** simple teaching positions (opening
point-making 3-1/4-2/6-1, hit-and-cover, lover's-leap escape, safe bear-off)
in `scripts/mineBasics.ts` (`npm run mine:basics` → `src/puzzles/basicsSet.ts`,
a generated file). Every position is **graded at full strength by the real
gnubg WASM engine** and kept only when the engine confirms a clear best
(second-best loses ≥ 0.05), so the correct answer is always an obvious
mechanic — solvable without tactical knowledge. The authored set is bundled
ahead of the mined set in `src/puzzles/bundledSet.ts` (`BUNDLED_PUZZLES`),
which the Puzzles page, the generation dedupe base, and the validation all now
use. `curatedPuzzles.validation.test.ts` and `scripts/validatePuzzles.ts` were
extended to validate the bundled set, so every Basics answer is checked:
`npm test` re-evaluates a per-theme sample (6 Basics included) against the live
WASM engine on every run, and `npm run validate:puzzles` re-evaluates all 162
puzzles.

**Automated vs human eyes.** Automated: the full `npm test` suite (887 tests,
including the engine re-validation of a Basics sample), `npm run lint`,
`npm run build`, the e2e smoke/audit/pwa suites, and the full
`npm run validate:puzzles` sweep. Human eyes: I reviewed each kept Basics
position's engine-named best play to confirm it teaches the intended mechanic
(e.g. opening 3-1 → 8/5 6/5), and inspected the regenerated Play-setup audit
screenshot to confirm the Beginner/1-point defaults render cleanly.
