# 17: Expand the curated set to 30 puzzles per theme

**What to build:** Grow the bundled curated set from 30 puzzles (6 per theme) to ~150 (target 30 per theme) by running the existing miner (spec story 47). Data and script changes only — no Puzzles UI changes (ticket 18 owns that surface in parallel).

- Raise the miner's targets/diversity caps (`scripts/minePuzzles.ts`, `src/puzzles/mining.ts` knobs) so a longer self-play run yields ~30 keepers per theme without diluting quality (keep the clear-best margin windows; loosen only the per-game/per-flavor diversity caps as needed).
- Regenerate `src/puzzles/curatedSet.ts` with the real engine. Every stored answer validated at generation time (the miner already confirms at 2-ply).
- Keep `npm test` fast: the always-on validation test (`src/engine/node/curatedPuzzles.validation.test.ts`) should validate the full set's *shape* but re-evaluate only a deterministic sample (~30) against the WASM; add a separate script (e.g. `npm run validate:puzzles`) that re-evaluates the entire set, and run it once to prove the new data.
- Bundle note: ~5× the set data (~85–100 kB gzip estimated). Record the new bundle numbers; no code-splitting in this ticket (ticket 14 judged it not worth the restructure; unchanged).

**Blocked by:** None against current main (runs in parallel with ticket 18; stay out of src/pages/Puzzles.tsx and the drill/UI surface entirely).

**Status:** ready-for-agent

- [ ] Curated set ships ≥25 puzzles in every theme, unique ids, mixed play/cube flavors per theme where the theme allows
- [ ] Full-set engine validation passes once via the dedicated script; the in-suite test validates shape of all + a deterministic WASM sample, and `npm test` stays within ~1 min of its current runtime
- [ ] `npm test`, lint, build, `npm run e2e` all pass
- [ ] Bundle size delta recorded in the ticket Comments
