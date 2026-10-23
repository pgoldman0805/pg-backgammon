# 17: Expand the curated set to 30 puzzles per theme

**What to build:** Grow the bundled curated set from 30 puzzles (6 per theme) to ~150 (target 30 per theme) by running the existing miner (spec story 47). Data and script changes only — no Puzzles UI changes (ticket 18 owns that surface in parallel).

- Raise the miner's targets/diversity caps (`scripts/minePuzzles.ts`, `src/puzzles/mining.ts` knobs) so a longer self-play run yields ~30 keepers per theme without diluting quality (keep the clear-best margin windows; loosen only the per-game/per-flavor diversity caps as needed).
- Regenerate `src/puzzles/curatedSet.ts` with the real engine. Every stored answer validated at generation time (the miner already confirms at 2-ply).
- Keep `npm test` fast: the always-on validation test (`src/engine/node/curatedPuzzles.validation.test.ts`) should validate the full set's *shape* but re-evaluate only a deterministic sample (~30) against the WASM; add a separate script (e.g. `npm run validate:puzzles`) that re-evaluates the entire set, and run it once to prove the new data.
- Bundle note: ~5× the set data (~85–100 kB gzip estimated). Record the new bundle numbers; no code-splitting in this ticket (ticket 14 judged it not worth the restructure; unchanged).

**Blocked by:** None against current main (runs in parallel with ticket 18; stay out of src/pages/Puzzles.tsx and the drill/UI surface entirely).

**Status:** done

- [x] Curated set ships ≥25 puzzles in every theme, unique ids, mixed play/cube flavors per theme where the theme allows
- [x] Full-set engine validation passes once via the dedicated script; the in-suite test validates shape of all + a deterministic WASM sample, and `npm test` stays within ~1 min of its current runtime
- [x] `npm test`, lint, build, `npm run e2e` all pass
- [x] Bundle size delta recorded in the ticket Comments

## Comments

Implemented on branch `ticket/17-expand-curated-set` (2026-10-23).

**Miner knobs** (`scripts/minePuzzles.ts`; quality windows untouched —
`SCREEN_*`, `MARGIN_*`, `CUBE_MARGIN_*`, `MIN_CANDIDATES` all unchanged):

- `TARGET_PER_THEME` 6 → 30 (plus a `MIN_PER_THEME = 25` floor the script
  warns about per theme instead of the old whole-set `< 25` warning).
- `CUBE_BUCKET_CAP` 2 → 10: the only diversity cap that had to move. Five
  verdict flavors at cap 2 hard-limit cube-handling to 10 puzzles; 10 keeps
  the 6-puzzle set's 1/3-of-target ratio.
- `MAX_GAMES` 400 → 2000 budget headroom (the loop still stops the moment
  every theme is full). `PER_GAME_THEME_CAP` stays 1 — the bigger run never
  needed it loosened. `SEED` unchanged (20261022), run fully deterministic
  (expert self-play is clean 0-ply, zero noise).

**Mining run** (one run, no retries needed): 150 puzzles — 30 per theme in
all five themes — from **71 self-play games in ~35 s** of mining wall time
(vs 13 games for the old 30-puzzle set). Play candidates screened 266,
confirmed 120; cube positions evaluated 68, accepted 30. Cube mix: 22
offers / 8 responses across six flavors (no-double-take 10, too-good 7,
double-take-offer 2, double-pass-offer 3, response-take 5, response-pass 3)
— every bucket within the cap of 10.

**Validation split**: `curatedPuzzles.validation.test.ts` still checks the
FULL set's shape from stored data (≥125 total / ≥25 per theme, unique ids,
both cube decisions present, answers cover every distinct legal final
position and replay to their keys, margins ≥ 0.05) but re-evaluates only a
deterministic sample of 30 against the WASM: `selectValidationSample`
(new pure module `src/puzzles/validationSample.ts`, seeded mulberry32,
6 per theme, guaranteed to span all themes and both kinds; unit-tested).
The engine re-evaluation checks moved to a shared module
(`src/engine/node/curatedValidation.ts`) used by both the test and the new
full-set script (`scripts/validatePuzzles.ts` via `scripts/validate.mjs`,
same Vite-SSR launcher pattern as the miner).

**Full-set validation** (`npm run validate:puzzles`, run once on the new
set):

> Validated 150 puzzles (120 play, 30 cube; priming 30, blitzing 30,
> holding-game 30, bear-off 30, cube-handling 30) against the WASM engine
> in 17s: 150 ok, 0 failed.

**Test runtime**: `npm test` 690 tests in 21.7 s vs 685 tests in 19.3 s on
main (+2.4 s — the sample keeps the WASM re-eval count at 30, exactly the
old full-set cost; the extra shape work over 150 puzzles is cheap).

**Bundle** (`npm run build`, main → this branch):

- `index-*.js` 544.15 kB → 950.85 kB (+406.7 kB raw);
  **gzip 139.32 kB → 181.85 kB (+42.5 kB)** — under the ticket's
  85–100 kB gzip estimate because the formatted data compresses well.
- CSS and worker chunks unchanged. No code-splitting (per ticket 14's
  standing judgment).

Also: `biome.json` gained `files.maxSize: 3 MiB` (the generated set is now
1.3 MiB and biome's 1 MiB default would have silently skipped checking it),
and `mine:puzzles` now formats its output file so a fresh mine is
lint-clean out of the box.

Verified: `npm test` (690), `npm run lint`, `npm run build`,
`npm run e2e` (smoke) all pass; `npm run validate:puzzles` passed once on
the full new set as quoted above.
