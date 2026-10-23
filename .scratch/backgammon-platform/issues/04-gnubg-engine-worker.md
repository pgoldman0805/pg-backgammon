# 04: gnubg engine worker

**What to build:** The engine (ADR-0001) available to the app: gnubg-WASM artifacts (prebuilt gnubg-web build fetched at build time, with GPL provenance documented) loaded inside a Web Worker behind a typed async interface — evaluate a position, rank all legal plays with equities, cube info — plus the difficulty layer (position-seeded Gaussian noise at Beginner 0.060 / Casual 0.050 / Intermediate 0.030 / Expert clean 0-ply / World-class 2-ply) and the shared analysis primitives: EMG equity loss for a decision and classification thresholds (dubious ≥ 0.02, error ≥ 0.04, blunder ≥ 0.08). Demoable via a dev-only page or test that ranks plays for a known position. Exploration notes with artifact URLs and API details are in the scratchpad directory (pointer in the ticket's Comments).

**Blocked by:** 02 (rules engine core, for position types/encoding).

**Status:** done

- [x] Contract tests against the real WASM: loads, evaluates a known opening position with sane equities, ranks 3-1 opening plays with 8/5 6/5 on top
- [x] Difficulty noise measurably degrades play quality in a reproducible (seeded) way
- [x] All engine calls run off the main thread; a fake engine implementing the same interface exists for downstream tests
- [x] Engine payload lazy-loads with an observable loading state

## Comments

Exploration notes (verified against primary sources) for the implementer:

- `C:\Users\paulg\AppData\Local\Temp\claude\C--git-pg-backgammon\5282bc77-b20e-4957-a59f-539b877f585c\scratchpad\exploration\gnubg-engine-notes.md` — gnubg-web WASM API (`Module._run_command`, FIBS `board:` output, `hint` parsing regexes), difficulty commands, recommended worker integration
- `C:\Users\paulg\AppData\Local\Temp\claude\C--git-pg-backgammon\5282bc77-b20e-4957-a59f-539b877f585c\scratchpad\exploration\formats-notes.md` — .mat and XGID specs (also feeds ticket 10)

Risk: the prebuilt artifacts (`gnubg.js`/`gnubg.wasm`/`gnubg.data`) are hosted at `http://xenon.stanford.edu/~hwatheod/gnubg_web/`, which was unreachable from the exploration sandbox. Verify reachability first; fallbacks in order: artifacts committed in the hwatheod/gnubg-web or skeptrunedev/backgammon repos or their deployed sites, else build from source per gnubg-web's README.

---

Implemented on branch `ticket/04-gnubg-engine-worker` (2026-10-22). Notes and deviations:

- **Artifacts vendored, not build-time fetched**: `public/engine/gnubg.{js,wasm,data}`
  (gnubg.js 106,611 B / gnubg.wasm 951,472 B / gnubg.data 2,035,611 B) committed with
  `public/engine/PROVENANCE.md` (source, SHA-256, rebuild steps). The canonical host
  `xenon.stanford.edu` was unreachable (connect timeout); obtained from the
  `bg.skeptrune.com/engine/` mirror, which fetches the same files verbatim.
- **Difficulty noise is ours, not gnubg's**: gnubg's native
  `noise ... deterministic on` is broken in this WASM build — it saturates
  evaluations (opening equities jump to ~+1.0, 89% wins). Non-deterministic noise
  works but isn't reproducible. Per the ticket's fallback clause, the difficulty
  layer applies position-seeded Gaussian noise (xmur3+mulberry32+Box-Muller) in
  TypeScript over clean engine equities (`src/engine/difficulty.ts`): seed =
  XGID + dice + move notation, Beginner 0.060 / Casual 0.050 / Intermediate 0.030 /
  Expert clean 0-ply / World-class clean 2-ply.
- **Engine quirks discovered and worked around** (`src/engine/session.ts`):
  (1) hint analysis is cached by position+dice regardless of evaluation settings —
  every query re-establishes the position (`clear hint` + `new match 1` +
  `set xgid`); (2) the build's default move filters pass zero moves to the 2-ply
  stage, so "2-ply" hints silently stay 0-ply — fixed with
  `set evaluation movefilter 2 0 8 8 0.16` (top 8 moves evaluated at 2-ply).
- gnubg is driven as a **stateless position oracle** via XGID (hero always
  player 1, so no swap-players prompts); game flow stays in src/rules per
  ADR-0002. Ranked plays are joined back to rules-engine `Play`s by final
  position, so every returned play is legal by construction.
- **Cross-validation of ticket 02** included:
  `src/engine/node/rulesCrossValidation.test.ts` (seeded playout + bar-entry /
  bear-off / forced-play fixtures; gnubg's move list and `legalPlays` agree
  exactly).
- Contract tests load the WASM directly in Node
  (`src/engine/node/loadGnubg.ts`); the worker wrapper is thin and the client's
  lazy-load/observable-status state machine is tested against a fake transport.
- **Shared-config edits** (flagging for merge coordination): `biome.json`
  (exclude `public/engine` from checks), `tsconfig.app.json` (exclude
  `src/engine/node`), new `tsconfig.test.json` + root `tsconfig.json` reference
  (node-typed test harness dir). `vite.config.ts` needed **no** changes.
