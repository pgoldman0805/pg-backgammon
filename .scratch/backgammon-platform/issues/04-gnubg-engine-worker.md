# 04: gnubg engine worker

**What to build:** The engine (ADR-0001) available to the app: gnubg-WASM artifacts (prebuilt gnubg-web build fetched at build time, with GPL provenance documented) loaded inside a Web Worker behind a typed async interface — evaluate a position, rank all legal plays with equities, cube info — plus the difficulty layer (position-seeded Gaussian noise at Beginner 0.060 / Casual 0.050 / Intermediate 0.030 / Expert clean 0-ply / World-class 2-ply) and the shared analysis primitives: EMG equity loss for a decision and classification thresholds (dubious ≥ 0.02, error ≥ 0.04, blunder ≥ 0.08). Demoable via a dev-only page or test that ranks plays for a known position. Exploration notes with artifact URLs and API details are in the scratchpad directory (pointer in the ticket's Comments).

**Blocked by:** 02 (rules engine core, for position types/encoding).

**Status:** ready-for-agent

- [ ] Contract tests against the real WASM: loads, evaluates a known opening position with sane equities, ranks 3-1 opening plays with 8/5 6/5 on top
- [ ] Difficulty noise measurably degrades play quality in a reproducible (seeded) way
- [ ] All engine calls run off the main thread; a fake engine implementing the same interface exists for downstream tests
- [ ] Engine payload lazy-loads with an observable loading state

## Comments

Exploration notes (verified against primary sources) for the implementer:

- `C:\Users\paulg\AppData\Local\Temp\claude\C--git-pg-backgammon\5282bc77-b20e-4957-a59f-539b877f585c\scratchpad\exploration\gnubg-engine-notes.md` — gnubg-web WASM API (`Module._run_command`, FIBS `board:` output, `hint` parsing regexes), difficulty commands, recommended worker integration
- `C:\Users\paulg\AppData\Local\Temp\claude\C--git-pg-backgammon\5282bc77-b20e-4957-a59f-539b877f585c\scratchpad\exploration\formats-notes.md` — .mat and XGID specs (also feeds ticket 10)

Risk: the prebuilt artifacts (`gnubg.js`/`gnubg.wasm`/`gnubg.data`) are hosted at `http://xenon.stanford.edu/~hwatheod/gnubg_web/`, which was unreachable from the exploration sandbox. Verify reachability first; fallbacks in order: artifacts committed in the hwatheod/gnubg-web or skeptrunedev/backgammon repos or their deployed sites, else build from source per gnubg-web's README.
