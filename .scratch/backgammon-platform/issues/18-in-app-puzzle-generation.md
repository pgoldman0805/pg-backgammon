# 18: In-app puzzle generation

**What to build:** Unlimited puzzles, generated in the browser (spec story 48): a "Find new puzzles" action in the Puzzles area that runs engine self-play mining client-side — the same screening the offline miner does (self-play games, screen decision points, confirm candidates at full strength, theme-tag, clear-best margin windows) — through the existing engine worker at background priority (the analyzer's priority gate), so play, tutor, and analysis never stall.

- Generated puzzles persist in IndexedDB (new store or reuse/generalize the blunder-puzzle store pattern; additive schema bump with migration test, backup format extended tolerantly per precedent) with `source: 'generated'` (extend the Puzzle type additively).
- They slot into their theme's drill alongside curated puzzles (counts shown per theme), deduped against curated, blunder, and previously generated puzzles by the existing content key.
- UX: a generate action with visible progress ("playing game 3… 2 candidates found") and a sensible batch size (e.g. mine until +10 keepers or a game cap, whichever first); cancellable; works while you navigate away (background); clear note when the engine is still loading. Optional auto-top-up (generate when a theme runs low) only if cheap — otherwise record as a future note.
- Mining code must be shared, not duplicated: extract what `scripts/minePuzzles.ts` and the new in-app generator have in common into `src/puzzles` (the script should shrink to a thin node driver over the shared core).

**Blocked by:** None against current main (runs in parallel with ticket 17, which regenerates `src/puzzles/curatedSet.ts` data and the miner script's knobs — coordinate: you own the shared-core extraction and in-app surface; 17 only bumps target numbers and data. If the script moves under your refactor, keep its CLI entry (`npm run mine:puzzles`) working so 17's run is unaffected; merge carefully whichever lands second).

**Status:** ready-for-agent

- [ ] "Find new puzzles" produces drillable, theme-tagged puzzles with full graded answer data, persisted across reloads, deduped against all existing sources
- [ ] Generation runs at background priority: an opponent move or tutor query during generation is never visibly delayed (test via the gate's ordering, as ticket 12 did)
- [ ] Progress and cancellation work; the action degrades gracefully while the engine loads
- [ ] Schema migration test, backup round-trip with generated puzzles, and the full gauntlet (`npm test`, lint, build, `npm run e2e`) pass
